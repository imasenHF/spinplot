import { gFromCoordinate, coordinateFromG } from '../processing/axis.js';
import { orient, projections, validate, axisKind, fieldToGauss } from './core.js';
import { tickFormatter } from './ticks.js';
import { COLOR_SCHEMES } from './palettes.js';
export function defaults(d) {
  const setting = d.metadata?.setting || {},
    referencePower = Number(setting.lineEdit_MB_Power),
    referenceAttenuation = Number(setting.lineEdit_MB_Attenuation),
    swap = (axisKind(d.y) === 'field' && axisKind(d.x) !== 'field') || axisKind(d.x) === 'time',
    v = orient(d, 'real', swap),
    xMin = Math.min(v.x.values[0], v.x.values.at(-1)),
    xMax = Math.max(v.x.values[0], v.x.values.at(-1)),
    yMin = Math.min(v.y.values[0], v.y.values.at(-1)),
    yMax = Math.max(v.y.values[0], v.y.values.at(-1));
  return {
    swap,
    component: 'real',
    mode: 'heatmap',
    xMode: 'mean',
    yMode: 'rms',
    xMin,
    xMax,
    yMin,
    yMax,
    projectionXMin: xMin,
    projectionXMax: xMax,
    projectionYMin: yMin,
    projectionYMax: yMax,
    showProjectionRanges: true,
    showXProjection: true,
    showYProjection: true,
    showScanCorrelation: true,
    scanAxisMode: 'native',
    scanPowerReferenceMW: Number.isFinite(referencePower) && referencePower > 0 ? referencePower : '',
    scanPowerReferenceAttenuationDB: Number.isFinite(referenceAttenuation) ? referenceAttenuation : '',
    showXProjectionRange: true,
    showYProjectionRange: true,
    showXProjectionTitle: true,
    showYProjectionTitle: true,
    projectionGapX: 20,
    projectionGapY: 20,
    xRangeLabelX: 2,
    xRangeLabelY: 12,
    yRangeLabelX: 98,
    yRangeLabelY: 4,
    zMin: '',
    zMax: '',
    xProjectionMin: '',
    xProjectionMax: '',
    yProjectionMin: '',
    yProjectionMax: '',
    projectionScheme: 'inherit',
    scheme: 'inherit',
    showColorbar: true,
    zUseGlobal: true,
    colorbarLabel: '',
    hideColorbarTitle: true,
    colorbarTitleUseGlobal: true,
    xLabel: '',
    yLabel: '',
    xProjectionTitle: '',
    yProjectionTitle: '',
    step: Math.max(1, Math.ceil(v.y.values.length / 24)),
    offset: 1,
    showProjections: true,
    open: true,
  };
}
export function migrate(d, s) {
  if (s.zUseGlobal === undefined)
    s.zUseGlobal = !(
      (s.zMin !== undefined && s.zMin !== '') ||
      (s.zMax !== undefined && s.zMax !== '')
    );
  for (const k of ['showXProjection', 'showYProjection'])
    if (s[k] === undefined) s[k] = s.showProjections !== false;
  for (const k of ['showXProjectionRange', 'showYProjectionRange'])
    if (s[k] === undefined) s[k] = s.showProjectionRanges !== false;
  const base = defaults(d);
  for (const [k, v] of Object.entries(base)) if (s[k] === undefined) s[k] = v;
  return s;
}
export function restore(d) {
  for (const key of ['real', 'imag']) {
    if (
      !Array.isArray(d[key]) ||
      d[key].length !== d.y.values.length ||
      d[key].some((r) => !Array.isArray(r) || r.length !== d.x.values.length)
    )
      throw Error('Invalid 2D signal dimensions');
    for (const row of d[key])
      for (let i = 0; i < row.length; i++) {
        if (row[i] === null) row[i] = NaN;
        else if (!Number.isFinite(row[i])) throw Error('Invalid 2D signal');
      }
  }
  return validate(d);
}
const cache = new WeakMap();
export function model(d, s) {
  migrate(d, s);
  const key = JSON.stringify(s),
    cached = cache.get(d);
  if (cached?.key === key) return cached.value;
  const v = orient(d, s.component, s.swap),
    xr = [Number(s.xMin), Number(s.xMax)],
    yr = [Number(s.yMin), Number(s.yMax)],
    pxr = [Number(s.projectionXMin), Number(s.projectionXMax)],
    pyr = [Number(s.projectionYMin), Number(s.projectionYMax)];
  for (const r of [xr, yr, pxr, pyr])
    if (r.some((x) => !Number.isFinite(x)) || r[0] >= r[1])
      throw Error('Invalid 2D or projection ranges');
  if (
    !Number.isInteger(Number(s.step)) ||
    s.step < 1 ||
    !Number.isFinite(Number(s.offset)) ||
    s.offset < 0
  )
    throw Error('Invalid 2D stack settings');
  const p = projections(v, pxr, pyr, s.xMode, s.yMode),
    xi = v.x.values.map((z, i) => (z >= xr[0] && z <= xr[1] ? i : -1)).filter((i) => i >= 0),
    yi = v.y.values.map((z, i) => (z >= yr[0] && z <= yr[1] ? i : -1)).filter((i) => i >= 0);
  if (!xi.length || !yi.length) throw Error('Display range contains no samples');
  let lo = Infinity,
    hi = -Infinity;
  for (const j of yi)
    for (const i of xi) {
      const z = v.z[j][i];
      if (Number.isFinite(z)) {
        lo = Math.min(lo, z);
        hi = Math.max(hi, z);
      }
    }
  if (!Number.isFinite(lo)) {
    lo = 0;
    hi = 1;
  }
  if (lo === hi) {
    lo -= 0.5;
    hi += 0.5;
  }
  const zmin = s.zMin === '' ? lo : Number(s.zMin),
    zmax = s.zMax === '' ? hi : Number(s.zMax);
  if (!Number.isFinite(zmin) || !Number.isFinite(zmax) || zmin >= zmax)
    throw Error('Z min must be less than Z max');
  const value = {
    v,
    p,
    xr,
    yr,
    pxr,
    pyr,
    xi,
    yi,
    zmin,
    zmax,
    max: Math.max(Math.abs(lo), Math.abs(hi)) || 1,
  };
  cache.set(d, { key, value });
  return value;
}
export function controls(card, sp, d, onChange) {
  const s = migrate(d, sp.twoD.settings),
    root = card.querySelector('.subplot-body');
  if (!s.sharedControls) {
    sp.mode = s.mode === 'stack' ? 'stack' : 'overlay';
    sp.offsetScale = s.offset;
    for (const a of ['x', 'y']) {
      sp[a + 'UseGlobal'] = false;
      sp[a + 'Min'] = s[a + 'Min'];
      sp[a + 'Max'] = s[a + 'Max'];
    }
    s.sharedControls = true;
    for (const key of [
      'mode',
      'offsetScale',
      'xUseGlobal',
      'xMin',
      'xMax',
      'yUseGlobal',
      'yMin',
      'yMax',
    ]) {
      const e = card.querySelector('[data-field=' + key + ']');
      if (e.type === 'checkbox') e.checked = sp[key];
      else e.value = sp[key];
    }
  }
  const findBlock = (field) =>
    card
      .querySelector('[data-field=' + field + ']')
      .closest('details')
      .querySelector('.local-block,.grid4');
  const axes = findBlock('xUseGlobal'),
    colors = findBlock('colorSchemeOverride'),
    layout = findBlock('gridRow');
  axes.closest('details').querySelector('summary').firstChild.textContent =
    'X / Y / Z axis override ';
  const tag = axes.closest('details').querySelector('.override-tag');
  tag.textContent = !sp.xUseGlobal || !sp.yUseGlobal ? 'OVERRIDE' : 'GLOBAL';
  tag.classList.toggle('local', !sp.xUseGlobal || !sp.yUseGlobal);
  function section(title, open = false) {
    const box = document.createElement('details');
    box.className = 'advanced-layout';
    box.open = open;
    const sum = document.createElement('summary');
    sum.textContent = title;
    box.append(sum);
    const body = document.createElement('div');
    body.className = 'local-block grid2';
    box.append(body);
    root.prepend(box);
    return { box, body };
  }
  const { box, body } = section(
    '2D · ' +
      d.x.name +
      (d.x.unit ? ' (' + d.x.unit + ')' : '') +
      ' × ' +
      d.y.name +
      (d.y.unit ? ' (' + d.y.unit + ')' : '') +
      ' · ' +
      d.x.values.length +
      ' × ' +
      d.y.values.length,
    s.open !== false,
  );
  box.classList.add('twod-options');
  box.ontoggle = () => {
    s.open = box.open;
  };
  const projection = section('Projections').body;
  function input(parent, key, title, type = 'text') {
    const l = document.createElement('label');
    l.className = 'control-label';
    l.textContent = title;
    const e = document.createElement('input');
    e.type = type;
    if (type === 'number') e.step = key === 'step' ? '1' : 'any';
    e.value = s[key];
    e.dataset.twod = key;
    e.onchange = () => {
      s[key] =
        type === 'number'
          ? e.value === '' &&
            [
              'zMin',
              'zMax',
              'xProjectionMin',
              'xProjectionMax',
              'yProjectionMin',
              'yProjectionMax',
            ].includes(key)
            ? ''
            : e.value === ''
              ? NaN
              : Number(e.value)
          : e.value;
      if (key === 'colorbarLabel') s.colorbarTitleUseGlobal = false;
      if (['zMin', 'zMax'].includes(key)) {
        s.zUseGlobal = false;
        axes.querySelector('[data-twod=zUseGlobal]').checked = false;
      }
      onChange();
    };
    l.append(e);
    parent.append(l);
  }
  function select(parent, key, title, opts) {
    const l = document.createElement('label');
    l.className = 'control-label';
    l.textContent = title;
    const e = document.createElement('select');
    e.dataset.twod = key;
    for (const [value, text] of opts) {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = text;
      e.append(o);
    }
    e.value = s[key];
    e.onchange = () => {
      s[key] = e.value;
      onChange();
    };
    l.append(e);
    parent.append(l);
    return e;
  }
  function check(parent, key, title, change) {
    const l = document.createElement('label'),
      e = document.createElement('input');
    l.className = 'switch';
    e.type = 'checkbox';
    e.dataset.twod = key;
    e.checked = s[key];
    e.onchange = () => {
      s[key] = e.checked;
      change?.();
      onChange();
    };
    const text = document.createElement('span');
    text.textContent = title;
    l.append(e, text);
    parent.append(l);
  }
  select(body, 'component', 'Signal', [
    ['real', 'Real'],
    ['imag', 'Imaginary'],
    ['magnitude', 'Magnitude'],
  ]);
  input(body, 'step', 'Stack every N traces', 'number');
  const stackInput = body.querySelector('[data-twod=step]');
  stackInput.disabled = sp.mode !== 'stack';
  stackInput.title = 'Applies to Stack view';
  check(body, 'swap', 'Swap axes', () => {
    const v = orient(d, s.component, s.swap);
    for (const [k, a] of [
      ['x', v.x],
      ['y', v.y],
    ]) {
      s[k + 'Min'] = Math.min(a.values[0], a.values.at(-1));
      s[k + 'Max'] = Math.max(a.values[0], a.values.at(-1));
      s['projection' + k.toUpperCase() + 'Min'] = s[k + 'Min'];
      s['projection' + k.toUpperCase() + 'Max'] = s[k + 'Max'];
      sp[k + 'UseGlobal'] = false;
      sp[k + 'Min'] = s[k + 'Min'];
      sp[k + 'Max'] = s[k + 'Max'];
      card.querySelector('[data-field=' + k + 'Min]').value = sp[k + 'Min'];
      card.querySelector('[data-field=' + k + 'Max]').value = sp[k + 'Max'];
    }
    for (const e of card.querySelectorAll('input[data-twod]')) e.value = s[e.dataset.twod];
  });
  for (const key of ['xMode', 'yMode'])
    select(projection, key, 'Statistic', [
      ['mean', 'Mean'],
      ['max', 'Maximum'],
      ['min', 'Minimum'],
      ['ptp', 'Peak-to-peak (max − min)'],
      ['rms', 'RMS'],
      ['sum', 'Sum'],
    ]);
  check(projection, 'showScanCorrelation', 'Plot Y projection vs scan variable');
  const scanAxisSelect = select(projection, 'scanAxisMode', 'Correlation X axis', [
    ['native', 'Acquired scan variable'],
    ['power', 'Microwave power (mW)'],
  ]);
  const powerReferenceControls = document.createElement('div');
  powerReferenceControls.className = 'grid2';
  powerReferenceControls.style.gridColumn = '1 / -1';
  powerReferenceControls.hidden = s.scanAxisMode !== 'power';
  projection.append(powerReferenceControls);
  input(powerReferenceControls, 'scanPowerReferenceMW', 'Reference power P₀ (mW)', 'number');
  input(powerReferenceControls, 'scanPowerReferenceAttenuationDB', 'Reference attenuation A₀ (dB)', 'number');
  const onScanAxisChange = scanAxisSelect.onchange;
  scanAxisSelect.onchange = () => {
    onScanAxisChange();
    powerReferenceControls.hidden = scanAxisSelect.value !== 'power';
  };
  for (const [key, title] of [
    ['projectionXMin', 'Y projection: X min'],
    ['projectionXMax', 'Y projection: X max'],
    ['projectionYMin', 'X projection: Y min'],
    ['projectionYMax', 'X projection: Y max'],
  ])
    input(projection, key, title, 'number');
  for (const [key, title] of [
    ['xProjectionMin', 'Intensity min (auto)'],
    ['xProjectionMax', 'Intensity max (auto)'],
    ['yProjectionMin', 'Intensity min (auto)'],
    ['yProjectionMax', 'Intensity max (auto)'],
  ])
    input(projection, key, title, 'number');
  for (const [key, label] of [
    ['showXProjection', 'Show X projection'],
    ['showYProjection', 'Show Y projection (when correlation is off)'],
  ])
    check(projection, key, label, () => {
      s.showProjections = true;
    });
  for (const [key, label] of [
    ['showXProjectionRange', 'Show range label'],
    ['showYProjectionRange', 'Show range label'],
  ])
    check(projection, key, label, () => {
      s.showProjectionRanges = true;
    });
  check(projection, 'showXProjectionTitle', 'Show title');
  check(projection, 'showYProjectionTitle', 'Show title');
  input(projection, 'xProjectionTitle', 'Title (blank = auto)');
  input(projection, 'yProjectionTitle', 'Title (blank = auto)');
  const positions = document.createElement('details');
  positions.style.gridColumn = '1 / -1';
  positions.className = 'advanced-layout';
  positions.innerHTML = '<summary>Range label positions</summary>';
  const positionBody = document.createElement('div');
  positionBody.className = 'grid2';
  positions.append(positionBody);
  projection.append(positions);
  for (const [key, title] of [
    ['xRangeLabelX', 'Top label: horizontal (%)'],
    ['xRangeLabelY', 'Top label: vertical (%)'],
    ['yRangeLabelX', 'Right label: horizontal (%)'],
    ['yRangeLabelY', 'Right label: vertical (%)'],
  ])
    input(positionBody, key, title, 'number');
  check(axes, 'zUseGlobal', 'Use global Z defaults');
  const zRow = document.createElement('div');
  zRow.className = 'grid2 control-pair';
  axes.append(zRow);
  for (const [key, title] of [
    ['zMin', 'Z min (blank = auto)'],
    ['zMax', 'Z max (blank = auto)'],
  ])
    input(zRow, key, title, 'number');
  for (const [key, title] of [
    ['xLabel', 'X axis title (blank = file)'],
    ['yLabel', 'Y axis title (blank = file)'],
    ['colorbarLabel', 'Colorbar title'],
  ])
    input(axes, key, title);
  check(axes, 'hideColorbarTitle', 'Hide colorbar title', () => {
    s.colorbarTitleUseGlobal = false;
  });
  check(axes, 'showColorbar', 'Show colorbar');
  const auto = document.createElement('button');
  auto.textContent = 'Auto Z';
  auto.onclick = () => {
    s.zUseGlobal = false;
    axes.querySelector('[data-twod=zUseGlobal]').checked = false;
    s.zMin = '';
    s.zMax = '';
    for (const key of ['zMin', 'zMax']) axes.querySelector('[data-twod=' + key + ']').value = '';
    onChange();
  };
  axes.append(auto);
  select(colors, 'scheme', 'Heatmap / stack palette', [
    ['inherit', 'Inherit subplot / global'],
    ...Object.entries(COLOR_SCHEMES)
      .filter(([k, v]) => v.gradient)
      .map(([k, v]) => [k, v.label]),
  ]);
  select(colors, 'projectionScheme', 'Projection palette (first color)', [
    ['inherit', 'Inherit subplot / global'],
    ...Object.entries(COLOR_SCHEMES).map(([k, v]) => [k, v.label]),
  ]);
  const gaps = document.createElement('div');
  gaps.className = 'grid2 projection-gaps';
  gaps.style.gridColumn = '1 / -1';
  layout.append(gaps);
  input(gaps, 'projectionGapX', 'Right projection gap (px)', 'number');
  input(gaps, 'projectionGapY', 'Top projection gap (px)', 'number');
  const mode = card.querySelector('[data-field=mode]');
  mode.querySelector('[value=overlay]').textContent = 'Heatmap';
  for (const manager of card.querySelectorAll('.curve-manager')) {
    manager.classList.add('matrix-data');
    manager.children[0].hidden = true;
    manager.querySelector('.curve-tools').hidden = true;
    manager.querySelector('.curve-tools').style.display = 'none';
    const current = manager.children[1],
      label = current.querySelector('.curve-box-label');
    label.firstElementChild.textContent = 'Current data';
    label.lastElementChild.textContent = '1';
    const list = current.querySelector('.order-list');
    list.style.height = 'auto';
    const row = document.createElement('div');
    row.className = 'order-item matrix-data-row';
    row.textContent = sp.twoD.index + '. ' + d.name;
    row.title = d.name;
    list.replaceChildren(row);
  }
  const summary = card.querySelector('.subplot-summary');
  summary.textContent =
    '1 dataset · ' +
    (sp.mode === 'stack' ? 'Stack' : 'Heatmap') +
    ' · ' +
    d.x.values.length +
    ' × ' +
    d.y.values.length;
}
export function projectionCsv(d, s) {
  const { v, p, xr, yr, pxr, pyr } = model(d, s),
    lines = [
      '# ' +
        JSON.stringify({
          x: v.x.name,
          xUnit: v.x.unit,
          y: v.y.name,
          yUnit: v.y.unit,
          displayXRange: xr,
          displayYRange: yr,
          projectionXRange: pxr,
          projectionYRange: pyr,
          xMode: s.xMode,
          yMode: s.yMode,
          component: s.component,
        }),
      'axis,coordinate,projection',
    ];
  for (let i = 0; i < v.x.values.length; i++) lines.push('X,' + v.x.values[i] + ',' + p.x[i]);
  for (let j = 0; j < v.y.values.length; j++) lines.push('Y,' + v.y.values[j] + ',' + p.y[j]);
  return lines.join('\n');
}
function isAttenuationAxis(axis) {
  return String(axis?.unit || '').trim().toLowerCase() === 'db' &&
    /atten|power|功率|衰减/i.test(String(axis?.name || ''));
}

export function scanCorrelationData(d, s) {
  migrate(d, s);
  const oriented = orient(d, s.component, s.swap);
  if (s.scanAxisMode === 'power' && !isAttenuationAxis(oriented.y))
    return { valid: false, reason: 'Power conversion requires a dB attenuation scan axis.', xAxis: { name: oriented.y.name, unit: oriented.y.unit } };
  const { v, p, pyr } = model(d, s);
  let x = v.y.values.slice(),
    xAxis = { name: v.y.name, unit: v.y.unit };
  if (s.scanAxisMode === 'power') {
    const referencePower = Number(s.scanPowerReferenceMW),
      referenceAttenuation = Number(s.scanPowerReferenceAttenuationDB);
    if (String(s.scanPowerReferenceMW ?? '').trim() === '' ||
        String(s.scanPowerReferenceAttenuationDB ?? '').trim() === '' ||
        !Number.isFinite(referencePower) || referencePower <= 0 || !Number.isFinite(referenceAttenuation))
      return { valid: false, reason: 'Enter a positive reference power and its corresponding attenuation.', xAxis };
    x = x.map((attenuation) => referencePower * 10 ** (-(attenuation - referenceAttenuation) / 10));
    xAxis = { name: 'Microwave power', unit: 'mW' };
  }
  const lo = Math.min(...pyr),
    hi = Math.max(...pyr),
    points = x.map((value, i) => ({
      x: value,
      y: p.y[i],
      scan: v.y.values[i],
      index: i,
    })).filter((point) =>
      point.scan >= lo && point.scan <= hi &&
      Number.isFinite(point.x) && Number.isFinite(point.y)
    );
  if (points.length < 2)
    return { valid: false, reason: 'The selected scan range contains fewer than two valid points.', xAxis };
  return {
    valid: true,
    x: points.map((point) => point.x),
    y: points.map((point) => point.y),
    scan: points.map((point) => point.scan),
    xAxis,
    yAxis: { name: 'Y projection (' + s.yMode + ')', unit: '' },
    mode: s.scanAxisMode,
  };
}

export function projectionColor(s, options = {}) {
  const key = s.projectionScheme !== 'inherit' ? s.projectionScheme : options.scheme,
    cs = COLOR_SCHEMES[key] || COLOR_SCHEMES.matlab;
  return (cs.palette || cs.gradient)[0];
}
function extent(a, ids) {
  let lo = Infinity,
    hi = -Infinity;
  for (const i of ids) {
    const v = a[i];
    if (Number.isFinite(v)) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  if (!Number.isFinite(lo)) return [0, 1];
  return [lo, hi === lo ? lo + 1 : hi];
}
function edge(a, i) {
  return [
    i ? (a[i - 1] + a[i]) / 2 : a[i] - (a[1] - a[0]) / 2,
    i < a.length - 1 ? (a[i] + a[i + 1]) / 2 : a[i] + (a[i] - a[i - 1]) / 2,
  ];
}
function cellIndex(a, v) {
  const asc = a.at(-1) > a[0],
    n = a.length;
  let lo = 0,
    hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1,
      b = (a[mid] + a[mid + 1]) / 2;
    if (asc ? v > b : v < b) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
export function color(stops, t) {
  t = Math.max(0, Math.min(1, t));
  const p = t * (stops.length - 1),
    i = Math.min(stops.length - 2, Math.floor(p)),
    u = p - i,
    a = stops[i],
    b = stops[i + 1];
  return [1, 3, 5].map((k) =>
    Math.round(parseInt(a.slice(k, k + 2), 16) * (1 - u) + parseInt(b.slice(k, k + 2), 16) * u),
  );
}
const css = (c) => `rgb(${c.join(',')})`;
export function colorStops(s, options = {}) {
  const key = s.scheme !== 'inherit' ? s.scheme : options.scheme;
  return COLOR_SCHEMES[key]?.gradient || COLOR_SCHEMES.turbo.gradient;
}
export function raster(m, width, height, stops = COLOR_SCHEMES.turbo.gradient) {
  const { v, xr, yr, zmin, zmax } = m,
    canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d'),
    image = c.createImageData(width, height),
    xs = Array.from({ length: width }, (_, i) =>
      cellIndex(v.x.values, xr[0] + ((i + 0.5) / width) * (xr[1] - xr[0])),
    ),
    ys = Array.from({ length: height }, (_, j) =>
      cellIndex(v.y.values, yr[1] - ((j + 0.5) / height) * (yr[1] - yr[0])),
    );
  for (let j = 0; j < height; j++)
    for (let i = 0; i < width; i++) {
      const z = v.z[ys[j]][xs[i]],
        k = (j * width + i) * 4;
      if (!Number.isFinite(z)) continue;
      const c = color(stops, (z - zmin) / (zmax - zmin));
      image.data.set(c, k);
      image.data[k + 3] = 255;
    }
  c.putImageData(image, 0, 0);
  return canvas;
}
export function adjustZ(s, m, delta) {
  const factor = delta > 0 ? 1.15 : 1 / 1.15,
    center = (m.zmin + m.zmax) / 2,
    half = ((m.zmax - m.zmin) * factor) / 2;
  if (!Number.isFinite(half) || half <= Number.EPSILON * Math.max(1, Math.abs(center))) return;
  s.zUseGlobal = false;
  s.zMin = center - half;
  s.zMax = center + half;
}
export function stackRows(m, s) {
  return m.yi.filter((_, k) => k % Number(s.step) === 0);
}
export function plotInsets(d, s, box, title = '', options = {}) {
  const v = orient(d, s.component, s.swap),
    w = box.cellW,
    h = box.cellH,
    hasTop = s.showProjections && s.showXProjection !== false,
    hasCorrelation = s.showScanCorrelation !== false,
    hasSide = s.showProjections && s.showYProjection !== false && !hasCorrelation,
    proj = hasTop || hasSide,
    cb = s.showColorbar && s.mode === 'heatmap',
    axisSize = options.axisSize || 14;
  const gX = options.g?.show && Number.isFinite(options.frequency) && fieldToGauss(v.x),
    gY = options.g?.show && Number.isFinite(options.frequency) && fieldToGauss(v.y),
    gapX = Math.max(gY ? 80 : 0, Number(s.projectionGapX) || 0),
    gapY = Math.max(0, Number(s.projectionGapY) || 0),
    topH = hasTop ? Math.max(25, h * 0.17) : 0,
    gSpace = gX ? Math.max(34, options.g.titleDistance + axisSize + 8) : 0;
  return {
    left: Math.max(52, options.yTitleDistance || 35),
    right: (hasSide ? gapX + w * 0.14 + (cb ? 100 : 20) : cb ? 100 : gY ? 80 : 20) +
      (hasCorrelation ? w * 0.30 + 40 : 0),
    top: hasTop
      ? (title.trim() ? 62 : 40) + topH + gapY + gSpace
      : (title.trim() ? 65 : 42) + (gX ? 34 : 0),
    bottom: Math.max(55, (options.xTitleDistance || 20) + axisSize + 20),
    gapX,
    gapY,
    topH,
    gSpace,
    rightFraction: (hasSide ? 0.14 : 0) + (hasCorrelation ? 0.30 : 0),
  };
}
export function sharedMainInsets(entries) {
  const groups = new Map();
  for (const e of entries) {
    const key = e.box.cellW + ':' + e.box.cellH;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  const result = new Map();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const common = Object.fromEntries(
      ['left', 'right', 'top', 'bottom'].map((k) => [
        k,
        Math.max(...group.map((e) => e.insets[k])),
      ]),
    );
    for (const e of group) result.set(e.index, common);
  }
  return result;
}
// Allocate each column's auxiliary space without leaving a colorbar-sized blank after 1D plots.
export function fitMainColumns(entries, cols, totalWidth) {
  const left = Math.max(...entries.map((e) => e.insets.left)),
    top = Math.max(...entries.map((e) => e.insets.top)),
    bottom = Math.max(...entries.map((e) => e.insets.bottom)),
    fractions = Array(cols).fill(0),
    fixed = Array(cols).fill(0);
  for (const e of entries) {
    const k = e.col - 1,
      f = e.insets.rightFraction || 0;
    fractions[k] = Math.max(fractions[k], f);
    fixed[k] = Math.max(fixed[k], e.insets.right - f * e.box.cellW);
  }
  const factor = fractions.reduce((n, f) => n + 1 / (1 - f), 0),
    extra = fixed.reduce((n, r, k) => n + (left + r) / (1 - fractions[k]), 0),
    width = (totalWidth - extra) / factor,
    widths = fixed.map((r, k) => (width + left + r) / (1 - fractions[k]));
  return {
    width,
    widths,
    insets: widths.map((w) => ({ left, right: w - left - width, top, bottom })),
  };
}
export function render(ctx, d, s, box, font, theme, title, options = {}) {
  const effective =
    s.zUseGlobal !== false && options.z ? { ...s, zMin: options.z.min, zMax: options.z.max } : s;
  const m = model(d, effective),
    { v, p, xr, yr, pxr, pyr, xi, yi, zmin, zmax, max } = m,
    { cellX: cx, cellY: cy, cellW: w, cellH: h } = box,
    hasTop = s.showProjections && s.showXProjection !== false,
    hasCorrelation = s.showScanCorrelation !== false,
    hasSide = s.showProjections && s.showYProjection !== false && !hasCorrelation,
    proj = hasTop || hasSide,
    cb = s.showColorbar && s.mode === 'heatmap',
    stops = colorStops(s, options),
    tick = options.tickSize || 11,
    axisSize = options.axisSize || 14,
    titleSize = options.titleSize || 15,
    lineWidth = options.lineWidth || 1.4;
  const gX = options.g?.show && Number.isFinite(options.frequency) && fieldToGauss(v.x),
    gY = options.g?.show && Number.isFinite(options.frequency) && fieldToGauss(v.y),
    natural = plotInsets(d, s, box, title, options),
    insets = options.mainInsets || natural,
    { gapX, gapY, topH, gSpace } = natural,
    x = cx + insets.left,
    y = cy + insets.top,
    topY = y - gapY - gSpace - topH,
    pw = w - insets.left - insets.right,
    ph = h - insets.top - insets.bottom,
    X = (a) => x + ((a - xr[0]) / (xr[1] - xr[0])) * pw,
    Y = (a) => y + ph - ((a - yr[0]) / (yr[1] - yr[0])) * ph;
  if (pw < 35 || ph < 35) throw Error('2D subplot too small for map and projections');
  const top = { x, y: topY, w: pw, h: topH },
    side = { x: x + pw + gapX, y, w: w * 0.14, h: ph },
    bar = { x: hasSide ? side.x + side.w + 20 : x + pw + 18, y, w: Math.max(8, w * 0.018), h: ph };
  ctx.save();
  ctx.font = tick + 'px ' + font;
  ctx.fillStyle = theme.text;
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = lineWidth;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  function text(t, x, y, size = tick, align = 'center') {
    ctx.font = size + 'px ' + font;
    ctx.fillStyle = theme.text;
    ctx.textAlign = align;
    ctx.fillText(t, x, y);
  }
  function line(ids, get, col = projectionColor(s, options)) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    let open = false;
    for (const i of ids) {
      const [px, py] = get(i);
      if (!Number.isFinite(px) || !Number.isFinite(py)) {
        open = false;
        continue;
      }
      if (open) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
      open = true;
    }
    ctx.stroke();
  }
  function clip(r, fn) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    fn();
    ctx.restore();
  }
  function border(r) {
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = theme.axisWidth || 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
  let projectionRegions = [];
  const mapBox = { x, y, w: pw, h: ph };
  clip(mapBox, () => {
    if (s.mode === 'heatmap') {
      if (typeof ctx.drawImage === 'function') {
        const scale = Math.min(2, window.devicePixelRatio || 1),
          image = raster(
            m,
            Math.max(1, Math.ceil(pw * scale)),
            Math.max(1, Math.ceil(ph * scale)),
            stops,
          );
        ctx.drawImage(image, x, y, pw, ph);
      } else
        for (const j of yi) {
          const ye = edge(v.y.values, j).map(Y);
          for (const i of xi) {
            const z = v.z[j][i];
            if (!Number.isFinite(z)) continue;
            const xe = edge(v.x.values, i).map(X);
            ctx.fillStyle = css(color(stops, (z - zmin) / (zmax - zmin)));
            ctx.fillRect(
              Math.min(...xe),
              Math.min(...ye),
              Math.abs(xe[1] - xe[0]),
              Math.abs(ye[1] - ye[0]),
            );
          }
        }
    } else {
      const rows = stackRows(m, s);
      rows.forEach((j, k) => {
        const base = y + ph * 0.94 - (k * ph * 0.86) / Math.max(1, rows.length - 1);
        line(
          xi,
          (i) => [
            X(v.x.values[i]),
            base - ((v.z[j][i] / max) * Number(s.offset) * ph * 0.4) / Math.max(1, rows.length),
          ],
          css(color(stops, k / Math.max(1, rows.length - 1))),
        );
        if (options.labels !== 'none')
          text(v.y.values[j].toPrecision(4) + ' ' + v.y.unit, x + pw - 4, base, tick, 'right');
      });
    }
    if (options.grid) {
      ctx.strokeStyle = theme.majorGrid;
      ctx.lineWidth = 0.5;
      for (let k = 1; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(x + (pw * k) / 4, y);
        ctx.lineTo(x + (pw * k) / 4, y + ph);
        ctx.moveTo(x, y + (ph * k) / 4);
        ctx.lineTo(x + pw, y + (ph * k) / 4);
        ctx.stroke();
      }
    }
  });
  if (options.frame !== 'none') border(mapBox);
  if (title?.trim()) text(title.trim(), x + pw / 2, cy + 10, titleSize);
  const xt = options.xTicks
      ? options.xTicks(...xr, Number(s.xStep), 5)
      : Array.from({ length: 5 }, (_, k) => xr[0] + ((xr[1] - xr[0]) * k) / 4),
    yt = options.yTicks
      ? options.yTicks(...yr, Number(s.yStep), 5)
      : Array.from({ length: 5 }, (_, k) => yr[0] + ((yr[1] - yr[0]) * k) / 4);
  const xf = tickFormatter(xt, options.xTickFormat),
    yf = tickFormatter(yt, options.yTickFormat);
  for (const a of xt)
    text(
      xf.format(a),
      X(a),
      y + ph + tick + 3,
      tick,
      a === xt[0] ? 'left' : a === xt.at(-1) ? 'right' : 'center',
    );
  if (options.showYTicks !== false)
    for (const b of yt) text(yf.format(b), x - 6, Y(b), tick, 'right');
  if (xf.exponent) text(xf.multiplier, x + pw, y + ph + tick * 2 + 7, tick, 'right');
  if (yf.exponent && options.showYTicks !== false)
    text(yf.multiplier, x - 6, y - 10, tick, 'right');
  text(
    s.xLabel || v.x.name + (v.x.unit ? ' (' + v.x.unit + ')' : ''),
    x + pw / 2,
    y + ph + (options.xTitleDistance || 20) + tick + 8,
    axisSize,
  );
  if (options.showYTitle !== false) {
    ctx.save();
    ctx.translate(x - (options.yTitleDistance || 46), y + ph / 2);
    ctx.rotate(-Math.PI / 2);
    text(s.yLabel || v.y.name + (v.y.unit ? ' (' + v.y.unit + ')' : ''), 0, 0, axisSize);
    ctx.restore();
  }
  if (proj) {
    const [a0, b0] = extent(p.x, xi),
      [c0, e0] = extent(p.y, yi),
      ap = (b0 - a0) * 0.08,
      cp = (e0 - c0) * 0.08,
      a = s.xProjectionMin === '' ? a0 - ap : Number(s.xProjectionMin),
      b = s.xProjectionMax === '' ? b0 + ap : Number(s.xProjectionMax),
      c = s.yProjectionMin === '' ? c0 - cp : Number(s.yProjectionMin),
      e = s.yProjectionMax === '' ? e0 + cp : Number(s.yProjectionMax);
    if (
      (hasTop && (!Number.isFinite(a + b) || a >= b)) ||
      (hasSide && (!Number.isFinite(c + e) || c >= e))
    )
      throw Error('Invalid projection intensity range');
    const XP = (z) => top.y + top.h - ((z - a) / (b - a)) * top.h,
      YP = (z) => side.x + ((z - c) / (e - c)) * side.w,
      rangeText = (r, axis) => `${r[0].toPrecision(4)}–${r[1].toPrecision(4)} ${axis.unit}`;
    if (hasTop) {
      projectionRegions.push({
        x0: top.x,
        y0: top.y,
        pw: top.w,
        ph: top.h,
        xmin: xr[0],
        xmax: xr[1],
        ymin: a,
        ymax: b,
        projection: 'top',
      });
      clip(top, () => line(xi, (i) => [X(v.x.values[i]), XP(p.x[i])]));
      border(top);
      const pf = tickFormatter(
        Array.from({ length: 4 }, (_, k) => a + ((b - a) * k) / 3),
        options.yTickFormat,
      );
      for (let k = 0; k <= 3; k++) {
        const z = a + ((b - a) * k) / 3;
        text(pf.format(z), top.x - 5, XP(z), tick, 'right');
      }
      if (pf.exponent) text(pf.multiplier, top.x - 5, top.y - 10, tick, 'right');
      ctx.strokeStyle = theme.axis;
      for (let k = 0; k <= 4; k++) {
        ctx.beginPath();
        ctx.moveTo(x + (pw * k) / 4, top.y);
        ctx.lineTo(x + (pw * k) / 4, top.y + 5);
        ctx.moveTo(x + (pw * k) / 4, top.y + top.h);
        ctx.lineTo(x + (pw * k) / 4, top.y + top.h - 5);
        ctx.stroke();
      }
      if (s.showXProjectionTitle !== false)
        text(
          s.xProjectionTitle || `${v.x.name} projection (${s.xMode})`,
          top.x + top.w / 2,
          top.y - 18,
          tick,
        );
      if (s.showProjectionRanges && s.showXProjectionRange !== false)
        text(
          rangeText(pyr, v.y),
          top.x + (top.w * Number(s.xRangeLabelX)) / 100,
          top.y + (top.h * Number(s.xRangeLabelY)) / 100,
          Math.max(8, tick - 1),
          'left',
        );
    }
    if (hasSide) {
      projectionRegions.push({
        x0: side.x,
        y0: side.y,
        pw: side.w,
        ph: side.h,
        xmin: c,
        xmax: e,
        ymin: yr[0],
        ymax: yr[1],
        projection: 'side',
        axisHitWidth: gapX,
      });
      clip(side, () => line(yi, (j) => [YP(p.y[j]), Y(v.y.values[j])]));
      border(side);
      const n = Math.max(1, Math.min(3, Math.floor(side.w / (tick * 5))));
      const pf = tickFormatter(
        Array.from({ length: n + 1 }, (_, k) => c + ((e - c) * k) / n),
        options.xTickFormat,
      );
      for (let k = 0; k <= n; k++) {
        const q = c + ((e - c) * k) / n;
        text(
          pf.format(q),
          YP(q),
          side.y + side.h + tick + 3,
          tick,
          k === 0 ? 'left' : k === n ? 'right' : 'center',
        );
      }
      if (pf.exponent)
        text(pf.multiplier, side.x + side.w, side.y + side.h + tick * 2 + 7, tick, 'right');
      ctx.strokeStyle = theme.axis;
      for (let k = 0; k <= 4; k++) {
        ctx.beginPath();
        ctx.moveTo(side.x, y + (ph * k) / 4);
        ctx.lineTo(side.x + 5, y + (ph * k) / 4);
        ctx.moveTo(side.x + side.w, y + (ph * k) / 4);
        ctx.lineTo(side.x + side.w - 5, y + (ph * k) / 4);
        ctx.stroke();
      }
      if (s.showYProjectionTitle !== false)
        text(
          s.yProjectionTitle || `${v.y.name} projection (${s.yMode})`,
          side.x + side.w / 2,
          y - 28,
          tick,
        );
      if (s.showProjectionRanges && s.showYProjectionRange !== false)
        text(
          rangeText(pxr, v.x),
          side.x + (side.w * Number(s.yRangeLabelX)) / 100,
          side.y + (side.h * Number(s.yRangeLabelY)) / 100,
          Math.max(8, tick - 1),
          'right',
        );
    }
  }
  const g = options.g;
  if (g?.show && Number.isFinite(options.frequency)) {
    const factorX = fieldToGauss(v.x),
      factorY = fieldToGauss(v.y),
      axis = factorX ? 'x' : factorY ? 'y' : null,
      factor = factorX || factorY,
      range = axis === 'x' ? xr : yr;
    if (axis && range[0] > 0) {
      const r = axis === 'x' ? mapBox : mapBox,
        fromB = (b) => gFromCoordinate(b, options.frequency, factor),
        toB = (q) => coordinateFromG(q, options.frequency, factor),
        lo = Math.min(...range.map(fromB)),
        hi = Math.max(...range.map(fromB));
      const ts = options.gTicks(lo, hi, g);
      for (const q of ts) {
        const b = toB(q);
        if (b < range[0] || b > range[1]) continue;
        ctx.strokeStyle = theme.axis;
        ctx.beginPath();
        if (axis === 'x') {
          const px = X(b);
          ctx.moveTo(px, y);
          ctx.lineTo(px, y + 5);
          ctx.stroke();
          text(q.toFixed(g.decimals), px, y - 9, tick);
        } else {
          const py = Y(b);
          ctx.moveTo(x + pw, py);
          ctx.lineTo(x + pw - 5, py);
          ctx.stroke();
          text(q.toFixed(g.decimals), x + pw + 6, py, tick, 'left');
        }
      }
      if (axis === 'x')
        text(g.label || 'g factor', x + pw / 2, y - Math.max(24, g.titleDistance), axisSize);
      else {
        ctx.save();
        ctx.translate(x + pw + Math.max(48, g.titleDistance), y + ph / 2);
        ctx.rotate(-Math.PI / 2);
        text(g.label || 'g factor', 0, 0, axisSize);
        ctx.restore();
      }
    }
  }
  if (cb) {
    for (let k = 0; k < 256; k++) {
      ctx.fillStyle = css(color(stops, 1 - k / 255));
      ctx.fillRect(bar.x, bar.y + (bar.h * k) / 256, bar.w, bar.h / 256 + 0.1);
    }
    border(bar);
    for (const z of options.z?.hideTicks
      ? []
      : options.z?.step > 0 && options.yTicks
        ? options.yTicks(zmin, zmax, options.z.step)
        : Array.from({ length: 5 }, (_, k) => zmin + ((zmax - zmin) * k) / 4)) {
      const py = y + ph - (ph * (z - zmin)) / (zmax - zmin);
      ctx.strokeStyle = theme.axis;
      ctx.beginPath();
      ctx.moveTo(bar.x + bar.w, py);
      ctx.lineTo(bar.x + bar.w + 4, py);
      ctx.stroke();
      text(z.toPrecision(4), bar.x + bar.w + 6, py, tick, 'left');
    }
    const zTitle = s.colorbarLabel || options.z?.label;
    if (
      !(s.colorbarTitleUseGlobal && options.z ? options.z.hideTitle : s.hideColorbarTitle) &&
      zTitle
    ) {
      ctx.save();
      ctx.translate(bar.x + bar.w + (options.z?.titleDistance ?? 56), y + ph / 2);
      ctx.rotate(-Math.PI / 2);
      text(zTitle, 0, 0, axisSize);
      ctx.restore();
    }
  }
  let scanCorrelationRegion = null;
  if (hasCorrelation) {
    const data = scanCorrelationData(d, s),
      panel = {
        x: cb ? bar.x + bar.w + 20 : x + pw + 20,
        y,
        w: w * 0.30,
        h: ph,
      },
      plot = { x: panel.x + 46, y: panel.y, w: panel.w - 56, h: panel.h };
    scanCorrelationRegion = { ...panel };
    text('Y projection vs ' + (data.xAxis?.name || v.y.name), panel.x + panel.w / 2, cy + 10, titleSize);
    if (!data.valid || plot.w < 24 || plot.h < 30) {
      text(data.reason || 'Scan correlation panel is too small', panel.x + panel.w / 2, panel.y + panel.h / 2, tick);
    } else {
      let [xmin, xmax] = extent(data.x, data.x.map((_, i) => i)),
        [ymin, ymax] = extent(data.y, data.y.map((_, i) => i));
      const xpad = (xmax - xmin) * 0.05,
        ypad = (ymax - ymin) * 0.05;
      xmin -= xpad;
      xmax += xpad;
      ymin -= ypad;
      ymax += ypad;
      const SX = (value) => plot.x + ((value - xmin) / (xmax - xmin)) * plot.w,
        SY = (value) => plot.y + plot.h - ((value - ymin) / (ymax - ymin)) * plot.h,
        xTicks = Array.from({ length: 5 }, (_, k) => xmin + ((xmax - xmin) * k) / 4),
        yTicks = Array.from({ length: 5 }, (_, k) => ymin + ((ymax - ymin) * k) / 4),
        xf = tickFormatter(xTicks, options.yTickFormat),
        yf = tickFormatter(yTicks, options.xTickFormat);
      if (options.grid) {
        ctx.save();
        ctx.strokeStyle = theme.majorGrid;
        ctx.lineWidth = 0.5;
        for (let k = 1; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(SX(xTicks[k]), plot.y);
          ctx.lineTo(SX(xTicks[k]), plot.y + plot.h);
          ctx.moveTo(plot.x, SY(yTicks[k]));
          ctx.lineTo(plot.x + plot.w, SY(yTicks[k]));
          ctx.stroke();
        }
        ctx.restore();
      }
      clip(plot, () => line(data.x.map((_, i) => i), (i) => [SX(data.x[i]), SY(data.y[i])], projectionColor(s, options)));
      border(plot);
      for (let k = 0; k < xTicks.length; k++) {
        const value = xTicks[k];
        text(xf.format(value), SX(value), plot.y + plot.h + tick + 3, tick, k === 0 ? 'left' : k === xTicks.length - 1 ? 'right' : 'center');
      }
      for (const value of yTicks) text(yf.format(value), plot.x - 6, SY(value), tick, 'right');
      if (xf.exponent) text(xf.multiplier, plot.x + plot.w, plot.y + plot.h + tick * 2 + 7, tick, 'right');
      if (yf.exponent) text(yf.multiplier, plot.x - 6, plot.y - 10, tick, 'right');
      text(data.xAxis.name + (data.xAxis.unit ? ' (' + data.xAxis.unit + ')' : ''), plot.x + plot.w / 2, plot.y + plot.h + (options.xTitleDistance || 20) + tick + 8, axisSize);
      ctx.save();
      ctx.translate(panel.x + 12, plot.y + plot.h / 2);
      ctx.rotate(-Math.PI / 2);
      text(data.yAxis.name, 0, 0, axisSize);
      ctx.restore();
    }
  }
  ctx.restore();
  return {
    x0: x,
    y0: y,
    pw,
    ph,
    xmin: xr[0],
    xmax: xr[1],
    ymin: yr[0],
    ymax: yr[1],
    ...box,
    twoD: true,
    titleCenter: x + pw / 2,
    projectionRegions,
    scanCorrelationRegion,
    colorbar: cb ? bar : null,
    zmin,
    zmax,
  };
}
