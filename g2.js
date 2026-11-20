'use strict';
const gunMetal = new THREE.MeshStandardMaterial({ color: 0x34383f, roughness: .5, metalness: .6 });
const gunMetal2 = new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: .45, metalness: .55 });
const gunGrip = new THREE.MeshStandardMaterial({ color: 0x2a221f, roughness: .85 });
const gunWood = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: .8 });
const gunAccent = new THREE.MeshStandardMaterial({ color: 0xa33b45, roughness: .6, metalness: .25 });
const matSteel = new THREE.MeshStandardMaterial({ color: 0x2f343b, roughness: .46, metalness: .68 });
const matSteel2 = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: .34, metalness: .78 });
const matSteel3 = new THREE.MeshStandardMaterial({ color: 0x878e96, roughness: .26, metalness: .88 });
const matPoly = new THREE.MeshStandardMaterial({ color: 0x1b1e23, roughness: .84, metalness: .1 });
const matGrip = new THREE.MeshStandardMaterial({ color: 0x2a2422, roughness: .96, metalness: .03 });
const matWood = new THREE.MeshStandardMaterial({ color: 0x6b4526, roughness: .74, metalness: .06 });
const matWood2 = new THREE.MeshStandardMaterial({ color: 0x54351c, roughness: .82, metalness: .05 });
const matBrass = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: .3, metalness: .85 });
const matRubber = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: .95, metalness: .02 });
const matBlack = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: .9, metalness: .05 });
const matAccent = new THREE.MeshStandardMaterial({ color: 0xa8362f, roughness: .55, metalness: .3 });
const matLens = new THREE.MeshStandardMaterial({ color: 0x2f6d86, emissive: 0x2a7f9c, emissiveIntensity: .55, roughness: .18, metalness: .35 });
const matDot = new THREE.MeshBasicMaterial({ color: 0xff5533 });
const matGlow = new THREE.MeshBasicMaterial({ color: 0x9be7ff });
function gunMesh(type) {
const g = new THREE.Group();
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const TUBE = (r1, r2, len, seg) => new THREE.CylinderGeometry(r1, r2, len, seg || 12);
const add = (geo, mat, x, y, z, rx, ry, rz) => {
const m = new THREE.Mesh(geo, mat);
m.position.set(x, y, z);
if (rx !== undefined) m.rotation.x = rx;
if (ry !== undefined) m.rotation.y = ry;
if (rz !== undefined) m.rotation.z = rz;
m.castShadow = true; m.receiveShadow = true;
g.add(m);
return m;
};
const tube = (r1, r2, len, x, y, z, seg, mat) => add(TUBE(r1, r2, len, seg), mat, x, y, z, Math.PI / 2);
const ring = (r, t, x, y, z, arc, seg) =>
add(new THREE.TorusGeometry(r, t, 6, seg || 14, arc || Math.PI * 2), matPoly, x, y, z, 0, Math.PI / 2);
const teeth = (n, w, h, d, x, y, z0, dz, mat) => {
for (let i = 0; i < n; i++) add(B(w, h, d), mat, x, y, z0 + i * dz);
};
let muzzleZ = .28, muzzleY = .04;
if (type === 'pistol') {
add(B(.054, .046, .255), matSteel2, 0, .045, .045);
add(B(.05, .009, .25), matSteel3, 0, .07, .045);
add(B(.006, .03, .22), matSteel, .028, .05, .04);
add(B(.006, .03, .22), matSteel, -.028, .05, .04);
teeth(5, .057, .026, .005, 0, .046, .128, .009, matBlack);
teeth(6, .057, .028, .005, 0, .046, -.02, .009, matBlack);
add(B(.014, .019, .055), matBlack, .027, .056, .04);
add(B(.004, .016, .03), matSteel3, .0285, .056, .012);
tube(.0115, .0115, .075, 0, .045, .205, 14, matSteel3);
tube(.0145, .0145, .012, 0, .045, .242, 14, matBlack);
tube(.0125, .0125, .004, 0, .045, .2475, 14, matSteel);
add(B(.048, .03, .20), matPoly, 0, .014, .02);
add(B(.052, .008, .06), matSteel, 0, .032, .118);
add(B(.034, .009, .09), matPoly, 0, -.004, .115);
teeth(3, .036, .011, .006, 0, -.004, .075, .028, matBlack);
add(B(.041, .112, .052), matGrip, 0, -.072, -.042, -.2);
add(B(.044, .026, .058), matGrip, 0, -.126, -.028, -.32);
add(B(.046, .012, .058), matAccent, 0, -.142, -.02, -.32);
teeth(4, .043, .006, .048, 0, -.048, -.062, -.018, matBlack);
ring(.03, .0055, 0, -.03, .004, Math.PI * 1.35, 16);
add(B(.009, .026, .009), matSteel3, 0, -.028, .012, .16);
add(B(.032, .013, .017), matSteel3, 0, .076, -.088);
add(B(.006, .006, .004), matDot, 0, .083, -.094);
add(B(.009, .013, .008), matSteel3, 0, .078, .16);
add(B(.005, .006, .004), matBrass, 0, .086, .162);
add(B(.012, .017, .022), matSteel3, 0, .05, -.105, .3);
add(B(.006, .011, .038), matSteel, .026, .038, -.015, .3);
add(B(.005, .009, .03), matSteel, -.026, .048, -.03);
add(new THREE.CylinderGeometry(.008, .008, .012, 10), matSteel3, -.028, .018, .09, 0, 0, Math.PI / 2);
muzzleZ = .252; muzzleY = .045;
} else if (type === 'rifle') {
add(B(.048, .056, .195), matPoly, 0, .0, -.025);
add(B(.05, .044, .215), matSteel, 0, .042, -.005);
add(B(.036, .026, .05), matPoly, 0, -.03, -.02);
add(B(.016, .022, .07), matBlack, .026, .05, .02);
add(B(.005, .022, .07), matSteel2, .0305, .05, .02);
add(B(.012, .014, .026), matSteel3, .028, .058, -.03, .5);
add(B(.022, .012, .032), matSteel3, 0, .062, -.105, -.2);
tube(.0295, .0305, .25, 0, .042, .225, 8, matPoly);
for (let i = 0; i < 5; i++) {
add(B(.062, .009, .022), matSteel3, 0, .042, .12 + i * .042);
}
teeth(9, .03, .009, .012, 0, .073, .11, .034, matSteel2);
tube(.0105, .0105, .30, 0, .042, .46, 12, matSteel3);
add(B(.026, .026, .034), matSteel, 0, .052, .40);
tube(.0065, .0065, .06, 0, .052, .37, 10, matSteel3);
tube(.015, .016, .058, 0, .042, .585, 12, matPoly);
teeth(3, .034, .01, .008, 0, .042, .575, .016, matBlack);
tube(.019, .019, .17, 0, .032, -.145, 12, matPoly);
add(B(.042, .028, .11), matPoly, 0, .052, -.215);
add(B(.046, .072, .085), matPoly, 0, .006, -.283);
add(B(.048, .08, .018), matRubber, 0, .002, -.33);
ring(.014, .004, 0, .012, -.29, Math.PI, 10);
add(B(.036, .10, .046), matPoly, 0, -.058, -.075, .26);
teeth(3, .038, .007, .042, 0, -.03, -.062, -.022, matGrip);
ring(.028, .005, 0, -.042, .0, Math.PI * 1.4, 16);
add(B(.009, .026, .009), matSteel3, 0, -.04, .006, .2);
add(B(.012, .012, .012), matBrass, .026, .006, .035);
add(B(.036, .062, .05), matSteel2, 0, -.075, .035, -.06);
add(B(.036, .05, .046), matSteel2, 0, -.126, .055, -.3);
add(B(.038, .012, .04), matAccent, 0, -.152, .07, -.3);
add(B(.026, .022, .026), matSteel, 0, .086, -.03);
add(B(.026, .022, .026), matSteel, 0, .086, .05);
tube(.021, .021, .15, 0, .108, .01, 16, matBlack);
tube(.028, .022, .05, 0, .108, .10, 16, matBlack);
tube(.0225, .0215, .032, 0, .108, -.075, 16, matBlack);
add(new THREE.CircleGeometry(.026, 16), matLens, 0, .108, .127, 0, 0, 0);
add(new THREE.CircleGeometry(.019, 14), matGlow, 0, .108, -.0935);
add(new THREE.CylinderGeometry(.012, .012, .018, 12), matBlack, 0, .132, .01);
add(new THREE.CylinderGeometry(.01, .01, .016, 12), matBlack, .024, .108, .01, 0, 0, Math.PI / 2);
add(B(.003, .012, .11), matAccent, .0255, .03, .04);
add(B(.003, .012, .11), matAccent, -.0255, .03, .04);
muzzleZ = .615; muzzleY = .042;
} else {
add(B(.05, .06, .20), matSteel, 0, .018, -.03);
add(B(.016, .02, .05), matBlack, .026, .022, .015);
add(B(.004, .02, .016), matSteel3, .0295, .022, -.005);
tube(.0145, .0145, .46, 0, .05, .29, 14, matSteel3);
add(B(.009, .007, .44), matSteel, 0, .062, .29);
tube(.0125, .0125, .42, 0, .018, .275, 12, matPoly);
tube(.014, .014, .016, 0, .018, .48, 12, matBrass);
tube(.0265, .027, .13, 0, .026, .19, 10, matWood);
teeth(4, .054, .008, .006, 0, .026, .142, .026, matWood2);
add(B(.052, .01, .014), matWood2, 0, .026, .13);
add(B(.046, .076, .20), matWood, 0, .008, -.225, .04);
add(B(.048, .044, .10), matWood2, 0, .056, -.24, .03);
add(B(.05, .05, .026), matWood2, 0, -.005, -.328, .04);
add(B(.048, .078, .014), matRubber, 0, .004, -.338, .04);
ring(.013, .0038, 0, -.02, -.25, Math.PI, 10);
add(B(.04, .098, .05), matWood, 0, -.055, -.095, .24);
add(B(.044, .03, .06), matWood2, 0, -.005, -.10, .24);
ring(.027, .005, 0, -.042, -.01, Math.PI * 1.4, 16);
add(B(.009, .024, .009), matSteel3, 0, -.04, -.004, .2);
add(new THREE.CylinderGeometry(.007, .007, .012, 10), matBrass, .026, .006, -.02, 0, 0, Math.PI / 2);
for (let i = 0; i < 4; i++) {
tube(.0092, .0092, .04, .037, -.004, -.055 + i * .026, 10, matBrass);
tube(.008, .008, .012, .037, -.004, -.034 + i * .026, 8, matAccent);
}
add(new THREE.SphereGeometry(.006, 10, 8), matBrass, 0, .069, .50);
add(B(.026, .01, .012), matSteel3, 0, .048, -.10);
muzzleZ = .525; muzzleY = .05;
}
const flash = new THREE.Sprite(new THREE.SpriteMaterial({
map: glowSprite(), color: 0xffd486, transparent: true, opacity: 0,
blending: THREE.AdditiveBlending, depthWrite: false
}));
const fs = type === 'shotgun' ? .40 : (type === 'rifle' ? .28 : .24);
flash.scale.set(fs, fs, 1);
flash.position.set(0, muzzleY, muzzleZ + .02);
g.add(flash);
g.userData.flash = flash;
g.userData.muzzleZ = muzzleZ;
g.userData.muzzleY = muzzleY;
return g;
}
const RACK = { x: -7.6, z: 5.2 };
const WEAPON_SLOTS = [
{ id: 'pistol',  name: '手枪',   cd: .34, pellets: 1, spread: .012, kick: .12, rackX: -.78 },
{ id: 'rifle',   name: '步枪',   cd: .13, pellets: 1, spread: .022, kick: .06, rackX: .02 },
{ id: 'shotgun', name: '霰弹枪', cd: .9,  pellets: 5, spread: .09,  kick: .3,  rackX: .85 }
];
(function buildArmory() {
const woodMat = new THREE.MeshStandardMaterial({ color: 0x6f4f33, roughness: .85 });
const woodMat2 = new THREE.MeshStandardMaterial({ color: 0x5a4029, roughness: .9 });
const g = new THREE.Group();
for (const sx of [-1.15, 1.15]) {
const post = new THREE.Mesh(new THREE.BoxGeometry(.13, 1.68, .13), woodMat2);
post.position.set(sx, .84, 0);
post.castShadow = true; post.receiveShadow = true;
g.add(post);
}
const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.5, .1, .64), woodMat);
shelf.position.set(0, 1.12, 0);
shelf.castShadow = true; shelf.receiveShadow = true;
g.add(shelf);
const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, .09, .54), woodMat);
shelf2.position.set(0, .42, 0);
shelf2.castShadow = true; shelf2.receiveShadow = true;
g.add(shelf2);
const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.1, .06), woodMat2);
back.position.set(0, 1.66, -.31);
back.castShadow = true;
g.add(back);
for (const slot of WEAPON_SLOTS) {
const m = gunMesh(slot.id);
m.scale.setScalar(.92);
m.position.set(slot.rackX, 1.29, .03);
m.rotation.y = slot.rackX < -.3 ? .34 : (slot.rackX > .3 ? -.3 : .06);
g.add(m);
slot.rackMesh = m;
}
for (const bx of [-.55, .5]) {
const box = new THREE.Mesh(new THREE.BoxGeometry(.42, .24, .3), woodMat2);
box.position.set(bx, .52, .02);
box.castShadow = true; box.receiveShadow = true;
g.add(box);
const stripe = new THREE.Mesh(new THREE.BoxGeometry(.44, .05, .32), gunAccent);
stripe.position.set(bx, .55, .02);
g.add(stripe);
}
const sc = document.createElement('canvas');
sc.width = 384; sc.height = 96;
const sg = sc.getContext('2d');
sg.fillStyle = '#2a2b33'; sg.fillRect(0, 0, 384, 96);
sg.strokeStyle = '#8a7a5c'; sg.lineWidth = 4; sg.strokeRect(6, 6, 372, 84);
sg.fillStyle = '#f0e6d2';
sg.font = '600 34px -apple-system,sans-serif';
sg.textAlign = 'center';
sg.fillText('A R M O R Y', 192, 46);
sg.fillStyle = '#a8a397';
sg.font = '20px -apple-system,sans-serif';
sg.fillText('靠近拿取 · 空手可换', 192, 74);
const signTex = new THREE.CanvasTexture(sc);
signTex.colorSpace = THREE.SRGBColorSpace;
const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .35), new THREE.MeshBasicMaterial({ map: signTex }));
sign.position.set(0, 1.8, .02);
g.add(sign);
g.position.set(RACK.x, 0, RACK.z);
g.rotation.y = .35;
scene.add(g);
addBlock(RACK.x, RACK.z, 1.35, 1.7);
})();
const targets = [];
(function buildTargets() {
const boardMat = new THREE.MeshStandardMaterial({ color: 0xdccdb0, roughness: .9 });
const ringMat = new THREE.MeshStandardMaterial({ color: 0xc0524b, roughness: .85 });
const ringMat2 = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: .85 });
const postMat = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: .9 });
const spots = [[-11, 1, .9], [-13.5, -4.5, .55], [-10, -9.5, 1.15]];
for (const [x, z, ry] of spots) {
const g = new THREE.Group();
const post = new THREE.Mesh(new THREE.BoxGeometry(.1, 1.15, .1), postMat);
post.position.y = .575;
post.castShadow = true;
g.add(post);
const board = new THREE.Mesh(new THREE.CircleGeometry(.5, 24), boardMat);
board.position.y = 1.42;
board.rotation.y = Math.PI;
board.castShadow = true;
g.add(board);
const r1 = new THREE.Mesh(new THREE.CircleGeometry(.34, 20), ringMat);
r1.position.set(0, 1.42, .012);
r1.rotation.y = Math.PI;
g.add(r1);
const r2 = new THREE.Mesh(new THREE.CircleGeometry(.16, 16), ringMat2);
r2.position.set(0, 1.42, .024);
r2.rotation.y = Math.PI;
g.add(r2);
const r3 = new THREE.Mesh(new THREE.CircleGeometry(.05, 12), ringMat);
r3.position.set(0, 1.42, .036);
r3.rotation.y = Math.PI;
g.add(r3);
g.position.set(x, 0, z);
g.rotation.y = ry;
scene.add(g);
addBlock(x, z, .3, 1.9);
targets.push({ g, x, z, y: 1.42, r: .5, tilt: 0, vel: 0 });
}
})();
function toonGrad(steps) {
const n = steps || 4;
const data = new Uint8Array(n);
for (let i = 0; i < n; i++) data[i] = Math.round(60 + 195 * (i / (n - 1)));
const tex = new THREE.DataTexture(data, n, 1, THREE.RedFormat);
tex.minFilter = tex.magFilter = THREE.NearestFilter;
tex.needsUpdate = true;
return tex;
}
const GRAD = toonGrad(4);
const toon = (color, extra) => new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: GRAD }, extra || {}));
const skinMat = toon(0xf7e6e0);
const hairMat = toon(0x4f4f74);
const hairMat2 = toon(0x3b3b59);
const blouseMat = toon(0xfdfdff);
const navyMat = toon(0x2b3560);
const skirtMat = toon(0x3b4780, { flatShading: true });
const sockMat = toon(0xf7faff);
const shoeMat = toon(0x6a4535);
const ribbonMat = toon(0x8f2b42);
const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const irisMat = new THREE.MeshBasicMaterial({ color: 0x9e2833 });
const pupilMat = new THREE.MeshBasicMaterial({ color: 0x2a070d });
const hiliteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const blushMat = new THREE.MeshBasicMaterial({ color: 0xffa6b6, transparent: true, opacity: .3, depthWrite: false });
const lashMat = new THREE.MeshBasicMaterial({ color: 0x2a1f38 });
const avatar = new THREE.Group();
const rig = {};
function part(geo, mat, x, y, z, parent) {
const m = new THREE.Mesh(geo, mat);
m.position.set(x, y, z);
m.castShadow = true;
(parent || avatar).add(m);
return m;
}
const hipPivot = new THREE.Group();
hipPivot.position.y = .92;
avatar.add(hipPivot);
rig.hip = hipPivot;
const skirt = part(new THREE.CylinderGeometry(.19, .34, .28, 12, 1, true), skirtMat, 0, .02, 0, hipPivot);
skirt.material.side = THREE.DoubleSide;
part(new THREE.CylinderGeometry(.18, .2, .08, 12), navyMat, 0, .15, 0, hipPivot);
for (let i = 0; i < 6; i++) {
const a = i / 6 * 6.283;
const pl = part(new THREE.BoxGeometry(.026, .27, .012), hairMat2, Math.sin(a) * .255, .02, Math.cos(a) * .255, hipPivot);
pl.rotation.y = a;
pl.material = skirtMat;
}
const torso = part(new THREE.CapsuleGeometry(.16, .26, 6, 14), blouseMat, 0, .34, 0, hipPivot);
torso.scale.set(1, 1, .78);
part(new THREE.BoxGeometry(.3, .05, .02), navyMat, 0, .5, .085, hipPivot);
const collarL = part(new THREE.BoxGeometry(.17, .05, .02), navyMat, -.09, .44, .105, hipPivot);
collarL.rotation.z = -.55;
const collarR = part(new THREE.BoxGeometry(.17, .05, .02), navyMat, .09, .44, .105, hipPivot);
collarR.rotation.z = .55;
part(new THREE.BoxGeometry(.28, .03, .14), navyMat, 0, .5, -.09, hipPivot);
part(new THREE.ConeGeometry(.045, .09, 4), ribbonMat, -.05, .4, .1, hipPivot).rotation.z = Math.PI / 2;
part(new THREE.ConeGeometry(.045, .09, 4), ribbonMat, .05, .4, .1, hipPivot).rotation.z = -Math.PI / 2;
part(new THREE.SphereGeometry(.034, 8, 6), ribbonMat, 0, .4, .105, hipPivot);
const neck = new THREE.Group();
neck.position.set(0, .62, 0);
hipPivot.add(neck);
rig.neck = neck;
part(new THREE.CylinderGeometry(.055, .06, .1, 10), skinMat, 0, .02, 0, neck);
const head = part(new THREE.SphereGeometry(.255, 24, 18), skinMat, 0, .16, 0, neck);
head.scale.set(1, .98, .94);
part(new THREE.SphereGeometry(.16, 18, 14), skinMat, 0, .03, .06, neck).scale.set(.85, .78, .9);
const backHair = part(new THREE.SphereGeometry(.28, 24, 18), hairMat, 0, .2, -.02, neck);
backHair.scale.set(1.04, .96, 1.02);
const longHair = part(new THREE.CapsuleGeometry(.2, .5, 6, 14), hairMat2, 0, -.28, -.14, neck);
longHair.scale.set(1.08, 1, .6);
part(new THREE.CapsuleGeometry(.15, .2, 6, 12), hairMat, 0, -.62, -.12, neck).scale.set(1.1, 1, .55);
function sidelock(side) {
const g = new THREE.Group();
g.position.set(side * .215, .12, .06);
neck.add(g);
const a = part(new THREE.BoxGeometry(.13, .82, .07), side < 0 ? hairMat : hairMat2, 0, -.4, 0, g);
a.rotation.z = side * -.06;
const b = part(new THREE.BoxGeometry(.05, .74, .05), hairMat2, side * .075, -.4, .03, g);
b.rotation.z = side * .1;
g.rotation.x = .06;
return g;
}
rig.tailL = sidelock(-1);
rig.tailR = sidelock(1);
for (let i = 0; i < 7; i++) {
const k = i - 3;
const bl = part(new THREE.BoxGeometry(.055, .2 + (i % 2) * .03, .03), i % 2 ? hairMat2 : hairMat,
k * .062, .265, .2, neck);
bl.rotation.z = k * .03;
bl.rotation.x = -.06;
}
part(new THREE.BoxGeometry(.09, .34, .05), hairMat2, -.235, .1, .12, neck).rotation.z = .08;
part(new THREE.BoxGeometry(.09, .34, .05), hairMat2, .235, .1, .12, neck).rotation.z = -.08;
function eye(side) {
const wx = side * .095;
part(new THREE.SphereGeometry(.07, 18, 14), eyeWhiteMat, wx, .135, .232, neck).scale.set(1, 1.16, .4);
part(new THREE.SphereGeometry(.05, 18, 14), irisMat, wx, .133, .254, neck).scale.set(1, 1.28, .42);
part(new THREE.SphereGeometry(.018, 12, 10), pupilMat, wx, .129, .272, neck).scale.set(1, 1.5, .4);
part(new THREE.SphereGeometry(.013, 10, 8), hiliteMat, wx - side * .02, .155, .283, neck);
const lash = part(new THREE.BoxGeometry(.128, .022, .02), lashMat, wx, .181, .251, neck);
lash.rotation.z = -side * .05;
const brow = part(new THREE.BoxGeometry(.09, .011, .014), hairMat2, wx, .233, .252, neck);
brow.rotation.z = -side * .02;
}
eye(-1); eye(1);
part(new THREE.CircleGeometry(.036, 16), blushMat, -.152, .07, .222, neck).rotation.y = -.55;
part(new THREE.CircleGeometry(.036, 16), blushMat, .152, .07, .222, neck).rotation.y = .55;
part(new THREE.BoxGeometry(.058, .008, .012), new THREE.MeshBasicMaterial({ color: 0xc06a76 }), 0, .052, .243, neck);
const bow = part(new THREE.TorusGeometry(.052, .022, 6, 12), ribbonMat, 0, .36, -.2, neck);
bow.rotation.x = 1.1;
part(new THREE.ConeGeometry(.05, .1, 4), ribbonMat, -.1, .37, -.21, neck).rotation.z = Math.PI / 2;
part(new THREE.ConeGeometry(.05, .1, 4), ribbonMat, .1, .37, -.21, neck).rotation.z = -Math.PI / 2;
rig.scarf = bow;
const scarfTail = part(new THREE.BoxGeometry(.11, .34, .025), ribbonMat, 0, .16, -.24, neck);
scarfTail.rotation.x = -.35;
rig.scarfTail = scarfTail;
function arm(side) {
const sh = new THREE.Group();
sh.position.set(side * .255, .48, 0);
hipPivot.add(sh);
const sleeve = part(new THREE.SphereGeometry(.082, 14, 12), blouseMat, 0, -.03, 0, sh);
sleeve.scale.set(1, 1.25, 1);
part(new THREE.CapsuleGeometry(.052, .24, 4, 10), skinMat, 0, -.22, 0, sh).scale.set(1.05, 1, 1.05);
part(new THREE.SphereGeometry(.062, 12, 10), skinMat, 0, -.4, .01, sh).scale.set(.9, 1.1, .95);
part(new THREE.SphereGeometry(.03, 10, 8), ribbonMat, 0, -.175, 0, sh).scale.set(1.15, .55, 1.15);
const hand = new THREE.Group();
hand.position.set(0, -.4, .02);
sh.add(hand);
sh.userData.hand = hand;
sh.rotation.z = side * -.1;
return sh;
}
rig.armL = arm(-1);
rig.armR = arm(1);
function leg(side) {
const hp = new THREE.Group();
hp.position.set(side * .1, 0, 0);
hipPivot.add(hp);
part(new THREE.CapsuleGeometry(.066, .2, 4, 10), skinMat, 0, -.14, 0, hp).scale.set(1.02, 1, 1.02);
const sock = part(new THREE.CapsuleGeometry(.064, .3, 4, 10), sockMat, 0, -.42, 0, hp);
sock.scale.set(1.05, 1, 1.05);
part(new THREE.CylinderGeometry(.068, .062, .06, 10), navyMat, 0, -.55, 0, hp);
part(new THREE.BoxGeometry(.12, .1, .22), shoeMat, 0, -.78, .025, hp);
part(new THREE.SphereGeometry(.062, 12, 10), shoeMat, 0, -.80, .07, hp).scale.set(1, .75, 1.3);
return hp;
}
rig.legL = leg(-1);
rig.legR = leg(1);
avatar.position.set(0, 0, 6);
avatar.rotation.y = Math.PI;
scene.add(avatar);
const aura = new THREE.Mesh(new THREE.RingGeometry(.5, .72, 32),
new THREE.MeshBasicMaterial({ color: 0x7a6fb0, transparent: true, opacity: .22, side: THREE.DoubleSide }));
aura.rotation.x = -Math.PI / 2;
aura.position.y = .02;
scene.add(aura);