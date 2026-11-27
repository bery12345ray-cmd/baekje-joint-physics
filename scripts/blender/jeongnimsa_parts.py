# 정림사지 오층석탑 부재를 블렌더로 만들어 glTF(.glb)로 내보낸다.
# 실행: blender -b -P scripts/blender/jeongnimsa_parts.py -- <출력 폴더>
# 부재마다 물리 상자와 같은 비례로 만든다(게임은 모델의 경계 상자를 부재 상자 크기에 맞춰 늘린다).
# 재료 이름은 게임 재료와 짝지어진다: stone · stone_dark(→ stone) 등. 블렌더 Z가 위, 내보낼 때 Y가 위로 바뀐다.
import bpy, bmesh, math, os, sys, json
from mathutils import Vector

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'public/models'
os.makedirs(out, exist_ok=True)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, rgb):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = 0.95
    return m

def box(name, sx, sy, sz, loc, m, bevel=0.0, segs=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object; o.name = name
    o.scale = (sx, sy, sz); bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    if bevel > 0:
        md = o.modifiers.new('bevel', 'BEVEL'); md.width = bevel; md.segments = segs; md.limit_method = 'ANGLE'
    return o

def frustum(name, wb, wt, h, z0, m, bevel=0.0):
    # 아래 wb, 위 wt인 네모 뿔대(탑신·우주의 민흘림)
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vs = [bm.verts.new((x * w / 2, y * w / 2, z)) for (w, z) in ((wb, z0), (wt, z0 + h)) for (x, y) in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    bm.faces.new(vs[0:4][::-1]); bm.faces.new(vs[4:8])
    for i in range(4):
        j = (i + 1) % 4; bm.faces.new((vs[i], vs[j], vs[4 + j], vs[4 + i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)  # 면이 바깥을 보게(어둡게 보이지 않도록)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    if bevel > 0:
        md = o.modifiers.new('bevel', 'BEVEL'); md.width = bevel; md.segments = 2; md.limit_method = 'ANGLE'
    return o

def eave_roof(name, a, t, e, lift, z0, z1, m, n=24):
    # 처마 끝이 살짝 들린 옥개석: 아래 처마선 반너비 a, 꼭대기 평면 반너비 t, 처마 두께 e, 귀솟음 lift
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    def ring(half, z, use_lift):
        pts = []
        for s in range(4):
            for i in range(n):
                u = -1 + 2 * i / n
                x, y = [(u, -1), (1, u), (-u, 1), (-1, -u)][s]
                L = lift * (abs(x * y) ** 2.4) if use_lift else 0
                # 처마선이 가운데로 살짝 처지게(완만한 곡선)
                sag = -0.1 * lift * (1 - max(abs(x), abs(y)) ** 2) if use_lift else 0
                pts.append(bm.verts.new((x * half, y * half, z + L + sag)))
        return pts
    R0, R1, R2 = ring(a, z0, True), ring(a, z0 + e, True), ring(t, z1, False)
    N = len(R0)
    cb = bm.verts.new((0, 0, z0)); ct = bm.verts.new((0, 0, z1))
    for i in range(N):
        j = (i + 1) % N
        bm.faces.new((cb, R0[j], R0[i]))
        bm.faces.new((R0[i], R0[j], R1[j], R1[i]))
        bm.faces.new((R1[i], R1[j], R2[j], R2[i]))
        bm.faces.new((ct, R2[i], R2[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = False
    return o

def uv_all():
    # 돌 결 무늬가 고르게 입혀지도록 모든 면에 상자 투영 UV를 준다(UV가 없으면 한 점 색만 찍혀 어두워 보인다)
    for o in [ob for ob in bpy.context.scene.objects if ob.type == "MESH"]:
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.cube_project(cube_size=1.25)
        bpy.ops.object.mode_set(mode="OBJECT")

def export(part):
    uv_all()
    bpy.ops.object.select_all(action='SELECT')
    path = os.path.join(out, part + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT')
    print('exported', path)

STONE = (0.74, 0.72, 0.67); DARK = (0.62, 0.60, 0.55)

def course(name, w, h, z0, cuts_x, cuts_y, m, gap=0.014, bev=0.018):
    # 한 켜(層)의 돌: 판돌을 바둑판처럼 맞대어 사이에 이음줄이 보이게 깐다(cuts는 0~1 사이 나눔 위치)
    xs = [0] + list(cuts_x) + [1]; ys = [0] + list(cuts_y) + [1]
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            x0, x1 = (xs[i] - .5) * w, (xs[i + 1] - .5) * w
            y0, y1 = (ys[j] - .5) * w, (ys[j + 1] - .5) * w
            box(name, x1 - x0 - gap, y1 - y0 - gap, h - gap * .6, ((x0 + x1) / 2, (y0 + y1) / 2, z0 + h / 2), m, bevel=bev)

def jidae():  # 지대석 3.65 × 0.55: 낮은 두 켜의 바닥돌(사진: 아래 켜가 조금 넓고, 길고 짧은 돌이 엇갈려 맞대어짐)
    s = mat('stone', STONE)
    course('lower', 3.65, 0.29, 0.0, (0.22, 0.5, 0.79), (0.3, 0.68), s)
    course('upper', 3.42, 0.26, 0.29, (0.33, 0.61), (0.17, 0.47, 0.83), s)

def gidan():  # 기단 3.0 × 0.42: 면석 + 모서리 우주 + 가운데 탱주 + 위를 덮는 얇은 갑석
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    body = 0.33; fw = 2.84
    course('myeonseok', fw, body, 0.0, (0.5,), (0.5,), s, gap=0.012, bev=0.012)
    o = fw / 2 + 0.02
    for ix in (-1, 1):
        for iy in (-1, 1):
            box('woo', 0.2, 0.2, body, (ix * (o - 0.1), iy * (o - 0.1), body / 2), d, bevel=0.012)
    for side in range(4):  # 가운데 탱주(면마다 하나)
        x, y = [(0, o - 0.015), (0, -(o - 0.015)), (o - 0.015, 0), (-(o - 0.015), 0)][side]
        sx, sy = (0.15, 0.04) if side < 2 else (0.04, 0.15)
        box('tang', sx, sy, body, (x, y, body / 2), d, bevel=0.008)
    frustum('gapseok', 3.0, 2.92, 0.09, body, s, bevel=0.012)

def tapsin1():  # 1층 몸돌 2.3 × 1.1: 모서리마다 따로 세운 우주(민흘림), 면마다 면석 두 장, 위가 살짝 좁음
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    h = 1.1; wb = 2.2; wt = 2.14
    frustum('body', wb, wt, h, 0, s, bevel=0.01)
    for ix in (-1, 1):
        for iy in (-1, 1):
            o = frustum('woo', 0.4, 0.36, h, 0, d, bevel=0.012)
            o.location = (ix * (1.15 - 0.2), iy * (1.15 - 0.2), 0)
    for k in (-1, 1):  # 면석 두 장 사이 세로 이음
        box('seam', 0.03, 0.06, h * 0.98, (0, k * (wb + wt) / 4, h / 2), d)
        box('seam', 0.06, 0.03, h * 0.98, (k * (wb + wt) / 4, 0, h / 2), d)
    for k in (-1, 1):  # 우주와 면석 사이 이음
        for side in (-1, 1):
            box('seam', 0.02, 0.06, h * 0.98, (k * 0.75, side * (wb + wt) / 4, h / 2), d)
            box('seam', 0.06, 0.02, h * 0.98, (side * (wb + wt) / 4, k * 0.75, h / 2), d)

def tapsin():  # 2층 이상 몸돌 1.98 × 0.45: 아주 낮은 몸돌을 두 켜로 쌓고 모서리 우주를 둠
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    h = 0.45; wb = 1.9; wt = 1.86
    frustum('body', wb, wt, h, 0, s, bevel=0.008)
    for ix in (-1, 1):
        for iy in (-1, 1):
            o = frustum('woo', 0.24, 0.22, h, 0, d, bevel=0.008)
            o.location = (ix * (0.99 - 0.12), iy * (0.99 - 0.12), 0)
    for side in range(4):  # 가운데 가로 이음(두 켜)과 세로 이음
        r = (wb + wt) / 4 + 0.004
        sx, sy, x, y = [(wb, 0.02, 0, r), (wb, 0.02, 0, -r), (0.02, wb, r, 0), (0.02, wb, -r, 0)][side]
        box('hseam', sx * 0.9, sy * 0.9 if sy < 1 else sy * 0.9, 0.018, (x, y, h * 0.48), d)
        box('vseam', 0.025 if side < 2 else 0.02, 0.02 if side < 2 else 0.025, h * 0.46, (0.18 if side % 2 else -0.22, y, h * 0.75) if side < 2 else (x, 0.2 if side % 2 else -0.18, h * 0.75), d)

def batchim():  # 옥개받침 1.22w × 0.16: 몸돌 위로 넓어지는 각형 받침 두 단 + 얇은 판(정림사지는 낮고 단정)
    s = mat('stone', STONE)
    for (w, z, hh) in ((2.32, 0.0, 0.055), (2.56, 0.055, 0.055), (2.8, 0.11, 0.05)):
        frustum('step', w - 0.06, w, hh, z, s, bevel=0.006)

def okgae():  # 옥개석 1.63w × 0.24: 얇은 처마, 완만하게 올라가는 낙수면, 귀가 살짝 들림, 위에 두 단 굄
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    eave_roof('roof', 2.0, 0.72, 0.07, 0.03, 0.0, 0.19, s)
    frustum('goem1', 1.44, 1.4, 0.026, 0.19, d, bevel=0.004)
    frustum('goem2', 1.32, 1.28, 0.024, 0.216, s, bevel=0.004)

def noban():  # 노반 0.9w × 0.3: 네모난 받침돌
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    box('base', 1.0, 1.0, 0.22, (0, 0, 0.11), s, bevel=0.03)
    frustum('cap', 1.06, 0.92, 0.08, 0.22, d, bevel=0.012)

def bokbal():  # 꼭대기 0.5 × 0.55: 상륜부는 사라지고 닳은 돌 덩이만 남음(사진처럼 둥그스름하게 닳은 두 덩이)
    s = mat('stone', STONE)
    o = box('worn1', 0.5, 0.5, 0.3, (0, 0, 0.15), s, bevel=0.09, segs=4)
    o = box('worn2', 0.32, 0.3, 0.25, (0.03, -0.02, 0.425), s, bevel=0.08, segs=4)
    o.rotation_euler = (0.05, -0.08, 0.3)

# ---------- 익산 미륵사지 석탑(서탑) 부재 ----------
def mgidan():  # 단층 기단 5.0 × 0.38: 낮게 깐 판돌 + 얇은 갑석
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    course('base', 5.0, 0.27, 0.0, (0.18, 0.41, 0.63, 0.84), (0.25, 0.52, 0.77), s, gap=0.016, bev=0.02)
    frustum('gap', 4.9, 4.78, 0.11, 0.27, d, bevel=0.012)

def mgidung():  # 민흘림 돌기둥 0.36 × 1.35: 아래가 굵고 위가 가는 네모 기둥
    d = mat('stone_dark', DARK)
    frustum('post', 0.36, 0.31, 1.35, 0, d, bevel=0.012)

def msimju():  # 심주석 0.52 × 1.35: 돌 세 덩이를 포개 올린 기둥
    s = mat('stone', STONE)
    for i, (z, hh) in enumerate(((0, 0.47), (0.47, 0.44), (0.91, 0.44))):
        box('simju', 0.52 - i * 0.01, 0.52 - i * 0.01, hh - 0.012, (0, 0, z + hh / 2), s, bevel=0.015)

def mbyeok():  # 벽석 3.08 × 1.35 × 0.2: 세 칸 가운데 칸에 문, 양옆 칸은 판돌을 쌓은 벽, 칸 사이에 기둥을 새김
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    L, H, T = 3.08, 1.35, 0.2; bay = L / 3; door_w = bay * 0.62; door_h = H * 0.78
    for side in (-1, 1):  # 양옆 칸: 판돌 세 켜
        cx = side * bay
        for k, hh in enumerate((0.48, 0.44, 0.43)):
            z0 = sum((0.48, 0.44, 0.43)[:k])
            box('panel', bay - 0.02, T * 0.9, hh - 0.014, (cx, 0, z0 + hh / 2), s, bevel=0.012)
    for side in (-1, 1):  # 가운데 칸 문설주
        w = (bay - door_w) / 2
        box('jamb', w - 0.01, T * 0.9, door_h, (side * (door_w / 2 + w / 2), 0, door_h / 2), s, bevel=0.01)
    box('lintel', bay - 0.02, T * 0.9, H - door_h - 0.01, (0, 0, door_h + (H - door_h) / 2), s, bevel=0.012)
    box('dark', door_w, T * 0.5, door_h, (0, 0.02, door_h / 2), mat('void', (0.08, 0.07, 0.06)))
    for x in (-bay / 2, bay / 2):  # 칸을 나누는 기둥(민흘림)
        o = frustum('post', 0.2, 0.17, H, 0, d, bevel=0.008); o.location = (x, -0.0, 0); o.scale.y = 1.2

def mchangbang():  # 창방·평방 3.9 × 0.24: 아래는 창방, 위는 조금 더 내민 평방
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    course('changbang', 3.8, 0.11, 0.0, (0.33, 0.66), (0.5,), d, gap=0.012, bev=0.01)
    course('pyeongbang', 3.9, 0.12, 0.115, (0.25, 0.5, 0.75), (0.5,), s, gap=0.012, bev=0.01)

def mbatchim():  # 3단 층급받침 4.26 × 0.2
    s = mat('stone', STONE)
    for (w, z, hh) in ((3.82, 0.0, 0.066), (4.04, 0.066, 0.066), (4.26, 0.132, 0.066)):
        frustum('step', w - 0.04, w, hh, z, s, bevel=0.006)

def mokgae():  # 미륵사지 지붕돌 5.4 × 0.2: 아주 얇고 넓으며 위가 거의 평평, 귀가 살짝 들림
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    eave_roof('roof', 2.7, 2.0, 0.07, 0.035, 0.0, 0.17, s)
    frustum('goem', 3.85, 3.8, 0.03, 0.17, d, bevel=0.004)

def mtapsin():  # 2층 이상 몸돌 3.5 × 0.62: 모서리 우주 + 면마다 탱주 둘 + 두 켜
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    h = 0.62; w = 3.4
    course('body', w, h / 2, 0.0, (0.33, 0.66), (0.33, 0.66), s, gap=0.014, bev=0.012)
    course('body', w, h / 2, h / 2, (0.5,), (0.5,), s, gap=0.014, bev=0.012)
    for ix in (-1, 1):
        for iy in (-1, 1):
            box('woo', 0.26, 0.26, h, (ix * (1.75 - 0.13), iy * (1.75 - 0.13), h / 2), d, bevel=0.01)
    for k in (-1, 1):
        for side in range(4):
            x, y = [(k * w / 6, 1.72), (k * w / 6, -1.72), (1.72, k * w / 6), (-1.72, k * w / 6)][side]
            box('tang', 0.18 if side < 2 else 0.06, 0.06 if side < 2 else 0.18, h, (x, y, h / 2), d, bevel=0.006)

PARTS = {'jidae': jidae, 'gidan': gidan, 'tapsin1': tapsin1, 'tapsin': tapsin, 'batchim': batchim, 'okgae': okgae, 'noban': noban, 'bokbal': bokbal,
         'mgidan': mgidan, 'mgidung': mgidung, 'msimju': msimju, 'mbyeok': mbyeok, 'mchangbang': mchangbang, 'mbatchim': mbatchim, 'mokgae': mokgae, 'mtapsin': mtapsin}
done = []
for name, fn in PARTS.items():
    reset(); fn(); export(name); done.append(name)
with open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(done, f)
print('manifest', done)
