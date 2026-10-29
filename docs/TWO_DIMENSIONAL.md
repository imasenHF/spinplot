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

Subplots with equal grid spans share the maximum required left/right/top/bottom margins. 1D coordinate frames therefore match 2D main maps in mixed figures; enabling a g axis does not shrink only that subplot. Projections, colorbars and outside legends keep their reserved space. Explicit unequal spans retain their intended size. This geometry applies to interactive views and every export format.

Top and right projections each have independent visibility, range-label, and title controls. Hiding a projection removes its accessory space. Mixed columns allocate the required projection/colorbar space per column while keeping all main axes the same size. The 2D data section shows the current dataset; narrow sidebar rows truncate long names with a full-name tooltip.

## Manual 1D curve groups as 2D data

For a subplot containing at least two 1D curves, the Plot mode menu offers exactly four modes: `Stack`, `Overlap`, `Heatmap` and `Variable scan (new subplot)`. Heatmap converts the selected curves into a 2D matrix; Variable scan creates a separate scan-correlation subplot while retaining the source plot. The previous `Overlay (1D)` and `Stack (1D)` return modes are removed from this menu; use Undo to reverse the conversion when needed. The `Scan variable · Heatmap Y axis` editor sits directly below Plot mode and is collapsed by default. It remains available in Heatmap and Variable scan modes. It contains the variable name, optional unit, and either equal spacing (`Start`, `Step`) or an explicit array; fields apply changes directly without a separate Apply button. Defaults are `Subplot index`, blank unit, start 1, step 1. Heatmap displays the Y-axis title by default. For curve-derived Heatmaps, the title uses the scan-variable name. Array values are entered in current curve order, stored by curve ID, and remain attached to their source curves when reordered; heatmap rows are sorted numerically by scan-variable value. A blank unit omits unit parentheses from the axis label.

## Projection features and CW EPR power saturation (preview branch)

These features are implemented in `preview/modularization-phase1-20261009`, not in the released `main` branch. The independent preview site may lag behind the branch until the static snapshot has been synchronized and deployed.

### Shared peak-to-peak features

- `src/twod/saturation.js` computes `Spp = max(signal)-min(signal)` and `Δx = abs(x_at_max-x_at_min)` from finite samples within the selected interval. A constant signal or insufficient finite samples produces an explicit invalid result. For an isolated CW EPR first-derivative line with the magnetic-field axis, `Δx` is `ΔBpp` and retains the original field unit.
- Heatmap/Contour/3D top and right projection panels have independent dropdowns for None, Peak-to-peak amplitude, Peak-to-peak linewidth, and Both. The feature values are numeric readouts extracted from the already aggregated projection profiles; they are not additional scan-dependent curves. Max/min must belong to the resonance being investigated; narrow the calculation interval for complex or overlapping spectra.
- Variable scan offers Existing statistic (default), Peak-to-peak amplitude, Peak-to-peak linewidth and Amplitude + linewidth. It extracts features separately from every source trace over the `scanStatisticMin/Max` interval. In dual mode amplitude uses the left Y axis and linewidth uses an independent right Y axis with its physical unit. The original mean, max, min, ptp, rms and sum statistics remain supported. Original matrices are immutable.

### Variable scan control layout and derived curves (preview UI)

- The Scan panel has one Signal feature selector: Statistic, Peak-to-peak amplitude, Peak-to-peak linewidth or Both. The Statistic dropdown appears only when Statistic is selected.
- The selected field interval and characteristic power parameter bounds each have paired Start/End inputs. With no manual power bounds, the boxes display the automatic search bounds as placeholders.
- Fitting controls are grouped under a collapsible section. Each enabled model displays its equation followed by read-only characteristic power, A, C, RMSE and R² fields. The numerical solver remains fixed to bounded logarithmic search with local refinement and conditional linear least squares. No additional fitting algorithm is exposed at this stage.
- The source matrix stays in Current data; beneath it, the Variable scan derived statistic/feature/fit curves appear as indented child rows. Each child row has its own line and marker style, with stable internal virtual identifiers and normal project save/reload support. The original dataset itself is unchanged.
- Browser regression covers the new grouping, read-only results, auto-bound placeholders, derived styles and project persistence. See [40901814549](https://github.com/imasenHF/spinplot/actions/runs/40901814549).

### Fitting in Variable scan only

- The fitting controls exist only in Variable scan. Peak-to-peak amplitude and linewidth have independent enable switches; both fitted curves may appear together with their respective observed points/lines. Fitted curves are dashed. Fitting requires at least four distinct, valid positive powers without a constant offset or five with a free offset.
- Amplitude model: `Spp(P) = A sqrt(P)/(1+P/P_half)+C`. Linewidth model (homogeneous power broadening assumption): `ΔBpp(P) = A sqrt(1+P/P_sat)+C`. Do not infer that `P_half` and `P_sat` are equal or that both models are valid for every physical line shape.
- Model estimation uses a bounded logarithmic power search with locally refined steps. For each candidate characteristic power the scale and optional constant offset are obtained by linear least squares. User settings include on/off per feature, fit offset, excluded original zero-based trace indices, and optional bounds on the characteristic power (mW). Displayed results contain characteristic power, amplitude parameter, offset, RMSE, R², and identifiability/boundary notices. Covariance-derived parameter uncertainty is not currently implemented.
- Scans in dB attenuation are converted to mW with `P=P0 * 10^(-D/10)` using zero-attenuation reference power `P0`. Calibrated power axes (mW/W/µW) can be used or converted without repeating attenuation conversion. The acquired scan coordinates are retained separately.
- The Export tab includes `Export scan features CSV` for the derived Variable scan, including source trace index, acquired scan coordinate, selected power coordinate, amplitude/linewidth, fitted and residual values, inclusion status, and fit parameters/diagnostics. The existing ordinary Display CSV continues to represent its original set of 1D curves.
- Project save/reload retains feature mode, fit switches, analysis range, power reference, excluded indices and search bounds; fit values are deterministically recalculated from the preserved source arrays rather than stored as a separate immutable result snapshot.
- Verification: synthetic per-trace tests plus Chromium browser check of 13 power-dependent first-derivative signals, both axes, two fits, CSV and project reload. The reviewed build workflow [40891497754](https://github.com/imasenHF/spinplot/actions/runs/40891497754) passed. Real instrument data, overlapped resonance lines, noise-driven extrema drift, uncertainty estimates and physical calibration remain separate validation tasks.

## Interface organization

The six tabs remain Data, Processing, Subplots, Axes, Style and Export. Figure title and canvas controls are part of the Subplots layout area. File owns project/config operations; existing toolbar shortcuts and file formats remain supported.

Each subplot shares the Data → Plot mode → Axes → g axis → Colors → Legend & labels → Projections (2D) → Annotations → Processing parameters → Advanced layout order. X/Y/Z have nested axis groups. Range inheritance controls only bounds and tick step; precision/notation/title overrides have their own explicit values. Blank local 2D bounds restore full coordinate extents.

Processing provides per-subplot noise regions using the same subplot settings as selection on the plot. Baseline and amplitude scaling currently apply to 1D curves; 2D displays its chosen real/imaginary/magnitude signal directly. The interface states this scope and hides unsupported controls. Projection statistics and calculation ranges are separated into top and right groups. Range-label positions remain collapsed; projection spacing belongs to Advanced layout.
