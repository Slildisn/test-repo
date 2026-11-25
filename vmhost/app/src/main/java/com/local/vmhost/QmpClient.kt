package com.local.vmhost

import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.Socket
import java.util.concurrent.atomic.AtomicInteger

/**
 * 极简 QMP 客户端：握手 + execute()。
 * 用于按键注入和优雅退出（quit）。
 */
class QmpClient(private val port: Int = 4444) {

    private var socket: Socket? = null
    private var reader: BufferedReader? = null
    private var writer: OutputStreamWriter? = null
    private val idGen = AtomicInteger(1)

    @Synchronized
    fun connect(timeoutMs: Int = 5000) {
        if (socket != null) return
        val s = Socket("127.0.0.1", port)
        s.soTimeout = timeoutMs
        socket = s
        reader = BufferedReader(InputStreamReader(s.getInputStream(), Charsets.UTF_8))
        writer = OutputStreamWriter(s.getOutputStream(), Charsets.UTF_8)
        // greeting
        readLine()
        execute("qmp_capabilities")
    }

    @Synchronized
    fun execute(command: String, args: JSONObject? = null): JSONObject? {
        val w = writer ?: return null
        val id = idGen.getAndIncrement()
        val req = JSONObject().put("execute", command).put("id", id)
        if (args != null) req.put("arguments", args)
        w.write(req.toString() + "\n")
        w.flush()
        // 读到带 id 的那一行为止（中间可能有 event）
        repeat(20) {
            val line = readLine() ?: return null
            val o = runCatching { JSONObject(line) }.getOrNull() ?: return@repeat
            if (o.optInt("id", -1) == id) return o
        }
        return null
    }

    /** 走 HMP：sendkey <qcode> */
    fun sendKey(qcode: String) {
        execute("human-monitor-command", JSONObject().put("command-line", "sendkey $qcode"))
    }

    fun click(x: Int, y: Int) {
        // 需要 guest 有 usb-tablet / virtio-tablet；MVP 先留接口
        val args = JSONObject().put("command-line", "mouse_move $x $y")
        execute("human-monitor-command", args)
        execute("human-monitor-command", JSONObject().put("command-line", "mouse_button 1"))
        execute("human-monitor-command", JSONObject().put("command-line", "mouse_button 0"))
    }

    fun quit() {
        execute("quit")
    }

    private fun readLine(): String? = reader?.readLine()

    @Synchronized
    fun close() {
        runCatching { socket?.close() }
        socket = null; reader = null; writer = null
    }
}
