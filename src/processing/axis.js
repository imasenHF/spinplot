// SpinPlot axis conversion utilities

const PLANCK = 6.62607015e-34;
const BOHR_MAGNETON = 9.2740100783e-24;

export function fieldToG(fieldTesla, frequencyHz) {
  return PLANCK * frequencyHz / (BOHR_MAGNETON * fieldTesla);
}

export function gToField(g, frequencyHz) {
  return PLANCK * frequencyHz / (BOHR_MAGNETON * g);
}

export function frequencyScaleAxis(values, rawFrequency, targetFrequency) {
  const ratio = targetFrequency / rawFrequency;
  return values.map(v => v * ratio);
}

export function normalizeAxis(values, ascending = true) {
  const out = [...values];
  if (ascending && out.length > 1 && out[0] > out[out.length - 1]) return out.reverse();
  if (!ascending && out.length > 1 && out[0] < out[out.length - 1]) return out.reverse();
  return out;
}
