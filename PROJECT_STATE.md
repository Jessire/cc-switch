# CC Switch Project State

> 本文件只记录当前有效状态和可复核边界. 每次任务开始前必须重新读取 Git、进程和构建资产; 不记录凭据、真实配置或聊天过程.

## 状态快照

- 更新时间: 2026-08-04, Asia/Shanghai.
- 工作目录: `D:\文件\Agenc Cli\cc-switch`.
- 当前主线: `main`, 跟踪 `fork/main`.
- 用户仓库: `fork`, `https://github.com/Jessire/cc-switch.git`.
- 上游仓库: `origin`, `https://github.com/farion1231/cc-switch.git`.
- 最近一次已核验的上游基线: `origin/main` 的 v3.19.0 提交 `3c1154bed95a9e7cc8fe8664f046cde5560141a0`.
- 最近一次已核验的远端 `fork/main`: `5d79b6bf02291037f4de39bdbc198dcbb46d1b0f`. 后续本地文档提交是否已推送必须以当次 Git 复核为准.

## 已实现的个人定制

### 供应商分组

- 支持批量和单个供应商加入分组, 同一供应商可属于多个分组.
- 供应商卡片显示所属分组; 全部、未分组和自定义分组均可拖动排序, 添加分组始终位于最后.
- 顶部分组栏在指针悬停时将鼠标滚轮转换为横向滚动, 到达边界仍阻止页面纵向滚动.

### 切换与客户端重启

- 保存编辑不启用供应商也不重启客户端; 顶部循环箭头用于手动重启当前客户端.
- 自动重启仅在成功切换后生效; 同组供应商共享任一自定义分组时可跳过重启.
- Windows 重启仅处理对应客户端的 UI 主进程, 静默执行, 不使用 `taskkill /T`; 仅检测到新进程才返回启动成功.

### Codex Desktop 模型与路由

- Codex Desktop 模型菜单仅生成已收藏的第三方模型; 供应商收藏与模型启用状态分离,已收藏但全部禁用时主页使用淡色星标表示. 不保留 bundled 官方模型或官方目录回退. 空菜单仍保持 CC Switch 托管目录.
- 同名模型按全局排序路由: 首个启用项使用裸模型 ID, 后续项使用 `provider-id/model-id`; 所有显示项仍带独立短分组.
- 短分组与主界面供应商名称解耦; 支持供应商组排序与组内模型排序, 不允许模型跨供应商组拖动.
- Codex 模型菜单支持标题栏内联批量重命名, 点击“查看匹配”下拉菜单可预览匹配的修改前名称、模型 ID 和修改后名称; 分组勾选框与组内模型双向同步. 1 个或 2 个模型与分组同一行, 3 个及以上模型时分组单独一行且模型最多三列; 模型名和模型 ID 左对齐, 点击模型名直接编辑且不再显示独立编辑图标.
- Codex 模型编辑支持 `372K`、`500K`、`1M` 上下文快捷值; GPT-5.6 默认 `372000`, Claude 和国产模型默认 `1000000`, Grok 默认 `500000`, 仅在上下文窗口为空时自动填充. 所有模型禁用后保留供应商收藏,主页以淡色星标表示未启用.
- Codex 对话可独立选择供应商和模型; 代理在出站前恢复真实模型 ID, 不切换 CC Switch 全局供应商.

### 主界面、更新、托盘和导入

- 顶部宽度足够时 Codex 和 Grok Build 仅显示图标, 其他应用保留图标和名称; 宽度不足时应用切换器统一折叠为图标.
- 供应商卡片保持单排自然流布局: 头像、名称、收藏、分组、状态和蓝色官网链接紧凑衔接, 卡片操作仅悬停显示.
- 分组头像映射: `GPT/OpenAI -> openai`, `Grok/xAI -> grok`, `Claude/Anthropic -> claude`, `国模/国产 -> kimi`; 未识别时回退供应商图标或首字头像.
- 正常运行不检查官方应用更新; 设置页移除应用检查、下载、安装和 Release Notes 入口, 但保留数据库不兼容恢复链路和 Skill 更新能力.
- 正常启动显示主界面; 托盘左键双击打开、右键菜单保留; 官方 deep link 导入能力必须保持可用.

### 通用配置

- 统一供应商创建的 Claude、Codex 和 Gemini 子供应商默认启用通用配置.
- 用户显式关闭通用配置时保持关闭状态.

## 当前构建、发布和运行实例

- v3.19.0 上游合并提交: `c1522aff3643752e90dd62425b4f6b3eedbb6ac9` (`Merge upstream v3.19.0`). 冲突文件 `src/App.tsx` 与 `src/components/AppSwitcher.tsx` 保留定制版自动紧凑行为, 其余上游有效改动已合并.
- 最近一次正式本地 Windows x64 Release 构建产物: `D:\文件\Agenc Cli\cc-switch\src-tauri\target\release\cc-switch.exe`; 文件版本 `3.19.5`, x64, 大小 `32,754,688` bytes, SHA256 `4B21D275815C1707215CE5F6D58A959C6393CB68554F4BBE33C6F1A35E5E8ABC`. 当前运行的旁路新版仍为 `C:\Users\jery3\.codex\tmp\CC-Switch-New-20260804.exe`, PID `21856`, 未停止.
- 最新 GitHub Release: `v3.19.5`, 标签指向 `aac15a48b3e33309732c00dba3e69611ebf1ccd8`; Release 资产为 `CC-Switch-v3.19.5-Windows-x64.exe`, 大小 `32,754,688` bytes, SHA256 `CDC70363F83FF99C4105256C3ED1A85DB0949613CFA9C2413453D07E7DEE70E0`.
- 当前运行实例: PID `15348` 运行 `D:\文件\Agenc Cli\cc-switch\src-tauri\target\release\cc-switch.exe`; 文件版本 `3.19.5`, SHA256 `CDC70363F83FF99C4105256C3ED1A85DB0949613CFA9C2413453D07E7DEE70E0`. 本轮旁路实例未启动, 未停止当前 CC Switch/WorkBuddy Desktop, 未触碰数据库、配置和客户端真实配置.
- 2026-08-02 已删除仓库外 `cc-switch-build`, `.codex\tmp` 中的 CC Switch EXE/回滚副本/临时脚本/日志/截图/隔离数据, 以及标准构建的 `deps`, `build`, `.fingerprint` 等可重建中间物; 保留 `node_modules` 和正在运行的标准 Release EXE. 清理后 C: 可用空间 `101.24 GB`, D: 可用空间 `564.40 GB`.

## 已完成验证

- v3.19.0 合并后已通过 `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm format:check`, `pnpm exec vitest run tests/components/ProviderCardLayout.test.ts`, `pnpm test:unit`, `pnpm build:renderer`, `cargo fmt --check`, `cargo test responses_tool_filter --lib`, `cargo test codex_model --lib`, `cargo test universal_provider --lib`, `cargo test --lib` 和 `pnpm tauri build --no-bundle`.
- Windows Release 已使用独立应用标识和隔离数据库副本实际启动验证: 主窗口无白屏, 供应商卡片维持单排布局, 操作按钮默认悬停显示, 顶部应用切换器按可用宽度统一收缩. 隔离实例已退出并清理.
- 本轮模型菜单改动已通过 `pnpm format:check`, `pnpm typecheck`, `pnpm exec vitest run src/components/providers/codexModelMenuState.test.ts` (6 项), `git diff --check` 和 `pnpm tauri build --no-bundle`; 多行模型组新增本地展开/折叠, 不改变排序、勾选或保存数据. Release 产物版本、大小和 SHA256 已核验.
- 本轮模型菜单视觉调整已通过 `pnpm typecheck`, `pnpm format:check`, 全量 `pnpm test:unit`, `pnpm exec vitest run src/components/providers/codexModelMenuState.test.ts`, `pnpm build:renderer` 和 `pnpm tauri build --no-bundle`; Release 产物版本 `3.19.0`, SHA256 已核验. 因已有 PID `29324` 占用正式单实例锁, 新产物未能启动进行窗口级视觉复核, 未结束该已有实例.
- 本轮批量重命名、上下文默认值和星标状态修复已通过 `pnpm typecheck`, `pnpm format:check`, `pnpm exec vitest run --pool forks --maxWorkers 1 --minWorkers 1` (91 个测试文件、612 个测试全部通过), `pnpm build:renderer` 和旁路 `pnpm tauri build --no-bundle`; Release 旁路产物已覆盖并核验 SHA256 `B0CDE001A17DC270A9CBD5AEF46D7E73B3C30AA6407F5E9E7049E295C22D09C1`.
- GitHub Release 资产已下载回读, 大小与 SHA256 均和本机构建产物一致.
- 版本 `3.19.5` 已通过 `pnpm format:check`, `cargo metadata --manifest-path src-tauri/Cargo.toml --no-deps`, `cargo fmt --check` 和唯一临时 target 的 `pnpm tauri build --no-bundle`; 标准 Release 归位后版本、大小、x64 架构和 SHA256 已核验, GitHub `v3.19.5` 资产下载回读一致.
- 本轮“查看匹配”定位修复已通过 `pnpm format:check`, `pnpm typecheck`, `pnpm exec vitest run src/components/providers/codexModelMenuState.test.ts` (6 项), `git diff --check` 和标准 Windows x64 Release 构建. 使用隔离应用标识和隔离数据库实际点击复核: 弹层位于匹配输入框下方, 不再跑到窗口最左侧, 左右文本分别在各自半区居中, 箭头保持在中线. 最终标准 Release EXE SHA256 为 `CDC70363F83FF99C4105256C3ED1A85DB0949613CFA9C2413453D07E7DEE70E0`.
- 2026-08-04 本轮模型菜单与分组栏改动已通过 `pnpm format:check`, `pnpm typecheck`, 直接相关 Vitest 10/10, `pnpm build:renderer`, `cargo fmt --check`, `git diff --check` 和唯一旁路 target 的 `pnpm tauri build --no-bundle`. 全量 Vitest 有 3 个与本轮无关的既有失败: `modelsDevAutoSync` 时间状态断言, `App.test.tsx` 两项 Tauri/MSW 集成超时. Rust `client_restart` 定向测试运行超过 184 秒未收敛,无编译错误输出; Release 构建已证明 Rust 编译通过.
- 2026-08-04 本轮后续改动已通过 `pnpm typecheck`, `pnpm format:check`, `git diff --check`, Grok Build 导入单测 1/1 和自动重启开关单测 2/2. 标准 Windows x64 Release 已成功覆盖 `D:\文件\Agenc Cli\cc-switch\src-tauri\target\release\cc-switch.exe`, 版本 `3.19.5`, 大小 `32,754,688` bytes, SHA256 `5D93BBFBEB729B58AA97DCEEF66DE750863DFFA6062526CFC7763A1B978E1FE8`. 当前运行的是新版旁路 PID `24036`, 路径 `C:\Users\jery3\.codex\tmp\CC-Switch-New-20260804.exe`, 未停止.
- 2026-08-04 本轮查看匹配回退与 Codex 全量选择导入已通过 `pnpm typecheck`, `pnpm format:check`, `git diff --check`, 相关 Vitest 9/9 和标准 Windows x64 Release 构建. Grok Build 导入菜单列出 Codex 中全部非官方供应商,默认全选,允许取消后批量导入.
- 2026-08-04 本轮导入菜单与查看匹配布局修复已通过 `pnpm typecheck`, `pnpm format:check`, `git diff --check`, 相关 Vitest 16/16 和标准 Windows x64 Release 构建. 导入列表加入独立滚动区域、固定行高、可点击复选行和固定底部导入按钮;查看匹配恢复原始样式并固定三列行高.

## 未完成边界与回归重点

- 为保护正在进行的 Codex 对话, 未对真实 `ChatGPT.exe` 执行破坏性重启, 未在真实 Desktop 会话中验证第三方模型菜单读取和对话级路由.
- 正式实例已切换到标准 Release `3.19.5` 并保持运行; `ccswitch` 协议注册已指向该 EXE. 使用测试 provider deep link 实际打开导入确认页并取消, 数据库中未产生 `DeepLink Path Probe` 记录; 未重复执行其他功能或 UI 回归.
- 对话级供应商路由仍需在至少两个 Codex Desktop 对话中选择不同 `供应商 - 模型`, 发起真实请求并核对代理日志的供应商及剥离后的上游模型.
- 本轮因必须保留 PID `21856` 和当前 Codex/WorkBuddy Desktop 会话, 未停止正在运行的新版旁路实例; 标准 Release 已覆盖原版路径但未切换运行实例. 旧 `useProviderActions` 测试中的“同组不重启”断言与本轮明确删除的功能冲突,未按旧语义回退. 影响托盘、deep link、分组、重启、模型菜单、代理路由或通用配置的后续改动, 必须按对应真实 Windows 行为重新验证, 不得只凭构建通过收口.

## 维护检查清单

- [ ] 任务开始时重新读取 `git status`, `HEAD`, `fork/main`, `origin/main` 和远端差异.
- [ ] 涉及 EXE 替换前精确核验指定进程 PID、路径、版本和 SHA256, 不以进程列表第一项作判断.
- [ ] 任务结束时将仍有效的测试、构建、Release 和运行状态写回本文件; 删除过时或重复记录.
- [ ] 不写入 API Key, token, cookie, OAuth 数据或真实数据库内容.
