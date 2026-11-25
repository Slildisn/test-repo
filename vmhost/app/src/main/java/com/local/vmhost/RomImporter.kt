package com.local.vmhost

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipInputStream

/**
 * ROM 导入：SAF 选文件 → 复制进私有目录 → 解 zip → 拆 boot.img。
 *
 * 支持：
 *  - 单个 boot.img
 *  - 单个 system.img（配合单独的 kernel）
 *  - 打包 zip（内含 boot.img / system.img，或 GSI 的 system.img + boot.img）
 */
object RomImporter {

    data class RomFiles(val kernel: File?, val ramdisk: File?, val systemImg: File, val bootImg: File?)

    /** 导入目标：files/vm/<id>/import/ */
    fun import(ctx: Context, id: String, uri: Uri, onProgress: (String) -> Unit): RomFiles {
        val dir = File(ctx.filesDir, "vm/$id/import").apply { mkdirs() }
        val name = displayName(ctx, uri) ?: "rom.bin"
        onProgress("复制 $name …")
        val raw = File(dir, safeName(name))
        ctx.contentResolver.openInputStream(uri)?.use { input ->
            FileOutputStream(raw).use { out -> input.copyTo(out, 1 shl 16) }
        } ?: error("打不开所选文件")

        onProgress("文件大小 ${raw.length() / 1048576} MB")

        var boot: File? = null
        var system: File? = null
        var kernel: File? = null
        var ramdisk: File? = null

        if (raw.name.lowercase().endsWith(".zip")) {
            onProgress("解压 zip …")
            ZipInputStream(raw.inputStream().buffered()).use { zin ->
                var e = zin.nextEntry
                while (e != null) {
                    val entry = e.name.substringAfterLast('/').lowercase()
                    val dest = File(dir, e.name.substringAfterLast('/'))
                    when {
                        entry == "boot.img" -> { writeEntry(zin, dest); boot = dest }
                        entry.startsWith("system") && entry.endsWith(".img") -> { writeEntry(zin, dest); system = dest }
                        entry.startsWith("ramdisk") -> { writeEntry(zin, dest); ramdisk = dest }
                        entry == "kernel" || entry == "image" -> { writeEntry(zin, dest); kernel = dest }
                    }
                    e = zin.nextEntry
                }
            }
            require(system != null) { "zip 里没找到 system.img" }
        } else if (raw.name.lowercase().contains("boot")) {
            boot = raw
        } else {
            system = raw
        }

        boot?.let {
            onProgress("解析 boot.img …")
            val (k, r) = BootImage.extract(it, dir)
            kernel = k; ramdisk = r
            onProgress("kernel ${k.length() / 1024} KB / ramdisk ${r.length() / 1024} KB")
        }

        require(system != null) { "没有 system.img，无法启动" }
        onProgress("完成：${system!!.name}")
        return RomFiles(kernel, ramdisk, system!!, boot)
    }

    private fun writeEntry(zin: ZipInputStream, dest: File) {
        FileOutputStream(dest).use { out -> zin.copyTo(out, 1 shl 16) }
    }

    private fun displayName(ctx: Context, uri: Uri): String? {
        ctx.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) return c.getString(0)
        }
        return uri.lastPathSegment
    }

    private fun safeName(s: String) = s.replace(Regex("[^A-Za-z0-9._-]"), "_")
}
