# SpinPlot 持续开发上下文

更新日期：2026-10-24（Asia/Shanghai）

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
- 浏览器回归现已通过手动 Heatmap 的 CSV 导出及项目保存/重载阶段；最新一次工作流 [40059792039](https://github.com/imasenHF/spinplot/actions/runs/40059792039) 正在重新执行完整基线对照。上一次 [40059692779](https://github.com/imasenHF/spinplot/actions/runs/40059692779) 已通过浏览器操作与重载，失败点为基线 JSON 对照未忽略新加的 `projectionTitleSize` 设置字段。提交 `eef00112d5c32b9c6a24786a3ce4118fb117fea9` 已在对照归一化时排除此新增控件字段；这只用于与旧版数据结构比较，不影响应用保存该设置。
- 数值、CSV/插值、一维处理、项目版本兼容、手动曲线矩阵、现有二维回归、显示/坐标/导出测试、生产构建及浏览器测试脚本语法检查均通过。完整浏览器回归及迁移前对照尚未在最新 HEAD 上全部通过。
- `Projection titles` 独立字号（默认 11 px，范围 7–40 px）仍缺少专门的浏览器交互断言；待当前基线回归通过后，补测顶部/右侧投影标题响应与刻度标签字号独立性。正式 `main` 和 `/spinplot/` 未修改，Draft PR #1 未合并。


## 最新状态核查（2026-10-24）

- 最新源码分支 HEAD：`ddfc5473adbf9be173929e01ced9bbc43ac59c58`（`test: keep projection title default independent of tick size`）。`index.html` 已包含 Typography → `Projection titles` 数值输入框，默认 11 px、范围 7–40 px；`src/main.js` 将其列入通用控件采集与事件绑定，`src/plotting/oned.js` 将独立值传给一维绘图模型，`src/twod/ui.js` 使用该值绘制顶部与右侧投影标题。实现已存在于源码，仍需在实际浏览器中确认修改数值后两处标题变化且不影响刻度字号。
- 当前自动化工作流 [`40016524070`](https://github.com/imasenHF/spinplot/actions/runs/40016524070) 的数值回归、CSV/插值、一维处理、项目兼容、手动曲线转二维矩阵、现有二维回归、显示/坐标/导出测试、生产构建和浏览器测试脚本语法检查均通过；Chromium 回归在 `scripts/preview-browser-smoke.mjs:385` 等待 `Export projection CSV` 下载时超时（15 s），因此整个工作流失败。此失败点发生在手动曲线转 Heatmap/Variable scan 流程，尚未确认根因，不得据此认定投影标题字号功能失败或通过。
- 同一提交的临时预览 HTTP 检查 [`40016524252`](https://github.com/imasenHF/spinplot/actions/runs/40016524252) 成功；这只确认静态页面可访问，不能代替浏览器交互验收。当前静态预览尚未由失败的主工作流更新。正式 `main` 与 `/spinplot/` 均未修改，也未合并 Draft PR #1。
- 下一步先定位并修复 CSV 下载回归测试超时，再运行完整 Chromium 回归；随后单独验证 `Projection titles` 字号输入对顶部/右侧标题的影响、项目保存/载入后的默认值与兼容性。完成后再更新临时预览快照及主站索引。

## 维护规则

- 本文维护当前有效决定、最近核查基线、活动任务及未完成验收项；不持续追加已失效的讨论。完整历史由 Git 保存。
- 每次任务结束后，仅在代码、测试、部署状态或已确认决定实际变化时更新相关记录。
- 若本文与用户最新指令冲突，执行用户最新明确要求；若本文与远程代码或 CI 状态冲突，先核查远程事实，再修正文档。
- 正式功能状态以当前代码和实际检查结果为准。对用户汇报时，明确区分已修改、已提交、CI 通过、预览已同步、浏览器已验收和正式发布。
