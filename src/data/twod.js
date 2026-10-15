export function validate2DData(d, allow1D = false) {
  if (
    d.x.values.length < 2 ||
    d.y.values.length < (allow1D ? 1 : 2) ||
    d.real.length !== d.y.values.length ||
    d.real.some((r) => r.length !== d.x.values.length)
  )
    throw Error("Invalid 2D matrix dimensions");
  for (const a of [d.x, d.y]) {
    if (a.values.some((v) => !Number.isFinite(v)))
      throw Error("Invalid axis coordinates");
    let sign = 0;
    for (let i = 1; i < a.values.length; i++) {
      const s = Math.sign(a.values[i] - a.values[i - 1]);
      if (!s || (sign && s !== sign))
        throw Error("Axes must be strictly monotonic (no duplicates)");
      sign = s;
    }
  }
  return d;
}

export function create2DData(data, allow1D = false) {
  return validate2DData(data, allow1D);
}
