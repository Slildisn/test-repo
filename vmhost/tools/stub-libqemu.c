// 占位 libqemu.so：验证进程管理链路。真机测试时替换成真正的 QEMU 可执行文件。
#include <stdio.h>
#include <unistd.h>
int main(int argc, char **argv) {
    printf("[stub] QEMU 占位程序启动，argc=%d\n", argc);
    for (int i = 0; i < argc; i++) printf("  argv[%d]=%s\n", i, argv[i]);
    printf("[stub] 用真实 libqemu.so 替换后，这里会是 QEMU 的启动日志\n");
    fflush(0);
    sleep(5);
    printf("[stub] 退出\n");
    return 0;
}
