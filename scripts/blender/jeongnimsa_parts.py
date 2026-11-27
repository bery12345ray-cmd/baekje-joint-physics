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
                sag = -0.25 * lift * (1 - max(abs(x), abs(y)) ** 2) if use_lift else 0
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

def jidae():  # 지대석 5.2 × 0.35 × 5.2: 두툼한 판돌 넷을 맞댄 모양(이음줄)
    s = mat('stone', STONE)
    for ix in (-1, 1):
        for iy in (-1, 1):
            box('slab', 2.58, 2.58, 0.35, (ix * 1.3, iy * 1.3, 0.175), s, bevel=0.03)

def gidan():  # 기단 4.3 × 0.4 × 4.3: 면석 + 모서리 우주 + 가운데 탱주 + 위를 덮는 갑석(살짝 경사)
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    body = 0.29; fw = 3.95
    box('myeonseok', fw, fw, body, (0, 0, body / 2), s, bevel=0.015)
    out = fw / 2 + 0.03
    for ix in (-1, 1):
        for iy in (-1, 1):
            box('woo', 0.24, 0.24, body, (ix * (out - 0.12), iy * (out - 0.12), body / 2), d, bevel=0.012)
    for k in (-1, 1):
        for side in range(4):
            x, y = [(k * fw / 6, out - 0.02), (k * fw / 6, -(out - 0.02)), (out - 0.02, k * fw / 6), (-(out - 0.02), k * fw / 6)][side]
            sx, sy = (0.16, 0.05) if side < 2 else (0.05, 0.16)
            box('tang', sx, sy, body, (x, y, body / 2), d, bevel=0.008)
    # 갑석: 아래는 넓고 위는 살짝 좁게(빗물이 흐르는 경사)
    frustum('gapseok', 4.3, 4.05, 0.11, body, s, bevel=0.01)

def tapsin1():  # 1층 몸돌 2.3 × 1.45 × 2.3: 위가 좁은 몸돌, 민흘림 우주, 면석 이음줄
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    h = 1.45; wb = 2.06; wt = 1.98
    frustum('body', wb, wt, h, 0, s, bevel=0.012)
    for ix in (-1, 1):
        for iy in (-1, 1):
            o = frustum('woo', 0.26, 0.22, h, 0, d, bevel=0.01)
            o.location = (ix * (wb / 2 - 0.1), iy * (wb / 2 - 0.1), 0)
    for k in (-1, 1):  # 면석 이음(가운데 세로줄)
        box('seam', 0.025, 0.02, h * 0.96, (0, k * (wb + wt) / 4, h / 2), d)
        box('seam', 0.02, 0.025, h * 0.96, (k * (wb + wt) / 4, 0, h / 2), d)
    # 미세한 기준 상자(경계 상자를 부재 상자 2.3 × 2.3에 맞추기 위한 투명하지 않은 얇은 판은 두지 않고, 우주가 바깥 너비를 만든다)

def tapsin():  # 2층 이상 몸돌 2.0 × 0.55 × 2.0
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    h = 0.55; wb = 1.9; wt = 1.82
    frustum('body', wb, wt, h, 0, s, bevel=0.01)
    for ix in (-1, 1):
        for iy in (-1, 1):
            o = frustum('woo', 0.16, 0.14, h, 0, d, bevel=0.008)
            o.location = (ix * (wb / 2 - 0.06), iy * (wb / 2 - 0.06), 0)

def batchim():  # 옥개받침 2.8 × 0.16 × 2.8: 층층 받침 셋(공포를 돌로)
    s = mat('stone', STONE)
    for i, (w, z) in enumerate(((2.3, 0.0), (2.55, 0.055), (2.8, 0.11))):
        box('step', w, w, 0.05, (0, 0, z + 0.025), s, bevel=0.008)

def okgae():  # 옥개석 4.0 × 0.24 × 4.0: 얇고 넓으며 처마 끝이 살짝 들린 지붕돌
    s = mat('stone', STONE)
    eave_roof('roof', 2.0, 0.62, 0.075, 0.09, 0.0, 0.24, s)
    box('ridge', 1.2, 1.2, 0.02, (0, 0, 0.235), s)

def noban():  # 노반 1.1 × 0.3 × 1.1
    s = mat('stone', STONE); d = mat('stone_dark', DARK)
    box('base', 1.02, 1.02, 0.22, (0, 0, 0.11), s, bevel=0.02)
    frustum('cap', 1.1, 0.96, 0.08, 0.22, d, bevel=0.01)

def bokbal():  # 복발·보주 0.5 × 0.55 × 0.5
    s = mat('stone', STONE)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.25, location=(0, 0, 0))
    o = bpy.context.active_object; o.scale = (1, 1, 0.75); bpy.ops.object.transform_apply(scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS'); bm.to_mesh(o.data); bm.free()
    o.data.materials.append(s)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.06, depth=0.12, location=(0, 0, 0.22)); bpy.context.active_object.data.materials.append(s)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.1, location=(0, 0, 0.45)); bpy.context.active_object.data.materials.append(s)
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            for p in ob.data.polygons: p.use_smooth = True

PARTS = {'jidae': jidae, 'gidan': gidan, 'tapsin1': tapsin1, 'tapsin': tapsin, 'batchim': batchim, 'okgae': okgae, 'noban': noban, 'bokbal': bokbal}
done = []
for name, fn in PARTS.items():
    reset(); fn(); export(name); done.append(name)
with open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(done, f)
print('manifest', done)
