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
- 已实现供应商收藏与模型勾选共同决定 Codex Desktop 菜单内容; 取消勾选只隐藏, 删除按钮才删除模型记录.
- 已实现独立的 `Codex 模型菜单`管理器, 支持全局排序、菜单显示名、启停及同名模型默认供应商.
- 同名模型的默认供应商使用裸模型 ID, 其他供应商使用 `provider-id/model`; 路由与菜单投影共用同一计算规则.
- 首次升级只自动收藏当前 Codex 供应商; 新收藏供应商的模型默认排在已有顺序之前.
- 主要提交: `6ff0c70`, `97f0e31`, `5e532a6`, `3c26e0b`, `29576ec`, `dc53d80`.

### Codex 会话模型路由

- 已实现 Codex Desktop 模型菜单驱动的对话级供应商路由, 每个对话可独立选择供应商和模型.
- 菜单路由按收藏、模型启用状态、全局顺序及同名默认供应商生成; 代理在上游请求前恢复真实模型 ID, 不切换 CC Switch 全局当前供应商.
- 已支持 OpenAI Chat、原生 Responses 和 Anthropic 供应商混合出现在同一模型目录, 每个菜单项使用自己的工具协议模板.
- 原有 `/model` 会话路由和 `provider/model` 前缀路由继续保留; 已删除供应商的旧路由返回明确错误, 不静默回落.
- 主要提交: `773dfd8`, `80db8fa`;本次模型菜单路由提交以 Git 实时状态为准.

### 主界面布局

- 已将自动重启、代理接管和故障转移三个开关作为一组放到顶部中间偏左.
- 已将应用切换与其后的四个工具图标作为一组移到三个开关右侧, 两组内部顺序保持不变.
- 已移除自动重启成功提示中的 `(via ...)` 来源括号.

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

- 2026-07-29 本次检查时, 正在运行的 CC Switch 为 `CC-Switch-Custom-New.exe`, PID `21228`.
- 运行路径: `D:\文件\Agenc Cli\cc-switch\CC-Switch-Custom-New.exe`; 该实例不包含本次收藏与模型菜单管理功能.
- 正在运行的 Codex Desktop 为 `codex.exe`, PID `7660`; 本次构建和测试均未结束或重启它.
- 已完成 Windows x64 Release 构建, 未覆盖或结束当前运行实例.
- 本地旁路交付文件: `D:\文件\Agenc Cli\cc-switch\CC-Switch-Custom-New.exe`.
- 交付版本 `3.18.0`,大小 `32,487,424` bytes (`30.98 MiB`),PE Machine `0x8664` (`x64`).
- SHA256: `F4438C1F1A55A6B3CD6FC1B7D6AA05EAEEE3DBA01A8E99EB5C640C10E01058E5`.
- 本次新交付文件: `D:\文件\Agenc Cli\cc-switch\CC-Switch-Custom-New2.exe`.
- 新交付版本 `3.18.0`, 大小 `32,527,360` bytes (`31.02 MiB`), PE Machine `0x8664` (`x64`).
- 新交付 SHA256: `B42C8233D1E342C27EBC1D3CE225FBAFD3D0863546631BAE98AC23CF21B4AB86`.
- 进程, 文件路径, 版本和哈希均为易变状态; 涉及运行或替换 EXE 前必须重新检查.

## 待办与待验证

### 下一次功能构建必须完成

- 在用户允许切换版本后关闭旧 CC Switch, 启动 `CC-Switch-Custom-New2.exe`, 再重启 Codex Desktop 读取新模型目录.
- 原生 GUI 验证顶部两组控件位置、供应商名称右侧收藏按钮、`Codex 模型菜单`管理器、编辑页取消勾选与删除的差异.
- 在至少两个 Codex Desktop 对话中分别选择不同的 `供应商 - 模型`,发起真实请求并核对代理日志中的供应商和剥离后的上游模型.
- 验证新增统一供应商默认勾选通用配置.
- 验证显式关闭通用配置后再次编辑或重启仍保持关闭.
- `cua-driver` 后台启动 New2 的探针返回既有 PID `21228`, 证明单实例锁阻止并行运行; 未将旧实例截图误作新版本验收.

### 需要保持的回归项

- 网页 deep link 导出: 官方版可导入的链接, 定制版也必须可导入; 当前最新功能周期没有重新记录完整端到端结果.
- 托盘行为: 左键双击打开, 左键单击不打开, 右键显示菜单, 再次启动不白屏.
- 对话级供应商路由: 必须验证 Codex Desktop 同一窗口内的不同对话,不能用 Claude Code,多窗口或仅代理单元测试替代.
- 上游同步: 每次 merge 后重点检查分组, 重启, Codex 模型菜单, 代理路由, 通用配置和四套语言文件.

### 本次验证记录

- `cargo test --manifest-path src-tauri/Cargo.toml codex_ -- --nocapture`: 主测试 478 项通过, 其他匹配的集成测试全部通过.
- `cargo test --manifest-path src-tauri/Cargo.toml session_router::tests -- --nocapture`: 6 项通过.
- `pnpm test:unit`: 前端全量测试通过; `tests/integration/App.test.tsx` 4 项单独复验通过.
- `pnpm typecheck`, `pnpm format:check`, `cargo fmt -- --check`, `git diff --check`: 全部通过.
- `pnpm build:renderer`: 生产构建通过, 共转换 3312 个模块.
- `cargo test --quiet`: 业务测试全部通过; `skill_sync` 有 1 项因当前 Windows 无创建符号链接权限报 `1314`, 其后互斥锁污染项单独重跑通过.
- `pnpm tauri build --no-bundle`: Windows x64 Release 构建通过, 新产物已旁路复制并核对 SHA256.

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
