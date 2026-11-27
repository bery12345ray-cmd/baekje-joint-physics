# 블렌더에서 만든 정림사지 부재를 게임과 같은 치수로 쌓아 미리보기 그림(PNG)으로 찍는다.
# 실행: blender -b -P scripts/blender/preview_jeongnimsa.py -- public/models preview.png
import bpy, sys, os, math
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]
src, png = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)

def place(part, size, z0, x=0, y=0):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(src, part + '.glb'))
    objs = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    mn = Vector((1e9, 1e9, 1e9)); mx = -mn
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c); mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
    sz = mx - mn; ctr = (mn + mx) / 2
    sx, sy, sz_ = size[0] / sz.x, size[2] / sz.y, size[1] / sz.z   # 게임 (가로, 높이, 깊이) → 블렌더 (x, y, z)
    root = bpy.data.objects.new(part, None); bpy.context.collection.objects.link(root)
    for o in objs:
        o.parent = root
        o.location = o.location - ctr
    root.scale = (sx, sy, sz_); root.location = (x, y, z0 + size[1] / 2)

# 정림사지 오층석탑(게임 설계도와 같은 치수: buildJeongnimsa 기본값)
z = 0
place('jidae', (5.2, 0.35, 5.2), z); z += 0.35
place('gidan', (4.3, 0.4, 4.3), z); z += 0.4
w, taper, roof = 2.3, 0.86, 1.75
for i in range(5):
    h = 1.45 if i == 0 else 0.55 * taper ** (i - 1)
    place('tapsin1' if i == 0 else 'tapsin', (w, h, w), z); z += h
    place('batchim', (w * 1.22, 0.16, w * 1.22), z); z += 0.16
    place('okgae', (w * roof, 0.24, w * roof), z); z += 0.24
    w *= taper
place('noban', (w * 0.9, 0.3, w * 0.9), z); z += 0.3
place('bokbal', (0.5, 0.55, 0.5), z)

# 땅과 빛, 카메라
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
g = bpy.context.active_object; gm = bpy.data.materials.new('ground'); gm.use_nodes = True
gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.78, 0.71, 0.58, 1); g.data.materials.append(gm)
sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.2; sun.angle = 0.2
so = bpy.data.objects.new('sun', sun); so.rotation_euler = (math.radians(50), 0, math.radians(35)); bpy.context.collection.objects.link(so)
cam = bpy.data.cameras.new('cam'); cam.lens = 50
co = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(co)
co.location = (11.5, -12.5, 6.2)
d = Vector((0, 0, 3.4)) - co.location; co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
sc = bpy.context.scene; sc.camera = co
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.91, 0.89, 0.85, 1)
sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
sc.render.engine = "BLENDER_WORKBENCH"  # GPU 없이도 또렷한 미리보기(스튜디오 조명 + 오목한 곳 음영 + 윤곽선)
sh = sc.display.shading; sh.light = "STUDIO"; sh.color_type = "MATERIAL"; sh.show_cavity = True; sh.cavity_type = "BOTH"; sh.show_object_outline = True; sh.show_shadows = True
sc.display.shading.object_outline_color = (0.17, 0.15, 0.13)
sc.render.resolution_x, sc.render.resolution_y = 1280, 960
sc.render.filepath = png
bpy.ops.render.render(write_still=True)
print('rendered', png)
