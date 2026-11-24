package com.local.qemulite;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.method.ScrollingMovementMethod;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;

/**
 * 极简 QEMU 前端：选一个 ARM64 镜像，用 -nographic 方式启动，
 * 串口输出直接显示在屏幕上的文本框里。
 */
public class MainActivity extends Activity {
    private static final int PICK_IMAGE = 1;

    private TextView log;
    private EditText ramInput;
    private EditText extraInput;
    private Button startBtn;
    private Button stopBtn;

    private Process proc;
    private File imageFile;
    private final Handler ui = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(24, 24, 24, 24);

        TextView title = new TextView(this);
        title.setText("QEMU 文本机 · aarch64");
        title.setTextSize(20);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        root.addView(title);

        ramInput = new EditText(this);
        ramInput.setHint("内存 MB，例如 512");
        ramInput.setText("512");
        root.addView(ramInput);

        extraInput = new EditText(this);
        extraInput.setHint("附加参数，例如 -kernel boot.img");
        root.addView(extraInput);

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);

        Button pickBtn = new Button(this);
        pickBtn.setText("选镜像");
        pickBtn.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                startActivityForResult(i, PICK_IMAGE);
            }
        });
        row.addView(pickBtn);

        startBtn = new Button(this);
        startBtn.setText("启动");
        startBtn.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) { start(); }
        });
        row.addView(startBtn);

        stopBtn = new Button(this);
        stopBtn.setText("停止");
        stopBtn.setEnabled(false);
        stopBtn.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) { stop(); }
        });
        row.addView(stopBtn);

        Button verBtn = new Button(this);
        verBtn.setText("自检");
        verBtn.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) { selfTest(); }
        });
        row.addView(verBtn);

        root.addView(row);

        log = new TextView(this);
        log.setTextSize(11);
        log.setTypeface(Typeface.MONOSPACE);
        log.setTextColor(Color.parseColor("#B7F7C0"));
        log.setBackgroundColor(Color.parseColor("#101418"));
        log.setPadding(16, 16, 16, 16);
        log.setMovementMethod(new ScrollingMovementMethod());
        log.setText("准备就绪。先「选镜像」，再点「启动」。\n自检只会打印 qemu 版本，不改动任何文件。\n");

        ScrollView scroll = new ScrollView(this);
        scroll.addView(log);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f);
        lp.topMargin = 16;
        root.addView(scroll, lp);

        setContentView(root);

        // 启动即自检一次，方便确认 qemu 二进制能跑
        ui.postDelayed(new Runnable() { public void run() { selfTest(); } }, 600);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != PICK_IMAGE || res != RESULT_OK || data == null || data.getData() == null) return;
        final Uri uri = data.getData();
        append("[选择] 正在复制镜像…");
        new Thread(new Runnable() {
            public void run() {
                try {
                    File out = new File(getFilesDir(), "disk.img");
                    InputStream in = getContentResolver().openInputStream(uri);
                    FileOutputStream os = new FileOutputStream(out);
                    byte[] buf = new byte[65536];
                    long total = 0;
                    int n;
                    while ((n = in.read(buf)) > 0) { os.write(buf, 0, n); total += n; }
                    os.close();
                    in.close();
                    imageFile = out;
                    append("[选择] 完成：" + out.getName() + "  " + (total / 1048576) + " MB");
                } catch (Exception e) {
                    append("[选择] 失败：" + e);
                }
            }
        }).start();
    }

    private String qemuPath() {
        return getApplicationInfo().nativeLibraryDir + "/libqemu-system-aarch64.so";
    }

    private void selfTest() {
        if (proc != null) { toast("先停止当前实例"); return; }
        run(java.util.Arrays.asList(qemuPath(), "-version"));
    }

    private void start() {
        if (proc != null) { toast("已经在运行"); return; }
        if (imageFile == null || !imageFile.exists()) { toast("先选一个镜像"); return; }

        String ram = ramInput.getText().toString().trim();
        if (ram.length() == 0) ram = "512";

        java.util.List<String> cmd = new java.util.ArrayList<String>();
        cmd.add(qemuPath());
        cmd.add("-m"); cmd.add(ram);
        cmd.add("-M"); cmd.add("virt");
        cmd.add("-cpu"); cmd.add("cortex-a53");
        cmd.add("-nographic");
        cmd.add("-drive"); cmd.add("file=" + imageFile.getAbsolutePath() + ",format=raw,if=virtio");
        String extra = extraInput.getText().toString().trim();
        if (extra.length() > 0) {
            for (String s : extra.split("\\s+")) cmd.add(s);
        }
        run(cmd);
    }

    private void run(java.util.List<String> cmd) {
        append("$ " + join(cmd));
        try {
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.environment().put("LD_LIBRARY_PATH", getApplicationInfo().nativeLibraryDir);
            pb.environment().put("HOME", getFilesDir().getAbsolutePath());
            proc = pb.start();
            startBtn.setEnabled(false);
            stopBtn.setEnabled(true);
            pump(proc.getInputStream());
            pumpErr(proc.getErrorStream(), proc);
        } catch (Exception e) {
            append("[启动失败] " + e);
            proc = null;
        }
    }

    private void pump(final InputStream in) {
        new Thread(new Runnable() {
            public void run() {
                try {
                    BufferedReader r = new BufferedReader(new InputStreamReader(in));
                    String line;
                    while ((line = r.readLine()) != null) append(line);
                } catch (Exception ignored) {
                }
                ui.post(new Runnable() {
                    public void run() {
                        append("[进程结束]");
                        proc = null;
                        startBtn.setEnabled(true);
                        stopBtn.setEnabled(false);
                    }
                });
            }
        }).start();
    }

    private void pumpErr(final InputStream in, final Process p) {
        new Thread(new Runnable() {
            public void run() {
                try {
                    BufferedReader r = new BufferedReader(new InputStreamReader(in));
                    String line;
                    while ((line = r.readLine()) != null) append("[err] " + line);
                    int code = p.waitFor();
                    append("[退出码 " + code + "]");
                } catch (Exception e) {
                    append("[读取失败] " + e);
                }
            }
        }).start();
    }

    private void stop() {
        if (proc == null) return;
        proc.destroy();
        append("[停止] 已发送结束信号");
    }

    private void append(final String s) {
        ui.post(new Runnable() {
            public void run() {
                log.append(s + "\n");
                android.util.Log.i("qemulite", s);
                scrollToBottom();
            }
        });
    }

    private void scrollToBottom() {
        ScrollView sv = (ScrollView) log.getParent();
        if (sv != null) sv.fullScroll(View.FOCUS_DOWN);
    }

    private void toast(String s) {
        Toast.makeText(this, s, Toast.LENGTH_SHORT).show();
    }

    private static String join(java.util.List<String> l) {
        StringBuilder b = new StringBuilder();
        for (String s : l) { if (b.length() > 0) b.append(' '); b.append(s); }
        return b.toString();
    }
}
