# 模块化第一阶段预览记录

状态：**预览分支，未合并正式 main；构建快照已在主站独立临时路径发布，正式 `/spinplot/` 未变。**

- 临时分支：`preview/modularization-phase1-20261009`
- 源分支基线：`main` @ `3dfd126ae0a2af5ef836233f181dd2b757f2e64c`
- 目标：不改变功能与文件格式，移除内联 CSS/JS，抽出可单测的数值处理函数。

## 第一阶段修改

1. `index.html`：保留 HTML 与控件 DOM，CSS 改由 `src/styles/app.css` 引入，脚本改由 `src/main.js` 引入。
2. `src/main.js`：保留原始处理与界面行为；现有二维模块仍以相对路径导入。版本号改由 `package.json` 导入，避免从内联脚本移出后原本的 HTML 版本字符串替换失效。
3. `src/core/numeric.js`：提取现有 `clamp`、`mean`、`median`、`ptp`、`robustSigma`、`diff`、`finiteNum`、`parseNumberList`、`parseRegions`，保留实现与调用含义；`numeric.test.js` 为新增回归测试。
4. 已将原有 `parseCSV`、`parseMergedCSV`、`interp1` 抽离至 `src/data/csv.js` 和 `src/processing/interpolation.js`，保留函数行为，补充回归测试。
5. `.github/workflows/modularization-preview.yml`：仅在预览分支触发测试与构建、上传 artifact，并把相对路径静态构建写入该分支 `preview-site/`；不直接部署 SpinPlot Pages 或覆盖正式站点。

## 本阶段边界

- 未改动数据解析语义、物理单位、矩阵计算、渲染算法和导出格式。
- 应用版本保留 `0.9.2`；项目格式 11、配置格式 10 不变。
- **可访问临时路径**：`https://plastocyanin.org/previews/spinplot-modularization/`，由主站仓库保存的独立构建快照提供；正式 `/spinplot/` 不改变。相邻 `preview-check.html` 用于检查静态资源。主站 Pages 已发布，独立在线 HTTP 检查及 Chromium 浏览器冒烟测试均成功。
- GitHub Actions 仍在预览分支生成可复用的 `preview-site/` 构建产物，采用相对资源 URL；新构建不会自动同步主站上这份独立快照，主站资源需在单独检查后手动更新。
- 未创建独立临时仓库，本项目仅使用隔离分支。预览页作为公开可访问地址，请不要使用未经授权的客户数据或内部文件测试。
- 未来若有单独临时仓库，必须使用独立的部署地址与 Vite base，不能将该预览环境覆盖正式 `/spinplot/`。

## 验收

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

已完成检查：

- [代码与二维回归、Vite 构建（37810791507）](https://github.com/imasenHF/spinplot/actions/runs/37810791507)：通过。
- [公网 HTTP 资源检查（37811149930）](https://github.com/imasenHF/spinplot/actions/runs/37811149930)：HTML、JS、CSS 及资源检查页面均可访问。
- [Chromium 浏览器冒烟测试（37811329698）](https://github.com/imasenHF/spinplot/actions/runs/37811329698)：六个选项卡、合成一维 CSV 导入和导出通过；宽屏/窄屏截图已上传到该次运行的 Artifacts。
- [主站预览快照 Pages 发布（37810978440）](https://github.com/imasenHF/imasenhf.github.io/actions/runs/37810978440)：通过。后续更新预览快照对应另一主站提交，需要按最新运行核对。

尚未检查：真实仪器文件、旧项目版本 9/10/11 的兼容加载、二维真实数据、复杂绘图交互、SVG/PDF 中文导出及结果数值误差。这些不因冒烟测试成功而视为验收完成。

**预览清理规则**：完成审查或决定弃用本实验分支后，移除主站 `previews/spinplot-modularization/` 文件，并从 `SITE_CONTEXT.md` 删除临时入口；是否合并 PR 单独决定，不能自动把预览代码当作正式实现。

## 第二阶段：项目格式与配置校验（预览分支）

用户于 2026-10-09 反馈已测试上一轮临时交互页面，未发现问题。该反馈仅覆盖用户当时实际测试的功能，**不等同于全部仪器格式、数值结果或后续新提交均已通过验收**。

- 提取 `src/project/project.js`：项目格式 11 序列化、旧项目 9/10/11 与 `EPRPlotProject` / aligned 分支识别、一维坐标/频率与二维矩阵校验、配置格式 10 和子图引用校验。
- 保留 `src/main.js` 的 DOM 采集、文件读取、保存下载、UI 赋值与绘图触发；保存结构及错误信息原则上不变。
- 新增 `src/project/project.test.js`，覆盖版本、旧格式、空值恢复、反向/非单调磁场、缺失和错误引用、二维矩阵。
- 新阶段完成构建和浏览器导入/导出验证后再更新主站 `/previews/spinplot-modularization/` 快照。正式项目仓库 `main` 与 `/spinplot/` 不做变更。

第二阶段验收记录（2026-10-09）：

- [项目格式/数值/二维测试和 Vite 构建（37822366947）](https://github.com/imasenHF/spinplot/actions/runs/37822366947)：通过。
- [项目 9/10/11 保存与重新载入、配置 10、合成 CSV 的 Chromium 浏览器测试（37822653813）](https://github.com/imasenHF/spinplot/actions/runs/37822653813)：通过，宽屏/窄屏截图已作为 artifact 保存。
- [主站新的预览快照发布（37822594761）](https://github.com/imasenHF/imasenhf.github.io/actions/runs/37822594761)：通过；静态资源和预览指向构建提交 `50e3d38`。
- 用户确认第一阶段和第二阶段预览实际操作未发现问题（分别于 2026-10-09 反馈）；仅覆盖用户当时检查的功能。

仍待验收：真实 CIQTEK/BES3T 文件、旧实验项目及二维交互处理、数值精度、各种图像导出与中文字符。

## 第三阶段：一维基线、噪声与显示偏移

用户在 2026-10-09 确认第二阶段预览无问题，允许继续模块化；该反馈不等同于完整数值或所有厂商格式验证。

- `src/processing/signal.js`：提取原有 `correctBaseline`（无处理、均值、参考坐标、区间）、`estimateNoise`（差分 MAD 或分段去趋势 MAD）及 `applyStackOffsets`（自动/手动、正负方向）。
- `src/main.js` 继续处理参数控件、频率对齐、幅值缩放、缓存和绘图；仅通过轻量适配器传递当前控件数值给纯函数。
- 计算顺序不变：频率对齐 → 基线处理 → 振幅缩放 → **只用于显示**的子图偏移；二维矩阵不使用上述一维处理。
- `src/processing/signal.test.js` 覆盖区间方向、空值、参考坐标、残差估计、手动/自动偏移及不修改原始数据。
- 保留项目格式 11、配置格式 10、应用版本 0.9.2；本阶段只在隔离分支提交，待 CI 和浏览器验证后才同步主站临时页面，正式版本不变。

### 第三阶段检查结果（2026-10-09）

- [新一维处理单测、历史项目与二维回归、Vite 构建（37824922270）](https://github.com/imasenHF/spinplot/actions/runs/37824922270)：通过。新增测试保留原始代码对空字符串偏移比例及反向偏移有符号零（`-0`）的行为，不擅自改动算法。
- [临时网页 Pages 部署（37825068419）](https://github.com/imasenHF/imasenhf.github.io/actions/runs/37825068419)：成功，当前快照资源来自预览分支提交 `27c64bb`。
- [公开浏览器真实操作（37825403395）](https://github.com/imasenHF/spinplot/actions/runs/37825403395)：Chromium 通过合成 CSV 导入/导出、基线区间扣除数值、手动 Stack 显示偏移、项目版本 9/10/11 重新载入、配置 10，以及宽屏与窄屏截屏；截图与导出样本作为 Actions artifact 保留。
- 第一、二阶段的用户人工测试已确认无问题；**第三阶段暂无新的用户人工反馈**。

仍待专项验证真实 CIQTEK/BES3T 文件、二维投影与复杂交互、其它导出格式及科学数值对照；代码已通过的自动检查不能代替这些实验与人工验证。

## 第四阶段：实际绘图、坐标与导出迁移（2026-10-13）

本轮已接入一维处理/显示与实际绘图、轴转换、CSV/SVG/PDF/栅格/项目导出模块，并删除入口中的对应实现。二维数据保留现有保存格式。应用版本 0.9.2、项目格式 11、配置格式 10 不变。

本地检查：全部 35 项自动测试及生产构建通过，包括冻结原数组、自动/手动 Stack 正负方向、反向非等距坐标、X/Q 波段 g 换算、CSV 字段和项目兼容、百万数据点二维回归。具体模块职责见 ARCHITECTURE。

新增 Actions 验收使用本地构建页面，同时构建 `911a6a8` 作为迁移前对照。浏览器覆盖旧单曲线和新多曲线 CSV、区域基线、Overlay、Stack 自动/手动正负方向、项目 9/10/11、配置 10、SVG 轴/图例/标注、PNG 尺寸/DPI/解码以及 1440/1100/760/650/420 px 窗口；逐文件比较导出的 CSV、JSON（排除创建时间）、SVG 和 PNG。截图与导出样本在 `spinplot-modularization-acceptance` artifact 中。

[浏览器对照、模块测试与构建（38369179810）](https://github.com/imasenHF/spinplot/actions/runs/38369179810) 全部通过；[公开预览浏览器测试（38369179836）](https://github.com/imasenHF/spinplot/actions/runs/38369179836) 通过；[主站 Pages 发布（38368916198）](https://github.com/imasenHF/imasenhf.github.io/actions/runs/38368916198) 成功。公开预览已加载本轮构建 `index-CdHZZgtg.js`，正式 `/spinplot/` 未改变。首次 CI 的项目重载等待超时已通过测试脚本修订排除，迁移源码保持不变。


## 二维 Variable scan 独立子图、Overlap 与功率轴换算（2026-10-23）

- 二维导入默认只创建原有 Heatmap，不自动生成 Variable scan 子图；原有顶部与右侧 Y 投影保持可用。
- 在二维子图的 Plot mode 菜单选择 Variable scan (new subplot)，显式创建独立扫描子图。初始布局优先放在源图右侧；若复杂布局无法直接插入，则追加为新行。新图使用标准子图位置、尺寸、排序、项目保存和导出操作。
- Overlap 是独立二维绘图模式：所选扫描轨迹共享 X 坐标轴，轨迹标签包含扫描变量及单位；Plot every N traces 控制显示抽样。原始矩阵和轨迹数值不受显示偏移影响。
- Variable scan 的 X 轴是扫描变量，Y 轴是所选统计方式下的 Y 投影值。支持 mean、max、min、peak-to-peak、RMS、sum；样本点求和不是按非等距坐标加权的积分，RMS 不保留符号。
- Field–Power Sweep 的 dB 衰减换算仅在参考功率与对应参考衰减均有效时输出 mW，关系为 P = P_ref × 10^(-(A - A_ref)/10)。缺少校准值时保留原始衰减轴，不把 dB 直接标为 mW。第二阶段 CW EPR 饱和功率拟合尚未实现。
- 自动化验收运行 39951954898 通过数值/二维回归、生产构建、Chromium 浏览器回归和迁移前对照。浏览器测试覆盖显式新增扫描子图、源 Heatmap 保留、右侧初始布局、项目保存布局及含 Variable scan / Overlap 的 SVG 导出。
- 静态预览构建 d1e478f（应用源码提交 ce23fb6）已同步至主站提交 3e50725；Pages 发布 39953758517 成功，公开浏览器检查 39951955041 第二次尝试通过。正式 /spinplot/ 未修改，临时快照不会随预览分支自动同步。
- 实现位于 src/main.js 的 addVariableScanSubplot() 与二维 Plot mode 变更处理、src/twod/ui.js 的模式菜单和数据处理，以及 scripts/preview-browser-smoke.mjs 的浏览器回归。用户此前上传的 exp(1).zip 当前未出现在对话附件或可检索 Library 中；真实 CIQTEK Field–Power、Field–Delay、Field–Modulation Amplitude、Time–Field 样本验收仍待重新取得文件。样本文件不得复制到公开仓库。

## 频率校正 Target 模式修复

- 新建子图继续默认使用 `freqMode: local`、`localFreqMode: mean`。
- 用户切换全局频率模式或修改全局目标频率时，未显式编辑过局部频率设置的 1D 子图切换为继承全局设置；已显式选择 Local/None 或修改 Local target 的子图保留局部覆盖。
- 修改子图的 Local target mode、Local target / GHz 或本地频率确认项，会自动启用 Local alignment，避免目标值已编辑但模式仍处于 Inherit global 的情况。
- 频率表中的 `ν raw / GHz` 对一维磁场曲线开放编辑。CSV 等缺少源频率元数据的数据，必须先填写源微波频率；缺少源频率时缩放栏显示 `—`，不会伪装成已完成校正。
- 验收通过：预览分支数值/二维测试、Vite 构建、Chromium 频率校正与迁移前输出对照（[运行 39689863349](https://github.com/imasenHF/spinplot/actions/runs/39689863349)）；主站 Pages 发布（[运行 39690277099](https://github.com/imasenHF/imasenhf.github.io/actions/runs/39690277099)）；公开资源检查（[运行 39690395700](https://github.com/imasenHF/spinplot/actions/runs/39690395700)）和公开 Chromium 频率/二维交互测试（[运行 39690395696](https://github.com/imasenHF/spinplot/actions/runs/39690395696)）均通过。公开临时页面已同步；正式 `/spinplot/` 未修改。
