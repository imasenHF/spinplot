# Changelog

## Unreleased (preview branch)

- Preserve Local mean as the default for new subplots; when the global frequency mode or target is changed, subplots without an explicit local override inherit the global setting, while explicit local overrides remain active.
- Make the source microwave frequency editable for 1D magnetic-field datasets, including CSV files without frequency metadata; show no scale until a valid source frequency is supplied.
- Add Chromium coverage for default Local mean, global Manual target, local Manual target, and CSV source-frequency entry.

- Restore automatic Z limits when double-clicking the 2D colorbar after wheel zoom; preserve the existing heatmap-body double-click behavior for X/Y axes.
- Add Chromium regression coverage for colorbar wheel zoom, colorbar double-click reset, and heatmap X/Y reset on both the local preview build and published temporary preview.

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

