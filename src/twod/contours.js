// Marching squares in physical X/Y coordinates. NaN and invalid log-Z samples
// are masked; saddle cases use the center value for a stable diagonal choice.
export function contourSegments(model, levels, scale = 'linear') {
  const { v, xi, yi } = model;
  if (xi.length < 2 || yi.length < 2) return [];
  const segments = [];
  const decimate = Math.max(1, Math.ceil(Math.sqrt((xi.length - 1) * (yi.length - 1) / 100000)));
  const X = v.x.values, Y = v.y.values, Z = v.z;
  const sampledX = xi.filter((_, k) => k % decimate === 0 || k === xi.length - 1);
  const sampledY = yi.filter((_, k) => k % decimate === 0 || k === yi.length - 1);
  for (const level of levels) {
    if (!Number.isFinite(level)) continue;
    for (let jj = 0; jj < sampledY.length - 1; jj++) {
      const j0 = sampledY[jj], j1 = sampledY[jj + 1];
      for (let ii = 0; ii < sampledX.length - 1; ii++) {
        const i0 = sampledX[ii], i1 = sampledX[ii + 1];
        const corners = [
          [X[i0], Y[j0], Z[j0][i0]],
          [X[i1], Y[j0], Z[j0][i1]],
          [X[i1], Y[j1], Z[j1][i1]],
          [X[i0], Y[j1], Z[j1][i0]],
        ];
        if (corners.some(p => !Number.isFinite(p[2]))) continue;
        const edges = [[0,1],[1,2],[2,3],[3,0]];
        const hits = [];
        for (let edge = 0; edge < 4; edge++) {
          const [a,b] = edges[edge], z0 = corners[a][2], z1 = corners[b][2];
          if ((z0 < level) === (z1 < level)) continue;
          const k = (level-z0)/(z1-z0);
          hits.push({edge, x:corners[a][0]+k*(corners[b][0]-corners[a][0]),
            y:corners[a][1]+k*(corners[b][1]-corners[a][1])});
        }
        const link = (a,b) => segments.push({level, x0:a.x,y0:a.y,x1:b.x,y1:b.y});
        if (hits.length === 2) link(hits[0],hits[1]);
        else if (hits.length === 4) {
          // Resolve the ambiguous checkerboard case using the interpolated center.
          const center = corners.reduce((s,p)=>s+p[2],0)/4;
          const p = e => hits.find(h => h.edge===e);
          if ((center >= level) === (corners[0][2] >= level)) {
            link(p(0),p(1)); link(p(2),p(3));
          } else {
            link(p(0),p(3)); link(p(1),p(2));
          }
        }
      }
    }
  }
  return segments;
}
