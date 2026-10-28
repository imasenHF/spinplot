// Coordinate scales shared by 1D, 2D and projection axes.
// Log10 is a physical axis transform: never offset or take abs of signal data.
export function positiveAxisDomain(values, lower, upper, scale='linear', opts={}) {
  if (scale !== 'log') return [lower, upper];
  let smallest=Infinity, largest=-Infinity;
  for (const item of values) {
    const value=Number(item);
    if (Number.isFinite(value) && value>0) {
      smallest=Math.min(smallest,value);
      largest=Math.max(largest,value);
    }
  }
  const label=opts.label||'Y';
  if (!Number.isFinite(smallest))
    throw Error(label+' Log10 requires at least one positive data value');
  if (opts.explicitMin && !(lower>0))
    throw Error(label+' Log10 minimum must be positive');
  if (opts.explicitMax && !(upper>0))
    throw Error(label+' Log10 maximum must be positive');
  let lo=opts.explicitMin ? lower : lower>0 ? lower : smallest;
  let hi=opts.explicitMax ? upper : upper>lo ? upper : largest;
  if (!(hi>lo)) {
    if (opts.explicitMin || opts.explicitMax)
      throw Error(label+' Log10 requires an increasing range');
    lo=Math.min(lo,smallest)/Math.sqrt(10);
    hi=Math.max(hi,largest)*Math.sqrt(10);
  }
  if (!(lo>0 && hi>lo))
    throw Error(label+' Log10 requires positive, increasing bounds');
  return [lo,hi];
}
export function axisCoordinate(value,lower,upper,scale='linear') {
  if (!Number.isFinite(value) || !(upper>lower)) return NaN;
  if (scale==='log')
    return value>0 && lower>0
      ? (Math.log(value)-Math.log(lower))/(Math.log(upper)-Math.log(lower))
      : NaN;
  return (value-lower)/(upper-lower);
}
export function axisValue(fraction,lower,upper,scale='linear') {
  return scale==='log'
    ? Math.exp(Math.log(lower)+fraction*(Math.log(upper)-Math.log(lower)))
    : lower+fraction*(upper-lower);
}
export function scaledTicks(lower,upper,scale='linear',count=5) {
  return Array.from({length:Math.max(2,count)},(_,i)=>axisValue(i/(Math.max(2,count)-1),lower,upper,scale));
}
