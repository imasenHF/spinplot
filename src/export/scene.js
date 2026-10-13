export function vectorScene(design, metric, render) {
  const scene = [];
  const copy = (s) => ({
    ...s,
    m: s.m.slice(),
    dash: s.dash.slice(),
    clip: s.clip ? { ...s.clip } : null,
  });
  let st = {
      fillStyle: "#000",
      strokeStyle: "#000",
      lineWidth: 1,
      font: "12px Arial",
      textAlign: "start",
      textBaseline: "alphabetic",
      lineCap: "round",
      lineJoin: "round",
      dash: [],
      m: [1, 0, 0, 1, 0, 0],
      clip: null,
    },
    stack = [],
    path = [];
  const point = (x, y) => ({
    x: st.m[0] * x + st.m[2] * y + st.m[4],
    y: st.m[1] * x + st.m[3] * y + st.m[5],
  });
  const rectPath = (x, y, w, h) => {
    const a = point(x, y),
      b = point(x + w, y),
      c = point(x + w, y + h),
      d = point(x, y + h);
    return `M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y} L ${d.x} ${d.y} Z`;
  };
  const ctx = {
    setTransform(a, b, c, d, e, f) {
      st.m = [a, b, c, d, e, f];
    },
    clearRect() {},
    save() {
      stack.push(copy(st));
    },
    restore() {
      st = stack.pop() || st;
    },
    translate(x, y) {
      const [a, b, c, d, e, f] = st.m;
      st.m = [a, b, c, d, a * x + c * y + e, b * x + d * y + f];
    },
    rotate(v) {
      const [a, b, c, d, e, f] = st.m,
        C = Math.cos(v),
        S = Math.sin(v);
      st.m = [a * C + c * S, b * C + d * S, c * C - a * S, d * C - b * S, e, f];
    },
    beginPath() {
      path = [];
    },
    moveTo(x, y) {
      const p = point(x, y);
      path.push(`M ${p.x} ${p.y}`);
    },
    lineTo(x, y) {
      const p = point(x, y);
      path.push(`L ${p.x} ${p.y}`);
    },
    rect(x, y, w, h) {
      path.push(rectPath(x, y, w, h));
    },
    clip() {
      st.clip = { d: path.join(" ") };
    },
    stroke() {
      if (path.length)
        scene.push({
          type: "path",
          d: path.join(" "),
          stroke: st.strokeStyle,
          width: st.lineWidth,
          dash: st.dash.slice(),
          clip: st.clip,
        });
    },
    strokeRect(x, y, w, h) {
      scene.push({
        type: "path",
        d: rectPath(x, y, w, h),
        stroke: st.strokeStyle,
        width: st.lineWidth,
        dash: st.dash.slice(),
        clip: st.clip,
      });
    },
    fillRect(x, y, w, h) {
      scene.push({
        type: "path",
        d: rectPath(x, y, w, h),
        fill: st.fillStyle,
        clip: st.clip,
      });
    },
    fillText(value, x, y) {
      metric.font = st.font;
      const text = String(value),
        width = metric.measureText(text).width,
        size = Number(st.font.match(/([\d.]+)px/)?.[1] || 12),
        dx =
          st.textAlign === "center"
            ? -width / 2
            : st.textAlign === "right" || st.textAlign === "end"
              ? -width
              : 0,
        dy =
          st.textBaseline === "top"
            ? size * 0.82
            : st.textBaseline === "middle"
              ? size * 0.34
              : st.textBaseline === "bottom"
                ? -size * 0.18
                : 0;
      scene.push({
        type: "text",
        text,
        x: x + dx,
        y: y + dy,
        font: st.font,
        fill: st.fillStyle,
        m: st.m.slice(),
        clip: st.clip,
      });
    },
    measureText(value) {
      metric.font = st.font;
      return metric.measureText(value);
    },
    setLineDash(v) {
      st.dash = v.slice();
    },
  };
  for (const k of [
    "fillStyle",
    "strokeStyle",
    "lineWidth",
    "font",
    "textAlign",
    "textBaseline",
    "lineCap",
    "lineJoin",
  ])
    Object.defineProperty(ctx, k, {
      get: () => st[k],
      set: (v) => {
        st[k] = v;
      },
    });
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  render(canvas, design.width, design.height, 1, true);
  return { design, scene };
}
