// Shared CW EPR peak-to-peak analysis and bounded saturation fitting.
// All functions are pure and keep the acquired matrices unchanged.
export function peakFeatures(axis, signal, interval = null) {
  if (!Array.isArray(axis) || !Array.isArray(signal) || axis.length !== signal.length)
    return {valid:false,reason:'Axis and signal arrays must have equal lengths.'};
  const lo=interval ? Math.min(...interval) : -Infinity;
  const hi=interval ? Math.max(...interval) : Infinity;
  if (interval && (!Number.isFinite(lo)||!Number.isFinite(hi)||lo>=hi))
    return {valid:false,reason:'Invalid feature extraction interval.'};
  let min=Infinity,max=-Infinity,xMin=NaN,xMax=NaN,count=0;
  for (let i=0;i<axis.length;i++){
    const x=axis[i],y=signal[i];
    if (!Number.isFinite(x)||!Number.isFinite(y)||x<lo||x>hi) continue;
    count++;
    if(y<min){min=y;xMin=x;}
    if(y>max){max=y;xMax=x;}
  }
  if(count<2)return {valid:false,reason:'At least two finite points are required.'};
  if(max===min)return {valid:false,reason:'A constant signal has undefined extrema separation.'};
  return {valid:true,amplitude:max-min,linewidth:Math.abs(xMax-xMin),xMax,xMin,maximum:max,minimum:min,count};
}
export function traceFeatures(matrix, component='real', interval=null) {
  const axis=matrix?.x?.values;
  const rows=component==='imag'?matrix?.imag:component==='magnitude'?
    matrix?.real?.map((row,j)=>row.map((v,i)=>Math.hypot(v,matrix.imag?.[j]?.[i]||0))):matrix?.real;
  if(!Array.isArray(rows)||!Array.isArray(axis)||!Array.isArray(matrix?.y?.values))
    return {valid:false,reason:'Invalid two-dimensional matrix.'};
  return {valid:true,points:rows.map((row,i)=>({
    index:i,scan:matrix.y.values[i],...peakFeatures(axis,row,interval)
  }))};
}
export function attenuationToPower(dB,p0) {
  if(!Number.isFinite(dB)||!Number.isFinite(p0)||p0<=0)return NaN;
  const power=p0*10**(-dB/10);
  return Number.isFinite(power)&&power>0?power:NaN;
}
export const saturationModels={
  amplitude:(p,a,q,c)=>a*Math.sqrt(p)/(1+p/q)+c,
  linewidth:(p,a,q,c)=>a*Math.sqrt(1+p/q)+c
};
function linearFit(x,y,offset){
  let sw=0,sx=0,sy=0,sxx=0,sxy=0;
  for(let i=0;i<x.length;i++){const u=x[i],v=y[i];sw++;sx+=u;sy+=v;sxx+=u*u;sxy+=u*v;}
  const det=sw*sxx-sx*sx;
  if(!(Math.abs(det)>1e-14*Math.max(sw*sxx,1)))return null;
  if(!offset)return sxx>0?{a:sxy/sxx,c:0}:null;
  const a=(sw*sxy-sx*sy)/det,c=(sy-a*sx)/sw;
  return {a,c};
}
function solveAt(points,model,pHalf,allowOffset){
  const basis=points.map(p=>model==='amplitude'?Math.sqrt(p.power)/(1+p.power/pHalf):Math.sqrt(1+p.power/pHalf));
  const values=points.map(p=>p.signal);
  const r=linearFit(basis,values,allowOffset);
  if(!r||!Number.isFinite(r.a)||!Number.isFinite(r.c))return null;
  const predict=p=>saturationModels[model](p,r.a,pHalf,r.c);
  const residuals=points.map(p=>p.signal-predict(p.power));
  const sse=residuals.reduce((a,v)=>a+v*v,0);
  return {...r,pHalf,sse,residuals,predict};
}
export function fitSaturation(rawPoints,{model='amplitude',allowOffset=false,minPower=null,maxPower=null,excludedIndices=[]}={}){
  if(!saturationModels[model])return {valid:false,reason:'Unknown saturation model.'};
  if(!Array.isArray(rawPoints))return {valid:false,reason:'Missing scan points.'};
  const omitted=new Set(excludedIndices);
  const points=rawPoints.map((p,i)=>({...p,index:p.index??i}))
    .filter(p=>!omitted.has(p.index)&&Number.isFinite(p.power)&&p.power>0&&Number.isFinite(p.signal))
    .sort((a,b)=>a.power-b.power);
  const required=allowOffset?5:4;
  if(points.length<required)return {valid:false,reason:`At least ${required} valid points are required.`};
  if(new Set(points.map(p=>p.power)).size<required)return {valid:false,reason:'Too few distinct positive powers.'};
  const pmin=points[0].power,pmax=points.at(-1).power;
  if(pmax/pmin<3)return {valid:false,reason:'Power range is too narrow for a stable saturation fit.'};
  const lower=minPower==null?pmin/100:Number(minPower);
  const upper=maxPower==null?pmax*100:Number(maxPower);
  if(!(lower>0&&upper>lower&&Number.isFinite(upper)))return {valid:false,reason:'Invalid power parameter bounds.'};
  let best=null;
  // Variable projection: for a fixed characteristic power, amplitude and offset
  // have linear least-squares solutions. Logarithmic grid + local refinements
  // avoid fragile generic nonlinear solvers and ensure deterministic results.
  let left=Math.log(lower),right=Math.log(upper);
  for(let pass=0;pass<4;pass++){
    let bestIndex=-1;
    const n=120,step=(right-left)/(n-1);
    for(let i=0;i<n;i++){
      const guess=Math.exp(left+i*step);
      const candidate=solveAt(points,model,guess,allowOffset);
      if(candidate&&(!best||candidate.sse<best.sse)){best=candidate;bestIndex=i;}
    }
    if(bestIndex<0)break;
    const center=Math.log(best.pHalf);
    left=Math.max(Math.log(lower),center-2*step);
    right=Math.min(Math.log(upper),center+2*step);
  }
  if(!best)return {valid:false,reason:'Unable to identify model parameters.'};
  const average=points.reduce((s,p)=>s+p.signal,0)/points.length;
  const tss=points.reduce((s,p)=>s+(p.signal-average)**2,0);
  const epsilon=1e-5;
  const atBoundary=best.pHalf<=lower*(1+epsilon)||best.pHalf>=upper*(1-epsilon);
  const rmse=Math.sqrt(best.sse/points.length);
  const r2=tss>0?1-best.sse/tss:null;
  const warning=atBoundary?'Characteristic power is at the search boundary.':
    best.pHalf<pmin||best.pHalf>pmax?'Characteristic power lies outside the measured power range.':null;
  return {valid:true,model,parameters:{A:best.a,P:best.pHalf,C:best.c},
    points:points.map((p,i)=>({...p,fitted:best.predict(p.power),residual:best.residuals[i]})),
    sse:best.sse,rmse,r2,n:points.length,warning,atBoundary,
    modelName:model==='amplitude'?'Peak-to-peak amplitude saturation':'Peak-to-peak power broadening'};
}
