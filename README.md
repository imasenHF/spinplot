# SpinPlot

浏览器端 EPR 数据处理、可视化与科学制图工具，重点覆盖连续波（CW）一维谱及二维实验数据，同时兼容已识别的瞬态二维格式。

作者：**hyphoon** · 联系：wuhaifeng@ustc.edu.cn

[打开 SpinPlot](https://plastocyanin.org/spinplot/) · [当前项目状态](PROJECT_CONTEXT.md) · [界面风格](docs/STYLE_GUIDE.md) · [架构](docs/ARCHITECTURE.md) · [版本记录](CHANGELOG.md)

## 功能概览

| 范围 | 当前功能 |
| --- | --- |
| 数据输入 | CSV、CIQTEK `.epr`、BES3T `.DSC/.DTA`（部分坐标轴需 `.XGF/.YGF`）；多文件导入 |
| 一维数据 | 多曲线叠加与 Stack、全局/子图频率设置、磁场对齐、基线和幅度处理、坐标与 `g` 轴、图例和标注、ΔB 测距；可将手动选定的多条 1D 曲线转换为 Heatmap 或独立 Variable scan 子图 |
| 二维数据 | Heatmap / Stack / Overlap；可显式新增独立 Variable scan 子图；实部/虚部/模值、X/Y/Z 轴与色标、保留顶部/右侧投影、统计范围、调色板和多子图混排 |
| 制图界面 | Data / Processing / Subplots / Axes / Style / Export 六个选项卡；投影标题字号独立设置，画布尺寸、局部覆盖、撤销/重做 |
| 输出 | PNG、JPEG、WebP、BMP、TIFF、SVG、PDF、数据及投影 CSV、频率元数据 |
| 工作保存 | 独立配置 JSON 与包含原始数据的项目文件；数据默认在浏览器本地处理 |

具体实验类型、二维轴单位和异常输入限制见 [二维数据说明](docs/TWO_DIMENSIONAL.md)。当前并未声明支持所有 EPR 厂商或序列；其他来源的谱图需先验证解析结果。

## 模块化预览（未合并正式版）

[SpinPlot 独立预览](https://plastocyanin.org/previews/spinplot-modularization/) 包含 Heatmap、Contour、可旋转 3D surface 等模块化功能；正式 `main` 和 `/spinplot/` 未合并这些变更。主图 Y、二维图 Z 与 Top/Right 投影强度轴支持三个并列显示选项：**Linear、Log10 / SymLog、Scientific**。

- **Linear**：线性连续坐标；**Scientific**：仍是线性坐标，只把刻度标签改成科学计数法；**Log10 / SymLog**：全正值采用 Log10，含零或负信号使用保留零点与正负号的对称对数。三者不修改原始数组。
- 选择一种模式时，应用按对应子图的实际数据自动拟合坐标范围，将数值写入子图 Y/Z、投影 min/max。**Auto Z** 按当前可见 X/Y 区域计算 Z min/max 并填写数值，双击色标同样处理；双击热图主体复原 X/Y 时不覆盖 Z。
- 原有的一维 Region 等基线、二维源矩阵和二维投影统计不做隐式校正或全矩阵均值扣除；**此次没有修改任何二维基线处理**。
- 等高线沿物理 X/Y 坐标插值；3D 使用可旋转三角网格。界面使用 34 px 的独立符号列、简短标题与问号帮助，3D 视角面板默认折叠。

阶段 B 新增 Plot footprint（Main / Top / Right / Full）及跨列主坐标框对齐、行高分配；项目保存恢复、SVG 输出和浏览器交互均有专门回归。阶段 B 完整数值、构建、Chromium 与迁移前对照通过 [Actions #40998987550](https://github.com/imasenHF/spinplot/actions/runs/40998987550)。此前三模式坐标与二维预览的回归见 [Actions #40745286984](https://github.com/imasenHF/spinplot/actions/runs/40745286984)。独立预览 Pages 发布通过 [40745691624](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40745691624)，公开浏览器复测以新工作流结果为准。真实实验文件的科学数值验收仍与合成数据回归分开进行。

## 使用与科研限制

1. 使用 **Open Data** 导入数据；CSV、CIQTEK 和 BES3T 文件的具体匹配关系由解析器检查。后续导入的数据可追加为新的子图。
2. 新子图默认采用 **Local mean**。切换全局频率模式或修改全局目标频率后，尚未设置局部频率覆盖的子图会继承全局设置；显式局部设置保持有效。CSV 等缺少源微波频率元数据的一维磁场曲线，可在 Data 页频率表的 `ν raw / GHz` 中填写源频率，目标频率本身不足以计算缩放比例。检查磁场单位及轴方向后再进行频率对齐和 `g` 值绘制。时间轴、功率衰减和调制幅度等物理量不能作为磁场进行 `g` 换算。
3. 一维基线/噪声处理不会自动应用到二维矩阵。二维投影的均值、RMS 与求和使用样本点统计，**求和不等同于按非等间距坐标加权积分**。
4. 输出前核查原始信号、显示偏移、坐标范围及单位。当前 PDF 基础字体不完整支持中文；含中文文字时优先导出 SVG。
5. 项目提供本地文件处理，不配置在线账户和实验谱图上传服务器。大型二维矩阵和矢量输出受浏览器资源限制。

## 本地运行

建议 Node.js 22（或经验证的兼容版本）：

```bash
npm ci
npm run dev
```

构建与本地预览：

```bash
npm run build
npm run preview
```

构建脚本执行 `tsc --noEmit && vite build`，产物位于 `dist/`。相关二维回归测试可运行：

```bash
node src/twod/core.test.js
node src/twod/bes3t.test.js
node src/twod/large.test.js
node src/twod/integration.test.js
node src/twod/ticks.test.js
node src/data/curve-matrix.test.js
```

仪器样本回归（需使用本地、未公开的实验文件）参见 [二维数据说明](docs/TWO_DIMENSIONAL.md)。构建通过不等同于浏览器全流程或科学数值验收通过。

## 版本、保存与兼容

- **应用版本**：以 `package.json` 的 `version` 为准；检查时为 **0.9.2**，`appVersion` 会写入保存文件。应用版本依 MAJOR.MINOR.PATCH 管理，历史详见 [CHANGELOG.md](CHANGELOG.md)。
- **项目格式**：`type: "SpinPlotProject"`，当前 `version: 11`；包含数据数组、二维矩阵与配置。载入逻辑支持经校验的旧项目版本 9/10/11，无法读取时应提示错误。
- **配置格式**：当前 `version: 10`；单独保存布局、选项和参数，不包含原始谱图数组。项目文件内部也含有此配置。
- **迁移要求**：文件格式的版本号独立于应用版本；字段变化需检查历史项目读取、兼容性和失败提示，版本标签应在构建与发布检查后创建。

## 源码、部署和维护

正式 main 的主要应用逻辑和 CSS 仍在根目录 `index.html`；`src/interface.js` 管理子图控件重组，`src/twod/` 包含二维解析、显示、调色板、刻度及测试。Vite 用于构建，React/TypeScript 依赖尚未对应完整的前端模块迁移。预览分支已将实际一维绘图、坐标、导出和处理流水线接入独立模块，详见 [ARCHITECTURE.md](docs/ARCHITECTURE.md) 与 [预览验收记录](docs/MODULARIZATION_PREVIEW.md)。

提交至 `main` 通过 GitHub Actions 构建和发布 GitHub Pages，Vite 的基础路径为 `/spinplot/`。正式入口是 [plastocyanin.org/spinplot/](https://plastocyanin.org/spinplot/)；旧 `/spinplot/legacy/` 用于兼容跳转，主站另维护旧大写路径的跳转。

维护文件分工：

- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)：当前有效状态、功能边界、未验证事项与待办。
- [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md)：应用专属视觉与交互约束。
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：源码结构、数据与迁移设计。
- [docs/TWO_DIMENSIONAL.md](docs/TWO_DIMENSIONAL.md)：二维格式、坐标定义、算法和回归说明。
- [CHANGELOG.md](CHANGELOG.md)：逐版本变动。

## 许可

本仓库目前未指定开源许可证；代码可在 GitHub 查看，但不能由此推定获得一般性的再分发或商用授权。
