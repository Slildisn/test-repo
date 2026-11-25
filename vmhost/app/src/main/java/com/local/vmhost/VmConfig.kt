package com.local.vmhost

import android.content.Context
import org.json.JSONObject
import java.io.File

/**
 * 一个虚拟机实例的持久化配置。
 * 所有路径都是 App 私有目录下的绝对路径。
 */
data class VmConfig(
    val id: String,
    val name: String,
    val memoryMb: Int = 2048,
    val cores: Int = 2,
    val kernel: String? = null,
    val ramdisk: String? = null,
    val systemImg: String? = null,
    val userdataImg: String? = null,
    val vncDisplay: Int = 0,      // VNC 端口 = 5900 + vncDisplay
    val qmpPort: Int = 4444,
    val adbHostPort: Int = 5555,
    val extraArgs: String = ""
) {
    val vncPort: Int get() = 5900 + vncDisplay

    fun toJson(): String = JSONObject().apply {
        put("id", id)
        put("name", name)
        put("memoryMb", memoryMb)
        put("cores", cores)
        put("kernel", kernel ?: "")
        put("ramdisk", ramdisk ?: "")
        put("systemImg", systemImg ?: "")
        put("userdataImg", userdataImg ?: "")
        put("vncDisplay", vncDisplay)
        put("qmpPort", qmpPort)
        put("adbHostPort", adbHostPort)
        put("extraArgs", extraArgs)
    }.toString()

    companion object {
        fun fromJson(s: String): VmConfig {
            val o = JSONObject(s)
            fun str(k: String): String? = o.optString(k, "").ifEmpty { null }
            return VmConfig(
                id = o.getString("id"),
                name = o.optString("name", "VM"),
                memoryMb = o.optInt("memoryMb", 2048),
                cores = o.optInt("cores", 2),
                kernel = str("kernel"),
                ramdisk = str("ramdisk"),
                systemImg = str("systemImg"),
                userdataImg = str("userdataImg"),
                vncDisplay = o.optInt("vncDisplay", 0),
                qmpPort = o.optInt("qmpPort", 4444),
                adbHostPort = o.optInt("adbHostPort", 5555),
                extraArgs = o.optString("extraArgs", "")
            )
        }

        fun dir(ctx: Context, id: String): File =
            File(ctx.filesDir, "vm/$id").apply { mkdirs() }

        fun save(ctx: Context, cfg: VmConfig) {
            File(dir(ctx, cfg.id), "vm.json").writeText(cfg.toJson())
        }

        fun load(ctx: Context, id: String): VmConfig? {
            val f = File(dir(ctx, id), "vm.json")
            if (!f.exists()) return null
            return runCatching { fromJson(f.readText()) }.getOrNull()
        }

        fun list(ctx: Context): List<VmConfig> {
            val root = File(ctx.filesDir, "vm")
            if (!root.isDirectory) return emptyList()
            return root.listFiles().orEmpty()
                .filter { File(it, "vm.json").exists() }
                .mapNotNull { load(ctx, it.name) }
                .sortedBy { it.name }
        }

        fun delete(ctx: Context, id: String) {
            File(ctx.filesDir, "vm/$id").deleteRecursively()
        }
    }
}
