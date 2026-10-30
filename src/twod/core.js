import {create2DData} from '../data/twod.js';
import {validate2DData as validate} from '../data/twod.js';
export {validate2DData as validate} from '../data/twod.js';
import {axisKind,axisInfo} from '../processing/axis.js';
import {peakFeatures} from './saturation.js';
export {coordinateScale,axisKind,axisInfo,fieldToGauss} from '../processing/axis.js';
// Signal storage: rows are Y, columns are X; X varies fastest in BES3T.
const num=v=>v===null||v===undefined||v===''?NaN:Number(v);
const lin=(a,b,n)=>n===1?[a]:Array.from({length:n},(_,i)=>a+(b-a)*i/(n-1));
// The experiment type selects semantics; per-trace params supply acquired coordinates.
export function parseCIQ(raw,name){
 const lines=raw.dataStore?.lineDataList,setting=raw.setting||{},type=raw.type||'';
 if(!Array.isArray(lines)||!lines.length)throw Error('Missing lineDataList');
 const kinds={
 'CW EPR/1D Field Sweep':{x:'Field',unit:'G',dimension:1},
 'CW EPR/1D Time Sweep':{x:'Time',unit:'ms',dimension:1},
 'CW EPR/2D Field-Power Sweep':{x:'Field',unit:'G',y:'Microwave attenuation',yu:'dB',param:'power'},
 'CW EPR/2D Field-Delay Sweep':{x:'Field',unit:'G',y:'Delay',yu:'',param:'delay'},
 'CW EPR/2D Field-Modul.Amp. Sweep':{x:'Field',unit:'G',y:'Modulation amplitude',yu:'G',param:'modulamp'},
 'CW EPR/2D Time-Field Sweep':{x:'Time',unit:'ms',y:'Field',yu:'G',param:'timefield'},
 'Transient EPR/2D Tr-EPR':{x:'Time',unit:'ns',y:'Field',yu:'G',tr:true}
 };
 const kind=kinds[type];if(!kind)throw Error('Unsupported CIQTEK experiment: '+type);
 const axisLabel=String(raw.dataStore.xAxisName||''),label=axisLabel.match(/^(.+?)\s*\[([^\]]*)\]$/),x={name:label?label[1].trim():kind.x,unit:label?label[2].trim():kind.unit,values:[]};
 if(!Array.isArray(lines[0].ReData)||lines[0].ReData.length<2)throw Error('Missing real trace');
 x.values=lines[0].ReData.map(p=>num(p[0]));
 for(const l of lines){for(const channel of ['ReData','ImData']){const points=l[channel];if(channel==='ImData'&&(!points||!points.length))continue;if(!Array.isArray(points)||points.length!==x.values.length||points.some((p,i)=>!Array.isArray(p)||p.length<2||!Number.isFinite(num(p[0]))||!Number.isFinite(num(p[1]))||Math.abs(num(p[0])-x.values[i])>1e-8))throw Error(channel+' trace axes or dimensions differ');}}
 const warnings=[];if(kind.param==='delay')warnings.push('Delay axis unit is not declared in the file; original coordinate values retained.');
 const coordinates=kind.dimension===1?lines.map((_,i)=>i):kind.tr?lin(num(setting.lineEdit_2DTrEPR_StartField),num(setting.lineEdit_2DTrEPR_StopField),lines.length):lines.map(l=>{const value=l.params?.[kind.param];if(value===undefined||value===null||String(value).trim()===''||!Number.isFinite(num(value)))throw Error('Missing second-axis coordinate: '+kind.param);return num(value);});
 const order=coordinates.map((_,i)=>i).sort((a,b)=>coordinates[a]-coordinates[b]);
 const frequencies=order.map(i=>{const f=num(lines[i].freq??setting.frequency);return Number.isFinite(f)&&f>0?f:null;});
 return create2DData({name,x,y:{name:kind.y||'Trace',unit:kind.yu||'',values:order.map(i=>coordinates[i])},real:order.map(i=>lines[i].ReData.map(p=>num(p[1]))),imag:order.map(i=>lines[i].ImData?.length?lines[i].ImData.map(p=>num(p[1])):x.values.map(()=>0)),metadata:{type,setting,dimensions:kind.dimension||2,frequencies,traceNames:order.map(i=>lines[i].name||name),traceParameters:order.map(i=>lines[i].params||{}),warnings}},true);
}
export function ciq1DCurves(d){if(d.metadata.dimensions!==1)throw Error('Expected 1D experiment');return d.real.map((row,i)=>({name:d.real.length===1?d.name.replace(/\.[^.]+$/,''):d.metadata.traceNames[i],B:d.x.values.slice(),y:row.slice(),imag:d.imag[i].slice(),freq:d.metadata.frequencies[i],source:d.name,xAxis:{name:d.x.name,unit:d.x.unit},metadata:{type:d.metadata.type,setting:d.metadata.setting}}));}
export function parseDescriptor(text){const p={};for(const line of text.split(/\r?\n/)){const m=line.trim().match(/^([A-Za-z][\w]*)\s+(.+)$/);if(m)p[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}return p;}
export function binary(buffer,fmt,little,count){const types={D:[8,'getFloat64'],F:[4,'getFloat32'],I:[4,'getInt32'],S:[2,'getInt16'],C:[1,'getInt8']},t=types[fmt];if(!t)throw Error('Unsupported binary format '+fmt);if(buffer.byteLength!==count*t[0])throw Error('Binary length mismatch');const v=new DataView(buffer);return Array.from({length:count},(_,i)=>v[t[1]](i*t[0],little));}
export async function parseBES(dsc,files){
 const p=parseDescriptor(await dsc.text()),nx=num(p.XPTS),ny=num(p.YPTS??1),nz=num(p.ZPTS??1);if(!Number.isInteger(nx)||!Number.isInteger(ny)||nx<2||ny<1||nz!==1)throw Error('Requires valid 1D/2D BES3T dimensions (ZPTS=1)');
 const base=dsc.name.replace(/\.dsc$/i,'').toLowerCase(),get=ext=>{const f=files.find(f=>f.name.toLowerCase()===base+'.'+ext.toLowerCase());if(!f)throw Error('Missing '+base+'.'+ext);return f;};
 if(!['BIG','LIT'].includes(p.BSEQ??'BIG'))throw Error('Unsupported byte order');const le=p.BSEQ==='LIT',complex=p.IKKF==='CPLX';if(!['REAL','CPLX'].includes(p.IKKF??'REAL'))throw Error('Unsupported signal channels');if(p.IIFMT&&p.IIFMT!==p.IRFMT)throw Error('Real/imaginary formats differ');
 async function axis(k,n){if(n===1)return{name:p[k+'NAM']??k,unit:p[k+'UNI']??'',values:[Number.isFinite(num(p[k+'MIN']))?num(p[k+'MIN']):0]};const typ=p[k+'TYP']??'IDX';let values;if(typ==='IDX'){if(!Number.isFinite(num(p[k+'MIN']))||!Number.isFinite(num(p[k+'WID'])))throw Error('Missing '+k+' axis bounds');values=lin(num(p[k+'MIN']),num(p[k+'MIN'])+num(p[k+'WID']),n);}else if(typ==='IGD'){const grid=files.find(f=>f.name.toLowerCase()===base+'.'+k.toLowerCase()+'gf');if(grid)values=binary(await grid.arrayBuffer(),p[k+'FMT']??'D',le,n);else if(Number.isFinite(num(p[k+'MIN']))&&Number.isFinite(num(p[k+'WID'])))values=lin(num(p[k+'MIN']),num(p[k+'MIN'])+num(p[k+'WID']),n);else throw Error('Missing '+base+'.'+k+'GF and valid '+k+'MIN/'+k+'WID bounds');}else throw Error('Unsupported axis '+typ);return axisInfo({name:p[k+'NAM']??k,unit:p[k+'UNI']??'',values});}
 const a=binary(await get('DTA').arrayBuffer(),p.IRFMT,le,nx*ny*(complex?2:1));const real=[],imag=[];for(let j=0;j<ny;j++){real.push(Array.from({length:nx},(_,i)=>a[(j*nx+i)*(complex?2:1)]));imag.push(Array.from({length:nx},(_,i)=>complex?a[(j*nx+i)*2+1]:0));}
 return create2DData({name:dsc.name,x:await axis('X',nx),y:await axis('Y',ny),real,imag,metadata:p},true);
}
// Preserve acquisition labels; classify physical axes for orientation and g conversion.
export function orient(d,component='real',swap=false){let z=d.real.map((r,j)=>r.map((v,i)=>component==='imag'?d.imag[j][i]:component==='magnitude'?Math.hypot(v,d.imag[j][i]):v));return swap?{x:d.y,y:d.x,z:d.x.values.map((_,i)=>z.map(r=>r[i]))}:{x:d.x,y:d.y,z};}
// Ignore non-finite samples; an empty slice remains NaN for plotting gaps.
export function reduce(values,mode){let sum=0,n=0,lo=Infinity,hi=-Infinity;for(const v of values)if(Number.isFinite(v)){sum+=mode==='rms'?v*v:v;lo=Math.min(lo,v);hi=Math.max(hi,v);n++;}return !n?NaN:mode==='max'?hi:mode==='min'?lo:mode==='ptp'?hi-lo:mode==='rms'?Math.sqrt(sum/n):mode==='sum'?sum:sum/n;}
export function projections(v,xRange,yRange,xMode='mean',yMode='rms'){
 const xi=v.x.values.map((x,i)=>x>=xRange[0]&&x<=xRange[1]?i:-1).filter(i=>i>=0),yi=v.y.values.map((y,i)=>y>=yRange[0]&&y<=yRange[1]?i:-1).filter(i=>i>=0);if(!xi.length||!yi.length)throw Error('Projection range contains no samples');
 function* column(i){for(const j of yi)yield v.z[j][i];}
 function* row(j){for(const i of xi)yield v.z[j][i];}
 const x=v.x.values.map((_,i)=>reduce(column(i),xMode));
 // Every Y-coordinate corresponds to a complete X-axis scan. Extract the
 // peak-to-peak width on that scan, never on the aggregate side profile.
 const needsWidth=yMode==='linewidth'||yMode==='both';
 const sideFeatures=needsWidth?v.y.values.map((_,j)=>{
   const feature=peakFeatures(xi.map(i=>v.x.values[i]),xi.map(i=>v.z[j][i]));
   return feature;
 }):null;
 const y=v.y.values.map((_,j)=>yMode==='linewidth'
   ?(sideFeatures[j].valid?sideFeatures[j].linewidth:NaN)
   :reduce(row(j),yMode==='both'?'ptp':yMode));
 const sideLinewidth=yMode==='both'?sideFeatures.map(feature=>feature.valid?feature.linewidth:NaN):null;
 return {xi,yi,x,y,sideLinewidth};
}
