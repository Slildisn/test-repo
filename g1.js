'use strict';
if (typeof THREE === 'undefined') { showFatal('三维库加载失败，检查网络后刷新。'); }
function showFatal(msg) {
const o = document.getElementById('overlay');
if (!o) return;
o.style.display = 'flex';
o.innerHTML = '<h1 style="font-size:22px">启动失败</h1><div class="sub">' + msg + '</div>';
}
const cv = document.getElementById('cv');
let renderer;
try {
renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
showFatal('浏览器没开 WebGL（3D 加速）。用 Chrome / Safari 打开，或开启硬件加速后刷新。');
throw err;
}
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xdceaf6, 0.0075);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 260);
function skyTexture() {
const c = document.createElement('canvas');
c.width = 2; c.height = 256;
const g = c.getContext('2d');
const grd = g.createLinearGradient(0, 0, 0, 256);
grd.addColorStop(0, '#4a93cf');
grd.addColorStop(.35, '#7db9e4');
grd.addColorStop(.62, '#b3d9f0');
grd.addColorStop(1, '#e3f1fa');
g.fillStyle = grd; g.fillRect(0, 0, 2, 256);
const t = new THREE.CanvasTexture(c);
t.colorSpace = THREE.SRGBColorSpace;
return t;
}
scene.background = skyTexture();
scene.add(new THREE.HemisphereLight(0xdcefff, 0x6b7a58, 1.35));
const sun = new THREE.DirectionalLight(0xfff3dd, 2.35);
sun.position.set(20, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
sun.shadow.camera.far = 130;
sun.shadow.bias = -0.0012;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xc9dcf0, 0.5));
const GROUND = 60;
function grassTexture() {
const c = document.createElement('canvas');
c.width = c.height = 512;
const g = c.getContext('2d');
g.fillStyle = '#4c6b4a'; g.fillRect(0, 0, 512, 512);
for (let i = 0; i < 4200; i++) {
const x = Math.random() * 512, y = Math.random() * 512;
const r = 1 + Math.random() * 2.2;
g.fillStyle = Math.random() < .5 ? 'rgba(112,146,96,.5)' : 'rgba(58,86,58,.55)';
g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill();
}
const t = new THREE.CanvasTexture(c);
t.wrapS = t.wrapT = THREE.RepeatWrapping;
t.repeat.set(24, 24);
t.colorSpace = THREE.SRGBColorSpace;
return t;
}
const ground = new THREE.Mesh(
new THREE.PlaneGeometry(GROUND * 2, GROUND * 2),
new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: .95, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const pathMat = new THREE.MeshStandardMaterial({ color: 0x8a8b84, roughness: .9 });
for (let i = 0; i < 62; i++) {
const s = new THREE.Mesh(new THREE.CircleGeometry(1.5 + Math.random() * .8, 9), pathMat);
s.rotation.x = -Math.PI / 2;
s.position.set((Math.random() - .5) * 5, .015, 42 - i * 1.45);
s.receiveShadow = true;
scene.add(s);
}
const TOWER = { x: -25, z: -24, r: 3.2 };
const POND = { x: 18, z: -26, r: 9 };
const BRIDGE = { x: 18, halfW: 1.9, z0: -38.5, z1: -13.5, h: 1.6 };
const blockers = [];
const mapTrees = [], mapRocks = [];
function addBlock(x, z, r, h) { blockers.push({ x, z, r, h: h || 1.6 }); }
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b5238, roughness: .9 });
const pineMat = new THREE.MeshStandardMaterial({ color: 0x3f7a58, roughness: .85 });
const pineMat2 = new THREE.MeshStandardMaterial({ color: 0x336a4c, roughness: .85 });
function tree(x, z, s) {
const g = new THREE.Group();
const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18, .28, 2.2, 8), trunkMat);
trunk.position.y = 1.1; trunk.castShadow = true;
g.add(trunk);
for (let i = 0; i < 3; i++) {
const c = new THREE.Mesh(new THREE.ConeGeometry(1.5 - i * .38, 1.6, 9), i % 2 ? pineMat2 : pineMat);
c.position.y = 2.1 + i * .95; c.castShadow = true;
g.add(c);
}
g.position.set(x, 0, z);
g.scale.setScalar(s);
g.rotation.y = Math.random() * 6.28;
scene.add(g);
addBlock(x, z, .55 * s, 4 * s);
mapTrees.push({ x, z });
}
for (let i = 0; i < 64; i++) {
let a = Math.random() * 6.28, r = 12 + Math.random() * (GROUND - 18);
let x = Math.sin(a) * r, z = Math.cos(a) * r;
for (let k = 0; k < 20 && nearLandmark(x, z, 2.6); k++) {
a = Math.random() * 6.28; r = 12 + Math.random() * (GROUND - 18);
x = Math.sin(a) * r; z = Math.cos(a) * r;
}
if (nearLandmark(x, z, 2.6)) continue;
tree(x, z, .85 + Math.random() * .55);
}
function rock(x, z, s) {
const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0),
new THREE.MeshStandardMaterial({ color: 0x8b93a0, roughness: .95, flatShading: true }));
m.position.set(x, s * .55, z);
m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
m.castShadow = true; m.receiveShadow = true;
scene.add(m);
addBlock(x, z, s * .75, s * 1.5);
mapRocks.push({ x, z });
}
for (let i = 0; i < 42; i++) {
let a = Math.random() * 6.28, r = 8 + Math.random() * (GROUND - 12);
let x = Math.sin(a) * r, z = Math.cos(a) * r;
for (let k = 0; k < 20 && nearLandmark(x, z, 3); k++) {
a = Math.random() * 6.28; r = 8 + Math.random() * (GROUND - 12);
x = Math.sin(a) * r; z = Math.cos(a) * r;
}
if (nearLandmark(x, z, 3)) continue;
rock(x, z, .5 + Math.random() * .7);
}
const lanterns = [];
function lantern(x, z) {
const g = new THREE.Group();
const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 2.6, 8), trunkMat);
pole.position.y = 1.3; pole.castShadow = true;
g.add(pole);
const orb = new THREE.Mesh(new THREE.SphereGeometry(.22, 14, 12),
new THREE.MeshStandardMaterial({ color: 0xfff0d2, emissive: 0xffb060, emissiveIntensity: 0.7, roughness: .4 }));
orb.position.y = 2.75;
g.add(orb);
const pl = new THREE.PointLight(0xffc483, 0.55, 12, 1.6);
pl.position.y = 2.75;
g.add(pl);
g.position.set(x, 0, z);
scene.add(g);
lanterns.push({ orb, light: pl, phase: Math.random() * 6.28 });
addBlock(x, z, .3, 3);
}
lantern(-4.5, 6); lantern(4.5, 6); lantern(-5, -5); lantern(5, -5);
const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8a8a80, roughness: .9 });
const ring = new THREE.Group();
for (let i = 0; i < 132; i++) {
const a = i / 132 * 6.283;
const x = Math.sin(a) * (GROUND - 4), z = Math.cos(a) * (GROUND - 4);
const post = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.1, .12), fenceMat);
post.position.set(x, .55, z);
post.rotation.y = a;
post.castShadow = true;
ring.add(post);
}
scene.add(ring);
const ripples = [];
const pondCircles = [];
function nearLandmark(x, z, pad) {
if (Math.hypot(x - POND.x, z - POND.z) < POND.r + pad + 2.2) return true;
if (Math.hypot(x - TOWER.x, z - TOWER.z) < TOWER.r + pad) return true;
if (Math.abs(x - BRIDGE.x) < BRIDGE.halfW + pad + .8 && z > BRIDGE.z0 - pad - 1 && z < BRIDGE.z1 + pad + 1) return true;
return false;
}
function heightAt(x, z) {
if (Math.abs(x - BRIDGE.x) <= BRIDGE.halfW && z > BRIDGE.z0 && z < BRIDGE.z1) {
const t = (z - BRIDGE.z0) / (BRIDGE.z1 - BRIDGE.z0);
return Math.sin(Math.PI * t) * BRIDGE.h;
}
return 0;
}
(function buildTower() {
const g = new THREE.Group();
const stone = new THREE.MeshStandardMaterial({ color: 0x8f8b82, roughness: .88, metalness: .06 });
const stone2 = new THREE.MeshStandardMaterial({ color: 0x7c7870, roughness: .9 });
const base = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.5, 1.2, 16), stone2);
base.position.y = .6; base.castShadow = true; base.receiveShadow = true;
g.add(base);
for (let i = 0; i < 3; i++) {
const rTop = 2.5 - i * .45, rBot = 2.9 - i * .45, h = 3.2;
const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 16), i % 2 ? stone2 : stone);
seg.position.y = 1.2 + h / 2 + i * (h + .15);
seg.castShadow = true; seg.receiveShadow = true;
g.add(seg);
const band = new THREE.Mesh(new THREE.TorusGeometry(rTop + .05, .1, 6, 18),
new THREE.MeshStandardMaterial({ color: 0xd8b887, roughness: .6, metalness: .3 }));
band.rotation.x = Math.PI / 2;
band.position.y = 1.2 + h + i * (h + .15);
g.add(band);
}
const cap = new THREE.Mesh(new THREE.ConeGeometry(2.05, 2.6, 16), stone2);
cap.position.y = 11.9; cap.castShadow = true;
g.add(cap);
const orb = new THREE.Mesh(new THREE.SphereGeometry(.5, 18, 14),
new THREE.MeshStandardMaterial({ color: 0xfff2c9, emissive: 0xffc070, emissiveIntensity: 1.2, roughness: .3 }));
orb.position.y = 13.6;
g.add(orb);
const orbLight = new THREE.PointLight(0xffc483, 1.2, 34, 1.8);
orbLight.position.y = 13.6;
g.add(orbLight);
for (let i = 0; i < 6; i++) {
const a = i / 6 * 6.283 + .3;
const win = new THREE.Mesh(new THREE.BoxGeometry(.5, .9, .12),
new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffb268, emissiveIntensity: .8, roughness: .4 }));
win.position.set(Math.sin(a) * 2.78, 3.4, Math.cos(a) * 2.78);
win.rotation.y = a;
g.add(win);
}
g.position.set(TOWER.x, 0, TOWER.z);
g.rotation.y = .6;
scene.add(g);
addBlock(TOWER.x, TOWER.z, TOWER.r, 14);
window.__towerOrb = orb;
})();
(function buildPond() {
const sand = new THREE.Mesh(new THREE.RingGeometry(POND.r - .4, POND.r + 2.2, 40),
new THREE.MeshStandardMaterial({ color: 0xc8b58c, roughness: 1 }));
sand.rotation.x = -Math.PI / 2;
sand.position.set(POND.x, .02, POND.z);
sand.receiveShadow = true;
scene.add(sand);
const water = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 48),
new THREE.MeshStandardMaterial({ color: 0x4a9cc2, roughness: .14, metalness: .6,
transparent: true, opacity: .62 }));
water.rotation.x = -Math.PI / 2;
water.position.set(POND.x, .06, POND.z);
scene.add(water);
const glow = new THREE.PointLight(0x9fe8ff, 0.35, 26, 1.8);
glow.position.set(POND.x, 1.2, POND.z);
scene.add(glow);
for (let i = 0; i < 5; i++) {
const m = new THREE.Mesh(new THREE.RingGeometry(.22, .34, 28),
new THREE.MeshBasicMaterial({ color: 0xeafcff, transparent: true, opacity: .35,
side: THREE.DoubleSide, depthWrite: false }));
m.rotation.x = -Math.PI / 2;
let rx, rz, tries = 0;
do {
const a = Math.random() * 6.283, rr = Math.random() * (POND.r - 3.2);
rx = POND.x + Math.sin(a) * rr;
rz = POND.z + Math.cos(a) * rr;
tries++;
} while ((Math.abs(rx - BRIDGE.x) < 4.2 && rz > BRIDGE.z0 - 2 && rz < BRIDGE.z1 + 2) && tries < 25);
m.position.set(rx, .09, rz);
scene.add(m);
ripples.push({ mesh: m, t: Math.random() });
}
for (let i = 0; i < 16; i++) {
const a = Math.random() * 6.283, rr = POND.r - .2 + Math.random() * 1.2;
const reed = new THREE.Mesh(new THREE.CylinderGeometry(.03, .05, .9 + Math.random() * .7, 5),
new THREE.MeshStandardMaterial({ color: 0x5c8a52, roughness: .9 }));
reed.position.set(POND.x + Math.sin(a) * rr, .5, POND.z + Math.cos(a) * rr);
reed.rotation.z = (Math.random() - .5) * .3;
scene.add(reed);
pondCircles.push(reed);
}
})();
(function buildBridge() {
const g = new THREE.Group();
const slabMat = new THREE.MeshStandardMaterial({ color: 0xc3bcae, roughness: .92, flatShading: true });
const railMat = new THREE.MeshStandardMaterial({ color: 0xa9a294, roughness: .9 });
const len = BRIDGE.z1 - BRIDGE.z0;
const steps = 22;
const pierMat0 = new THREE.MeshStandardMaterial({ color: 0xb0a99b, roughness: .95, flatShading: true });
for (let i = 0; i < steps; i++) {
const t = (i + .5) / steps;
const z = BRIDGE.z0 + t * len;
const y = Math.sin(Math.PI * t) * BRIDGE.h;
const slab = new THREE.Mesh(new THREE.BoxGeometry(BRIDGE.halfW * 2 - .1, .14, len / steps + .22), slabMat);
slab.position.set(BRIDGE.x, y - .09, z);
slab.castShadow = true; slab.receiveShadow = true;
g.add(slab);
for (const side of [-1, 1]) {
const rail = new THREE.Mesh(new THREE.BoxGeometry(.14, .62, len / steps + .04), railMat);
rail.position.set(BRIDGE.x + side * (BRIDGE.halfW - .1), y + .26, z);
rail.castShadow = true;
g.add(rail);
}
if (y > .12) {
for (const side of [-1, 1]) {
const wallH = Math.max(.14, y - .02);
const wall = new THREE.Mesh(new THREE.BoxGeometry(.16, wallH, len / steps + .05), pierMat0);
wall.position.set(BRIDGE.x + side * (BRIDGE.halfW - .06), .06 + wallH / 2, z);
wall.castShadow = true; wall.receiveShadow = true;
g.add(wall);
}
}
}
const pierMat = new THREE.MeshStandardMaterial({ color: 0x9e9a90, roughness: .95, flatShading: true });
for (const t of [0, 1]) {
const z = BRIDGE.z0 + t * len;
const abut = new THREE.Mesh(new THREE.BoxGeometry(BRIDGE.halfW * 2 + .5, .5, 1.6), pierMat);
abut.position.set(BRIDGE.x, -.1, z + (t === 0 ? -0.85 : 0.85));
abut.castShadow = true; abut.receiveShadow = true;
g.add(abut);
}
for (const t of [.3, .7]) {
const z = BRIDGE.z0 + t * len;
const deckY = Math.sin(Math.PI * t) * BRIDGE.h;
const pierH = Math.max(.5, deckY - .28);
const pier = new THREE.Mesh(new THREE.CylinderGeometry(.55, .75, pierH, 10), pierMat);
pier.position.set(BRIDGE.x, pierH / 2, z);
pier.castShadow = true;
g.add(pier);
}
scene.add(g);
})();
const towerHalo = new THREE.Sprite(new THREE.SpriteMaterial({
map: glowSprite(), transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false
}));
towerHalo.scale.set(9, 9, 1);
towerHalo.position.set(TOWER.x, 13.6, TOWER.z);
scene.add(towerHalo);
function glowSprite() {
const c = document.createElement('canvas');
c.width = c.height = 64;
const g = c.getContext('2d');
const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
grd.addColorStop(0, 'rgba(255,225,180,.9)');
grd.addColorStop(.4, 'rgba(255,200,140,.35)');
grd.addColorStop(1, 'rgba(0,0,0,0)');
g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
const t = new THREE.CanvasTexture(c);
t.colorSpace = THREE.SRGBColorSpace;
return t;
}