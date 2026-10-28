// Short visible labels with the existing help-tip styling for secondary explanations.
function compactField(card, selector, labelText, helpText = '') {
 const input=card.querySelector(selector);
 if(!input)return;
 const label=input.closest('label')||input.closest('.field')?.querySelector('label')||input.parentElement?.querySelector('label');
 if(!label)return;
 const node=[...label.childNodes].find(n=>n.nodeType===3);
 if(node)node.textContent=labelText;
 else label.prepend(document.createTextNode(labelText));
 if(!helpText)return;
 const button=document.createElement('button');
 button.type='button';button.className='help-tip';button.textContent='?';
 button.setAttribute('aria-label',labelText+' help');
 button.dataset.help=helpText;
 button.title=helpText;
 const tip=()=>document.getElementById('helpTooltip');
 const show=()=>{const panel=tip();if(!panel)return;panel.textContent=helpText;const r=button.getBoundingClientRect();panel.style.left=Math.max(6,Math.min(innerWidth-365,r.right+7))+'px';panel.style.top=Math.max(6,Math.min(innerHeight-100,r.top-4))+'px';panel.classList.add('show');};
 const hide=()=>tip()?.classList.remove('show');
 button.addEventListener('mouseenter',show);button.addEventListener('mouseleave',hide);
 button.addEventListener('focus',show);button.addEventListener('blur',hide);
 label.insertBefore(button,input.parentElement===label?input:null);
}
function compactSubplotLabels(card) {
 const field={
  lineWidth:['Line / px','Blank uses the global line width.'],
  symbolSize:['Symbol / px','Diameter of markers in the subplot.'],
  scanCurveStyle:['Scan style','Style is independent of the source curve.'],
  offsetScale:['Offset','Stack separation factor.'],
  manualOffsets:['Offsets','Comma-separated offsets for individual traces.'],
  labelMode:['Labels'],legendPosition:['Legend'],
  directLabelX:['Direct X'],directLabelYShift:['Direct Y'],
  noiseRegions:['Noise','Noise reference coordinates for this subplot.'],
  xUseGlobal:['Global X'],yUseGlobal:['Global Y'],
  xTickDigits:['X digits'],yTickDigits:['Y digits'],
  xTickNotation:['X notation'],yTickNotation:['Y notation'],
  xAxisLabel:['X title'],yAxisLabel:['Y title'],
  gLabel:['g label'],gTitleDistance:['g distance'],gUseGlobal:['Global g'],
  freqMode:['Alignment'],localFreqMode:['Target'],localFreqTarget:['GHz'],
  gridRow:['Row'],gridCol:['Column'],rowSpan:['Row span'],colSpan:['Col span']
 };
 const twoD={
  zScale:['Z scale','Log10 requires positive signal values. Nonpositive samples are masked, not shifted.'],
  zMin:['Z min'],zMax:['Z max'],zUseGlobal:['Global Z'],
  contourLevels:['Levels','Number of contour levels between Z min and max.'],
  viewAzimuth:['Azimuth'],viewElevation:['Elevation'],viewZStretch:['Z stretch'],viewZoom:['Zoom'],
  scanPowerReferenceMW:['P₀ / mW','Microwave reference power at 0 dB attenuation.'],
  xMode:['Top method'],yMode:['Side method'],
  scanAxisMode:['Scan axis'],scanStatistic:['Statistic'],
  scanStatisticMin:['Start'],scanStatisticMax:['End'],
  xLabel:['X title'],yLabel:['Y title'],colorbarLabel:['Z title'],
  xProjectionTitle:['Top title'],yProjectionTitle:['Side title'],
  projectionGapX:['Side gap'],projectionGapY:['Top gap'],
  projectionScheme:['Projection color'],scheme:['Color scale'],
  xRangeLabelX:['Top X / %'],xRangeLabelY:['Top Y / %'],
  yRangeLabelX:['Side X / %'],yRangeLabelY:['Side Y / %'],
  xProjectionMin:['Top min'],xProjectionMax:['Top max'],
  yProjectionMin:['Side min'],yProjectionMax:['Side max']
 };
 for(const [key,[label,help]] of Object.entries(field))compactField(card,'[data-field="'+key+'"]',label,help);
 for(const [key,[label,help]] of Object.entries(twoD))compactField(card,'[data-twod="'+key+'"]',label,help);
 for(const [key,[label]] of Object.entries({viewAzimuth:['Azimuth'],viewElevation:['Elevation'],viewZStretch:['Z stretch'],viewZoom:['Zoom']})) compactField(card,'[data-view3d="'+key+'"]',label);
}

// Move existing controls instead of copying them, preserving IDs, events and saved settings.
export function organizeSubplot(card,sp,{axisInfo,frequency,onChange,onProcessing}){
 const root=card.querySelector('.subplot-body'),open=sp.uiOpen??={},field=k=>card.querySelector('[data-field="'+k+'"]'),two=k=>card.querySelector('[data-twod="'+k+'"]');
 function section(name,key,defaultOpen=false){const box=document.createElement('details');box.className='advanced-layout subplot-section';box.dataset.section=key;box.open=open[key]??defaultOpen;const summary=document.createElement('summary');summary.textContent=name;const body=document.createElement('div');body.className='local-block';box.append(summary,body);box.addEventListener('toggle',()=>{open[key]=box.open;});root.append(box);return {box,body};}
 function top(el,parent=root){while(el&&el.parentElement!==parent)el=el.parentElement;return el;}
 function move(el,target,parent=root){const node=top(el,parent);if(node)target.append(node);}
 const oldAxes=field('xUseGlobal').closest('details'),oldG=field('gUseGlobal').closest('details'),oldColor=field('colorSchemeOverride').closest('details'),oldLayout=field('gridRow').closest('details'),oldFreq=field('freqMode').closest('details'),oldAnnotations=card.querySelector('[data-annotation-details]'),oldProjection=two('xMode')?.closest('.subplot-body > details'),old2D=card.querySelector('.twod-options');
 const data=section('Data','data',true),plot=section('Plot','plot',true),legend=section('Labels','legend'),processing=section('Processing','processing');
 move(card.querySelector('.curve-manager'),data.body);move(field('mode'),plot.body);move(field('offsetScale'),plot.body);move(field('manualOffsets'),plot.body);const lineStyle=card.querySelector('.subplot-line-style');if(lineStyle)plot.body.append(lineStyle);const scanStyle=card.querySelector('.scan-curve-style');if(scanStyle)plot.body.append(scanStyle);const view3d=card.querySelector('.surface-view-controls');if(view3d){plot.body.append(view3d);view3d.hidden=sp.mode!=='surface3d';}const scanVariable=card.querySelector('.manual-scan-variable');if(scanVariable)plot.body.append(scanVariable);
 if(old2D){const contents=old2D.querySelector('.local-block');plot.body.append(contents);contents.classList.remove('local-block','grid2');old2D.remove();}
 const stack=sp.mode==='stack',overlap=sp.mode==='overlap',scan=sp.mode==='scan',traceView=stack||overlap;for(const key of ['offsetMode','offsetScale','offsetDirection','manualOffsets']){const el=field(key),wrap=el.closest('.field');wrap.hidden=!stack||(!!sp.twoD&&['offsetMode','offsetDirection','manualOffsets'].includes(key))||(!sp.twoD&&(key==='manualOffsets'?sp.offsetMode!=='manual':key==='offsetScale'&&sp.offsetMode==='manual'));}
 if(two('step'))two('step').parentElement.hidden=!(stack||overlap);
 const modeField=field('mode').closest('.field'),offsetMode=field('offsetMode').closest('.field');plot.body.prepend(modeField);modeField.after(offsetMode);if(scanVariable)modeField.after(scanVariable);for(const row of [...plot.body.children])if(row.classList.contains('grid2')&&!row.children.length)row.remove();
 if(sp.twoD){const scale=field('offsetScale').closest('.field');two('step').parentElement.before(scale);for(const row of [...plot.body.children])if(row.classList.contains('grid2'))row.hidden=true;}
 field('gMin').closest('.grid3').classList.add('control-triple');field('gLabel').closest('.grid2').classList.add('control-pair');

 move(field('labelMode'),legend.body);move(field('directLabelX'),legend.body);const direct=sp.labelMode==='direct'||sp.labelMode==='both';field('directLabelX').closest('.grid2').hidden=!direct;field('legendPosition').closest('details').hidden=sp.labelMode==='none'||sp.labelMode==='direct';
 if(sp.twoD){field('labelMode').closest('.field').querySelector('label').textContent=overlap?'Overlap trace labels':'Stack trace labels';for(const option of field('labelMode').options){option.textContent=option.value==='none'?'None':option.value==='legend'?'Trace values':option.textContent;option.hidden=!['legend','none'].includes(option.value);}field('legendPosition').closest('details').hidden=true;field('directLabelX').closest('.grid2').hidden=true;legend.box.hidden=!traceView;}
 const links=field('showYTicks').closest('.link-row');for(const el of [...links.children])oldAxes.querySelector('.local-block').append(el);links.remove();
 const apply=card.querySelector('[data-action=applyAll]').parentElement;legend.body.append(apply);
 const noise=field('noiseRegions');move(noise,processing.body);move(card.querySelector('.noise-controls'),processing.body);move(field('showNoiseRegions'),processing.body);move(card.querySelector('.noise-draft'),processing.body);
 const noiseLabel=noise.closest('.field').querySelector('label');noiseLabel.textContent='Noise regions · '+axisInfo.x.name+(axisInfo.x.unit?' ('+axisInfo.x.unit+')':'');noise.placeholder='Coordinate ranges';const note=document.createElement('div');note.hidden=true;note.className='small processing-summary';processing.body.prepend(note);
 for(const el of [...processing.body.children])if(el!==note)el.hidden=true;
 const full=document.createElement('button');full.type='button';full.textContent='Open Processing';full.onclick=onProcessing;processing.body.append(full);oldFreq.querySelector('summary').firstChild.textContent='Frequency ';processing.body.append(oldFreq);
 const gNote=document.createElement('div');gNote.className='small';gNote.textContent='ν '+(Number.isFinite(frequency)?frequency.toFixed(6)+' GHz':'—');oldG.querySelector('.local-block').prepend(gNote);
 oldAxes.querySelector('summary').firstChild.textContent=sp.twoD?'Axes · X / Y / Z ':'Axes · X / Y ';oldG.querySelector('summary').firstChild.textContent='g axis ';oldColor.querySelector('summary').firstChild.textContent='Colors ';oldLayout.querySelector('summary').textContent='Layout';
 // Split the axes into matching nested sections; range inheritance has an explicit scope.
 const axesBody=oldAxes.querySelector('.local-block');for(const axis of ['x','y']){const A=axis.toUpperCase(),part=section(A+' axis','axis'+A);for(const k of [axis+'UseGlobal',axis+'Min',axis+'TickDigits',axis==='x'?'linkX':'linkY',...(axis==='y'?['showYTicks']:[])])move(field(k),part.body,axesBody);field(axis+'UseGlobal').nextElementSibling.textContent='Global '+A;const title=two(axis+'Label');if(title)move(title,part.body,axesBody);if(!title){const wrap=document.createElement('div');wrap.className='field';const label=document.createElement('label');label.textContent=A+' title';const input=document.createElement('input');input.value=sp[axis+'AxisLabel']||'';input.placeholder='Inherit global / coordinate name';input.dataset.field=axis+'AxisLabel';input.onchange=()=>{sp[axis+'AxisLabel']=input.value;onChange();};wrap.append(label,input);part.body.append(wrap);}axesBody.append(part.box);}
 // Match X/Y field ordering and row widths to the colorbar controls.
 for(const axis of ['x','y']){const b=axesBody.querySelector('[data-section=axis'+axis.toUpperCase()+'] .local-block'),title=two(axis+'Label')?.parentElement||field(axis+'AxisLabel')?.closest('.field');if(title)b.prepend(title);const ranges=field(axis+'Min').closest('.grid3');ranges.classList.add('control-triple');field(axis+'TickDigits').closest('.grid2').classList.add('control-pair');}
 if(sp.twoD){const z=section('Z / colorbar','axisZ');for(const k of ['zUseGlobal','zScale','zMin','colorbarLabel','hideColorbarTitle','showColorbar'])move(two(k),z.body,axesBody);const auto=[...axesBody.children].find(e=>e.tagName==='BUTTON'&&e.textContent==='Auto Z');if(auto){const actions=document.createElement('div');actions.className='row';actions.append(auto);z.body.append(actions);}axesBody.append(z.box);}
 if(oldProjection){oldProjection.querySelector('summary').textContent='Projections';oldProjection.open=open.projections??true;oldProjection.addEventListener('toggle',()=>{open.projections=oldProjection.open;});const body=oldProjection.querySelector('.local-block');for(const [axis,name,keys]of [['x','Top projection',['xMode','projectionYMin','projectionYMax','xProjectionMin','xProjectionMax','showXProjection','showXProjectionRange','showXProjectionTitle','xProjectionTitle']],['y','Right projection',['yMode','projectionXMin','projectionXMax','yProjectionMin','yProjectionMax','showYProjection','showYProjectionRange','showYProjectionTitle','yProjectionTitle']]]){const part=section(axis==='x'?'Top':'Side','projection'+axis,true);for(const k of keys){const el=two(k);move(el,part.body,body);if(k.startsWith('projection')){const source=axis==='x'?axisInfo.y:axisInfo.x;el.parentElement.firstChild.textContent=k.endsWith('Min')?'Range min':'Range max';}}// Keep each range together and visibility switches on their own rows.
 const rangePair=(first,second)=>{const row=document.createElement('div');row.className='control-pair';const a=two(first).parentElement,b=two(second).parentElement;a.before(row);row.append(a,b);};
 rangePair(axis==='x'?'projectionYMin':'projectionXMin',axis==='x'?'projectionYMax':'projectionXMax');rangePair(axis+'ProjectionMin',axis+'ProjectionMax');
 body.append(part.box);}body.classList.remove('grid2');const positions=[...body.children].find(e=>e.tagName==='DETAILS'&&e.querySelector('summary').textContent==='Range label positions');if(positions)body.append(positions);}
 if(oldProjection){const positions=two('xRangeLabelX').parentElement.parentElement;positions.classList.remove('grid2');for(const a of ['x','y']){const row=document.createElement('div');row.className='control-pair';positions.append(row);row.append(two(a+'RangeLabelX').parentElement,two(a+'RangeLabelY').parentElement);}}
 const layoutBody=oldLayout.querySelector('.grid4');layoutBody.classList.remove('grid4');for(const keys of [['gridRow','gridCol'],['rowSpan','colSpan']]){const row=document.createElement('div');row.className='control-pair';layoutBody.append(row);for(const key of keys)row.append(field(key).closest('.field'));}
 for(const e of [...root.children])if(e.classList.contains('sep'))e.remove();
 root.append(data.box,plot.box,oldAxes,oldG,oldColor,legend.box);if(oldProjection)root.append(oldProjection);root.append(oldAnnotations,processing.box,oldLayout);
 compactSubplotLabels(card);
 const status=()=>{if(!sp.twoD)note.textContent='Noise regions: '+(sp.noiseRegions||'automatic diff-MAD');const local=(!sp.xUseGlobal||!sp.yUseGlobal)||['xTickDigits','yTickDigits','xAxisLabel','yAxisLabel'].some(k=>sp[k]!==''&&sp[k]!==undefined)||['xTickNotation','yTickNotation'].some(k=>sp[k]&&sp[k]!=='inherit')||!!sp.twoD&&(sp.twoD.settings.zUseGlobal===false||sp.twoD.settings.xLabel||sp.twoD.settings.yLabel||sp.twoD.settings.colorbarTitleUseGlobal===false);const tag=oldAxes.querySelector('.override-tag');tag.textContent=local?'LOCAL':'GLOBAL';tag.classList.toggle('local',!!local);const gt=oldG.querySelector('.override-tag');gt.textContent=sp.gUseGlobal?'GLOBAL':'LOCAL';gt.classList.toggle('local',!sp.gUseGlobal);const colors=sp.colorSchemeOverride!=='inherit'||!!sp.twoD&&(sp.twoD.settings.scheme!=='inherit'||sp.twoD.settings.projectionScheme!=='inherit'),ct=oldColor.querySelector('.override-tag');ct.textContent=colors?'LOCAL':'GLOBAL';ct.classList.toggle('local',!!colors);};status();card.addEventListener('change',status);
}
