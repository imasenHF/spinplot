# SpinPlot 持续开发上下文

更新日期：2026-10-29（Asia/Shanghai）

## 用途与优先级

本文是 SpinPlot 持续开发的远程交接记录，用于跨会话保存已确认决定、当前任务、实现位置、验收标准和发布边界，避免仅依赖对话历史推断项目状态。

本文不是代码状态的替代品。每次任务开始时，当前 GitHub 分支、最新 HEAD、文件内容、测试结果和用户最新要求优先于本文。本文中的 SHA、CI 结果均为记录时的基线，继续工作前必须重新查询，不得直接当作当前状态。

## 每次开发任务开始前必须执行

每次开始或恢复 SpinPlot 的开发、修复、提交、预览或发布任务前，必须完成以下步骤：

1. 按 plastocyanin 项目规则，先读取主站仓库 `imasenHF/imasenhf.github.io` 的最新 `main` 分支 `SITE_CONTEXT.md` 和 `PROJECT_INDEX.md`。
2. 读取 SpinPlot 当前目标分支的 `PROJECT_CONTEXT.md`、`README.md`、本文，以及与任务相关的 `docs/ARCHITECTURE.md`、`docs/TWO_DIMENSIONAL.md`、`docs/MODULARIZATION_PREVIEW.md`、`docs/STYLE_GUIDE.md` 和 `CHANGELOG.md`。
3. 从 GitHub 重新确认目标分支、HEAD SHA、PR 状态、最近 Actions 结果；重新读取本次要修改的源码和测试文件。不得根据旧对话中的 SHA 或状态直接写入。
4. 若使用本地检出，先检查当前分支和 `git status --short`，保留任何已有未提交修改。若仅使用 GitHub API，写入前必须重新获取目标文件的完整正文和最新 blob SHA。
5. 仅做有明确边界的修改。文件内容较长时，可按行段或 blob 读取定位；不得用被截断的展示内容覆盖完整源码，不得为小功能重写无关模块。
6. 分开报告代码修改、单元测试、生产构建、远程 CI、预览快照同步、公开 URL 浏览器验收和正式发布状态。一个阶段通过不能替代其他阶段。
7. 实际代码或有效决定发生变化后，更新本文及相关正式记录。只更新本文件不代表代码功能已经实现；未运行的测试、未完成的部署不得描述为已完成。
8. 未经用户明确要求，不合并到正式 `main`，不触发正式 SpinPlot 发布，不覆盖正式入口。

## 仓库与发布边界

- 仓库：`imasenHF/spinplot`。
- 当前持续开发分支：`preview/modularization-phase1-20261009`。
- 正式入口：<https://plastocyanin.org/spinplot/>，由仓库 `main` 的正式发布流程管理。
- 临时预览入口：<https://plastocyanin.org/previews/spinplot-modularization/>，由主站仓库中单独保存的静态构建快照提供。
- PR #1：<https://github.com/imasenHF/spinplot/pull/1>，用途为模块化预览，保持 Draft，未经明确授权不合并。
- 应用版本基线为 `0.9.2`；项目文件格式为 11；配置格式为 10。修改格式字段前必须回归旧项目 9/10/11 与配置格式 10。
- 预览分支 Actions 生成的构建产物不会自动替换主站仓库里的预览快照。必须单独检查快照同步提交、主站 Pages 发布结果和公开 URL；不可将分支 CI 成功等同于线上页面已更新。
- 公开预览禁止使用客户数据、内部文件或其他未经授权的材料。

## 当前预览交付与验收（2026-10-29）

- **新绘图模式：** Contour 与可旋转的 3D surface 已在模块化预览分支实现。3D 为具备深度遮挡的三角网格/WebGL 曲面，支持鼠标旋转、相机角度、Z 拉伸和缩放；视角控件放在 Plot 中、默认折叠。无 WebGL 场景采用同一网格的深度排序绘制。Heatmap、Contour、3D 支持 `zScale=linear|log`，Log10 严格筛除非正值，不改写源矩阵。
- **坐标轴与投影：** 新增一维/二维 Y 轴全局和子图 Linear/Log10，以及顶部和右侧投影分别设置对数强度轴、普通/科学计数法。Log10 的刻度与鼠标坐标采用同一对数映射，不能显示零或负强度；显式无效边界必须报错。项目版本 11、配置版本 10 不变。新轴控件需在主站 Axes 面板重组时迁移，不能被丢弃。
- **界面约束：** Current order 左侧独立曲线列表、右侧 34 px 纯符号样式列；参数标题用简短术语，必要解释使用动态有效的 `?` 提示，移除 Scan variable 长篇说明。图例/投影/坐标仍保留正确物理量、单位与保存配置。
- **验证：** 预览代码的数值、CSV、旧项目 9/10/11、配置 10、生产构建、Chromium 交互和迁移前对照均通过 [40739205730](https://github.com/imasenHF/spinplot/actions/runs/40739205730)。预览静态资源 `index-C4239H4u.js`、`index-B6BT7PR8.css` 与完整同次构建 HTML 已同步主站，Pages [40739438889](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40739438889) 发布成功；线上浏览器完整复测 [40739205307（第 2 次）](https://github.com/imasenHF/spinplot/actions/runs/40739205307) 通过。第一次公开测试失败因为部署时只替换 JS/CSS，旧 HTML 不包含 `globalYScale`，已改为整份同步 `preview-site/index.html`。正式 `main` 与 `/spinplot/` 未修改，Draft PR #1 未合并。

## 最近一次已核查的基线

以下状态已在 2026-10-22 重新核对：

- 代码实现提交：[`a47f9cc`](https://github.com/imasenHF/spinplot/commit/a47f9ccbfcda2dff1b054ff38687b8cdf55c80b4)，只修改 `src/main.js` 的 colorbar 双击交互。
- 浏览器回归扩展：`scripts/preview-browser-smoke.mjs` 检查色标滚轮缩放、色标双击 Auto Z 复原，以及热图主体双击恢复 X/Y；`scripts/preview-regression.mjs` 仅对当前版本启用新增交互测试，避免要求迁移前基线具备新功能。
- 代码回归与构建：[`39684319918`](https://github.com/imasenHF/spinplot/actions/runs/39684319918) 成功，包含现有数值/CSV/项目兼容/二维测试、TypeScript 检查、Vite 生产构建、Chromium 交互测试及与迁移前导出结果对照。
- 公开预览浏览器检查配置提交：[`1b3e328`](https://github.com/imasenHF/spinplot/commit/1b3e328af054c9ef79818193e902ca78c1a3fe41)，为已发布临时快照启用 colorbar 双击测试；模块化预览工作流 `39684871649` 成功。该 SHA 仅用于追溯配置变更，不代表当前 HEAD；每次任务开始时重新查询最新分支状态。
- 主站临时快照已更新：主站仓库提交 [`0f238ea`](https://github.com/imasenHF/imasenhf.github.io/commit/0f238ea62a1be5a8bcb4fd30c4665cb8a087e465)，新应用脚本为 `assets/index-DAzGls40.js`。主站 Pages 发布 [`39684696016`](https://github.com/imasenHF/imasenhf.github.io/actions/runs/39684696016) 成功；更新后的公开 HTTP 检查 [`39684871606`](https://github.com/imasenHF/spinplot/actions/runs/39684871606) 和公开 Chromium 浏览器测试 [`39684871564`](https://github.com/imasenHF/spinplot/actions/runs/39684871564) 均成功。
- 正式 `main` 分支与 `/spinplot/` 未修改；新行为只存在于隔离预览分支及 `/previews/spinplot-modularization/` 快照。


## 频率校正 Target 模式修复

- 新建子图继续默认使用 `freqMode: local`、`localFreqMode: mean`。
- 用户切换全局频率模式或修改全局目标频率时，未显式编辑过局部频率设置的 1D 子图切换为继承全局设置；已显式选择 Local/None 或修改 Local target 的子图保留局部覆盖。
- 修改子图的 Local target mode、Local target / GHz 或本地频率确认项，会自动启用 Local alignment，避免目标值已编辑但模式仍处于 Inherit global 的情况。
- 频率表中的 `ν raw / GHz` 对一维磁场曲线开放编辑。CSV 等缺少源频率元数据的数据，必须先填写源微波频率；缺少源频率时缩放栏显示 `—`，不会伪装成已完成校正。
- 验收已通过：预览分支数值/二维测试、Vite 构建、Chromium 频率校正与迁移前输出对照，以及公开预览频率/二维交互测试均通过；具体 Actions 记录见 `docs/MODULARIZATION_PREVIEW.md`。

## 当前任务 A：colorbar 双击恢复自动 Z 范围（已完成）

状态：已实现、提交、构建、自动回归及公开预览浏览器验收均通过。正式 `main` 未合并。

### 已核实的源码位置

- 修改文件：`src/main.js`。
- `canvas.addEventListener('wheel', ...)` 已使用 `state.plotRegions` 查找 `r.colorbar`，命中后调用 `TwoD.adjustZ(...)`，再执行界面更新、历史记录和重绘。
- `canvas.ondblclick` 目前从 `const p=canvasPoint(e),r=regionAtPoint(p.x,p.y)` 开始，尚未优先检查 colorbar。
- `src/twod/ui.js` 已提供 Auto Z 控件及相关二维设置处理。本任务不需要重写或覆盖 `src/twod/ui.js`。

### 实施要求

在 `canvas.ondblclick` 开头、现有 `regionAtPoint(p.x,p.y)` 判断之前，按 colorbar 的矩形范围检查双击位置。若命中：

1. 获取 `state.subplots[cb.subplot].twoD.settings`。
2. 按现有 Auto Z 语义设置 `zUseGlobal = false`，并将 `zMin`、`zMax` 清空。
3. 调用 `renderSubplotUI()`、`draw()`、`recordHistory('Auto Z')`，随后立即 `return`，避免进入热图主体的 X/Y 轴复原逻辑。
4. 保留现有滚轮 Z 缩放和热图主体双击恢复 X/Y 轴的行为。

### 验收标准

- colorbar 滚轮缩放后双击，可恢复自动 Z 范围。
- 连续缩放和复原、切换数据后复原均正常。
- 双击热图主体仍按原行为复原 X/Y 轴。
- 滚轮缩放行为不变。
- 检查 `git diff -- src/main.js` 或等价的精确文件差异；运行构建与相关二维回归测试；随后检查远程 Actions。
- 已完成验收：`npm ci`、全部现有数值/二维回归、`npm run build`、当前分支 Chromium 交互回归和迁移前输出对照均通过，见 [Actions 39684319918](https://github.com/imasenHF/spinplot/actions/runs/39684319918)。
- 已在公开临时预览执行同一交互回归，见 [Actions 39684871564](https://github.com/imasenHF/spinplot/actions/runs/39684871564)；静态资源 HTTP 检查通过，见 [Actions 39684871606](https://github.com/imasenHF/spinplot/actions/runs/39684871606)。
- 新行为仅部署在临时预览；正式 `main` 和 `/spinplot/` 保持不变。

代码提交说明：`2D: restore Z range on colorbar double click`。

## 当前任务 B：二维扫描变量分析、Overlap 与 CW EPR 功率饱和拟合

### 已确认的交互要求（2026-10-23）

- 二维导入默认只创建原有 Heatmap 子图，不自动生成扫描关联图。
- Variable scan 必须是显式新增的独立子图，入口位于二维子图的 Plot mode 菜单，与 Heatmap、Stack、Overlap 并列。创建后保留源二维图和原有顶部/右侧 Y 投影，不用扫描图替换任何投影。
- 新扫描子图初始放在源二维图右侧；复杂布局无法直接插入时追加为新行。创建后复用现有子图的位置、尺寸、排序、项目保存和导出操作。
- 扫描子图以扫描变量为 X 轴、选定 Y 投影统计量为 Y 轴。统计量包括 mean、max、min、peak-to-peak、RMS、sum；这些样本点统计不是按非等距坐标加权的积分，RMS 不保留符号。
- 2D Overlap 将各扫描轨迹绘制在共同 X 坐标轴上，轨迹标签显示扫描变量及其单位；每隔 N 条轨迹的设置控制显示抽样。原始二维矩阵不受显示偏移影响。
- 对 dB 衰减轴，功率扫描只要求零衰减参考功率 P₀，按 P(A) = P₀ × 10^(-A/10) 换算为 mW。界面不再要求输入 A₀；旧项目保存的 (P_ref, A_ref) 会迁移为等效 P₀ = P_ref × 10^(A_ref/10)。
- 对手动选入同一子图的两条及以上 1D 曲线，提供与导入二维数据一致的 Heatmap 和 Variable scan 操作。扫描变量默认名为 `Subplot index`、单位留空、数值从 1 开始按步长 1 等间距生成；可编辑变量名和单位，选择等间距（Start/Step）或手动数组。数组按当前曲线顺序逐一对应，热图行仍按数值排序，变量值按曲线 ID 保存，避免重排后错配。变量单位为空时坐标标题不显示单位括号。
- 第二阶段 CW EPR 饱和功率拟合尚未实现。需在第一阶段通过验收后再定义候选模型、参数约束、初值、失败判据和残差输出；不将未确认模型记为已实现。

### 当前实施与验收状态（2026-10-24）

- Variable scan 独立投影设置修正（2026-10-23）：扫描曲线使用 `scanStatistic`、`scanStatisticMin`、`scanStatisticMax` 独立保存统计方式与 X 坐标统计区间，计算复用右侧投影的样本归约函数。创建时在坐标方向一致的条件下，以源图 `yMode` 和 `projectionXMin/Max` 初始化，之后与源图设置独立；扫描视图隐藏 Top/Right projection 控件，只显示扫描轴、统计方式、统计区间和必要的功率换算。实现位于 `src/main.js` 的 `addVariableScanSubplot()` 及 `src/twod/ui.js`；后续标题与配色修正及公开预览状态见下方最新记录。
- 变量扫描与投影排版修正（2026-10-24）：新增 Variable scan 子图默认标题为空；顶部和右侧投影标题使用 Style → Typography 的独立 `projectionTitleSize` 设置（默认 11 px），不再跟随刻度标签字号；右侧标题宽度超过绘图区时，自动拆分为变量名和 `projection (统计方式)` 两行，并按可用宽度缩小字号。连续色带配色仅有一条曲线时使用色带起始颜色，避免 BWR 等色带的中点浅色导致曲线近乎不可见。新增二维渲染回归；发布状态以本次提交和 Actions 结果为准。
- 上一轮自动化运行 39951954898 全部通过：数值、CSV/插值、一维处理、项目版本兼容、现有二维回归、显示/坐标/导出测试、生产构建、Chromium 浏览器回归与迁移前对照均成功。浏览器测试验证扫描子图创建、源 Heatmap 保留、右侧布局、项目保存的布局信息及包含 Variable scan / Overlap 的 SVG 导出。
- 静态预览构建提交 d1e478f 已同步到主站，主站提交 3e50725 更新预览快照与资源检查页；Pages 发布运行 39953758517 成功，公开浏览器检查运行 39951955041 的第二次尝试通过。第一次公开检查使用旧快照，部署新资源后重跑通过。
- 用户此前上传的 exp(1).zip 计划用于 CIQTEK Field–Power、Field–Delay、Field–Modulation Amplitude、Time–Field 等二维样本检查；当前对话附件与可检索 Library 中仍未找到该 ZIP。真实仪器样本的坐标、单位、信号分量和项目保存验收仍待重新取得文件后执行。不得声称真实样本验收通过，也不得将样本复制到公开仓库。
- 本轮代码继续保持在 preview/modularization-phase1-20261009 和 Draft PR #1；未经明确授权不合并 main，正式 /spinplot/ 未修改。主站临时快照不会随预览分支自动同步。



## 后续二维开发方向

在前述任务完成后，继续评估与实施：

- 二维 Stack 功能扩展。
- Waterfall 视图。
- 逐轨迹特征提取与 Field–Power Sweep 分析。
- CW EPR 饱和功率拟合的多算法实现。

这些工作必须复用当前二维矩阵及坐标语义，兼顾反向/非等距坐标、实部/虚部/模值、项目保存兼容性和图像导出。实现范围应拆成可独立审查的提交，不把未实现规划描述为现有功能。

## 建议验收命令

在具备本地仓库和依赖的环境中，先按锁文件安装依赖，再运行相关测试及生产构建：

```bash
npm ci
node --test src/core/numeric.test.js
node --test src/data/csv.test.js
node --test src/processing/interpolation.test.js
node src/twod/core.test.js
node src/twod/bes3t.test.js
node src/twod/large.test.js
node src/twod/integration.test.js
node src/twod/ticks.test.js
npm run build
```

应依据实际修改范围补充相应测试。命令未执行时不得报告通过。构建通过不等于真实仪器数据数值验收、浏览器交互验收或部署验收通过。

## 最新状态核查（2026-10-24，追加复测）

- 本轮复测确认手动曲线转 Heatmap 后的投影 CSV 导出问题源自坐标范围状态：从派生二维图返回一维时，运行时标记 `sharedControls` 被保留，重新创建 Heatmap 时旧的一维坐标范围覆盖二维范围。提交 `757a7b263a6ee5eb52c6737ef2f8785930f47e95` 在切回一维时将缓存的二维设置 `sharedControls` 重置为 `false`。修复后浏览器日志确认投影 CSV 已导出。
- 随后项目重载发现校验器只接受 `twoD.index` 指向原始二维矩阵，拒绝 `derivedFromCurves` 的手动 Heatmap / Variable scan。提交 `ab9b32c72fdf84e90ca388148e5e1f922252bb51` 修改 `src/project/project.js`：分别验证原始二维数据索引与派生二维曲线索引，并拒绝将已有二维矩阵当作派生曲线来源。提交 `02ae520bdbef1c7ff550aa12e002ff53f6a00d62` 为两种派生视图补充了项目重载及无效引用测试。
- 浏览器回归已通过手动 Heatmap 的 CSV 导出、项目保存/重载、SVG 导出、迁移前数据对照及新增投影标题字号检查。完整工作流 [40060098623](https://github.com/imasenHF/spinplot/actions/runs/40060098623) 成功；对照归一化忽略新加的 `projectionTitleSize` 字段，仅用于与旧版数据结构比较，不影响应用保存该设置。
- 数值、CSV/插值、一维处理、项目版本兼容、手动曲线矩阵、现有二维回归、显示/坐标/导出测试、生产构建及浏览器测试脚本语法检查均通过。完整浏览器回归与迁移前对照已在提交 `60ba4c85f4d229aa72ec126b877e9ef921620199` 通过，模块化预览工作流为 [40060236078](https://github.com/imasenHF/spinplot/actions/runs/40060236078)，HTTP 检查为 [40060236132](https://github.com/imasenHF/spinplot/actions/runs/40060236132)。
- 2026-10-24 对用户提供的本地 CIQTEK `.epr` 归档完成静态数据契约检查：6 个文件均可解析为项目当前声明支持的 1D Field/Time Sweep、2D Field-Power、Field-Delay、Field-Modulation Amplitude 与 Time-Field 类型；检查了各轨迹 X 坐标一致性、实部/虚部维度、信号有限值、逐轨迹频率及第二坐标单调性，均通过。Time-Field 数据符合默认转置为 Field-horizontal 的规则。归档未上传至公开仓库。此项为本地数据结构检查，尚未在真实浏览器中对这 6 个文件完成导入、绘图、投影 CSV 与项目保存/重载全流程。
- 其中 Field-Delay 文件未声明延迟轴单位，解析器按现有规则保留数值并提示单位未声明；不推定为 ms 或 μs。文件级 `setting.frequency` 与轨迹级 `line.freq` 存在小幅差异，当前解析器使用轨迹级频率，后续如做频率对齐需继续核对来源定义。
- `scripts/preview-browser-smoke.mjs` 已新增专门的 SVG 浏览器断言：在 `SPINPLOT_TEST_PROJECTION_TITLE_SIZE=1` 时将投影标题字号设为 23 px、刻度字号设为 9 px，检查导出 SVG 中投影标题采用 23 px 且刻度仍使用 9 px。该测试只由模块化预览回归显式启用，避免对仍运行旧版静态快照的公开预览检查造成误报。最新完整工作流 [40060098623](https://github.com/imasenHF/spinplot/actions/runs/40060098623) 已通过，包含该项投影标题字号与刻度字号独立性断言。正式 `main` 和 `/spinplot/` 未修改，Draft PR #1 未合并。


## 过往核查记录

当前有效状态以本文件前面的“最新状态核查（2026-10-24，追加复测）”为准；更早的运行结果由 Git 历史保留。

## 维护规则

- 本文维护当前有效决定、最近核查基线、活动任务及未完成验收项；不持续追加已失效的讨论。完整历史由 Git 保存。
- 每次任务结束后，仅在代码、测试、部署状态或已确认决定实际变化时更新相关记录。
- 若本文与用户最新指令冲突，执行用户最新明确要求；若本文与远程代码或 CI 状态冲突，先核查远程事实，再修正文档。
- 正式功能状态以当前代码和实际检查结果为准。对用户汇报时，明确区分已修改、已提交、CI 通过、预览已同步、浏览器已验收和正式发布。


## 最新状态核查（2026-10-26，扫描变量与作图模式简化）

- 手动曲线生成的 Heatmap 与 Variable scan 共用唯一的扫描变量设置。面板位于 Plot mode 下方，默认折叠，在 Heatmap 与 Variable scan 模式间切换时仍可展开使用。
- 作图模式菜单仅显示 Stack、Overlap、Heatmap、Variable scan 四项；移除 Overlay (1D) 和 Stack (1D) 返回选项，转换需要撤销时使用 Undo。
- 手动曲线 Heatmap 默认显示 Y 轴标题，标题取扫描变量名，默认值为 `Subplot index`。此规则仅覆盖手动曲线 Heatmap，不更改普通 1D 图的全局 Y 标题偏好。
- 浏览器回归新增可见模式列表、面板折叠/位置、默认 Y 标题、曲线顺序映射、项目保存/重载及投影 CSV 检查。代码修改后需以当前 HEAD 的完整模块化回归与静态预览浏览器检查结果为最终验收依据。
- 当前仍只修改 `preview/modularization-phase1-20261009` 及主站的独立静态预览目录；正式 SpinPlot `main` 与 `/spinplot/` 不得修改或合并。


## 当前修改与验收（2026-10-28）

- 当前界面调整：`Current order` 左侧独立滚动列表和右侧独立样式选择列采用真正并列 Grid，不再通过绝对定位覆盖文件列表；两列同行对齐、滚动同步。样式下拉选项的可见文字使用实线、虚线、点线与空心/实心几何符号的组合，保留内部 style 值、旧项目兼容和 aria-label。实现见 `src/main.js`、`src/styles/app.css`；通过局部浏览器回归检查列间距、DOM 分离和符号选项，主站预览同步后再进行公开浏览器验证。


- 新建子图的频率对齐默认固定为 `freqMode: local`、`localFreqMode: mean`；全局频率下拉菜单原有默认值已是 `local_mean`，不改变用户显式选择全局模式时的传播逻辑，也不覆盖载入的旧项目设置。
- 1D 曲线派生的 Heatmap 保留原 Data 面板的 Available curves、Current order、逐曲线样式菜单和管理工具栏，不再替换为 `Current data: N manual 1D curves` 单项；直接导入的二维数据仍使用矩阵数据摘要。相关代码位于 `src/main.js`、`src/twod/ui.js`；新增 Chromium 检查验证切换后控件数量、曲线排序与样式选项。
- 完整数值、构建、Chromium 回归与迁移前对照通过 [Actions 40695773639](https://github.com/imasenHF/spinplot/actions/runs/40695773639)；新版静态预览已同步主站，Pages 部署通过 [40696290984](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40696290984)，公开预览浏览器回归在部署后复测通过 [40696141839（第 2 次运行）](https://github.com/imasenHF/spinplot/actions/runs/40696141839)。正式 SpinPlot `main`、`/spinplot/` 和 Draft PR #1 的未合并状态均保持不变。

## 最新验收记录（2026-10-27）

- 手动曲线派生图的 Plot mode 仅显示 Stack、Heatmap、Overlap、Variable scan 四项；扫描变量面板位于 Plot mode 分组内并默认折叠；Heatmap 默认显示扫描变量名称作为 Y 轴标题。
- 修复自定义扫描变量变化后 Y 轴范围仍保留旧值的问题。修改等间距起始值/步长或自定义数组时，Heatmap 的 Y 轴范围与 Y 投影范围同步更新为当前扫描值的最小值和最大值；变量仍按源曲线 ID 保存，曲线重排后对应关系不变。
- 切换到 Heatmap 时，折叠 2D 坐标/投影设置面板；从选中 1D 曲线转换为 Heatmap 时也默认保持折叠，避免切换视图后自动展开轴选项。
- 完整 Chromium 回归与迁移前对照在提交 `ac6551faf400cf2bb15d6ca75b36a779f590897c` 通过 [40531478449](https://github.com/imasenHF/spinplot/actions/runs/40531478449)。新增回归将扫描值从 `1, 2, 3` 改为非均匀的 `2, 30, 6`，检查子图 Y 轴范围为 2–30、投影 CSV 数值和曲线映射，以及保存/重载结果。
- 2026-10-28 增加切换 Heatmap 后投影轴选项保持折叠的处理，并为 1D 曲线转换延迟重绘，避免模式选择事件误触新出现的折叠面板。完整 Chromium 回归及迁移前对照通过 [40626095521](https://github.com/imasenHF/spinplot/actions/runs/40626095521)。静态资源已同步至主站独立预览目录，Pages 部署状态以 [40626290185](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40626290185) 为准。正式 SpinPlot `main` 与 `/spinplot/` 不得修改或合并。
- 2026-10-28 曲线样式设置已合并为单一下拉菜单，提供实线、虚线、点线、空心/实心圆形、方形、三角形、菱形及线条+符号组合。新增子图线宽覆盖（留空继承全局设置）、符号大小和 Variable scan 独立曲线样式；旧项目的 mode/symbol 字段继续兼容，未配置样式的曲线默认实线。Canvas 与 SVG 均按曲线颜色填充实心符号。单元测试、生产构建、完整 Chromium 回归与迁移前对照通过 [40668486468](https://github.com/imasenHF/spinplot/actions/runs/40668486468)。主站独立预览资源已同步并部署成功 [40668931440](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40668931440)，公开预览浏览器回归通过 [40669120554](https://github.com/imasenHF/spinplot/actions/runs/40669120554)。正式 SpinPlot `main` 与 `/spinplot/` 保持不变，Draft PR #1 未合并。
