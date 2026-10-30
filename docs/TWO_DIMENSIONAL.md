# SpinPlot — Two-dimensional EPR

更新日期：2026-10-08（Asia/Shanghai）。以下按当前有效功能描述；逐版本变化见 [CHANGELOG.md](../CHANGELOG.md)，完整状态见 [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)。

Use the existing Open Data control for 1D and 2D files. Each recognized 2D dataset creates an independent subplot. Its 2D details section opens automatically. Supported formats: CIQTEK transient and field-power EPR; BES3T DSC/DTA, with XGF/YGF for IGD axes. Multiple 1D and 2D datasets may be selected together.

Use the Plot mode menu for Heatmap, Stack, Overlap and Variable scan. Heatmap remains the default for imported 2D data. Overlap draws selected traces on a shared X coordinate axis, with the scan coordinate recorded in each curve label; the every-N-traces setting controls decimation. Variable scan is a separate derived subplot created explicitly by choosing Variable scan (new subplot) in a 2D subplot's Plot mode menu. It is not created on import and does not replace the original map or its right Y projection. The new subplot is initially placed to the right of its source when the layout allows; otherwise it is appended as a new row. It computes one statistic per scan coordinate by applying the same sample-reduction function as the right projection over an independently selected X-coordinate interval. The settings are stored as `scanStatistic`, `scanStatisticMin` and `scanStatisticMax`; when axis orientation matches, creation initializes them from the source map's right-projection statistic and X interval, after which they remain independent of the map's `yMode` and `projectionXMin/Max`. Variable scan hides the 2D top/right projection controls and shows only the scan axis, statistic, statistic interval and optional power calibration; newly created scan subplots have no title by default. Right-projection titles wider than the plotting area wrap into a variable-name line and a `projection (statistic)` line, with font size adjusted to fit the available width. A single curve using a continuous palette takes the palette's starting color; multiple curves remain distributed across the palette. For dB attenuation sweeps, the scan subplot converts attenuation A to microwave power with P(A) = P₀ × 10^(-A/10), where P₀ is the reference power at 0 dB attenuation. The UI requires only P₀. If source metadata provides a power value paired with a nonzero attenuation A₀, that pair is normalized to its equivalent zero-dB reference power. Projection CSV is in Export, selected per subplot. Projection methods include mean, maximum, minimum, peak-to-peak, RMS and sum. Default X projection is a sample mean over selected Y; Y projection is sample RMS over selected X, following the MATLAB reference. These are not coordinate-weighted integrals. RMS discards the sign.

No cell-count restriction is imposed. Preview renders to canvas pixels with nearest-cell selection using physical axis coordinates, including nonuniform coordinates. Every selected data point contributes to projections and color bounds. Preview resampling never modifies raw arrays. Large vector SVG/PDF exports preserve cells and may produce large files and take substantial time. Other image exports use canvas rendering. Actual capacity depends on browser memory and file size.

CIQTEK transient time is ns and field is G. The viewer swaps time-first data to field-horizontal by default. Field-power attenuation comes from params.power in dB, with no guessed coordinates. Unknown BES3T axis units remain as supplied.

Save Project includes matrices and 2D settings in SpinPlot project format 11. Older 1D project versions 9 and 10 remain readable. Clear config restores default 2D settings while retaining data. The 2D fold state is stored in config. Wheel zoom, Shift X pan, Ctrl Y pan use 2D bounds. Double click fits both 2D axes. One-dimensional noise selection and ΔB marking do not operate on 2D maps.

Validation: npm run build; node src/twod/core.test.js; node src/twod/large.test.js. Synthetic tests cover 1,002,000 cells, full mean/RMS projections, caching, pixel-based preview and matrix restoration; axis transpose and endian decoding. Real instrument files and full browser interaction still require validation.

## 独立预览：等高线、三维曲面与三种坐标模式（2026-10-29）

- Contour 根据原始物理 X/Y 坐标以 marching squares 插值等值线；3D surface 根据同一矩阵构建三角网格，支持鼠标旋转及默认折叠的 Plot → View 视角设置。绘制/导出不改写源数组。
- 主图 Y、二维 Heatmap / Contour / 3D 的 Z 及 Top/Right 投影强度轴，分别支持 **Linear / Log10（必要时 SymLog）/ Scientific**。Linear 按数值线性分布，Scientific 仍使用线性位置、以科学计数法显示刻度。Log 模式对正值采用 Log10；当显示域含零或负信号时，以符号保留的 SymLog 映射零点和正负强度，过渡尺度由显示范围动态决定（约为最大绝对值的 1%）。不得自动取绝对值、平移数据或偷偷删除负信号。
- 切换坐标模式时按相应子图数据自动拟合并填写 min/max。Auto Z / 色标双击使用当前显示的 X/Y 范围内有效 Z 点计算 min/max，结果写入数值输入框；双击热图主体单独重置 X/Y，不覆盖 Z。
- 二维数据本身不会因为选择坐标模式、Auto Z 或投影显示格式而执行基线减除。现有 1D Region 基线策略及原生二维矩阵处理边界**保持原样**，此次不引入“全矩阵 Z 均值”默认基线。二维投影统计仍基于源矩阵而非显示映射。
- 保存项目和配置时记录轴模式、相机视角和实际界限；读取旧项目时未定义的新字段使用已有兼容默认值。测试：`src/twod/visualization.test.js`、`src/plotting/axis-scale.test.js` 和 Chromium 回归。最新完整通过 [40745286984](https://github.com/imasenHF/spinplot/actions/runs/40745286984)。

## Layout and controls

Projection frames have coordinate ticks and intensity tick labels. Layout follows the uploaded MATLAB reference: X projection above the map, Y projection to the right, then colorbar. Projection X/Y selection ranges are stored separately from display X/Y bounds; labels are shown inside the projection plots by default and may be switched off. Colorbar min/max may be entered or adjusted with the wheel over the bar. Auto Z restores automatic min/max. All gradient palettes use the shared application palette registry.

The ordinary subplot panel remains visible. Subplot title, global font sizes and line width, frame/grid, axis overrides, Y tick/title visibility, annotations in acquisition coordinates, color override, layout and subplot ordering apply to 2D. The Style → Typography panel has a separate Projection titles size (default 11 px) shared by the top and right projection titles; it is independent of tick-label size. Right-projection wrapping and fit-to-width behavior use this setting as their starting size. The existing frequency configuration provides the frequency for g conversion. g may be displayed for either magnetic-field axis; G, gauss, Oe, mT and T are converted consistently. The g-axis layout reserves space between projection and map. Signal processing of 1D traces does not alter the matrix. Heatmap palette has a local selector, or may inherit any continuous subplot/global palette; categorical palettes fall back to turbo for the heatmap.

BES3T now shares one 1D/2D reader, including irregular XGF/YGF coordinates, REAL/CPLX interleaving, BIG/LIT byte order and C/S/I/F/D formats. Missing companions, wrong data lengths, incompatible real/imaginary formats, 3D and multichannel layouts are reported explicitly. No automatic acquisition-gain/scan/power normalization is performed. The uploaded private loaders identify future formats (Bruker ESP, JEOL, Magnettech, Adani and others); these are reference material only, not current supported formats.

Checks: node src/twod/bes3t.test.js additionally covers independent projection intervals, both endian sequences, descending/irregular axes, complex data, 1D irregular field axes and every continuous palette.

## Shared workflow

Open appends new files to new subplots when data are already loaded. Existing subplot settings and annotations remain. Clear all data empties the session; Clear config retains imported data. Titles are centered over the main map and never fall back to the source filename. Projection lines use the first color of their selected categorical/continuous palette; heatmap and stack gradients are set separately. The file axis labels and units identify field, time, power/attenuation, angle, temperature and modulation amplitude. Modulation amplitude is not treated as a field axis for g conversion.

Checks: node src/twod/integration.test.js covers acquisition types, unit conversion, g in both orientations, map-centered titles, projection palettes and CSV. Live browser checks covered shared folds, g spacing, projection export placement, append (two datasets/two subplots) and clearing (zero datasets).

## Controls and interaction

Projection gaps default to 20 px in two half-width fields spanning one row. 2D g axes start off with local settings; edits to local g fields select local override. Stack every N traces is enabled only in Stack view. Range labels start inside the top-left of the upper projection and top-right of the right projection. Label position and legend position folds start closed. Subplot palette selectors show the selected palette swatch.

Wheel zoom and Shift/Ctrl pan operate in projection frames as in the main frame. Upper projection X and right projection Y are the same acquisition coordinates as the map and always remain linked. The other projection axes are independent intensity ranges, with automatic or manual limits in Projections. Double click restores the selected projection intensity and acquisition coordinate axes. These display controls do not change the independent range used to calculate projection statistics.

### Z axis and coordinate grids

Axes exposes the colorbar title, title distance, Z range, tick step and tick visibility. Titles are hidden by default. Local Z bounds share a row and automatically select local override when edited or adjusted with the colorbar wheel. Existing saved local Z bounds remain local.

IDX axes use DSC bounds without XGF/YGF. IGD axes use an available grid file; when absent, valid axis MIN/WID bounds provide a uniform coordinate fallback. Missing both the grid and bounds reports an error.

### CIQTEK experimental EPR files

Recognized types: CW 1D Field/Time Sweep; CW 2D Field-Power, Field-Delay, Field-Modul.Amp., Time-Field Sweep; Transient 2D Tr-EPR. Coordinates are read from ReData and each trace params, not its ordinal number. Imaginary channels and trace frequencies are retained. Rows are sorted with their channels; duplicate/missing coordinates and mismatched trace grids are rejected. Unknown experiments report an error instead of silently reading the first trace.

Time units follow dataStore.xAxisName (CW examples: ms; transient default: ns). Power trace params record attenuation in dB. Modulation amplitude uses G. Field-delay examples do not declare a delay unit, so the original values remain unitless with an import notice.

Run `node src/twod/ciq.test.js /path/to/extracted/experiments` for exact comparison of coordinates and both signal channels with the six supplied examples. Private input data are not included in the repository.

### Consistent main frames

Subplots sharing a row or column use the maximum required auxiliary margins by default. This keeps 1D coordinate frames aligned with 2D main maps in mixed figures; enabling a g axis does not shrink only that subplot. Projections, colorbars and outside legends retain their own reserved space. Explicit unequal spans retain their intended size. The same geometry calculation is used for interactive views and exports.

Top and right projections each have independent visibility, range-label and title controls. In a mixed layout, hiding a projection on one subplot does not remove the shared row/column margin required by another subplot. Each subplot therefore exposes an `Empty projection space` setting:
- `none` (default): retain the shared margin and keep the main plotting frame aligned.
- `top`: when this subplot has no top projection, use the unused top-projection margin shared by its row.
- `right`: when this subplot has no right projection, use the unused right-projection margin shared by its column.
- `both`: occupy both available directions.

The setting only consumes the difference between the shared margin and this subplot's natural inset. A projection visible on the same subplot always retains its space. Natural insets for title, g axis, colorbar and legend remain intact; right occupancy does not consume the colorbar. The control is available to 1D, 2D and Variable scan subplots. It does not toggle or disable projection controls. The optional `emptyProjectionSpace` field is saved per subplot; absent values default to `none`. The former `plotFootprint` field is ignored and removed during config load. Project format 11 and config format 10 remain unchanged.

The 2D data section shows the current dataset; narrow sidebar rows truncate long names with a full-name tooltip.

## Manual 1D curve groups as 2D data

For a subplot containing at least two 1D curves, the Plot mode menu offers exactly four modes: `Stack`, `Overlap`, `Heatmap` and `Variable scan (new subplot)`. Heatmap converts the selected curves into a 2D matrix; Variable scan creates a separate scan-correlation subplot while retaining the source plot. The previous `Overlay (1D)` and `Stack (1D)` return modes are removed from this menu; use Undo to reverse the conversion when needed. The `Scan variable · Heatmap Y axis` editor sits directly below Plot mode and is collapsed by default. It remains available in Heatmap and Variable scan modes. It contains the variable name, optional unit, and either equal spacing (`Start`, `Step`) or an explicit array; fields apply changes directly without a separate Apply button. Defaults are `Subplot index`, blank unit, start 1, step 1. Heatmap displays the Y-axis title by default. For curve-derived Heatmaps, the title uses the scan-variable name. Array values are entered in current curve order, stored by curve ID, and remain attached to their source curves when reordered; heatmap rows are sorted numerically by scan-variable value. A blank unit omits unit parentheses from the axis label.

## Projection feature extraction and saturation fitting (merged into main, 2026-10-30)

These capabilities were developed on `preview/modularization-phase1-20261009` and merged into formal `main` by PR #1 on 2026-10-30. The independent static preview is synchronized separately.

### Top and right projection semantics

- `src/twod/saturation.js` defines `Spp = max(signal) − min(signal)` and `Δx = abs(x_at_max − x_at_min)` for finite samples in an explicit interval. For an isolated CW EPR derivative line with a magnetic-field X axis, `Δx` is `ΔBpp` and has the same magnetic-field unit. A constant trace or insufficient samples does not have a defensible width.
- **Top projection:** `xMode` combines signal values across the scan-variable Y axis to construct an X-coordinate profile. A separate `Top projection feature` option may annotate the peak-to-peak amplitude, linewidth, or both measured on the *resulting aggregate profile*. This is one or two scalar readouts.
- **Right projection:** `yMode` processes every acquired X-axis trace independently at each Y scan coordinate. Alongside Mean/Maximum/Minimum/RMS/Sum/Peak-to-peak amplitude, the method includes `Peak-to-peak linewidth` and `Amplitude + linewidth (two scales)`. These calculate physical X-coordinate extrema spacing *for each row*, not the extrema separation along the already aggregated right projection. The dual method plots two scan-dependent profiles with independent horizontal scales; amplitude uses the bottom scale, linewidth uses the top scale and carries the X-axis unit. There is no separate, misleading scalar `Right projection feature` selector. Existing `yMode` methods keep their original calculations.
- Right-projection CSV appends the per-scan linewidth and source X-coordinate unit when dual amplitude + linewidth mode is active. The original three-column CSV format is unchanged for legacy modes.

### Variable scan measurement and model controls

- Variable scan displays **one Measurement selector**: Mean, Maximum, Minimum, RMS, Sum, Peak-to-peak amplitude, Peak-to-peak linewidth, and Amplitude + linewidth. It retains legacy `scanFeatureMode/scanStatistic` settings for old project compatibility. A saved `Statistic / ptp` project preserves its original signal statistic until saturation fitting is explicitly activated; the UI presents one amplitude selection rather than two equivalent menus.
- The field interval uses a paired Start/End input. The model-specific controls appear in a collapsible `Power saturation fitting` section, not as a separate Plot mode. Models are rendered as native MathML with read-only characteristic power, A, C, RMSE and R² fields. If offset fitting is disabled, C is labeled fixed. The fixed bounded logarithmic search solver is described by a help `?` control, not shown as an ordinary editable setting.
- Users may choose `Exclude points from fit` to uncheck individual measurements labeled by source trace index, original scan coordinate and, where applicable, microwave power. Exclusion does not delete the original data or the drawn observation. Omitted observations appear separately as open-diamond markers; the exported feature CSV contains per-feature inclusion status. Point selections are retained through `scanFitExcluded`, and the list can be reset to include all measurements.
- The **measured microwave power range** is displayed separately. When no bounds are entered, characteristic power search is limited to the powers of currently included valid measurements: `[P_min, P_max]`, not `[P_min / 100, P_max × 100]`. The range controls show the effective bounds as placeholders; manual bounds permit explicit extrapolation and boundary warnings still apply.
- Amplitude model: `Spp(P) = A sqrt(P)/(1+P/P_half) + C`. Linewidth model, conditional on homogeneous power broadening: `ΔBpp(P) = A sqrt(1+P/P_sat) + C`. `P_half` and `P_sat` are independently fitted, not assumed equal. Fitting uses the bounded logarithmic search and a linear least-squares solution for A and optional C for each trial characteristic power. At least four distinct valid positive powers are required (five for a free C).
- dB attenuation uses the zero-attenuation reference `P0` and `P = P0×10^(−D/10)`. Calibrated power scan coordinates (mW/W/µW) can be used without a second attenuation conversion.
- The source matrix is displayed once under `Current data`. Derived Statistic, amplitude, linewidth, fitted curves and any excluded-point marker series appear as indented left-hand entries, with independent line/symbol selectors in the *right* Style column (stable virtual IDs −100 to −106). The original raw matrix is not replaced. The redundant `Scan style` selector is hidden for direct 2D scan sources; old manual-1D-derived scans keep their original style control for compatibility until their own derived-curve inventory can be refactored. Default measured features use line+symbols, fits use dashed lines; the default legend is placed outside the top of the plot to avoid obscuring data.
- Export includes the dedicated `Export scan features CSV` with source index, scan and power coordinate, both physical features, fit values/residuals, inclusion flags, fitted parameters and diagnostics. Project save/reload preserves chosen measurements and settings; numerical fits are deterministically recomputed and are not separately serialized as immutable snapshots.

### Variable scan derived-curve Z-order (2026-10-30 preview)

For directly imported 2D datasets, the Current data source matrix is fixed. Every indented derived Statistic/amplitude/linewidth/fit/excluded-point row supports HTML5 drag/drop, as in ordinary Current order, and keyboard Alt+ArrowUp/Down. Rows from top to bottom form the actual back-to-front drawing sequence; a lower entry is painted later and is visible on top of overlapping earlier curves. Its compact Style selection stays linked to the same negative virtual curve identity and moves with the row.

The pure `src/twod/scan-order.js` module normalizes and updates stable ID order `-100` through `-106`. Direct-2D Variable scan stores the selected order in `sp.scanDerivedOrder` (subplot project/config state), which is optional in legacy project files; no serialized field implies the original canonical order. Disabled and currently invisible feature IDs keep their ordering positions so switching features/fits and showing excluded points does not discard edits. This changes visual layering only; the acquired matrix, feature extraction, power fitting and style identities are unmodified. The same ordered `curves` model drives Canvas, legend and vector exports. Preexisting manual 1D curve ordering remains unchanged.

Numerical tests `src/twod/scan-order.test.js` and the Chromium project test cover drag/drop, keyboard reorder, right style column synchronization, actual SVG/legend order, project serialization and reload. Full preview CI: [40929024040](https://github.com/imasenHF/spinplot/actions/runs/40929024040).

### Compact Curve Style and explicit Linear notation (2026-10-30 preview)

- Directly imported 2D Heatmap/Contour/3D source datasets do not have an individual 1D line style. Their `Current data` list therefore has **one full-width column** and the otherwise unrelated `Scan style` control is hidden. This does not remove the palette, Z scale, Top/Right projection settings, or source matrix.
- In direct-2D Variable scan mode, every derived statistic/feature/fit curve has an individual compact **34 px glyph selector** in the right Style column. The selector uses the same line/marker glyph options as ordinary 1D curves instead of text labels. Both data and style columns use 24 px rows, 2 px inner padding, equal visible heights, and synchronized scrolling. Saved per-curve styles and the existing derived virtual IDs are retained. Legacy manual-1D-derived scan mode keeps its existing Scan style control.
- If the user changes the Scan axis to the acquired non-power variable, `Power saturation fitting` closes automatically without clearing the fit settings; when power mode is restored an enabled fit is expanded. dB attenuation values are not mislabeled as measured mW. `Exclude points from fit` uses the same plain nested details styling as other advanced controls; the mathematical formula parentheses use nonstretching MathML delimiters and a slightly smaller font.
- A selected **Linear** mode always formats Y-axis, Top/Right projection scale, and Z colorbar ticks in ordinary decimal notation, even if the global tick formatter would otherwise choose an exponent. Choosing **Scientific** explicitly enables exponent notation, while Log10/SymLog still use their original mapping. Ordinary X-axis notation is unchanged.
- Current numerical, browser, old-project and reference-image/export checks are recorded in [CI 40923593424](https://github.com/imasenHF/spinplot/actions/runs/40923593424). Public static preview deployment is tracked in [Pages 40924052918](https://github.com/imasenHF/imasenhf.github.io/actions/runs/40924052918). 阶段 B 的正确语义与验收要求见上方 `Consistent main frames`；它只改变主绘图区占用的版面，不修改原始数据或投影统计。

### Validation and limitations

- The regression suite checks independent right-projection linewidth calculation, reversed field coordinates, legacy PTP values, constant traces, synthetic saturated signals, dual axes, excluded-point interaction, model markup, project persistence, CSV, SVG and reference-compatible builds. [Full regression 40912092209](https://github.com/imasenHF/spinplot/actions/runs/40912092209) passed before the final documentation-only updates.
- Complex overlapping lines, extrema distorted by noise, uncertainty/covariance estimates and real-instrument physical calibration remain separate scientific verification tasks. 真实复杂谱线、极值受噪声影响的情况、不确定度/协方差估计和真实仪器物理校准仍需独立科学验证。

## Stage B correction: empty projection-space occupancy (0.10.0 candidate)

The first `plotFootprint` implementation merged in PR #1 coupled layout selection to projection visibility. That did not match the intended use. The corrected model separates projection display from the use of blank accessory space.

Each subplot stores an optional `emptyProjectionSpace` value:
- `none` (default): retain shared row/column margins and keep the main plotting frame aligned.
- `top`: when this subplot does not display a top projection, use the unused top-projection margin shared by its row.
- `right`: when this subplot does not display a right projection, use the unused right-projection margin shared by its column.
- `both`: occupy both available directions.

The setting only consumes the difference between the shared margin and this subplot's natural inset. If the corresponding projection is visible on the same subplot, its space is retained. Natural insets for subplot titles, g axes, colorbars and legends remain intact; right occupancy does not consume colorbar space. The control is available to 1D, 2D and Variable scan subplots. It does not toggle or disable projection controls.

Implementation: `src/plotting/footprint.js` normalizes the setting and resolves per-subplot margins; `src/plotting/oned.js` applies the resolved margins after row/column allocation; `src/twod/ui.js` exposes actual top/right projection visibility in the natural inset model; `src/main.js` provides the control and legacy config cleanup. The former `plotFootprint` property is removed on config load. Project format 11 and config format 10 remain unchanged; missing `emptyProjectionSpace` values default to `none`.

Regression covers preset normalization, top/right/both margin consumption, visible-projection protection, colorbar retention, 1D behavior, a mixed 2×2 2D/1D browser layout, project save/reload and export canvas size. Full CI and browser results are tracked in the correction branch Actions. This is a candidate change and is not yet part of formal `main`.


## Interface organization

The six tabs remain Data, Processing, Subplots, Axes, Style and Export. Figure title and canvas controls are part of the Subplots layout area. File owns project/config operations; existing toolbar shortcuts and file formats remain supported.

Each subplot shares the Data → Plot mode → Axes → g axis → Colors → Legend & labels → Projections (2D) → Annotations → Processing parameters → Advanced layout order. X/Y/Z have nested axis groups. Range inheritance controls only bounds and tick step; precision/notation/title overrides have their own explicit values. Blank local 2D bounds restore full coordinate extents.

Processing provides per-subplot noise regions using the same subplot settings as selection on the plot. Baseline and amplitude scaling currently apply to 1D curves; 2D displays its chosen real/imaginary/magnitude signal directly. The interface states this scope and hides unsupported controls. Projection statistics and calculation ranges are separated into top and right groups. Range-label positions remain collapsed; projection spacing belongs to Advanced layout.
