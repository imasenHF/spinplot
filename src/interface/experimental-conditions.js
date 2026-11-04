import { CONDITION_GROUPS, CONDITION_FIELDS, CONDITION_POSITIONS, normalizeConditions } from '../data/experimental-conditions.js';

export function mountConditions(card, sp, getContext, onChange) {
  const parent = card.querySelector('[data-annotation-details]');
  if (!parent) return;
  const config = normalizeConditions(sp.experimentalConditions);
  sp.experimentalConditions = config;
  const box = document.createElement('details');
  box.className = 'experimental-conditions advanced-layout';
  box.open = config.open;
  const summary = document.createElement('summary');
  summary.textContent = 'Experimental conditions';
  box.append(summary);
  box.addEventListener('toggle', () => { config.open = box.open; });
  const enabledLabel = document.createElement('label');
  enabledLabel.className = 'switch';
  const enabled = document.createElement('input');
  enabled.type = 'checkbox'; enabled.checked = config.enabled;
  enabled.dataset.condition = 'enabled';
  enabled.setAttribute('aria-label', 'Show experimental conditions');
  enabledLabel.append(enabled, document.createTextNode('Show on plot'));
  box.append(enabledLabel);
  enabled.onchange = () => { config.enabled = enabled.checked; onChange(); };
  const fields = new Map();
  let context = getContext();
  for (const group of CONDITION_GROUPS) {
    const section = document.createElement('fieldset');
    section.className = 'condition-group';
    section.dataset.conditionGroup = group.key;
    const legend = document.createElement('legend'); legend.textContent = group.label;
    section.append(legend);
    for (const key of group.fields) {
      const spec = CONDITION_FIELDS[key], field = config.fields[key];
      const row = document.createElement('div'); row.className = 'condition-field';
      const show = document.createElement('input'); show.type = 'checkbox'; show.checked = field.show;
      show.dataset.conditionShow = key; show.setAttribute('aria-label', 'Show ' + spec.label);
      const label = document.createElement('label'); label.className = 'condition-name'; label.textContent = spec.label;
      const badge = document.createElement('small'); label.append(badge);
      const value = document.createElement('input'); value.type = 'text'; value.dataset.conditionValue = key;
      value.setAttribute('aria-label', spec.label + ' value');
      const unit = document.createElement('input'); unit.type = 'text'; unit.dataset.conditionUnit = key;
      unit.setAttribute('aria-label', spec.label + ' unit'); unit.hidden = spec.text === true || !spec.unit;
      const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = '↺';
      reset.title = 'Restore file value'; reset.setAttribute('aria-label', 'Restore ' + spec.label + ' from file');
      const sync = () => {
        const auto = context.values[key];
        value.value = field.manual ? field.value : auto?.value || '';
        unit.value = field.manual ? field.unit : auto?.unit ?? spec.unit;
        badge.textContent = field.manual ? 'Manual' : auto ? 'File' : 'Missing';
        value.dataset.source = field.manual ? 'manual' : auto ? 'file' : 'missing';
        value.placeholder = auto ? '' : 'Enter value';
        value.title = field.manual ? 'Display-only override; original file metadata is retained.' : auto ? 'File value; editing creates a display-only override.' : 'No reliable file value; enter manually.';
        unit.title = 'Display unit; edit the value and unit together for manual overrides.';
        reset.disabled = !field.manual;
      };
      const edit = () => {
        field.manual = true; field.value = value.value.trim(); field.unit = unit.value.trim();
        sync(); onChange();
      };
      value.onchange = edit; unit.onchange = edit;
      show.onchange = () => { field.show = show.checked; onChange(); };
      reset.onclick = () => { context = getContext(); field.manual = false; field.value = ''; field.unit = spec.unit; sync(); onChange(); };
      row.append(show, label, value, unit, reset); section.append(row); fields.set(key, sync); sync();
    }
    box.append(section);
  }
  const layout = document.createElement('div'); layout.className = 'grid2 condition-layout';
  const add = (key, title, type, min, max, step) => {
    const label = document.createElement('label'); label.className = 'control-label'; label.textContent = title;
    const input = document.createElement('input'); input.type = type; input.value = String(config[key]);
    input.dataset.condition = key; input.min = String(min); input.max = String(max); input.step = String(step);
    input.onchange = () => { config[key] = normalizeConditions({ ...config, [key]: input.value })[key]; input.value = String(config[key]); onChange(); };
    label.append(input); layout.append(label); return input;
  };
  const positionLabel = document.createElement('label'); positionLabel.className = 'control-label'; positionLabel.textContent = 'Position';
  const position = document.createElement('select'); position.dataset.condition = 'position';
  for (const key of CONDITION_POSITIONS) { const option = document.createElement('option'); option.value = key; option.textContent = key.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase()); position.append(option); }
  position.value = config.position; positionLabel.append(position); layout.append(positionLabel);
  add('size', 'Font size (px)', 'number', 8, 24, 1);
  add('opacity', 'Background opacity', 'number', 0, 1, 0.05);
  const borderLabel = document.createElement('label'); borderLabel.className = 'switch';
  const border = document.createElement('input'); border.type = 'checkbox'; border.checked = config.border;
  border.dataset.condition = 'border'; border.onchange = () => { config.border = border.checked; onChange(); };
  borderLabel.append(border, document.createTextNode('Border')); layout.append(borderLabel);
  const x = add('x', 'X (%)', 'number', 0, 100, 1), y = add('y', 'Y (%)', 'number', 0, 100, 1);
  const syncCustom = () => { x.parentElement.hidden = config.position !== 'custom'; y.parentElement.hidden = config.position !== 'custom'; };
  position.onchange = () => { config.position = position.value; syncCustom(); onChange(); };
  syncCustom(); box.append(layout); parent.append(box);
  // Frequency and source selection may change while this card stays mounted.
  card.addEventListener('change', event => { if (!box.contains(event.target)) { context = getContext(); for (const sync of fields.values()) sync(); } });
}
