把 QEMU 可执行文件放这里，并改名 libqemu.so。

要求：
- Android ARM64（bionic，PIE），能独立 exec
- 由项目方自行交叉编译（例如 configure --target-list=aarch64-softmmu，
  用 NDK clang 编译，静态链接 glib/pixman 或把 .so 一起放进本目录）

本目录仅存放二进制，不入库。
