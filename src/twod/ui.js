import { gFromCoordinate, coordinateFromG } from '../processing/axis.js';
import { orient, projections, reduce, validate, axisKind, fieldToGauss } from './core.js';
import { tickFormatter } from './ticks.js';
import { COLOR_SCHEMES } from './palettes.js';
export function defaults(d) {
  const setting = d.metadata?.setting || {},
    settingPower = Number(setting.lineEdit_MB_Power),
    settingAttenuationRaw = setting.lineEdit_MB_Attenuation,
    hasSettingAttenuation = settingAttenuationRaw !== undefined && settingAttenuationRaw !== null &&
      String(settingAttenuationRaw).trim() !== '' && Number.isFinite(Number(settingAttenuationRaw)),
    referencePower = Number.isFinite(settingPower) && settingPower > 0
      ? settingPower * (hasSettingAttenuation ? 10 ** (Number(settingAttenuationRaw) / 10) : 1)
      : NaN,
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
    showScanCorrelation: false,
    scanAxisMode: 'native',
    scanPowerReferenceMW: Number.isFinite(referencePower) && referencePower > 0 ? referencePower : '',
    scanStatistic: 'rms',
    scanStatisticMin: xMin,
    scanStatisticMax: xMax,
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
  // Convert legacy paired reference power/attenuation to an equivalent zero-dB P0.
  if (Object.prototype.hasOwnProperty.call(s, 'scanPowerReferenceAttenuationDB')) {
    const oldPower = Number(s.scanPowerReferenceMW),
      oldAttenuation = Number(s.scanPowerReferenceAttenuationDB);
    if (
      String(s.scanPowerReferenceMW ?? '').trim() !== '' &&
      String(s.scanPowerReferenceAttenuationDB ?? '').trim() !== '' &&
      Number.isFinite(oldPower) && oldPower > 0 &&
      Number.isFinite(oldAttenuation)
    ) s.scanPowerReferenceMW = oldPower * 10 ** (oldAttenuation / 10);
    delete s.scanPowerReferenceAttenuationDB;
  }
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
  if (s.scanStatistic === undefined) s.scanStatistic = s.yMode || base.scanStatistic;
  if (!['mean', 'max', 'min', 'ptp', 'rms', 'sum'].includes(s.scanStatistic)) s.scanStatistic = base.scanStatistic;
  if (s.scanStatisticMin === undefined) {
    const value = s.projectionXMin;
    s.scanStatisticMin = value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : base.scanStatisticMin;
  }
  if (s.scanStatisticMax === undefined) {
    const value = s.projectionXMax;
    s.scanStatisticMax = value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : base.scanStatisticMax;
  }
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
    if (!['overlay', 'heatmap', 'stack', 'overlap', 'scan'].includes(sp.mode))
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
  if (sp.mode === 'scan') box.querySelector('summary').textContent = 'Signal source · ' + d.name;
  box.ontoggle = () => {
    s.open = box.open;
  };
  const projectionSection = section('Projections');
  const projection = projectionSection.body;
  const scanSection = section('Variable scan settings', sp.mode === 'scan');
  const scanSettings = scanSection.body;
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
  input(body, 'step', 'Plot every N traces', 'number');
  const stackInput = body.querySelector('[data-twod=step]');
  stackInput.disabled = !['stack', 'overlap'].includes(sp.mode);
  stackInput.title = 'Applies to Stack and Overlap views';
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
    select(projection, key, key === 'xMode' ? 'Top projection statistic' : 'Right projection statistic', [
      ['mean', 'Mean'],
      ['max', 'Maximum'],
      ['min', 'Minimum'],
      ['ptp', 'Peak-to-peak (max − min)'],
      ['rms', 'RMS'],
      ['sum', 'Sum'],
    ]);
  const scanAxisSelect = select(scanSettings, 'scanAxisMode', 'Scan X axis', [
    ['native', 'Acquired scan variable'],
    ['power', 'Microwave power (mW)'],
  ]);
  select(scanSettings, 'scanStatistic', 'Statistic', [
    ['mean', 'Mean'],
    ['max', 'Maximum'],
    ['min', 'Minimum'],
    ['ptp', 'Peak-to-peak (max − min)'],
    ['rms', 'RMS'],
    ['sum', 'Sum'],
  ]);
  const statisticAxis = orient(d, s.component, s.swap).x;
  const statisticAxisLabel = statisticAxis.name + (statisticAxis.unit ? ' (' + statisticAxis.unit + ')' : '');
  input(scanSettings, 'scanStatisticMin', 'Statistic interval · ' + statisticAxisLabel + ' min', 'number');
  input(scanSettings, 'scanStatisticMax', 'Statistic interval · ' + statisticAxisLabel + ' max', 'number');
  const powerReferenceControls = document.createElement('div');
  powerReferenceControls.className = 'grid2 scan-power-reference-controls';
  powerReferenceControls.style.gridColumn = '1 / -1';
  powerReferenceControls.hidden = s.scanAxisMode !== 'power';
  scanSettings.append(powerReferenceControls);
  input(powerReferenceControls, 'scanPowerReferenceMW', 'Reference power at 0 dB attenuation P₀ (mW)', 'number');
  const onScanAxisChange = scanAxisSelect.onchange;
  scanAxisSelect.onchange = () => {
    onScanAxisChange();
    powerReferenceControls.hidden = scanAxisSelect.value !== 'power';
  };
  const projectionCoordinateFields = new Map();
  for (const [key, title] of [
    ['projectionXMin', 'Y projection: X min'],
    ['projectionXMax', 'Y projection: X max'],
    ['projectionYMin', 'X projection: Y min'],
    ['projectionYMax', 'X projection: Y max'],
  ]) {
    input(projection, key, title, 'number');
    projectionCoordinateFields.set(key, projection.querySelector('[data-twod=' + key + ']').closest('label'));
  }
  for (const [key, title] of [
    ['xProjectionMin', 'Intensity min (auto)'],
    ['xProjectionMax', 'Intensity max (auto)'],
    ['yProjectionMin', 'Intensity min (auto)'],
    ['yProjectionMax', 'Intensity max (auto)'],
  ])
    input(projection, key, title, 'number');
  for (const [key, label] of [
    ['showXProjection', 'Show X projection'],
    ['showYProjection', 'Show Y projection'],
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
  const manualDerived = !!sp.twoD.derivedFromCurves;
  const overlayOption = mode.querySelector('[value=overlay]');
  overlayOption.textContent = 'Heatmap';
  if (manualDerived) {
    overlayOption.hidden = true;
    if (['overlay1d', 'stack1d'].includes(sp.mode)) sp.mode = sp.mode === 'stack1d' ? 'stack' : 'heatmap';
    for (const [value, label] of [['heatmap', 'Heatmap']]) {
      if (!mode.querySelector('[value=' + value + ']')) {
        const option = document.createElement('option'); option.value = value; option.textContent = label; mode.append(option);
      }
    }
  }
  for (const [value, label] of [['overlap', 'Overlap'], ['scan', 'Variable scan (new subplot)']]) {
    if (!mode.querySelector('[value=' + value + ']')) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; mode.append(option);
    }
  }
  mode.value = sp.mode;
  s.mode = sp.mode === 'stack' ? 'stack' : sp.mode === 'overlap' ? 'overlap' : sp.mode === 'scan' ? 'scan' : 'heatmap';
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
    row.textContent = sp.twoD.derivedFromCurves ? sp.twoD.curveIndices.length + ' manual 1D curves' : sp.twoD.index + '. ' + d.name;
    row.title = d.name;
    list.replaceChildren(row);
  }
  const derivedView = sp.mode === 'overlap' || sp.mode === 'scan';
  projectionSection.box.querySelector('summary').textContent = 'Projections';
  projectionSection.box.hidden = sp.mode === 'overlap' || sp.mode === 'scan';
  scanSection.box.hidden = sp.mode !== 'scan';
  powerReferenceControls.hidden = sp.mode !== 'scan' || scanAxisSelect.value !== 'power';
  stackInput.closest('label').hidden = sp.mode === 'scan';
  body.querySelector('[data-twod=swap]').closest('label').hidden = sp.mode === 'scan';
  for (const key of ['xMode', 'yMode']) projection.querySelector('[data-twod=' + key + ']').closest('label').hidden = sp.mode === 'overlap' || sp.mode === 'scan';
  for (const key of ['projectionXMin', 'projectionXMax', 'projectionYMin', 'projectionYMax']) {
    const label = projectionCoordinateFields.get(key); label.hidden = sp.mode === 'overlap';
    if (key === 'projectionYMin') label.firstChild.textContent = sp.mode === 'scan' ? 'Scan variable min' : 'X projection: Y min';
    if (key === 'projectionYMax') label.firstChild.textContent = sp.mode === 'scan' ? 'Scan variable max' : 'X projection: Y max';
  }
  for (const key of ['xProjectionMin', 'xProjectionMax', 'yProjectionMin', 'yProjectionMax', 'showXProjection', 'showYProjection', 'showXProjectionRange', 'showYProjectionRange', 'showXProjectionTitle', 'showYProjectionTitle', 'xProjectionTitle', 'yProjectionTitle']) {
    const el = projection.querySelector('[data-twod=' + key + ']'); if (el) el.closest('label,details').hidden = derivedView;
  }
  for (const key of ['zUseGlobal', 'zMin', 'zMax', 'colorbarLabel', 'hideColorbarTitle', 'showColorbar']) {
    const el = card.querySelector('[data-twod=' + key + ']'); if (el) el.closest('label').hidden = derivedView;
  }
  colors.closest('details').hidden = derivedView;
  const summary = card.querySelector('.subplot-summary');
  const modeLabel = ({overlay:'Heatmap',heatmap:'Heatmap',stack:'Stack',overlap:'Overlap',scan:'Variable scan'})[sp.mode] || 'Heatmap';
  summary.textContent = (manualDerived ? sp.twoD.curveIndices.length + ' curves' : '1 dataset') + ' · ' + modeLabel + ' · ' + d.x.values.length + ' × ' + d.y.values.length;
  if (manualDerived) {
    const variable = sp.scanVariable || (sp.scanVariable = {name:'Subplot index',unit:'',mode:'linear',start:1,step:1,valuesByCurve:{}});
    if (!variable.valuesByCurve || typeof variable.valuesByCurve !== 'object') variable.valuesByCurve = {};
    const curveIds = sp.twoD.curveIndices || [];
    const refreshManualScanRange = () => {
      const values = curveIds.map((id) => Number(variable.valuesByCurve[id]));
      if (!values.length || values.some((value) => !Number.isFinite(value))) return;
      const min = Math.min(...values), max = Math.max(...values);
      sp.twoD.settings.yMin = min; sp.twoD.settings.yMax = max;
      sp.twoD.settings.projectionYMin = min; sp.twoD.settings.projectionYMax = max;
      sp.yUseGlobal = false; sp.yMin = min; sp.yMax = max;
      s.yMin = min; s.yMax = max; s.projectionYMin = min; s.projectionYMax = max;
      sp.twoD.scanAxisRange = { min, max };
    };
    const orderedValues = curveIds.map((id, i) => Number.isFinite(Number(variable.valuesByCurve[id])) ? Number(variable.valuesByCurve[id]) : i);
    const {box: variableBox, body: variableBody} = section('Scan variable · Heatmap Y axis', false);
    variableBox.classList.add('manual-scan-variable');
    function manualField(title, key, type, value) {
      const label = document.createElement('label'); label.className = 'control-label'; label.textContent = title;
      const input = document.createElement('input'); input.type = type; input.dataset.manualScan = key; input.value = value ?? '';
      if (type === 'number') input.step = 'any';
      label.append(input); variableBody.append(label); return {label, input};
    }
    const nameField = manualField('Variable name', 'name', 'text', variable.name || 'Subplot index');
    const unitField = manualField('Unit', 'unit', 'text', variable.unit || '');
    const modeLabelEl = document.createElement('label'); modeLabelEl.className = 'control-label'; modeLabelEl.textContent = 'Value mode';
    const modeSelect = document.createElement('select'); modeSelect.dataset.manualScan = 'mode';
    for (const [value, text] of [['linear','Equally spaced'],['array','Custom array']]) {const option = document.createElement('option'); option.value = value; option.textContent = text; modeSelect.append(option);}
    modeSelect.value = variable.mode === 'array' ? 'array' : 'linear'; modeLabelEl.append(modeSelect); variableBody.append(modeLabelEl);
    const startField = manualField('Start value', 'start', 'number', variable.start ?? 1);
    const stepField = manualField('Step', 'step', 'number', variable.step ?? 1);
    const arrayField = manualField('Values in current curve order', 'values', 'text', orderedValues.join(', '));
    arrayField.label.style.gridColumn = '1 / -1'; arrayField.input.placeholder = '1, 2, 3';
    const note = document.createElement('div'); note.className = 'small manual-scan-note'; note.textContent = 'Each curve gets one Y-axis value. Custom values must match the curve count and follow Current order; values stay attached to their source curves when reordered. The same settings are used by Heatmap and Variable scan.'; variableBody.append(note);
    const updateVariableMode = () => {const arrayMode = modeSelect.value === 'array'; startField.label.hidden = arrayMode; stepField.label.hidden = arrayMode; arrayField.label.hidden = !arrayMode;};
    const writeLinearValues = () => {
      const start = Number(variable.start), step = Number(variable.step);
      if (!Number.isFinite(start) || !Number.isFinite(step) || step === 0) throw new Error('Equal-spacing mode requires a finite start and a non-zero interval.');
      variable.valuesByCurve = Object.fromEntries(curveIds.map((id, i) => [id, start + i * step]));
      arrayField.input.value = curveIds.map(id => variable.valuesByCurve[id]).join(', ');
    };
    nameField.input.onchange = () => {variable.name = nameField.input.value.trim() || 'Curve index'; onChange();};
    unitField.input.onchange = () => {variable.unit = unitField.input.value.trim(); onChange();};
    modeSelect.onchange = () => {
      variable.mode = modeSelect.value;
      try {if (variable.mode === 'linear') writeLinearValues(); else arrayField.input.value = curveIds.map(id => variable.valuesByCurve[id]).join(', ');}
      catch (error) {modeSelect.setCustomValidity(error.message);modeSelect.reportValidity();modeSelect.value = 'array';variable.mode = 'array';}
      updateVariableMode(); refreshManualScanRange(); onChange({scanVariableChanged:true});
    };
    startField.input.onchange = () => {
      const value = Number(startField.input.value); if (!Number.isFinite(value)) {startField.input.setCustomValidity('Enter a finite start value.');startField.input.reportValidity();return;}
      variable.start = value; try {writeLinearValues();startField.input.setCustomValidity('');refreshManualScanRange();onChange({scanVariableChanged:true});} catch (error) {startField.input.setCustomValidity(error.message);startField.input.reportValidity();}
    };
    stepField.input.onchange = () => {
      const value = Number(stepField.input.value); if (!Number.isFinite(value) || value === 0) {stepField.input.setCustomValidity('Interval must be finite and non-zero.');stepField.input.reportValidity();return;}
      variable.step = value; try {writeLinearValues();stepField.input.setCustomValidity('');refreshManualScanRange();onChange({scanVariableChanged:true});} catch (error) {stepField.input.setCustomValidity(error.message);stepField.input.reportValidity();}
    };
    arrayField.input.onchange = () => {
      const tokens = arrayField.input.value.trim().split(/[,;\s]+/).filter(Boolean), values = tokens.map(Number);
      if (values.length !== curveIds.length || values.some(value => !Number.isFinite(value))) {arrayField.input.setCustomValidity('Enter exactly ' + curveIds.length + ' finite values.');arrayField.input.reportValidity();return;}
      if (new Set(values).size !== values.length) {arrayField.input.setCustomValidity('Scan-variable values must be unique.');arrayField.input.reportValidity();return;}
      variable.valuesByCurve = Object.fromEntries(curveIds.map((id, i) => [id, values[i]])); variable.mode = 'array'; arrayField.input.setCustomValidity(''); refreshManualScanRange(); onChange({scanVariableChanged:true});
    };
    updateVariableMode();
  }
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

function fullRangeSettings(d, s) {
  const v = orient(d, s.component, s.swap), x0 = v.x.values[0], x1 = v.x.values.at(-1), y0 = v.y.values[0], y1 = v.y.values.at(-1);
  return {...s,xMin:Math.min(x0,x1),xMax:Math.max(x0,x1),yMin:Math.min(y0,y1),yMax:Math.max(y0,y1),zMin:'',zMax:''};
}
export function overlapData(d, s) {
  migrate(d,s);const m=model(d,fullRangeSettings(d,s)),{v}=m;
  return {valid:true,xAxis:{name:v.x.name,unit:v.x.unit},scanAxis:{name:v.y.name,unit:v.y.unit},traces:stackRows(m,s).map(j=>({index:j,scan:v.y.values[j],x:v.x.values.slice(),y:v.z[j].slice()}))};
}

export function scanCorrelationData(d, s) {
  migrate(d, s);
  const v = orient(d, s.component, s.swap);
  if (s.scanAxisMode === 'power' && !isAttenuationAxis(v.y))
    return { valid: false, reason: 'Power conversion requires a dB attenuation scan axis.', xAxis: { name: v.y.name, unit: v.y.unit } };
  const rangeMin = Number(s.scanStatisticMin),
    rangeMax = Number(s.scanStatisticMax);
  if (
    String(s.scanStatisticMin ?? '').trim() === '' ||
    String(s.scanStatisticMax ?? '').trim() === '' ||
    !Number.isFinite(rangeMin) || !Number.isFinite(rangeMax) || rangeMin >= rangeMax
  )
    return { valid: false, reason: 'Enter a valid statistic interval.', xAxis: { name: v.y.name, unit: v.y.unit } };
  const xi = v.x.values.map((value, i) => value >= rangeMin && value <= rangeMax ? i : -1).filter(i => i >= 0);
  if (!xi.length)
    return { valid: false, reason: 'The statistic interval contains no X-axis samples.', xAxis: { name: v.y.name, unit: v.y.unit } };
  const statistic = ['mean', 'max', 'min', 'ptp', 'rms', 'sum'].includes(s.scanStatistic)
      ? s.scanStatistic
      : 'rms',
    signal = v.z.map(row => reduce(xi.map(i => row[i]), statistic));
  let x = v.y.values.slice(),
    xAxis = { name: v.y.name, unit: v.y.unit };
  if (s.scanAxisMode === 'power') {
    const referencePower = Number(s.scanPowerReferenceMW);
    if (String(s.scanPowerReferenceMW ?? '').trim() === '' ||
        !Number.isFinite(referencePower) || referencePower <= 0)
      return { valid: false, reason: 'Enter a positive reference power at 0 dB attenuation.', xAxis };
    x = x.map(attenuation => referencePower * 10 ** (-attenuation / 10));
    xAxis = { name: 'Microwave power', unit: 'mW' };
  }
  const points = x.map((value, i) => ({
    x: value,
    y: signal[i],
    scan: v.y.values[i],
    index: i,
  })).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (points.length < 2)
    return { valid: false, reason: 'The scan contains fewer than two valid points.', xAxis };
  const statisticLabel = ({ mean: 'Mean', max: 'Maximum', min: 'Minimum', ptp: 'Peak-to-peak', rms: 'RMS', sum: 'Sum' })[statistic];
  return {
    valid: true,
    x: points.map(point => point.x),
    y: points.map(point => point.y),
    scan: points.map(point => point.scan),
    xAxis,
    yAxis: { name: 'Signal (' + statisticLabel + ')', unit: '' },
    statistic,
    statisticRange: [rangeMin, rangeMax],
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
    hasSide = s.showProjections && s.showYProjection !== false,
    proj = hasTop || hasSide,
    cb = s.showColorbar && s.mode === 'heatmap',
    axisSize = options.axisSize || 14,
    projectionTitleSize = Math.max(7, Number(options.projectionTitleSize) || 11);
  const gX = options.g?.show && Number.isFinite(options.frequency) && fieldToGauss(v.x),
    gY = options.g?.show && Number.isFinite(options.frequency) && fieldToGauss(v.y),
    gapX = Math.max(gY ? 80 : 0, Number(s.projectionGapX) || 0),
    gapY = Math.max(0, Number(s.projectionGapY) || 0),
    topH = hasTop ? Math.max(25, h * 0.17) : 0,
    gSpace = gX ? Math.max(34, options.g.titleDistance + axisSize + 8) : 0;
  return {
    left: Math.max(52, options.yTitleDistance || 35),
    right: hasSide ? gapX + w * 0.14 + (cb ? 100 : 20) : cb ? 100 : gY ? 80 : 20,
    top: hasTop
      ? Math.max(title.trim() ? 62 : 40, projectionTitleSize * 2 + 4) + topH + gapY + gSpace
      : Math.max(title.trim() ? 65 : 42, hasSide ? projectionTitleSize * 2 + 4 : 0) + (gX ? 34 : 0),
    bottom: Math.max(55, (options.xTitleDistance || 20) + axisSize + 20),
    gapX,
    gapY,
    topH,
    gSpace,
    rightFraction: hasSide ? 0.14 : 0,
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
    hasSide = s.showProjections && s.showYProjection !== false,
    proj = hasTop || hasSide,
    cb = s.showColorbar && s.mode === 'heatmap',
    stops = colorStops(s, options),
    tick = options.tickSize || 11,
    projectionTitleSize = Math.max(7, Number(options.projectionTitleSize) || 11),
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
          projectionTitleSize,
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
      if (s.showYProjectionTitle !== false) {
        const title = s.yProjectionTitle || `${v.y.name} projection (${s.yMode})`;
        const measureWidth = (value) => {
          ctx.font = projectionTitleSize + 'px ' + font;
          const measured = typeof ctx.measureText === 'function' ? ctx.measureText(value)?.width : undefined;
          return Number.isFinite(measured) ? measured : String(value).length * projectionTitleSize * 0.6;
        };
        if (measureWidth(title) > side.w) {
          let lines;
          if (!s.yProjectionTitle) {
            lines = [v.y.name, `projection (${s.yMode})`];
          } else {
            const marker = title.toLowerCase().lastIndexOf(' projection');
            if (marker > 0) lines = [title.slice(0, marker), title.slice(marker + 1)];
            else {
              lines = [];
              let line = '';
              for (const word of title.split(/\s+/)) {
                const candidate = line ? line + ' ' + word : word;
                if (line && measureWidth(candidate) > side.w) {
                  lines.push(line);
                  line = word;
                } else line = candidate;
              }
              if (line) lines.push(line);
            }
          }
          const fitSize = (line) => {
            ctx.font = projectionTitleSize + 'px ' + font;
            const width = measureWidth(line);
            return width > side.w ? Math.max(7, projectionTitleSize * side.w / width) : projectionTitleSize;
          };
          const lineGap = Math.max(10, projectionTitleSize * 1.15);
          const firstY = y - 28 - (lines.length - 1) * lineGap / 2;
          lines.forEach((line, i) => text(line, side.x + side.w / 2, firstY + i * lineGap, fitSize(line)));
        } else {
          text(title, side.x + side.w / 2, y - 28, projectionTitleSize);
        }
      }
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
    colorbar: cb ? bar : null,
    zmin,
    zmax,
  };
}
