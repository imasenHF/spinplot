# SpinPlot — PROJECT_CONTEXT

更新日期：2026-10-31（Asia/Shanghai）
状态来源：`main` 分支用于正式功能基线；预览分支的当前状态、活动任务及每次开发前的检查要求见 [持续开发上下文](docs/DEVELOPMENT_CONTEXT.md)。架构维护现状、分阶段优化顺序和验收要求见 [架构优化规划](docs/ARCHITECTURE_IMPROVEMENT_PLAN.md)。实现状态以每次重新核查的远程代码、测试与 CI 结果为准。

## 1. 定位与发布

- **Legend 控件（PR #6 已合并 main）：** Style → Legend 增加 Global position（九宫格及 Outside top/right，默认 Upper right），Subplots → Legend & labels 在 Variable scan 中重新可见且默认展开；支持 Legend/Direct/Both/None、局部位置继承或覆盖，曲线绘图、SVG/PDF 导出和项目保存共用有效位置。旧配置未包含全局位置且使用默认 Upper right 时迁移为继承；其他局部位置保留。普通 Heatmap/Contour/3D 继续使用色标，不显示无意义的曲线 legend。


- Current order 的逐曲线样式列宽 56 px，包含无箭头、凸起式曲线颜色化符号按钮和独立颜色选择器；Variable scan 符号控件使用 `text-align-last: center` 与零内边距保证居中。普通曲线与直接二维 Variable scan 衍生曲线均可单独设置样式和颜色；颜色覆盖保存在子图 `curveStyles[index].color`，未显式设置的曲线沿用当前调色板，并参与图例、屏幕绘图及矢量导出。全局或子图局部调色板变化后，Current order 及 Variable scan 衍生曲线的符号颜色和颜色按钮即时刷新；手动颜色覆盖保持有效。
- Variable scan Power fit 使用单个 `Show results on plot` 开关（默认关闭），同时显示模型公式及 Psat/P½、A、C、R²、RMSE、No. of points。可选九宫格或自定义 X/Y 百分比位置、字体（继承绘图字体或独立选择）及 8–24 px 字号，默认右下角、继承绘图字体、12 px。设置保存在 `twoD.settings.scanFitShow/scanFitLabelPosition/scanFitLabelSize`，旧版逐项显示设置在加载时转换为总开关。Amplitude 与 Linewidth 分组，只有有效拟合显示数值；图形导出共用绘图路径。幅度拟合优化参数显示为 `Psat`，即当前模型的峰值功率；另计算上升段基线扣除后的半峰值功率 `P½=(2−√3)²Psat`。线宽拟合具有独立 `Psat`。参与点数标为 `No. of points`，排除点不计入。图内拟合结果默认右下角、背景完全透明且无边框，可调九宫格或自定义位置、字体、字号、背景不透明度和边框；曲线 legend 默认留在绘图区内。
- Variable scan 功率拟合面板采用简短标签：Power fit、Amplitude、Linewidth、Offset C、Fit range；测量功率范围保留为单行数据读数，排除点说明段落已删除，Fit range 的空值规则通过控件提示说明。

- Export 页按钮采用紧凑两列布局；图形/CSV 操作按钮最小高度 44 px，行列间距统一。投影与 Variable scan 导出选择器独立成组，按钮不再随选择器标签换行而纵向拉伸。

SpinPlot 是浏览器内运行的电子顺磁共振（EPR）谱图读取、处理、排版与导出工具，当前以连续波（CW）一维谱和二维实验数据为主要对象，同时具有部分瞬态（Transient EPR）二维数据读取能力。供科研数据整理与制图使用；未建立在线账户或谱图上传后端。

- 公开作者：hyphoon；联系：wuhaifeng@ustc.edu.cn。
- 代码：https://github.com/imasenHF/spinplot
- 应用：https://plastocyanin.org/spinplot/
- 构建：Vite、JavaScript（含部分独立模块）、TypeScript 检查；`package.json` 中包含 React 依赖，但主体界面尚未改造成 React 应用。
- 发布：`main` 触发 GitHub Actions，产物为 `dist/`，部署路径为 `/spinplot/`；不单独声明 `CNAME`。
- 正式 `main` 当前版本：**0.10.0**，已发布标签 [`v0.10.0`](https://github.com/imasenHF/spinplot/releases/tag/v0.10.0)。应用版本以 `package.json` 为准；项目格式 11、配置格式 10 独立管理。
- 项目文件格式：**11**；配置文件格式：**10**；两者均与应用版本号相互独立。

## 2. 已实现功能范围

### 文件读取与数据组织

- 在同一入口读取 CSV、CIQTEK `.epr` 与 BES3T `.DSC/.DTA`，后者可配合 `.XGF/.YGF` 轴文件；实际兼容范围受实验类型、数据维数、格式字段与文件完整性限制。
- CIQTEK 已识别 CW 一维 Field/Time Sweep、CW 二维 Field-Power、Field-Delay、Field-Modulation Amplitude、Time-Field Sweep，以及 Transient 二维 Tr-EPR。未识别实验类型会显式报错。
- BES3T 解析检查维数、坐标、数据长度、字节序与复数通道；二维矩阵在 `src/twod/core.js` 中处理，详细边界参见 [TWO_DIMENSIONAL.md](docs/TWO_DIMENSIONAL.md)。
- 新导入数据可追加为子图，支持混排一维曲线和二维图；可清空当前数据或仅恢复默认配置。原始数据与显示设置分开保存。

### 一维处理与绘图

- 设置全局/子图微波频率，按确认的频率执行磁场轴对齐；新子图默认采用 Local mean。改变全局频率模式时，未显式设置局部频率覆盖的子图继承全局设置；局部覆盖保持有效。CSV 等缺少源频率元数据的一维磁场曲线，可在频率表填写源微波频率。可绘制 `g` 轴；未确认频率时不得将推算值视为精确 `g` 值。
- 一维基线可选择全谱均值、指定区间或参考坐标；支持噪声参考缩放和手动幅度设置。处理与显示偏移分开。
- 多曲线叠加与堆叠；每条曲线通过单一下拉菜单设置实线、虚线、点线、空心/实心圆形、方形、三角形、菱形，以及线条与符号的组合。符号显示自动抽样并保留首尾点；Canvas 与 SVG 均支持实心填充。每个子图可单独设置线宽（留空时继承全局线宽）和符号大小；Variable scan 子图另有独立曲线样式，不继承源曲线样式。旧配置中的 mode/symbol 字段仍可读取。另支持布局、局部坐标轴、图例、标注、磁场间距 ΔB、X/Y 平移缩放、撤销/重做。手动选定至少两条兼容的一维曲线后，可转换为二维 Heatmap，或显式创建独立 Variable scan 子图；扫描变量支持名称、可选单位、等间距起点/间隔和自定义数组，变量值按源曲线 ID 保存并按坐标排序。
- 坐标数值可设置有效数字及普通/科学计数法，适用于一维、二维及投影轴。

### 已合并正式版：投影线宽、功率饱和与阶段 A/B 界面（2026-10-30）

以下功能已随 PR #1 合并至正式 `main`，正式 Pages 部署见 [Actions 41001804341](https://github.com/imasenHF/spinplot/actions/runs/41001804341)。开发分支 `preview/modularization-phase1-20261009` 保留作后续工作参考。

- Top 投影从聚合后的一维曲线提取峰峰幅度、横坐标极值间距或二者读数。Right 投影从每一条扫描变量值对应的**完整磁场谱**提取峰峰幅度或物理磁场线宽，支持同时显示两条扫描曲线及各自的水平刻度（线宽单位跟随磁场 X 轴，例如 G）；不再将右侧聚合曲线极值间距误认为磁场线宽。
- Variable scan 只有一个 `Measurement` 选择器：Mean/Max/Min/RMS/Sum、Peak-to-peak amplitude、Peak-to-peak linewidth、Both。旧 Statistic/PTP 项目保持既有统计结果，直到用户主动启用新饱和拟合。振幅曲线使用左 Y 轴，线宽在双特征模式下使用右 Y 轴。
- 饱和/展宽拟合只在 Variable scan：幅度模型 `A√P/(1+P/P_sat)+C`、线宽模型 `A√(1+P/P_sat)+C`，分别计算，不默认二者参数相等。使用有界对数搜索（求解器说明在问号帮助），公式通过 MathML 展示，参数与 RMSE/R² 使用只读字段。默认特征功率上下界收敛到拟合有效点实际测量范围，可按需手动改写并得到边界警告。
- 排除点改为逐轨迹复选框，未参与拟合的测量值单独以符号标识，保留原始记录及导出纳入状态。直接二维来源的 Current data 左侧缩进显示衍生曲线，右列独立设置每条线型/符号；多条原始一维曲线生成的旧扫描视图保留原 Style 控件兼容。拟合曲线默认虚线、实测特征默认点线，图例默认置于绘图区外侧上方。设置随项目保存，拟合重载后重算；正式数据及基线不修改。
- **2026-10-30 界面修订：** 普通二维 Heatmap 不显示无用的 Scan style 或 Current data 空白样式列；直接二维 Variable scan 的衍生曲线恢复 34 px 纯符号 Style 列，数据/样式列表等高、逐行对应。非功率扫描自动折叠拟合设置且不将 dB 误显示为 mW；排除点设置恢复一致的折叠外观；MathML 括号禁止随分式拉伸。Linear 模式下的主图 Y、Top/Right 投影和 Z 色标均用十进制刻度，只有明确选 Scientific 才使用科学计数法。原始数值/项目格式/二维基线均不变。完整回归与浏览器/迁移对照 [40923593424](https://github.com/imasenHF/spinplot/actions/runs/40923593424) 成功，主站独立预览 Pages [40924052918](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40924052918) 成功；真实谱线科学适用性与参数不确定度尚未独立验收。
- **2026-10-30 派生曲线 Z-order：** 直接二维 Variable scan 的 Current data 中，缩进的派生曲线可鼠标拖拽调整前后绘制次序（下方在上层），也可通过 Alt+↑/↓ 调整。原始矩阵行固定；右侧线型/符号控制跟随条目移动。使用稳定虚拟 ID 和子图 `scanDerivedOrder` 记录顺序，旧项目缺省时保留原始默认顺序；Canvas/图例/SVG/其他图形导出与保存重载采用同一排序。新增纯函数测试 `src/twod/scan-order.test.js`，完整回归 [40929024040](https://github.com/imasenHF/spinplot/actions/runs/40929024040) 成功。此功能不改变谱线数值、拟合、二维基线、项目格式版本或正式分支。
- 阶段 B 初版（PR #1）的 `plotFootprint` 将占位选项与投影显隐耦合，未满足用户原始要求；PR #2 已以 `emptyProjectionSpace` 修正并合并正式版 0.10.0。具体实现与验收见 `docs/DEVELOPMENT_CONTEXT.md`。多峰线宽判读、真实仪器校准及拟合不确定度估计仍未完成。

### 二维查看与导出

- 二维绘图模式包括 Heatmap、Stack 与 Overlap。Overlap 将所选扫描轨迹绘制在共同 X 坐标轴上，并可按每隔 N 条轨迹抽取显示。Field–Power 的功率轴使用零衰减参考功率 P₀ 按 P(A) = P₀ × 10^(-A/10) 换算，界面只要求输入 P₀；旧项目中的参考功率/参考衰减参数会迁移为等效 P₀。
- Variable scan 通过 2D Plot mode 菜单显式新增为独立子图，导入时不会自动创建，也不替代原图的右侧 Y 投影。新增图初始放在源二维图右侧（布局不允许时追加为新行），复用常规子图的位置、尺寸、项目保存和导出机制；横轴采用扫描变量，纵轴为每条扫描轨迹在独立统计区间内的统计值。统计方式与区间保存在 `scanStatistic`、`scanStatisticMin`、`scanStatisticMax`，与源二维图的 `yMode`、`projectionXMin/Max` 独立。创建时在坐标方向一致的条件下，以源图右侧投影的统计方式和区间初始化；扫描视图隐藏二维 Top/Right projection 控件。
- 顶部与右侧投影分别设置计算区间、显示强度范围、统计方式、标题及范围标签；方法包括均值、最大、最小、峰峰值、RMS、求和。样本求和不是按坐标间隔加权的积分。
- X/Y/Z 轴、色标范围、调色板及 `g` 轴可分别设置；色标支持滚轮缩放 Z 范围，双击色标可恢复自动 Z 范围；双击热图主体仍恢复 X/Y 轴。该交互修复已随 PR #1 合并正式 `main`，并已部署至 `/spinplot/`。
- 二维预览按屏幕像素取样；数据矩阵与投影计算保留原始数据单元。SVG 与 PDF 共用同一矢量场景；PDF 通过 `svg2pdf.js` + `jsPDF` 生成矢量路径和文本对象，不依赖 Raster DPI。非 ASCII 字符使用嵌入的 Noto Sans SC 字体子集，覆盖 GB2312 常用汉字、希腊字母及常用科学符号；GB2312 以外的罕见字符及用户自定义字体仍需检查。超大矩阵的实际容量受浏览器内存与文件大小影响。
- 二维数据目前直接显示所选信号分量；一维基线和噪声缩放未扩展至二维矩阵。

### 输出与本地保存

- 图像格式：PNG、JPEG、WebP、BMP、TIFF、SVG、PDF；包含图表尺寸及栅格 DPI 设置。
- CSV：全局频率修正数据、子图显示数据、频率元数据，以及二维投影数据。
- 保存/打开项目文件、保存/载入配置、批量制图入口。批量流程须针对指定输入进一步验证。
- PDF 使用 SVG 矢量场景转换，页面尺寸与 Design canvas 一致，Raster DPI 设置不影响 PDF。路径、文字、裁剪与矩阵变换由 `svg2pdf.js` 处理；非 ASCII 字符按需嵌入 Noto Sans SC 字体子集，GB2312 常用汉字、希腊字母及常用科学符号可保持文本对象。

## 3. 当前界面结构

六个选项卡依次为 **Data、Processing、Subplots、Axes、Style、Export**。顶部为单行品牌页头、菜单及工具栏；左侧为可调整宽度的设置区，右侧为绘图区、操作日志及状态信息。子图控件按数据、绘图模式、坐标、`g` 轴、颜色、图例、投影、标注、处理参数、布局等功能组织。

视觉规则见 [STYLE_GUIDE.md](docs/STYLE_GUIDE.md)；主站共享品牌见 [SITE_STYLE_GUIDE.md](https://github.com/imasenHF/imasenhf.github.io/blob/main/docs/SITE_STYLE_GUIDE.md)。

## 4. 已知限制与验证状态

- 现有二维模块包含解析、数值、缓存、大数组、调色板、刻度和集成测试；文档所述的合成数据与部分实测格式回归并不代表所有 EPR 厂商、所有序列以及所有浏览器均已验证。
- `docs/TWO_DIMENSIONAL.md` 记录测试方法及适用范围；涉及实验源文件的对照测试需要相应本地文件，私有实验数据不提交公开仓库。
- 反向/非等距坐标、缺失频率、复数通道、项目文件迁移、超大 SVG/PDF、PDF 阅读器兼容性及跨浏览器交互需持续回归。
- 此次文档整理仅检查远程源码与已有记录，未执行新的数值测试、端到端浏览器操作或部署验收；先前检查结果不自动延伸到未来提交。
- 软件可用于整理与可视化，但重要定量结论仍应与原始谱图、已知标准数据及独立计算对照。

## 5. 预览分支与待办

- **架构维护规划（2026-10-30）：** 已根据正式 `main` 的 0.10.0 代码建立分阶段优化计划，范围包括统一质量检查、逐步收缩 `src/main.js`、拆分 `src/twod/ui.js`、统一文件读取接口及按性能测量决定是否引入 Worker。该文件目前仅记录规划，相关代码尚未按计划修改；实施时以 [ARCHITECTURE_IMPROVEMENT_PLAN.md](docs/ARCHITECTURE_IMPROVEMENT_PLAN.md) 为准。

**阶段 B（正式版本 0.10.0，2026-10-30）：** 已通过 PR #2 合并。混合投影布局中，每个子图可通过 `emptyProjectionSpace` 选择 `none / top / right / both`，无投影子图可占用同行的上投影预留区、同列的右投影预留区或两者；当前子图显示的投影、色标、`g` 轴、标题与图例边距保持独立。控件适用于 1D、2D 与 Variable scan 子图，默认 `none` 保持原有对齐行为。旧 `plotFootprint` 字段在配置载入时删除；项目格式 11、配置格式 10 不变。正式 Pages 部署 [41005910687](https://github.com/imasenHF/spinplot/actions/runs/41005910687) 成功，GitHub Release [v0.10.0](https://github.com/imasenHF/spinplot/releases/tag/v0.10.0) 已发布。实现与验收见 [持续开发上下文](docs/DEVELOPMENT_CONTEXT.md) 和 [CHANGELOG](CHANGELOG.md)。

**2026-10-29 独立预览功能（已于 2026-10-30 合并正式 `main`）：** Heatmap、Contour、可旋转 3D 均可设置 Linear / Log10-SymLog / Scientific Z 轴；主图 Y 与 Top/Right 投影强度轴也提供相同三个并列模式。全正值 Log10、带零/负值的信号采用保留零点和符号的 SymLog，Scientific 仅改变标签、不改变线性间距。切换模式自动计算并填写子图轴 min/max；Auto Z 和色标双击填写当前可见数据的数值范围，X/Y 复原不清除 Z。Current order 和 34 px 的纯符号菜单并排，侧栏说明使用 `?` 提示。**不改动二维基线**：原有 Region、其他一维处理及直接二维矩阵的数据语义维持原样。代码完整回归 [40745286984](https://github.com/imasenHF/spinplot/actions/runs/40745286984) 成功，预览主站部署 [40745691624](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40745691624) 成功。上述功能已随 PR #1 合并正式 `main`，正式 Pages 部署见 [41001804341](https://github.com/imasenHF/spinplot/actions/runs/41001804341)。

核心源码：`src/twod/zscale.js`、`src/twod/contours.js`、`src/twod/surface3d.js`、`src/twod/ui.js`、`src/plotting/axis-scale.js`、`src/plotting/oned.js`、`src/main.js` 及 `src/interface.js`。最新完整数值、生产构建、Chromium 交互和旧版对照成功：[40739205730](https://github.com/imasenHF/spinplot/actions/runs/40739205730)。主站独立预览 JS/CSS 与完整同版本 HTML 已同步，Pages 工作流 [40739438889](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40739438889) 成功；公开预览在同步 HTML 后 Chromium 复测 [40739205307（第 2 次）](https://github.com/imasenHF/spinplot/actions/runs/40739205307) 通过。首次线上失败源自旧版 HTML 缺少新增全局 Y 轴控件，并非数值实现失败。当时正式 `/spinplot/` 未更新、Draft PR #1 未合并；该历史状态已被 2026-10-30 的 PR #1 合并取代。


预览分支已完成本轮一维绘图、轴与导出模块接入，项目/配置格式保持 11/10。手动一维曲线可生成 Heatmap 或显式创建独立 Variable scan 子图，扫描变量按源曲线 ID 保存；Variable scan 标题默认隐藏，右侧投影标题支持换行，连续色带只有一条曲线时取起始颜色。Typography 面板具有独立 `Projection titles` 字号设置（默认 11 px，范围 7–40 px）。

手动曲线默认 Plot mode 为 Stack、Overlap、Heatmap 和 Variable scan；二维已增加 Contour 与 3D surface。扫描变量编辑器默认折叠，手动曲线 Heatmap 默认显示 Y 轴标题；数值、项目兼容与浏览器回归最新状态见本节前述已验收结果。上述为 PR #1 合并前的预览分支历史记录；PR #1 已于 2026-10-30 合并。当前正式版本为 0.10.0，阶段 B 修正已合并并发布；实现与后续科研验收状态见 [持续开发上下文](docs/DEVELOPMENT_CONTEXT.md)。模块职责、自动检查和浏览器验收记录分别见 ARCHITECTURE 与 MODULARIZATION_PREVIEW。每次开始或恢复开发、修复、提交及发布任务前，必须先读取 [docs/DEVELOPMENT_CONTEXT.md](docs/DEVELOPMENT_CONTEXT.md)，再重新核对目标分支 HEAD、PR、Actions 和目标源码；不得仅凭旧对话记录判断当前状态。该文件维护活动任务、实现位置、验收标准及发布边界。


1. **先做兼容性回归**：检查 CSV、CIQTEK、BES3T 的真实样本、项目版本 9/10/11 读取和配置 10 的保存/加载，记录正常路径与明确报错。
2. **再做科学数值检查**：核对频率对齐、`g` 换算、反向和非等距轴、投影统计、矩阵恢复、数据导出；以明确数据集、参数、预期结果和允许误差描述每项测试。
3. **完成界面与导出检查**：桌面/窄屏、键盘焦点、控件显隐、子图联动、热图/投影、中文 SVG/PDF，以及保存后重载的视觉一致性。
4. **逐步整理源码**：避免在未建立等价测试前大规模搬移内联逻辑。具体分层目标及迁移约束参见 [ARCHITECTURE.md](docs/ARCHITECTURE.md)。

本文件记录功能边界、已确认决定、限制和待办；持续开发交接要求见 [DEVELOPMENT_CONTEXT.md](docs/DEVELOPMENT_CONTEXT.md)，逐版本变动保存在 [CHANGELOG.md](CHANGELOG.md)，不追加失效的开发日记。
