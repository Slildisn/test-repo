import sys

p = 'index.html'
s = open(p, encoding='utf-8').read()
if 'const TOWER =' in s:
    print('already patched')
    sys.exit(0)

css_anchor = "  #overlay{position:fixed;inset:0;z-index:8;"
css_new = '''  #mapwrap{position:absolute;top:calc(52px + env(safe-area-inset-top));right:calc(14px + env(safe-area-inset-right));
    width:118px;height:118px;border-radius:10px;overflow:hidden;border:1px solid rgba(140,190,255,.22);
    box-shadow:0 4px 18px rgba(0,0,0,.4),inset 0 0 18px rgba(60,120,200,.15);background:rgba(6,10,18,.7);}
  #mapwrap canvas{width:100%;height:100%;display:block;}
  #coord{position:absolute;right:calc(14px + env(safe-area-inset-right));top:calc(175px + env(safe-area-inset-top));
    font-size:9.5px;letter-spacing:1.5px;color:#7f92b6;font-variant-numeric:tabular-nums;}
  body.rot #mapwrap{top:52px;right:14px;width:104px;height:104px;}
  body.rot #coord{right:14px;top:162px;}
'''
if css_anchor in s:
    s = s.replace(css_anchor, css_new + css_anchor, 1)
else:
    print('MISS css')

hud_anchor = '  <div id="run">疾跑</div>\n</div>'
hud_new = '  <div id="run">疾跑</div>\n  <div id="mapwrap"><canvas id="map" width="236" height="236"></canvas></div>\n  <div id="coord">X 0 · Z 0</div>\n</div>'
if hud_anchor in s:
    s = s.replace(hud_anchor, hud_new, 1)
else:
    print('MISS hud')

blk_old = 'const blockers = [];\nfunction addBlock(x, z, r) { blockers.push({ x, z, r }); }'
blk_new = 'const blockers = [];\nconst mapTrees = [], mapRocks = [];\nfunction addBlock(x, z, r) { blockers.push({ x, z, r }); }'
if blk_old in s:
    s = s.replace(blk_old, blk_new, 1)
else:
    print('MISS blockers')

tree_old = '  addBlock(x, z, .55 * s);\n}\nfor (let i = 0; i < 64; i++) {'
tree_new = '  addBlock(x, z, .55 * s);\n  mapTrees.push({ x, z });\n}\nfor (let i = 0; i < 64; i++) {'
if tree_old in s:
    s = s.replace(tree_old, tree_new, 1)
else:
    print('MISS tree')

rock_old = '  addBlock(x, z, s * .75);\n}'
rock_new = '  addBlock(x, z, s * .75);\n  mapRocks.push({ x, z });\n}'
if rock_old in s:
    s = s.replace(rock_old, rock_new, 1)
else:
    print('MISS rock')

lm_anchor = 'scene.add(ring);\n'
lm_code = open('landmark-block.js', encoding='utf-8').read()
if lm_anchor in s:
    s = s.replace(lm_anchor, lm_anchor + lm_code, 1)
else:
    print('MISS landmark')

sp_old = '  const isSprint = (sprint || shiftDown) && mag > .02;\n  const speed = (isSprint ? SPEED_RUN : SPEED_WALK) * mag;'
sp_new = '''  const isSprint = (sprint || shiftDown) && mag > .02;
  const inWater = Math.hypot(avatar.position.x - POND.x, avatar.position.z - POND.z) < POND.r - .6
    && !(Math.abs(avatar.position.x - BRIDGE.x) <= BRIDGE.halfW + .3 && avatar.position.z > BRIDGE.z0 && avatar.position.z < BRIDGE.z1);
  const speed = (isSprint ? SPEED_RUN : SPEED_WALK) * mag * (inWater ? .55 : 1);'''
if sp_old in s:
    s = s.replace(sp_old, sp_new, 1)
else:
    print('MISS speed')

y_old = '    const lim = GROUND - 7.5;'
y_new = '''    avatar.position.y = THREE.MathUtils.lerp(avatar.position.y, heightAt(avatar.position.x, avatar.position.z), Math.min(1, dt * 12));
    if (avatar.position.y < .01) avatar.position.y = 0;
    const lim = GROUND - 7.5;'''
if y_old in s:
    s = s.replace(y_old, y_new, 1)
else:
    print('MISS y')

cam_old = 'const head = new THREE.Vector3(avatar.position.x, 1.28, avatar.position.z);'
cam_new = 'const head = new THREE.Vector3(avatar.position.x, 1.28 + avatar.position.y, avatar.position.z);'
if cam_old in s:
    s = s.replace(cam_old, cam_new, 1)
else:
    print('MISS cam')

map_anchor = 'const clock = new THREE.Clock();\nfunction loop() {'
map_code = open('minimap-block.js', encoding='utf-8').read()
if map_anchor in s:
    s = s.replace(map_anchor, map_code + map_anchor, 1)
else:
    print('MISS map')

loop_old = '  renderer.render(scene, camera);\n}'
loop_new = open('loop-block.js', encoding='utf-8').read() + '\n}'
if loop_old in s:
    s = s.replace(loop_old, loop_new, 1)
else:
    print('MISS loop')

open(p, 'w', encoding='utf-8').write(s)
print('patched bytes', len(s.encode()))
