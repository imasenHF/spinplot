import {
  axisEps,
  niceTicks,
  ticksWithStep,
  minorTicks,
  configuredGTicks,
} from "../processing/axis.js";
import {
  clamp,
  median,
  ptp,
  finiteNum,
  parseNumberList,
  parseRegions,
} from "../core/numeric.js";
import { axisKind, gFromB, BFromG } from "../processing/axis.js";
import { tickFormatter } from "../twod/ticks.js";
import { positiveAxisDomain, axisCoordinate, scaledTicks } from "./axis-scale.js";
import * as TwoD from "../twod/ui.js";
import { applyPlotFootprint, fitMainRows } from "./footprint.js";

export function createDisplayCurves(curves, sp) {
  let offsets = new Array(curves.length).fill(0);
  if (sp.mode === "stack") {
    if (sp.offsetMode === "manual") {
      const vals = parseNumberList(sp.manualOffsets);
      offsets = curves.map((_, i) => vals[i] ?? 0);
    } else {
      const step =
        Math.max(0, ...curves.map((c) => ptp(c.y) || 0)) *
        (Number.isFinite(Number(sp.offsetScale))
          ? Number(sp.offsetScale)
          : 1.2);
      offsets = curves.map((_, i) => i * step);
    }
    if (Number(sp.offsetDirection) < 0) offsets = offsets.map((v) => -v);
  }
  return curves.map((c, i) => ({
    ...c,
    offset: offsets[i],
    yd: c.y.map((v) => v + offsets[i]),
  }));
}

export const applyStackOffsets = createDisplayCurves;

export function resolveCurveStyle(sp, index) {
  const configured = sp?.curveStyles?.[index];
  const scanStyle = sp?.derivedFromTwoD && sp.scanCurveStyle;
  const value = index < 0 && configured ? configured : (scanStyle ? { style: sp.scanCurveStyle } : configured || {});
  if (!configured && !scanStyle) return { mode: "line", symbol: "circle", filled: false, lineDash: [], style: "line" };
  const style = value.style;
  if (typeof style === "string") {
    const lineOnly = { line: [], "dashed-line": [6, 3], "dotted-line": [1.5, 2.5] };
    if (Object.hasOwn(lineOnly, style)) return { mode: "line", symbol: "circle", filled: false, lineDash: lineOnly[style], style };
    const shapeOnly = style.match(/^(filled-)?(circle|square|triangle|diamond)$/);
    const combined = style.match(/^(solid|dashed|dotted)-(filled-)?(circle|square|triangle|diamond)$/);
    if (shapeOnly) return { mode: "symbols", symbol: shapeOnly[2], filled: !!shapeOnly[1], lineDash: [], style };
    if (combined) return { mode: "both", symbol: combined[3], filled: !!combined[2], lineDash: combined[1] === "dashed" ? [6, 3] : combined[1] === "dotted" ? [1.5, 2.5] : [], style };
  }
  const mode = ["line", "symbols", "both"].includes(value.mode) ? value.mode : "line";
  return { mode, symbol: ["circle", "square", "triangle", "diamond"].includes(value.symbol) ? value.symbol : "circle", filled: !!value.filled, lineDash: null, style: null };
}

export function markerSampleIndices(length, maxMarkers = 80) {
  const count = Math.max(0, Math.floor(Number(length) || 0));
  if (!count) return [];
  const limit = Math.max(1, Math.floor(Number(maxMarkers) || 80));
  const stride = Math.max(1, Math.ceil(count / limit));
  const indices = [];
  for (let i = 0; i < count; i += stride) indices.push(i);
  if (indices[indices.length - 1] !== count - 1) indices.push(count - 1);
  return indices;
}
export function autoRangeX(curves) {
  let lo = Infinity,
    hi = -Infinity;
  for (const c of curves)
    for (const v of c.B)
      if (Number.isFinite(v)) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
  return Number.isFinite(lo) ? [lo, hi] : [0, 1];
}
export function rangeY(curves, xmin, xmax) {
  let lo = Infinity,
    hi = -Infinity;
  for (const c of curves)
    for (let i = 0; i < c.B.length; i++)
      if (c.B[i] >= xmin && c.B[i] <= xmax && Number.isFinite(c.yd[i])) {
        const v = c.yd[i];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
  if (!Number.isFinite(lo)) return [-1, 1];
  let s = hi - lo;
  if (!(s > 0)) s = Math.max(Math.abs(lo), 1);
  return [lo - 0.1 * s, hi + 0.1 * s];
}

export function displayRange(curves) {
  return rangeY(curves, -Infinity, Infinity);
}

export function renderFigure(
  canvas,
  logicalW,
  logicalH,
  pixelScale,
  isExport,
  { model: preparedModel, cells: preparedCells, controls, view: state, style },
) {
  const $ = (id) => controls[id];
  const { theme, font } = style;
  const plotTheme = () => theme,
    getFont = () => font;
  const subplotGConfig = (sp) => preparedModel.find((m) => m.sp === sp).gConfig;
  const displayFrequency = (sp) =>
    preparedModel.find((m) => m.sp === sp).frequency;
  const curveColor = (i, n, sp) =>
    preparedModel.find((m) => m.sp === sp).colors[i];
  const subplotIndex = (sp) => preparedModel.findIndex((m) => m.sp === sp);
  const curveStyle = resolveCurveStyle;
  function drawMarker(ctx, x, y, radius, shape, color, background, filled = false) {
    const vertices = shape === "square"
      ? [[-1,-1],[1,-1],[1,1],[-1,1]]
      : shape === "triangle"
        ? [[0,-1.15],[1,0.9],[-1,0.9]]
        : shape === "diamond"
          ? [[0,-1.2],[0.9,0],[0,1.2],[-0.9,0]]
          : Array.from({ length: 12 }, (_, i) => {
              const angle = (2 * Math.PI * i) / 12;
              return [Math.cos(angle), Math.sin(angle)];
            });
    ctx.save();
    ctx.beginPath();
    vertices.forEach(([dx, dy], i) => {
      const px = x + dx * radius, py = y + dy * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.lineTo(x + vertices[0][0] * radius, y + vertices[0][1] * radius);
    ctx.fillStyle = filled ? color : background;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }
  function drawAxisLine(ctx, x1, y1, x2, y2, color, width = 1.2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function legendBoxSize(ctx, curves, size, font) {
    ctx.font = `${size}px ${font}`;
    const maxText = Math.max(
        0,
        ...curves.map((c) => ctx.measureText(c.name).width),
      ),
      rowH = Math.max(8, size * 1.35),
      lineLen = Math.max(14, size * 1.85),
      gap = Math.max(4, size * 0.5),
      pad = Math.max(4, size * 0.45);
    return {
      w: lineLen + gap + maxText + 2 * pad,
      h: rowH * curves.length + 2 * pad,
      rowH,
      lineLen,
      gap,
      pad,
    };
  }
  function legendXY(pos, x0, y0, pw, ph, bw, bh) {
    const m = 7;
    switch (pos) {
      case "upper_left":
        return [x0 + m, y0 + m];
      case "upper_center":
        return [x0 + (pw - bw) / 2, y0 + m];
      case "center_left":
        return [x0 + m, y0 + (ph - bh) / 2];
      case "center":
        return [x0 + (pw - bw) / 2, y0 + (ph - bh) / 2];
      case "center_right":
        return [x0 + pw - bw - m, y0 + (ph - bh) / 2];
      case "lower_left":
        return [x0 + m, y0 + ph - bh - m];
      case "lower_center":
        return [x0 + (pw - bw) / 2, y0 + ph - bh - m];
      case "lower_right":
        return [x0 + pw - bw - m, y0 + ph - bh - m];
      case "outside_right":
        return [x0 + pw + 8, y0];
      case "outside_top":
        return [x0 + (pw - bw) / 2, y0 - bh - 8];
      default:
        return [x0 + pw - bw - m, y0 + m];
    }
  }
  function drawLegend(ctx, curves, geom, font, theme, sp) {
    if (!curves.length) return;
    const size = Number($("legendSize").value) || 11,
      b = legendBoxSize(ctx, curves, size, font),
      [bx, by] = legendXY(
        sp.legendPosition || "upper_right",
        geom.x0,
        geom.y0,
        geom.pw,
        geom.ph,
        b.w,
        b.h,
      ),
      opacity = clamp(Number($("legendOpacity").value) || 0, 0, 1);
    ctx.save();
    if (opacity > 0) {
      ctx.fillStyle =
        theme.bg === "#11181b"
          ? `rgba(17,24,27,${opacity})`
          : `rgba(255,255,255,${opacity})`;
      ctx.fillRect(bx, by, b.w, b.h);
    }
    if ($("legendBorder").checked) {
      ctx.strokeStyle = theme.axis;
      ctx.strokeRect(bx, by, b.w, b.h);
    }
    ctx.font = `${size}px ${font}`;
    curves.forEach((c, i) => {
      const yy = by + b.pad + b.rowH * (i + 0.5),
        col = curveColor(i, curves.length, sp),
        display = curveStyle(sp, c.index ?? i),
        midX = bx + b.pad + b.lineLen / 2;
      if (display.mode !== "symbols") {
        ctx.strokeStyle = col;
        ctx.lineWidth = Number(sp.lineWidth) > 0 ? Number(sp.lineWidth) : 2;
        ctx.setLineDash(display.lineDash ?? theme.dashes[i % theme.dashes.length] ?? []);
        ctx.beginPath();
        ctx.moveTo(bx + b.pad, yy);
        ctx.lineTo(bx + b.pad + b.lineLen, yy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (display.mode !== "line")
        drawMarker(ctx, midX, yy, Number(sp.symbolSize) > 0 ? Number(sp.symbolSize) : 3.2, display.symbol, col, theme.bg, display.filled);
      ctx.fillStyle = theme.text;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(c.name, bx + b.pad + b.lineLen + b.gap, yy);
    });
    ctx.restore();
  }
  function directLabelYs(curves, Y, sp, size) {
    const shift = sp.mode === "stack" ? Number(sp.directLabelYShift) || 0 : 0;
    const step = Math.abs(Y(0) - Y(1));
    const height = Number.isFinite(step) ? step : Math.abs(Y(10) - Y(1));
    return curves.map((c) => {
      const valid=c.yd.filter(v=>Number.isFinite(Y(v)));
      return valid.length ? Y(median(valid)) - shift * (state.labelRange || 1) * (Number.isFinite(height)?height:0) : NaN;
    });
  }
  function subplotTickFormat(sp, axis) {
    const mode=axis==='y'?(sp.yScale&&sp.yScale!=='inherit'?sp.yScale:($('globalYScale')?.value||'linear')):'linear';
    // Linear Y has an explicit Scientific peer, so do not silently use
    // an inherited auto/scientific notation for its tick labels.
    const notation = axis==='y'
      ? mode==='scientific'?'scientific':mode==='linear'?'decimal':'auto'
      : sp[axis + "TickNotation"];
    return {
      digits:
        sp[axis + "TickDigits"] !== "" && sp[axis + "TickDigits"] !== undefined
          ? sp[axis + "TickDigits"]
          : $(axis + "TickDigits").value,
      notation:
        notation && notation !== "inherit"
          ? notation
          : $(axis + "TickNotation").value,
    };
  }
  function oneDInsets(ctx, m, cellH, cellW, font, axisSize, titleSize) {
    const sp = m.sp,
      g = subplotGConfig(sp),
      nu = displayFrequency(sp, m.curves),
      compact = cellH < 180,
      showY = sp.showYTicks && !$("hideYTicks").checked,
      showTitle =
        !$("hideYTitle").checked &&
        String(sp.yAxisLabel || $("yLabel").value || "").trim(),
      xd = clamp(finiteNum($("xTitleDistance").value) || 20, 0, 120),
      yd = clamp(finiteNum($("yTitleDistance").value) || 35, 0, 120);
    const q = {
      left: Math.max(showY ? 56 : 26, showTitle ? yd + axisSize / 2 + 8 : 0),
      right: 16,
      top:
        (g.show && Number.isFinite(nu)
          ? Math.max(compact ? 26 : 34, g.titleDistance + axisSize + 6)
          : compact
            ? 7
            : 10) +
        (sp.title.trim() ? (compact ? titleSize + 5 : titleSize + 10) : 0),
      bottom: Math.max(compact ? 30 : 34, xd + axisSize / 2 + 8),
    };
    if (
      sp.labelMode !== "direct" &&
      sp.labelMode !== "none" &&
      m.curves.length
    ) {
      const b = legendBoxSize(
        ctx,
        m.curves,
        Number($("legendSize").value) || 11,
        font,
      );
      if (sp.legendPosition === "outside_right")
        q.right = Math.min(cellW * 0.48, b.w + 18);
      if (sp.legendPosition === "outside_top")
        q.top += Math.min(cellH * 0.35, b.h + 10);
    }
    return q;
  }
  function drawAnnotations(ctx, sp, nu, X, r, font, theme) {
    if (!sp.annotationsEnabled) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x0, r.y0, r.pw, r.ph);
    ctx.clip();
    for (const a of sp.annotations || []) {
      const B = a.displayCoordinate,
        px = X(B);
      if (!Number.isFinite(px) || px < r.x0 || px > r.x0 + r.pw) continue;
      drawAxisLine(ctx, px, r.y0, px, r.y0 + r.ph, theme.majorGrid, 0.8);
      ctx.save();
      ctx.translate(
        px - 3,
        r.y0 + r.ph * (1 - clamp(Number(a.y ?? 0.2), 0, 1)),
      );
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#808080";
      ctx.font = `italic ${Math.max(1, Number($("annotationSize").value) || 8)}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(a.label || "", 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
  function drawMeasurements(ctx, sp, X, r, font) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x0, r.y0, r.pw, r.ph);
    ctx.clip();
    ctx.font = "10px " + font;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#666";
    const all = [
        ...(sp.measurements || []),
        ...(state.drag?.type === "measure" &&
        state.drag.subplot === subplotIndex(sp)
          ? [{ a: state.drag.a, b: state.drag.b }]
          : []),
      ],
      capacity = Math.max(1, Math.floor((r.ph - 22) / 22)),
      hidden = Math.max(0, all.length - capacity);
    if (hidden) {
      ctx.textAlign = "left";
      ctx.fillText(`+${hidden} earlier measurements`, r.x0 + 4, r.y0 + 12);
      ctx.textAlign = "center";
    }
    all.slice(-capacity).forEach((m, i) => {
      const a = X(m.a),
        b = X(m.b),
        y = r.y0 + r.ph - 14 - i * 22;
      drawAxisLine(ctx, a, y, b, y, "#777", 0.8);
      drawAxisLine(ctx, a, y - 4, a, y + 4, "#777", 0.8);
      drawAxisLine(ctx, b, y - 4, b, y + 4, "#777", 0.8);
      ctx.fillText(
        "ΔB = " + Math.abs(m.b - m.a).toFixed(2) + " G",
        (a + b) / 2,
        y - 2,
      );
    });
    ctx.restore();
  }
  function renderPlot(
    canvas,
    logicalW,
    logicalH,
    pixelScale = 1,
    isExport = false,
  ) {
    const ctx = canvas.getContext("2d"),
      theme = plotTheme(),
      font = getFont("plotFont", "customPlotFont", "Arial"),
      model = preparedModel,
      cells = preparedCells,
      figTitle = $("figureTitle").value.trim(),
      figSize = Number($("figureTitleSize").value) || 18,
      subTitleSize = Number($("subplotTitleSize").value) || 15,
      tickSize = Number($("tickSize").value) || 11,
      projectionTitleSize = Number($("projectionTitleSize").value) || 11,
      axisTitleSize = Number($("axisTitleSize").value) || 14,
      lineW = Number($("lineWidth").value) || 1.4,
      tickLen = 6,
      frame = $("frameMode").value;
    let titleCenter = logicalW / 2;
    canvas.width = Math.max(1, Math.round(logicalW * pixelScale));
    canvas.height = Math.max(1, Math.round(logicalH * pixelScale));
    ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
    ctx.clearRect(0, 0, logicalW, logicalH);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, logicalW, logicalH);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (!isExport) state.plotRegions.length = 0;
    const figTop = figTitle ? Math.max(28, figSize + 12) : 8;
    const rows = Math.max(1, state.layout.rows),
      cols = Math.max(1, state.layout.cols),
      gx = state.layout.gapX,
      gy = state.layout.gapY,
      padX = 10,
      padBottom = 10,
      totalWidth = logicalW - 2 * padX - gx * (cols - 1),
      totalHeight = logicalH - figTop - padBottom - gy * (rows - 1),
      unitW = totalWidth / cols,
      unitH = totalHeight / rows;
    if (!(unitW > 80 && unitH > 80))
      throw new Error("Canvas too small for current subplot layout");
    const buildFrameEntries = (rowHeights) => model.map((m, index) => {
      const cell = cells[index],
        box = {
          cellW: unitW * cell.colSpan + gx * (cell.colSpan - 1),
          cellH: cell.rowSpan === 1
            ? rowHeights[cell.row - 1]
            : unitH * cell.rowSpan + gy * (cell.rowSpan - 1),
        },
        options = {
          axisSize: axisTitleSize,
          projectionTitleSize,
          xTitleDistance: Number($("xTitleDistance").value),
          yTitleDistance: Number($("yTitleDistance").value),
          g: subplotGConfig(m.sp),
          frequency: displayFrequency(m.sp, m.curves),
        },
        plotSettings = m.sp.twoD
          ? applyPlotFootprint(m.sp.twoD.settings, m.sp.plotFootprint)
          : null;
      return {
        index,
        row: cell.row,
        col: cell.col,
        rowSpan: cell.rowSpan,
        colSpan: cell.colSpan,
        twoD: !!m.sp.twoD,
        box,
        plotSettings,
        insets: plotSettings
          ? TwoD.plotInsets(m.matrix, plotSettings, box, m.sp.title, options)
          : oneDInsets(
              ctx,
              m,
              box.cellH,
              box.cellW,
              font,
              axisTitleSize,
              subTitleSize,
            ),
      };
    });
    let rowHeights = Array(rows).fill(unitH),
      frameEntries = buildFrameEntries(rowHeights),
      rowPack = null;
    if (cells.every((cell) => cell.rowSpan === 1)) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const next = fitMainRows(frameEntries, rows, totalHeight),
          delta = Math.max(
            0,
            ...next.heights.map((height, index) => Math.abs(height - rowHeights[index])),
          );
        rowPack = next;
        rowHeights = next.heights;
        frameEntries = buildFrameEntries(rowHeights);
        if (delta < 0.05) break;
      }
      rowPack = fitMainRows(frameEntries, rows, totalHeight);
      const finalDelta = Math.max(
        0,
        ...rowPack.heights.map((height, index) => Math.abs(height - rowHeights[index])),
      );
      if (finalDelta >= 0.05) {
        rowHeights = rowPack.heights;
        frameEntries = buildFrameEntries(rowHeights);
        rowPack = fitMainRows(frameEntries, rows, totalHeight);
      }
    }
    const packed = cells.every((cell) => cell.colSpan === 1 && cell.rowSpan === 1)
      ? TwoD.fitMainColumns(frameEntries, cols, totalWidth)
      : null,
      sharedInsets = packed ? null : TwoD.sharedMainInsets(frameEntries),
      mixedInsets = new Map(frameEntries.map((entry) => {
        const horizontal = packed
          ? packed.insets[entry.col - 1]
          : sharedInsets.get(entry.index) || entry.insets,
          vertical = rowPack && entry.rowSpan === 1
            ? rowPack.insets[entry.row - 1]
            : horizontal;
        return [entry.index, {
          left: horizontal.left,
          right: horizontal.right,
          top: vertical.top,
          bottom: vertical.bottom,
        }];
      }));
    model.forEach((m, si) => {
      const sp = m.sp,
        cell = cells[si],
        curves = m.curves,
        gcfg = subplotGConfig(sp),
        nu = displayFrequency(sp, curves),
        cellX =
          padX +
          (packed
            ? packed.widths
                .slice(0, cell.col - 1)
                .reduce((a, w) => a + w + gx, 0)
            : (cell.col - 1) * (unitW + gx)),
        cellY = rowPack
          ? figTop + rowHeights.slice(0, cell.row - 1).reduce((sum, height) => sum + height + gy, 0)
          : figTop + (cell.row - 1) * (unitH + gy),
        cellW = packed
          ? packed.widths[cell.col - 1]
          : unitW * cell.colSpan + gx * (cell.colSpan - 1),
        cellH = rowPack && cell.rowSpan === 1
          ? rowHeights[cell.row - 1]
          : unitH * cell.rowSpan + gy * (cell.rowSpan - 1);
      if (sp.twoD) {
        const r = TwoD.render(
          ctx,
          m.matrix,
          frameEntries[si].plotSettings,
          { cellX, cellY, cellW, cellH },
          font,
          theme,
          sp.title,
          {
            mainInsets: mixedInsets.get(si),
            xTickFormat: subplotTickFormat(sp, "x"),
            yTickFormat: subplotTickFormat(sp, "y"),
            z: {
              min: $("globalZMin").value,
              max: $("globalZMax").value,
              step: finiteNum($("globalZStep").value),
              label: $("zLabel").value,
              hideTitle: $("hideZTitle").checked,
              hideTicks: $("hideZTicks").checked,
              titleDistance: Number($("zTitleDistance").value),
            },
            scheme:
              sp.colorSchemeOverride && sp.colorSchemeOverride !== "inherit"
                ? sp.colorSchemeOverride
                : $("colorScheme").value,
            tickSize,
            projectionTitleSize,
            axisSize: axisTitleSize,
            titleSize: subTitleSize,
            lineWidth: lineW,
            frame,
            showYTicks: sp.showYTicks && !$("hideYTicks").checked,
            showYTitle: (sp.twoD && ["heatmap","contour","surface3d"].includes(sp.mode)) || !$("hideYTitle").checked,
            xTitleDistance: Number($("xTitleDistance").value),
            yTitleDistance: Number($("yTitleDistance").value),
            grid: $("showGrid").checked,
            labels: sp.labelMode,
            g: gcfg,
            frequency: nu,
            gTicks: configuredGTicks,
            xTicks: ticksWithStep,
            yTicks: ticksWithStep,
          },
        );
        if (model.length === 1) titleCenter = r.titleCenter;
        r.subplot = si;
        drawAnnotations(
          ctx,
          sp,
          null,
          (v) => r.x0 + ((v - r.xmin) / (r.xmax - r.xmin)) * r.pw,
          r,
          font,
          theme,
        );
        if (!isExport) {
          state.plotRegions.push(r);
          for (const pr of r.projectionRegions)
            state.plotRegions.push({
              ...pr,
              subplot: si,
              twoD: true,
              cellX,
              cellY,
              cellW,
              cellH,
            });
        }
        return;
      }
      const showYTicks = sp.showYTicks && !$("hideYTicks").checked,
        showYTitle =
          !$("hideYTitle").checked &&
          String(sp.yAxisLabel || $("yLabel").value || "").trim();
      const yScale = sp.yScale && sp.yScale !== 'inherit' ? sp.yScale : ($('globalYScale')?.value || 'linear');
      const boundsSource = sp.yUseGlobal ? $('globalYMin').value : sp.yMin;
      const upperSource = sp.yUseGlobal ? $('globalYMax').value : sp.yMax;
      const yValues = function* () { for(const c of curves) for(const val of c.yd) yield val; };
      const [yBottom,yTop] = positiveAxisDomain(yValues(),m.ymin,m.ymax,yScale,{
        explicitMin:String(boundsSource??'').trim()!=='',explicitMax:String(upperSource??'').trim()!=='',label:'Y',signed:true
      });
      const compactY = cellH < 180,
        gTitleDistance = Number.isFinite(gcfg.titleDistance)
          ? gcfg.titleDistance
          : 22,
        xTitleDistance = clamp(
          finiteNum($("xTitleDistance").value) || 20,
          0,
          120,
        ),
        yTitleDistance = clamp(
          finiteNum($("yTitleDistance").value) || 35,
          0,
          120,
        );
      let insetL = Math.max(
          showYTicks ? 56 : 26,
          showYTitle ? yTitleDistance + axisTitleSize / 2 + 8 : 0,
        ),
        insetR = 16,
        insetT =
          (gcfg.show && Number.isFinite(nu)
            ? Math.max(compactY ? 26 : 34, gTitleDistance + axisTitleSize + 6)
            : compactY
              ? 7
              : 10) +
          (sp.title.trim()
            ? compactY
              ? subTitleSize + 5
              : subTitleSize + 10
            : 0),
        insetB = Math.max(
          compactY ? 30 : 34,
          xTitleDistance + axisTitleSize / 2 + 8,
        );
      const legendPreview =
        sp.labelMode !== "direct" && sp.labelMode !== "none" && curves.length
          ? legendBoxSize(
              ctx,
              curves,
              Number($("legendSize").value) || 11,
              font,
            )
          : null;
      if (legendPreview && sp.legendPosition === "outside_right")
        insetR = Math.min(cellW * 0.48, legendPreview.w + 18);
      if (legendPreview && sp.legendPosition === "outside_top")
        insetT += Math.min(cellH * 0.35, legendPreview.h + 10);
      const shared = mixedInsets.get(si);
      if (shared) {
        insetL = shared.left;
        insetR = shared.right;
        insetT = shared.top;
        insetB = shared.bottom;
      }
      if (sp.secondaryYAxis) insetR = Math.max(insetR, 78);
      const x0 = cellX + insetL,
        y0 = cellY + insetT,
        pw = cellW - insetL - insetR,
        ph = cellH - insetT - insetB;
      if (!(pw > 40 && ph > 28))
        throw new Error(`Subplot ${si + 1}: plot area too small`);
      const X = (v) => x0 + ((v - m.xmin) / (m.xmax - m.xmin)) * pw,
        Y = (v) => y0 + ph - axisCoordinate(v,yBottom,yTop,yScale) * ph;
      const rightSeries=sp.secondaryYAxis?curves.filter(c=>c.rightAxis):[];
      const rightBounds=rightSeries.length?rangeY(rightSeries,m.xmin,m.xmax):null;
      const rightMin=rightBounds?.[0],rightMax=rightBounds?.[1];
      const YRight=(v)=>y0+ph-(v-rightMin)/(rightMax-rightMin)*ph;
      if (!isExport)
        state.plotRegions.push({
          subplot: si,
          x0,
          y0,
          pw,
          ph,
          xmin: m.xmin,
          xmax: m.xmax,
          ymin: yBottom,
          ymax: yTop,
          yScale,
          xAxis: curves[0]?.xAxis,
          cellX,
          cellY,
          cellW,
          cellH,
        });
      if (sp.title.trim()) {
        ctx.fillStyle = theme.text;
        ctx.font = `${subTitleSize}px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(sp.title.trim(), x0 + pw / 2, cellY + 2);
      }
      const active = sp.showNoiseRegions ? parseRegions(sp.noiseRegions) : null;
      if (active)
        for (const [a, b] of active) {
          const lo = Math.max(m.xmin, Math.min(a, b)),
            hi = Math.min(m.xmax, Math.max(a, b));
          if (hi > lo) {
            ctx.fillStyle =
              $("plotStylePreset").value === "dark_monitor"
                ? "rgba(114,199,211,.10)"
                : "rgba(47,111,159,.08)";
            ctx.fillRect(X(lo), y0, X(hi) - X(lo), ph);
          }
        }
      if (!isExport && state.noiseDraft?.subplot === si)
        for (const [a, b] of state.noiseDraft.regions) {
          const lo = Math.max(m.xmin, Math.min(a, b)),
            hi = Math.min(m.xmax, Math.max(a, b));
          if (hi > lo) {
            ctx.fillStyle = "rgba(198,154,67,.16)";
            ctx.fillRect(X(lo), y0, X(hi) - X(lo), ph);
          }
        }
      const xt = ticksWithStep(m.xmin, m.xmax, m.xStep, 6),
        yt = yScale === "log" ? scaledTicks(yBottom,yTop,"log",5) : ticksWithStep(m.ymin, m.ymax, m.yStep, 5),
        xminor = minorTicks(m.xmin, m.xmax, xt),
        yminor = yScale === "log" ? [] : minorTicks(m.ymin, m.ymax, yt);
      if ($("showMinorGrid").checked) {
        for (const t of xminor)
          drawAxisLine(ctx, X(t), y0, X(t), y0 + ph, theme.minorGrid, 0.55);
        for (const t of yminor)
          drawAxisLine(ctx, x0, Y(t), x0 + pw, Y(t), theme.minorGrid, 0.55);
      }
      if ($("showGrid").checked) {
        for (const t of xt)
          drawAxisLine(ctx, X(t), y0, X(t), y0 + ph, theme.majorGrid, 0.8);
        for (const t of yt)
          drawAxisLine(ctx, x0, Y(t), x0 + pw, Y(t), theme.majorGrid, 0.8);
      }
      const aw = theme.axisWidth || 1;
      if (frame === "box") {
        ctx.strokeStyle = theme.axis;
        ctx.lineWidth = aw;
        ctx.strokeRect(x0, y0, pw, ph);
      } else if (frame === "lb") {
        drawAxisLine(ctx, x0, y0, x0, y0 + ph, theme.axis, aw);
        drawAxisLine(ctx, x0, y0 + ph, x0 + pw, y0 + ph, theme.axis, aw);
      } else if (frame === "tb") {
        drawAxisLine(ctx, x0, y0, x0 + pw, y0, theme.axis, aw);
        drawAxisLine(ctx, x0, y0 + ph, x0 + pw, y0 + ph, theme.axis, aw);
      } else if (frame === "bottom")
        drawAxisLine(ctx, x0, y0 + ph, x0 + pw, y0 + ph, theme.axis, aw);
      const inward = theme.tickDir === "in",
        xf = tickFormatter(xt, subplotTickFormat(sp, "x")),
        yf = tickFormatter(yt, subplotTickFormat(sp, "y"));
      ctx.fillStyle = theme.text;
      ctx.font = `${tickSize}px ${font}`;
      ctx.textBaseline = "top";
      for (const t of xt) {
        const px = X(t),
          label = xf.format(t),
          tw = ctx.measureText(label).width;
        ctx.textAlign =
          px - tw / 2 < x0
            ? "left"
            : px + tw / 2 > x0 + pw
              ? "right"
              : "center";
        drawAxisLine(
          ctx,
          px,
          y0 + ph,
          px,
          y0 + ph + (inward ? -tickLen : tickLen),
          theme.axis,
          1,
        );
        ctx.fillText(label, px, y0 + ph + (inward ? 4 : tickLen + 3));
      }
      if (showYTicks) {
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (const t of yt) {
          const py = Y(t);
          if (py < y0 - 0.5 || py > y0 + ph + 0.5) continue;
          drawAxisLine(
            ctx,
            x0,
            py,
            x0 + (inward ? tickLen : -tickLen),
            py,
            theme.axis,
            1,
          );
          ctx.fillText(yf.format(t), x0 - (inward ? 4 : tickLen + 4), py);
        }
        if (yf.exponent) {
          ctx.font = `${Math.max(9, tickSize - 1)}px ${font}`;
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillText(yf.multiplier, x0 - 2, y0 - 4);
        }
      }
      if (xf.exponent) {
        ctx.font = `${Math.max(9, tickSize - 1)}px ${font}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(xf.multiplier, x0 + pw, y0 + ph + tickSize + 10);
      }
      ctx.font = `${axisTitleSize}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(
        sp.xAxisLabel ||
          (curves[0]?.xAxis && axisKind(curves[0].xAxis) !== "field"
            ? curves[0].xAxis.name +
              (curves[0].xAxis.unit ? " (" + curves[0].xAxis.unit + ")" : "")
            : $("xLabel").value || "Magnetic Field (G)"),
        x0 + pw / 2,
        y0 + ph + xTitleDistance,
      );
      if (sp.secondaryYAxis && rightBounds) {
        const rightTicks=ticksWithStep(rightMin,rightMax,NaN,5);
        const rightLabels=tickFormatter(rightTicks,subplotTickFormat(sp,"y"));
        ctx.fillStyle=theme.text;ctx.font=`${tickSize}px ${font}`;
        ctx.textAlign="left";ctx.textBaseline="middle";
        for(const value of rightTicks){
          const py=YRight(value);
          if(!Number.isFinite(py)||py<y0-.5||py>y0+ph+.5)continue;
          drawAxisLine(ctx,x0+pw,py,x0+pw+tickLen,py,theme.axis,1);
          ctx.fillText(rightLabels.format(value),x0+pw+tickLen+3,py);
        }
        ctx.save();ctx.font=`${axisTitleSize}px ${font}`;ctx.fillStyle=theme.text;
        ctx.translate(x0+pw+Math.min(73,insetR-10),y0+ph/2);
        ctx.rotate(Math.PI/2);ctx.textAlign="center";ctx.textBaseline="middle";
        const unit=sp.secondaryYAxis.unit?' ('+sp.secondaryYAxis.unit+')':'';
        ctx.fillText(sp.secondaryYAxis.name+unit,0,0);ctx.restore();
      }
      if (showYTitle) {
        const yTitleOffset = yTitleDistance;
        ctx.save();
        ctx.translate(x0 - yTitleOffset, y0 + ph / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sp.yAxisLabel || $("yLabel").value || "Intensity", 0, 0);
        ctx.restore();
      }
      if (gcfg.show && Number.isFinite(nu) && m.xmin > 0) {
        let gt = [],
          lo = Math.min(gFromB(m.xmin, nu), gFromB(m.xmax, nu)),
          hi = Math.max(gFromB(m.xmin, nu), gFromB(m.xmax, nu));
        if (gcfg.mode === "manual_custom")
          gt = parseNumberList(gcfg.ticks).filter((g) => g >= lo && g <= hi);
        else if (gcfg.mode === "manual_uniform") {
          if (gcfg.step > 0) {
            const geps = axisEps(gcfg.min, gcfg.max, gcfg.step);
            for (
              let g = gcfg.min, k = 0;
              g <= gcfg.max + geps && k < 10000;
              g += gcfg.step, k++
            )
              if (g >= lo - geps && g <= hi + geps) gt.push(g);
          }
        } else gt = niceTicks(lo, hi, 5);
        ctx.font = `${tickSize}px ${font}`;
        ctx.textBaseline = "bottom";
        for (const g of gt) {
          const b = BFromG(g, nu);
          if (
            b >= m.xmin - axisEps(m.xmin, m.xmax) &&
            b <= m.xmax + axisEps(m.xmin, m.xmax)
          ) {
            const px = X(b),
              label = g.toFixed(gcfg.decimals),
              tw = ctx.measureText(label).width;
            ctx.textAlign =
              px - tw / 2 < x0
                ? "left"
                : px + tw / 2 > x0 + pw
                  ? "right"
                  : "center";
            drawAxisLine(
              ctx,
              px,
              y0,
              px,
              y0 + (inward ? tickLen : -tickLen),
              theme.axis,
              1,
            );
            ctx.fillText(label, px, y0 - (inward ? 3 : tickLen + 3));
          }
        }
        ctx.font = `${axisTitleSize}px ${font}`;
        ctx.fillText(
          gcfg.label || "g factor",
          x0 + pw / 2,
          y0 - gTitleDistance,
        );
      }
      drawAnnotations(ctx, sp, nu, X, { x0, y0, pw, ph }, font, theme);
      curves.forEach((c, ci) => {
        const display = curveStyle(sp, c.index ?? ci),
          color = curveColor(ci, curves.length, sp),
          points = [],
          segments = [];
        let segment = [];
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, y0, pw, ph);
        ctx.clip();
        for (let i = 0; i < Math.min(c.B.length, c.yd.length); i++) {
          const xx = Number(c.B[i]), yy = Number(c.yd[i]);
          if (!Number.isFinite(xx) || !Number.isFinite(yy) || xx < m.xmin || xx > m.xmax) {
            if (segment.length) segments.push(segment);
            segment = [];
            continue;
          }
          const px = X(xx), py = c.rightAxis?YRight(yy):Y(yy);
          if (!Number.isFinite(px) || !Number.isFinite(py)) {
            if (segment.length) segments.push(segment);
            segment = [];
            continue;
          }
          const point = { x: px, y: py };
          points.push(point);
          segment.push(point);
        }
        if (segment.length) segments.push(segment);
        if (display.mode !== "symbols") {
          ctx.strokeStyle = color;
          ctx.lineWidth = Number(sp.lineWidth) > 0 ? Number(sp.lineWidth) : lineW;
          ctx.setLineDash(c.fitLine && !sp.curveStyles?.[c.index]?[6,4]:(display.lineDash ?? theme.dashes[ci % theme.dashes.length] ?? []));
          segments.forEach((part) => {
            if (!part.length) return;
            ctx.beginPath();
            ctx.moveTo(part[0].x, part[0].y);
            for (let i = 1; i < part.length; i++) ctx.lineTo(part[i].x, part[i].y);
            ctx.stroke();
          });
          ctx.setLineDash([]);
        }
        if (display.mode !== "line" && points.length) {
          for (const index of markerSampleIndices(points.length))
            drawMarker(ctx, points[index].x, points[index].y, Number(sp.symbolSize) > 0 ? Number(sp.symbolSize) : 3.2, display.symbol, color, theme.bg, display.filled);
        }
        ctx.restore();
      });
      if (sp.renderNotice) {
        ctx.save();ctx.fillStyle=theme.text;ctx.font=`${Math.max(9,tickSize-1)}px ${font}`;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(String(sp.renderNotice),x0+pw/2,y0+ph/2,Math.max(20,pw-12));ctx.restore();
      }
      drawMeasurements(ctx, sp, X, { x0, y0, pw, ph }, font);
      state.labelRange = m.ymax - m.ymin;
      const geom = { x0, y0, pw, ph };
      if (sp.labelMode === "legend" || sp.labelMode === "both")
        drawLegend(ctx, curves, geom, font, theme, sp);
      if (sp.labelMode === "direct" || sp.labelMode === "both") {
        const size = Number($("legendSize").value) || 11,
          ys = directLabelYs(curves, Y, sp, size);
        ctx.font = `${size}px ${font}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        curves.forEach((c, ci) => {
          ctx.fillStyle = curveColor(ci, curves.length, sp);
          ctx.fillText(
            c.name,
            x0 + clamp(Number(sp.directLabelX) || 0.02, 0, 1) * pw,
            ys[ci],
          );
        });
      }
    });
    if (figTitle) {
      ctx.fillStyle = theme.text;
      ctx.font = `${figSize}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(figTitle, titleCenter, 5);
    }
    return model;
  }

  return renderPlot(canvas, logicalW, logicalH, pixelScale, isExport);
}
