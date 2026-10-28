// Shared Z domain and coordinate transformation for Heatmap, Contour and 3D.
// Scientific notation is a linear coordinate scale with different tick labels.
// Log10 uses conventional log for all-positive domains, and a sign-preserving
// symmetric logarithmic map for signed/bipolar signals. No source values change.
const normal = x => Number.isFinite(x);
const threshold = (min,max) => Math.max(Math.abs(min),Math.abs(max),1e-12)/100;
const signedLog = (z,t) => Math.sign(z)*Math.log1p(Math.abs(z)/t);
const signedExp = (v,t) => Math.sign(v)*t*Math.expm1(Math.abs(v));
const useSigned = (min,scale) => scale==='symlog'||(scale==='log'&&min<=0);
export function zFraction(z,min,max,scale='linear'){
 if(!normal(z)||!normal(min)||!normal(max)||!(max>min))return NaN;
 if(useSigned(min,scale)){
   const t=threshold(min,max),a=signedLog(min,t),b=signedLog(max,t);
   return (signedLog(z,t)-a)/(b-a);
 }
 if(scale==='log'){
   if(!(z>0&&min>0))return NaN;
   return (Math.log(z)-Math.log(min))/(Math.log(max)-Math.log(min));
 }
 return (z-min)/(max-min);
}
export function zAtFraction(f,min,max,scale='linear'){
 if(useSigned(min,scale)){
   const t=threshold(min,max),a=signedLog(min,t),b=signedLog(max,t);
   return signedExp(a+f*(b-a),t);
 }
 return scale==='log'
  ? Math.exp(Math.log(min)+f*(Math.log(max)-Math.log(min)))
  : min+f*(max-min);
}
export function zRange(rows,xi,yi,settings={}){
 let min=Infinity,max=-Infinity;
 for(const j of yi)for(const i of xi){
   const z=rows[j]?.[i];
   if(!normal(z))continue;
   min=Math.min(min,z);max=Math.max(max,z);
 }
 if(!normal(min))throw Error('Z range contains no finite signal samples');
 if(min===max){
  if(min>0){min/=10;max*=10;}
  else if(min<0){min*=1.1;max*=0.9;}
  else{min=-1;max=1;}
 }
 const lower=settings.zMin===''||settings.zMin==null?min:Number(settings.zMin);
 const upper=settings.zMax===''||settings.zMax==null?max:Number(settings.zMax);
 if(!normal(lower)||!normal(upper)||!(upper>lower))
   throw Error('Z min must be less than Z max');
 if(settings.zScale==='log'&&lower>0&&!(upper>0))
   throw Error('Log10 Z needs increasing positive bounds');
 return {min:lower,max:upper,scale:settings.zScale||'linear',dataMin:min,dataMax:max,signed:settings.zScale==='log'&&lower<=0};
}
export function zTicks(min,max,scale='linear',count=5){
 const n=Math.max(2,Math.floor(count));
 return Array.from({length:n},(_,k)=>zAtFraction(k/(n-1),min,max,scale));
}
export function zoomZ(min,max,delta,scale='linear'){
 if(!(max>min))return null;
 const factor=delta>0?1.15:1/1.15;
 if(useSigned(min,scale)){
   const t=threshold(min,max),a=signedLog(min,t),b=signedLog(max,t);
   const center=(a+b)/2,half=(b-a)*factor/2;
   return [signedExp(center-half,t),signedExp(center+half,t)];
 }
 const log=scale==='log',a=log?Math.log(min):min,b=log?Math.log(max):max;
 const center=(a+b)/2,half=(b-a)*factor/2;
 return log?[Math.exp(center-half),Math.exp(center+half)]:[center-half,center+half];
}
