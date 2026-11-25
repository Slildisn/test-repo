plugins {
    id("com.android.application") version "8.5.2"
    id("org.jetbrains.kotlin.android") version "1.9.24"
}

android {
    namespace = "com.local.vmhost"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.local.vmhost"
        minSdk = 29
        targetSdk = 34
        versionCode = 1
        versionName = "0.1"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions { jvmTarget = "1.8" }

    // QEMU 二进制必须以未压缩方式落到 nativeLibraryDir 才能 exec
    packaging {
        jniLibs { useLegacyPackaging = true }
    }
}
