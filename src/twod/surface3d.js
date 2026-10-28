import { zFraction } from './zscale.js';
import { axisCoordinate } from '../plotting/axis-scale.js';

const sessions = new WeakMap();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Real triangulated X/Y/Z surface. The same geometry drives WebGL and
// vector/painter fallback so the camera represents actual sample heights.
export function surfaceMesh(model, palette, mode = 'linear', sampleLimit = 140, yScale = 'linear') {
  const { v, xi, yi, xr, yr, zmin, zmax } = model;
  const stepX = Math.max(1, Math.ceil((xi.length - 1) / (sampleLimit - 1)));
  const stepY = Math.max(1, Math.ceil((yi.length - 1) / (sampleLimit - 1)));
  const xs = xi.filter((_, k) => k % stepX === 0 || k === xi.length - 1);
  const ys = yi.filter((_, k) => k % stepY === 0 || k === yi.length - 1);
  const vertex = (j, i) => {
    const t = zFraction(v.z[j][i], zmin, zmax, mode);
    if (!Number.isFinite(t)) return null;
    const xx = ((v.x.values[i] - xr[0]) / (xr[1] - xr[0])) - 0.5;
    const yy = axisCoordinate(v.y.values[j],yr[0],yr[1],yScale) - 0.5;
    const height = clamp(t, 0, 1) - 0.5;
    const rgb = palette(clamp(t, 0, 1)).map(k => k / 255);
    return { p: [xx, yy, height], rgb };
  };
  const vertices = [];
  let faces = 0;
  const triangle = (a, b, c) => {
    const u = b.p.map((q, k) => q - a.p[k]), v = c.p.map((q,k)=>q-a.p[k]);
    let n = [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const length = Math.hypot(...n) || 1;
    n = n.map(x => x/length);
    if (n[2] < 0) n = n.map(x => -x);
    for (const q of [a,b,c]) vertices.push(...q.p,...q.rgb,...n);
    faces++;
  };
  for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++){
    const a=vertex(ys[j],xs[i]),b=vertex(ys[j],xs[i+1]),
      c=vertex(ys[j+1],xs[i+1]),d=vertex(ys[j+1],xs[i]);
    if(a&&b&&c)triangle(a,b,c);
    if(a&&c&&d)triangle(a,c,d);
  }
  return { vertices: new Float32Array(vertices), faces, stride: 9 };
}

export function projectSurfacePoint(p, azimuth = 35, elevation = 35, zStretch = 1) {
  const a=azimuth*Math.PI/180,e=elevation*Math.PI/180;
  const ca=Math.cos(a),sa=Math.sin(a),ce=Math.cos(e),se=Math.sin(e);
  const x=ca*p[0]-sa*p[1],y=sa*p[0]+ca*p[1],z=p[2]*zStretch;
  const vy=ce*y+se*z,depth=-se*y+ce*z;
  const perspective=2.6/(2.6-depth);
  return { x:x*perspective*1.25,y:vy*perspective*1.25,depth };
}

function createWebgl(canvas){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
  if(!gl)return null;
  const vertex=`
attribute vec3 a_position;
attribute vec3 a_color;
attribute vec3 a_normal;
uniform float u_azimuth;
uniform float u_elevation;
uniform float u_zStretch;
uniform float u_aspect;
uniform float u_zoom;
varying vec3 v_color;
void main(){
 float ca=cos(u_azimuth),sa=sin(u_azimuth),ce=cos(u_elevation),se=sin(u_elevation);
 vec3 p=vec3(a_position.xy,a_position.z*u_zStretch);
 vec3 q=vec3(ca*p.x-sa*p.y,sa*p.x+ca*p.y,p.z);
 vec3 v=vec3(q.x,ce*q.y+se*q.z,-se*q.y+ce*q.z);
 float perspective=2.6/(2.6-v.z);
 gl_Position=vec4(v.x*perspective*1.25*u_zoom/u_aspect,v.y*perspective*1.25*u_zoom,-v.z/3.0,1.0);
 float illumination=0.76+0.24*abs(dot(normalize(a_normal),normalize(vec3(-0.4,-0.4,0.8))));
 v_color=a_color*illumination;
}`;
  const fragment=`precision mediump float;
varying vec3 v_color;
void main(){gl_FragColor=vec4(v_color,1.0);}`;
  const compile=(type,src)=>{const shader=gl.createShader(type);gl.shaderSource(shader,src);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('3D shader: '+gl.getShaderInfoLog(shader));return shader;};
  const program=gl.createProgram();
  gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));
  gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('3D shader linking failed: '+gl.getProgramInfoLog(program));
  return {gl,program,buffer:gl.createBuffer()};
}

const axisSegments = (() => {
 const vertices=[],gray=[0.18,0.2,0.24],n=[0,0,1];
 const pair=(a,b,color=gray)=>vertices.push(...a,...color,...n,...b,...color,...n);
 // Floor outline, corner posts and three reference axes.
 pair([-.5,-.5,-.5],[.5,-.5,-.5]);pair([.5,-.5,-.5],[.5,.5,-.5]);
 pair([.5,.5,-.5],[-.5,.5,-.5]);pair([-.5,.5,-.5],[-.5,-.5,-.5]);
 pair([-.5,-.5,-.5],[-.5,-.5,.5]);
 pair([.5,-.5,-.5],[.5,-.5,.5]);pair([.5,.5,-.5],[.5,.5,.5]);
 pair([-.5,.5,-.5],[-.5,.5,.5]);
 return new Float32Array(vertices);
})();

export function renderSurface(canvasContext, model, palette, settings, mapBox, theme, resolution = 1) {
  const width=Math.max(1,Math.floor(mapBox.w*resolution));
  const height=Math.max(1,Math.floor(mapBox.h*resolution));
  const az=Number(settings.viewAzimuth ?? 35),el=Number(settings.viewElevation ?? 35),
    stretch=Number(settings.viewZStretch ?? 1),zoom=Number(settings.viewZoom ?? 1);
  const isRaster=typeof canvasContext.drawImage==='function'&&typeof document!=='undefined';
  const mesh=surfaceMesh(model,palette,settings.zScale, isRaster?140:48,settings.yScale);
  if(!mesh.faces)throw Error('3D surface has no valid adjacent signal samples for this Z range.');
  if(isRaster){
    let session=sessions.get(settings);
    if(!session){const canvas=document.createElement('canvas');session=createWebgl(canvas);if(session) sessions.set(settings,session);}
    if(session)try{
      const {gl,program,buffer}=session;
      if(gl.isContextLost())throw Error('WebGL context lost');
      gl.canvas.width=width;gl.canvas.height=height;
      gl.viewport(0,0,width,height);
      gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
      gl.useProgram(program);
      gl.uniform1f(gl.getUniformLocation(program,'u_azimuth'),az*Math.PI/180);
      gl.uniform1f(gl.getUniformLocation(program,'u_elevation'),el*Math.PI/180);
      gl.uniform1f(gl.getUniformLocation(program,'u_zStretch'),stretch);
      gl.uniform1f(gl.getUniformLocation(program,'u_zoom'),zoom);
      gl.uniform1f(gl.getUniformLocation(program,'u_aspect'),width/height);
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      const upload=(data)=>{
        gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
        const stride=9*4;
        for(const [name,size,offset]of [['a_position',3,0],['a_color',3,12],['a_normal',3,24]]){
          const loc=gl.getAttribLocation(program,name);if(loc<0)continue;
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,offset);
        }
      };
      upload(mesh.vertices);
      gl.drawArrays(gl.TRIANGLES,0,mesh.vertices.length/9);
      upload(axisSegments);
      gl.drawArrays(gl.LINES,0,axisSegments.length/9);
      canvasContext.drawImage(gl.canvas,mapBox.x,mapBox.y,mapBox.w,mapBox.h);
      return {webgl:true,faces:mesh.faces};
    }catch(err){/* Context loss or disabled GPU: use the same 3D geometry in painter fallback. */}
  }
  // Vector-scene / no-GPU fallback: project the same 3D triangles and sort them by depth.
  const aspect=mapBox.w/mapBox.h,project=(v)=>{
    const q=projectSurfacePoint(v,az,el,stretch);
    return {x:mapBox.x+mapBox.w/2+q.x*zoom*mapBox.w/(2*Math.max(1,aspect)),
      y:mapBox.y+mapBox.h/2-q.y*zoom*mapBox.h/2,depth:q.depth};
  };
  const triangles=[];
  for(let k=0;k<mesh.vertices.length;k+=27){
    const pts=[],c=[0,0,0];
    for(let n=0;n<3;n++){
      const i=k+n*9;pts.push(project(mesh.vertices.subarray(i,i+3)));
      for(let h=0;h<3;h++)c[h]+=mesh.vertices[i+3+h]/3;
    }
    triangles.push({pts,depth:pts.reduce((s,p)=>s+p.depth,0)/3,color:c});
  }
  triangles.sort((a,b)=>a.depth-b.depth);
  for(const t of triangles){
    canvasContext.beginPath();canvasContext.moveTo(t.pts[0].x,t.pts[0].y);
    canvasContext.lineTo(t.pts[1].x,t.pts[1].y);canvasContext.lineTo(t.pts[2].x,t.pts[2].y);
    canvasContext.fillStyle='rgb('+t.color.map(q=>Math.round(q*255)).join(',')+')';
    canvasContext.fill();
  }
  canvasContext.strokeStyle=theme.axis;canvasContext.lineWidth=1;
  for(let k=0;k<axisSegments.length;k+=18){
    const a=project(axisSegments.subarray(k,k+3)),b=project(axisSegments.subarray(k+9,k+12));
    canvasContext.beginPath();canvasContext.moveTo(a.x,a.y);canvasContext.lineTo(b.x,b.y);canvasContext.stroke();
  }
  return {webgl:false,faces:mesh.faces};
}
