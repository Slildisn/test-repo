#!/bin/sh
set -e
AJ=${ANDROID_HOME:-/root/android-sdk}/platforms/android-34/android.jar
BT=${ANDROID_HOME:-/root/android-sdk}/build-tools/34.0.0
A2=$(command -v aapt2 || echo "$BT/aapt2")
mkdir -p out/classes out/dex
"$A2" compile --dir res -o out/res.zip
"$A2" link -o out/base.apk -I "$AJ" --manifest AndroidManifest.xml out/res.zip
javac -source 8 -target 8 -bootclasspath "$AJ" -d out/classes java/com/local/qemulite/MainActivity.java
"$BT/d8" --lib "$AJ" --min-api 21 --output out/dex out/classes/com/local/qemulite/MainActivity.class
cp out/base.apk out/app-unsigned.apk
echo "把 classes.dex 与 lib/arm64-v8a/*.so 追加进 out/app-unsigned.apk 后再 zipalign + apksigner"
