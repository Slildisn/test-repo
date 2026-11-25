#!/bin/sh
# 不用 Gradle 的最小构建：aapt2 + kotlinc(embeddable) + d8 + zipalign + apksigner
# 需要：android.jar、build-tools(d8/zipalign/apksigner)、kotlin-compiler-embeddable、
#       kotlin-stdlib、trove4j、annotations
set -e
SDK=${ANDROID_HOME:-/root/android-sdk}
AJ=$SDK/platforms/android-34/android.jar
BT=$SDK/build-tools/34.0.0
A2=${AAPT2:-/usr/lib/android-sdk/build-tools/debian/aapt2}
KT=${KOTLIN_HOME:-/tmp/kt}
KS=${KEYSTORE:?需要 keystore 路径}

mkdir -p out/classes out/dex
$A2 compile --dir app/src/main/res -o out/res.zip
$A2 link -o out/base.apk -I $AJ --manifest app/src/main/AndroidManifest.xml out/res.zip

java -cp "$KT/kotlin-compiler-embeddable-1.9.24.jar:$KT/kotlin-stdlib-1.9.24.jar:$KT/trove4j.jar:$KT/annotations.jar" \
  org.jetbrains.kotlin.cli.jvm.K2JVMCompiler -no-stdlib -jvm-target 1.8 \
  -classpath "$KT/kotlin-stdlib-1.9.24.jar:$AJ" -d out/classes app/src/main/java

$BT/d8 --lib $AJ --min-api 29 --output out/dex \
  $(find out/classes -name '*.class') $KT/kotlin-stdlib-1.9.24.jar

python3 - <<'PY'
import zipfile, os
base=zipfile.ZipFile('out/base.apk'); out=zipfile.ZipFile('out/app-unsigned.apk','w')
for it in base.infolist():
    zi=zipfile.ZipInfo(it.filename, date_time=(2026,11,25,12,0,0))
    zi.compress_type=it.compress_type; zi.external_attr=it.external_attr
    out.writestr(zi, base.read(it.filename))
zi=zipfile.ZipInfo('classes.dex', date_time=(2026,11,25,12,0,0)); zi.compress_type=zipfile.ZIP_DEFLATED
out.writestr(zi, open('out/dex/classes.dex','rb').read())
d='app/src/main/jniLibs'
for root,_,fs in os.walk(d):
    for f in fs:
        p=os.path.join(root,f); rel=os.path.relpath(p,d)
        if not f.endswith('.so'): continue
        zi=zipfile.ZipInfo('lib/'+rel.replace('arm64-v8a/','arm64-v8a/'), date_time=(2026,11,25,12,0,0))
        zi.compress_type=zipfile.ZIP_DEFLATED
        out.writestr(zi, open(p,'rb').read())
out.close()
PY

zipalign -f -p 4 out/app-unsigned.apk out/app-aligned.apk
apksigner sign --ks "$KS" --out out/vmhost.apk out/app-aligned.apk
echo "APK: out/vmhost.apk"
