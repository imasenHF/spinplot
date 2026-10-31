## 2026-10-31 顶部工具栏按钮尺寸统一

- 顶部 `.top-actions` 普通按钮与绘图区 `.toolbar` 中的通用按钮统一为 28 × 27 px；SVG 图标统一为 14 × 14 px，并沿用通用按钮的 1.7 px 笔画。
- 移除顶部工具栏对按钮和 SVG 的放大覆盖；Export 保留文字，高度 27 px、最小宽度 86 px。七个操作的顺序、功能、文件格式和工具栏容器高度均不变。
- 仅调整 `src/styles/app.css` 与对应设计记录，不改动图标内容或交互逻辑。

## 2026-10-31 Export 页恢复 Config / Project 面板（PR #8，已合并 main）

- 工具栏精简后发现原有 `organizeGlobalUI()` 曾将 `#fileOperationsCard` 隐藏并搬离 Export 页；此前顶部 Config 操作使这一问题不易察觉。
- 修复后让 Export 页直接显示 Config / Project 面板，保留 Save Config、Load Config、Save Project 与 Open Project，避免把低频配置入口移回顶部。现有 JSON 处理函数、数据格式和自动绘图保持不变。
- Chromium 回归增加 Export 面板可见性及配置 JSON/SVG 下载。[PR #8](https://github.com/imasenHF/spinplot/pull/8) 已合并；[质量检查](https://github.com/imasenHF/spinplot/actions/runs/41112803755)、[Chromium 操作回归](https://github.com/imasenHF/spinplot/actions/runs/41112803677) 和 [矢量 PDF 回归](https://github.com/imasenHF/spinplot/actions/runs/41112803713) 均成功。正式 Pages 与生产 HTTP 状态另行检查。

## 2026-10-31 顶部常用工具栏整理（PR #7 已合并 main）

- 删除顶部 Plot、Load Config、Save Config 和 Reset Config，移除 File 菜单及 Export 页的 Reset Config。保留七按钮的固定排列：Open Data、Open Project、Save Project | Undo、Redo | Clear Data | Export，Export 保留文字；Clear Data 保留现有动作语义。低频 Config 保存/读取在 Export 页与 File 菜单保留，Tools → Recalculate 与自动绘图保持可用。
- 文件打开改用带 aria-label 的可聚焦 button 触发 file input；打开/保存项目保持格式兼容。更新 src/main.js 的事件绑定，避免查询已删除的按钮导致初始化失败；删除不可达的 Clear Config 函数与默认快照。新增明确区分数据文件、项目文件和图像导出的 SVG，顶部高频操作按钮与绘图区操作栏统一为 28 × 27 px，图标 14 × 14 px；Export 高度 27 px、最小宽度 86 px并保留文字。
- 更新脚本中已删除的顶部控件引用，Chromium 回归检查按钮集合、文件选择、保存项目、保存配置、图形导出和清除数据；已通过 [PR #7](https://github.com/imasenHF/spinplot/pull/7) 合并至 `main`；合并前质量及矢量 PDF 检查成功，Chromium 工具栏复测遇到连续文件下载测试问题，新测试工作流仍待确认。部署状态以最新 Pages 与生产 HTTP Actions 为准。

## 2026-10-31 Legend 控件修复（已合并 main，PR #6）

- 原因：`src/interface.js` 对全部 `sp.twoD` 的 Labels 设置统一处理，仅 Stack/Overlap 允许显示；Variable scan 虽由一维曲线渲染器绘制，却被隐藏。绘图模型又覆盖 Variable scan 的 `labelMode`。全局 Style → Legend 原先仅有不透明度和边框，缺少位置设置。
- 新增 `globalLegendPosition`，默认 Upper right。新子图 `legendPosition='inherit'`；局部位置可以覆盖全局；位置计算同时作用于实际绘制与外置 legend 的绘图区边距。Variable scan 新建时显式默认为 Legend，用户可设置标签模式与位置；直接二维 Heatmap/Contour/3D 继续隐藏无意义的曲线图例。
- 老配置文件没有 `globalLegendPosition` 时，把原来的默认 `upper_right` 视为继承（加载初始画面仍为 Upper right），其他原有明确位置及 `auto` 保持其既有语义。保存使用现有配置 v10 / 项目 v11，不更改格式版本。
- 代码与单元回归位于 `src/plotting/legend-position.js`、`src/plotting/legend-position.test.js`、`src/main.js`、`src/interface.js`、`src/plotting/oned.js` 和 `index.html`。[PR #6](https://github.com/imasenHF/spinplot/pull/6) 已合并至 `main`（`94a2cd4`）。[质量检查](https://github.com/imasenHF/spinplot/actions/runs/41098253484)、[Chromium legend 回归](https://github.com/imasenHF/spinplot/actions/runs/41098253424) 及 [矢量 PDF 回归](https://github.com/imasenHF/spinplot/actions/runs/41098253403) 均成功。发布后的生产 HTTP、实际跨浏览器显示另行确认。

## 2026-10-31 Power fit 参数和布局整理（已合并 main，PR #5）

- 幅度模型的数值求解器不变，优化的 P 改称 Psat；上升段净幅度 S(P)−C 等于峰值净幅度一半时的功率为 P½=(2−√3)²Psat。线宽拟合有独立的 Psat，P½ 仅为幅度拟合计算量。
- No. of points 统计有效拟合点数，不含排除点。面板顺序为 Models、测量范围和排除点、Fit parameter range、Fit results、Plot annotation；注释九宫格和自定义位置，背景不透明度 0–1（默认 0）、边框（默认关）。Variable scan 原有曲线 legend 不再强制挪到绘图区外。
- 变更已通过 [PR #5](https://github.com/imasenHF/spinplot/pull/5) 合并至 `main`（`c394daf`），合并前 [quality](https://github.com/imasenHF/spinplot/actions/runs/41094969127) 与 [vector PDF](https://github.com/imasenHF/spinplot/actions/runs/41094968602) 检查通过。正式站点部署及生产 HTTP 应与代码检查分开核对；真实 EPR 数据的科学数值与复杂图的人工视觉验收仍需完成。原始 EPR 数据、拟合优化算法、项目格式 11 和配置格式 10 保持不变。

## 2026-10-31 Variable scan 拟合显示与饱和功率解释

- Power fit 显示从逐参数复选框改为单个 `Show results on plot`，开启时同时显示幅度/线宽拟合公式和全部结果；可选九宫格或自定义 X/Y 百分比位置、字体（Plot font / Arial / Times New Roman / Georgia / Consolas / Courier New）与 8–24 px 字号，默认右下角与 12 px。未打开时不显示，旧 `scanFitDisplay` 有选中值时迁移为开启状态。
- 绘图摘要由 `src/twod/fit-summary.js` 生成，通过 `src/plotting/oned.js` 绘制，PNG/SVG/PDF 共用绘图路径。增补格式化与饱和模型解析单元测试；复杂页面视觉验收仍单独进行。
- 当前幅度模型固定为 `S(P)=A√P/(1+P/Psat)+C`，等效于幂指数 ε=1 的特例。优化得到的 `Psat` 是该模型的峰值功率；半峰值 `P½=(2−√3)²Psat` 取基线扣除后的上升段。按模型规定 5% 低功率外推偏差阈值时 `P5%=Psat/19`，此判据与半峰值不同，并未作为新拟合参数。
- 尚未引入可调 ε（非均匀/均匀展宽模型族），也没有用截图替代原始实验数据开展新模型选择。需要数据拟合对照后再讨论更换模型。

## 2026-10-31 Variable scan 拟合结果子图显示

- Power fit 新增 `Show on plot` 复选项，按字段单独控制 P（mW）、A、C、R²、RMSE、n；默认关闭，不改变已有项目的默认画面。
- 仅显示有效拟合结果，按 Amplitude / Linewidth 分组。结果由纯函数 `src/twod/fit-summary.js` 生成，绘图在 `src/plotting/oned.js` 中完成；Canvas、SVG、PDF 使用相同绘图路径。
- 选择保存在 `twoD.settings.scanFitDisplay`。拟合数值仍由既有 `scanCorrelationData` / `fitSaturation` 提供；没有改拟合模型、参数约束或排除点设置。
- 单元测试见 `src/twod/fit-summary.test.js`。复杂子图中的图例重叠、字体和跨阅读器导出仍需浏览器视觉回归。


## 2026-10-30 Variable scan 功率拟合文案精简

- 功率拟合折叠标题改为 `Power fit`；三个复选项改为 `Amplitude`、`Linewidth`、`Offset C`。
- 排除点面板删除长说明段落，摘要改为 `Exclude points · N excluded`；测量范围压缩为 `Measured: min–max mW`，未校准时显示 `Power calibration required`。
- 搜索范围标题改为 `Fit range (mW)`，输入标签改为 `Min` / `Max`；空值仍使用实测功率范围，说明保留在标题提示中，不占用面板空间。
- 仅调整可见文案和提示，不改拟合模型、参数、默认值、排除点行为或计算逻辑。修改位置：`src/twod/ui.js`。

## 2026-10-30 Variable scan 符号居中修正

- 直接二维 Variable scan 的符号选择器此前保留了右侧 7 px 内边距，导致符号视觉中心偏移；常规曲线没有该覆盖规则，因此显示正常。
- 已将 Variable scan 专用样式改为 `padding: 0`、`text-align-last: center`、`text-indent: 0`，不改变控件尺寸、线型选项、颜色按钮或常规曲线样式。
- 修改位置：`src/styles/app.css`。验收应对比普通曲线与 Variable scan 中实线圆点、短横线、空心符号的水平居中状态。

## 2026-10-30 符号样式按钮外观微调

- Current order 右侧的 28 px 符号选择控件保留原生 `select` 的选择行为与键盘访问能力，但隐藏右侧下拉箭头；控件采用与相邻颜色选择器一致的凸起式浅灰底、边框及明暗内阴影，符号仍按曲线颜色着色。
- 普通曲线与直接二维 Variable scan 衍生曲线共用该样式。保留 `focus-visible` 轮廓，避免移除箭头后键盘焦点不可辨认；不改变曲线配置、项目格式和颜色映射。
- 修改位置：`src/styles/app.css`。本次只做 CSS 外观调整，构建与页面回归以本次 Actions 和部署检查为准。

## 2026-10-30 PDF 矢量导出恢复

- 正式 PDF 导出改为复用 `vectorScene` → `svgFromScene`，再由 `svg2pdf.js` 与 `jsPDF` 转换；不再把 Canvas 位图嵌入 PDF。
- PDF 页面尺寸按设计画布 px 值以 96 px/in 换算为 pt；Export DPI 不影响 PDF，仍只作用于 PNG/JPEG 等栅格格式。
- `src/export/pdf.test.js` 检查输入与 SVG 解析错误；Pages 工作流通过 Chromium 对矢量路径、文本对象、字体资源、页面框和无图像 XObject 做浏览器回归。真实复杂图、中文字体嵌入和 Acrobat/Edge/Firefox 阅读器视觉验收仍待完成。
- 依赖版本固定为 `jspdf@4.0.0` 与 `svg2pdf.js@2.8.1`。Pages 工作流先生成并提交与 `package.json` 一致的 lockfile，再执行 `npm ci`。
# SpinPlot 持续开发上下文

更新日期：2026-10-30（Asia/Shanghai）

## 用途与优先级

## 最新状态（2026-10-30：矢量 PDF 导出重构）

- 正式 PDF 由 `svg2pdf.js` + `jsPDF` 将 `vectorScene` 生成的 SVG 转换为 PDF；整页不栅格化，谱线、坐标轴、图例和文字保留矢量对象，PDF 页面尺寸按 Design canvas 计算，不受 Raster DPI 影响。
- 对非 ASCII 字符按需嵌入 Noto Sans SC 字体子集，覆盖 GB2312 常用汉字、希腊字母及常用科学符号；字体资源及 OFL 许可位于 `src/assets/fonts/`。GB2312 以外罕见字符和用户自定义字体仍需专项验证。
- 浏览器回归 [41027349673](https://github.com/imasenHF/spinplot/actions/runs/41027349673) 通过：Chromium 导出 PDF，Poppler 确认中文/希腊字母可提取，PDF 不含整页图像对象；Acrobat、Edge、Firefox 等独立阅读器的人工视觉验收仍需完成。

## 最新状态（2026-10-30：阶段 B 修正、正式合并与 0.10.0 发布）

- PR #1（初版模块化与二维功能）已合并；PR #2 修正阶段 B 的占位语义，已于 2026-10-30 合并至正式 `main`，合并提交 `c438cf43926782342216daee05d7bf5760033c4c`。
- 正式应用版本为 **0.10.0**，GitHub Release [v0.10.0](https://github.com/imasenHF/spinplot/releases/tag/v0.10.0) 已发布。正式 Pages 部署 [41006773145](https://github.com/imasenHF/spinplot/actions/runs/41006773145)、生产 HTTP 检查 [41006826196](https://github.com/imasenHF/spinplot/actions/runs/41006826196) 和发布工作流 [41006841041](https://github.com/imasenHF/spinplot/actions/runs/41006841041) 均成功；Release [v0.10.0](https://github.com/imasenHF/spinplot/releases/tag/v0.10.0) 已发布。
- 阶段 B 的正确语义为：无投影子图可选择占用同行的上投影预留区、同列的右投影预留区或两者。字段为 `emptyProjectionSpace = none / top / right / both`；可见投影、色标、标题、g 轴和图例的自然边距保持独立。默认 `none`。
- 独立预览快照已同步为 0.10.0；Pages [41005533960](https://github.com/imasenHF/imasenhf.github.io/actions/runs/41005533960)、公开 HTTP [41005667562](https://github.com/imasenHF/spinplot/actions/runs/41005667562)、公开 Chromium [41005667590](https://github.com/imasenHF/spinplot/actions/runs/41005667590) 均成功；完整回归 [41005667591](https://github.com/imasenHF/spinplot/actions/runs/41005667591) 成功。
- 项目文件格式 11、配置格式 10 未变；旧 `plotFootprint` 在配置载入时移除。真实多组分 EPR 谱线峰峰线宽判读、仪器校准和功率饱和拟合参数不确定度仍需独立科学验证。
- 正式基线为 `main`；`preview/modularization-phase-b-empty-projection-20261030` 与 `preview/modularization-phase1-20261009` 保留为开发历史。后续功能从最新 `main` 创建独立预览分支，完成测试后再合并。


本文是 SpinPlot 持续开发的远程交接记录，用于跨会话保存已确认决定、当前任务、实现位置、验收标准和发布边界，避免仅依赖对话历史推断项目状态。

本文不是代码状态的替代品。每次任务开始时，当前 GitHub 分支、最新 HEAD、文件内容、测试结果和用户最新要求优先于本文。本文中的 SHA、CI 结果均为记录时的基线，继续工作前必须重新查询，不得直接当作当前状态。

## 每次开发任务开始前必须执行

每次开始或恢复 SpinPlot 的开发、修复、提交、预览或发布任务前，必须完成以下步骤：

1. 按 plastocyanin 项目规则，先读取主站仓库 `imasenHF/imasenhf.github.io` 的最新 `main` 分支 `SITE_CONTEXT.md` 和 `PROJECT_INDEX.md`。
2. 读取 SpinPlot 当前目标分支的 `PROJECT_CONTEXT.md`、`README.md`、本文，以及与任务相关的 `docs/ARCHITECTURE.md`、`docs/TWO_DIMENSIONAL.md`、`docs/MODULARIZATION_PREVIEW.md`、`docs/STYLE_GUIDE.md` 和 `CHANGELOG.md`；涉及架构整理时同时读取 `docs/ARCHITECTURE_IMPROVEMENT_PLAN.md`。
3. 从 GitHub 重新确认目标分支、HEAD SHA、PR 状态、最近 Actions 结果；重新读取本次要修改的源码和测试文件。不得根据旧对话中的 SHA 或状态直接写入。
4. 若使用本地检出，先检查当前分支和 `git status --short`，保留任何已有未提交修改。若仅使用 GitHub API，写入前必须重新获取目标文件的完整正文和最新 blob SHA。
5. 仅做有明确边界的修改。文件内容较长时，可按行段或 blob 读取定位；不得用被截断的展示内容覆盖完整源码，不得为小功能重写无关模块。
6. 分开报告代码修改、单元测试、生产构建、远程 CI、预览快照同步、公开 URL 浏览器验收和正式发布状态。一个阶段通过不能替代其他阶段。
7. 实际代码或有效决定发生变化后，更新本文及相关正式记录。只更新本文件不代表代码功能已经实现；未运行的测试、未完成的部署不得描述为已完成。
8. 正式合并与发布按用户明确授权执行；本次 PR #1 已按阶段 B 验收条件合并。后续独立功能仍须遵循用户当前授权范围。

## 仓库与发布边界

- 正式应用底部状态栏的版权/联系信息后方提供低强调度 `dev` 入口，链接至独立预览 `https://plastocyanin.org/previews/spinplot-modularization/`；正式应用入口和默认启动路径保持不变。

- 仓库：`imasenHF/spinplot`。
- 正式基线：`main`；已合并的修正分支 `preview/modularization-phase-b-empty-projection-20261030` 和旧模块化分支 `preview/modularization-phase1-20261009` 保留作历史记录。
- 正式入口：<https://plastocyanin.org/spinplot/>，由仓库 `main` 的正式发布流程管理。
- 临时预览入口：<https://plastocyanin.org/previews/spinplot-modularization/>，由主站仓库中单独保存的静态构建快照提供。预览页面标题及版本号使用 `0.10.0-dev` 标记；页头 SpinPlot 品牌链接指向正式应用 <https://plastocyanin.org/spinplot/>。
- PR #1：<https://github.com/imasenHF/spinplot/pull/1>，已于 2026-10-30 合并至 `main`；合并提交 `163a539c59964271f75055663c82db2974785478`。
- 正式 `main` 应用版本为 `0.10.0`，发布标签 `v0.10.0`。项目文件格式为 11，配置格式为 10；`emptyProjectionSpace` 为可选子图字段，不改变文件格式。修改格式字段前必须回归旧项目 9/10/11 与配置格式 10。
- 预览分支 Actions 生成的构建产物不会自动替换主站仓库里的预览快照。必须单独检查快照同步提交、主站 Pages 发布结果和公开 URL；不可将分支 CI 成功等同于线上页面已更新。
- 公开预览禁止使用客户数据、内部文件或其他未经授权的材料。

## 当前功能：Variable scan 衍生曲线拖拽 Z-order（2026-10-30）

- **操作定义：** 对直接二维源数据创建的 Variable scan，`Current data` 中缩进的峰峰幅度、峰峰线宽、Statistic、拟合曲线及排除点系列支持鼠标拖拽排序。列表从上到下对应**从后到前**的绘制次序；下方曲线最后绘制，覆盖上方曲线。原始二维矩阵数据行固定，不参与派生图层排序，源数据、数值提取与拟合参数不变。支持焦点在派生曲线行时以 Alt+↑/↓ 调整次序。
- **单一数据来源：** `src/twod/scan-order.js` 维护稳定的派生曲线虚拟 ID（−100 至 −106），归一化旧项目缺失的排序信息、忽略非法/重复 ID，并计算有效顺序。`src/twod/ui.js` 在当前数据行上绑定拖拽与键盘事件，同时移动左侧名称和右侧样式控件。排除点显示切换时继续使用已保存的相对顺序。`src/main.js` 在渲染前按相同顺序排序 `derivedTwoDPlotModel` 的派生曲线，Canvas 绘制、图例、PNG/SVG/PDF 等导出均使用排序后的曲线序列，而不仅仅改变左侧列表文本。
- **保存与兼容：** 用户第一次调整时在子图配置中写入 `scanDerivedOrder`（稳定负 ID 数组），随既有项目/配置 v11/v10 保存、恢复及撤销/重做，不增加版本号。旧项目没有该字段时使用原有默认顺序，隐藏/禁用的派生曲线排序位置不会因切换特征、拟合开关或排除点而丢失。手动 1D 曲线组合的原有 `sp.curves` 顺序行为不受影响。
- **验收：** 新增 `src/twod/scan-order.test.js`，覆盖默认次序、前后绘制顺序、隐含系列身份、非法排序与源矩阵固定；浏览器回归新增鼠标拖放、Z-order 对应的 SVG 序列、右侧 Style 同步、项目保存重载及 Alt+Arrow 键盘调整。完整 CI/浏览器/旧项目与导出对照 [40929024040](https://github.com/imasenHF/spinplot/actions/runs/40929024040) 成功。独立预览 HTML/JS/CSS 已提交主站 `742ef456`，Pages [40929364489](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40929364489) 成功，公开 URL Chromium 验收 [40929024041](https://github.com/imasenHF/spinplot/actions/runs/40929024041) 在发布后重跑成功。当时正式 `main`、正式站点和阶段 B 画幅控制未改（历史记录）。

## 当前 UI 调整：七项界面与 Linear 刻度修复（2026-10-30）

- **原始二维 Heatmap/Contour/3D 数据列表：** `src/twod/ui.js` 将没有可绘制的源曲线线型的直接二维数据列表标记为 `matrix-no-style`，Current data 占满单列，隐藏空白 Style 列；普通二维模式不再暴露无关的 `Scan style`。保留原始矩阵及其相关数据记录不变。
- **Variable scan 衍生曲线样式：** 样式列恢复为与普通一维曲线一致的 **34 px 符号式下拉**（━、┄、○、●、━● 等）。复用已有 `scanCurveStyle` 下拉中的完整图形选项，而不是显示长文本；左侧名称与右侧样式固定 24 px 行高、均保留 2 px 内边距、相同滚动窗口高度，排除点增删后重新计算高度并同步条目。各衍生曲线样式仍保存在 `curveStyles`，项目重载后恢复。手动 1D 曲线生成的旧扫描视图继续保留其 Scan style 控件，避免破坏原操作路径。
- **拟合面板：** 切换到 `scanAxisMode='native'` 时自动折叠 `Power saturation fitting`；切回已启用拟合的 `power` 模式时自动展开，但用户仍可手动打开查看说明。native dB 等非校准扫描坐标不再被错误标记为测得的 mW 功率范围，改为明确要求选择功率扫描。原 `scanFitAmplitude`、`scanFitLinewidth` 等开关不因此被清空。
- **控件外观：** `Exclude points from fit` 改用现有嵌套 `advanced-layout` 折叠栏风格，去除额外方框。MathML 中函数参数括号明确 `stretchy="false"`，缩小公式默认字号；不修改数学表达式和拟合算法。
- **轴格式：** 当 Y、Top/Right 投影强度轴或 Z 色标处于 `linear` 模式时，刻度使用十进制格式，不再从全局 Auto/Scientific 偏好或 `Number.toPrecision()` 的自动指数形式隐式切换为科学计数法。用户显式选择 `scientific` 仍显示科学计数法；Log10/SymLog 保持原数值映射与标签规则。普通 X 轴尚无该三模式设置，其原有手动 Tick notation 行为保持不变。
- **代码位置：** `src/twod/ui.js`、`src/styles/app.css`、`src/plotting/oned.js`、`scripts/preview-browser-smoke.mjs`。浏览器回归增加热图单列宽度、扫描符号字形和 34 px 列宽、两列可视对齐、非功率模式折叠、原始 dB 不误标 mW、MathML 括号及 Linear 大数值十进制渲染检查。完整数值/构建/Chromium/迁移对照 [40923593424](https://github.com/imasenHF/spinplot/actions/runs/40923593424) 已通过；独立静态预览 JS/CSS/HTML 在主站提交 `352cf641`，Pages [40924052918](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40924052918) 成功。公开预览页面 Chromium [40923593239](https://github.com/imasenHF/spinplot/actions/runs/40923593239) 在 Pages 发布后重跑成功，已独立完成线上浏览器验收。
- **发布边界：** 七项 UI 修复、Linear 刻度修复、Z-order 和阶段 B 空投影空间占位均已合并正式 `main`；正式 0.10.0 部署见 Actions `41005910687`，Release 为 `v0.10.0`。

## 历史预览交付与验收（2026-10-29）

- **绘图模式：** Heatmap、Contour（物理坐标 marching squares）和可旋转的三角网格/WebGL 3D surface 位于独立预览分支，3D 视角默认折叠，支持鼠标旋转、方位角、俯仰角、Z 拉伸及缩放。
- **坐标与色标：** 主图 Y、二维 Z 以及 Top/Right 投影强度轴以三个平行选项呈现：`linear` / `log` / `scientific`。纯正值在 `log` 下采用 Log10，跨零或含负值数据采用保留正负号和零点的对称对数（SymLog），连续且不人为平移；`scientific` 只改变刻度表达，不改变线性映射。Log 与 Scientific 模式切换均对对应可用数据拟合并回填数值 min/max，原始数据保持不变。
- **Auto Z：** `TwoD.autoZBounds(d,s)` 以当前可见 X/Y 数据范围内的有效 Z 为依据。Auto Z 按钮及色标双击都将数值写回子图 `zMin/zMax`、禁用继承；热图主体双击复原 X/Y 不抹除已经拟合的 Z。轮滚色标仍可缩放 Z。
- **基线边界：** 本轮不新增、修改或设定默认的二维基线扣除。已有一维 Region/其他基线方式及原始二维数据与投影统计保持不变，Auto Z 不是基线校正。
- **界面：** Current order 左列和独立 34 px 符号列并排，标题简短，必要说明使用问号图标；模式及已计算范围随项目保存/恢复。
- **测试与发布：** 源代码数值、项目兼容、生产构建、Chromium 和旧版对照通过 [40745286984](https://github.com/imasenHF/spinplot/actions/runs/40745286984)。构建 HTML、JS 及现有 CSS 已同步主站隔离预览，Pages 部署 [40745691624](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40745691624) 成功。公开预览的最新三模式浏览器检查待最新 Actions 结果确认。当时正式 `main` 与 `/spinplot/` 不修改、Draft PR #1 未合并；该历史状态已于 2026-10-30 被 PR #1 合并取代。

## 最近一次已核查的基线

以下状态已在 2026-10-22 重新核对：

- 代码实现提交：[`a47f9cc`](https://github.com/imasenHF/spinplot/commit/a47f9ccbfcda2dff1b054ff38687b8cdf55c80b4)，只修改 `src/main.js` 的 colorbar 双击交互。
- 浏览器回归扩展：`scripts/preview-browser-smoke.mjs` 检查色标滚轮缩放、色标双击 Auto Z 复原，以及热图主体双击恢复 X/Y；`scripts/preview-regression.mjs` 仅对当前版本启用新增交互测试，避免要求迁移前基线具备新功能。
- 代码回归与构建：[`39684319918`](https://github.com/imasenHF/spinplot/actions/runs/39684319918) 成功，包含现有数值/CSV/项目兼容/二维测试、TypeScript 检查、Vite 生产构建、Chromium 交互测试及与迁移前导出结果对照。
- 公开预览浏览器检查配置提交：[`1b3e328`](https://github.com/imasenHF/spinplot/commit/1b3e328af054c9ef79818193e902ca78c1a3fe41)，为已发布临时快照启用 colorbar 双击测试；模块化预览工作流 `39684871649` 成功。该 SHA 仅用于追溯配置变更，不代表当前 HEAD；每次任务开始时重新查询最新分支状态。
- 主站临时快照已更新：主站仓库提交 [`0f238ea`](https://github.com/imasenHF/imasenhf.github.io/commit/0f238ea62a1be5a8bcb4fd30c4665cb8a087e465)，新应用脚本为 `assets/index-DAzGls40.js`。主站 Pages 发布 [`39684696016`](https://github.com/imasenHF/imasenhf.github.io/actions/runs/39684696016) 成功；更新后的公开 HTTP 检查 [`39684871606`](https://github.com/imasenHF/spinplot/actions/runs/39684871606) 和公开 Chromium 浏览器测试 [`39684871564`](https://github.com/imasenHF/spinplot/actions/runs/39684871564) 均成功。
- 当时正式 `main` 与 `/spinplot/` 未修改；该预览分支后来通过 PR #1 合并，阶段 B 修正再通过 PR #2 合并。


## 频率校正 Target 模式修复

- 新建子图继续默认使用 `freqMode: local`、`localFreqMode: mean`。
- 用户切换全局频率模式或修改全局目标频率时，未显式编辑过局部频率设置的 1D 子图切换为继承全局设置；已显式选择 Local/None 或修改 Local target 的子图保留局部覆盖。
- 修改子图的 Local target mode、Local target / GHz 或本地频率确认项，会自动启用 Local alignment，避免目标值已编辑但模式仍处于 Inherit global 的情况。
- 频率表中的 `ν raw / GHz` 对一维磁场曲线开放编辑。CSV 等缺少源频率元数据的数据，必须先填写源微波频率；缺少源频率时缩放栏显示 `—`，不会伪装成已完成校正。
- 验收已通过：预览分支数值/二维测试、Vite 构建、Chromium 频率校正与迁移前输出对照，以及公开预览频率/二维交互测试均通过；具体 Actions 记录见 `docs/MODULARIZATION_PREVIEW.md`。

## Z scale 恒定信号范围修正（2026-10-29）

- 修复提交：`f77ab589`，文件 `src/twod/zscale.js`。恒定信号的显示范围扩展使用独立的 `displayMin/displayMax`，实测极值保存在 `dataMin/dataMax`；正值 5 的显示范围仍为 0.5–50，负值 -5 的显示范围仍为 -5.5–-4.5，原始极值分别保持 5/5 和 -5/-5；恒定零值仍显示 -1–1。
- 新增 `src/twod/zscale.test.js`，覆盖线性、Log10、跨零 SymLog、可见 X/Y 区域、非有限值、恒定正/负/零信号、非法边界、Scientific 线性映射、刻度和缩放。预览工作流新增该测试步骤。
- 本次修复只改变返回的原始数据极值元信息，不改变恒定信号的色标显示范围、原始矩阵或项目格式。
- CI 运行：[40831466219](https://github.com/imasenHF/spinplot/actions/runs/40831466219) 成功：13 项 Z-scale 测试、现有二维与其他回归、生产构建、Chromium 浏览器回归及 23 个数据文件/13 个图形文件的迁移前对照均通过。构建产物已同步到主站独立预览路径；主站 Pages 运行 [40831743715](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40831743715) 成功。未修改正式 `main` 或 `/spinplot/`，PR #1 继续保持 Draft。

## Auto Z 当前功能与维护约束

`Auto Z`、色标双击均基于 `TwoD.autoZBounds()` 计算当前可见 Z 数据范围，写入数值 `zMin`、`zMax` 并保持 `zUseGlobal=false`。该模式不再使用旧版的“清空 min/max”恢复机制。双击热图主体仅重置 X/Y，保留独立 Z。测试需要断言实际数值，不能继续以空字符串作为“自动范围”的期望值。二维基线不在此流程中执行，不能自动减全矩阵均值。

## 阶段 B：空投影空间占位（已合并正式版，2026-10-30）

### 用户目标

混合布局中，含上投影或右投影的子图会让同一行/列其他子图共享相应的附属边距。没有对应投影的子图因此留下空白。用户希望无投影子图可选择性占用这些共享空白，使绘图区向上、向右或同时扩展。

### 交互定义

- `emptyProjectionSpace = none`：保留共享预留空间，默认值，维持既有对齐方式。
- `top`：若当前子图没有上投影，则使用同行共享上边距与自身自然上边距之间的差额。
- `right`：若当前子图没有右投影，则使用同列共享右边距与自身自然右边距之间的差额。
- `both`：同时尝试占用上方和右侧的未使用空间。
- 若当前子图显示相应投影，该方向的空间始终保留；此设置不得关闭或禁用投影控件。
- 自然边距继续保留该子图自身的标题、g 轴、色标、图例等空间。右侧占位只减少投影共享的额外边距，不侵占色标。
- 控件对 1D、2D、Variable scan 子图均可见；每个子图独立保存设置。

### 实现位置

- `src/plotting/footprint.js`：`normalizeEmptyProjectionSpace()`、`emptyProjectionSpaceFlags()` 与 `resolveMainInsets()`；根据自然边距、共享边距和实际投影状态计算最终主绘图区边距。
- `src/plotting/oned.js`：构建布局条目时保留二维原始投影设置，不再调用旧 `applyPlotFootprint()`；按子图的 `emptyProjectionSpace` 解析共享边距。
- `src/twod/ui.js`：`plotInsets()` 返回上/右投影实际显示标记，供布局算法判定可占用方向。
- `src/main.js`：Advanced layout 提供四种占位方式；默认 `none`。载入旧项目时删除旧 `plotFootprint` 字段并初始化新字段；投影可见性继续由 `showProjections / showXProjection / showYProjection` 独立控制。
- 项目格式 11、配置格式 10 不变；`emptyProjectionSpace` 是可选子图字段。旧项目缺失时默认 `none`。

### 验收标准

1. 2×2 混合布局：上投影位于目标子图同行，右投影位于目标子图同列；目标无投影 1D 子图切换 `none / top / right / both` 时，主绘图区分别保持原位、仅向上扩展、仅向右扩展、两个方向均扩展。
2. 对应投影在目标子图自身可见时，设置不覆盖该投影；投影控件不被禁用。
3. 右侧占位保留本子图的色标、g 轴与标题边距；上方占位保留标题、g 轴和图例所需边距。
4. 设置对 1D、2D、Variable scan 均可操作，项目保存/载入后逐子图恢复；旧项目 9/10/11 和配置格式 10 仍可读取。
5. 屏幕绘图与 SVG/PDF 共用矢量场景，PNG 等栅格输出使用同一 renderer 的 Canvas 路径；原始数据、投影计算、扫描统计和物理量不发生变化。
6. 单元测试、生产构建、旧版导出对照、Chromium 交互、屏幕几何、SVG 导出及公开预览 HTTP/浏览器检查均已通过；PR #2 已按用户要求合并。


## 当前任务 B：二维扫描变量分析、Overlap 与 CW EPR 功率饱和拟合

## 已合并功能历史记录：峰峰线宽、Variable scan 和功率拟合（2026-10-29）

- **历史状态（2026-10-29）。** 当时 `preview/modularization-phase1-20261009` 的 Draft PR #1 尚未合并；该状态已于 2026-10-30 被 PR #1 合并取代。此节只记录后续合并的功能历史，不作为当前分支状态。
- **投影。** `src/twod/core.js` 中，右侧 `yMode='linewidth'` 与 `yMode='both'` 对每一条 Y 扫描值对应的完整 X 轴谱分别求正负极值横坐标差，返回同 X 轴物理单位的峰峰线宽；Both 时同时返回峰峰幅度及线宽，以不同水平刻度显示在右侧投影中。旧 Mean/Max/Min/PTP/RMS/Sum 不变。顶部聚合投影仍可根据其生成的谱线显示标量峰峰值或线宽读数。以前沿右侧聚合曲线对 Y 轴求极值间距得到 dB 的标量读数已从界面移除；这与逐谱提取 G 单位线宽是两种不同操作。导出右投影 Both 模式时附加线宽及单位列。
- **Variable scan 单一 Measurement。** 将原 Statistic 下拉与 Signal feature 合并为一个下拉，包含 Mean、Maximum、Minimum、RMS、Sum、峰峰幅度、峰峰线宽及二者组合。保留 `scanFeatureMode/scanStatistic` 旧配置字段，旧 `Statistic / ptp` 保存文件在用户主动启用饱和拟合前保持原数值语义。新 UI 仅增加衍生 `scanMeasurement` 状态，不修改源数据。
- **拟合交互。** `src/twod/ui.js` 使用静态 MathML 组件展示两个模型及只读参数字段（P、A、C、RMSE、R²，未拟合的 C 显示 fixed）。求解器维持有界对数搜索+局部细化与给定特征功率的线性最小二乘；说明移至可悬停/focus 的问号帮助。测得功率范围明确显示，未手动设边界时，`src/twod/saturation.js` 默认使用已纳入拟合的有效点 `[Pmin,Pmax]`（不再扩张 100 倍）；边界输入框显示当前自动范围为占位值，支持手动放宽并保留越界/边界告警。
- **排除测量点。** 原 0-based 索引文本输入换为 `Exclude points from fit` 折叠点表，逐项显示轨迹编号、原始扫描变量及实际功率，以勾选决定是否纳入拟合。保留 `scanFitExcluded` 项目兼容字段。被排除的实测值不删除，Variable scan 中独立显示为菱形符号，并在特征 CSV 中记录拟合纳入状态。勾选/取消时直接更新当前派生曲线样式列表。
- **衍生曲线与默认样式。** 直接二维扫描的 Current data 恢复左右两列：左侧为源矩阵及缩进的派生信号/线宽/拟合/排除点条目，右侧一一对应独立 Style 下拉；重复的 Scan style 控件隐藏。旧手动多条一维曲线组成的 Variable scan 保留既有 Scan style 控件，以免失去操作入口。默认实测点使用线+符号，拟合使用虚线；默认图例移到绘图区上方。每条样式随项目恢复；原始 `rawCurves` 不改动。阶段 B 空投影空间占位不属于本节功能；其当前实现与验收要求见上文“阶段 B 修正”。
- **测试。** 合成 `src/twod/projection-linewidth.test.js`、`src/twod/saturation.test.js`、既有数值/旧项目及 Chromium 浏览器测试均纳入工作流；浏览器增加右侧双曲线 CSV、拟合公式、排除点交互与纳入状态、曲线样式保存恢复。完整回归 [40912092209](https://github.com/imasenHF/spinplot/actions/runs/40912092209) 已通过。公开自动化验收只包含合成数据；真实仪器数据的独立科学验收尚未完成。
- **未完成项。** 真正复杂多组分谱的峰识别、真实仪器校准及拟合不确定度/协方差仍待科学验收。不得把已通过的构建与合成数据回归等同于这些验收。

### 已确认的交互要求（2026-10-23）

- 二维导入默认只创建原有 Heatmap 子图，不自动生成扫描关联图。
- Variable scan 必须是显式新增的独立子图，入口位于二维子图的 Plot mode 菜单，与 Heatmap、Stack、Overlap 并列。创建后保留源二维图和原有顶部/右侧 Y 投影，不用扫描图替换任何投影。
- 新扫描子图初始放在源二维图右侧；复杂布局无法直接插入时追加为新行。创建后复用现有子图的位置、尺寸、排序、项目保存和导出操作。
- 扫描子图以扫描变量为 X 轴、选定 Y 投影统计量为 Y 轴。统计量包括 mean、max、min、peak-to-peak、RMS、sum；这些样本点统计不是按非等距坐标加权的积分，RMS 不保留符号。
- 2D Overlap 将各扫描轨迹绘制在共同 X 坐标轴上，轨迹标签显示扫描变量及其单位；每隔 N 条轨迹的设置控制显示抽样。原始二维矩阵不受显示偏移影响。
- 对 dB 衰减轴，功率扫描只要求零衰减参考功率 P₀，按 P(A) = P₀ × 10^(-A/10) 换算为 mW。界面不再要求输入 A₀；旧项目保存的 (P_ref, A_ref) 会迁移为等效 P₀ = P_ref × 10^(A_ref/10)。
- 对手动选入同一子图的两条及以上 1D 曲线，提供与导入二维数据一致的 Heatmap 和 Variable scan 操作。扫描变量默认名为 `Subplot index`、单位留空、数值从 1 开始按步长 1 等间距生成；可编辑变量名和单位，选择等间距（Start/Step）或手动数组。数组按当前曲线顺序逐一对应，热图行仍按数值排序，变量值按曲线 ID 保存，避免重排后错配。变量单位为空时坐标标题不显示单位括号。
- 峰峰幅度与峰峰线宽饱和拟合已经在隔离预览分支实现。模型、边界、诊断及验收限制以本文件上方“当前预览”节和 `docs/TWO_DIMENSIONAL.md` 为准；现已于 2026-10-30 合并正式 `main`。

### 当前实施与验收状态（2026-10-24）

- Variable scan 独立投影设置修正（2026-10-23）：扫描曲线使用 `scanStatistic`、`scanStatisticMin`、`scanStatisticMax` 独立保存统计方式与 X 坐标统计区间，计算复用右侧投影的样本归约函数。创建时在坐标方向一致的条件下，以源图 `yMode` 和 `projectionXMin/Max` 初始化，之后与源图设置独立；扫描视图隐藏 Top/Right projection 控件，只显示扫描轴、统计方式、统计区间和必要的功率换算。实现位于 `src/main.js` 的 `addVariableScanSubplot()` 及 `src/twod/ui.js`；后续标题与配色修正及公开预览状态见下方最新记录。
- 变量扫描与投影排版修正（2026-10-24）：新增 Variable scan 子图默认标题为空；顶部和右侧投影标题使用 Style → Typography 的独立 `projectionTitleSize` 设置（默认 11 px），不再跟随刻度标签字号；右侧标题宽度超过绘图区时，自动拆分为变量名和 `projection (统计方式)` 两行，并按可用宽度缩小字号。连续色带配色仅有一条曲线时使用色带起始颜色，避免 BWR 等色带的中点浅色导致曲线近乎不可见。新增二维渲染回归；发布状态以本次提交和 Actions 结果为准。
- 上一轮自动化运行 39951954898 全部通过：数值、CSV/插值、一维处理、项目版本兼容、现有二维回归、显示/坐标/导出测试、生产构建、Chromium 浏览器回归与迁移前对照均成功。浏览器测试验证扫描子图创建、源 Heatmap 保留、右侧布局、项目保存的布局信息及包含 Variable scan / Overlap 的 SVG 导出。
- 静态预览构建提交 d1e478f 已同步到主站，主站提交 3e50725 更新预览快照与资源检查页；Pages 发布运行 39953758517 成功，公开浏览器检查运行 39951955041 的第二次尝试通过。第一次公开检查使用旧快照，部署新资源后重跑通过。
- 用户此前上传的 exp(1).zip 计划用于 CIQTEK Field–Power、Field–Delay、Field–Modulation Amplitude、Time–Field 等二维样本检查；当前对话附件与可检索 Library 中仍未找到该 ZIP。真实仪器样本的坐标、单位、信号分量和项目保存验收仍待重新取得文件后执行。不得声称真实样本验收通过，也不得将样本复制到公开仓库。
- 本轮代码已通过 PR #1 合并至正式 main；正式 /spinplot/ Pages 部署于 2026-10-30 完成。预览分支保留供后续试验。主站临时快照不会随预览分支自动同步。



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
- `scripts/preview-browser-smoke.mjs` 已新增专门的 SVG 浏览器断言：在 `SPINPLOT_TEST_PROJECTION_TITLE_SIZE=1` 时将投影标题字号设为 23 px、刻度字号设为 9 px，检查导出 SVG 中投影标题采用 23 px 且刻度仍使用 9 px。该测试只由模块化预览回归显式启用，避免对仍运行旧版静态快照的公开预览检查造成误报。最新完整工作流 [40060098623](https://github.com/imasenHF/spinplot/actions/runs/40060098623) 已通过，包含该项投影标题字号与刻度字号独立性断言。当时正式 `main` 和 `/spinplot/` 未修改，Draft PR #1 未合并；此后 PR #1 已于 2026-10-30 合并。


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
- 完整数值、构建、Chromium 回归与迁移前对照通过 [Actions 40695773639](https://github.com/imasenHF/spinplot/actions/runs/40695773639)；新版静态预览已同步主站，Pages 部署通过 [40696290984](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40696290984)，公开预览浏览器回归在部署后复测通过 [40696141839（第 2 次运行）](https://github.com/imasenHF/spinplot/actions/runs/40696141839)。当时正式 SpinPlot `main`、`/spinplot/` 和 Draft PR #1 均未变化；PR #1 后续已于 2026-10-30 合并。

## 最新验收记录（2026-10-27）

- 手动曲线派生图的 Plot mode 仅显示 Stack、Heatmap、Overlap、Variable scan 四项；扫描变量面板位于 Plot mode 分组内并默认折叠；Heatmap 默认显示扫描变量名称作为 Y 轴标题。
- 修复自定义扫描变量变化后 Y 轴范围仍保留旧值的问题。修改等间距起始值/步长或自定义数组时，Heatmap 的 Y 轴范围与 Y 投影范围同步更新为当前扫描值的最小值和最大值；变量仍按源曲线 ID 保存，曲线重排后对应关系不变。
- 切换到 Heatmap 时，折叠 2D 坐标/投影设置面板；从选中 1D 曲线转换为 Heatmap 时也默认保持折叠，避免切换视图后自动展开轴选项。
- 完整 Chromium 回归与迁移前对照在提交 `ac6551faf400cf2bb15d6ca75b36a779f590897c` 通过 [40531478449](https://github.com/imasenHF/spinplot/actions/runs/40531478449)。新增回归将扫描值从 `1, 2, 3` 改为非均匀的 `2, 30, 6`，检查子图 Y 轴范围为 2–30、投影 CSV 数值和曲线映射，以及保存/重载结果。
- 2026-10-28 增加切换 Heatmap 后投影轴选项保持折叠的处理，并为 1D 曲线转换延迟重绘，避免模式选择事件误触新出现的折叠面板。完整 Chromium 回归及迁移前对照通过 [40626095521](https://github.com/imasenHF/spinplot/actions/runs/40626095521)。静态资源已同步至主站独立预览目录，Pages 部署状态以 [40626290185](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40626290185) 为准。正式 SpinPlot `main` 与 `/spinplot/` 不得修改或合并。
- 2026-10-28 曲线样式设置已合并为单一下拉菜单，提供实线、虚线、点线、空心/实心圆形、方形、三角形、菱形及线条+符号组合。新增子图线宽覆盖（留空继承全局设置）、符号大小和 Variable scan 独立曲线样式；旧项目的 mode/symbol 字段继续兼容，未配置样式的曲线默认实线。Canvas 与 SVG 均按曲线颜色填充实心符号。单元测试、生产构建、完整 Chromium 回归与迁移前对照通过 [40668486468](https://github.com/imasenHF/spinplot/actions/runs/40668486468)。主站独立预览资源已同步并部署成功 [40668931440](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40668931440)，公开预览浏览器回归通过 [40669120554](https://github.com/imasenHF/spinplot/actions/runs/40669120554)。当时正式 SpinPlot `main` 与 `/spinplot/` 保持不变，Draft PR #1 未合并；该状态已于 2026-10-30 结束。
