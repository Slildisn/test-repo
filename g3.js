'use strict';
scene.add(camera);
const handR = rig.armR.userData.hand;
const handGuns = {}, vmGuns = {};
const VM_BASE = { x: .175, y: -.16, z: -.42 };
for (const slot of WEAPON_SLOTS) {
const hg = gunMesh(slot.id);
hg.scale.setScalar(.94);
hg.position.set(0, .012, .055);
hg.rotation.set(0, .04, 0);
hg.visible = false;
hg.userData.basePos = hg.position.clone();
handR.add(hg);
handGuns[slot.id] = hg;
const vg = gunMesh(slot.id);
vg.scale.setScalar(.82);
vg.position.set(VM_BASE.x, VM_BASE.y, VM_BASE.z);
vg.rotation.set(.02, -.1, .03);
vg.visible = false;
vg.userData.basePos = vg.position.clone();
vg.userData.baseRot = vg.rotation.clone();
vg.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
camera.add(vg);
vmGuns[slot.id] = vg;
}
let heldIndex = -1, held = null, fireCd = 0, hitCount = 0, shotsFired = 0, flashTimer = 0, flashGun = null, gunRecoil = 0;
const tracers = [], holes = [], sparks = [];
const wstatEl = document.getElementById('wstat');
const takeBtn = document.getElementById('take');
const fireBtn = document.getElementById('fire');
const crossEl = document.getElementById('cross');
const flashLight = new THREE.PointLight(0xffb268, 0, 8, 2);
scene.add(flashLight);
const holeTexShared = (() => {
const c = document.createElement('canvas');
c.width = c.height = 32;
const g = c.getContext('2d');
g.fillStyle = 'rgba(20,14,11,.95)';
g.beginPath(); g.arc(16, 16, 6.5, 0, 6.2832); g.fill();
g.strokeStyle = 'rgba(120,95,70,.5)'; g.lineWidth = 3;
g.beginPath(); g.arc(16, 16, 9.5, 0, 6.2832); g.stroke();
return new THREE.CanvasTexture(c);
})();
const holeMat = new THREE.MeshBasicMaterial({ map: holeTexShared, transparent: true, depthWrite: false });
let actx = null, noiseBuf = null;
function getAudio() {
if (!actx) {
const AC = window.AudioContext || window.webkitAudioContext;
if (!AC) return null;
try { actx = new AC(); } catch (e) { return null; }
}
if (actx.state === 'suspended') actx.resume();
return actx;
}
function getNoise(ctx) {
if (noiseBuf) return noiseBuf;
const n = Math.floor(ctx.sampleRate * .6);
const b = ctx.createBuffer(1, n, ctx.sampleRate);
const d = b.getChannelData(0);
for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
noiseBuf = b;
return b;
}
function playShot(type) {
const ctx = getAudio(); if (!ctx) return;
const t0 = ctx.currentTime;
const cfg = type === 'shotgun'
? { dur: .40, body: 150, lp: 1500, g: 1 }
: (type === 'rifle'
? { dur: .20, body: 250, lp: 2300, g: .8 }
: { dur: .15, body: 340, lp: 3000, g: .7 });
const src = ctx.createBufferSource();
src.buffer = getNoise(ctx);
const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cfg.lp;
const gain = ctx.createGain();
gain.gain.setValueAtTime(.0001, t0);
gain.gain.linearRampToValueAtTime(cfg.g, t0 + .004);
gain.gain.exponentialRampToValueAtTime(.0008, t0 + cfg.dur);
src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
src.start(t0); src.stop(t0 + cfg.dur + .05);
const osc = ctx.createOscillator(); osc.type = 'triangle';
osc.frequency.setValueAtTime(cfg.body, t0);
osc.frequency.exponentialRampToValueAtTime(cfg.body * .45, t0 + cfg.dur * .6);
const og = ctx.createGain();
og.gain.setValueAtTime(cfg.g * .75, t0);
og.gain.exponentialRampToValueAtTime(.0008, t0 + cfg.dur * .85);
osc.connect(og); og.connect(ctx.destination);
osc.start(t0); osc.stop(t0 + cfg.dur);
}
function playHit() {
const ctx = getAudio(); if (!ctx) return;
const t0 = ctx.currentTime;
const o = ctx.createOscillator(); o.type = 'square';
o.frequency.setValueAtTime(920, t0);
o.frequency.exponentialRampToValueAtTime(430, t0 + .09);
const g = ctx.createGain();
g.gain.setValueAtTime(.14, t0);
g.gain.exponentialRampToValueAtTime(.0008, t0 + .1);
o.connect(g); g.connect(ctx.destination);
o.start(t0); o.stop(t0 + .11);
}
function updateWstat() {
wstatEl.textContent = (held ? held.name : '空手') + ' · 射击 ' + shotsFired + ' · 命中 ' + hitCount;
takeBtn.textContent = held ? '换枪' : '拿枪';
}
function syncCross() {
if (!crossEl) return;
crossEl.style.display = (held && firstPerson) ? 'block' : 'none';
}
function nearRack() {
return Math.hypot(avatar.position.x - RACK.x, avatar.position.z - RACK.z) < 3.2;
}
function cycleWeapon() {
if (!nearRack()) {
wstatEl.textContent = held ? '要回到武器架才能换枪' : '走到武器架旁边才能拿枪';
setTimeout(updateWstat, 1300);
return;
}
if (heldIndex >= 0) WEAPON_SLOTS[heldIndex].rackMesh.visible = true;
heldIndex = (heldIndex + 1) % WEAPON_SLOTS.length;
held = WEAPON_SLOTS[heldIndex];
WEAPON_SLOTS[heldIndex].rackMesh.visible = false;
for (const s of WEAPON_SLOTS) { handGuns[s.id].visible = false; vmGuns[s.id].visible = false; }
handGuns[held.id].visible = !firstPerson;
vmGuns[held.id].visible = firstPerson;
gunRecoil = 0;
syncCross();
updateWstat();
}
function spawnTracer(a, b) {
const len = a.distanceTo(b);
if (len < .1) return;
const geo = new THREE.CylinderGeometry(.011, .011, len, 5, 1, true);
const mat = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: .9,
blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const mesh = new THREE.Mesh(geo, mat);
mesh.position.copy(a).add(b).multiplyScalar(.5);
mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
scene.add(mesh);
tracers.push({ mesh, life: .18 });
if (tracers.length > 14) {
const t = tracers.shift();
scene.remove(t.mesh); t.mesh.geometry.dispose();
}
}
function addHole(p, from) {
const m = new THREE.Mesh(new THREE.PlaneGeometry(.095, .095), holeMat);
m.position.copy(p).addScaledVector(from ? p.clone().sub(from).normalize() : new THREE.Vector3(0, 0, 1), .012);
m.lookAt(from || new THREE.Vector3());
scene.add(m);
holes.push(m);
if (holes.length > 26) {
const h = holes.shift();
scene.remove(h);
}
}
function spawnSpark(p, color) {
const s = new THREE.Sprite(new THREE.SpriteMaterial({
map: glowSprite(), color: color, transparent: true, opacity: 1,
blending: THREE.AdditiveBlending, depthWrite: false
}));
s.position.copy(p);
s.scale.set(.34, .34, 1);
scene.add(s);
sparks.push({ s, life: .22 });
}
function castShot(origin, dir) {
let best = null, bestT = Infinity;
for (const tg of targets) {
const oc = new THREE.Vector3(tg.x, tg.y, tg.z).sub(origin);
const t = oc.dot(dir);
if (t < .5 || t > 70) continue;
const perp = oc.clone().addScaledVector(dir, -t).length();
if (perp < tg.r && t < bestT) { bestT = t; best = tg; }
}
const end = origin.clone().addScaledVector(dir, best ? bestT : 45);
spawnTracer(origin, end);
if (best) {
hitCount++;
best.vel += 1.1;
addHole(end, origin);
spawnSpark(end, 0xffcf88);
playHit();
updateWstat();
}
}
function fireGun() {
if (!held) { wstatEl.textContent = '先到武器架拿一把枪'; setTimeout(updateWstat, 1300); return; }
if (fireCd > 0) return;
fireCd = held.cd;
shotsFired++;
const gun = firstPerson ? vmGuns[held.id] : handGuns[held.id];
gun.updateWorldMatrix(true, false);
const muzzle = new THREE.Vector3(0, gun.userData.muzzleY, gun.userData.muzzleZ);
muzzle.applyMatrix4(gun.matrixWorld);
const dir = new THREE.Vector3();
camera.getWorldDirection(dir);
for (let i = 0; i < held.pellets; i++) {
const d = dir.clone();
if (held.pellets > 1 || held.spread > .005) {
d.x += (Math.random() - .5) * held.spread * 2;
d.y += (Math.random() - .5) * held.spread * 2;
d.z += (Math.random() - .5) * held.spread * 2;
d.normalize();
}
castShot(muzzle, d);
}
gun.userData.flash.material.opacity = 1;
gun.userData.flash.material.rotation = Math.random() * 6.28;
flashTimer = .08; flashGun = gun;
gunRecoil = 1;
flashLight.position.copy(muzzle);
flashLight.intensity = held.id === 'shotgun' ? 3.4 : 2.2;
playShot(held.id);
camPitch = clampPitch(camPitch - held.kick * .22);
fireBtn.classList.add('on');
setTimeout(() => fireBtn.classList.remove('on'), 90);
updateWstat();
}
takeBtn.addEventListener('click', e => { e.stopPropagation(); cycleWeapon(); });
takeBtn.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); cycleWeapon(); }, { passive: false });
fireBtn.addEventListener('click', e => { e.stopPropagation(); fireGun(); });
fireBtn.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); fireGun(); }, { passive: false });
addEventListener('keydown', e => {
const k = e.key.toLowerCase();
if (k === 'e') cycleWeapon();
if (k === 'j' || k === 'r') fireGun();
});
let wDownX = 0, wDownY = 0, wMoved = 0;
cv.addEventListener('mousedown', e => { wDownX = e.clientX; wDownY = e.clientY; wMoved = 0; });
addEventListener('mousemove', e => { wMoved = Math.max(wMoved, Math.hypot(e.clientX - wDownX, e.clientY - wDownY)); });
addEventListener('mouseup', e => {
const tgt = e.target;
if (tgt && tgt.closest && tgt.closest('#fire,#take,#run,#jump,#view,#start')) return;
if (wMoved < 8) fireGun();
});
updateWstat();