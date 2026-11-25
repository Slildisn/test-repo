# VM 宿主（Android 上的 ROM 导入式虚拟机）

在普通 App 里用 QEMU 跑一个 ARM64 虚拟系统：导入 system.img/boot.img →
ProcessBuilder 拉起 QEMU → 内嵌 VNC 客户端显示画面 → QMP 注入按键。

## 目录

```
app/src/main/java/com/local/vmhost/
├── MainActivity.kt     单页 UI：导入/启动/停止/VNC/按键/日志
├── VmService.kt        ForegroundService，持有 QEMU 进程 + 环形日志
├── VmConfig.kt         实例配置（JSON 持久化在 files/vm/<id>/vm.json）
├── RomImporter.kt      SAF 导入 + zip 解包 + boot.img 拆分
├── BootImage.kt        boot header v0/v1/v2 解析，取出 kernel/ramdisk
├── QmpClient.kt        QMP 握手、sendkey、quit
└── VncClient.kt        RFB 3.8（None 认证 / Raw / CopyRect）
```

## 需要项目方提供的文件

| 文件 | 位置 | 说明 |
|---|---|---|
| `libqemu.so` | `app/src/main/jniLibs/arm64-v8a/` | QEMU 可执行文件重命名，PIE、bionic |
| `system.img` | App 内导入 | GSI 或自构建 AOSP，用户通过 SAF 选择 |
| `boot.img` | App 内导入 | 从里面拆 kernel / ramdisk |
| `userdata.img` | 自动创建 | 首次启动为空文件，QEMU 按 qcow2 格式化 |

## 编译

Android Studio 打开本目录即可（AGP 8.5 / Kotlin 1.9.24 / minSdk 29 / targetSdk 34）。

没有 Gradle 时也可以用 `tools/build-without-gradle.sh`：aapt2 + kotlinc + d8 +
zipalign + apksigner 直接出 APK（本仓库的 APK 就是这样打出来的）。

## 已在本机验证（阶段 1）

真机 vivo Y51s / Android 10 上实测通过：

```
[svc] 启动器 /data/app/.../lib/arm64/libqemu.so
[svc] 参数 -m 2048 -M virt -cpu cortex-a57 -smp 2 ...
[stub] QEMU 占位程序启动，argc=23
[stub] 退出
[svc] QEMU 退出，退出码 0
```

即：nativeLibraryDir 可执行、参数拼装、stdout 捕获、退出码回传、
VNC/QMP 连不上时的降级提示，全部工作。换成真实 `libqemu.so` 即可进入阶段 2。

详细的分阶段验证步骤见 `docs/PHASES.md`。
