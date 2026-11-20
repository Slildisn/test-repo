'use strict';

if (typeof THREE === 'undefined') { showFatal('三维库加载失败，检查网络后刷新。'); }
function showFatal(msg) {
  const o = document.getElementById('overlay');
  if (!o) return;
  o.style.display = 'flex';
  o.innerHTML = '<h1 style="font-size:22px">启动失败</h1><div class="sub">' + msg + '</div>';
}