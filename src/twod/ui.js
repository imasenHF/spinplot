import { gFromCoordinate, coordinateFromG } from '../processing/axis.js';
import { orient, projections, reduce, validate, axisKind, fieldToGauss } from './core.js';
import { peakFeatures, fitSaturation } from './saturation.js';
import { tickFormatter } from './ticks.js';
import { COLOR_SCHEMES } from './palettes.js';
import { zFraction, zRange, zTicks, zoomZ } from './zscale.js';
import { contourSegments } from './contours.js';
import { renderSurface } from './surface3d.js';
import { positiveAxisDomain, axisCoordinate, axisValue, scaledTicks } from '../plotting/axis-scale.js';
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
    scanFeatureMode: 'statistic',
    scanFitAmplitude: false,
    scanFitLinewidth: false,
    scanFitOffset: false,
    scanFitExcluded: '',
    scanFitPowerMinMW: '',
    scanFitPowerMaxMW: '',
    topFeatureDisplay: 'none',
    sideFeatureDisplay: 'none',
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
    zScale: 'linear',
    yScale: 'linear',
    xProjectionScale:'linear',
    yProjectionScale:'linear',
    xProjectionNotation:'inherit',
    yProjectionNotation:'inherit',
    contourLevels: 12,
    viewAzimuth: 35,
    viewElevation: 35,
    viewZStretch: 1,
    viewZoom: 1,
    viewOpen: false,
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
  if(s.yScale==='log') {
    const bounds=positiveAxisDomain(v.y.values,yr[0],yr[1],'log',{label:'Y',signed:true});
    yr[0]=bounds[0];yr[1]=bounds[1];
  }
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
  const range = zRange(v.z, xi, yi, s);
  const {min:zmin,max:zmax} = range;
  const lo=range.dataMin,hi=range.dataMax;
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
// Resolve Auto Z to the actual physical range of the current matrix window.
// Return numbers rather than clearing the corresponding user-visible fields.
export function autoZBounds(d,s){
  const m=model(d,{...s,zUseGlobal:false,zMin:'',zMax:''});
  return [Number(m.zmin.toPrecision(10)),Number(m.zmax.toPrecision(10))];
}
export function controls(card, sp, d, onChange) {
  const s = migrate(d, sp.twoD.settings),
    root = card.querySelector('.subplot-body');
  if (!s.sharedControls) {
    if (!['overlay','heatmap','contour','surface3d','stack','overlap','scan'].includes(sp.mode))
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
  if (['heatmap','contour','surface3d'].includes(sp.mode)) projectionSection.box.open = false;
  const projection = projectionSection.body;
  const scanSection = section('Scan', sp.mode === 'scan');
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
              'scanFitPowerMinMW',
              'scanFitPowerMaxMW',
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
      if (key === 'zScale') fitZ();
      if (key === 'xProjectionScale' || key === 'yProjectionScale') fitProjection(key[0]);
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
  // Fit from the current visible matrix and show real numerical limits.
  function fitZ(){
    const [minimum,maximum]=autoZBounds(d,s);
    s.zUseGlobal=false;
    s.zMin=minimum;
    s.zMax=maximum;
    const toggle=axes.querySelector('[data-twod=zUseGlobal]');
    if(toggle)toggle.checked=false;
    for(const key of ['zMin','zMax']){
      const el=axes.querySelector('[data-twod='+key+']');
      if(el)el.value=String(s[key]);
    }
  }
  function fitProjection(axis){
    const m=model(d,{...s,zMin:'',zMax:'',zUseGlobal:false});
    const vals=(axis==='x'?m.xi.map(i=>m.p.x[i]):m.yi.map(j=>m.p.y[j])).filter(Number.isFinite);
    if(!vals.length)return;
    let lo=Math.min(...vals),hi=Math.max(...vals);
    if(lo===hi){const pad=Math.max(Math.abs(lo)*0.1,1e-10);lo-=pad;hi+=pad;}
    if(s[axis+'ProjectionScale']==='log'&&lo>0){lo/=1.1;hi*=1.1;}
    else{const pad=(hi-lo)*.05;lo-=pad;hi+=pad;}
    const prefix=axis+'Projection';
    s[prefix+'Min']=Number(lo.toPrecision(10));
    s[prefix+'Max']=Number(hi.toPrecision(10));
    for(const key of [prefix+'Min',prefix+'Max']){
      const el=projection.querySelector('[data-twod='+key+']');
      if(el)el.value=String(s[key]);
    }
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
  for (const key of ['xMode', 'yMode']) {
    const options=[
      ['mean', 'Mean'], ['max', 'Maximum'], ['min', 'Minimum'],
      ['ptp', 'Peak-to-peak amplitude (max − min)'],
      ['rms', 'RMS'], ['sum', 'Sum'],
    ];
    if(key==='yMode')options.push(
      ['linewidth','Peak-to-peak linewidth ('+(orient(d,s.component,s.swap).x.unit||'X units')+')'],
      ['both','Amplitude + linewidth (two scales)']);
    select(projection,key,key==='xMode'?'Top projection method':'Right projection method',options);
  }
  const scanAxisSelect=select(scanSettings,'scanAxisMode','Scan X axis',[
    ['native','Acquired scan variable'],['power','Microwave power (mW)']
  ]);
  // A single user-facing measurement selector; preserve the original
  // scanFeatureMode/scanStatistic fields so saved v11 projects stay compatible.
  const initialMeasurement=s.scanFeatureMode==='statistic'?'stat:'+s.scanStatistic:s.scanFeatureMode;
  const legacyPeak=initialMeasurement==='stat:ptp';
  s.scanMeasurement=initialMeasurement;
  const featureSelect=select(scanSettings,'scanMeasurement','Measurement',[
    ['stat:mean','Mean'],['stat:max','Maximum'],['stat:min','Minimum'],
    ['stat:rms','RMS'],['stat:sum','Sum'],
    ...(legacyPeak?[['stat:ptp','Peak-to-peak amplitude']]:[['amplitude','Peak-to-peak amplitude']]),
    ['linewidth','Peak-to-peak linewidth'],
    ['both','Amplitude + linewidth']
  ]);
  featureSelect.onchange=()=>{
    const value=featureSelect.value;
    s.scanMeasurement=value;
    s.scanFeatureMode=value.startsWith('stat:')?'statistic':value;
    if(value.startsWith('stat:'))s.scanStatistic=value.slice(5);
    onChange();
  };
  const sourceAxis=orient(d,s.component,s.swap).x;
  const scanRangeRow=document.createElement('div');
  scanRangeRow.className='grid2 scan-range-row';
  scanRangeRow.style.gridColumn='1 / -1';
  scanSettings.append(scanRangeRow);
  const intervalHeading=document.createElement('div');
  intervalHeading.style.gridColumn='1 / -1';
  intervalHeading.textContent='Feature interval · '+sourceAxis.name+(sourceAxis.unit?' ('+sourceAxis.unit+')':'');
  scanRangeRow.append(intervalHeading);
  input(scanRangeRow,'scanStatisticMin','Start','number');
  input(scanRangeRow,'scanStatisticMax','End','number');
  const powerReferenceControls=document.createElement('div');
  powerReferenceControls.className='grid2 scan-power-reference-controls';
  powerReferenceControls.style.gridColumn='1 / -1';
  scanSettings.append(powerReferenceControls);
  input(powerReferenceControls,'scanPowerReferenceMW','Reference power P₀ (mW) at 0 dB','number');
  const fitControls=document.createElement('details');
  fitControls.className='advanced-layout scan-fitting-controls';
  fitControls.style.gridColumn='1 / -1';
  fitControls.open=!!(s.scanFitAmplitude||s.scanFitLinewidth);
  const fitHeading=document.createElement('summary');
  fitHeading.textContent='Power saturation fitting';
  fitControls.append(fitHeading);
  const fitBody=document.createElement('div');
  fitBody.className='local-block grid2';
  fitControls.append(fitBody);
  scanSettings.append(fitControls);
  check(fitBody,'scanFitAmplitude','Fit peak-to-peak amplitude');
  check(fitBody,'scanFitLinewidth','Fit peak-to-peak linewidth');
  check(fitBody,'scanFitOffset','Fit constant offset (C)');
  const excludePanel=document.createElement('details');
  excludePanel.className='scan-exclude-panel';
  excludePanel.style.gridColumn='1 / -1';
  const excludeHeading=document.createElement('summary');
  excludeHeading.textContent='Exclude points from fit';
  excludePanel.append(excludeHeading);
  const excludeHint=document.createElement('p');
  excludeHint.className='scan-help-inline';
  excludeHint.textContent='Uncheck a measured point to omit it from both fits. The original spectrum and plotted point are kept. Source trace indices start at 0.';
  excludePanel.append(excludeHint);
  const excludeList=document.createElement('div');
  excludeList.className='scan-exclude-list';
  excludePanel.append(excludeList);
  const resetExcluded=document.createElement('button');
  resetExcluded.type='button';
  resetExcluded.textContent='Include all points';
  resetExcluded.onclick=()=>{s.scanFitExcluded='';onChange();};
  excludePanel.append(resetExcluded);
  fitBody.append(excludePanel);
  const measuredPower=document.createElement('div');
  measuredPower.className='scan-measured-power';
  measuredPower.style.gridColumn='1 / -1';
  fitBody.append(measuredPower);
  const fitBounds=document.createElement('div');
  fitBounds.className='grid2 scan-fit-bounds';
  fitBounds.style.gridColumn='1 / -1';
  fitBody.append(fitBounds);
  const fitBoundTitle=document.createElement('div');
  fitBoundTitle.style.gridColumn='1 / -1';
  fitBoundTitle.textContent='Characteristic power search limits (mW) · blank = measured range';
  fitBounds.append(fitBoundTitle);
  input(fitBounds,'scanFitPowerMinMW','Start','number');
  input(fitBounds,'scanFitPowerMaxMW','End','number');
  const results=document.createElement('div');
  results.className='scan-fit-results';
  results.style.gridColumn='1 / -1';
  fitBody.append(results);
  const formatNumber=(value)=>Number.isFinite(value)?Number(value.toPrecision(7)).toString():'—';
  function outputField(parent,label,value,unit=''){
    const holder=document.createElement('label');
    holder.className='control-label';
    holder.textContent=label+(unit?' ('+unit+')':'');
    const field=document.createElement('input');
    field.type='text';
    field.readOnly=true;
    field.value=value;
    field.title='Calculated result; not editable';
    holder.append(field);
    parent.append(holder);
  }
  function refreshFitResults(){
    if(sp.mode!=='scan')return;
    fitControls.hidden=s.scanFeatureMode==='statistic';
    const powerMode=s.scanAxisMode==='power';
    powerReferenceControls.hidden=!powerMode||!isAttenuationAxis(orient(d,s.component,s.swap).y);
    const signalAxis=orient(d,s.component,s.swap).x.values;
    const signalMin=Math.min(...signalAxis),signalMax=Math.max(...signalAxis);
    for(const [key,fallback] of [['scanStatisticMin',signalMin],['scanStatisticMax',signalMax]]){
      const field=scanRangeRow.querySelector('[data-twod='+key+']');
      if(field&&!Number.isFinite(Number(s[key])))field.placeholder=formatNumber(fallback);
    }
    results.replaceChildren();
    if(s.scanFeatureMode==='statistic')return;
    let data;
    try{data=scanCorrelationData(d,s);}catch(error){
      results.textContent=error.message;return;
    }
    const powers=data.valid?data.points?.map(p=>p.x).filter(p=>Number.isFinite(p)&&p>0):[];
    const low=powers?.length?Math.min(...powers):NaN;
    const high=powers?.length?Math.max(...powers):NaN;
    measuredPower.textContent=Number.isFinite(low)&&Number.isFinite(high)
      ?'Measured power: '+formatNumber(low)+'–'+formatNumber(high)+' mW'
      :'Measured power: unavailable';
    for(const [key,value] of [['scanFitPowerMinMW',low],['scanFitPowerMaxMW',high]]){
      const field=fitBounds.querySelector('[data-twod='+key+']');
      if(field)field.placeholder=formatNumber(value);
    }
    excludeList.replaceChildren();
    const excluded=new Set(String(s.scanFitExcluded||'').split(/[,;\s]+/).filter(Boolean).map(Number));
    if(data.valid&&Array.isArray(data.points)){
      for(const point of data.points){
        const label=document.createElement('label');
        label.className='scan-exclude-point';
        const checkbox=document.createElement('input');
        checkbox.type='checkbox';
        checkbox.checked=!excluded.has(point.index);
        checkbox.dataset.traceIndex=String(point.index);
        checkbox.setAttribute('aria-label','Include source trace '+point.index);
        checkbox.onchange=()=>{
          if(checkbox.checked)excluded.delete(point.index);else excluded.add(point.index);
          s.scanFitExcluded=[...excluded].filter(Number.isInteger).sort((a,b)=>a-b).join(',');
          onChange();
        };
        const scanUnit=orient(d,s.component,s.swap).y.unit||'';
        const source='Trace '+point.index+' · '+formatNumber(point.scan)+' '+scanUnit;
        const powerInfo=s.scanAxisMode==='power'?' · '+formatNumber(point.x)+' mW':'';
        const text=document.createElement('span');
        text.textContent=source+powerInfo;
        label.append(checkbox,text);
        excludeList.append(label);
      }
      excludeHeading.textContent='Exclude points from fit ('+excluded.size+' excluded)';
    }
    if(!data.valid){results.textContent=data.reason||'No valid scan data';return;}
    for(const [key,title,fit,enabled,formula] of [
      ['amplitude','Amplitude',data.amplitudeFit,s.scanFitAmplitude,
       'Spp(P) = A√P / (1 + P/P½) + C'],
      ['linewidth','Linewidth',data.linewidthFit,s.scanFitLinewidth,
       'ΔBpp(P) = A√(1 + P/Psat) + C']
    ]){
      if(!enabled)continue;
      const section=document.createElement('div');
      section.className='scan-fit-model';
      section.style.gridColumn='1 / -1';
      const head=document.createElement('div');
      head.style.fontWeight='600';
      head.textContent=title+' · '+(key==='amplitude'?'Amplitude saturation':'Homogeneous power broadening');
      const eq=document.createElement('div');
      eq.className='scan-fit-equation';
      // Static MathML is parsed as native mathematical markup in Chromium.
      // No user-provided strings are interpolated into these expressions.
      eq.innerHTML=key==='amplitude'
        ?'<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="Peak to peak amplitude saturation model"><mrow><msub><mi>S</mi><mi>pp</mi></msub><mo>(</mo><mi>P</mi><mo>)</mo><mo>=</mo><mfrac><mrow><mi>A</mi><msqrt><mi>P</mi></msqrt></mrow><mrow><mn>1</mn><mo>+</mo><mfrac><mi>P</mi><msub><mi>P</mi><mrow><mn>1</mn><mo>/</mo><mn>2</mn></mrow></msub></mfrac></mrow></mfrac><mo>+</mo><mi>C</mi></mrow></math>'
        :'<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="Peak to peak homogeneous power broadening model"><mrow><msub><mi>&#x394;B</mi><mi>pp</mi></msub><mo>(</mo><mi>P</mi><mo>)</mo><mo>=</mo><mi>A</mi><msqrt><mrow><mn>1</mn><mo>+</mo><mfrac><mi>P</mi><msub><mi>P</mi><mi>sat</mi></msub></mfrac></mrow></msqrt><mo>+</mo><mi>C</mi></mrow></math>';
      section.append(head,eq);
      if(!fit?.valid){
        const notice=document.createElement('div');
        notice.textContent=fit?.reason||'Select the corresponding feature to fit.';
        section.append(notice);
      }else{
        const grid=document.createElement('div');
        grid.className='grid2 scan-fit-parameters';
        outputField(grid,key==='amplitude'?'P½':'Psat',formatNumber(fit.parameters.P),'mW');
        outputField(grid,'A',formatNumber(fit.parameters.A));
        outputField(grid,s.scanFitOffset?'C':'C · fixed',formatNumber(fit.parameters.C));
        outputField(grid,'RMSE',formatNumber(fit.rmse));
        outputField(grid,'R²',fit.r2==null?'—':formatNumber(fit.r2));
        section.append(grid);
        if(fit.warning){
          const warning=document.createElement('div');
          warning.textContent=fit.warning;
          warning.style.fontSize='11px';
          section.append(warning);
        }
      }
      results.append(section);
    }
    if(!s.scanFitAmplitude&&!s.scanFitLinewidth){
      results.textContent='Choose amplitude or linewidth to fit.';
    }
  }
  const solverHelp=document.createElement('button');
  solverHelp.type='button';
  solverHelp.className='help-tip';
  solverHelp.textContent='?';
  solverHelp.dataset.help='Fixed solver: bounded logarithmic search with local refinement. For each candidate characteristic power, linear least squares determines A and optional C. By default the characteristic power is restricted to the measured domain; entering custom bounds permits extrapolation. At least four distinct powers are needed (five when C is fitted).';
  solverHelp.setAttribute('aria-label','Power fitting solver and limits help');
  fitHeading.append(' ',solverHelp);
  const onScanAxisChange=scanAxisSelect.onchange;
  scanAxisSelect.onchange=()=>{onScanAxisChange();refreshFitResults();};
  const onFeatureChange=featureSelect.onchange;
  featureSelect.onchange=()=>{onFeatureChange();refreshFitResults();};
  root.addEventListener('change',refreshFitResults);
  refreshFitResults();
  select(projection,'topFeatureDisplay','Top projection feature',[
    ['none','None'],['amplitude','Peak-to-peak amplitude'],['linewidth','Peak-to-peak linewidth'],['both','Both']
  ]);
  // Legacy sideFeatureDisplay is retained in saved projects, but the right
  // projection now extracts both per-trace measurements through yMode.
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
  select(projection,'xProjectionScale','Top scale',[['linear','Linear'],['log','Log10 / SymLog'],['scientific','Scientific']]);
  select(projection,'yProjectionScale','Side scale',[['linear','Linear'],['log','Log10 / SymLog'],['scientific','Scientific']]);
  // Compatibility-only legacy tick-notation selectors: display mode now owns it.
  const legacyTop=select(projection,'xProjectionNotation','Top notation',[['inherit','Global Y'],['auto','Auto'],['decimal','Decimal'],['scientific','Scientific']]);
  const legacySide=select(projection,'yProjectionNotation','Side notation',[['inherit','Global X'],['auto','Auto'],['decimal','Decimal'],['scientific','Scientific']]);
  legacyTop.closest('label').hidden=true;
  legacySide.closest('label').hidden=true;
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
  const zScaleControl=select(axes,'zScale','Z scale',[['linear','Linear'],['log','Log10 / SymLog'],['scientific','Scientific']]);
  zScaleControl.title='Positive-only Z uses Log10; bipolar Z uses sign-preserving SymLog. Scientific keeps linear spacing.';
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
  auto.onclick = () => { fitZ(); onChange(); };
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
  input(body,'contourLevels','Levels','number');
  const levelInput=body.querySelector('[data-twod=contourLevels]');
  levelInput.min=3;levelInput.max=40;levelInput.step=1;
  levelInput.closest('label').hidden=sp.mode!=='contour';
  const view3d=document.createElement('details');view3d.className='advanced-layout surface-view-controls';
  view3d.open=!!s.viewOpen;
  const viewSummary=document.createElement('summary');viewSummary.textContent='View';viewSummary.title='Rotate the surface by dragging. Use sliders for precise camera settings.';
  const viewBody=document.createElement('div');viewBody.className='local-block surface-view-fields';
  view3d.append(viewSummary,viewBody);
  for(const [key,label,min,max,step] of [['viewAzimuth','Azimuth',0,360,1],['viewElevation','Elevation',5,85,1],['viewZStretch','Z stretch',0.2,3,0.1],['viewZoom','Zoom',0.6,2,0.1]]){
    const field=document.createElement('label');field.className='field';field.textContent=label;
    const row=document.createElement('div');row.className='surface-view-input';
    const slider=document.createElement('input');slider.type='range';slider.min=min;slider.max=max;slider.step=step;slider.value=s[key];slider.dataset.view3d=key;
    const value=document.createElement('output');value.textContent=String(s[key]);
    slider.oninput=()=>{s[key]=Number(slider.value);value.textContent=slider.value;onChange({preview:true});};
    slider.onchange=()=>onChange();
    row.append(slider,value);field.append(row);viewBody.append(field);
  }
  
  view3d.addEventListener('toggle',()=>{if(view3d.isConnected)s.viewOpen=view3d.open;});
  root.prepend(view3d);view3d.hidden=sp.mode!=='surface3d';
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
  for (const [value, label] of [['overlap', 'Overlap'], ['contour','Contour'],['surface3d','3D surface'], ['scan', 'Variable scan']]) {
    if (!mode.querySelector('[value=' + value + ']')) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; mode.append(option);
    }
  }
  mode.value = sp.mode;
  s.mode = ['stack','overlap','scan','contour','surface3d'].includes(sp.mode) ? sp.mode : 'heatmap';
  for (const manager of card.querySelectorAll('.curve-manager')) {
    // Keep the original curve inventory and ordering controls for 1D-derived heatmaps.
    if (sp.twoD.derivedFromCurves) continue;
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
    const styles=manager.querySelector('.curve-style-list');
    if(sp.mode==='scan'){
      manager.classList.add('scan-matrix');
      styles.style.display='';
      const view=sp.twoD.settings;
      const mode=view.scanFeatureMode||'statistic';
      const entries=mode==='statistic'?
        [[-100,'Statistic · '+(view.scanStatistic||'rms')]]:
        [...(mode==='amplitude'||mode==='both'?[[-101,'Peak-to-peak amplitude']]:[]),
         ...(mode==='linewidth'||mode==='both'?[[-102,'Peak-to-peak linewidth']]:[]),
         ...(view.scanFitAmplitude&&(mode==='amplitude'||mode==='both')?[[-103,'Amplitude fit']]:[]),
         ...(view.scanFitLinewidth&&(mode==='linewidth'||mode==='both')?[[-104,'Linewidth fit']]:[])];
      const oldStyles=styles.querySelectorAll('.curve-style-row');
      oldStyles.forEach(e=>e.remove());
      const baseSpacer=document.createElement('div');
      baseSpacer.className='curve-style-row scan-source-spacer';
      baseSpacer.title='The source matrix has no line style; select a derived curve below.';
      styles.append(baseSpacer);
      const styleChoices=['line','dashed-line','dotted-line','circle','filled-circle','square','filled-square',
        'triangle','filled-triangle','diamond','filled-diamond','solid-circle','solid-filled-circle',
        'dashed-circle','dashed-filled-circle','dotted-circle','dotted-filled-circle'];
      for(const [id,title] of entries){
        const left=document.createElement('div');
        left.className='order-item scan-derived-name';
        left.textContent='↳ '+title;
        left.title='Derived from '+d.name+'; original samples stay unchanged.';
        list.append(left);
        const right=document.createElement('div');
        right.className='curve-style-row scan-derived-style';
        const style=document.createElement('select');
        style.className='curve-style';
        style.dataset.curveStyle=id;
        style.setAttribute('aria-label','Display style for '+title);
        for(const label of styleChoices){
          const opt=document.createElement('option');opt.value=label;
          opt.textContent=label.replaceAll('-',' ');style.append(opt);
        }
        const defaultStyle=id===-103||id===-104?'dashed-line':
          id===-100?(sp.scanCurveStyle||'line'):
          sp.scanCurveStyle&&sp.scanCurveStyle!=='line'?sp.scanCurveStyle:'solid-filled-circle';
        style.value=sp.curveStyles?.[id]?.style||defaultStyle;
        style.onchange=()=>{
          sp.curveStyles||={};
          sp.curveStyles[id]={style:style.value};
          onChange();
        };
        right.append(style);styles.append(right);
      }
      current.querySelector('.curve-box-label').title='Source matrix and derived curves; choose each derived curve style in the right column.';
      const sourceLine=24,rows=entries.length+1;
      list.style.height=styles.style.height=(rows*sourceLine+2)+'px';
    }else if(styles){
      styles.style.display='none';
    }
  }
  const derivedView = sp.mode === 'overlap' || sp.mode === 'scan';
  projectionSection.box.querySelector('summary').textContent = 'Projections';
  projectionSection.box.hidden = ['overlap','scan','surface3d'].includes(sp.mode);
  scanSection.box.hidden = sp.mode !== 'scan';
  const scanStyleControl=card.querySelector('.scan-curve-style');
  // Manual-curve-derived scans retain their legacy style control until the
  // separate manual-curve inventory can expose per-derived-curve styles.
  if(scanStyleControl)scanStyleControl.hidden=sp.mode==='scan'&&!manualDerived;
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
  const modeLabel = ({overlay:'Heatmap',heatmap:'Heatmap',contour:'Contour',surface3d:'3D surface',stack:'Stack',overlap:'Overlap',scan:'Variable scan'})[sp.mode] || 'Heatmap';
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
    const {box: variableBox, body: variableBody} = section('Scan variable', false);
    variableBox.classList.add('manual-scan-variable');
    function manualField(title, key, type, value) {
      const label = document.createElement('label'); label.className = 'control-label'; label.textContent = title;
      const input = document.createElement('input'); input.type = type; input.dataset.manualScan = key; input.value = value ?? '';
      if (type === 'number') input.step = 'any';
      label.append(input); variableBody.append(label); return {label, input};
    }
    const nameField = manualField('Variable', 'name', 'text', variable.name || 'Subplot index');
    const unitField = manualField('Unit', 'unit', 'text', variable.unit || '');
    const modeLabelEl = document.createElement('label'); modeLabelEl.className = 'control-label'; modeLabelEl.textContent = 'Mode';
    const modeSelect = document.createElement('select'); modeSelect.dataset.manualScan = 'mode';
    for (const [value, text] of [['linear','Equally spaced'],['array','Custom array']]) {const option = document.createElement('option'); option.value = value; option.textContent = text; modeSelect.append(option);}
    modeSelect.value = variable.mode === 'array' ? 'array' : 'linear'; modeLabelEl.append(modeSelect); variableBody.append(modeLabelEl);
    const startField = manualField('Start', 'start', 'number', variable.start ?? 1);
    const stepField = manualField('Step', 'step', 'number', variable.step ?? 1);
    const arrayField = manualField('Values in current curve order', 'values', 'text', orderedValues.join(', '));
    arrayField.label.style.gridColumn = '1 / -1'; arrayField.input.placeholder = '1, 2, 3';
    const help=document.createElement('button');help.type='button';help.className='help-tip';help.textContent='?';
    help.dataset.help='Each curve has one Y value. Custom arrays follow Current order, and values remain linked to source curves when reordered. Heatmap and Variable scan share this setting.';
    help.setAttribute('aria-label','Scan variable help');
    help.onclick=e=>{e.preventDefault();e.stopPropagation();};
    variableBox.querySelector('summary')?.append(help);
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
      p.sideLinewidth?'axis,coordinate,projection,linewidth,linewidth_unit':'axis,coordinate,projection',
    ];
  for (let i = 0; i < v.x.values.length; i++)
    lines.push('X,' + v.x.values[i] + ',' + p.x[i] + (p.sideLinewidth?',,':''));
  for (let j = 0; j < v.y.values.length; j++)
    lines.push('Y,' + v.y.values[j] + ',' + p.y[j] +
      (p.sideLinewidth?','+p.sideLinewidth[j]+','+v.x.unit:''));
  return lines.join('\n');
}
function isAttenuationAxis(axis) {
  return String(axis?.unit || '').trim().toLowerCase() === 'db' &&
    /atten|power|功率|衰减/i.test(String(axis?.name || ''));
}
function calibratedPowerFactor(axis) {
  const unit=String(axis?.unit||'').trim().toLowerCase().replace('μ','µ');
  if(!/power|microwave|功率/i.test(String(axis?.name||'')))return null;
  return {'mw':1,'w':1000,'µw':0.001}[unit]??null;
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
  const directPowerFactor=calibratedPowerFactor(v.y);
  if (s.scanAxisMode === 'power' && !isAttenuationAxis(v.y) && directPowerFactor===null)
    return { valid: false, reason: 'Power conversion requires a dB attenuation scan axis or calibrated power units.', xAxis: { name: v.y.name, unit: v.y.unit } };
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
    if(directPowerFactor!==null){
      x=x.map(power=>power*directPowerFactor);
    }else{
      const referencePower = Number(s.scanPowerReferenceMW);
      if (String(s.scanPowerReferenceMW ?? '').trim() === '' ||
          !Number.isFinite(referencePower) || referencePower <= 0)
        return { valid: false, reason: 'Enter a positive reference power at 0 dB attenuation.', xAxis };
      x = x.map(attenuation => referencePower * 10 ** (-attenuation / 10));
    }
    xAxis = { name: 'Microwave power', unit: 'mW' };
  }
  // A feature scan measures extrema on each acquired trace; never use the
  // extrema of the aggregated 2D projection in place of per-trace features.
  const featureMode=['amplitude','linewidth','both'].includes(s.scanFeatureMode)?s.scanFeatureMode:'statistic';
  if(featureMode!=='statistic'){
    const featurePoints=v.z.map((row,i)=>{
      const feature=peakFeatures(v.x.values,row,[rangeMin,rangeMax]);
      return {index:i,scan:v.y.values[i],x:x[i],...feature};
    }).filter(point=>point.valid&&Number.isFinite(point.x));
    if(featurePoints.length<2)
      return {valid:false,reason:'Fewer than two valid feature traces.',xAxis};
    const fitting=(feature,enabled,model)=>{
      if(!enabled)return null;
      if(s.scanAxisMode!=='power' && !(directPowerFactor===1 && v.y.unit.toLowerCase()==='mw'))
        return {valid:false,reason:'Select calibrated microwave power (mW) before fitting.'};
      const tokens=String(s.scanFitExcluded??'').trim().split(/[,;\s]+/).filter(Boolean);
      if(tokens.some(t=>!/^\d+$/.test(t)))return {valid:false,reason:'Exclude trace indices must be non-negative integers.'};
      const optionalBound=value=>value===''||value==null?null:Number(value);
      return fitSaturation(featurePoints.map(p=>({index:p.index,power:p.x,signal:p[feature]})),{
        model,allowOffset:s.scanFitOffset===true,
        excludedIndices:tokens.map(Number),
        minPower:optionalBound(s.scanFitPowerMinMW),
        maxPower:optionalBound(s.scanFitPowerMaxMW)
      });
    };
    return {valid:true,x:featurePoints.map(p=>p.x),scan:featurePoints.map(p=>p.scan),
      y:featurePoints.map(p=>featureMode==='linewidth'?p.linewidth:p.amplitude),
      secondary:featureMode==='both'?featurePoints.map(p=>p.linewidth):null,
      points:featurePoints,xAxis,featureMode,statisticRange:[rangeMin,rangeMax],
      axisUnit:v.x.unit||'',mode:s.scanAxisMode,
      amplitudeFit:fitting('amplitude',s.scanFitAmplitude===true&&featureMode!=='linewidth','amplitude'),
      linewidthFit:fitting('linewidth',s.scanFitLinewidth===true&&featureMode!=='amplitude','linewidth'),
      yAxis:{name:featureMode==='linewidth'?'Peak-to-peak linewidth':'Peak-to-peak amplitude',
        unit:featureMode==='linewidth'?(v.x.unit||''):''},
      secondaryAxis:featureMode==='both'?{name:'Peak-to-peak linewidth',unit:v.x.unit||''}:null};
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
export function raster(m, width, height, stops = COLOR_SCHEMES.turbo.gradient, zScale = 'linear', yScale = 'linear') {
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
      cellIndex(v.y.values, axisValue(1-(j+0.5)/height,yr[0],yr[1],yScale)),
    );
  for (let j = 0; j < height; j++)
    for (let i = 0; i < width; i++) {
      const z = v.z[ys[j]][xs[i]],
        k = (j * width + i) * 4;
      if (!Number.isFinite(z)) continue;
      const c = color(stops, zFraction(z,zmin,zmax,zScale));
      image.data.set(c, k);
      image.data[k + 3] = 255;
    }
  c.putImageData(image, 0, 0);
  return canvas;
}
export function adjustZ(s, m, delta) {
  const bounds=zoomZ(m.zmin,m.zmax,delta,s.zScale);
  if(!bounds)return;
  s.zUseGlobal=false;
  [s.zMin,s.zMax]=bounds;
}
export function stackRows(m, s) {
  return m.yi.filter((_, k) => k % Number(s.step) === 0);
}
export function plotInsets(d, s, box, title = '', options = {}) {
  const v = orient(d, s.component, s.swap),
    w = box.cellW,
    h = box.cellH,
    hasTop = s.mode !== 'surface3d' && s.showProjections && s.showXProjection !== false,
    hasSide = s.mode !== 'surface3d' && s.showProjections && s.showYProjection !== false,
    proj = hasTop || hasSide,
    cb = s.showColorbar && ['heatmap','contour','surface3d'].includes(s.mode),
    axisSize = options.axisSize || 14,
    projectionTitleSize = Math.max(7, Number(options.projectionTitleSize) || 11);
  const gX = s.mode !== 'surface3d' && options.g?.show && Number.isFinite(options.frequency) && fieldToGauss(v.x),
    gY = s.mode !== 'surface3d' && options.g?.show && Number.isFinite(options.frequency) && fieldToGauss(v.y),
    gapX = Math.max(gY ? 80 : 0, Number(s.projectionGapX) || 0),
    gapY = Math.max(0, Number(s.projectionGapY) || 0),
    topH = hasTop ? Math.max(25, h * 0.17) : 0,
    gSpace = gX ? Math.max(34, options.g.titleDistance + axisSize + 8) : 0,
    sideDual=s.yMode==='both'&&hasSide;
  return {
    left: Math.max(52, options.yTitleDistance || 35),
    right: hasSide ? gapX + w * 0.14 + (cb ? 100 : 20) : cb ? 100 : gY ? 80 : 20,
    top: (hasTop
      ? Math.max(title.trim() ? 62 : 40, projectionTitleSize * 2 + 4) + topH + gapY + gSpace
      : Math.max(title.trim() ? 65 : 42, hasSide ? projectionTitleSize * 2 + 4 : 0) + (gX ? 34 : 0))
      + (sideDual ? 12 : 0),
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
    hasTop = s.mode !== 'surface3d' && s.showProjections && s.showXProjection !== false,
    hasSide = s.mode !== 'surface3d' && s.showProjections && s.showYProjection !== false,
    proj = hasTop || hasSide,
    cb = s.showColorbar && ['heatmap','contour','surface3d'].includes(s.mode),
    stops = colorStops(s, options),
    tick = options.tickSize || 11,
    projectionTitleSize = Math.max(7, Number(options.projectionTitleSize) || 11),
    axisSize = options.axisSize || 14,
    titleSize = options.titleSize || 15,
    lineWidth = options.lineWidth || 1.4;
  const gX = s.mode !== 'surface3d' && options.g?.show && Number.isFinite(options.frequency) && fieldToGauss(v.x),
    gY = s.mode !== 'surface3d' && options.g?.show && Number.isFinite(options.frequency) && fieldToGauss(v.y),
    natural = plotInsets(d, s, box, title, options),
    insets = options.mainInsets || natural,
    { gapX, gapY, topH, gSpace } = natural,
    x = cx + insets.left,
    y = cy + insets.top,
    topY = y - gapY - gSpace - topH,
    pw = w - insets.left - insets.right,
    ph = h - insets.top - insets.bottom,
    X = (a) => x + ((a - xr[0]) / (xr[1] - xr[0])) * pw,
    Y = (a) => y + ph - axisCoordinate(a,yr[0],yr[1],s.yScale) * ph;
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
            s.zScale,
            s.yScale,
          );
        ctx.drawImage(image, x, y, pw, ph);
      } else
        for (const j of yi) {
          const ye = edge(v.y.values, j).map(Y);
          for (const i of xi) {
            const z = v.z[j][i];
            if (!Number.isFinite(z)) continue;
            const xe = edge(v.x.values, i).map(X);
            ctx.fillStyle = css(color(stops, zFraction(z,zmin,zmax,s.zScale)));
            ctx.fillRect(
              Math.min(...xe),
              Math.min(...ye),
              Math.abs(xe[1] - xe[0]),
              Math.abs(ye[1] - ye[0]),
            );
          }
        }
    } else if (s.mode === 'contour') {
      const count=Math.max(3,Math.min(40,Math.round(Number(s.contourLevels)||12)));
      const levels=zTicks(zmin,zmax,s.zScale,count+2).slice(1,-1);
      const segments=contourSegments(m,levels,s.zScale);
      ctx.lineWidth=Math.max(0.65,lineWidth);
      for (const level of levels) {
        ctx.strokeStyle=css(color(stops,zFraction(level,zmin,zmax,s.zScale)));
        ctx.beginPath();
        for (const segment of segments) if (segment.level===level) {
          ctx.moveTo(X(segment.x0),Y(segment.y0));
          ctx.lineTo(X(segment.x1),Y(segment.y1));
        }
        ctx.stroke();
      }
    } else if (s.mode === 'surface3d') {
      renderSurface(ctx,m,(t)=>color(stops,t),s,mapBox,theme,Math.min(2,typeof window==='undefined'?1:window.devicePixelRatio||1));
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
    if (options.grid && s.mode!=='surface3d') {
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
    yt = s.yScale==='log' ? scaledTicks(yr[0],yr[1],'log',5) : options.yTicks
      ? options.yTicks(...yr, Number(s.yStep), 5)
      : Array.from({ length: 5 }, (_, k) => yr[0] + ((yr[1] - yr[0]) * k) / 4);
  const xf = tickFormatter(xt, options.xTickFormat),
    yf = tickFormatter(yt, s.yScale==='scientific'?{...options.yTickFormat,notation:'scientific'}:options.yTickFormat);
  for (const a of (s.mode==='surface3d'?[]:xt))
    text(
      xf.format(a),
      X(a),
      y + ph + tick + 3,
      tick,
      a === xt[0] ? 'left' : a === xt.at(-1) ? 'right' : 'center',
    );
  if (options.showYTicks !== false)
    for (const b of (s.mode==='surface3d'?[]:yt)) text(yf.format(b), x - 6, Y(b), tick, 'right');
  if (s.mode!=='surface3d'&&xf.exponent) text(xf.multiplier, x + pw, y + ph + tick * 2 + 7, tick, 'right');
  if (s.mode!=='surface3d'&&yf.exponent && options.showYTicks !== false)
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
      [sideWidthMin,sideWidthMax]=p.sideLinewidth?extent(p.sideLinewidth,yi):[0,1],
      sideWidthPad=(sideWidthMax-sideWidthMin)*0.08,
      sideWidthBounds=[sideWidthMin-sideWidthPad,sideWidthMax+sideWidthPad],
      ap = (b0 - a0) * 0.08,
      cp = (e0 - c0) * 0.08,
      xScale=s.xProjectionScale||'linear',yScale=s.yProjectionScale||'linear',
      xBounds=hasTop?positiveAxisDomain(p.x,
        s.xProjectionMin === '' ? a0 - ap : Number(s.xProjectionMin),
        s.xProjectionMax === '' ? b0 + ap : Number(s.xProjectionMax),
        xScale,{label:'Top projection',explicitMin:s.xProjectionMin!=='',explicitMax:s.xProjectionMax!=='',signed:true}):[a0-ap,b0+ap],
      yBounds=hasSide?positiveAxisDomain(p.y,
        s.yProjectionMin === '' ? c0 - cp : Number(s.yProjectionMin),
        s.yProjectionMax === '' ? e0 + cp : Number(s.yProjectionMax),
        yScale,{label:'Side projection',explicitMin:s.yProjectionMin!=='',explicitMax:s.yProjectionMax!=='',signed:true}):[c0-cp,e0+cp],
      [a,b]=xBounds,[c,e]=yBounds;
    if (
      (hasTop && (!Number.isFinite(a + b) || a >= b)) ||
      (hasSide && (!Number.isFinite(c + e) || c >= e))
    )
      throw Error('Invalid projection intensity range');
    const XP = (z) => top.y + top.h - axisCoordinate(z,a,b,xScale) * top.h,
      YP = (z) => side.x + axisCoordinate(z,c,e,yScale) * side.w,
      YPWidth = (z) => side.x + ((z-sideWidthBounds[0])/(sideWidthBounds[1]-sideWidthBounds[0]))*side.w,
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
        yScale:xScale,
        projection: 'top',
      });
      clip(top, () => line(xi, (i) => [X(v.x.values[i]), XP(p.x[i])]));
      border(top);
      const topTicks=scaledTicks(a,b,xScale,4);
      const topNotation=xScale==='scientific'?'scientific':xScale==='log'?'auto':s.xProjectionNotation&&s.xProjectionNotation!=='inherit'?s.xProjectionNotation:options.yTickFormat?.notation;
      const pf=tickFormatter(topTicks,{...options.yTickFormat,notation:topNotation});
      for (const z of topTicks) {
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
      if(s.topFeatureDisplay && s.topFeatureDisplay!=='none'){
        const feature=peakFeatures(v.x.values,p.x,xr);
        const entries=feature.valid?[
          ...(s.topFeatureDisplay!=='linewidth'?['PP '+feature.amplitude.toPrecision(4)]:[]),
          ...(s.topFeatureDisplay!=='amplitude'?['Δ'+v.x.name+' '+feature.linewidth.toPrecision(4)+(v.x.unit?' '+v.x.unit:'')]:[])
        ]:['Feature unavailable'];
        entries.forEach((entry,k)=>text(entry,top.x+top.w/2,top.y+top.h-13-12*(entries.length-1-k),Math.max(8,tick-2)));
      }
    }
    if (hasSide) {
      projectionRegions.push({
        x0: side.x,
        y0: side.y,
        pw: side.w,
        ph: side.h,
        xmin: c,
        xmax: e,
        xScale:yScale,
        ymin: yr[0],
        ymax: yr[1],
        yScale:s.yScale,
        projection: 'side',
        axisHitWidth: gapX,
      });
      clip(side, () => {
        line(yi, (j) => [YP(p.y[j]), Y(v.y.values[j])]);
        if(p.sideLinewidth)line(yi,(j)=>[YPWidth(p.sideLinewidth[j]),Y(v.y.values[j])],theme.text);
      });
      border(side);
      const n = Math.max(1, Math.min(3, Math.floor(side.w / (tick * 5))));
      const sideTicks=scaledTicks(c,e,yScale,n+1);
      const sideNotation=yScale==='scientific'?'scientific':yScale==='log'?'auto':s.yProjectionNotation&&s.yProjectionNotation!=='inherit'?s.yProjectionNotation:options.xTickFormat?.notation;
      const pf=tickFormatter(sideTicks,{...options.xTickFormat,notation:sideNotation});
      for (let k = 0; k <= n; k++) {
        const q = sideTicks[k];
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
      if(p.sideLinewidth){
        const widthTicks=scaledTicks(sideWidthBounds[0],sideWidthBounds[1],'linear',n+1);
        const widthFmt=tickFormatter(widthTicks,{notation:'auto'});
        for (let k=0;k<widthTicks.length;k++){
          text(widthFmt.format(widthTicks[k]),YPWidth(widthTicks[k]),side.y-9,Math.max(8,tick-2),
            k===0?'left':k===widthTicks.length-1?'right':'center');
        }
        const widthUnit=v.x.unit?' ('+v.x.unit+')':'';
        text('Linewidth'+widthUnit,side.x+side.w/2,side.y-38,Math.max(9,projectionTitleSize-1));
      }
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
        const title = s.yProjectionTitle || (s.yMode==='linewidth'
          ? v.y.name+' · peak-to-peak linewidth ('+(v.x.unit||'X')+')'
          :s.yMode==='both'?v.y.name+' · amplitude + linewidth':`${v.y.name} projection (${s.yMode})`);
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
      : s.zScale!=='log' && options.z?.step > 0 && options.yTicks
        ? options.yTicks(zmin, zmax, options.z.step)
        : zTicks(zmin,zmax,s.zScale)) {
      const py = y + ph - ph*zFraction(z,zmin,zmax,s.zScale);
      ctx.strokeStyle = theme.axis;
      ctx.beginPath();
      ctx.moveTo(bar.x + bar.w, py);
      ctx.lineTo(bar.x + bar.w + 4, py);
      ctx.stroke();
      text(s.zScale==='scientific'?z.toExponential(2):s.zScale==='log'?Number(z.toPrecision(3)).toString():z.toPrecision(4), bar.x + bar.w + 6, py, tick, 'left');
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
    zScale:s.zScale,
    surface3d:s.mode==='surface3d',
  };
}
