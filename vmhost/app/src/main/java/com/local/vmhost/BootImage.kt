package com.local.vmhost

import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel

/**
 * Android boot.img 解析（header v0 / v1 / v2）。
 * 只做 MVP 需要的两件事：取出 kernel 和 ramdisk。
 */
object BootImage {

    data class Parts(val kernel: ByteArray, val ramdisk: ByteArray, val cmdline: String, val headerVersion: Int)

    private const val MAGIC = "ANDROID!"

    fun parse(file: File): Parts {
        val raf = RandomAccessFile(file, "r")
        try {
        val header = ByteArray(2048)
        raf.readFully(header)
        val magic = String(header, 0, 8, Charsets.US_ASCII)
        require(magic == MAGIC) { "不是 Android boot 镜像（magic=$magic）" }

        val buf = ByteBuffer.wrap(header).order(ByteOrder.LITTLE_ENDIAN)
        val kernelSize = buf.getInt(8)
        val ramdiskSize = buf.getInt(16)
        val pageSize = buf.getInt(36).let { if (it <= 0) 2048 else it }
        val headerVersion = buf.getInt(40)
        val cmdline = String(header, 64, 512, Charsets.US_ASCII).trimEnd('\u0000').trim()

        require(kernelSize in 1..(256 * 1024 * 1024)) { "kernel_size 异常：$kernelSize" }
        require(ramdiskSize in 1..(512 * 1024 * 1024)) { "ramdisk_size 异常：$ramdiskSize" }

        val kernel = readAt(raf.channel, pageSize.toLong(), kernelSize)
        val offset = pageSize.toLong() + roundUp(kernelSize, pageSize)
        val ramdisk = readAt(raf.channel, offset, ramdiskSize)
        return Parts(kernel, ramdisk, cmdline, headerVersion)
        } finally {
            raf.close()
        }
    }

    private fun readAt(ch: FileChannel, offset: Long, size: Int): ByteArray {
        val out = ByteArray(size)
        val b = ByteBuffer.wrap(out)
        var pos = 0
        while (pos < size) {
            val n = ch.read(b, offset + pos)
            if (n <= 0) error("读取镜像时提前结束（已有 $pos / $size 字节）")
            pos += n
        }
        return out
    }

    private fun roundUp(n: Int, page: Int): Long {
        val p = page.toLong()
        return ((n + p - 1) / p) * p
    }

    /** 把 boot.img 拆成 kernel / ramdisk 两个文件 */
    fun extract(file: File, outDir: File): Pair<File, File> {
        val parts = parse(file)
        outDir.mkdirs()
        val kernel = File(outDir, "kernel")
        val ramdisk = File(outDir, "ramdisk.img")
        kernel.writeBytes(parts.kernel)
        ramdisk.writeBytes(parts.ramdisk)
        return kernel to ramdisk
    }
}
