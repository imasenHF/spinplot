# SpinPlot 持续开发上下文

更新日期：2026-10-22（Asia/Shanghai）

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

以下是 2026-10-22 本轮重新检查时的状态，之后的文档提交会改变 HEAD，因此下一次任务仍须重新查询：

- 分支当时的 HEAD：`494df53b144a72608b533b67cdc394e017c3ad42`，提交说明为 `style(spinplot): format two-dimensional UI source`。
- 该提交已将 `src/twod/ui.js` 从压缩式单行源码格式整理为可维护的多行源码；后续功能修改不应重新压缩该文件。
- 当时 `src/main.js` 的 blob SHA 为 `59b00e89531d345471c36ee515fdeb2651359f8d`，正文约 117,691 字符。该 SHA 只标识本轮读取的版本，不是永久固定版本。
- 当时 PR #1 为 open、Draft、未合并。
- HEAD `494df53` 对应的 `SpinPlot modularization preview` 和 `SpinPlot temporary preview HTTP check` 两项 Actions 均成功（运行 ID 分别为 [38789133853](https://github.com/imasenHF/spinplot/actions/runs/38789133853) 和 [38789133852](https://github.com/imasenHF/spinplot/actions/runs/38789133852)）。这些结果只覆盖该提交，不代表后续修改已通过。
- 本文建立前，colorbar 双击复原及功率饱和分析尚未实施；没有针对这两项需求的代码提交、构建或浏览器验收。

## 当前任务 A：colorbar 双击恢复自动 Z 范围

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
- 在代码和测试实际完成前，不得把该功能标记为已实现。

建议提交说明：`2D: restore z range on colorbar double click`。

## 当前任务 B：二维扫描变量分析与 CW EPR 功率饱和拟合

该功能按用户明确要求分成两个阶段。尚未实现。

### 第一步：二维图右侧关联子图

- 在二维主图同一行增加右侧子图，以扫描变量为横坐标。
- 支持查看 Y 投影或逐轨迹提取特征与扫描变量的关系。
- 逐轨迹计算必须使用原始数据及真实坐标；Stack/Waterfall 的显示偏移不能参与定量分析。
- 当前二维投影统计包含 mean、max、min、peak-to-peak、RMS、sum。现有 sum 是样本点求和，不等于非等间距坐标上的加权积分。新增特征应明确其数学定义、计算窗口和单位。

### 扫描变量为功率衰减时的换算

- 支持从输入文件元数据读取参考功率，或由用户手动输入参考功率。
- 必须识别扫描变量的实际语义与单位；dB 值若代表衰减量，应按衰减关系换算，不能直接将 dB 当作 mW。
- 通用关系为 `P = P_ref × 10^(-(A - A_ref)/10)`，其中 `A` 是当前衰减值，`A_ref` 是参考功率对应的衰减值。只有确认 `P_ref` 对应 0 dB 时，才可取 `A_ref = 0`。
- 若元数据未提供足够的参考条件，允许继续以原始衰减值作图，但不得伪造 mW 轴或以 mW 报告拟合参数。
- 界面应显示功率转换所用参数及其来源；字段命名和读取路径必须依据实际文件格式核实，不得猜测元数据键名。

### 第二步：饱和拟合

- 以第一步得到的扫描变量和信号特征为输入，提供多种拟合算法。
- 实施前先确认可适用的物理模型、参数定义、约束条件、初值、失败判据和拟合结果呈现方式；不同算法应使用同一组输入数据和一致的单位定义。
- 输出至少应区分模型、拟合参数、拟合曲线、残差、参与拟合的数据点数和失败/警告信息。
- 若横轴是功率衰减而不是已校准功率，结果必须保持衰减轴语义，不能把拟合参数标记为 mW。
- 本文不把此前讨论的任何候选模型或算法记作已确认实现；具体选择以实际设计和验证结果为准。

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

## 维护规则

- 本文维护当前有效决定、最近核查基线、活动任务及未完成验收项；不持续追加已失效的讨论。完整历史由 Git 保存。
- 每次任务结束后，仅在代码、测试、部署状态或已确认决定实际变化时更新相关记录。
- 若本文与用户最新指令冲突，执行用户最新明确要求；若本文与远程代码或 CI 状态冲突，先核查远程事实，再修正文档。
- 正式功能状态以当前代码和实际检查结果为准。对用户汇报时，明确区分已修改、已提交、CI 通过、预览已同步、浏览器已验收和正式发布。
