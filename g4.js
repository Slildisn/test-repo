'use strict';
let camYaw = 0, camPitch = .38, camDist = 6.2;
let lookId = null, lookPrev = { x: 0, y: 0 }, stickId = null;
const move = { x: 0, z: 0 };
let running = false, sprint = false, shiftDown = false;
let firstPerson = false;
let walkPhase = 0, camReady = false;
let bobY = 0;
let yVel = 0, airborne = false;
const camPos = new THREE.Vector3(0, 2.4, 12);
const camTarget = new THREE.Vector3(0, 1.1, 6);
let rotMode = false, rotUserSet = false;
try {
const v = localStorage.getItem('garden_rot');
if (v === '1' || v === '0') { rotMode = v === '1'; rotUserSet = true; }
} catch (e) {}
if (!rotUserSet) rotMode = innerWidth < innerHeight;
function toLocalPt(cx, cy) {
if (!rotMode) return { x: cx, y: cy };
return { x: cy, y: innerWidth - cx };
}
function stageSize() {
return rotMode ? { w: innerHeight, h: innerWidth } : { w: innerWidth, h: innerHeight };
}
function fitViewport() {
const s = stageSize();
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.9));
renderer.setSize(s.w, s.h, false);
camera.aspect = s.w / s.h;
camera.updateProjectionMatrix();
}
function syncRot(persist) {
const land = innerWidth > innerHeight;
if (!rotUserSet) rotMode = !land;
if (land) rotMode = false;
document.body.classList.toggle('rot', rotMode);
fitViewport();
setTimeout(fitViewport, 120);
if (persist) { try { localStorage.setItem('garden_rot', rotMode ? '1' : '0'); } catch (e) {} }
}
addEventListener('resize', () => syncRot(false));
addEventListener('orientationchange', () => { syncRot(false); setTimeout(() => syncRot(false), 300); });
if (window.visualViewport) visualViewport.addEventListener('resize', () => syncRot(false));
const stick = document.getElementById('stick');
const knob = document.getElementById('knob');
const runBtn = document.getElementById('run');
const speedEl = document.getElementById('speed');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start');
const viewBtn = document.getElementById('view');
const jumpBtn = document.getElementById('jump');
function clampPitch(v) {
return THREE.MathUtils.clamp(v, firstPerson ? -1.15 : .04, firstPerson ? 1.25 : 1.05);
}
function setView(fp) {
firstPerson = fp;
avatar.visible = !fp;
aura.visible = !fp;
viewBtn.textContent = fp ? '第三人称' : '第一人称';
viewBtn.classList.toggle('fp', fp);
if (!fp) camPitch = THREE.MathUtils.clamp(camPitch, .04, 1.05);
camReady = false;
syncCross();
}
jumpBtn.addEventListener('touchstart', e => {
e.stopPropagation(); e.preventDefault();
doJump(); jumpBtn.classList.add('on');
}, { passive: false });
jumpBtn.addEventListener('touchend', () => jumpBtn.classList.remove('on'));
jumpBtn.addEventListener('click', e => { e.stopPropagation(); doJump(); });
viewBtn.addEventListener('click', e => { e.stopPropagation(); setView(!firstPerson); });
viewBtn.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); setView(!firstPerson); }, { passive: false });
function circleOf(el) {
const r = el.getBoundingClientRect();
const c = toLocalPt(r.left + r.width / 2, r.top + r.height / 2);
return { x: c.x, y: c.y, rad: Math.max(r.width, r.height) / 2 * 1.15 };
}
function inCircle(p, c) { return Math.hypot(p.x - c.x, p.y - c.y) <= c.rad; }
addEventListener('touchstart', e => {
if (!running) return;
for (const t of e.changedTouches) {
const p = toLocalPt(t.clientX, t.clientY);
if (inCircle(p, circleOf(runBtn))) {
sprint = !sprint;
runBtn.classList.toggle('on', sprint);
continue;
}
if (inCircle(p, circleOf(jumpBtn))) { doJump(); jumpBtn.classList.add('on'); continue; }
if (inCircle(p, circleOf(stick)) && stickId === null) { stickId = t.identifier; continue; }
if (lookId === null) { lookId = t.identifier; lookPrev = { x: p.x, y: p.y }; }
}
e.preventDefault();
}, { passive: false });
addEventListener('touchmove', e => {
if (!running) return;
for (const t of e.changedTouches) {
const p = toLocalPt(t.clientX, t.clientY);
if (t.identifier === stickId) {
const c = circleOf(stick);
let dx = p.x - c.x, dy = p.y - c.y;
const len = Math.hypot(dx, dy), max = c.rad * .82;
if (len > max) { dx = dx / len * max; dy = dy / len * max; }
knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
move.x = dx / max; move.z = -dy / max;
} else if (t.identifier === lookId) {
camYaw -= (p.x - lookPrev.x) * .0055;
camPitch = clampPitch(camPitch + (p.y - lookPrev.y) * .0035);
lookPrev = { x: p.x, y: p.y };
}
}
e.preventDefault();
}, { passive: false });
addEventListener('touchend', e => {
for (const t of e.changedTouches) {
if (t.identifier === stickId) { stickId = null; move.x = move.z = 0; knob.style.transform = 'translate(0,0)'; }
if (t.identifier === lookId) lookId = null;
jumpBtn.classList.remove('on');
}
}, { passive: false });
addEventListener('touchcancel', () => { runBtn.classList.remove('on'); });
const keys = {};
addEventListener('keydown', e => {
const k = e.key.toLowerCase();
keys[k] = true;
if (k === 'shift') shiftDown = true;
if (k === ' ') { if (running) doJump(); else overlay.style.display = 'none'; }
if (k === 'v' || k === 'f') setView(!firstPerson);
});
addEventListener('keyup', e => {
const k = e.key.toLowerCase();
keys[k] = false;
if (k === 'shift') shiftDown = false;
});
let dragging = false, dragPrev = { x: 0, y: 0 };
cv.addEventListener('mousedown', e => { dragging = true; dragPrev = { x: e.clientX, y: e.clientY }; });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', e => {
if (!dragging) return;
camYaw -= (e.clientX - dragPrev.x) * .005;
camPitch = clampPitch(camPitch + (e.clientY - dragPrev.y) * .003);
dragPrev = { x: e.clientX, y: e.clientY };
});
cv.addEventListener('wheel', e => {
camDist = THREE.MathUtils.clamp(camDist + e.deltaY * .0035, 2.4, 12);
e.preventDefault();
}, { passive: false });
const SPEED_WALK = 2.6, SPEED_RUN = 5.6;
const RADIUS = .42;
function blockedAt(x, z) {
for (const b of blockers) {
if (Math.hypot(x - b.x, z - b.z) < b.r + RADIUS) return true;
}
return false;
}
let facing = Math.PI;
const JUMP_V = 5.9, GRAVITY = 14;
let landPulse = 0;
function doJump() {
if (!running || airborne) return;
yVel = JUMP_V;
airborne = true;
}
function update(dt) {
let inX = move.x, fwd = move.z;
if (keys['w']) fwd = 1;
if (keys['s']) fwd = -1;
if (keys['a']) inX = -1;
if (keys['d']) inX = 1;
const mag = Math.min(1, Math.hypot(inX, fwd));
const isSprint = (sprint || shiftDown) && mag > .02;
const inWater = Math.hypot(avatar.position.x - POND.x, avatar.position.z - POND.z) < POND.r - .6
&& !(Math.abs(avatar.position.x - BRIDGE.x) <= BRIDGE.halfW + .3 && avatar.position.z > BRIDGE.z0 && avatar.position.z < BRIDGE.z1);
const speed = (isSprint ? SPEED_RUN : SPEED_WALK) * mag * (inWater ? .55 : 1);
if (mag > .02) {
const s = Math.sin(camYaw), c = Math.cos(camYaw);
let wx = -s * fwd + c * inX;
let wz = -c * fwd - s * inX;
const wl = Math.hypot(wx, wz) || 1;
wx /= wl; wz /= wl;
const nx = avatar.position.x + wx * speed * dt;
const nz = avatar.position.z + wz * speed * dt;
if (!blockedAt(nx, avatar.position.z)) avatar.position.x = nx;
if (!blockedAt(avatar.position.x, nz)) avatar.position.z = nz;
const lim = GROUND - 7.5;
avatar.position.x = THREE.MathUtils.clamp(avatar.position.x, -lim, lim);
avatar.position.z = THREE.MathUtils.clamp(avatar.position.z, -lim, lim);
const targetFace = Math.atan2(wx, wz);
let d = targetFace - facing;
while (d > Math.PI) d -= Math.PI * 2;
while (d < -Math.PI) d += Math.PI * 2;
facing += d * Math.min(1, dt * 12);
avatar.rotation.y = facing;
}
const groundY = heightAt(avatar.position.x, avatar.position.z);
if (airborne) {
yVel -= GRAVITY * dt;
avatar.position.y += yVel * dt;
if (avatar.position.y <= groundY && yVel <= 0) {
avatar.position.y = groundY; yVel = 0; airborne = false; landPulse = 1;
}
} else {
avatar.position.y = THREE.MathUtils.lerp(avatar.position.y, groundY, Math.min(1, dt * 12));
if (Math.abs(avatar.position.y - groundY) < .003) avatar.position.y = groundY;
}
landPulse = Math.max(0, landPulse - dt * 3.4);
const gait = mag > .02 ? (isSprint ? 11.5 : 7.4) : 2.2;
walkPhase += dt * gait * (mag > .02 ? 1 : .35);
const amp = mag > .02 ? (isSprint ? .78 : .48) * mag : .055;
bobY = (mag > .02 && !airborne) ? Math.abs(Math.sin(walkPhase)) * (isSprint ? .07 : .045) : 0;
rig.legL.rotation.x = Math.sin(walkPhase) * amp;
rig.legR.rotation.x = -Math.sin(walkPhase) * amp;
rig.armL.rotation.x = -Math.sin(walkPhase) * amp * .85;
rig.armR.rotation.x = Math.sin(walkPhase) * amp * .85;
rig.armL.rotation.z = .12 + (isSprint ? .16 : 0);
rig.armR.rotation.z = -.12 - (isSprint ? .16 : 0);
if (airborne) {
rig.legL.rotation.x = -.5; rig.legR.rotation.x = .32;
rig.armL.rotation.x = -1.6; rig.armR.rotation.x = -1.6;
rig.armL.rotation.z = .35; rig.armR.rotation.z = -.35;
rig.hip.rotation.x = -.12;
rig.scarfTail.rotation.x = -1.2;
}
rig.hip.position.y = .92 + Math.abs(Math.sin(walkPhase)) * (mag > .02 ? .06 : .012) - landPulse * .12;
rig.hip.rotation.x = mag > .02 ? (isSprint ? -.16 : -.05) : Math.sin(walkPhase) * .01;
rig.neck.rotation.x = mag > .02 ? -.06 : Math.sin(walkPhase * .5) * .02;
rig.scarfTail.rotation.x = -Math.sin(walkPhase + .6) * (.18 + mag * .3) - (isSprint ? .5 : .15);
rig.scarf.rotation.z = Math.sin(walkPhase * .5) * .05;
aura.position.set(avatar.position.x, .02, avatar.position.z);
aura.material.opacity = .16 + Math.sin(performance.now() / 500) * .05;
speedEl.textContent = airborne ? 'AIRBORNE' : (mag > .02 ? (isSprint ? 'SPRINTING' : (inWater ? 'SPLASHING' : 'WALKING')) : 'STROLLING');
}
function camBlocked(px, py, pz) {
if (py < .42) return true;
if (Math.abs(px - BRIDGE.x) < BRIDGE.halfW + .2 && pz > BRIDGE.z0 - .3 && pz < BRIDGE.z1 + .3) {
if (py < heightAt(px, pz) + .3) return true;
}
if (Math.hypot(px - POND.x, pz - POND.z) < POND.r && py < .55) return true;
for (const b of blockers) {
if (py > (b.h || 1.6) + .2) continue;
if (Math.hypot(px - b.x, pz - b.z) < b.r + .28) return true;
}
return false;
}
function safeCamPos(head, want) {
const delta = want.clone().sub(head);
const len = delta.length();
if (len < 1e-4) return head.clone();
const dir = delta.clone().divideScalar(len);
for (let t = .45; t < len; t += .25) {
const px = head.x + dir.x * t, py = head.y + dir.y * t, pz = head.z + dir.z * t;
if (camBlocked(px, py, pz)) {
for (let b = Math.max(.28, t - .2); b >= .28; b -= .06) {
const q = head.clone().addScaledVector(dir, b);
if (!camBlocked(q.x, q.y, q.z)) return q;
}
const q = head.clone().addScaledVector(dir, .28);
q.y = head.y + .12;
return q;
}
}
return want;
}
function updateCamera(dt) {
const eyeY = firstPerson ? 1.62 + bobY * .8 : 1.28;
const head = new THREE.Vector3(avatar.position.x, eyeY + avatar.position.y, avatar.position.z);
if (firstPerson) {
const dir = new THREE.Vector3(
-Math.sin(camYaw) * Math.cos(camPitch),
-Math.sin(camPitch),
-Math.cos(camYaw) * Math.cos(camPitch)
);
camPos.lerp(head, camReady ? Math.min(1, dt * 14) : 1);
camReady = true;
camTarget.copy(camPos).add(dir);
camera.position.copy(camPos);
camera.lookAt(camTarget);
return;
}
const off = new THREE.Vector3(
Math.sin(camYaw) * Math.cos(camPitch),
Math.sin(camPitch),
Math.cos(camYaw) * Math.cos(camPitch)
).multiplyScalar(camDist);
const want = head.clone().add(off);
want.y = Math.max(want.y, .6);
const nearBridge = Math.abs(avatar.position.x - BRIDGE.x) < BRIDGE.halfW + 2.4
&& avatar.position.z > BRIDGE.z0 - 3 && avatar.position.z < BRIDGE.z1 + 3;
if (nearBridge) want.y = Math.max(want.y, avatar.position.y + 2.1);
let okPos = safeCamPos(head, want);
camPos.lerp(okPos, camReady ? Math.min(1, dt * 6) : 1);
if (camBlocked(camPos.x, camPos.y, camPos.z)) camPos.copy(okPos);
camReady = true;
camTarget.lerp(head, Math.min(1, dt * 8));
camera.position.copy(camPos);
camera.lookAt(camTarget);
}
const mapCv = document.getElementById('map');
const mapCtx = mapCv.getContext('2d');
const coordEl = document.getElementById('coord');
const MAP_SPAN = 68;
let mapTimer = 0;
function drawMap() {
const W = mapCv.width, H = mapCv.height;
const sc = W / (MAP_SPAN * 2);
const mx = x => (x + MAP_SPAN) * sc;
const mz = z => (z + MAP_SPAN) * sc;
mapCtx.clearRect(0, 0, W, H);
mapCtx.fillStyle = 'rgba(228,240,250,.9)';
mapCtx.fillRect(0, 0, W, H);
mapCtx.fillStyle = 'rgba(150,180,140,.6)';
mapCtx.beginPath();
mapCtx.arc(mx(0), mz(0), (GROUND - 4) * sc, 0, 6.2832);
mapCtx.fill();
mapCtx.strokeStyle = 'rgba(70,105,130,.6)';
mapCtx.lineWidth = 1.5;
mapCtx.beginPath();
mapCtx.arc(mx(0), mz(0), (GROUND - 4) * sc, 0, 6.2832);
mapCtx.stroke();
mapCtx.fillStyle = 'rgba(80,170,215,.75)';
mapCtx.beginPath();
mapCtx.arc(mx(POND.x), mz(POND.z), POND.r * sc, 0, 6.2832);
mapCtx.fill();
mapCtx.fillStyle = 'rgba(120,110,95,.9)';
mapCtx.fillRect(mx(BRIDGE.x - BRIDGE.halfW), mz(BRIDGE.z0), BRIDGE.halfW * 2 * sc, (BRIDGE.z1 - BRIDGE.z0) * sc);
mapCtx.fillStyle = 'rgba(58,120,72,.9)';
for (const t of mapTrees) {
mapCtx.beginPath(); mapCtx.arc(mx(t.x), mz(t.z), 2.2, 0, 6.2832); mapCtx.fill();
}
mapCtx.fillStyle = 'rgba(120,125,135,.9)';
for (const r of mapRocks) {
mapCtx.beginPath(); mapCtx.arc(mx(r.x), mz(r.z), 1.7, 0, 6.2832); mapCtx.fill();
}
mapCtx.fillStyle = 'rgba(210,150,60,.95)';
mapCtx.beginPath(); mapCtx.arc(mx(TOWER.x), mz(TOWER.z), TOWER.r * sc + 1, 0, 6.2832); mapCtx.fill();
mapCtx.fillStyle = 'rgba(150,110,70,.95)';
mapCtx.fillRect(mx(RACK.x) - 3, mz(RACK.z) - 3, 6, 6);
mapCtx.fillStyle = 'rgba(190,80,70,.95)';
for (const tg of targets) {
mapCtx.beginPath(); mapCtx.arc(mx(tg.x), mz(tg.z), 2.4, 0, 6.2832); mapCtx.fill();
}
const px = avatar.position.x, pz = avatar.position.z;
const cxp = mx(px), czp = mz(pz);
mapCtx.fillStyle = 'rgba(90,150,190,.2)';
mapCtx.beginPath();
mapCtx.moveTo(cxp, czp);
mapCtx.arc(cxp, czp, 22, (-camYaw + Math.PI / 2) - .55, (-camYaw + Math.PI / 2) + .55);
mapCtx.closePath();
mapCtx.fill();
mapCtx.save();
mapCtx.translate(cxp, czp);
mapCtx.rotate(-facing + Math.PI);
mapCtx.fillStyle = '#1f8f7e';
mapCtx.beginPath();
mapCtx.moveTo(0, -5.4);
mapCtx.lineTo(-3.4, 4.2);
mapCtx.lineTo(0, 2);
mapCtx.lineTo(3.4, 4.2);
mapCtx.closePath();
mapCtx.fill();
mapCtx.restore();
mapCtx.strokeStyle = 'rgba(70,105,130,.3)';
mapCtx.lineWidth = 1;
mapCtx.strokeRect(.5, .5, W - 1, H - 1);
coordEl.textContent = 'X ' + px.toFixed(0) + ' · Z ' + pz.toFixed(0);
}
const clock = new THREE.Clock();
function loop() {
requestAnimationFrame(loop);
const dt = Math.min(.05, clock.getDelta());
if (running) update(dt);
else {
walkPhase += dt * .8;
rig.hip.position.y = .92 + Math.sin(walkPhase) * .012;
rig.scarfTail.rotation.x = -Math.sin(walkPhase * .7) * .1 - .1;
}
updateCamera(dt);
const t = performance.now() / 1000;
for (const l of lanterns) {
const k = .75 + Math.sin(t * 2.2 + l.phase) * .25;
l.light.intensity = .45 + k * .25;
l.orb.material.emissiveIntensity = .55 + k * .35;
}
for (const rp of ripples) {
rp.t += dt * .4;
if (rp.t > 1) rp.t -= 1;
const k = 1 + rp.t * 1.4;
rp.mesh.scale.setScalar(k);
rp.mesh.material.opacity = (1 - rp.t) * .3;
}
if (window.__towerOrb) {
window.__towerOrb.material.emissiveIntensity = 1.15 + Math.sin(t * 1.6) * .35;
towerHalo.material.opacity = .12 + Math.sin(t * 1.6) * .05;
}
if (rig.tailL) {
const sw = Math.sin(t * 1.9) * .04 + Math.sin(walkPhase) * .005;
rig.tailL.rotation.z = -.06 - sw;
rig.tailR.rotation.z = .06 + sw;
}
if (fireCd > 0) fireCd = Math.max(0, fireCd - dt);
if (flashLight.intensity > 0) flashLight.intensity = Math.max(0, flashLight.intensity - dt * 34);
if (flashTimer > 0) {
flashTimer -= dt;
if (flashGun) flashGun.userData.flash.material.opacity = Math.max(0, flashTimer / .08);
}
for (let i = tracers.length - 1; i >= 0; i--) {
const tr = tracers[i];
tr.life -= dt;
tr.mesh.material.opacity = Math.max(0, tr.life / .18) * .9;
if (tr.life <= 0) { scene.remove(tr.mesh); tr.mesh.geometry.dispose(); tracers.splice(i, 1); }
}
for (let i = sparks.length - 1; i >= 0; i--) {
const sp = sparks[i];
sp.life -= dt;
const k = Math.max(0, sp.life / .22);
sp.s.material.opacity = k;
sp.s.scale.setScalar(.34 + (1 - k) * .5);
if (sp.life <= 0) { scene.remove(sp.s); sparks.splice(i, 1); }
}
for (const tg of targets) {
tg.vel += (0 - tg.tilt) * 9 * dt;
tg.vel *= Math.min(1, 1 - dt * 5);
tg.tilt += tg.vel * dt;
tg.g.rotation.x = tg.tilt;
}
if (held) {
const hg = handGuns[held.id], vg = vmGuns[held.id];
hg.visible = !firstPerson;
vg.visible = firstPerson;
const aim = -1.16 + Math.sin(walkPhase * .9) * .03;
rig.armR.rotation.set(aim + gunRecoil * .16, .09, -.045);
hg.rotation.set(-aim - gunRecoil * .16, .04, -.02);
hg.position.set(hg.userData.basePos.x,
hg.userData.basePos.y + gunRecoil * .022,
hg.userData.basePos.z - gunRecoil * .075);
vg.position.set(
vg.userData.basePos.x + Math.sin(walkPhase * 2) * .006,
vg.userData.basePos.y + Math.cos(walkPhase * 1.7) * .005 - gunRecoil * .02,
vg.userData.basePos.z + gunRecoil * .1
);
vg.rotation.set(vg.userData.baseRot.x - gunRecoil * .13, vg.userData.baseRot.y, vg.userData.baseRot.z);
if (gunRecoil > 0) gunRecoil = Math.max(0, gunRecoil - dt * 8);
}
mapTimer += dt;
if (mapTimer > .12) { mapTimer = 0; drawMap(); }
renderer.render(scene, camera);
}
startBtn.addEventListener('click', () => {
running = true;
overlay.style.display = 'none';
});
syncRot(false);
loop();
window.__garden = { scene, avatar, camera, move, renderer, jump: doJump, fire: fireGun, take: cycleWeapon };