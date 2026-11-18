import io
p = "index.html"
s = io.open(p, encoding="utf-8").read()

a1 = "  #hud { position:fixed; inset:0; pointer-events:none; }"
assert s.count(a1) == 1
s = s.replace(a1, a1 + "\n  #stick, #fire, #reload { pointer-events:auto; touch-action:none; }", 1)

a2 = """fireBtn.addEventListener('touchstart', e => { firing = true; fireBtn.classList.add('on'); shootLoop(); e.stopPropagation(); }, { passive: true });
fireBtn.addEventListener('touchend', e => { firing = false; fireBtn.classList.remove('on'); e.stopPropagation(); });
reloadBtn.addEventListener('touchstart', e => { startReload(); e.stopPropagation(); });"""
assert s.count(a2) == 1
s = s.replace(a2, """function startFire(e) { if (e) { e.preventDefault(); e.stopPropagation(); } firing = true; fireBtn.classList.add('on'); shootLoop(); }
function stopFire(e) { if (e) { e.preventDefault(); e.stopPropagation(); } firing = false; fireBtn.classList.remove('on'); }
fireBtn.addEventListener('touchstart', startFire, { passive: false });
fireBtn.addEventListener('touchend', stopFire, { passive: false });
fireBtn.addEventListener('touchcancel', stopFire, { passive: false });
fireBtn.addEventListener('mousedown', startFire);
fireBtn.addEventListener('mouseup', stopFire);
fireBtn.addEventListener('mouseleave', stopFire);
reloadBtn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); startReload(); }, { passive: false });
reloadBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); startReload(); });""", 1)

io.open(p, "w", encoding="utf-8").write(s)
print("ok", len(s.encode()))
