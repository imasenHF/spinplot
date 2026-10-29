# SpinPlot — PROJECT_CONTEXT

更新日期：2026-10-29（Asia/Shanghai）
状态来源：`main` 分支用于正式功能基线；预览分支的当前状态、活动任务及每次开发前的检查要求见 [持续开发上下文](docs/DEVELOPMENT_CONTEXT.md)。实现状态以每次重新核查的远程代码、测试与 CI 结果为准。

## 1. 定位与发布

SpinPlot 是浏览器内运行的电子顺磁共振（EPR）谱图读取、处理、排版与导出工具，当前以连续波（CW）一维谱和二维实验数据为主要对象，同时具有部分瞬态（Transient EPR）二维数据读取能力。供科研数据整理与制图使用；未建立在线账户或谱图上传后端。

- 公开作者：hyphoon；联系：wuhaifeng@ustc.edu.cn。
- 代码：https://github.com/imasenHF/spinplot
- 应用：https://plastocyanin.org/spinplot/
- 构建：Vite、JavaScript（含部分独立模块）、TypeScript 检查；`package.json` 中包含 React 依赖，但主体界面尚未改造成 React 应用。
- 发布：`main` 触发 GitHub Actions，产物为 `dist/`，部署路径为 `/spinplot/`；不单独声明 `CNAME`。
- 当前应用版本：**0.9.2**（来源为 `package.json`；更新版本号时同步修改本节）。
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

### 预览分支新增：功率饱和分析与峰峰线宽（2026-10-29）

以下仅在 `preview/modularization-phase1-20261009` 中实现，正式 `main` 及 `/spinplot/` 暂未包含。

- 二维 Top/Right 投影可以分别显示峰峰值、线宽或两个特征的数值读数；线宽取选定区间最大/最小信号坐标的绝对间隔。
- Variable scan 可显示峰峰幅度、线宽或二者。二者同时出现时峰峰幅度使用左 Y 轴，线宽使用右 Y 轴；已有离散统计模式保留。
- 功率拟合只在 Variable scan 中：峰峰幅度 `A√P/(1+P/P_half)+C` 与线宽 `A√(1+P/P_sat)+C` 两种独立候选模型。可分别选择拟合或同时拟合、设置拟合偏置、排除轨迹、限制功率参数上下界，显示 P、A、C、RMSE、R² 及告警。线宽模型依赖均匀功率展宽假设。
- dB 衰减根据 P₀ 换算，兼容已校准的 mW/W/µW 功率轴。Export 提供独立特征与拟合 CSV；项目保存相关设置，重载按原始数据重算拟合结果。
- 数值及 13 条合成谱浏览器验收通过 [40891497754](https://github.com/imasenHF/spinplot/actions/runs/40891497754)。补充排除轨迹和参数上下界后的完整回归 [40892281885](https://github.com/imasenHF/spinplot/actions/runs/40892281885) 成功；独立预览静态快照 Pages 发布 [40892566215](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40892566215) 成功，公开 Chromium 验收 [40892808647](https://github.com/imasenHF/spinplot/actions/runs/40892808647) 成功。未做真实谱线科学验证、拟合参数不确定度和多组分自动识别。

### 二维查看与导出

- 二维绘图模式包括 Heatmap、Stack 与 Overlap。Overlap 将所选扫描轨迹绘制在共同 X 坐标轴上，并可按每隔 N 条轨迹抽取显示。Field–Power 的功率轴使用零衰减参考功率 P₀ 按 P(A) = P₀ × 10^(-A/10) 换算，界面只要求输入 P₀；旧项目中的参考功率/参考衰减参数会迁移为等效 P₀。
- Variable scan 通过 2D Plot mode 菜单显式新增为独立子图，导入时不会自动创建，也不替代原图的右侧 Y 投影。新增图初始放在源二维图右侧（布局不允许时追加为新行），复用常规子图的位置、尺寸、项目保存和导出机制；横轴采用扫描变量，纵轴为每条扫描轨迹在独立统计区间内的统计值。统计方式与区间保存在 `scanStatistic`、`scanStatisticMin`、`scanStatisticMax`，与源二维图的 `yMode`、`projectionXMin/Max` 独立。创建时在坐标方向一致的条件下，以源图右侧投影的统计方式和区间初始化；扫描视图隐藏二维 Top/Right projection 控件。
- 顶部与右侧投影分别设置计算区间、显示强度范围、统计方式、标题及范围标签；方法包括均值、最大、最小、峰峰值、RMS、求和。样本求和不是按坐标间隔加权的积分。
- X/Y/Z 轴、色标范围、调色板及 `g` 轴可分别设置；色标支持滚轮缩放 Z 范围，双击色标可恢复自动 Z 范围；双击热图主体仍恢复 X/Y 轴。该交互修复目前仅在预览分支及临时预览中，尚未合并正式 `main`。
- 二维预览按屏幕像素取样；数据矩阵、投影计算及矢量导出保留原始数据单元。超大矩阵的实际容量受浏览器内存与文件大小影响。
- 二维数据目前直接显示所选信号分量；一维基线和噪声缩放未扩展至二维矩阵。

### 输出与本地保存

- 图像格式：PNG、JPEG、WebP、BMP、TIFF、SVG、PDF；包含图表尺寸及栅格 DPI 设置。
- CSV：全局频率修正数据、子图显示数据、频率元数据，以及二维投影数据。
- 保存/打开项目文件、保存/载入配置、批量制图入口。批量流程须针对指定输入进一步验证。
- PDF 基础字体在非 ASCII/中文文本上有限制；含中文标签优先使用 SVG，并在正式使用前检查输出。

## 3. 当前界面结构

六个选项卡依次为 **Data、Processing、Subplots、Axes、Style、Export**。顶部为单行品牌页头、菜单及工具栏；左侧为可调整宽度的设置区，右侧为绘图区、操作日志及状态信息。子图控件按数据、绘图模式、坐标、`g` 轴、颜色、图例、投影、标注、处理参数、布局等功能组织。

视觉规则见 [STYLE_GUIDE.md](docs/STYLE_GUIDE.md)；主站共享品牌见 [SITE_STYLE_GUIDE.md](https://github.com/imasenHF/imasenhf.github.io/blob/main/docs/SITE_STYLE_GUIDE.md)。

## 4. 已知限制与验证状态

- 现有二维模块包含解析、数值、缓存、大数组、调色板、刻度和集成测试；文档所述的合成数据与部分实测格式回归并不代表所有 EPR 厂商、所有序列以及所有浏览器均已验证。
- `docs/TWO_DIMENSIONAL.md` 记录测试方法及适用范围；涉及实验源文件的对照测试需要相应本地文件，私有实验数据不提交公开仓库。
- 反向/非等距坐标、缺失频率、复数通道、项目文件迁移、超大 SVG/PDF、中文输出和跨浏览器交互需持续回归。
- 此次文档整理仅检查远程源码与已有记录，未执行新的数值测试、端到端浏览器操作或部署验收；先前检查结果不自动延伸到未来提交。
- 软件可用于整理与可视化，但重要定量结论仍应与原始谱图、已知标准数据及独立计算对照。

## 5. 预览分支与待办

**2026-10-29 独立预览状态（非正式 `main`）：** Heatmap、Contour、可旋转 3D 均可设置 Linear / Log10-SymLog / Scientific Z 轴；主图 Y 与 Top/Right 投影强度轴也提供相同三个并列模式。全正值 Log10、带零/负值的信号采用保留零点和符号的 SymLog，Scientific 仅改变标签、不改变线性间距。切换模式自动计算并填写子图轴 min/max；Auto Z 和色标双击填写当前可见数据的数值范围，X/Y 复原不清除 Z。Current order 和 34 px 的纯符号菜单并排，侧栏说明使用 `?` 提示。**不改动二维基线**：原有 Region、其他一维处理及直接二维矩阵的数据语义维持原样。代码完整回归 [40745286984](https://github.com/imasenHF/spinplot/actions/runs/40745286984) 成功，预览主站部署 [40745691624](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40745691624) 成功。正式 `/spinplot/`、`main` 未修改，Draft PR #1 未合并。

核心源码：`src/twod/zscale.js`、`src/twod/contours.js`、`src/twod/surface3d.js`、`src/twod/ui.js`、`src/plotting/axis-scale.js`、`src/plotting/oned.js`、`src/main.js` 及 `src/interface.js`。最新完整数值、生产构建、Chromium 交互和旧版对照成功：[40739205730](https://github.com/imasenHF/spinplot/actions/runs/40739205730)。主站独立预览 JS/CSS 与完整同版本 HTML 已同步，Pages 工作流 [40739438889](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40739438889) 成功；公开预览在同步 HTML 后 Chromium 复测 [40739205307（第 2 次）](https://github.com/imasenHF/spinplot/actions/runs/40739205307) 通过。首次线上失败源自旧版 HTML 缺少新增全局 Y 轴控件，并非数值实现失败。正式 `/spinplot/` 未更新、Draft PR #1 未合并。


预览分支已完成本轮一维绘图、轴与导出模块接入，项目/配置格式保持 11/10。手动一维曲线可生成 Heatmap 或显式创建独立 Variable scan 子图，扫描变量按源曲线 ID 保存；Variable scan 标题默认隐藏，右侧投影标题支持换行，连续色带只有一条曲线时取起始颜色。Typography 面板具有独立 `Projection titles` 字号设置（默认 11 px，范围 7–40 px）。

手动曲线默认 Plot mode 为 Stack、Overlap、Heatmap 和 Variable scan；二维已增加 Contour 与 3D surface。扫描变量编辑器默认折叠，手动曲线 Heatmap 默认显示 Y 轴标题；数值、项目兼容与浏览器回归最新状态见本节前述已验收结果。正式 `main` 与 `/spinplot/` 未修改。详细状态见 [持续开发上下文](docs/DEVELOPMENT_CONTEXT.md)。模块职责、自动检查和浏览器验收记录分别见 ARCHITECTURE 与 MODULARIZATION_PREVIEW。每次开始或恢复开发、修复、提交及发布任务前，必须先读取 [docs/DEVELOPMENT_CONTEXT.md](docs/DEVELOPMENT_CONTEXT.md)，再重新核对目标分支 HEAD、PR、Actions 和目标源码；不得仅凭旧对话记录判断当前状态。该文件维护活动任务、实现位置、验收标准及发布边界。


1. **先做兼容性回归**：检查 CSV、CIQTEK、BES3T 的真实样本、项目版本 9/10/11 读取和配置 10 的保存/加载，记录正常路径与明确报错。
2. **再做科学数值检查**：核对频率对齐、`g` 换算、反向和非等距轴、投影统计、矩阵恢复、数据导出；以明确数据集、参数、预期结果和允许误差描述每项测试。
3. **完成界面与导出检查**：桌面/窄屏、键盘焦点、控件显隐、子图联动、热图/投影、中文 SVG/PDF，以及保存后重载的视觉一致性。
4. **逐步整理源码**：避免在未建立等价测试前大规模搬移内联逻辑。具体分层目标及迁移约束参见 [ARCHITECTURE.md](docs/ARCHITECTURE.md)。

本文件记录功能边界、已确认决定、限制和待办；持续开发交接要求见 [DEVELOPMENT_CONTEXT.md](docs/DEVELOPMENT_CONTEXT.md)，逐版本变动保存在 [CHANGELOG.md](CHANGELOG.md)，不追加失效的开发日记。
