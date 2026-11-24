# QEMU 文本机（QEMU text console for Android）

一个极简的 QEMU 前端：选一个 ARM64 镜像，用 `-nographic` 启动，串口输出直接打在屏幕的文本框里。

## 现状

- ✅ UI、进程管理、输出流读取都正常
- ❌ 直接 `exec` Limbo 的 `libqemu-system-aarch64.so` 会段错误（退出码 139）
  该库导出 `qemu_main`，必须用 JNI `dlopen` 后调用，并初始化 SDL

## 依赖

QEMU 核心与配套库来自 Limbo PC Emulator 6.0.1（QEMU 5.1，GPLv2），
构建时放到 `lib/arm64-v8a/`，利用 `android:extractNativeLibs="true"` 落到
`nativeLibraryDir`，那里才允许 `exec`。

## 构建（无 Gradle，纯命令行）

需要 `aapt2`、`javac`、`d8`、`zipalign`、`apksigner`、`android.jar`。

```sh
A2=aapt2 AJ=$ANDROID_HOME/platforms/android-34/android.jar
$A2 compile --dir res -o out/res.zip
$A2 link -o out/base.apk -I $AJ --manifest AndroidManifest.xml out/res.zip
javac -source 8 -target 8 -bootclasspath $AJ -d out/classes java/com/local/qemulite/MainActivity.java
d8 --lib $AJ --min-api 21 --output out/dex out/classes/**/*.class
# 把 classes.dex 与 lib/arm64-v8a/*.so 打进 out/base.apk，再 zipalign + apksigner
```

## 启动参数

```
-m 512 -M virt -cpu cortex-a53 -nographic -drive file=disk.img,format=raw,if=virtio
```

附加参数栏可以填 `-kernel Image`、`-append "console=ttyAMA0"` 之类。
