# 마을·가람 건물 모델 v2 (garam_scene.py가 SCENE=village일 때 불러 쓴다).
# 백제 시대 양식으로 그럴듯하게: 이중 기단 + 계단, 초석 위 붉은 둥근 기둥(배흘림), 주심포 공포, 녹색·붉은 단청 띠,
# 창살문, 안허리·앙곡이 있는 팔작 기와지붕(수키와 줄 + 수막새 + 용마루·내림마루·추녀마루 + 치미).
# 재료 이름은 게임 village.js의 VNAME으로 VMAT에 짝지어진다: plinth, granite, plaster, red, green, giwa, giwa_row(잉크선 없음),
# bark, pinebark, leaf, straw, mud, paper, gold, glass, modern, iron.
# 한 건물 = 재료마다 메시 하나(그리기 호출을 줄인다). 좌표: 블렌더 (x, y, z), 정면 = -y(게임 +z, 남쪽).
import bpy, bmesh, math, random
from mathutils import Vector

EXTRA = {
    'giwa_row': ((0.11, 0.11, 0.11), 0.55), 'paper': ((0.88, 0.85, 0.76), 0.9), 'gold': ((0.80, 0.60, 0.22), 0.5),
    'pinebark': ((0.45, 0.22, 0.12), 0.95), 'mud': ((0.62, 0.52, 0.38), 0.95), 'straw': ((0.70, 0.58, 0.34), 1.0),
}

def get_mat(name):
    if name not in M:
        rgb, r = EXTRA.get(name, ((0.5, 0.5, 0.5), 0.9))
        M[name] = mat(name, rgb, r)
    return M[name]


def frame(d):
    d = Vector(d).normalized()
    up = Vector((0, 0, 1)) if abs(d.z) < 0.95 else Vector((1, 0, 0))
    u = d.cross(up).normalized(); v = u.cross(d).normalized()
    return u, v


class MB:
    """재료별로 정점·면을 모아 마지막에 재료마다 메시 하나로 만든다."""
    def __init__(s): s.d = {}

    def add(s, m, vs, fs, smooth=False):
        V, F = s.d.setdefault(m, ([], []))
        o = len(V); V.extend(tuple(v) for v in vs); F.extend((tuple(i + o for i in f), smooth) for f in fs)

    def box(s, m, sx, sy, sz, c, rot=0.0, top=1.0):
        hx, hy, hz = sx / 2, sy / 2, sz / 2
        cr, sr = math.cos(rot), math.sin(rot); vs = []
        for z, k in ((-hz, 1.0), (hz, top)):
            for x, y in ((-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)):
                x, y = x * k, y * k
                vs.append((c[0] + x * cr - y * sr, c[1] + x * sr + y * cr, c[2] + z))
        s.add(m, vs, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])

    def tube(s, m, pts, r, n=6, half=False, cap=True):
        pts = [Vector(p) for p in pts]; R = list(r) if isinstance(r, (list, tuple)) else [r] * len(pts)
        k = n + 1 if half else n; vs = []
        for i, p in enumerate(pts):
            u, v = frame(pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)])
            for a in range(k):
                t = (math.pi if half else 2 * math.pi) * a / n
                vs.append(p + R[i] * (math.cos(t) * u + math.sin(t) * v))
        fs = []
        for i in range(len(pts) - 1):
            for a in range(n):
                b = (a + 1) % k
                fs.append((i * k + a, i * k + b, (i + 1) * k + b, (i + 1) * k + a))
        if cap and not half:
            fs.append(tuple(range(k))[::-1]); fs.append(tuple((len(pts) - 1) * k + a for a in range(k)))
        s.add(m, vs, fs, smooth=True)

    def prism(s, m, poly, ext):
        n = len(poly); e = Vector(ext)
        vs = [Vector(p) for p in poly] + [Vector(p) + e for p in poly]
        fs = [tuple(range(n))[::-1], tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        s.add(m, vs, fs)

    def blob(s, m, c, r, sq=0.4, rnd=None, sub=1):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
        rnd = rnd or random
        vs = [(c[0] + v.co.x * r * rnd.uniform(0.8, 1.15), c[1] + v.co.y * r * rnd.uniform(0.8, 1.15), c[2] + v.co.z * r * sq * rnd.uniform(0.7, 1.2)) for v in bm.verts]
        fs = [tuple(v.index for v in f.verts) for f in bm.faces]; bm.free()
        s.add(m, vs, fs)

    def build(s, name):
        for m, (V, F) in s.d.items():
            me = bpy.data.meshes.new(name + '_' + m)
            me.from_pydata(V, [], [f for f, _ in F])
            for p, (_, sm) in zip(me.polygons, F): p.use_smooth = sm
            bm = bmesh.new(); bm.from_mesh(me)
            ng = [fc for fc in bm.faces if len(fc.verts) > 4 and fc.calc_area() > 0]
            if ng: bmesh.ops.triangulate(bm, faces=ng)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(me); bm.free(); me.update()
            o = link(bpy.data.objects.new(name + '_' + m, me)); o.data.materials.append(get_mat(m))
        s.d = {}


# ---------- 지붕: 높이 함수 격자로 짓는다(팔작 paljak · 우진각 hip · 맞배/회랑 straight) ----------
def roof(mb, W, D, H, z0, kind='paljak', gable=0.42, lift=0.32, prof=1.45, thick=0.12, cell=0.3,
         top='giwa', under='red', edge='green', gablem='red', rows=True, sp=0.3, ridge=True, chimi=True,
         convex=False, ridge_m='giwa', unit_rows=None, sumak=True):
    hd = D / 2
    Nd = max(4, round(hd / cell)); c = hd / Nd
    Nx = max(1, round((W / 2) / c)); hw = Nx * c if kind != 'straight' else W / 2
    if kind == 'straight': Nx = max(1, round(hw / c))
    ig = round(gable * Nd) if kind == 'paljak' else (10 ** 6 if kind == 'hip' else 0)
    dxg = ig * c; eps = 0.03

    def f(dd):
        t = min(1.0, max(0.0, dd / hd))
        return H * (math.sin(t * math.pi / 2) ** 1.3 if convex else t ** prof)

    def zf(x, y):
        dy = hd - abs(y); dx = hw - abs(x)
        if kind == 'straight': return z0 + f(dy)
        z = min(f(dy), f(dx)) if dx <= dxg + 1e-6 else f(dy)
        if lift:
            mm = min(dx, dy); dec = max(0.0, 1 - mm / (hd * 0.75)) ** 2
            z += lift * dec * (abs(x) / hw * abs(y) / hd) ** 2.5
        return z0 + z

    # x 격자: 가장자리에서 dx = 0, c, 2c ... (합각 자리 dxg 바로 안쪽에 eps 칸을 하나 더)
    if kind == 'straight':
        dxs = [i * (hw / Nx) for i in range(Nx + 1)]
    else:
        dxs = [i * c for i in range(Nx + 1)]
        if kind == 'paljak' and dxg + eps < hw: dxs = sorted(set(dxs + [dxg + eps]))
    xs = sorted(set([-(hw - d) for d in dxs] + [hw - d for d in dxs]))
    ys = [-hd + j * c for j in range(2 * Nd + 1)]
    NX, NY = len(xs), len(ys)
    T = [[(x, y, zf(x, y)) for y in ys] for x in xs]
    U = [[(x, y, zf(x, y) - thick) for y in ys] for x in xs]
    tf_top, tf_gab, tf_und, tf_edge = [], [], [], []
    vt = [p for col in T for p in col]; vu = [p for col in U for p in col]
    idx = lambda i, j: i * NY + j
    for i in range(NX - 1):
        for j in range(NY - 1):
            a, b, cc, d = idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)
            xm, ym = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
            gab = kind == 'paljak' and abs(abs(xs[i + 1] - xs[i]) - eps) < 1e-6 and max(T[i][j][2], T[i + 1][j][2], T[i][j + 1][2], T[i + 1][j + 1][2]) > z0 + f(dxg) + 1e-3
            if xm * ym > 0: tris = [(a, b, cc), (a, cc, d)]
            else: tris = [(a, b, d), (b, cc, d)]
            (tf_gab if gab else tf_top).extend(tris)
            tf_und.extend(tris)
    mb.add(top, vt, tf_top, True); mb.add(gablem, vt, tf_gab) if tf_gab else None
    mb.add(under, vu, tf_und, True)
    # 처마 끝 두께(평고대) 띠
    ring = [(i, 0) for i in range(NX)] + [(NX - 1, j) for j in range(1, NY)] + [(i, NY - 1) for i in range(NX - 2, -1, -1)] + [(0, j) for j in range(NY - 2, 0, -1)]
    ev = []; ef = []
    for k, (i, j) in enumerate(ring): ev += [T[i][j], U[i][j]]
    n = len(ring)
    for k in range(n):
        a, b = k, (k + 1) % n; ef.append((2 * a, 2 * b, 2 * b + 1, 2 * a + 1))
    mb.add(edge, ev, ef)

    r = sp * 0.3
    if rows:
        lift_r = r * 0.45
        def row(pts, d_out):
            mb.tube('giwa_row', pts, r, n=3, half=True)
            if sumak:
                p0 = Vector(pts[0]); dv = (Vector(pts[1]) - p0).normalized()
                mb.tube('giwa_row', [p0 - dv * 0.05, p0 + dv * 0.01], r * 1.05, n=6)
        # 앞·뒤 물매
        nx = unit_rows or max(2, round(2 * hw / sp)); spx = 2 * hw / nx
        for sy in (-1, 1):
            for i in range(nx):
                x = -hw + spx * (i + 0.5); dx = hw - abs(x)
                if kind == 'straight' or dx > dxg: dmax = hd - r * 1.2
                else: dmax = min(dx, hd) - r * 1.2
                if dmax < sp * 0.5: continue
                k = max(2, int(dmax / 0.55) + 2)
                pts = []
                for t in range(k):
                    dy = dmax * t / (k - 1); y = sy * (hd - dy)
                    pts.append((x, y, zf(x, y) + lift_r))
                row(pts, sy)
        if kind != 'straight':
            ny = max(2, round(2 * hd / sp)); spy = 2 * hd / ny
            for sx in (-1, 1):
                for j in range(ny):
                    y = -hd + spy * (j + 0.5); dy = hd - abs(y)
                    dmax = min(dy, dxg) - r * 1.2
                    if dmax < sp * 0.5: continue
                    k = max(2, int(dmax / 0.55) + 2)
                    pts = [(sx * (hw - dmax * t / (k - 1)), y, zf(sx * (hw - dmax * t / (k - 1)), y) + lift_r) for t in range(k)]
                    row(pts, sx)
    rr = max(0.07, sp * 0.42)
    if ridge and kind != 'straight':
        se = dxg if kind == 'paljak' else min(hd, hw)
        for sx in (-1, 1):  # 추녀마루
            for sy in (-1, 1):
                k = max(3, int(se / 0.3) + 2)
                pts = [(sx * (hw - se * t / (k - 1)), sy * (hd - se * t / (k - 1)), zf(sx * (hw - se * t / (k - 1)), sy * (hd - se * t / (k - 1))) + rr * 0.6) for t in range(k)]
                pts.insert(0, (pts[0][0] + sx * 0.08, pts[0][1] + sy * 0.08, pts[0][2] + 0.07))  # 끝이 살짝 들린 마루 끝
                rad = [rr * 0.55, rr * 0.8] + [rr * 0.9] * (len(pts) - 2)
                mb.tube(ridge_m, pts, rad, n=6)
        if kind == 'paljak':  # 내림마루(합각 위 경사 마루)
            for sx in (-1, 1):
                x = sx * (hw - dxg - eps * 0.5); k = max(4, int((hd - dxg) / 0.25) * 2 + 1)
                pts = [(x, y, zf(x, y) + rr * 0.6) for y in [-(hd - dxg) + 2 * (hd - dxg) * t / (k - 1) for t in range(k)]]
                mb.tube(ridge_m, pts, rr, n=6)
    if ridge:  # 용마루(적새 두 켜)
        xr = (hw if kind == 'straight' else (hw - dxg if kind == 'paljak' else max(0.08, hw - hd)))
        zt = z0 + H
        mb.box(ridge_m, 2 * xr + (0 if kind == 'straight' else 0.1), rr * 2.4, rr * 1.6, (0, 0, zt + rr * 0.5))
        mb.box(ridge_m, 2 * xr + (0 if kind == 'straight' else 0.02), rr * 1.8, rr * 1.4, (0, 0, zt + rr * 1.9))
        if chimi and kind != 'straight':
            sc = max(0.45, H * 0.32); zb = zt + rr * 1.2
            cprof = [(-0.55, 0), (0.12, 0), (0.17, 0.3), (0.24, 0.6), (0.36, 0.92), (0.22, 0.88), (0.06, 0.72), (-0.14, 0.46), (-0.38, 0.22)]
            for sx in (-1, 1):
                poly = [(sx * (xr + u * sc), -rr * 1.15, zb + z * sc) for u, z in cprof]
                mb.prism(ridge_m, poly, (0, rr * 2.3, 0))
    return zf, hw, hd


def rafters(mb, zf, thick, hw, hd, Ww, Dw, step=0.3, r=0.045, m='green', sides=True):
    """처마 밑 서까래: 벽선에서 처마 끝까지 지붕 밑면을 따라."""
    def one(p0, p1):
        a = Vector((p0[0], p0[1], zf(p0[0], p0[1]) - thick - r)); b = Vector((p1[0], p1[1], zf(p1[0], p1[1]) - thick - r))
        mb.tube(m, [a, b], r, n=4)
    n = max(2, round(Ww / step))
    for i in range(n + 1):
        x = -Ww / 2 + Ww * i / n
        for sy in (-1, 1): one((x, sy * (Dw / 2 - 0.1)), (x, sy * (hd - 0.03)))
    if sides:
        n = max(2, round(Dw / step))
        for j in range(n + 1):
            y = -Dw / 2 + Dw * j / n
            for sx in (-1, 1): one((sx * (Ww / 2 - 0.1), y), (sx * (hw - 0.03), y))


# ---------- 기단·계단 ----------
def platform(mb, W, D, tiers, reach, stairs=(-1, 1), stair_w=1.6, m='plinth', capm='granite', pil=True):
    z = 0.0; tops = []
    for k, (mg, h) in enumerate(tiers):
        w, d = W + 2 * mg, D + 2 * mg; cap = min(0.07, h * 0.3)
        mb.box(m, w, d, h - cap, (0, 0, z + (h - cap) / 2))
        mb.box(capm, w + 0.08, d + 0.08, cap, (0, 0, z + h - cap / 2))
        if pil:  # 탱주·우주(면석 사이 돌기둥)
            nw = max(2, round(w / 1.3))
            for i in range(nw + 1):
                for sy in (-1, 1): mb.box(capm, 0.12, 0.03, h - cap, (-w / 2 + w * i / nw, sy * (d / 2 + 0.012), z + (h - cap) / 2))
            nd = max(1, round(d / 1.3))
            for j in range(nd + 1):
                for sx in (-1, 1): mb.box(capm, 0.03, 0.12, h - cap, (sx * (w / 2 + 0.012), -d / 2 + d * j / nd, z + (h - cap) / 2))
        tops.append((z, h, d)); z += h
    for sy in stairs:
        for k, (zb, h, d) in enumerate(tops):
            y0 = d / 2; y1 = (tops[k - 1][2] / 2) if k > 0 else (D / 2 + reach)
            L = y1 - y0
            if L < 0.12: continue
            ns = max(2, round(h / 0.13))
            for i in range(ns):
                yy = y0 + L * (ns - i) / ns
                mb.box(capm if i == ns - 1 else m, stair_w, yy - y0 + 0.02, h * (i + 1) / ns, (0, sy * (y0 + yy) / 2, zb + h * (i + 1) / ns / 2))
            for sx in (-1, 1):  # 소맷돌
                xx = sx * (stair_w / 2 + 0.07)
                poly = [(xx - 0.07, sy * y0, zb), (xx - 0.07, sy * y1, zb), (xx - 0.07, sy * y1, zb + 0.1), (xx - 0.07, sy * y0, zb + h + 0.06)]
                mb.prism(capm, poly, (0.14, 0, 0))
    return z


# ---------- 몸채: 초석·기둥·벽·문·창방·공포 ----------
def sides_of(W, D):
    return {'front': (Vector((0, -D / 2)), Vector((1, 0)), Vector((0, -1)), W),
            'back': (Vector((0, D / 2)), Vector((-1, 0)), Vector((0, 1)), W),
            'left': (Vector((-W / 2, 0)), Vector((0, -1)), Vector((-1, 0)), D),
            'right': (Vector((W / 2, 0)), Vector((0, 1)), Vector((1, 0)), D)}


def wbox(mb, side, t, z, lt, dn, h, m, n_off=0.0):
    o, td, nd, _ = side
    p = o + td * t + nd * n_off
    mb.box(m, lt, dn, h, (p.x, p.y, z), math.atan2(td.y, td.x))


def door(mb, side, t0, t1, zb, zt, leaves=2, frame='red', paper='paper', lattice=True, solid=False):
    L = t1 - t0; lw = L / leaves; h = zt - zb
    wbox(mb, side, (t0 + t1) / 2, zt - 0.04, L, 0.1, 0.08, frame)   # 상인방
    wbox(mb, side, (t0 + t1) / 2, zb + 0.05, L, 0.12, 0.1, frame)   # 하인방(문지방)
    for q in range(leaves):
        a, b = t0 + lw * q, t0 + lw * (q + 1); cm = (a + b) / 2
        for tt in (a + 0.025, b - 0.025): wbox(mb, side, tt, (zb + zt) / 2, 0.05, 0.07, h - 0.1, frame)  # 문울거미
        if solid:  # 판문
            wbox(mb, side, cm, (zb + zt) / 2, lw - 0.05, 0.05, h - 0.18, frame, -0.005)
            for zz in (zb + h * 0.25, zb + h * 0.75): wbox(mb, side, cm, zz, lw - 0.08, 0.03, 0.05, 'iron', 0.03)
            continue
        gz = zb + 0.1 + h * 0.2
        wbox(mb, side, cm, (zb + 0.1 + gz) / 2, lw - 0.05, 0.05, gz - zb - 0.1, frame)             # 궁판
        wbox(mb, side, cm, gz + 0.02, lw - 0.05, 0.06, 0.04, frame)                                 # 띠살 가로대
        wbox(mb, side, cm, (gz + zt - 0.08) / 2, lw - 0.06, 0.012, zt - 0.08 - gz, paper, -0.002)   # 창호지
        if lattice:
            nv = max(2, round((lw - 0.05) / 0.17))
            for i in range(1, nv): wbox(mb, side, a + 0.025 + (lw - 0.05) * i / nv, (gz + zt - 0.08) / 2, 0.022, 0.03, zt - 0.08 - gz, frame, 0.012)
            nh = max(3, round((zt - 0.08 - gz) / 0.24))
            for i in range(1, nh): wbox(mb, side, cm, gz + (zt - 0.08 - gz) * i / nh, lw - 0.06, 0.03, 0.022, frame, 0.012)


def window(mb, side, t, zc, w, h, frame='red', paper='paper'):
    wbox(mb, side, t, zc, w, 0.04, h, paper, 0.03)
    for zz in (zc - h / 2, zc + h / 2): wbox(mb, side, t, zz, w + 0.06, 0.08, 0.05, frame, 0.03)
    for tt in (t - w / 2, t + w / 2): wbox(mb, side, tt, zc, 0.05, 0.08, h, frame, 0.03)
    for i in range(1, 4): wbox(mb, side, t - w / 2 + w * i / 4, zc, 0.02, 0.07, h, frame, 0.04)  # 살창


def gongpo(mb, x, y, z, n, s=1.0):
    """주심포 한 벌: 주두 → 첨차·살미 두 켜 → 소로. n: 바깥 방향(2D)."""
    n = Vector(n).normalized(); t = Vector((-n.y, n.x)); rt = math.atan2(t.y, t.x)
    P = lambda a, b, h: (x + t.x * a + n.x * b, y + t.y * a + n.y * b, z + h * s)
    mb.box('red', 0.3 * s, 0.3 * s, 0.14 * s, P(0, 0, 0.07), rt, top=1.18)            # 주두
    mb.box('green', 0.95 * s, 0.12 * s, 0.13 * s, P(0, 0, 0.205), rt)                  # 1단 첨차
    mb.box('green', 0.12 * s, 0.9 * s, 0.13 * s, P(0, 0.22 * s, 0.205), rt)            # 1단 살미
    mb.box('red', 0.9 * s, 0.14 * s, 0.09 * s, P(0, 0, 0.315), rt)  # 소로 받침(한 덩이로)
    mb.box('green', 1.3 * s, 0.12 * s, 0.13 * s, P(0, 0, 0.425), rt)                   # 2단 첨차
    mb.box('green', 0.12 * s, 1.35 * s, 0.13 * s, P(0, 0.4 * s, 0.425), rt)            # 2단 살미(쇠서)
    mb.box('gold', 0.125 * s, 0.1 * s, 0.135 * s, P(0, 1.05 * s, 0.425), rt)           # 살미 끝 금단청
    for a, b in ((-0.58, 0), (0.58, 0), (0, 0.98)): mb.box('red', 0.14 * s, 0.14 * s, 0.09 * s, P(a * s, b * s, 0.535), rt)
    return 0.58 * s


def body(mb, W, D, H, bays, dbays, zb, doors='all', open_bays=(), gp=1.0, frame='red', col='red', wall='plaster',
         col_r=0.13, square=False, windows=True, inner_doors=False, back_door=True, beam='green'):
    xs = [-W / 2 + W * i / bays for i in range(bays + 1)]
    ys = [-D / 2 + D * j / dbays for j in range(dbays + 1)]
    cols = [(x, y) for x in xs for y in (-D / 2, D / 2)] + [(x, y) for x in (-W / 2, W / 2) for y in ys[1:-1]]
    for (x, y) in cols:
        mb.box('granite', col_r * 3.0, col_r * 3.0, 0.09, (x, y, zb + 0.045))       # 초석
        if square: mb.box(col, col_r * 1.6, col_r * 1.6, H - 0.09, (x, y, zb + 0.09 + (H - 0.09) / 2))
        else: mb.tube(col, [(x, y, zb + 0.09), (x, y, zb + 0.09 + H * 0.3), (x, y, zb + H)], [col_r * 0.93, col_r, col_r * 0.86], n=10)
    S = sides_of(W, D); zt = zb + H - 0.24
    for nm, side in S.items():
        L = side[3]; nb = bays if nm in ('front', 'back') else dbays
        for q in range(nb):
            t0 = -L / 2 + L * q / nb + col_r; t1 = -L / 2 + L * (q + 1) / nb - col_r; tm = (t0 + t1) / 2
            if nm == 'front' and q in open_bays: continue
            if nm == 'back' and q in open_bays and inner_doors: continue
            isdoor = (nm == 'front' and (doors == 'all' or q in doors)) or (nm == 'back' and back_door and q == nb // 2 and doors != 'none')
            if isdoor:
                door(mb, side, t0, t1, zb + 0.09, zt, leaves=2 if t1 - t0 > 0.7 else 1)
                continue
            wbox(mb, side, tm, zb + 0.15, t1 - t0, 0.14, 0.12, frame)                        # 하방
            wbox(mb, side, tm, (zb + 0.21 + zt) / 2, t1 - t0, 0.1, zt - zb - 0.21, wall)       # 벽
            wbox(mb, side, tm, zb + 0.09 + (zt - zb) * 0.55, t1 - t0, 0.13, 0.09, frame)      # 중방
            if windows and nm in ('left', 'right') and nb >= 2 and q == nb // 2:
                window(mb, side, tm, zb + (zt - zb) * 0.75, min(0.6, (t1 - t0) * 0.6), (zt - zb) * 0.25, frame)
        # 창방(녹색) + 머리초(붉은 띠) + 금 띠
        wbox(mb, side, 0, zb + H - 0.12, L + 0.26, 0.2, 0.24, beam)
        for q in range(nb + 1):
            tc = -L / 2 + L * q / nb
            wbox(mb, side, tc, zb + H - 0.12, 0.42, 0.215, 0.245, 'red')
        for q in range(nb):
            tc = -L / 2 + L * (q + 0.5) / nb
            for dd in (-0.06, 0.06): wbox(mb, side, tc + dd, zb + H - 0.12, 0.03, 0.212, 0.243, 'gold')
    top = zb + H
    if gp:
        for (x, y) in cols:
            ns = []
            if abs(y + D / 2) < 1e-6: ns.append((0, -1))
            if abs(y - D / 2) < 1e-6: ns.append((0, 1))
            if abs(x + W / 2) < 1e-6: ns.append((-1, 0))
            if abs(x - W / 2) < 1e-6: ns.append((1, 0))
            for n in ns: h = gongpo(mb, x, y, top, n, gp)
            if len(ns) == 2: gongpo(mb, x, y, top, (ns[0][0] + ns[1][0], ns[0][1] + ns[1][1]), gp)  # 귀포(대각)
        top += 0.58 * gp
        # 외목도리
        for nm, side in S.items():
            o, td, nd, L = side
            a = o + nd * (1.05 * gp) - td * (L / 2 + 0.6 * gp); b = o + nd * (1.05 * gp) + td * (L / 2 + 0.6 * gp)
            mb.tube('green', [(a.x, a.y, top - 0.02), (b.x, b.y, top - 0.02)], 0.07 * gp, n=8)
    return top


def wall_band(mb, W, D, z0, z1, m='plaster'):  # 포벽(공포 사이 벽): 창방 위에서 지붕 밑까지
    S = sides_of(W, D)
    for side in S.values(): wbox(mb, side, 0, (z0 + z1) / 2, side[3] + 0.1, 0.12, z1 - z0, m, -0.03)


def hall_v2(W, D, H, bays, dbays, tiers, ov, roofH, gp=1.0, gable=0.42, lift=0.32, doors='all', open_bays=(), reach=None,
            stairs=(-1, 1), stair_w=None, base_m='plinth', cap_m='granite', sp=0.3, zb=None, mb=None, chimi=True, back_door=True):
    mb = mb or MB()
    if zb is None:
        zb = platform(mb, W, D, tiers, reach if reach is not None else ov - 0.05, stairs, stair_w or min(1.8, W / bays * 0.9), base_m, cap_m)
    top = body(mb, W, D, H, bays, dbays, zb, doors=doors, open_bays=open_bays, gp=gp, back_door=back_door)
    RW, RD = W + 2 * ov, D + 2 * ov
    zf, hw, hd = roof(mb, RW, RD, roofH, top, 'paljak', gable=gable, lift=lift, sp=sp, chimi=chimi)
    wall_band(mb, W, D, zb + H, zf(0, -D / 2) - 0.1)
    rafters(mb, zf, 0.12, hw, hd, W + 0.2, D + 0.2)
    return mb, zf, top


# ---------- 건물들 ----------
def v_hall5():   # 금당(5칸): 이중 기단
    mb, _, _ = hall_v2(7.5, 5.2, 2.2, 5, 3, [(0.62, 0.32), (0.3, 0.34)], 1.0, 2.15, gp=1.0); mb.build('v_hall5')

def v_hall7():   # 강당(7칸)
    mb, _, _ = hall_v2(11.5, 5.2, 2.3, 7, 3, [(0.6, 0.28), (0.3, 0.3)], 1.0, 2.2, gp=1.0, doors=(1, 2, 3, 4, 5)); mb.build('v_hall7')

def v_shelter():  # 석조여래좌상 보호각(1993): 다듬은 화강암 외벌대 기단, 정면 5칸 모두 창살문
    mb, _, _ = hall_v2(9.0, 5.0, 2.6, 5, 2, [(0.45, 0.55)], 1.0, 2.2, gp=1.1, base_m='granite', cap_m='granite', stair_w=2.6); mb.build('v_shelter')

def v_gate():    # 중문(3칸): 가운데 칸은 열린 통로, 안쪽에 판문
    mb = MB()
    zb = platform(mb, 3.4, 2.4, [(0.42, 0.2), (0.22, 0.22)], 0.8, (-1, 1), 1.0)
    top = body(mb, 3.4, 2.4, 1.85, 3, 2, zb, doors=(), open_bays=(1,), gp=0.75, inner_doors=True, back_door=False)
    # 가운데 기둥 줄의 판문(열어 둔 두 짝)
    for sx in (-1, 1):
        mb.box('red', 0.05, 0.5, 1.45, (sx * 0.52, -0.25, zb + 0.09 + 0.725))
    mb.box('red', 1.15, 0.12, 0.12, (0, 0, zb + 1.6))
    zf, hw, hd = roof(mb, 3.4 + 1.7, 2.4 + 1.7, 1.25, top, 'paljak', gable=0.4, lift=0.26, sp=0.26)
    wall_band(mb, 3.4, 2.4, zb + 1.85, zf(0, -1.2) - 0.08)
    rafters(mb, zf, 0.12, hw, hd, 3.6, 2.6)
    mb.build('v_gate')

def v_sbang():   # 승방(7칸, 길고 낮은 집): 외벌대 기단, 공포 없이 민도리
    mb, _, _ = hall_v2(9.0, 3.2, 1.9, 7, 2, [(0.4, 0.4)], 0.85, 1.45, gp=0, doors=(1, 2, 3, 4, 5), stairs=(-1,), stair_w=1.2, back_door=False, chimi=False)
    mb.build('v_sbang')

def v_tile():    # 기와집(백제 귀족의 집): 외벌대 기단, 민도리, 가운데 창살문, 양옆 흰 벽과 살창
    mb = MB()
    zb = platform(mb, 3.0, 2.2, [(0.32, 0.3)], 0.85, (-1,), 1.0)
    top = body(mb, 3.0, 2.2, 1.45, 3, 1, zb, doors=(1,), gp=0, back_door=False)
    S = sides_of(3.0, 2.2)
    for q in (0, 2): window(mb, S['front'], -1.0 if q == 0 else 1.0, zb + 1.0, 0.5, 0.35)
    mb.box('bark', 3.3, 2.5, 0.14, (0, 0, top + 0.05))       # 도리·장여
    zf, hw, hd = roof(mb, 3.0 + 1.8, 2.2 + 1.8, 1.05, top + 0.1, 'paljak', gable=0.4, lift=0.22, sp=0.26, chimi=False)
    rafters(mb, zf, 0.12, hw, hd, 3.1, 2.3, step=0.26)
    mb.build('v_tile')

def v_house():   # 초가집: 낮은 막돌 기단 + 나무 뼈대 + 흙벽 + 창호지 문 + 둥근 초가지붕(용마름·새끼줄)
    mb = MB(); W, D, H = 2.8, 2.2, 1.35
    mb.box('plinth', W + 0.5, D + 0.5, 0.22, (0, 0, 0.11))
    rnd = random.Random(11)
    for i in range(14):  # 막돌
        a = 2 * math.pi * i / 14
        mb.box('granite', rnd.uniform(0.25, 0.4), 0.06, rnd.uniform(0.12, 0.2), ((W / 2 + 0.26) * math.cos(a) * 1.0, (D / 2 + 0.26) * math.sin(a), 0.09), a + math.pi / 2)
    zb = 0.22
    S = sides_of(W, D)
    for x in (-W / 2, -W / 6, W / 6, W / 2):
        for y in (-D / 2, D / 2): mb.box('bark', 0.14, 0.14, H, (x, y, zb + H / 2))
    for y in (0,):
        for x in (-W / 2, W / 2): mb.box('bark', 0.14, 0.14, H, (x, y, zb + H / 2))
    for nm, side in S.items():
        L = side[3]; nb = 3 if nm in ('front', 'back') else 2
        wbox(mb, side, 0, zb + H - 0.07, L + 0.2, 0.15, 0.14, 'bark')   # 도리
        wbox(mb, side, 0, zb + 0.06, L, 0.15, 0.12, 'bark')             # 하방
        for q in range(nb):
            t0 = -L / 2 + L * q / nb + 0.07; t1 = -L / 2 + L * (q + 1) / nb - 0.07; tm = (t0 + t1) / 2
            if nm == 'front' and q == 1:
                door(mb, side, t0 + 0.08, t1 - 0.08, zb + 0.12, zb + H - 0.2, leaves=1, frame='bark')
                wbox(mb, side, t0 + 0.04, (zb + zb + H) / 2, 0.1, 0.1, H - 0.2, 'mud')
                wbox(mb, side, t1 - 0.04, (zb + zb + H) / 2, 0.1, 0.1, H - 0.2, 'mud')
                wbox(mb, side, tm, zb + H - 0.17, t1 - t0, 0.1, 0.06, 'mud')
                continue
            wbox(mb, side, tm, (zb + 0.12 + zb + H - 0.14) / 2, t1 - t0, 0.1, H - 0.26, 'mud')
            wbox(mb, side, tm, zb + H * 0.5, t1 - t0, 0.12, 0.07, 'bark')  # 중방
            if nm == 'front' and q == 2: window(mb, side, tm, zb + H * 0.7, 0.36, 0.3, 'bark')
    # 툇마루
    mb.box('bark', W - 0.2, 0.42, 0.07, (0, -D / 2 - 0.22, zb + 0.28))
    for x in (-W / 2 + 0.2, 0, W / 2 - 0.2): mb.box('bark', 0.08, 0.08, 0.28, (x, -D / 2 - 0.38, zb + 0.14))
    zf, hw, hd = roof(mb, W + 1.1, D + 1.1, 0.95, zb + H - 0.18, 'hip', lift=0.0, thick=0.34, convex=True, top='straw', under='straw', edge='straw',
                      rows=False, ridge=False, cell=0.2)
    # 용마름(용마루를 덮는 짚 이엉)과 새끼줄
    xr = max(0.08, hw - hd); zt = zf(0, 0)
    mb.tube('straw', [(-xr - 0.25, 0, zt - 0.05), (-xr, 0, zt + 0.06), (xr, 0, zt + 0.06), (xr + 0.25, 0, zt - 0.05)], 0.16, n=8)
    for i in range(5):
        x = -hw * 0.8 + 1.6 * hw * i / 4
        pts = [(x, y, zf(x, y) + 0.035) for y in [-hd + 2 * hd * t / 14 for t in range(15)]]
        mb.tube('iron', pts, 0.01, n=3)
    for j in range(2):
        y = (-1 if j == 0 else 1) * hd * 0.45
        pts = [(x, y, zf(x, y) + 0.035) for x in [-hw + 2 * hw * t / 16 for t in range(17)]]
        mb.tube('iron', pts, 0.01, n=3)
    mb.build('v_house')

def v_corridor():  # 회랑 한 칸(길이 3, 이어 붙이면 끊김 없이 이어진다): 기둥 두 줄 + 뒷벽 + 서까래 + 맞배 기와지붕
    mb = MB(); L, D, H = 3.0, 1.2, 1.6
    mb.box('plinth', L, 1.7, 0.25, (0, 0, 0.125)); mb.box('granite', L, 1.76, 0.05, (0, 0, 0.275))
    zb = 0.3
    for x in (-L / 4, L / 4):
        for y in (-D / 2, D / 2):
            mb.box('granite', 0.32, 0.32, 0.07, (x, y, zb + 0.035))
            mb.tube('red', [(x, y, zb + 0.07), (x, y, zb + 0.6), (x, y, zb + H)], [0.1, 0.105, 0.09], n=12)
            mb.box('red', 0.24, 0.24, 0.12, (x, y, zb + H + 0.06), top=1.15)   # 주두
            mb.box('green', 0.12, 0.9, 0.12, (x, y * 0.9, zb + H + 0.18))      # 보아지(살미)
    for y in (-D / 2, D / 2):
        mb.box('green', L, 0.16, 0.2, (0, y, zb + H - 0.1))                    # 창방
        for x in (-L / 4, L / 4): mb.box('red', 0.36, 0.17, 0.21, (x, y, zb + H - 0.1))
        mb.tube('green', [(-L / 2, y * 1.05, zb + H + 0.3), (L / 2, y * 1.05, zb + H + 0.3)], 0.075, n=8)  # 도리
    mb.box('green', L, 0.16, 0.16, (0, 0, zb + H + 0.9))                         # 종도리 받침
    # 뒷벽(바깥쪽, +y): 하방·흰 벽·중방, 기둥 사이로 끊김 없이
    y = D / 2
    mb.box('red', L, 0.14, 0.12, (0, y, zb + 0.13))
    mb.box('plaster', L, 0.1, H - 0.4, (0, y, zb + 0.19 + (H - 0.4) / 2))
    mb.box('red', L, 0.13, 0.09, (0, y, zb + H * 0.55))
    for x in (-L / 4, L / 4): mb.box('red', 0.03, 0.13, H - 0.3, (x + 0.0, y, zb + 0.15 + (H - 0.3) / 2))
    zf, hw, hd = roof(mb, L, 2.5, 0.9, zb + H + 0.32, 'straight', sp=0.3, unit_rows=10, chimi=False, cell=0.2)
    n = 12
    for i in range(n):
        x = -L / 2 + L * (i + 0.5) / n
        for sy in (-1, 1):
            a = (x, sy * (D / 2 - 0.1)); b = (x, sy * (hd - 0.03))
            mb.tube('green', [(a[0], a[1], zf(*a) - 0.12 - 0.04), (b[0], b[1], zf(*b) - 0.12 - 0.04)], 0.04, n=6)
    mb.build('v_corridor')

def v_tree():    # 소나무(적송): 비틀린 줄기, 붉은 윗줄기, 납작한 솔잎 뭉치 여러 켜
    mb = MB(); rnd = random.Random(5)
    pts = []; x = y = 0.0; lean = Vector((0.6, 0.25))
    for k in range(10):
        z = k * 0.5
        x += lean.x * 0.07 + rnd.uniform(-0.1, 0.1) + 0.12 * math.sin(k * 1.3)
        y += lean.y * 0.07 + rnd.uniform(-0.1, 0.1) + 0.1 * math.cos(k * 1.1)
        pts.append((x, y, z))
    R = [0.24 * (1 - 0.7 * k / 9) for k in range(10)]
    mb.tube('bark', pts[:5], R[:5], n=8)
    mb.tube('pinebark', pts[4:], R[4:], n=8)
    mb.tube('bark', [(pts[0][0] + 0.15, pts[0][1], -0.05), (pts[0][0], pts[0][1], 0.2)], [0.36, 0.25], n=8, cap=True)  # 뿌리 쪽 퍼짐
    pads = []
    for k, ang, L, up in ((4, 0.3, 1.5, 0.4), (5, 2.6, 1.3, 0.5), (6, 4.4, 1.4, 0.35), (7, 1.4, 1.0, 0.45), (8, 3.6, 0.9, 0.4)):
        p = Vector(pts[k]); d = Vector((math.cos(ang), math.sin(ang), 0))
        mid = p + d * L * 0.5 + Vector((0, 0, up * 0.35)); end = p + d * L + Vector((0, 0, up))
        mb.tube('pinebark', [p, mid, end], [R[k] * 0.55, R[k] * 0.4, R[k] * 0.25], n=6)
        pads.append((end, 1.05 - 0.08 * (k - 4)))
    pads.append((Vector(pts[-1]) + Vector((0, 0, 0.25)), 0.95))
    for c, s in pads:
        mb.blob('leaf', c + Vector((0, 0, 0.12)), s, sq=0.42, rnd=rnd)
        for q in range(3):
            mb.blob('leaf', c + Vector((rnd.uniform(-.45, .45) * s, rnd.uniform(-.45, .45) * s, 0.2 + 0.08 * q)), s * rnd.uniform(0.55, 0.75), sq=0.45, rnd=rnd)
    mb.build('v_tree')

def v_museum():  # 정림사지박물관(2006): 다듬은 돌 기단, 낮은 현대식 몸체 + 유리 입구, 가운데 기와 팔작지붕
    mb = MB(); W, D = 9.0, 6.0
    mb.box('granite', W + 0.6, D + 0.6, 0.3, (0, 0, 0.15))
    mb.box('modern', W, D, 2.7, (0, 0, 0.3 + 1.35))
    mb.box('granite', W + 0.6, D + 0.6, 0.25, (0, 0, 3.0 + 0.125))               # 처마 슬래브
    # 정면(-y) 유리 입구와 멀리언
    mb.box('glass', 4.0, 0.06, 2.1, (0, -D / 2 - 0.02, 0.3 + 1.05))
    for i in range(6): mb.box('modern', 0.06, 0.1, 2.1, (-2.0 + 4.0 * i / 5, -D / 2 - 0.04, 0.3 + 1.05))
    mb.box('modern', 4.1, 0.12, 0.08, (0, -D / 2 - 0.04, 0.3 + 2.15))
    for x in (-3.4, 3.4): mb.box('glass', 1.2, 0.05, 0.5, (x, -D / 2 - 0.02, 2.2))     # 높은 창
    for y in (-1.5, 1.5):
        for sx in (-1, 1): mb.box('glass', 0.05, 1.2, 0.5, (sx * (W / 2 + 0.02), y, 2.2))
    mb.box('granite', 4.6, 0.9, 0.12, (0, -D / 2 - 0.45, 0.06))                   # 입구 디딤
    # 지붕 위 가운데 홀의 기와 팔작지붕(낮게)
    mb.box('modern', 4.6, 3.6, 0.35, (0, 0, 3.25 + 0.175))
    roof(mb, 6.2, 4.6, 1.15, 3.6, 'paljak', gable=0.42, lift=0.2, sp=0.32, chimi=False)
    mb.build('v_museum')

def v_hall2():   # 중층 금당: 아래층(이중 기단 5칸) 위에 3칸 위층과 지붕을 한 번 더
    mb, zf, top = hall_v2(7.5, 5.2, 2.1, 5, 3, [(0.62, 0.32), (0.3, 0.34)], 1.0, 1.9, gp=0.95, chimi=False)
    zb2 = zf(0, -1.6) + 0.05
    mb.box('red', 4.8, 3.4, 0.12, (0, 0, zb2 - 0.06))
    hall_v2(4.6, 3.2, 1.3, 3, 2, [], 0.85, 1.55, gp=0.8, zb=zb2, mb=mb, back_door=False)
    mb.build('v_hall2')

ASSETS = [('v_house', v_house), ('v_tile', v_tile), ('v_gate', v_gate), ('v_hall5', v_hall5), ('v_hall7', v_hall7), ('v_corridor', v_corridor),
          ('v_tree', v_tree), ('v_museum', v_museum), ('v_hall2', v_hall2), ('v_shelter', v_shelter), ('v_sbang', v_sbang)]
