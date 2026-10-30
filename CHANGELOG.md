# Changelog

## Unreleased

- Refresh Current order and Variable scan derivative color swatches when the global or subplot palette changes, preserving explicitly assigned per-curve colors.

- Condense Variable scan power-fit UI copy: shorten section and checkbox labels, remove the long exclusion hint, compact measured-range/status text, and rename search bounds to Fit range / Min / Max while preserving blank-as-measured-range behavior in a tooltip.

- Center the selected line/marker glyph in Variable scan style controls by removing the scan-specific right padding and applying `text-align-last: center`; keep regular curve controls unchanged.

- Restyle per-curve line/marker selectors as compact curve-colored raised buttons without dropdown arrows; match the raised bevel treatment of the adjacent color picker and retain keyboard focus indication. Keep the style column at 56 px. Add independent color pickers to direct-2D Variable scan derived rows, including fit and excluded traces; preserve style/color settings when either control changes. Keep palette-derived colors when no override is stored.

- Widen the per-curve style column and use a compact custom dropdown arrow so line/marker symbols remain visible. Add an adjacent per-curve color picker; explicit colors are stored in the existing subplot `curveStyles` settings and override the palette for rendering and vector export while unset curves retain the selected palette.

- Compact the Export tab action area: use evenly spaced two-column buttons with a 44 px minimum height and consistent line spacing; align projection/scan export selectors and their buttons without stretching the buttons to the full selector-row height.

- Replace the raster PDF fallback with SVG-to-PDF vector conversion using `svg2pdf.js` and `jsPDF`. PDF retains vector paths and text objects, uses the design canvas physical dimensions, and is independent of raster DPI. Embed a subset Noto Sans SC font on demand for GB2312 Chinese, Greek, and common scientific symbols.
- Add a low-emphasis `dev` link beside the copyright/contact text in the bottom status bar, opening the isolated development preview without changing the formal entry.

## 0.10.0 — 2026-10-30

- Add per-subplot `Empty projection space` occupancy: `none / top / right / both`. A subplot without a corresponding projection can opt into the unused top margin shared by its row, the unused right margin shared by its column, or both.
- Keep projection visibility independent from layout occupancy. Occupancy never hides/disables a visible projection and preserves the subplot's natural title, g-axis, colorbar and legend margins.
- Apply the occupancy setting to 1D, 2D and Variable scan subplots. Default to `none` to preserve existing mixed-layout alignment; persist the setting per subplot.
- Retire the previous `plotFootprint` behavior, which coupled layout selection to projection visibility. Legacy `plotFootprint` values are discarded on load; project format 11 and config format 10 remain unchanged.
- Version the application as 0.10.0 through `package.json` and the Vite-injected titlebar version. Add a dedicated release record; project/config schema versions remain independent.
- Include the previously merged 2D Contour/3D Surface views, axis display modes, Variable scan feature extraction, power-saturation fitting, derived-curve Z-order and interface corrections in the 0.10.0 release record.
- Add unit and browser regression coverage for top/right/both occupancy, mixed 2D/1D row-column geometry, independent projection controls, legacy config migration, save/reload and export geometry.

## 0.9.2

- Give button rows vertical clearance and place Auto Z in its own action row.
- Remove repeated nested fold separators and indent child controls.
- Standardize all native checkboxes at 14 px with inline labels and a shared accent.
- Group projection compute ranges and intensity ranges into separate min/max rows.
- Keep projection visibility switches and titles full-width; group label coordinates and layout placement by purpose.
- Separate unrelated style and export fields and retain coherent axis range groups.

## 0.9.1

- Align wrapped field labels and standardize text input styling across the sidebar.
- Group axis title/distance and min/max/tick step rows consistently for X, Y and Z.
- Place the Processing noise range input below its label with full-width styling.

## 0.9.0

- Preserve six tabs; reorganize common 1D/2D subplot sections and scope-specific controls.
- Move canvas and figure title to Subplots; File menu owns project/config actions.
- Processing provides per-subplot noise selection using the existing shared settings.
- Group global/local axes, expose dataset dimensions/coordinate units, and track local precision/title/color overrides.
- Hide inapplicable processing, stacking and label controls; local axis edits disable range inheritance.
- Clearing 2D local limits restores coordinate extents instead of retaining a previous viewport.

## 0.8.6

- Global and subplot X/Y significant digits and automatic/decimal/scientific tick notation.
- Shared exponent annotations shorten small/large axes; automatic precision distinguishes adjacent ticks and removes trailing zeroes.
- Apply formatting to 1D/2D axes and projection intensity axes.

## 0.8.5

- Subplot, heatmap/stack and projection palettes use the Style dropdown with grouped swatch previews and selected states.

## 0.8.4

- Align Label mode and expanded Legend position captions and controls.
- Remove the separator above Legend position.

## 0.8.3

- Independent top/right projection, range-label and title visibility.
- Equal main frames with per-column auxiliary space, avoiding blank colorbar space after 1D panels.
- Narrow right projections use fewer intensity ticks.

## 0.8.2

- Constrain data-list grid children and wrap data tools in narrow sidebars.
- 2D subplots show a read-only Current data row with full-name tooltip.
- 2D summaries show dataset count, view mode and matrix dimensions.

## 0.8.1

- All equal grid spans share main-axis frame dimensions, including mixed 1D/2D and g on/off.
- Projection, colorbar, g-axis and outside-legend space reserved across matching cells.
- Screen and exported figures use the same frame geometry.

## 0.8.0

- CIQTEK 1D field/time and 2D field-delay, field-modulation amplitude, field-power and time-field sweeps.
- Second coordinates taken from trace parameters, with both signal channels preserved.
- Explicit ms/ns time units, dB attenuation and G modulation amplitude; unknown delay units remain unspecified.
- Time coordinates excluded from magnetic-field frequency correction and g conversion.
- Different physical axes open in separate subplots and export with coordinate metadata.
- Regression checks against all six supplied experiment files, without publishing experimental data.

## 0.7.1

- BES3T grid files optional when descriptor axis bounds are available; IDX axes need no grid files.
- Global Z/colorbar title, range, tick step, title distance and visibility controls.
- Local Z bounds share a row; colorbar titles hidden by default.

## 0.7.0

- Full-row projection gap controls with 20 px defaults.
- 2D g axis off by default; local g edits select local override.
- Stack interval only active in Stack view.
- Interactive projection coordinate/intensity axes; acquisition axes stay linked to the map.
- Range labels default inside top-left/top-right; position settings and legend positions are collapsed.
- Palette previews in per-subplot color controls.

## 0.6.0

- Open appends incoming datasets in new subplots; explicit Clear all data action.

- Integrate 2D ranges, Z/colorbar, palettes and projection exports into existing axes/style/layout/export controls.
- Center titles over the main map; omit filename fallback.
- Projection traces use the first palette color independently of the heatmap.
- Recognize physical acquisition axes; allow g on either magnetic-field axis with unit conversion and reserved spacing.
- Adjustable horizontal/vertical projection gaps.

## 0.5.0

- Add maximum, minimum and peak-to-peak projections alongside mean, RMS and sum.
- Independent horizontal/vertical range-label positions in each projection frame (percent of its own projection frame; values outside 0–100 position labels beyond the frame).

- MATLAB-style framed projections and colorbar, independent projection ranges and optional range labels.
- Continuous palettes share the application registry; Z input and colorbar wheel adjustment use one state.
- Restore standard subplot settings; explicitly identify 1D-only operations.
- Unify BES3T 1D/2D parsing for irregular axes and complex data with endian/length validation.

## 0.4.0

- Original Open auto-detects 2D datasets and creates independent subplots; per-subplot 2D options expand on import.
- Remove standalone 2D dialog and 250,000-cell cap. Canvas previews use pixels while projections use full data; vector export retains full cells.
- Save matrix data and 2D settings in unified project format 11.
- Verify 1,002,000-cell processing, cache, rendering and matrix restore.

## 0.3.0

- Add a separate 2D EPR viewer with CIQTEK and BES3T axes, heatmap/stack views, two projections, component selection, vector SVG and versioned 2D projects.
- Validate dimensions, monotonic axes, companion files and byte order. See docs/TWO_DIMENSIONAL.md for limits and verification.

## 0.2.4 — 2026-10-06

- 恢复蓝色渐变页头，品牌文字改为白色，保留金色点缀；图标采用24px白色方形底，SpinPlot字号改为14px。

## 0.2.3 — 2026-10-06

- 页头使用共享图标与单行 plastocyanin | SpinPlot 品牌文字，沿用蓝金配色和链接下划线交互。

## 0.2.2 — 2026-10-04

新增 Ctrl＋左键拖动平移 Y 轴范围，保持 Y 跨度及数据不变；遵循 Y 联动设置，支持 Undo。Shift＋左键平移 X。修饰键拖动优先于测距，不生成 ΔB 标记。

## 0.2.1 — 2026-10-04

ΔB 开关仅启用或退出测距模式，退出时保留已有标记。新增 Clear ΔB 按钮清除全部子图的测距标记；不关闭测距工具，支持撤销。取消未完成的拖动不生成标记。

## 0.2.0 — 2026-10-04

预览仅缩小超出工作区的图像，较小图像保持设计尺寸并居中。新增 Clear config，恢复默认配置并保留数据，支持撤销。布局保留预设并新增行数 ✖ 列数输入；每边 1–12，最多 64 个子图。

## 0.1.0 — 2026-10-04

首次公开发布。/SpinPlot/ 直接打开软件，旧 legacy 地址跳转至首页。提供现有数据读取、绘图、标注、基线、频率设置、测距及矢量导出功能。使用 Vite 构建和 GitHub Actions 发布。

已验证构建和入口加载；完整科研数据及交互验收待完成。PDF 中文字体仍有限制。应用版本与项目文件格式版本独立管理。

