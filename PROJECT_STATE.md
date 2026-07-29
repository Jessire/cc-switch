# CC Switch Project State

> 本文件记录当前有效状态, 不是完整历史. 开始任务时先核实现状; 完成任务后只更新发生变化的部分.

## 状态快照

- 更新时间: 2026-07-29, Asia/Shanghai.
- 工作目录: `D:\文件\Agenc Cli\cc-switch`.
- 当前主线: `main`.
- 用户仓库: `fork`, `https://github.com/Jessire/cc-switch.git`.
- 上游仓库: `origin`, `https://github.com/farion1231/cc-switch.git`.
- 跟踪关系: 本地 `main` 跟踪 `fork/main`.
- 长期分支策略: 只保留 `main`; 上游同步使用 merge, 不用 rebase 或强制推送.
- 实时 SHA, 领先/落后数量和工作区状态必须在任务开始时通过 Git 重新读取, 不在本文件中固化.

## 已实现的个人定制

### 供应商分组

- 已实现主页分组标签和批量加入分组.
- 已实现单个供应商加入现有分组.
- 已实现一个供应商属于多个分组.
- 已实现供应商卡片显示所属分组.
- 已实现所有分组标签拖动排序, 包括 `全部` 和 `未分组`; `添加分组` 位于最后.
- 主要提交: `484b204`, `27c7ce0`, `23a34ff`, `042264d`.

### 切换与客户端重启

- 已实现供应商切换后自动重启对应客户端.
- 已实现同组供应商切换时跳过重启.
- 已消除 Windows 自动重启时的 CMD 弹窗.
- 已实现独立手动重启按钮; 编辑供应商只保存配置, 不附带“保存并重启”.
- 已实现自动重启和同组跳过的回归测试.
- 主要提交: `cbdd576`, `74c9b50`, `0ab6b5a`, `075b496`, `12bc160`.

### 托盘和启动

- 已实现托盘左键双击打开主窗口.
- 已取消左键单击打开主窗口; 右键保留菜单.
- 已修复定制 Release 构建嵌入前端资源后可直接打开主窗口.
- 主要提交: `8031ab8`, `6f386df`.

### Codex Desktop 模型

- 已实现自定义模型与 Codex 内置模型共存, 自定义模型排在前面.
- 已实现可用模型获取, 勾选, 排序, 显示名, 模型 ID 和上下文配置.
- 已取消 Codex 独立默认模型输入区; 菜单第一项写入顶层 `model`, 空菜单保留原值.
- 已保留 Grok Build 的独立默认模型行为.
- 已实现紧凑三列模型区和紧凑供应商编辑布局.
- 主要提交: `6ff0c70`, `97f0e31`, `5e532a6`, `3c26e0b`, `29576ec`, `dc53d80`.

### Codex 会话模型路由

- 已实现 Codex Desktop 模型菜单驱动的对话级供应商路由: 菜单显示 `供应商 - 模型`,每个对话可独立选择.
- 菜单模型 ID 使用 `provider-id/actual-model`;代理按前缀选择供应商并在上游请求前剥离前缀,不切换 CC Switch 全局当前供应商.
- 已支持 OpenAI Chat,原生 Responses 和 Anthropic 供应商混合出现在同一模型目录,每个菜单项使用自己的工具协议模板.
- 当前供应商的模型排在路由目录首位并写为默认模型;其他 Codex 供应商继续追加,内置模型保持共存.
- 原有 `/model` 会话路由和 provider 前缀路由继续保留;Codex Responses 链路已覆盖.
- 主要提交: `773dfd8`, `80db8fa`;本次模型菜单路由提交以 Git 实时状态为准.

### 通用配置

- 已将统一供应商生成的子供应商默认设置为启用通用配置.
- 已保留用户显式关闭通用配置的状态.
- 主要提交: `670408d`.

### Windows 构建

- 已建立 GitHub 手动工作流 `Build Windows EXE`.
- 工作流只构建 Windows x64 Release EXE.
- Artifact 名称: `CC-Switch-Custom-Windows-x64`.
- Artifact 文件名: `CC-Switch-Custom.exe`.
- 主要提交: `cd4d0eb`, `12bc160`.

## 当前运行与产物

- 2026-07-29 本次检查时, 正在运行的进程为 `cc-switch`, PID `15904`.
- 运行路径: `D:\文件\Agenc Cli\cc-switch\src-tauri\target\release\cc-switch.exe`.
- 进程启动时间: 2026-07-29 09:30:01, 早于最新功能提交 `670408d`.
- 当前运行实例不包含本次 Codex Desktop 对话级供应商菜单路由,不得用它验收新功能.
- 已在独立 Cargo target 中完成 Windows x64 Release 构建,未覆盖或结束当前运行实例.
- 本地旁路交付文件: `D:\文件\Agenc Cli\cc-switch\CC-Switch-Custom-New.exe`.
- 交付版本 `3.18.0`,大小 `32,487,424` bytes (`30.98 MiB`),PE Machine `0x8664` (`x64`).
- SHA256: `F4438C1F1A55A6B3CD6FC1B7D6AA05EAEEE3DBA01A8E99EB5C640C10E01058E5`.
- 进程, 文件路径, 版本和哈希均为易变状态; 涉及运行或替换 EXE 前必须重新检查.

## 待办与待验证

### 下一次功能构建必须完成

- 在用户允许切换版本后关闭旧 CC Switch,启动 `CC-Switch-Custom-New.exe`,再重启 Codex Desktop 读取新模型目录.
- 在至少两个 Codex Desktop 对话中分别选择不同的 `供应商 - 模型`,发起真实请求并核对代理日志中的供应商和剥离后的上游模型.
- 验证新增统一供应商默认勾选通用配置.
- 验证显式关闭通用配置后再次编辑或重启仍保持关闭.
- 原生 GUI 验证未在本次强制执行,原因是旧 CC Switch 单实例仍运行,结束它会违反不中断当前使用的约束.

### 需要保持的回归项

- 网页 deep link 导出: 官方版可导入的链接, 定制版也必须可导入; 当前最新功能周期没有重新记录完整端到端结果.
- 托盘行为: 左键双击打开, 左键单击不打开, 右键显示菜单, 再次启动不白屏.
- 对话级供应商路由: 必须验证 Codex Desktop 同一窗口内的不同对话,不能用 Claude Code,多窗口或仅代理单元测试替代.
- 上游同步: 每次 merge 后重点检查分组, 重启, Codex 模型菜单, 代理路由, 通用配置和四套语言文件.

### 本次验证记录

- `cargo test --manifest-path src-tauri/Cargo.toml codex_routed -- --nocapture`: 3 项通过.
- `cargo test --manifest-path src-tauri/Cargo.toml codex_model_catalog -- --nocapture`: 3 项通过.
- `cargo test --manifest-path src-tauri/Cargo.toml session_router::tests -- --nocapture`: 6 项通过.
- `pnpm tauri build --no-bundle`: 独立 `CARGO_TARGET_DIR` 下 Windows Release 构建通过;renderer 共转换 3311 个模块.

## 当前工作方式

- 源码修改完成相关测试并通过本地 Windows Release 编译后, 自动提交到 `main`.
- 文档和规则改动完成对应校验后自动提交, 不运行无关 EXE 编译.
- 自动提交后不自动推送; 用户明确要求推送或“提交上去”时才推送 `fork/main`.
- 长时间构建或 GitHub Action 必须跟踪到终态, 不让用户反复发送“继续”.
- 构建不得强制结束正在运行的 CC Switch 或 Codex Desktop; 目标文件被占用时使用旁路名称.

## 更新检查清单

- [ ] 重新读取 `git status`, 当前分支, HEAD, upstream 和远端差异.
- [ ] 重新检查正在运行的 CC Switch 路径和版本.
- [ ] 将完成的待办移入“已实现”, 删除失效状态, 不追加聊天流水账.
- [ ] 写入最新实际测试, Release 构建和原生 GUI 验证结论.
- [ ] 不记录 API Key, token, cookie, OAuth 数据或未脱敏配置.
- [ ] 状态文档与源码一起验证和提交; 不因更新本文件再次触发循环更新.
