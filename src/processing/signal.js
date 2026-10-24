// Pure one-dimensional processing extracted from SpinPlot's existing plotting pipeline.
// Do not mix display offsets with saved raw data or scientific amplitude measurements.
import {mean,ptp,robustSigma,diff,parseNumberList} from '../core/numeric.js';

export function correctBaseline(B,y,options){const mode=options.mode;if(mode==='none')return y.slice();let off=0;if(mode==='mean')off=mean(y);else if(mode==='region'){const regions=options.regions;if(!regions)throw new Error('Baseline regions required');let sum=0,n=0;for(let i=0;i<B.length;i++)if(Number.isFinite(y[i])&&regions.some(([a,b])=>B[i]>=Math.min(a,b)&&B[i]<=Math.max(a,b))){sum+=y[i];n++}if(!n)throw new Error('Baseline regions contain no valid points');off=sum/n}else{const ref=options.reference;if(!Number.isFinite(ref))throw new Error('Reference baseline requires B value');let k=0,b=Infinity;for(let i=0;i<B.length;i++){const d=Math.abs(B[i]-ref);if(d<b){b=d;k=i}}off=y[k]}return y.map(v=>v-off)}

export function estimateNoise(B,y,regions){if(!regions)return robustSigma(diff(y))/Math.sqrt(2);let residual=[];for(const [a,b]of regions){const lo=Math.min(a,b),hi=Math.max(a,b),xx=[],yy=[];for(let i=0;i<B.length;i++)if(B[i]>=lo&&B[i]<=hi&&Number.isFinite(y[i])){xx.push(B[i]);yy.push(y[i])}if(yy.length<3)continue;let sx=0,sy=0,sxx=0,sxy=0,n=xx.length;for(let i=0;i<n;i++){sx+=xx[i];sy+=yy[i];sxx+=xx[i]*xx[i];sxy+=xx[i]*yy[i]}const den=n*sxx-sx*sx,m=Math.abs(den)>1e-30?(n*sxy-sx*sy)/den:0,c=(sy-m*sx)/n;for(let i=0;i<n;i++)residual.push(yy[i]-(m*xx[i]+c))}if(!residual.length)throw new Error('Noise regions contain too few points');return robustSigma(residual)}

export {applyStackOffsets} from '../plotting/oned.js';
