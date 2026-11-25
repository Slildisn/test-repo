package com.local.vmhost

import android.graphics.Bitmap
import java.io.DataInputStream
import java.net.Socket

/**
 * 最小 RFB 3.8 客户端：
 *  - 安全类型 None
 *  - 32bpp 真彩色（RGBA，小端）
 *  - 编码 Raw(0) / CopyRect(1)
 * 回调 onFrame(bitmap) 在主线程以外调用，UI 侧自行 post。
 */
class VncClient(
    private val host: String = "127.0.0.1",
    private val port: Int = 5900,
    private val onFrame: (Bitmap) -> Unit,
    private val onLog: (String) -> Unit
) {
    @Volatile private var running = false
    private var socket: Socket? = null
    private var bitmap: Bitmap? = null

    fun start() {
        running = true
        Thread({
            try { runLoop() } catch (t: Throwable) {
                if (running) onLog("VNC 断开：${t.message}")
            } finally {
                running = false
                runCatching { socket?.close() }
            }
        }, "vnc").start()
    }

    fun stop() {
        running = false
        runCatching { socket?.close() }
    }

    private fun runLoop() {
        val s = Socket(host, port)
        socket = s
        val input = DataInputStream(s.getInputStream().buffered())
        val out = s.getOutputStream()

        val version = ByteArray(12)
        input.readFully(version)
        onLog("VNC 服务器版本 ${String(version).trim()}")
        out.write("RFB 003.008\n".toByteArray()); out.flush()

        val numTypes = input.readUnsignedByte()
        val types = ByteArray(numTypes).also { input.readFully(it) }
        val none = types.firstOrNull { it.toInt() == 1 }
            ?: throw IllegalStateException("服务器不支持 None 认证：${types.joinToString()}")
        out.write(byteArrayOf(none)); out.flush()

        val secResult = input.readInt()
        if (secResult != 0) throw IllegalStateException("认证失败 $secResult")
        out.write(1); out.flush()  // ClientInit: shared

        val width = input.readUnsignedShort()
        val height = input.readUnsignedShort()
        input.skipBytes(16)                    // server pixel format
        val nameLen = input.readInt()
        val name = ByteArray(nameLen).also { input.readFully(it) }
        onLog("桌面 ${width}x${height} 「${String(name)}」")

        // SetPixelFormat: 32bpp, depth 24, little-endian, true colour, RGB shifts 16/8/0
        val spf = ByteArray(20)
        spf[0] = 32; spf[1] = 24; spf[2] = 0; spf[3] = 1
        spf[4] = 0; spf[5] = 0; spf[6] = 0
        spf[7] = 255.toByte(); spf[8] = 255.toByte(); spf[9] = 255.toByte()
        spf[10] = 16; spf[11] = 8; spf[12] = 0
        out.write(spf); out.flush()

        // SetEncodings: Raw, CopyRect
        out.write(byteArrayOf(2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 1)); out.flush()

        val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        bitmap = bmp
        requestUpdate(out, false)

        while (running) {
            when (val msg = input.readUnsignedByte()) {
                0 -> readFramebufferUpdate(input, out, bmp, height)
                2 -> onLog("VNC Bell")
                3 -> { input.skipBytes(3); val n = input.readInt(); input.skipBytes(n) }
                else -> { onLog("未知消息 $msg"); return }
            }
        }
    }

    private fun requestUpdate(out: java.io.OutputStream, incremental: Boolean) {
        val b = byteArrayOf(3, if (incremental) 1 else 0, 0, 0, 0, 0, 0, 0, 0, 0)
        out.write(b); out.flush()
    }

    private fun readFramebufferUpdate(
        input: DataInputStream, out: java.io.OutputStream, bmp: Bitmap, height: Int
    ) {
        input.skipBytes(1)
        val rects = input.readUnsignedShort()
        for (i in 0 until rects) {
            val x = input.readUnsignedShort()
            val y = input.readUnsignedShort()
            val w = input.readUnsignedShort()
            val h = input.readUnsignedShort()
            when (val enc = input.readInt()) {
                0 -> {   // Raw
                    val pixels = IntArray(w * h)
                    val row = ByteArray(w * 4)
                    for (r in 0 until h) {
                        input.readFully(row)
                        var p = 0
                        for (c in 0 until w) {
                            val b0 = row[p].toInt() and 0xFF
                            val b1 = row[p + 1].toInt() and 0xFF
                            val b2 = row[p + 2].toInt() and 0xFF
                            pixels[r * w + c] = (0xFF shl 24) or (b0 shl 16) or (b1 shl 8) or b2
                            p += 4
                        }
                    }
                    bmp.setPixels(pixels, 0, w, x, y, w, h)
                }
                1 -> {   // CopyRect
                    val sx = input.readUnsignedShort()
                    val sy = input.readUnsignedShort()
                    val src = IntArray(w * h)
                    bmp.getPixels(src, 0, w, sx, sy, w, h)
                    bmp.setPixels(src, 0, w, x, y, w, h)
                }
                else -> { onLog("不支持的编码 $enc"); return }
            }
        }
        onFrame(bmp)
        requestUpdate(out, true)
    }
}
