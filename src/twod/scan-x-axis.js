export function scanPowerXCoordinate(power, scale = 'power') {
  if (!Number.isFinite(power)) return NaN;
  if (scale === 'sqrt') return power >= 0 ? Math.sqrt(power) : NaN;
  return power;
}

export function scanPowerXAxis(axis, scale = 'power') {
  if (scale !== 'sqrt') return axis;
  return { name: 'Square-root microwave power', unit: '√mW' };
}

export function convertScanPowerBounds(bounds = {}, from = 'power', to = 'sqrt') {
  const convert = (value) => {
    if (value === undefined || value === null || String(value).trim() === '') return '';
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return '';
    const result = to === 'sqrt' ? Math.sqrt(number) : number * number;
    return Number(result.toPrecision(12)).toString();
  };
  if (from === to) return { min: bounds.min ?? '', max: bounds.max ?? '', step: '' };
  return { min: convert(bounds.min), max: convert(bounds.max), step: '' };
}
