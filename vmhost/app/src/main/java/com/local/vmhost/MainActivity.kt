package com.local.vmhost

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.IBinder
import android.os.Looper
import android.os.Handler
import android.text.method.ScrollingMovementMethod
import android.view.Gravity
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.io.File

/**
 * 单页 UI：
 *  - 顶部：导入 ROM / 启动 / 停止
 *  - 中部：VNC 画面（SurfaceView）
 *  - 底部：按键栏 + 日志
 */
class MainActivity : Activity() {

    private lateinit var surface: SurfaceView
    private lateinit var logView: TextView
    private lateinit var memInput: EditText
    private lateinit var statusText: TextView

    private var service: VmService? = null
    private var vnc: VncClient? = null
    private var frame: Bitmap? = null
    private val ui = Handler(Looper.getMainLooper())

    private var vmId = "vm1"
    private var vmName = "默认虚拟机"

    private val conn = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, b: IBinder?) {
            service = (b as VmService.LocalBinder).service()
            service?.listener = object : VmService.Listener {
                override fun onLog(line: String) { ui.post { appendLog(line) } }
                override fun onExit(code: Int) { ui.post { statusText.text = "已停止（$code）" } }
            }
            service?.snapshot()?.forEach { appendLog(it) }
            statusText.text = if (service?.isRunning() == true) "运行中" else "已就绪"
        }
        override fun onServiceDisconnected(name: ComponentName?) { service = null }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
        }

        statusText = TextView(this).apply {
            text = "未启动"
            textSize = 13f
            setTextColor(Color.GRAY)
        }
        root.addView(statusText)

        val row1 = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        row1.addView(button("导入 ROM") { pickRom() })
        row1.addView(button("启动") { startVm() })
        row1.addView(button("停止") { service?.stopVm() })
        root.addView(row1)

        val row2 = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        row2.addView(button("连 VNC") { connectVnc() })
        row2.addView(button("断开") { vnc?.stop(); vnc = null })
        memInput = EditText(this).apply {
            hint = "内存 MB"
            setText("2048")
            width = dp(110)
        }
        row2.addView(memInput)
        root.addView(row2)

        surface = SurfaceView(this)
        root.addView(surface, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 2.6f))

        val keys = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        keys.addView(button("Back") { key("esc") })
        keys.addView(button("Home") { key("home") })
        keys.addView(button("Recent") { key("menu") })
        keys.addView(button("菜单") { key("meta_l") })
        root.addView(keys)

        logView = TextView(this).apply {
            textSize = 10f
            setTextColor(Color.parseColor("#B7F7C0"))
            setBackgroundColor(Color.parseColor("#101418"))
            setPadding(12, 12, 12, 12)
            movementMethod = ScrollingMovementMethod()
            text = "日志：\n"
        }
        root.addView(logView, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))

        setContentView(root)

        // 服务
        val si = Intent(this, VmService::class.java)
        startService(si)
        bindService(si, conn, Context.BIND_AUTO_CREATE)

        // VNC 帧绘制
        surface.holder.addCallback(object : SurfaceHolder.Callback {
            override fun surfaceCreated(h: SurfaceHolder) { draw() }
            override fun surfaceChanged(h: SurfaceHolder, f: Int, w: Int, hh: Int) { draw() }
            override fun surfaceDestroyed(h: SurfaceHolder) {}
        })
    }

    override fun onDestroy() {
        runCatching { unbindService(conn) }
        vnc?.stop()
        super.onDestroy()
    }

    // ---------- 动作 ----------

    private fun pickRom() {
        val i = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
        }
        @Suppress("DEPRECATION")
        startActivityForResult(i, REQ_PICK)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQ_PICK || resultCode != RESULT_OK) return
        val uri: Uri = data?.data ?: return
        Toast.makeText(this, "开始导入…", Toast.LENGTH_SHORT).show()
        Thread {
            try {
                val files = RomImporter.import(this, vmId, uri) { msg -> ui.post { appendLog("[导入] $msg") } }
                val dir = VmConfig.dir(this, vmId)
                val userdata = File(dir, "userdata.img")
                if (!userdata.exists()) userdata.createNewFile()
                val cfg = VmConfig(
                    id = vmId, name = vmName,
                    memoryMb = memInput.text.toString().toIntOrNull() ?: 2048,
                    kernel = files.kernel?.absolutePath,
                    ramdisk = files.ramdisk?.absolutePath,
                    systemImg = files.systemImg.absolutePath,
                    userdataImg = userdata.absolutePath
                )
                VmConfig.save(this, cfg)
                ui.post { appendLog("[导入] 配置已保存：${cfg.name}") }
            } catch (t: Throwable) {
                ui.post { appendLog("[导入失败] ${t.message}") }
            }
        }.start()
    }

    private fun startVm() {
        val cfg = VmConfig.load(this, vmId) ?: defaults()
        service?.startVm(cfg) ?: toast("服务未就绪")
    }

    private fun defaults(): VmConfig {
        val dir = VmConfig.dir(this, vmId)
        val userdata = File(dir, "userdata.img").apply { if (!exists()) createNewFile() }
        return VmConfig(
            id = vmId, name = vmName,
            memoryMb = memInput.text.toString().toIntOrNull() ?: 2048,
            systemImg = File(dir, "import/system.img").takeIf { it.exists() }?.absolutePath,
            userdataImg = userdata.absolutePath
        )
    }

    private fun connectVnc() {
        val cfg = VmConfig.load(this, vmId) ?: defaults()
        vnc?.stop()
        appendLog("[vnc] 连接 127.0.0.1:${cfg.vncPort}")
        vnc = VncClient(port = cfg.vncPort, onFrame = { bmp ->
            frame = bmp
            ui.post { draw() }
        }, onLog = { msg -> ui.post { appendLog("[vnc] $msg") } }).also { it.start() }
    }

    private fun key(qcode: String) {
        Thread {
            val c = service?.qmp()
            if (c == null) { ui.post { appendLog("[qmp] 连不上，Guest 是否已启动？") } }
            else { c.sendKey(qcode); ui.post { appendLog("[qmp] sendkey $qcode") } }
        }.start()
    }

    // ---------- 绘制 ----------

    private fun draw() {
        val bmp = frame ?: return
        val holder = surface.holder
        val canvas: Canvas = holder.lockCanvas() ?: return
        try {
            canvas.drawColor(Color.BLACK)
            val scale = minOf(canvas.width.toFloat() / bmp.width, canvas.height.toFloat() / bmp.height)
            val dw = bmp.width * scale
            val dh = bmp.height * scale
            val left = (canvas.width - dw) / 2f
            val top = (canvas.height - dh) / 2f
            canvas.drawBitmap(bmp, null,
                android.graphics.RectF(left, top, left + dw, top + dh), null)
        } finally {
            holder.unlockCanvasAndPost(canvas)
        }
    }

    // ---------- 小工具 ----------

    private fun button(label: String, onClick: () -> Unit): Button =
        Button(this).apply { text = label; setOnClickListener { onClick() } }

    private fun appendLog(line: String) {
        logView.append(line + "\n")
        val sv = logView.parent as? android.widget.ScrollView
        sv?.fullScroll(View.FOCUS_DOWN)
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_SHORT).show()
    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    companion object { private const val REQ_PICK = 7 }
}
