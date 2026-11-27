# 정림사지 리플렛 그림용 3D 장면: 오늘날 절터(석탑·금당 터·강당 자리 보호각·회랑 터·연못·박물관)와 근접 장면을 블렌더로 짓고 렌더한다.
# 실행: blender -b --factory-startup -P scripts/blender/garam_scene.py -- <models 폴더> <출력 폴더> [장면 이름들...]
# 좌표: 게임 마을(village.js)과 같은 단위. 게임 (x, z) → 블렌더 (x, -z), 북쪽이 +y.
import bpy, bmesh, sys, os, math, random
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
src, out = args[0], args[1]
only = set(args[2:])
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(7)
C = bpy.context

# ---------- 재료 ----------
def mat(name, rgb, rough=0.85, noise=0.0, scale=6.0, bump=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough
    if noise > 0:
        tc = nt.nodes.new('ShaderNodeTexCoord'); n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 8
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color = (*[c * (1 - noise) for c in rgb], 1); ramp.color_ramp.elements[1].color = (*[min(1, c * (1 + noise * 0.4)) for c in rgb], 1)
        nt.links.new(tc.outputs['Object'], n.inputs['Vector']); nt.links.new(n.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
        if bump > 0:
            bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump
            nt.links.new(n.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m

M = {
    'granite': mat('granite', (0.47, 0.45, 0.40), 0.9, 0.35, 14, 0.25),
    'granite_dark': mat('granite_dark', (0.36, 0.34, 0.31), 0.9, 0.35, 14, 0.25),
    'plinth': mat('plinth', (0.55, 0.53, 0.48), 0.9, 0.3, 5, 0.2),
    'lawn': mat('lawn', (0.20, 0.33, 0.12), 1.0, 0.35, 2.5, 0.1),
    'soil': mat('soil', (0.62, 0.54, 0.40), 1.0, 0.25, 3, 0.1),
    'path': mat('path', (0.70, 0.66, 0.58), 0.95, 0.2, 4),
    'red': mat('red', (0.36, 0.08, 0.05), 0.6, 0.15, 8),
    'plaster': mat('plaster', (0.86, 0.84, 0.78), 0.9, 0.08, 4),
    'green': mat('green', (0.10, 0.28, 0.22), 0.6),
    'giwa': mat('giwa', (0.12, 0.12, 0.12), 0.55, 0.25, 30, 0.3),
    'water': mat('water', (0.10, 0.16, 0.16), 0.05),
    'modern': mat('modern', (0.72, 0.70, 0.66), 0.7, 0.1, 3),
    'glass': mat('glass', (0.08, 0.10, 0.12), 0.1),
    'leaf': mat('leaf', (0.09, 0.20, 0.07), 1.0, 0.4, 3, 0.4),
    'bark': mat('bark', (0.20, 0.14, 0.09), 1.0),
    'iron': mat('iron', (0.06, 0.06, 0.06), 0.5),
    'town': mat('town', (0.78, 0.74, 0.68), 0.9, 0.1, 2),
    'townroof': mat('townroof', (0.35, 0.33, 0.32), 0.7),
    'tile': mat('tile', (0.42, 0.38, 0.32), 0.95, 0.4, 18, 0.6),
    'cloth': mat('cloth', (0.05, 0.05, 0.06), 1.0),
    'ink': mat('ink', (0.22, 0.20, 0.17), 0.9),
}

def link(o):
    C.collection.objects.link(o); return o

def box(sx, sy, sz, loc, m, bevel=0.0, rot=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = C.active_object; o.scale = (sx, sy, sz); o.rotation_euler.z = rot
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    if bevel:
        md = o.modifiers.new('b', 'BEVEL'); md.width = bevel; md.segments = 2
    return o

def cyl(r, h, loc, m, n=16, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=r, depth=h, location=loc)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=n, radius1=r, radius2=r2, depth=h, location=loc)
    o = C.active_object; o.data.materials.append(m); return o

# ---------- 기와지붕(우진각): 처마 귀가 들리고 가운데가 오목한 곡면 ----------
def hip_roof(W, D, H, loc, m, lift=0.35, eave=0.12, n=12, rot=0.0):
    me = bpy.data.meshes.new('roof'); bm = bmesh.new()
    def ring(hw, hd, z, lifted):
        pts = []
        for s in range(4):
            for i in range(n):
                t = -1 + 2 * i / n
                x, y = [(t, -1), (1, t), (-t, 1), (-1, -t)][s]
                L = lift * (abs(t) ** 3) if lifted else 0
                pts.append(bm.verts.new((x * hw, y * hd, z + L)))
        return pts
    hw, hd = W / 2, D / 2
    ridge_hw = max(0.05, hw - hd * 0.95)
    rings = [ring(hw, hd, 0, True), ring(hw, hd, eave, True),
             ring(hw * 0.78 + ridge_hw * 0.22, hd * 0.6, eave + H * 0.28, False),
             ring(ridge_hw + (hw - ridge_hw) * 0.25, hd * 0.25, eave + H * 0.72, False),
             ring(ridge_hw, 0.04, eave + H, False)]
    N = len(rings[0])
    for a, b in zip(rings, rings[1:]):
        for i in range(N):
            j = (i + 1) % N; bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('roof', me)); o.location = loc; o.rotation_euler.z = rot
    o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    box(ridge_hw * 2 + 0.2, 0.16, 0.16, (loc[0], loc[1], loc[2] + eave + H + 0.04), m, rot=rot)  # 용마루
    return o

def hall(cx, cy, W, D, H, bays=5, plinth=0.6, rot=0.0, open_front=False, roofH=None):
    c, s = math.cos(rot), math.sin(rot)
    P = lambda x, y, z: (cx + x * c - y * s, cy + x * s + y * c, z)
    box(W + 1.0, D + 1.0, plinth, P(0, 0, plinth / 2), M['plinth'], 0.03, rot)
    for k in range(3):  # 계단
        box(1.6, 0.35, plinth * (k + 1) / 3.2, P(0, -(D + 1.0) / 2 - 0.35 * (2.5 - k), plinth * (k + 1) / 6.4), M['plinth'], 0.01, rot)
    if not open_front:
        box(W - 0.1, D - 0.1, H, P(0, 0, plinth + H / 2), M['plaster'], 0, rot)
    else:
        box(W - 0.1, 0.12, H, P(0, D / 2 - 0.1, plinth + H / 2), M['plaster'], 0, rot)
        for sx in (-1, 1): box(0.12, D - 0.1, H, P(sx * (W / 2 - 0.08), 0, plinth + H / 2), M['plaster'], 0, rot)
    for i in range(bays + 1):
        x = -W / 2 + W * i / bays
        for y in (-D / 2, D / 2):
            cyl(0.13, H, P(x, y, plinth + H / 2), M['red'], 12)
    for y in (-D / 2, D / 2):
        box(W + 0.3, 0.22, 0.26, P(0, y, plinth + H - 0.05), M['green'], 0, rot)
    for x in (-W / 2, W / 2):
        box(0.22, D + 0.3, 0.26, P(x, 0, plinth + H - 0.05), M['green'], 0, rot)
    if not open_front:  # 정면 창살 문
        for i in range(bays):
            x = -W / 2 + W * (i + 0.5) / bays
            box(W / bays * 0.8, 0.05, H * 0.75, P(x, -D / 2 - 0.02, plinth + H * 0.42), M['red'], 0, rot)
    hip_roof(W + 2.2, D + 2.2, roofH or min(W, D) * 0.42, P(0, 0, plinth + H + 0.12), M['giwa'], rot=rot)

def corridor_base(x0, y0, x1, y1, w=1.7):
    L = math.hypot(x1 - x0, y1 - y0); a = math.atan2(y1 - y0, x1 - x0)
    box(L, w, 0.28, ((x0 + x1) / 2, (y0 + y1) / 2, 0.14), M['plinth'], 0.02, a)
    for k in range(int(L / 1.4)):  # 초석 줄
        t = (k + 0.5) / int(L / 1.4)
        for off in (-0.45, 0.45):
            cyl(0.16, 0.08, (x0 + (x1 - x0) * t - math.sin(a) * off, y0 + (y1 - y0) * t + math.cos(a) * off, 0.31), M['granite'], 10)

def tree(x, y, s=1.0):
    cyl(0.12 * s, 2.0 * s, (x, y, 1.0 * s), M['bark'], 8)
    for k in range(3):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=(1.2 - k * 0.25) * s, location=(x + random.uniform(-.3, .3) * s, y + random.uniform(-.3, .3) * s, (2.2 + k * 0.8) * s))
        o = C.active_object; o.data.materials.append(M['leaf']); o.scale.z = 0.8
        d = o.modifiers.new('d', 'DISPLACE'); tx = bpy.data.textures.new('t', 'CLOUDS'); tx.noise_scale = 0.4; d.texture = tx; d.strength = 0.35 * s

def pond(cx, cy, w, d):
    box(w + 0.6, d + 0.6, 0.3, (cx, cy, 0.1), M['granite'], 0.02)
    box(w, d, 0.1, (cx, cy, 0.22), M['water'])

# ---------- 석탑(게임과 같은 실물 비례, 블렌더 부재 glb) ----------
def place(part, size, z0, x=0, y=0):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(src, part + '.glb'))
    objs = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    mn = Vector((1e9, 1e9, 1e9)); mx = -mn
    for o in objs:
        for cc in o.bound_box:
            w = o.matrix_world @ Vector(cc); mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
    sz = mx - mn; ctr = (mn + mx) / 2
    root = link(bpy.data.objects.new(part, None))
    for o in objs:
        o.parent = root; o.location = o.location - ctr
        for i, sl in enumerate(o.material_slots):
            sl.material = M['granite_dark'] if sl.material and 'dark' in sl.material.name else M['granite']
    root.scale = (size[0] / sz.x, size[2] / sz.y, size[1] / sz.z); root.location = (x, y, z0 + size[1] / 2)

def stone_pagoda():
    z = 0
    place('jidae', (3.65, 0.55, 3.65), z); z += 0.55
    place('gidan', (3.0, 0.42, 3.0), z); z += 0.42
    w, taper, roof = 2.3, 0.86, 1.63
    for i in range(5):
        h = 1.1 if i == 0 else 0.45 * taper ** (i - 1)
        place('tapsin1' if i == 0 else 'tapsin', (w, h, w), z); z += h
        place('batchim', (w * 1.22, 0.16, w * 1.22), z); z += 0.16
        rw = 2.3 * roof * taper ** i
        place('okgae', (rw, 0.24, rw), z); z += 0.24
        w *= 0.78
    place('noban', (w * 0.9, 0.3, w * 0.9), z); z += 0.3
    place('bokbal', (0.5, 0.55, 0.5), z)

def fence(r=3.6):
    for k in range(4):
        a = k * math.pi / 2
        for t in range(9):
            u = -r + 2 * r * t / 8
            x, y = (u, -r) if k == 0 else (r, u) if k == 1 else (-u, r) if k == 2 else (-r, -u)
            box(0.06, 0.06, 0.7, (x, y, 0.35), M['iron'])
        for zz in (0.25, 0.62):
            box(2 * r if k % 2 == 0 else 0.04, 0.04 if k % 2 == 0 else 2 * r, 0.04, ((0, -r, zz) if k == 0 else (r, 0, zz) if k == 1 else (0, r, zz) if k == 2 else (-r, 0, zz)), M['iron'])

# ---------- 오늘날 정림사지 ----------
def site_today():
    box(300, 300, 0.2, (0, 0, -0.1), M['lawn'])
    for (hx, hy, hr) in [(-60, 90, 40), (20, 110, 45), (90, 70, 35), (-110, 30, 40), (110, -20, 30)]:  # 멀리 둘러싼 낮은 산(부소산 쪽)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=hr, location=(hx, hy, -hr * 0.62)); o = C.active_object; o.scale.z = 0.55; o.data.materials.append(M['leaf'])
    box(6.2, 6.2, 0.05, (0, 0, 0.02), M['soil'])               # 석탑 둘레 마사토
    box(2.4, 26, 0.04, (0, -16, 0.02), M['path'])               # 중문에서 남쪽으로 난 길
    box(30, 3, 0.04, (0, -21, 0.03), M['path'])
    stone_pagoda(); fence()
    box(3.6, 2.6, 0.35, (0, -7.2, 0.18), M['plinth'], 0.03)     # 중문 터
    box(8.3, 6.0, 0.6, (0, 7.5, 0.3), M['plinth'], 0.04)        # 금당 터와 초석
    for i in range(6):
        for j in range(4):
            cyl(0.24, 0.16, (-3.4 + i * 1.36, 7.5 - 2.2 + j * 1.46, 0.68), M['granite'], 12)
    hall(0, 15.2, 9, 5, 3.2, bays=5, plinth=0.6)                  # 강당 자리 석조여래좌상 보호각(1993)
    corridor_base(-8.9, -7.2, -1.9, -7.2); corridor_base(1.9, -7.2, 8.9, -7.2)
    corridor_base(-8.9, -7.2, -10.3, 15.6); corridor_base(8.9, -7.2, 10.3, 15.6)
    pond(-4.2, -11.2, 4.5, 2.8); pond(4.2, -11.2, 4.5, 2.8)
    museum(17.5, 6)
    for (x, y) in [(-14, -4), (-15, 8), (-13, 18), (14, -6), (13.5, 19), (-6, -18), (7, -18), (-20, 0), (21, -4), (-18, 22), (5, 25), (-5, 26)]:
        tree(x, y, random.uniform(0.8, 1.15))
    for k in range(60):  # 둘레 시가지(낮은 집들)
        a = random.uniform(0, 2 * math.pi); r = random.uniform(28, 38)
        x, y = r * math.cos(a), r * math.sin(a) * 1.1
        w, d = random.uniform(2.5, 4.5), random.uniform(2.5, 4)
        h = random.uniform(1.4, 3.0)
        box(w, d, h, (x, y, h / 2), M['town'], 0, a)
        box(w + 0.4, d + 0.4, 0.2, (x, y, h + 0.1), M['townroof'], 0, a)

def museum(cx, cy):
    box(6, 10, 3.0, (cx, cy, 1.5), M['modern'], 0.04)
    box(6.6, 10.6, 0.3, (cx, cy, 3.15), M['granite_dark'], 0.03)
    box(0.1, 4.5, 1.9, (cx - 3.02, cy, 1.1), M['glass'])
    hip_roof(5.0, 6.0, 1.3, (cx, cy + 1.6, 3.3), M['giwa'], lift=0.2)
    box(4, 0.1, 0.5, (cx - 3.4, cy - 3.5, 0.25), M['granite'])

# ---------- 근접 장면 ----------
def inscription():
    # 1층 몸돌 남쪽 면에 새긴 "大唐平百濟國碑銘"(글자는 일부만, 얕게 새긴 모양)
    txt = '大唐平百濟國碑銘'
    for i, ch in enumerate(txt):
        bpy.ops.object.text_add(location=(0.55 - (i // 4) * 0.22, -1.135, 1.85 - (i % 4) * 0.2), rotation=(math.pi / 2, 0, 0))
        t = C.active_object; t.data.body = ch; t.data.size = 0.16; t.data.extrude = 0.004
        fp = 'C:/Windows/Fonts/batang.ttc'
        if os.path.exists(fp): t.data.font = bpy.data.fonts.load(fp)
        t.data.materials.append(M['ink'])
    small = '顯慶五年歲在庚申八月己巳朔十五日癸未建洛州河南權懷素書夫惟皇天降鑒聖人應期乘時而作百濟國王扶餘義慈'
    fp = 'C:/Windows/Fonts/batang.ttc'
    for col in range(9):  # 작은 글자들(세로로 여러 줄, 닳아 희미함)
        bpy.ops.object.text_add(location=(-0.05 - col * 0.085, -1.134, 2.0), rotation=(math.pi / 2, 0, 0))
        t = C.active_object; t.data.body = chr(10).join(small[(col * 9) % 40:(col * 9) % 40 + 10]); t.data.size = 0.065; t.data.space_line = 1.05
        if os.path.exists(fp): t.data.font = bpy.data.fonts.load(fp)
        t.data.materials.append(M['ink'])

def tile_set(ox=200):
    box(8, 8, 0.1, (ox, 0, -0.05), M['cloth'])
    me = bpy.data.meshes.new('tile'); bm = bmesh.new()
    pts = [(-0.9, -1.3), (-1.05, 0.2), (-0.6, 1.2), (0.3, 1.35), (0.75, 0.4), (0.65, -0.9), (0.1, -1.4)]
    for zz in (0.0, 0.16):
        for x, y in pts: bm.verts.new((ox + x, y, zz + random.uniform(-0.015, 0.015)))
    bmesh.ops.convex_hull(bm, input=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('tile', me)); o.data.materials.append(M['tile']); o.location.z = 0.0
    for k in range(-5, 6):  # 생선뼈무늬(빗살)
        for j in range(-6, 7):
            if abs(k * 0.16) < 0.8 and abs(j * 0.2) < 1.15:
                b = box(0.14, 0.03, 0.012, (ox + k * 0.16, j * 0.2, 0.165), M['granite_dark'], 0, 0.6 if k % 2 else -0.6)
    for col, txt in enumerate(['太平八年戊辰定', '林寺大藏當草']):
        for i, ch in enumerate(txt):
            bpy.ops.object.text_add(location=(ox + 1.75 - col * 0.32, 1.1 - i * 0.32, 0.01))
            t = C.active_object; t.data.body = ch; t.data.size = 0.26
            fp = 'C:/Windows/Fonts/batang.ttc'
            if os.path.exists(fp): t.data.font = bpy.data.fonts.load(fp)
            t.data.materials.append(M['plaster'])

def buddha_set(ox=-200):
    box(14, 14, 0.1, (ox, 0, -0.05), M['plinth'])
    box(10, 0.3, 6, (ox, 3.5, 3), M['plaster']);
    for x in (-3.5, 3.5): cyl(0.2, 6, (ox + x, 3.2, 3), M['red'])
    box(10, 0.4, 0.5, (ox, 3.2, 5.8), M['green'])
    for k, (r, h) in enumerate([(1.0, 0.35), (0.85, 0.3), (1.05, 0.35)]):
        cyl(r, h, (ox, 0, 0.18 + k * 0.33), M['granite'], 8)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(ox, 0, 1.35)); o = C.active_object; o.scale = (1.25, 0.8, 0.42)  # 가부좌한 다리
    o.data.materials.append(M['granite']); bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(ox, 0, 2.05)); o = C.active_object; o.scale = (0.72, 0.5, 0.78)  # 몸
    o.data.materials.append(M['granite']); d = o.modifiers.new('d', 'DISPLACE'); tx = bpy.data.textures.new('w', 'CLOUDS'); tx.noise_scale = 0.35; d.texture = tx; d.strength = 0.18
    bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.42, location=(ox, 0, 3.05)); o = C.active_object; o.scale = (0.8, 0.75, 0.95)
    o.data.materials.append(M['granite']); d = o.modifiers.new('d', 'DISPLACE'); d.texture = tx; d.strength = 0.12
    bpy.ops.object.shade_smooth()
    cyl(0.26, 0.2, (ox, 0, 2.82), M['granite_dark'], 16)  # 목
    cyl(0.3, 0.5, (ox, 0, 3.6), M['granite_dark'], 16, 0.27)
    cyl(0.42, 0.07, (ox, 0, 3.88), M['granite_dark'], 16)  # 관 위 판
    

# ---------- 하늘·빛·렌더 ----------
def sky(sun_el=38, sun_rot=150, strength=0.12):
    w = bpy.data.worlds.new('w'); C.scene.world = w; w.use_nodes = True
    nt = w.node_tree; bg = nt.nodes['Background']
    s = nt.nodes.new('ShaderNodeTexSky')
    try: s.sky_type = 'NISHITA'
    except Exception: pass
    try:
        s.sun_elevation = math.radians(sun_el); s.sun_rotation = math.radians(sun_rot)
    except Exception: pass
    nt.links.new(s.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = strength
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 2.2; sun.angle = math.radians(1.5); sun.color = (1, 0.96, 0.9)
    so = link(bpy.data.objects.new('sun', sun)); so.rotation_euler = (math.radians(90 - sun_el), 0, math.radians(sun_rot))

def shot(name, loc, target, lens=35, w=1400, h=930, samples=int(os.environ.get('SAMPLES', 48))):
    if only and name not in only: return
    cam = bpy.data.cameras.new(name); cam.lens = lens
    co = link(bpy.data.objects.new(name, cam)); co.location = loc
    co.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    sc = C.scene; sc.camera = co
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.view_settings.view_transform = 'AgX' if 'AgX' in [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
    sc.view_settings.look = 'None'; sc.view_settings.exposure = float(os.environ.get('EXPO', -1.2))
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 88
    sc.render.filepath = os.path.join(os.path.abspath(out), name + '.jpg')
    bpy.ops.render.render(write_still=True); print('rendered', name)

site_today(); inscription(); tile_set(); buddha_set()
sky()
shot('aerial', (24, -36, 20), (1, 6, 0), lens=30)
shot('pagoda', (2.6, -10.5, 1.3), (0, 0, 3.1), lens=32, w=1100, h=1300)
shot('scar', (0.1, -3.4, 1.55), (-0.2, 0, 1.55), lens=50)
shot('tile', (200.4, -2.4, 4.4), (200.3, 0, 0), lens=45)
shot('buddha', (-200 + 1.2, -7.5, 2.4), (-200, 0, 2.1), lens=50, w=1000, h=1200)
shot('hall', (-8, -2, 2.2), (0, 15, 2.5), lens=32)
shot('museum', (5, -8, 2.4), (17.5, 6, 2), lens=35)
