import assert from 'node:assert/strict';
import { zFraction,zAtFraction,zRange,zTicks,zoomZ } from './zscale.js';
import { contourSegments } from './contours.js';
import { surfaceMesh,projectSurfacePoint } from './surface3d.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,actual+' vs '+expected);

near(zFraction(10,1,100,'log'),.5);
near(zAtFraction(.5,1,100,'log'),10);
near(zFraction(0,-1,1,'linear'),.5);
assert.ok(Number.isNaN(zFraction(-2,1,100,'log')));
zTicks(1,10000,'log').forEach((value,i)=>near(value,10**i));
const linear=zRange([[-5,0],[1,10]],[0,1],[0,1],{zMin:'',zMax:'',zScale:'linear'});
assert.equal(linear.min,-5);assert.equal(linear.max,10);
const positive=zRange([[-5,0],[1,100]],[0,1],[0,1],{zMin:'',zMax:'',zScale:'log'});
assert.equal(positive.min,-5);assert.equal(positive.max,100);
assert.equal(positive.signed,true);
assert.ok(Number.isFinite(zFraction(-5,-5,100,'log')),'Signed data must remain visible in Log mode');
assert.ok(Number.isFinite(zFraction(0,-5,100,'log')),'Zero must remain visible in signed Log mode');
const fraction=zFraction(-2,-5,100,'log');
near(zAtFraction(fraction,-5,100,'log'),-2);
assert.equal(zRange([[-4,-1]],[0,1],[0],{zScale:'log'}).min,-4);
assert.deepEqual([zRange([[1,10]],[0,1],[0],{zMin:0,zMax:10,zScale:'log'}).min,
 zRange([[1,10]],[0,1],[0],{zMin:0,zMax:10,zScale:'log'}).max],[0,10]);
assert.deepEqual([zRange([[-5,0],[1,100]],[0,1],[0,1],{zScale:'scientific'}).min,
 zRange([[-5,0],[1,100]],[0,1],[0,1],{zScale:'scientific'}).max],[-5,100]);
const signedTicks=zTicks(-1000,1000,'log',5);
near(signedTicks[2],0);
assert.ok(signedTicks[0]<0&&signedTicks[4]>0);
const zoom=zoomZ(1,100,1,'log');
near(Math.sqrt(zoom[0]*zoom[1]),10);
assert.ok(zoom[0]>0&&zoom[1]>100);

const v={x:{values:[0,1]},y:{values:[0,1]},z:[[0,1],[1,2]]};
const m={v,xi:[0,1],yi:[0,1],xr:[0,1],yr:[0,1],zmin:0,zmax:2};
const segments=contourSegments(m,[.5]);
assert.equal(segments.length,1);
const ends=[[segments[0].x0,segments[0].y0],[segments[0].x1,segments[0].y1]];
assert.ok(ends.some(p=>Math.abs(p[0]-.5)<1e-8&&p[1]===0));
assert.ok(ends.some(p=>p[0]===0&&Math.abs(p[1]-.5)<1e-8));
assert.equal(contourSegments({...m,v:{...v,z:[[-1,2],[3,4]]}},[1],'log').length,1);
const samples={...m,v:{...v,z:[[1,10],[10,100]]},zmin:1,zmax:100};
const mesh=surfaceMesh(samples,t=>[255*t,0,255*(1-t)],'log');
assert.equal(mesh.faces,2);
assert.equal(mesh.vertices.length,2*3*9);
const heights=Array.from(mesh.vertices.filter((_,i)=>i%9===2));
assert.ok(heights.some(z=>Math.abs(z+.5)<1e-6));
assert.ok(heights.some(z=>Math.abs(z-.5)<1e-6));
assert.ok(heights.every(z=>z>=-.5&&z<=.5));
const a=projectSurfacePoint([.4,.2,.1],20,35),b=projectSurfacePoint([.4,.2,.1],120,60);
assert.ok(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)>0.1,'3D camera must genuinely change the projection');
console.log('2D contour, logarithmic Z and triangulated 3D visualization regression PASS');
