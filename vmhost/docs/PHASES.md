# 分阶段验证

## 阶段 1 — 跑通 QEMU 启动（无 UI）

已在本机验证（用占位二进制）：

1. 把 `libqemu.so` 放进 `jniLibs/arm64-v8a/`
2. 装 App，点「启动」
3. 预期：

```
[svc] 启动器 /data/app/.../lib/arm64/libqemu.so
[svc] 参数 -m 2048 -M virt -cpu cortex-a57 -smp 2 ...
```

排错：
- `缺少 libqemu.so` → jniLibs 没放或 `useLegacyPackaging` 没开
- `Exec format error` → 二进制不是 PIE，或不是 bionic
- `Permission denied` → 文件没在 nativeLibraryDir（放 assets 里 exec 不了）

## 阶段 2 — VNC 显示

点「连 VNC」→ 日志出现：

```
[vnc] VNC 服务器版本 RFB 003.008
[vnc] 桌面 720x1280 「QEMU」
```

画面画到 SurfaceView，等比缩放居中。

排错：
- `ECONNREFUSED` → QEMU 没起来或端口不是 5900
- 黑屏但握手成功 → 编码不支持（当前只实现 Raw/CopyRect，QEMU 默认够用）

## 阶段 3 — ForegroundService

切后台 → 通知栏有「VM 正在运行」，Guest 不退出；返回 App 日志继续追加。

## 阶段 4 — ROM 导入

点「导入 ROM」选 GSI zip → 日志：

```
[导入] 复制 xxx.zip …
[导入] 解压 zip …
[导入] 解析 boot.img …
[导入] kernel 12345 KB / ramdisk 6789 KB
[导入] 配置已保存
```

然后「启动」应使用导入的镜像。

## 阶段 5 — 输入注入

底部 Back/Home/Recent → 走 QMP `human-monitor-command: sendkey <qcode>`。
日志出现 `[qmp] sendkey home`，Guest 有反应即通过。

## 阶段 6 — 配置与持久化

`files/vm/<id>/vm.json` 存内存、核数、镜像路径；多个 id 可并存。
