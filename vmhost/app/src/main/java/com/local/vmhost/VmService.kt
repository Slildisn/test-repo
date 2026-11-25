package com.local.vmhost

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.Build
import android.os.IBinder
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.util.ArrayDeque

/**
 * 持有 QEMU 进程的 ForegroundService。
 * QEMU 跑在 nativeLibraryDir/libqemu.so，日志进环形缓冲区。
 */
class VmService : Service() {

    companion object {
        const val CHANNEL_ID = "vmhost"
        const val NOTIF_ID = 1001
        @Volatile var instance: VmService? = null
    }

    inner class LocalBinder : Binder() {
        fun service(): VmService = this@VmService
    }

    interface Listener {
        fun onLog(line: String)
        fun onExit(code: Int)
    }

    private val binder = LocalBinder()
    private val logs = ArrayDeque<String>()
    private val lock = Any()
    private var process: Process? = null
    private var qmp: QmpClient? = null
    var listener: Listener? = null
    var config: VmConfig? = null
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this
        createChannel()
        startForeground(NOTIF_ID, buildNotification("未运行"))
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        stopVm(force = true)
        instance = null
        super.onDestroy()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            val ch = NotificationChannel(CHANNEL_ID, "虚拟机", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
        }
    }

    private fun buildNotification(text: String): Notification {
        val b = if (Build.VERSION.SDK_INT >= 26)
            Notification.Builder(this, CHANNEL_ID) else Notification.Builder(this)
        return b.setContentTitle("VM 正在运行")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setOngoing(true)
            .build()
    }

    private fun notify(text: String) {
        getSystemService(NotificationManager::class.java).notify(NOTIF_ID, buildNotification(text))
    }

    fun log(line: String) {
        synchronized(lock) {
            logs.addLast(line)
            while (logs.size > 2000) logs.removeFirst()
        }
        listener?.onLog(line)
    }

    fun snapshot(): List<String> = synchronized(lock) { logs.toList() }

    fun isRunning(): Boolean = process?.isAlive == true

    /** QEMU 启动参数（阶段 1 用硬编码镜像，阶段 4 换成导入的路径） */
    fun buildArgs(cfg: VmConfig): List<String> {
        val args = mutableListOf<String>()
        args += listOf("-m", cfg.memoryMb.toString())
        args += listOf("-M", "virt")
        args += listOf("-cpu", "cortex-a57")
        args += listOf("-smp", cfg.cores.toString())
        cfg.kernel?.let { args += listOf("-kernel", it) }
        cfg.ramdisk?.let { args += listOf("-initrd", it) }
        args += listOf(
            "-append",
            "console=ttyAMA0,115200 androidboot.hardware=ranchu androidboot.selinux=permissive"
        )
        cfg.systemImg?.let { args += listOf("-drive", "file=$it,format=raw,if=virtio,readonly=on") }
        cfg.userdataImg?.let { args += listOf("-drive", "file=$it,format=qcow2,if=virtio") }
        args += listOf("-display", "vnc=127.0.0.1:${cfg.vncDisplay}")
        args += listOf("-qmp", "tcp:127.0.0.1:${cfg.qmpPort},server,nowait")
        args += listOf(
            "-netdev", "user,id=n0,hostfwd=tcp::${cfg.adbHostPort}-:5555",
            "-device", "virtio-net-device,netdev=n0"
        )
        args += listOf("-device", "virtio-tablet")
        if (cfg.extraArgs.isNotBlank()) args += cfg.extraArgs.split(Regex("\\s+"))
        return args
    }

    fun startVm(cfg: VmConfig): Boolean {
        if (isRunning()) { log("[svc] 已经在运行"); return false }
        config = cfg
        val bin = File(applicationInfo.nativeLibraryDir, "libqemu.so")
        if (!bin.exists()) { log("[svc] 缺少 libqemu.so，请放到 jniLibs/arm64-v8a/"); return false }
        log("[svc] 启动器 ${bin.absolutePath}")
        val args = buildArgs(cfg)
        log("[svc] 参数 ${args.joinToString(" ")}")

        return try {
            val pb = ProcessBuilder(listOf(bin.absolutePath) + args)
            pb.redirectErrorStream(true)
            val p = pb.start()
            process = p
            notify("QEMU 已启动")
            pump(p)
            true
        } catch (t: Throwable) {
            log("[svc] 启动失败：${t}")
            false
        }
    }

    private fun pump(p: Process) {
        Thread({
            try {
                BufferedReader(InputStreamReader(p.inputStream)).use { r ->
                    r.lineSequence().forEach { log(it) }
                }
            } catch (_: Throwable) {
            }
            val code = runCatching { p.waitFor() }.getOrDefault(-1)
            log("[svc] QEMU 退出，退出码 $code")
            notify("已停止")
            process = null
            listener?.onExit(code)
        }, "qemu-log").start()
    }

    fun stopVm(force: Boolean = false) {
        val p = process ?: return
        log("[svc] 正在停止 QEMU …")
        runCatching {
            qmp ?: QmpClient(config?.qmpPort ?: 4444).also { qmp = it }
            qmp?.connect(2000)
            qmp?.quit()
        }
        if (!force) {
            Thread({
                Thread.sleep(3000)
                if (p.isAlive) { p.destroy(); Thread.sleep(1000) }
                if (p.isAlive) p.destroyForcibly()
            }, "qemu-stop").start()
        } else {
            p.destroyForcibly()
        }
    }

    fun qmp(): QmpClient? {
        val c = config ?: return null
        val client = qmp ?: QmpClient(c.qmpPort).also { qmp = it }
        return runCatching { client.connect(2000); client }.getOrNull()
    }
}
