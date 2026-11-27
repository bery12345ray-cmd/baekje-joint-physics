// 백제 결구 물리학 — physics core (Rapier). No rendering here, so it also runs in node for tuning.
export const MATERIALS = {
  granite: { name: '화강암', density: 2.7, friction: 0.75, restitution: 0.02 },
  pine:    { name: '소나무', density: 0.55, friction: 0.6, restitution: 0.12, strength: 700 },
  brick:   { name: '문양전', density: 1.8, friction: 0.95, restitution: 0.0 },
};
// joint kinds: flex = 주먹장·연귀맞춤(유격), rigid = 못으로 꽉 고정, mortar = 벽돌 맞붙임
export const JOINTS = {
  flex:   { k: 150,  c: 12,  breakDeg: 20 },
  rigid:  { k: 1500, c: 2,   breakDeg: 1.6 },
  mortar: { k: 400,  c: 4,   breakDeg: 3 },
};
// Peak ground acceleration (m/s²) for a magnitude-like intensity 1.0–7.0.
export const QUAKE = { base: 0.2, growth: 2.0, freq: 1.4 }; // 지진 세기 조율값: 바르게 지은 탑은 기본 세기 5를 버티고, 잘못 지은 탑은 무너진다
export const pga = m => QUAKE.base * Math.pow(QUAKE.growth, m - 1);
// dominant shaking frequency (Hz) = QUAKE.freq

let uid = 1;
export class Sim {
  constructor(R) { this.R = R; this.reset(); }
  reset() {
    const R = this.R;
    if (this.world) this.world.free();
    this.world = new R.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = this.dt || 1 / 240; // 저사양 모드에서는 1/120
    this.world.numSolverIterations = 8;
    this.queue = new R.EventQueue(true);
    this.ground = this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -0.5, 0));
    this.world.createCollider(R.ColliderDesc.cuboid(20, 0.5, 20).setFriction(0.9), this.ground);
    this.blocks = []; this.joints = []; this.byCollider = new Map();
    this.t = 0; this.quake = null; this.gx = 0; this.gz = 0; this.mag = 0;
    this.onAdd = this.onAdd || (() => {}); this.onRemove = this.onRemove || (() => {});
    this.onEvent = this.onEvent || (() => {});
  }
  setStep(dt) { this.dt = dt; this.world.timestep = dt; }
  addBlock({ mat, size, pos, rotY = 0, breakable = true, tint, part, po }) {
    const R = this.R, m = MATERIALS[mat];
    const q = { x: 0, y: Math.sin(rotY / 2), z: 0, w: Math.cos(rotY / 2) };
    const body = this.world.createRigidBody(R.RigidBodyDesc.dynamic()
      .setTranslation(pos[0] + this.gx, pos[1], pos[2] + this.gz).setRotation(q)
      .setLinearDamping(0.02).setAngularDamping(0.15).setCanSleep(false));
    const cd = R.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2)
      .setDensity(m.density).setFriction(m.friction).setRestitution(m.restitution);
    const strength = m.strength && breakable ? m.strength * size[0] * size[2] : 0;
    if (strength) cd.setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(strength);
    const col = this.world.createCollider(cd, body);
    const b = { id: uid++, mat, size: [...size], body, col, strength, dmg: 0, broken: !breakable && m.strength ? false : false, tint, part, po };
    b.mass = body.mass();
    this.blocks.push(b); this.byCollider.set(col.handle, b);
    this.onAdd(b);
    return b;
  }
  removeBlock(b) {
    for (const j of this.joints.filter(j => j.a === b || j.b === b)) this.removeJoint(j);
    this.byCollider.delete(b.col.handle);
    this.world.removeRigidBody(b.body);
    this.blocks.splice(this.blocks.indexOf(b), 1);
    this.onRemove(b);
  }
  // Connect two blocks (b may be null = ground) at a world-space anchor.
  addJoint(a, b, kind, anchor) {
    const R = this.R, bodyB = b ? b.body : this.ground;
    const la = toLocal(a.body, anchor), lb = toLocal(bodyB, anchor);
    const jd = R.JointData.spherical(la, lb);
    const joint = this.world.createImpulseJoint(jd, a.body, bodyB, true);
    const qa = a.body.rotation(), qb = bodyB.rotation();
    const j = { a, b, kind, joint, q0: qmul(qconj(qa), qb), ...JOINTS[kind], strain: 0 };
    this.joints.push(j);
    return j;
  }
  removeJoint(j) {
    if (j.joint) this.world.removeImpulseJoint(j.joint, true);
    this.joints.splice(this.joints.indexOf(j), 1);
  }
  startQuake(mag, mode = 'fixed') {
    this.capture();
    const st = this.stats();
    // 진단 근거: 응력 초과 부재, 무게중심 수평 이탈(밑동 반폭 대비·기울기 각도)을 지진 동안 모은다
    this.quake = { t: 0, mode, mag, phase: Math.random() * 6.28, passed: 0, collapsed: false, log: [],
      stressed: new Set(), base0: st.base, comY0: st.comY, com0: this.comXZ(), comShift: 0 };
    this.mag = mode === 'ramp' ? 1 : mag;
  }
  stopQuake() { this.quake = null; this.mag = 0; }
  // Snapshot resting state so damage is measured relative to it.
  capture() {
    for (const b of this.blocks) {
      const p = b.body.translation();
      b.p0 = [p.x - this.gx, p.y, p.z - this.gz]; b.q0 = { ...b.body.rotation() }; b.fallen = false;
    }
    this.h0 = this.height();
  }
  comXZ() { // 지반 기준 수평 무게중심
    let m = 0, x = 0, z = 0;
    for (const b of this.blocks) { const p = b.body.translation(); m += b.mass; x += b.mass * (p.x - this.gx); z += b.mass * (p.z - this.gz); }
    return m ? [x / m, z / m] : [0, 0];
  }
  height() { let h = 0; for (const b of this.blocks) h = Math.max(h, b.body.translation().y + b.size[1] / 2); return h; }
  frame(dt) { // advance by real dt using fixed substeps
    const n = Math.max(1, Math.min(8, Math.round(dt / this.world.timestep)));
    for (let i = 0; i < n; i++) this.step();
  }
  step() {
    const dt = this.world.timestep;
    this.t += dt;
    const q = this.quake;
    if (q) {
      q.t += dt;
      if (q.mode === 'ramp') this.mag = Math.min(7, 1 + Math.floor(q.t / 2.5) * 0.5);
      const env = Math.min(1, q.t / 1.2);
      const A = env * pga(this.mag) * (this.quakeGain || 1) / Math.pow(2 * Math.PI * QUAKE.freq, 2); // quakeGain: 예시 탑을 일부러 약하게 할 때
      const w = 2 * Math.PI * QUAKE.freq, t = q.t;
      this.gx = A * (0.8 * Math.sin(w * t) + 0.35 * Math.sin(1.73 * w * t + q.phase));
      this.gz = A * 0.45 * Math.sin(0.81 * w * t + q.phase * 0.5);
    } else { this.gx *= 0.98; this.gz *= 0.98; }
    this.ground.setNextKinematicTranslation({ x: this.gx, y: -0.5, z: this.gz });
    // rotational springs that give joints their bending stiffness
    for (const j of [...this.joints]) {
      const A = j.a.body, B = j.b ? j.b.body : this.ground;
      const target = qmul(A.rotation(), j.q0);
      let e = qmul(B.rotation(), qconj(target));
      if (e.w < 0) e = { x: -e.x, y: -e.y, z: -e.z, w: -e.w };
      const s = Math.hypot(e.x, e.y, e.z), ang = 2 * Math.atan2(s, e.w);
      j.strain = ang * 57.3;
      if (j.strain > j.breakDeg) { this.removeJoint(j); this.onEvent({ type: 'joint', kind: j.kind, j }); continue; }
      // implicit spring-damper per world axis (stable for any stiffness)
      const wa = A.angvel(), wb = B.angvel();
      const th = s > 1e-9 ? [e.x / s * ang, e.y / s * ang, e.z / s * ang] : [0, 0, 0];
      const wr = [wb.x - wa.x, wb.y - wa.y, wb.z - wa.z], tq = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        const ax = [0, 0, 0]; ax[i] = 1;
        const inv = invI(j.a, ax) + (j.b ? invI(j.b, ax) : 0), I = 1 / inv;
        tq[i] = -(j.k * th[i] + j.c * wr[i]) * dt * I / (I + j.c * dt + j.k * dt * dt);
      }
      if (j.b) B.applyTorqueImpulse({ x: tq[0], y: tq[1], z: tq[2] }, true);
      A.applyTorqueImpulse({ x: -tq[0], y: -tq[1], z: -tq[2] }, true);
    }
    this.world.step(this.queue);
    const hits = new Map();
    this.queue.drainContactForceEvents(ev => {
      const f = ev.totalForceMagnitude();
      for (const h of [ev.collider1(), ev.collider2()]) {
        const b = this.byCollider.get(h);
        if (b && b.strength) hits.set(b, Math.max(hits.get(b) || 0, f));
      }
    });
    for (const [b, f] of hits) {
      if (f > b.strength) { if (q) q.stressed.add(b.id); b.dmg += dt * f / b.strength; if (b.dmg > 0.3) this.breakWood(b); }
    }
    if (q) this.judge();
  }
  breakWood(b) {
    if (!this.blocks.includes(b)) return;
    const p = b.body.translation(), r = b.body.rotation(), v = b.body.linvel();
    const [w, h, d] = b.size, long = h >= w && h >= d ? 1 : w >= d ? 0 : 2;
    this.removeBlock(b);
    for (const s of [-1, 1]) {
      const size = [w, h, d]; size[long] *= 0.44;
      const off = [0, 0, 0]; off[long] = s * b.size[long] * 0.26;
      const wo = rotate(r, off);
      const nb = this.addBlock({ mat: 'pine', size, pos: [p.x + wo[0] - this.gx, p.y + wo[1], p.z + wo[2] - this.gz], breakable: false, tint: 'broken' });
      nb.body.setRotation(r, true); nb.body.setLinvel(v, true); nb.broken = true;
      nb.p0 = b.p0; nb.q0 = b.q0; nb.fallen = true;
    }
    this.onEvent({ type: 'break', block: b });
  }
  judge() {
    const q = this.quake; let fallenMass = 0, total = 0, topFallen = false, fallenN = 0;
    let top = null;
    for (const b of this.blocks) {
      total += b.mass;
      if (!b.p0) continue;
      if (!top || b.p0[1] > top.p0[1]) top = b;
      const p = b.body.translation();
      const dy = b.p0[1] - p.y;
      const dh = Math.hypot(p.x - this.gx - b.p0[0], p.z - this.gz - b.p0[2]);
      const tilt = qangle(b.body.rotation(), b.q0) * 57.3;
      if (b.broken || dy > Math.min(...b.size) * 0.5 || dh > Math.max(b.size[0], b.size[2]) * 0.6 || tilt > 35) b.fallen = true;
      if (b.fallen) { fallenMass += b.mass; fallenN++; }
    }
    if (top && top.fallen) topFallen = true;
    if (!q.collapsed) { const c = this.comXZ(); q.comShift = Math.max(q.comShift, Math.hypot(c[0] - q.com0[0], c[1] - q.com0[1])); }
    q.integrity = total ? 1 - fallenMass / total : 1;
    q.fallenN = fallenN;
    if (!q.collapsed && (q.integrity < 0.85 || topFallen || fallenN >= 3)) {
      q.collapsed = true; q.collapseMag = this.mag; q.collapseT = q.t;
      q.reason = topFallen ? 'top' : fallenN >= 3 && q.integrity >= 0.85 ? 'pieces' : 'mass';
      this.onEvent({ type: 'collapse', mag: this.mag, reason: q.reason });
    }
    if (q.mode === 'ramp' && !q.collapsed) q.passed = Math.max(q.passed, q.t >= 2.5 ? Math.min(7, 1 + (Math.floor(q.t / 2.5) - 1) * 0.5) : 0);
    if (q.mode === 'ramp' && !q.collapsed && q.t >= 2.5 * 13) { q.passed = 7; q.done = true; }
    if (q.mode === 'fixed' && q.t >= 8) q.done = true;
    if (q.collapsed && q.t - q.collapseT > 2.5) q.done = true;
  }
  stats() {
    let total = 0, my = 0, top = 0, minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    const byMat = { granite: 0, pine: 0, brick: 0 }, upper = { granite: 0, pine: 0, brick: 0 };
    const h = this.height() || 1;
    for (const b of this.blocks) {
      const p = b.body.translation();
      total += b.mass; my += b.mass * p.y; byMat[b.mat] += b.mass;
      if (p.y > h / 2) upper[b.mat] += b.mass;
      top = Math.max(top, p.y + b.size[1] / 2);
      if (p.y < 0.8) { minx = Math.min(minx, p.x - b.size[0] / 2); maxx = Math.max(maxx, p.x + b.size[0] / 2); minz = Math.min(minz, p.z - b.size[2] / 2); maxz = Math.max(maxz, p.z + b.size[2] / 2); }
    }
    const base = this.blocks.length ? Math.min(maxx - minx, maxz - minz) : 0;
    return { total, comY: total ? my / total : 0, height: top, base, byMat, upper, count: this.blocks.length,
      joints: this.joints.length, broken: this.blocks.filter(b => b.broken).length / 2 };
  }
}

// ---------- preset builders ----------
// 정림사지 오층석탑: dry-stacked granite, low wide roof stones, gentle taper.
// 다른 석탑도 같은 함수로 쌓는다: stories(층수), k(전체 크기), x(놓는 자리), first(1층 몸돌 높이), steps(기단 층단 수), rt(지붕돌 두께)
export function buildJeongnimsa(sim, { taper = 0.86, roof = 1.75, body = 1, ornament = false, stories = 5, k = 1, x: ox = 0, first = 1.45, steps = 0, rt: rtk = 0.24, tone, up = 0.55, jw = 5.2, jh = 0.35, gw = 4.3, gh = 0.4, bt } = {}) {
  const S = (size, y, part, x = 0, z = 0) => sim.addBlock({ mat: 'granite', size: size.map(v => v * k), part, po: tone ? { tone } : undefined, pos: [ox + x * k, (y + size[1] / 2) * k + 0.001, z * k] });
  let y = 0;
  S([jw, jh, jw], y, 'jidae'); y += jh;
  for (let t = 0; t < steps; t++) { S([jw - 0.3 - t * 0.3, 0.3, jw - 0.3 - t * 0.3], y, 'jidae'); y += 0.3; } // 층단으로 쌓은 두툼한 기단(무량사)
  S([gw, gh, gw], y, 'gidan'); y += gh;
  let w = 2.3, rw0 = 2.3 * roof; // bt: 몸돌이 줄어드는 비율(정림사지는 몸돌이 지붕돌보다 빨리 좁아진다)
  for (let i = 0; i < stories; i++) {
    const h = (i === 0 ? first : up * Math.pow(taper, i - 1)) * body;
    S([w, h, w], y, i === 0 ? 'tapsin1' : 'tapsin'); // 1층 몸돌은 우주와 면석을 갖춘 한 덩어리로 쌓는다
    y += h;
    S([w * 1.22, 0.16, w * 1.22], y, 'batchim'); y += 0.16;
    const rw = bt ? rw0 * Math.pow(taper, i) : w * roof, rt = ornament ? 0.42 : rtk;
    S([rw, rt, rw], y, 'okgae'); y += rt;
    if (ornament) for (const sx of [-1, 1]) for (const sz of [-1, 1]) S([0.2, 0.5, 0.2], y, 'jangsik', sx * (rw / 2 - 0.15), sz * (rw / 2 - 0.15));
    w *= bt || taper;
  }
  S([w * 0.9, 0.3, w * 0.9], y, 'noban'); y += 0.3;
  S([0.5, 0.55, 0.5], y, 'bokbal');
}

// 목조 탑 한 층을 세 단계로: 기둥(네 귀 + 심주) → 창방·평방(보) → 지붕판·기와. kind: flex | rigid | none
export function woodPosts(sim, st, h, kind) {
  const d = st.w / 2 - 0.17, ps = 0.26; st.posts = []; st.h = h; st.kind = kind;
  for (const [x, z] of [[-d, -d], [d, -d], [-d, d], [d, d], [0, 0]]) {
    const p = sim.addBlock({ mat: 'pine', size: [ps, h, ps], part: x || z ? 'gidung' : 'simju', pos: [x, st.y + h / 2 + 0.001, z] });
    if (kind !== 'none') sim.addJoint(p, st.below, kind, [x + sim.gx, st.y, z + sim.gz]);
    st.posts.push(p);
  }
  st.y += h;
}
export function woodBeam(sim, st) {
  const y = st.y, beam = sim.addBlock({ mat: 'pine', size: [st.w + 0.1, 0.16, st.w + 0.1], part: 'gongpo', po: { wall: st.h - 0.06 }, pos: [0, y + 0.081, 0] });
  if (st.kind !== 'none') for (const p of st.posts) { const t = p.body.translation(); sim.addJoint(p, beam, st.kind, [t.x, y, t.z]); }
  st.beam = beam; st.y += 0.16;
}
export function woodRoof(sim, st) {
  const rw = st.w * 1.75; let y = st.y;
  const roof = sim.addBlock({ mat: 'pine', size: [rw, 0.14, rw], part: 'cheoma', pos: [0, y + 0.071, 0] });
  if (st.kind !== 'none') sim.addJoint(roof, st.beam, st.kind, [sim.gx, y, sim.gz]);
  y += 0.14;
  const tile = sim.addBlock({ mat: 'brick', size: [rw * 0.96, 0.05, rw * 0.96], pos: [0, y + 0.026, 0], tint: 'tile', part: 'giwa', po: st.peak ? { peak: 1 } : undefined });
  if (st.kind !== 'none') sim.addJoint(tile, roof, 'flex', [sim.gx, y, sim.gz]);
  st.y = y + 0.05; st.below = tile; st.w *= 0.88;
}
export function woodStory(sim, st, h, kind) { woodPosts(sim, st, h, kind); woodBeam(sim, st); woodRoof(sim, st); }
export function woodBase(sim, w = 4.4) {
  const base = sim.addBlock({ mat: 'granite', size: [w, 0.45, w], part: 'wbase', pos: [0, 0.226, 0] });
  return { below: base, y: 0.45, w: w * 0.59 };
}
export function woodFinial(sim, st) {
  const pole = sim.addBlock({ mat: 'pine', size: [0.16, 1.1, 0.16], pos: [0, st.y + 0.551, 0], tint: 'gold', part: 'sangryun' });
  if (st.kind !== 'none') sim.addJoint(pole, st.below, 'flex', [sim.gx, st.y, sim.gz]);
}
// 능사지 목탑(가상 복원): 석조 기단 위 5층 목조.
export function buildNeungsa(sim, { kind = 'flex' } = {}) {
  const st = woodBase(sim);
  for (let i = 0; i < 5; i++) woodStory(sim, st, i === 0 ? 1.25 : 0.95, kind);
  woodFinial(sim, st);
}

// ---------- tiny quaternion helpers ----------
function qmul(a, b) {
  return { w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z, x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w };
}
function qconj(q) { return { x: -q.x, y: -q.y, z: -q.z, w: q.w }; }
function qangle(a, b) { const d = Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w); return 2 * Math.acos(Math.min(1, d)); }
function rotate(q, v) {
  const p = qmul(qmul(q, { x: v[0], y: v[1], z: v[2], w: 0 }), qconj(q)); return [p.x, p.y, p.z];
}
// world-axis inverse inertia of a box block
function invI(b, ax) {
  const [w, h, d] = b.size, m = b.mass, l = rotate(qconj(b.body.rotation()), ax);
  return 12 / m * (l[0] * l[0] / (h * h + d * d) + l[1] * l[1] / (w * w + d * d) + l[2] * l[2] / (w * w + h * h));
}
function toLocal(body, wp) {
  const t = body.translation(), q = body.rotation();
  const r = rotate(qconj(q), [wp[0] - t.x, wp[1] - t.y, wp[2] - t.z]);
  return { x: r[0], y: r[1], z: r[2] };
}
// 보은 법주사 팔상전(조선, 유일한 오층 목탑): 1·2층은 넓고 3·4층, 5층으로 갈수록 칸이 줄어 크게 체감한다.
export function buildPalsang(sim, { kind = 'flex' } = {}) {
  const st = woodBase(sim, 5.8);
  woodStory(sim, st, 1.15, kind); woodStory(sim, st, 0.8, kind); st.w *= 0.78;
  woodStory(sim, st, 0.75, kind); woodStory(sim, st, 0.7, kind); st.w *= 0.78;
  st.peak = true; woodStory(sim, st, 0.65, kind); // 꼭대기는 꼭짓점 하나로 모이는 사모지붕
  woodFinial(sim, st);
}
