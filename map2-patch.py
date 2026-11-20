import sys

P = 'index.html'
s = open(P, encoding='utf-8').read()
if 'const TOWER =' in s:
    print('already patched'); sys.exit(0)

MISS = []
def rep(old, new, label):
    global s
    if old in s:
        s = s.replace(old, new, 1)
    else:
        MISS.append(label)

rep('  #overlay{position:fixed;inset:0;z-index:8;',
'''  #mapwrap{position:absolute;top:calc(52px + env(safe-area-inset-top));right:calc(14px + env(safe-area-inset-right));
    width:118px;height:118px;border-radius:10px;overflow:hidden;border:1px solid rgba(140,190,255,.22);
    box-shadow:0 4px 18px rgba(0,0,0,.4),inset 0 0 18px rgba(60,120,200,.15);background:rgba(6,10,18,.7);}
  #mapwrap canvas{width:100%;height:100%;display:block;}
  #coord{position:absolute;right:calc(14px + env(safe-area-inset-right));top:calc(175px + env(safe-area-inset-top));
    font-size:9.5px;letter-spacing:1.5px;color:#7f92b6;font-variant-numeric:tabular-nums;}
  body.rot #mapwrap{top:52px;right:14px;width:104px;height:104px;}
  body.rot #coord{right:14px;top:162px;}
  #overlay{position:fixed;inset:0;z-index:8;''', 'css')

rep('  <div id="run">疾跑</div>\n</div>',
'''  <div id="run">疾跑</div>
  <div id="mapwrap"><canvas id="map" width="236" height="236"></canvas></div>
  <div id="coord">X 0 · Z 0</div>
</div>''', 'hud')

rep('const blockers = [];\nfunction addBlock(x, z, r) { blockers.push({ x, z, r }); }',
'''const blockers = [];
const mapTrees = [], mapRocks = [];
function addBlock(x, z, r) { blockers.push({ x, z, r }); }''', 'blockers')

rep('  addBlock(x, z, .55 * s);\n}\nfor (let i = 0; i < 64; i++) {',
'''  addBlock(x, z, .55 * s);
  mapTrees.push({ x, z });
}
for (let i = 0; i < 64; i++) {''', 'tree')

rep('  addBlock(x, z, s * .75);\n}',
'''  addBlock(x, z, s * .75);
  mapRocks.push({ x, z });
}''', 'rock')

LM = open('landmark-block.txt', encoding='utf-8').read()
rep('scene.add(ring);\n', 'scene.add(ring);\n\n' + LM, 'landmark')

rep('  const isSprint = (sprint || shiftDown) && mag > .02;\n  const speed = (isSprint ? SPEED_RUN : SPEED_WALK) * mag;',
'''  const isSprint = (sprint || shiftDown) && mag > .02;
  const inWater = Math.hypot(avatar.position.x - POND.x, avatar.position.z - POND.z) < POND.r - .6
    && !(Math.abs(avatar.position.x - BRIDGE.x) <= BRIDGE.halfW + .3 && avatar.position.z > BRIDGE.z0 && avatar.position.z < BRIDGE.z1);
  const speed = (isSprint ? SPEED_RUN : SPEED_WALK) * mag * (inWater ? .55 : 1);''', 'speed')

rep('    const lim = GROUND - 7.5;',
'''    avatar.position.y = THREE.MathUtils.lerp(avatar.position.y, heightAt(avatar.position.x, avatar.position.z), Math.min(1, dt * 12));
    if (avatar.position.y < .01) avatar.position.y = 0;
    const lim = GROUND - 7.5;''', 'height')

rep('const head = new THREE.Vector3(avatar.position.x, 1.28, avatar.position.z);',
'const head = new THREE.Vector3(avatar.position.x, 1.28 + avatar.position.y, avatar.position.z);', 'cam')

MC = open('minimap-block.txt', encoding='utf-8').read()
rep('const clock = new THREE.Clock();\nfunction loop() {', MC + 'const clock = new THREE.Clock();\nfunction loop() {', 'minimap')

LOOP = open('loop-block.txt', encoding='utf-8').read()
rep('  renderer.render(scene, camera);\n}', LOOP + '\n  renderer.render(scene, camera);\n}', 'loop')

if MISS:
    print('MISSING:', MISS)
    sys.exit(1)

open(P, 'w', encoding='utf-8').write(s)
print('patched bytes', len(s.encode()))
