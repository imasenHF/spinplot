// Vendor field units are defined by their file format, not by their magnitude.
// See docs/EXPERIMENTAL_CONDITIONS.md for the mappings and validation sources.
const ciqFields = {
  frequency: ['frequency', 'GHz'],
  power: ['lineEdit_MB_Power', 'mW'],
  attenuation: ['lineEdit_MB_Attenuation', 'dB'],
  modAmplitude: ['lineEdit_SC_ModulAmp', 'G'],
  modFrequency: ['comboBox_SC_ModulFreq', 'kHz'],
  timeConstant: ['lineEdit_SC_TimeConstant', 'ms'],
  pointTime: ['lineEdit_SC_ConvertTime', 'ms'],
};
const besFields = {
  sampleName: ['SAMP'], description: ['CMNT'],
  frequency: ['MWFQ', 'Hz'], power: ['MWPW', 'W'],
  modAmplitude: ['B0MA', 'T'], modFrequency: ['B0MF', 'Hz'],
  timeConstant: ['RCTC', 's'], pointTime: ['SPTP', 's'], scans: ['AVGS'],
};
const besDeviceFields = {
  frequency: 'FrequencyMon', power: 'Power', attenuation: 'PowerAtten',
  modAmplitude: 'ModAmp', modFrequency: 'ModFreq',
  timeConstant: 'TimeConst', pointTime: 'ConvTime', sweepTime: 'SweepTime',
};
export function acquisitionMetadata(metadata = {}) {
  const result = {};
  const setting = metadata.setting || {};
  const ciq = metadata.format === 'CIQTEK' || Object.keys(setting).some(key => /^lineEdit_(SC|MB)_/.test(key));
  const bes = metadata.format === 'BES3T' || (metadata.IRFMT != null && metadata.XPTS != null) || ['MWFQ', 'MWPW', 'B0MA', 'RCTC', 'SPTP'].some(key => Object.hasOwn(metadata, key));
  const copy = (source, mapping) => {
    for (const [key, [alias, unit]] of Object.entries(mapping)) {
      const raw = source[alias];
      if (raw == null || String(raw).trim() === '') continue;
      // Explicit units take precedence over the format's implicit unit.
      result[key] = unit && typeof raw !== 'object' && Number.isFinite(Number(raw))
        ? { value: raw, unit: source[alias + 'Unit'] || unit } : raw;
    }
  };
  if (ciq) {
    copy(setting, ciqFields);
    const experiment = String(metadata.type || '').split('/')[1]?.replace(/[^a-z0-9]/gi, '');
    const sweepFields = Object.keys(setting).filter(key => /^lineEdit_.+_NoOfSweeps$/.test(key));
    const sweepKey = experiment ? 'lineEdit_' + experiment + '_NoOfSweeps' : sweepFields.length === 1 ? sweepFields[0] : null;
    if (sweepKey) result.scans = setting[sweepKey];
  }
  if (bes) {
    copy(metadata, besFields);
    // Device-layer quantities carry explicit units (e.g. SweepTime 41.94 s).
    for (const [key, alias] of Object.entries(besDeviceFields)) if (result[key] == null) result[key] = metadata[alias];
    if (result.scans == null) result.scans = metadata.NbScansAcc;
  }
  return result;
}

// Keep actual sample metadata; experiment labels and filenames are not samples.
export function ciqSampleMetadata(raw) {
  const keys = ['sampleName', 'sampleId', 'sampleNumber', 'sampleDescription'];
  return Object.fromEntries(keys.filter(key => raw[key] != null).map(key => [key, raw[key]]));
}
