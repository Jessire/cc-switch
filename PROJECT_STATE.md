# CC Switch Project State

> 本文件只记录当前有效状态和可复核边界. 每次任务开始前必须重新读取 Git、进程和构建资产; 不记录凭据、真实配置或聊天过程.

## 状态快照

- 更新时间: 2026-08-16, Asia/Shanghai.
- 工作目录: `D:\文件\Agenc Cli\cc-switch`.
- 当前主线: `main`, 跟踪 `fork/main`.
- 用户仓库: `fork`, `https://github.com/Jessire/cc-switch.git`.
- 上游仓库: `origin`, `https://github.com/farion1231/cc-switch.git`.
- 最近一次已核验的上游基线: `origin/main` 提交 `413c09e0790c304506888ae24b9be72820aca126`,包含 v3.19.2 及其后续 Codex catalog 修复.
- 最近一次已核验的远端 `fork/main`: `92ad034df18d0b74462b42165464914e2882185f`. 当前本地 `main` 含尚未推送提交; 后续是否已推送必须以当次 Git 复核为准.

## 已实现的个人定制

### 供应商分组

- 支持批量和单个供应商加入分组, 同一供应商可属于多个分组.
- 供应商卡片显示所属分组; 全部、未分组和自定义分组均可拖动排序, 添加分组始终位于最后.
- 顶部分组栏在指针悬停时将鼠标滚轮转换为横向滚动, 到达边界仍阻止页面纵向滚动.

### 切换与客户端重启

- 保存编辑不启用供应商也不重启客户端; 顶部循环箭头用于手动重启当前客户端.
- 普通 Codex 模型菜单保存只写入配置且不重启; 智能排序视图保存时才按“保存智能菜单后自动重启 Codex”开关决定是否重启.
- 自动重启仅在成功切换后生效; 同组供应商共享任一自定义分组时可跳过重启.
- Windows 重启仅处理对应客户端的 UI 主进程, 静默执行, 不使用 `taskkill /T`; 仅检测到新进程才返回启动成功.

### Codex Desktop 模型与路由

- Codex Desktop 模型菜单仅生成已收藏的第三方模型; 供应商收藏与模型启用状态分离,已收藏但全部禁用时主页使用淡色星标表示. 不保留 bundled 官方模型或官方目录回退. 空菜单仍保持 CC Switch 托管目录.
- 同名模型按全局排序路由: 首个启用项使用裸模型 ID, 后续项使用 `provider-id/model-id`; 所有显示项仍带独立短分组.
- 短分组与主界面供应商名称解耦; 支持供应商组排序与组内模型排序, 不允许模型跨供应商组拖动.
- Codex 模型菜单支持标题栏内联批量重命名, 点击“查看匹配”下拉菜单可预览匹配的修改前名称、模型 ID 和修改后名称; 分组勾选框与组内模型双向同步. 1 个或 2 个模型与分组同一行, 3 个及以上模型时分组单独一行且模型最多三列; 模型名和模型 ID 左对齐, 点击模型名直接编辑且不再显示独立编辑图标.
- Codex 模型编辑支持 `372K`、`500K`、`1M` 上下文快捷值; GPT-5.6 默认 `372000`, Claude 默认 `200000`, 国产模型默认 `1000000`, Grok 默认 `500000`, 仅在上下文窗口为空时自动填充. 所有模型禁用后保留供应商收藏,主页以淡色星标表示未启用.
- Codex 模型菜单支持原始排序与智能排序结果切换查看; 原始视图保留供应商卡片,智能视图改为跨供应商全局模型列表,同型号节点连续排列并显示所属短分组,保存时按当前视图写入.
- 智能视图保存时按全局列表顺序写入 `menuOrder`,不再按原供应商卡片顺序写入;Codex 菜单实际顺序与智能排序视图一致.
- 获取最新模型列表后会提示已添加但本次缺失的模型 ID; 当前配置保持不变, 不自动停用、取消勾选、删除或替换这些模型.
- Codex 对话可独立选择供应商和模型; 代理在出站前恢复真实模型 ID, 不切换 CC Switch 全局供应商.

### 主界面、更新、托盘和导入

- 顶部宽度足够时 Codex 和 Grok Build 仅显示图标, 其他应用保留图标和名称; 宽度不足时应用切换器统一折叠为图标. 顶部工具栏整体靠右对齐; 隔离测试中全应用开启会超宽, 用户实际配置不会触发, 保留现有紧凑模式处理.
- 供应商卡片保持单排自然流布局: 头像、名称、收藏、分组、状态和蓝色官网链接紧凑衔接, 卡片操作仅悬停显示.
- 分组头像映射: `GPT/OpenAI -> openai`, `Grok/xAI -> grok`, `Claude/Anthropic -> claude`, `国模/国产 -> kimi`; 未识别时回退供应商图标或首字头像.
- Codex 添加供应商预设仅显示“自定义配置”和“OpenAI Official”; Grok 从 Codex 导入默认不勾选,菜单收窄并明确按分组导入.
- Claude/Claude Desktop/Codex 的“需要路由”标识改为紧凑路由图标并保留悬停提示; Grok/Codex 共用模型下拉显示 Codex 友好模型名.
- 正常运行不检查官方应用更新; 设置页移除应用检查、下载、安装和 Release Notes 入口, 但保留数据库不兼容恢复链路和 Skill 更新能力.
- 正常启动显示主界面; 托盘左键双击打开、右键菜单保留; 官方 deep link 导入能力必须保持可用.

### 通用配置

- 统一供应商创建的 Claude、Codex 和 Gemini 子供应商默认启用通用配置.
- 用户显式关闭通用配置时保持关闭状态.

## 当前构建、发布和运行实例

- v3.19.7 上游合并提交: `9de4561a31330ce1eb2b5fcc7aac253c44439d49` (`Merge upstream and release v3.19.7`). 合并基于 `origin/main` `413c09e0790c304506888ae24b9be72820aca126`,冲突块按 Jessire 要求保留定制实现,同文件非冲突上游改动保留.
- 当前标准 Windows x64 Release 产物: `D:\文件\Agenc Cli\cc-switch\src-tauri\target\release\cc-switch.exe`; 文件版本 `3.19.7`, PE32+ x64 Windows GUI, 大小 `33,020,416` bytes, SHA256 `1685E456DEB24BC449EB1B8CF37CCBA0003A5C6F17A86158800D788A3C5C57E9`.
- 最新 GitHub Release: `v3.19.7`,标签指向提交 `9de4561a31330ce1eb2b5fcc7aac253c44439d49`; Release 资产为 `CC-Switch-v3.19.7-Windows-x64.exe`,大小 `33,013,248` bytes,SHA256 `11B008897E9082AF13D9E94B96D621B1BE7F04A43BDF93EF6F76A96B57313B2B`. GitHub 下载回读已匹配.
- 当前运行实例: PID `23120` 运行 `D:\Download\CC-Switch-v3.19.7-Windows-x64.exe`; 本轮未结束或替换该外部实例. 标准 Release 已重新构建,但尚未启动以避免干扰现有运行状态.
- 2026-08-02 已删除仓库外 `cc-switch-build`, `.codex\tmp` 中的 CC Switch EXE/回滚副本/临时脚本/日志/截图/隔离数据, 以及标准构建的 `deps`, `build`, `.fingerprint` 等可重建中间物; 保留 `node_modules` 和正在运行的标准 Release EXE. 清理后 C: 可用空间 `101.24 GB`, D: 可用空间 `564.40 GB`.

## 已完成验证

- v3.19.0 合并后已通过 `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm format:check`, `pnpm exec vitest run tests/components/ProviderCardLayout.test.ts`, `pnpm test:unit`, `pnpm build:renderer`, `cargo fmt --check`, `cargo test responses_tool_filter --lib`, `cargo test codex_model --lib`, `cargo test universal_provider --lib`, `cargo test --lib` 和 `pnpm tauri build --no-bundle`.
- 2026-08-09 上游合并与 3.19.7 版本已通过 `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm format:check`, 全量 Vitest, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, Rust `cargo test --manifest-path src-tauri/Cargo.toml --lib` (2372 passed, 5 ignored) 和 `pnpm tauri build --no-bundle`.
- 2026-08-09 旁路 Release 已核验版本 `3.19.7`, PE32+ `machine (x64)`, Windows GUI subsystem,大小 `33,013,248` bytes,SHA256 `11B008897E9082AF13D9E94B96D621B1BE7F04A43BDF93EF6F76A96B57313B2B`.
- 2026-08-09 GitHub `v3.19.7` Release 资产已下载回读,大小与 SHA256 均和本地构建产物一致;本轮已删除 `C:\Users\jery3\.codex\tmp\cc-switch-release-3197` 旁路构建目录及其下载副本.
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
- 2026-08-04 本轮匹配列精确对齐与导入真实写入反馈已通过 `pnpm typecheck`, `pnpm format:check`, `git diff --check`, 相关 Vitest 16/16 和标准 Windows x64 Release 构建. 查看匹配弹层左列锚定搜索输入框、箭头使用中间列、右列锚定替换输入框;导入改为单次批量写入并在刷新后按实际数量提示,移除蓝色焦点样式.
- 2026-08-04 本轮居中对齐与 Codex auth 导入修复已通过 `pnpm typecheck`, `pnpm format:check`, `git diff --check`, 相关 Vitest 17/17 和标准 Windows x64 Release 构建. 查看匹配左右列恢复居中;导入转换从 `settingsConfig.auth.OPENAI_API_KEY`/`CODEX_API_KEY` 读取凭据,新增 auth 结构单测,避免生成缺少 `api_key` 的 Grok Build 配置.
- 2026-08-04 本轮批量供应商管理与 Grok 分组导入已通过 `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `pnpm typecheck`, `pnpm format:check`, `git diff --check`, 相关 Vitest 13/13, `pnpm build:renderer` 和 `pnpm tauri build --no-bundle`. 批量选择支持全选、取消全选、Shift 范围选择和永久删除;Grok 导入按 Codex 自定义分组同步,目标分组成员按导入结果覆盖并清理过时成员. 标准 Release SHA256 为 `18DA89AA7B6D62E16E9FE5030DC667A66EE206BF29BD07290E72DC0F77C59B0D`. 2026-08-05 已清理本轮确认的 Release 中间目录、仓库 `dist`、旧旁路 EXE 和临时构建目录,正式 EXE 保留且哈希复核一致.
- 2026-08-08 原始/智能排序切换已通过模型菜单单测 7/7, `pnpm typecheck`, `pnpm format:check` 和 `git diff --check`; 标准 Windows x64 Release 已覆盖,版本 `3.19.5`,大小 `32,754,688` bytes,SHA256 `4634746FB507FA3E4203FD702CFB3155D6D4419E6DD8B6ACD49792C6A3AA217E`.
- 2026-08-08 智能排序无视觉变化修复已通过模型菜单单测 7/7, `pnpm typecheck`, `pnpm format:check` 和 `git diff --check`; 标准 Windows x64 Release 已覆盖,版本 `3.19.5`,大小 `32,758,784` bytes,SHA256 `F7F92B5BF3CE42B4E00D611590D6A6EF95A3C244F2C34562EDB462019E550667`.
- 2026-08-08 跨供应商智能排序视图已通过模型菜单单测 7/7, `pnpm typecheck`, `pnpm format:check`, `git diff --check`, 标准 Windows x64 Release 构建和实际 GUI 验证. 智能视图中 `opus-4.7`、`opus-4.8`、`opus-5` 的不同供应商节点连续排列,切回原始排序恢复供应商卡片;未点击保存,真实配置未改动. 标准 EXE 版本 `3.19.5`,大小 `32,758,784` bytes,SHA256 `E6A3BC50A05958BED21D9C15610D9A17C76D9FB5C172A803DA03220968CA71B6`,当前运行实例为标准 Release 路径.
- 2026-08-08 智能视图保存顺序修复已通过模型菜单单测 8/8, `pnpm typecheck`, `pnpm format:check` 和 `git diff --check`; 标准 Windows x64 Release 已覆盖,版本 `3.19.5`,大小 `32,758,784` bytes,SHA256 `409849E44E4E1A12E5B9A8B2AB45637E9619BA4287F1B480D985025F7069B77C`.
- 2026-08-12 模型菜单保存/重启语义、模型缺失提醒、自动重启菜单布局和顶部工具栏右对齐已通过 `pnpm format:check`, `pnpm typecheck`, 全量 `pnpm test:unit`, 直接相关 Vitest 11/11, `pnpm build:renderer`, `git diff --check` 和 Windows x64 Release 增量编译. 独立应用标识与隔离数据库的实际 Release GUI 已确认菜单宽度、两行文案和正常宽度下右对齐; 全应用开启的隔离测试态会超宽, 用户确认实际配置不会出现. 未读取或修改正式数据库.
- 2026-08-13 自动重启下拉菜单已改为按两行文案和右侧勾选自动收缩, 移除无关保存图标与两侧冗余留白, 选中勾选移动到下拉箭头正下方的右侧; 修复过度压缩导致的文案溢出重叠和固定宽度造成的中间空白. 已移除全局 `focus-visible` 蓝色描边和 Tailwind 焦点 ring, 保留控件原有 hover、边框、选中和禁用反馈. 批量模型改名在点击“重命名”后立即写入对应 Codex 供应商配置并刷新查询, 不再等待底部“保存”, 连续改名和后续底部保存均以最新持久化结果为基线; 排序、启用状态与菜单短分组继续沿用底部保存语义. 已通过相关 Vitest 10/10, `pnpm format:check`, `pnpm typecheck`, `pnpm build:renderer`, `git diff --check` 和 Windows x64 Release 构建. 实际标准 Release GUI 已确认菜单按内容收缩、两行文案完整、右侧勾选紧凑对齐、与下方分组栏无重叠, 下拉打开及关闭后均无蓝色焦点框. 标准 EXE 版本 `3.19.7`, 大小 `33,013,248` bytes, SHA256 `2A99BB2B1047130517CDB0F2621F66D5A6E74CB61BDC940D6D217FB4C8049184`, 当前运行实例为标准 Release 路径.
- 2026-08-14 本轮模型菜单修复已完成单模型改名即时持久化、批量改名即时持久化、缺失模型名后行内提示、Claude/Anthropic 无显式上下文时默认 `200K`,以及非 GPT 模型 `High`/`XHigh`/`Max` 三档推理强度. 已通过 `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `pnpm format:check`, `pnpm typecheck`, 相关 Vitest 16/16, `pnpm build:renderer`, `cargo test --manifest-path src-tauri/Cargo.toml codex_config::tests:: --lib` 90/90 和 `git diff --check`. 标准 Windows x64 Release 已直接覆盖并启动验证; 版本 `3.19.7`,大小 `33,020,416` bytes,SHA256 `A50B8E441545ABFC3B31B16AB3990DA89415FBAC57E0DDB9B9F5474DD08ED460`,当前 PID `21880`. Codex Desktop 原生模型选择器宽度不受本项目 CSS 控制,本轮未修改该外部界面.
- 2026-08-16 本轮供应商界面调整已通过 `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `pnpm format:check`, `pnpm typecheck`, 全量 Vitest 110/110 文件、748/748 测试, `pnpm build:renderer`, `pnpm tauri build --no-bundle` 和 `git diff --check`. 标准 Release 版本 `3.19.7`,大小 `33,020,416` bytes,SHA256 `1685E456DEB24BC449EB1B8CF37CCBA0003A5C6F17A86158800D788A3C5C57E9`. 由于现有外部 CC Switch 实例 PID `23120` 正在运行,未强制结束或替换; Release GUI 的隔离启动未能建立可见窗口,因此本轮未完成实际 Release 窗口点击核验.

## 未完成边界与回归重点

- 为保护正在进行的 Codex 对话, 未对真实 `ChatGPT.exe` 执行破坏性重启, 未在真实 Desktop 会话中验证第三方模型菜单读取和对话级路由.
- 标准 Release `3.19.7` 已覆盖并保持运行; 本轮未在真实 Codex Desktop 会话中验证第三方模型菜单读取和对话级路由, 未用真实供应商凭据现场执行 `/models` 获取, 模型缺失提示以逻辑测试覆盖. `ccswitch` 协议注册未在本轮改动.
- 对话级供应商路由仍需在至少两个 Codex Desktop 对话中选择不同 `供应商 - 模型`, 发起真实请求并核对代理日志的供应商及剥离后的上游模型.
- 旧 `useProviderActions` 测试中的“同组不重启”断言与已明确删除的功能冲突,未按旧语义回退. 影响托盘、deep link、分组、重启、模型菜单、代理路由或通用配置的后续改动, 必须按对应真实 Windows 行为重新验证, 不得只凭构建通过收口.

## 维护检查清单

- [ ] 任务开始时重新读取 `git status`, `HEAD`, `fork/main`, `origin/main` 和远端差异.
- [ ] 涉及 EXE 替换前精确核验指定进程 PID、路径、版本和 SHA256, 不以进程列表第一项作判断.
- [ ] 任务结束时将仍有效的测试、构建、Release 和运行状态写回本文件; 删除过时或重复记录.
- [ ] 不写入 API Key, token, cookie, OAuth 数据或真实数据库内容.
