// Acquisition descriptions are display metadata; they never alter numerical processing.
export const CONDITION_GROUPS = [
  { key: 'sample', label: 'Sample', fields: ['sampleName', 'sampleId', 'description'] },
  { key: 'microwave', label: 'Microwave', fields: ['frequency', 'power', 'attenuation'] },
  { key: 'modulation', label: 'Modulation', fields: ['modAmplitude', 'modFrequency'] },
  { key: 'acquisition', label: 'Acquisition', fields: ['timeConstant', 'pointTime', 'sweepTime', 'scans'] },
];
export const CONDITION_FIELDS = {
  sampleName: { label: 'Sample name', plot: 'Sample', unit: '', text: true, aliases: ['sampleName'] },
  sampleId: { label: 'Sample ID', plot: 'ID', unit: '', text: true, aliases: ['sampleId', 'sampleNumber'] },
  description: { label: 'Description', plot: '', unit: '', text: true, aliases: ['sampleDescription'] },
  frequency: { label: 'MW frequency', plot: 'νacq', unit: 'GHz', selected: true, units: { GHz: 1, MHz: 0.001, Hz: 1e-9 }, aliases: ['microwaveFrequency', 'mwFrequency'] },
  power: { label: 'MW power', plot: 'P', unit: 'mW', selected: true, units: { mW: 1, W: 1000, uW: 0.001 }, aliases: ['microwavePower', 'mwPower'] },
  attenuation: { label: 'Attenuation', plot: 'Atten.', unit: 'dB', units: { dB: 1 }, aliases: ['microwaveAttenuation', 'attenuation'] },
  modAmplitude: { label: 'Mod. amplitude', plot: 'Mod. amp.', unit: 'mT', selected: true, units: { mT: 1, G: 0.1, T: 1000 }, aliases: ['modulationAmplitude', 'modAmp', 'modulamp', 'B0MA'] },
  modFrequency: { label: 'Mod. frequency', plot: 'Mod. freq.', unit: 'kHz', selected: true, units: { kHz: 1, Hz: 0.001, MHz: 1000 }, aliases: ['modulationFrequency', 'modFrequency', 'B0MF'] },
  timeConstant: { label: 'Time constant', plot: 'TC', unit: 'ms', units: { ms: 1, s: 1000, us: 0.001 }, aliases: ['timeConstant'] },
  pointTime: { label: 'Point time', plot: 'Point time', unit: 'ms', units: { ms: 1, s: 1000, us: 0.001 }, aliases: ['conversionTime', 'dwellTime', 'pointTime'] },
  sweepTime: { label: 'Sweep time', plot: 'Sweep time', unit: 's', units: { s: 1, ms: 0.001, min: 60 }, aliases: ['sweepTime', 'scanTime'] },
  scans: { label: 'Accumulations', plot: 'Scans', unit: '', aliases: ['accumulations', 'scanCount', 'averages'] },
};
export const CONDITION_POSITIONS = ['upper_left', 'upper_center', 'upper_right', 'center_left', 'center', 'center_right', 'lower_left', 'lower_center', 'lower_right', 'custom'];
const clean = value => typeof value === 'string' || typeof value === 'number' ? String(value).replace(/\s+/g, ' ').trim() : '';
const format = value => Number(value.toPrecision(8)).toString();
const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) && value !== '' && value != null ? Math.min(max, Math.max(min, Number(value))) : fallback;
export function normalizeConditions(input) {
  const config = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  return {
    enabled: config.enabled === true, open: config.open === true,
    position: CONDITION_POSITIONS.includes(config.position) ? config.position : 'upper_left',
    size: bounded(config.size, 10, 8, 24), opacity: bounded(config.opacity, 0, 0, 1), border: config.border === true,
    x: bounded(config.x, 0, 0, 100), y: bounded(config.y, 0, 0, 100),
    fields: Object.fromEntries(Object.entries(CONDITION_FIELDS).map(([key, spec]) => {
      const field = config.fields?.[key] || {};
      return [key, { show: typeof field.show === 'boolean' ? field.show : spec.selected === true,
        manual: field.manual === true, value: clean(field.value), unit: spec.text ? '' : clean(field.unit ?? spec.unit) }];
    })),
  };
}
function readMetadata(metadata, spec) {
  for (const source of [metadata?.setting, metadata]) {
    if (!source || typeof source !== 'object') continue;
    const entries = Object.fromEntries(Object.entries(source).map(([key, value]) => [key.toLowerCase().replace(/[_\s]/g, ''), value]));
    for (const alias of spec.aliases) {
      const key = alias.toLowerCase();
      const raw = entries[key];
      if (spec.text && clean(raw)) return clean(raw);
      if (!spec.text && !spec.units && clean(raw) && Number.isInteger(Number(raw)) && Number(raw) > 0) return Number(raw);
      if (!spec.units || raw == null || raw === '') continue;
      let value, unit;
      if (typeof raw === 'object') { value = raw.value; unit = raw.unit; }
      else {
        const match = clean(raw).match(/^([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?)\s*([a-zA-Zµμ]+)$/i);
        value = match ? match[1] : raw;
        unit = match ? match[2] : entries[key + 'unit'];
      }
      const normalizedUnit = clean(unit).replace(/[µμ]/g, 'u');
      const factor = spec.units[normalizedUnit];
      if (factor != null && clean(value) && Number.isFinite(Number(value))) return Number(value) * factor;
    }
  }
  return null;
}
function summarize(values, spec) {
  const known = values.filter(v => v != null && v !== '');
  if (!known.length) return null;
  const suffix = known.length < values.length ? ' (incomplete)' : '';
  if (spec.text) return { value: [...new Set(known)].join(' / ') + suffix, unit: '' };
  const lo = known.reduce((a, b) => Math.min(a, b), Infinity), hi = known.reduce((a, b) => Math.max(a, b), -Infinity);
  return { value: (lo === hi ? format(lo) : format(lo) + '–' + format(hi)) + suffix, unit: spec.unit };
}
export function extractConditions({ curves = [], matrix = null, settings = null, referenceFrequency = null } = {}) {
  const records = matrix ? [matrix.metadata || {}] : curves.map(curve => curve.metadata || {});
  const values = Object.fromEntries(Object.entries(CONDITION_FIELDS).map(([key, spec]) => [key, spec.text ? null : summarize(records.map(record => readMetadata(record, spec)), spec)]));
  const frequencies = matrix?.metadata?.frequencies?.length ? matrix.metadata.frequencies : curves.map(curve => curve.freq);
  const validFrequencies = frequencies.map(value => value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null);
  const frequency = summarize(validFrequencies, CONDITION_FIELDS.frequency);
  if (frequency) values.frequency = frequency;
  if (matrix) {
    for (const axis of [matrix.x, matrix.y]) {
      const name = String(axis?.name || '').toLowerCase(), unit = axis?.unit || '';
      let key;
      if (/attenuation/.test(name) && unit === 'dB') key = 'attenuation';
      else if (/power/.test(name) && CONDITION_FIELDS.power.units[unit] != null) key = 'power';
      else if (/modulation amplitude/.test(name) && CONDITION_FIELDS.modAmplitude.units[unit] != null) key = 'modAmplitude';
      if (!key) continue;
      const numeric = (axis.values || []).filter(value => Number.isFinite(value));
      const factor = CONDITION_FIELDS[key].units[unit];
      values[key] = summarize(numeric.map(value => value * factor), CONDITION_FIELDS[key]);
      if (key === 'attenuation') values.power = null; // A scan must not inherit one fixed-power setting.
      if (key === 'attenuation' && settings?.scanAxisMode === 'power' && Number(settings.scanPowerReferenceMW) > 0) {
        const p0 = Number(settings.scanPowerReferenceMW);
        values.power = summarize(numeric.map(value => p0 * 10 ** (-value / 10)), CONDITION_FIELDS.power);
        if (values.power) values.power.note = 'P₀ = ' + format(p0) + ' mW';
      }
    }
  }
  return { values, referenceFrequency: Number.isFinite(referenceFrequency) && referenceFrequency > 0 ? referenceFrequency : null };
}
export function conditionRows(input, context) {
  const config = normalizeConditions(input);
  if (!config.enabled) return [];
  return CONDITION_GROUPS.flatMap(group => {
    const entries = group.fields.flatMap(key => {
      const field = config.fields[key], spec = CONDITION_FIELDS[key];
      if (!field.show) return [];
      const value = field.manual ? { value: field.value, unit: field.unit } : context?.values?.[key];
      if (!value?.value) return [];
      const text = (spec.plot ? spec.plot + ' = ' : '') + value.value + (value.unit ? ' ' + value.unit : '') + (value.note ? ' (' + value.note + ')' : '');
      const ref = context?.referenceFrequency;
      // Reference frequency is shown separately from the acquired frequency.
      return key === 'frequency' && ref != null && (Number(value.value) !== ref || value.unit !== 'GHz')
        ? [text, 'νref = ' + format(ref) + ' GHz'] : [text];
    });
    return entries.length ? [{ group: group.key, text: entries.join('   ·   ') }] : [];
  });
}
