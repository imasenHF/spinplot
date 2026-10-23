# SpinPlot — ARCHITECTURE

更新日期：2026-10-13（Asia/Shanghai）
维护范围：代码架构、数据表示、模块职责、科学处理约束、兼容性与验证方式。已完成状态与待办概览见 [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)；界面规则见 [STYLE_GUIDE.md](STYLE_GUIDE.md)。

## 1. 当前部署与代码结构

```text
index.html               入口、CSS、应用状态、主要交互/绘图与保存逻辑
src/interface.js         子图控件组织、局部显隐与面板层级
src/twod/core.js         CIQTEK/BES3T 解析、轴语义、二维矩阵基础操作
src/twod/ui.js           二维视图与图形/控件整合
src/twod/palettes.js     共用调色板注册
src/twod/ticks.js        坐标刻度格式化
src/twod/*.test.js       解析、集成、大数据及刻度测试
public/legacy/           旧路径跳转
.github/workflows/pages.yml  构建与 Pages 发布
```

- 应用当前版本以 `package.json` 为准，检查时是 **0.9.2**。
- Vite 以 `/spinplot/` 为 `base`，使用 `npm run build`（TypeScript 检查 + Vite），结果位于 `dist/`；GitHub Actions 在 `main` 上构建并部署。
- 当前是 **原生 HTML/JavaScript 为主体、二维相关代码部分模块化** 的应用。虽然已安装 React 与 TypeScript 依赖，不能描述为已经全部迁移至 React。
- 不设置额外 CNAME，不部署账户/后端服务，数据输入与文件导出默认发生在浏览器内。

## 2. 数据模型与坐标语义

一维曲线保留坐标数组 `B`、信号数组 `y`、数据名称、来源与可用的微波频率；支持记录坐标轴的物理名称和单位。二维矩阵采用 **Y 为行、X 为列** 的形式：X 是每行内最快变化的坐标，`real` / `imag` 通道和元数据分别存储。代码读取时校验维数与单调轴，不以像素索引代替真实坐标。

- CIQTEK 使用实验类型确定轴的物理语义，优先读取真实采集坐标及各迹参数；同一矩阵要求轨迹长度及轴一致，未知实验类型报错。
- BES3T 依据描述文件读取 X/Y 坐标、数据编码、字节序与通道；必要的配套文件缺失时报错。3D、未知布局或其他不匹配文件不能默默降级。
- 已确认磁场单位可在 G、gauss、Oe、mT、T 间按物理量换算；时间、功率衰减、调制幅度不能因为数值相近而当作磁场。
- Field-Delay 的延迟单位在现有示例中未声明，应保留来源数值和未注明单位的状态；禁止自动写入 ms/ns。
- 数据读入后的原始数组应保留，图形采样与缩放不改写原数组。

## 3. 处理与渲染边界

`B_{corr}=B_{raw}(\nu_{target}/\nu_{raw})` 仅对频率有效、目标频率已确认且轴类型为磁场的适用曲线生效；缺失频率时不生成未经确认的精确 `g` 值。新子图默认使用 Local mean；用户修改全局频率模式或目标值时，尚未显式设置局部频率覆盖的子图继承全局目标，显式局部设置保持有效。CSV 等缺少源频率元数据的一维磁场曲线可在频率表填写源微波频率；仅输入目标频率不足以计算缩放比例。对于时间轴或二维另一物理量，坐标保持原语义。

一维基线（全谱均值、区间、参考坐标）先于幅度处理，噪声区域或自动估算用于一维信号缩放。显示堆叠偏移不得参与科学定量。二维图当前直接选择实部/虚部/模值，未实施一维基线处理在矩阵上的自动扩展。

二维投影支持 mean、max、min、peak-to-peak、RMS、sum；统计区间与显示坐标范围分别保存。均值/和是离散采样点统计，不是按坐标步长加权的数值积分；RMS 不保留正负号。Variable scan 逐个扫描坐标使用同一归约函数计算统计值，但独立保存 `scanStatistic`、`scanStatisticMin`、`scanStatisticMax`，不读取源图的 `yMode` 或 `projectionXMin/Max`。创建时仅以源图右侧投影设置作为初始值；扫描视图不渲染二维顶部/右侧投影。屏幕预览可以按像素重采样，二维投影仍使用完整矩阵；矢量输出的规模与浏览器资源有关。

图形布局要求同等网格跨度的主坐标框大小一致，投影、色标、`g` 轴和外侧图例占用的附加空间不得随子图类型导致主框尺寸漂移。图表及导出设置可以包含全局/子图覆盖；应明确继承范围。

## 4. 项目文件与配置

| 形式 | 当前文件格式 | 内容与兼容性 |
| --- | --- | --- |
| SpinPlot 项目 | `version: 11` | `type: SpinPlotProject`、`appVersion`、原始一维/二维数据、配置信息；读取逻辑允许项目版本 9–11 并校验 |
| SpinPlot 配置 | `version: 10` | `appVersion`、控件参数、布局、子图设置、显示状态；不携带源谱数组 |
| 应用版本 | `package.json.version` | 语义版本，用于页面和保存文件的 `appVersion`，不决定文件格式 |

新增或重命名字段时先确定旧文件读取行为与迁移结果；不能自动恢复的属性必须提示丢失/不支持。配置恢复不应覆盖已导入的原始数据；项目文件加载需校验数组、二维矩阵、版本和引用下标。

## 5. 隔离预览分支模块化（未合并 main）

`preview/modularization-phase1-20261009` 已完成本轮一维绘图、坐标与导出接入。正式 `main` 仍保留原实现。

| 模块 | 实际职责 |
| --- | --- |
| `src/main.js` | UI 控件、应用状态、缓存、事件、布局模型组装、导出下载与批量调度；其他文件读取和二维模型协调仍在入口中 |
| `src/processing/oned.js` | 一维频率对齐、基线、幅度处理的纯函数流水线 |
| `src/processing/axis.js` | 轴类型和单位、频率对齐、Field/g 换算、刻度生成；二维模块复用同一实现 |
| `src/plotting/oned.js` | Overlay/Stack 显示数组和显示范围；Canvas 绘图、图例、标注和测距，接收已处理模型、控件快照和交互快照 |
| `src/export/csv.js` | 全局修正、显示数据、频率元数据 CSV，保留原字段和插值 |
| `src/export/scene.js`, `svg.js`, `pdf.js`, `image.js` | 共用绘图场景记录、SVG/PDF 序列化、栅格编码及 DPI 元数据 |
| `src/export/project.js` | 项目/配置导出入口；版本及兼容校验仍由 `src/project/project.js` 负责 |
| `src/data/twod.js` | 已有二维 `x/y/real/imag/metadata` 数据结构校验与构造；不新增另一套矩阵格式 |

绘图模块不读取 DOM，不执行一维基线或幅度处理，也不读取原始一维谱。`y` 表示处理后的强度；`yd` 表示叠加显示偏移后的强度；保存项目仅使用原始数组。`signal.js` 的旧 `applyStackOffsets` 接口以及二维 core 的旧坐标接口保留为兼容 re-export，无重复计算实现。

SVG、PDF 和屏幕绘图复用同一个 renderer。二维渲染仍由 `twod/ui.js` 实施；本轮不加入新的二维视图或拟合功能。该分支尚未完成所有 UI/解析函数拆分，不能描述为整个应用入口只剩事件绑定。

部署与最新验收状态见 [MODULARIZATION_PREVIEW.md](MODULARIZATION_PREVIEW.md)。

## 6. 后续模块化目标（尚未全部实施）

| 拟议模块 | 后续职责 |
| --- | --- |
| data | 文件解析、原始曲线/矩阵、坐标和频率来源 |
| processing | 可复现的基线、幅度与频率处理，尽可能使用可单测的纯函数 |
| analysis | 峰、积分与相对量等独立分析，严格分离显示偏移 |
| project | 项目和配置的版本检查、恢复与迁移 |
| graphics | 共用绘图模型与 Canvas/SVG/PDF 导出 |
| ui | 工具栏、曲线列表、子图与参数控制 |
| workers | 大型计算异步执行及取消协议；当前不等同于已建成的 worker 子系统 |
| storage | 可恢复的本地草稿能力（如 IndexedDB）；当前不应宣称已经提供自动草稿 |

迁移过程先建立行为回归测试，再按边界提取模块；禁止以迁移名义改变数据语义或已有项目格式。优先从已分离的 `src/twod/` 测试基础出发，逐步移除根页面的重复解析和渲染职责。

## 7. 检查与验收

```bash
npm ci
npm run build
node src/twod/core.test.js
node src/twod/bes3t.test.js
node src/twod/large.test.js
node src/twod/integration.test.js
node src/twod/ticks.test.js
```

如有经授权的本地 CIQTEK 实验样本，可按 [TWO_DIMENSIONAL.md](TWO_DIMENSIONAL.md) 运行 `node src/twod/ciq.test.js <实验文件目录>`。不要将未经授权的数据样本或输出提交到公共仓库。

验收分层：

1. **静态构建与测试**：编译检查、解析和单位测试、模拟矩阵和投影测试；
2. **兼容性与数值检查**：项目版本 9/10/11、配置 10、反向与不等距轴、源文件真实数据、结果误差；
3. **浏览器与绘图检查**：1D/2D/混排图、交互、控件焦点、中文标签、PNG/SVG/PDF、保存重载；
4. **发布检查**：Actions 构建/部署状态、线上 URL、资源路径与实际页面交互。

预览分支的本轮测试和发布状态单独记录；正式分支和真实仪器样本不能使用预览分支的合成数据结果替代。
