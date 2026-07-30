# CC Switch Project State

> 本文件记录当前有效状态, 不是完整历史. 开始任务时先核实现状; 完成任务后只更新发生变化的部分.

## 状态快照

- 更新时间: 2026-07-31, Asia/Shanghai.
- 当前上游基线: `origin/main` 的 `v3.19.0` 提交 `3c1154bed95a9e7cc8fe8664f046cde5560141a0`; 合并冲突按 Jessire 定制实现保留。
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
- 分组标签容器支持鼠标垂直滚轮映射为横向滚动; 指针位于分组栏时始终拦截非零滚轮事件, 到达首尾边界后也不继续滚动页面; 指针离开后恢复页面纵向滚动.
- 主要提交: `484b204`, `27c7ce0`, `23a34ff`, `042264d`; 本轮提交以 Git 实时状态为准.

### 切换与客户端重启

- 已实现供应商切换后自动重启对应客户端.
- 已实现同组供应商切换时跳过重启.
- 已消除 Windows 自动重启时的 CMD 弹窗.
- 已实现独立手动重启按钮; 编辑供应商只保存配置, 不附带“保存并重启”.
- Codex Windows 重启只匹配 `ChatGPT.exe`, 不再把 `codex.exe` 子进程当作独立目标.
- Windows 重启只结束匹配的 UI 主进程 PID, 不使用 `taskkill /T`; 等全部旧实例退出后再启动, 仅检测到新进程时返回 `launched=true`.
- 前端自动重启只以 `launched=true` 作为成功, 避免客户端退出后未重新启动仍显示成功.
- 已实现自动重启、同组跳过和 Windows 进程控制回归测试.
- 主要提交: `cbdd576`, `74c9b50`, `0ab6b5a`, `075b496`, `12bc160`; 本轮提交以 Git 实时状态为准.

### 托盘和启动

- 已实现托盘左键双击打开主窗口.
- 已取消左键单击打开主窗口; 右键保留菜单.
- 已修复定制 Release 构建嵌入前端资源后可直接打开主窗口.
- “静默启动”已改为“开机静默启动”: 自启注册命令附加 `--cc-switch-auto-start`, 只有自启调用且设置启用时隐藏主窗口; 手动无参数启动始终显示主窗口.
- 已启用自启时, 设置同步会刷新注册命令, 将旧的无参数注册项迁移为新参数形式.
- 主要提交: `8031ab8`, `6f386df`; 本轮提交以 Git 实时状态为准.

### Codex Desktop 模型

- Codex Desktop 模型菜单只投影已收藏供应商中启用的第三方模型; bundled 官方模型一律不保留、不显示, 空菜单仍生成受管空目录并阻止回退官方目录.
- 已实现可用模型获取、勾选、整组排序、组内排序、显示名、模型 ID、上下文配置和菜单启停; 模型不得跨供应商组拖动.
- 不保留 Codex 独立默认模型输入区、默认圆点、按钮或持久化字段; 菜单顺序是展示和同名路由的唯一控制方式, 第一项继续同步到顶层 `model` 作为启动选择.
- 同名模型中, 全局菜单顺序最靠前的启用第三方模型使用裸模型 ID, 后续同名模型使用 `provider-id/model-id`; 路由与菜单投影共用同一计算规则.
- 每个第三方模型显示为 `模型显示名 · 短分组`; 第一项即使使用裸模型 ID, 显示名也保留短分组来源.
- 每个收藏供应商保存独立的 `codexModelMenuGroupName`; 模型菜单短分组与外部供应商名称解耦, 外部改名和重新导入不覆盖短分组.
- 模型菜单短分组可直接编辑; 编辑控件默认淡化, 行悬停、聚焦或编辑时恢复.
- 第三方 GPT 模型目录支持 `low`, `medium`, `high`, `xhigh`, `max`, `ultra` 六档思考强度及 `Fast`; Fast 转发为 `service_tier=priority`.
- 已保留 Grok Build 的独立默认模型行为, 并保留紧凑三列模型区、视口内滚动和固定 Footer.
- 首次升级只自动收藏当前 Codex 供应商; 新收藏供应商的模型默认排在已有顺序之前.
- 主要提交: `6ff0c70`, `97f0e31`, `5e532a6`, `3c26e0b`, `29576ec`, `dc53d80`, `7cbedfc`, `7a566b5`; 本轮提交以 Git 实时状态为准.

### Codex 会话模型路由

- 已实现 Codex Desktop 模型菜单驱动的对话级供应商路由, 每个对话可独立选择供应商和模型.
- 菜单路由按收藏、模型启用状态和全局顺序生成; 每个同名模型的首个启用第三方项使用裸模型 ID. 代理在上游请求前恢复真实模型 ID, 不切换 CC Switch 全局当前供应商.
- 已支持 OpenAI Chat、原生 Responses 和 Anthropic 供应商混合出现在同一模型目录, 每个菜单项使用自己的工具协议模板.
- 原有 `/model` 会话路由和 `provider/model` 前缀路由继续保留; 已删除供应商的旧路由返回明确错误, 不静默回落.
- 主要提交: `773dfd8`, `80db8fa`, `9499694`.

### 主界面布局

- 已将自动重启、代理接管和故障转移三个开关作为一组放到顶部中间偏左.
- 已将应用切换与其后的四个工具图标作为一组移到三个开关右侧, 两组内部顺序保持不变.
- 宽屏下只有 Codex 和 Grok Build 使用纯图标; 其他应用继续显示图标和名称, 紧凑布局规则不变.
- 供应商卡片保持约 `70px` 高的自然流单行布局; 头像、名称、收藏、分组、状态和蓝色官网链接依次紧凑衔接, 不设置固定列宽, 长内容按原逻辑省略并保留 `title`, 右侧配额及悬停操作保留.
- 供应商头像按主界面分组统一映射: `GPT/OpenAI -> openai`, `Grok/xAI -> grok`, `Claude/Anthropic -> claude`, `国模/国产 -> kimi`; 多分组按现有顺序取第一个可识别品牌, 未识别时回退供应商原图标或首字头像.
- 已移除自动重启成功提示中的 `(via ...)` 来源括号; 本轮不修改供应商卡片蓝色焦点边框.

### 应用更新

- 正常启动和正常运行不再检查官方应用更新, 顶部更新提示、更新上下文、应用更新弹窗、通知和红点已移除.
- 设置页已移除应用检查、下载、安装和 Release Notes 入口, 保留当前版本号、官网、GitHub 和 CLI 工具升级功能.
- `DatabaseUpgrade.tsx`、`check_app_update_available`、`install_update_and_restart` 和 Tauri updater 插件继续保留, 仅服务数据库不兼容恢复; Skill 更新功能不受影响.

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

- 2026-07-31 复核时, 正在运行的 CC Switch 为 `CC Switch-New5.exe`, 路径 `D:\文件\Agenc Cli\cc-switch\CC Switch-New5.exe`; 版本 `3.18.0`, SHA256 `8B39D059EA32F7B56652768B9AFD4887B43778D935320C3CF10E3004D30C5B3D`.
- 正在运行的 `CC Switch-New5.exe` 与 Codex Desktop 均未在 v3.19.0 构建、隔离 GUI 验证或清理过程中结束、覆盖或重启。
- 最新 Windows x64 Release 构建: `D:\文件\Agenc Cli\cc-switch\src-tauri\target\release\cc-switch.exe`, 版本 `3.19.0`, 大小 `32,750,592` bytes (`31.23 MiB`), SHA256 `7CD44197EB135729409E0EE768051C038BAC96A880FD39016A0A7FDAB1CCDF4F`.
- GitHub Release 上传文件已从该构建产物逐字节校验复制至 `C:\Users\jery3\.codex\tmp\cc-switch-release\CC-Switch-Custom-v3.19.0-Windows-x64.exe`; 文件未加入 Git, 未替换当前运行实例, 未删除或改写用户数据、设置和备份。
- GitHub Release 已发布: `v3.19.0-custom.1`, 标题 `CC Switch Custom v3.19.0`, 目标构建提交 `c1522aff3643752e90dd62425b4f6b3eedbb6ac9`, 下载地址 `https://github.com/Jessire/cc-switch/releases/download/v3.19.0-custom.1/CC-Switch-Custom-v3.19.0-Windows-x64.exe`.
- 进程, 文件路径, 版本和哈希均为易变状态; 涉及运行或替换 EXE 前必须重新检查.

## 待办与待验证

### 真实客户端边界

- Codex 重启实现已通过 Rust 测试和构建验证, 但为保护当前 Codex 对话, 未对真实 `ChatGPT.exe` 执行破坏性重启实测.
- 当前已运行 `CC Switch-New4.exe`; 为保护当前 Codex 对话, 仍未在真实 `ChatGPT.exe` 上验证第三方模型目录读取、官方 bundled 模型移除和重启行为.
- 对话级供应商路由仍需在至少两个 Codex Desktop 对话中分别选择不同的 `供应商 - 模型`, 发起真实请求并核对代理日志中的供应商和剥离后的上游模型.
- Codex 原生 `/responses` 第三方透传链路已按 GitHub Issue `#5190`、`#3683` 的范围在最终出站 body 过滤 `image_generation`: 顶层 `tools`, 直接 `tool_choice`, `tool_choice.allowed_tools.tools` 和 `input[].additional_tools.tools` 均覆盖; 保留 `function`、`web_search` 等非图像工具及用户内容. `#3683` 所述 Desktop `config.toml` 开关失效不再依赖, 由本地代理末端处理. 过滤后的残留检测只记录 JSON pointer 路径, 不记录请求正文、凭据或 URL; 非原生路径绕过过滤时记录安全警告. 此链路已通过真实纯文本请求返回 HTTP `200`, 未再出现图像权限 `403`.
- 2026-07-30 尝试只读核对当前 Codex Desktop 会话的模型菜单, 未发送聊天请求或改动模型. Electron 内容区拒绝后台点击, 前台激活亦被 Windows 拒绝, 因此菜单和 Desktop 端到端会话验证仍为未完成边界; 代理到 Fengwind 的真实请求验证不受影响.
- 新增统一供应商默认启用通用配置、显式关闭后持久保留, 仍需结合真实用户数据做非破坏性复验.

### 需要保持的回归项

- 网页 deep link 导出: 官方版可导入的链接, 定制版也必须可导入; 当前最新功能周期没有重新记录完整端到端结果.
- 托盘行为: 左键双击打开, 左键单击不打开, 右键显示菜单, 再次启动不白屏.
- 对话级供应商路由: 必须验证 Codex Desktop 同一窗口内的不同对话, 不能用 Claude Code、多窗口或仅代理单元测试替代.
- 上游同步: 每次 merge 后重点检查分组、重启、Codex 模型菜单、代理路由、通用配置和四套语言文件.

### 本次验证记录

- 上游 `v3.19.0` 合并后已通过 `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm format:check`, `pnpm exec vitest run tests/components/ProviderCardLayout.test.ts`, `pnpm test:unit`, `pnpm build:renderer`, `cargo fmt --check`, `cargo test responses_tool_filter --lib`, `cargo test codex_model --lib`, `cargo test universal_provider --lib`, `cargo test --lib` 和 `pnpm tauri build --no-bundle`.
- 已用独立应用标识和隔离数据库副本实际启动 v3.19.0 Windows Release GUI; 主窗口无白屏, 供应商卡片保持名称、收藏、分组和官网链接的一排自然流布局, 卡片操作按钮默认悬浮显示, 顶部应用切换器按可用宽度统一收缩. 隔离预览实例验证后已退出并清理, 未影响正式实例.
- 上游冲突文件 `src/App.tsx` 与 `src/components/AppSwitcher.tsx` 保留定制版自动紧凑逻辑: 宽度足够时 Codex、Grok Build 仅图标, 其他应用显示图标和名称; 宽度不足时统一折叠为图标.
- Codex 菜单定向前端测试 `6` 项、Codex provider Rust 模块测试 `45` 项和当前前端单元测试全部通过.
- `pnpm typecheck`, Prettier 校验, `pnpm test:unit`, `pnpm build:renderer`, `cargo fmt --check` 全部通过.
- `cargo test responses_tool_filter --lib`: `9` 项定向测试通过, 覆盖顶层 `tools`, 直接与 `allowed_tools` 形式的 `tool_choice`, `input[].additional_tools` 载体、用户内容保护、残留 marker 路径诊断和 Codex native 路径 gate.
- `cargo test --lib`: `2215 passed`, `0 failed`, `2 ignored`.
- `pnpm tauri build --no-bundle`: Windows x64 Release 构建通过. 交付 `CC Switch-New5.exe` (v3.18.0, x64, 32,541,184 bytes, SHA256 `8B39D059EA32F7B56652768B9AFD4887B43778D935320C3CF10E3004D30C5B3D`), 未覆盖正在运行的 `CC Switch-New4.exe`.
- 已审计前后端、命令和多语言资源, bundled 官方模型、`isNativeDefault`、默认圆点和官方 ID 回退逻辑均已移除; 空菜单仍保持 CC Switch 托管目录和 `{"models":[]}`.
- 供应商卡片已恢复为名称、收藏、分组和官网链接自然衔接的单排布局; 定向布局测试、完整前端验证和 Windows x64 Release 构建通过.
- 已使用独立应用标识和隔离数据库副本启动实际 Windows Release GUI, 截图确认供应商卡片与参考图一致且全部信息保持一排; 验证后仅关闭隔离预览实例, 当前 `CC Switch-New4.exe` 和 Codex Desktop 未受影响.
- 真实代理链路验证记录仍有效: 含 `image_generation` 声明的纯文本 `/responses` 请求返回 HTTP `200`, 上游转发前移除不支持的图像工具声明; 新增诊断只输出残留路径, 不记录请求正文、凭据或 URL.

## 当前工作方式

- 源码修改完成相关测试并通过本地 Windows Release 编译后, 自动提交到 `main`.
- 文档和规则改动完成对应校验后自动提交, 不运行无关 EXE 编译.
- 自动提交后不自动推送; 用户明确要求推送或“提交上去”时才推送 `fork/main`.
- 长时间构建或 GitHub Action 必须跟踪到终态, 不让用户反复发送“继续”.
- 构建不得强制结束正在运行的 CC Switch 或 Codex Desktop; 目标文件被占用时使用旁路名称.

## 更新检查清单

- [x] 重新读取 `git status`, 当前分支, HEAD, upstream 和远端差异.
- [x] 重新检查正在运行的 CC Switch 路径和版本.
- [x] 将完成的待办移入“已实现”, 删除失效状态, 不追加聊天流水账.
- [x] 写入最新实际测试, Release 构建和原生 GUI 验证结论.
- [x] 不记录 API Key, token, cookie, OAuth 数据或未脱敏配置.
- [x] 状态文档与源码一起验证和提交; 不因更新本文件再次触发循环更新.
