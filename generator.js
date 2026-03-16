/* generator.js — RPR Market Reports Embed Generator
   SEC-1 FIX: All JS extracted from inline <script> to this external file,
   and all inline event handlers (oninput/onclick/onchange) moved to
   addEventListener calls below, enabling script-src 'self' in CSP. */

/* ─────────────────────────────────────────────
   State
───────────────────────────────────────────── */
let displayMode = 'inline';
let rowId       = 0;

/* ─────────────────────────────────────────────
   Boot
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  addReportRow('Beverly Hills 90210', '');
  addReportRow('Santa Monica 90401', '');
  updateRemoveButtons();

  const genInputIds = [
    'webhook','agentName','brokerage','logoUrl','colorBrandHex',
    'headline','subheadline','btnLabel','floatLabel','modalTrigger',
    'fontHeading','fontBody','cardBg','cardText','cardRadius',
    'areaLabel','reportsHeading','gdprText',
  ];
  genInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', generate);
  });

  document.getElementById('floatPosition').addEventListener('change', generate);

  document.getElementById('gdprEnabled').addEventListener('change', function() {
    document.getElementById('gdprTextField').style.display = this.checked ? 'block' : 'none';
    generate();
  });

  document.getElementById('colorBrand').addEventListener('input', function() {
    document.getElementById('colorBrandHex').value = this.value;
    generate();
  });

  document.getElementById('colorBrandHex').addEventListener('input', function() {
    const val = this.value.trim();
    if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(val)) {
      document.getElementById('colorBrand').value = val;
    }
    generate();
  });

  document.getElementById('addReport').addEventListener('click', () => addReportRow('', ''));
  document.getElementById('advToggle').addEventListener('click', toggleAdvanced);
  document.getElementById('copyBtn').addEventListener('click', copyCode);

  document.querySelector('.mode-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.mode-tab');
    if (tab && tab.dataset.mode) setMode(tab.dataset.mode);
  });

  document.querySelector('.preview-device-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.device-tab');
    if (tab) setDevice(tab.dataset.device, tab);
  });

  document.getElementById('reportsList').addEventListener('click', e => {
    const btn = e.target.closest('.btn-remove');
    if (btn) {
      const row = btn.closest('.report-row');
      if (row) removeRow(Number(row.dataset.id));
    }
  });
  document.getElementById('reportsList').addEventListener('input', generate);

  generate();
});

/* ─────────────────────────────────────────────
   Report rows
───────────────────────────────────────────── */
function addReportRow(label, url) {
  const id   = ++rowId;
  const list = document.getElementById('reportsList');
  const row  = document.createElement('div');
  row.className  = 'report-row';
  row.dataset.id = id;

  const labelInput       = document.createElement('input');
  labelInput.type        = 'text';
  labelInput.placeholder = 'Area label';
  labelInput.value       = label;
  labelInput.className   = 'report-label';

  const urlInput         = document.createElement('input');
  urlInput.type          = 'text';
  urlInput.placeholder   = 'https://www.narrpr.com/reports-v2/\u2026/pdf';
  urlInput.value         = url;
  urlInput.className     = 'report-url';
  urlInput.style.cssText = 'font-family:var(--mono);font-size:11px;';

  const removeBtn           = document.createElement('button');
  removeBtn.className       = 'btn-remove';
  removeBtn.title           = 'Remove';
  removeBtn.type            = 'button';
  removeBtn.textContent     = '\u00d7';

  row.appendChild(labelInput);
  row.appendChild(urlInput);
  row.appendChild(removeBtn);
  list.appendChild(row);
  updateRemoveButtons();
}

function removeRow(id) {
  const rows = document.querySelectorAll('.report-row');
  if (rows.length <= 1) return;
  const row = document.querySelector('.report-row[data-id="' + id + '"]');
  if (row) { row.remove(); updateRemoveButtons(); generate(); }
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('.report-row');
  const solo = rows.length === 1;
  rows.forEach(r => {
    const btn          = r.querySelector('.btn-remove');
    btn.disabled       = solo;
    btn.style.opacity  = solo ? '0.3' : '1';
    btn.style.cursor   = solo ? 'not-allowed' : 'pointer';
  });
}

function getReports() {
  return Array.from(document.querySelectorAll('.report-row')).map(row => ({
    label: row.querySelector('.report-label').value.trim(),
    url:   row.querySelector('.report-url').value.trim(),
  })).filter(r => r.label && r.url);
}

/* ─────────────────────────────────────────────
   Display mode
───────────────────────────────────────────── */
function setMode(mode) {
  displayMode = mode;
  document.querySelectorAll('.mode-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mode === mode)
  );
  document.querySelectorAll('.mode-detail').forEach(d => d.classList.remove('visible'));
  document.getElementById('detail-' + mode).classList.add('visible');
  generate();
}

/* ─────────────────────────────────────────────
   Advanced toggle
───────────────────────────────────────────── */
function toggleAdvanced() {
  document.getElementById('advToggle').classList.toggle('open');
  document.getElementById('advSection').classList.toggle('open');
}

/* ─────────────────────────────────────────────
   Device preview
───────────────────────────────────────────── */
function setDevice(device, btn) {
  document.querySelectorAll('.device-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('previewFrame').className = 'preview-frame ' + device;
}

/* ─────────────────────────────────────────────
   Read all values
───────────────────────────────────────────── */
function vals() {
  return {
    reports:        getReports(),
    webhook:        v('webhook'),
    agentName:      v('agentName'),
    brokerage:      v('brokerage'),
    logoUrl:        v('logoUrl'),
    colorBrand:     v('colorBrandHex') || '#1a1a2e',
    fontHeading:    v('fontHeading'),
    fontBody:       v('fontBody'),
    headline:       v('headline'),
    subheadline:    v('subheadline'),
    btnLabel:       v('btnLabel'),
    displayMode:    displayMode,
    floatLabel:     v('floatLabel'),
    floatPosition:  v('floatPosition'),
    modalTrigger:   v('modalTrigger'),
    cardBg:         v('cardBg'),
    cardText:       v('cardText'),
    cardRadius:     v('cardRadius'),
    areaLabel:      v('areaLabel'),
    reportsHeading: v('reportsHeading'),
    gdprEnabled:    document.getElementById('gdprEnabled').checked,
    gdprText:       v('gdprText'),
  };
}

function v(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/* ─────────────────────────────────────────────
   Generate
───────────────────────────────────────────── */
function generate() {
  const cfg = vals();
  renderPreview(cfg);
  renderCode(cfg);
}

/* ─────────────────────────────────────────────
   Live preview render
───────────────────────────────────────────── */
function renderPreview(cfg) {
  const brand    = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(cfg.colorBrand)
                   ? cfg.colorBrand : '#1a1a2e';
  const btnTextC = isLight(brand) ? '#1a1a1a' : '#ffffff';
  const reports  = cfg.reports.filter(r => r.label);
  const card     = document.getElementById('liveCard');

  let headerHTML = '';
  if (cfg.logoUrl && cfg.logoUrl.startsWith('https://')) {
    headerHTML += '<img class="lc-logo" src="' + esc(cfg.logoUrl) + '" alt="">';
  }
  if (cfg.agentName || cfg.brokerage) {
    headerHTML += '<div class="lc-header-agent" style="margin-left:auto;text-align:right;">';
    if (cfg.agentName) headerHTML += '<div class="lc-header-name" style="color:' + btnTextC + '">' + esc(cfg.agentName) + '</div>';
    if (cfg.brokerage) headerHTML += '<div class="lc-header-brokerage" style="color:' + btnTextC + '">' + esc(cfg.brokerage) + '</div>';
    headerHTML += '</div>';
  }

  const areaLabel = cfg.areaLabel || 'Area of interest';
  let optionsHTML = '<option value="" disabled selected>Select an area\u2026</option>';
  if (reports.length) {
    reports.forEach(r => { optionsHTML += '<option>' + esc(r.label) + '</option>'; });
  } else {
    optionsHTML += '<option disabled>No areas added yet</option>';
  }

  const gdprHTML = cfg.gdprEnabled
    ? '<div style="display:flex;align-items:flex-start;gap:8px;margin-top:10px;font-size:12px;color:#666;">'
      + '<input type="checkbox" tabindex="-1" style="width:14px;height:14px;margin-top:1px;flex-shrink:0;">'
      + '<span>' + esc(cfg.gdprText || 'I agree to receive communications.') + '</span></div>'
    : '';

  card.innerHTML =
    '<div class="lc-header" style="background:' + brand + '">'
    + (headerHTML || '<div style="width:8px"></div>')
    + '</div>'
    + '<div class="lc-hero">'
    + '<div class="lc-headline">' + esc(cfg.headline || 'What\u2019s happening in your neighborhood?') + '</div>'
    + '<div class="lc-subheadline">' + esc(cfg.subheadline || 'Select your area and get a free local market report.') + '</div>'
    + '</div>'
    + '<div class="lc-body"><div class="lc-grid">'
    + '<div class="lc-field"><div class="lc-label">First name *</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="First name" tabindex="-1" readonly></div>'
    + '<div class="lc-field"><div class="lc-label">Last name *</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="Last name" tabindex="-1" readonly></div>'
    + '<div class="lc-field"><div class="lc-label">Email *</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="you@example.com" tabindex="-1" readonly></div>'
    + '<div class="lc-field"><div class="lc-label">Phone</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="(555) 555-5555" tabindex="-1" readonly></div>'
    + '<div class="lc-field full"><div class="lc-label">' + esc(areaLabel) + ' *</div>'
    + '<select class="lc-select" tabindex="-1">' + optionsHTML + '</select></div>'
    + '</div>'
    + gdprHTML
    + '<button class="lc-btn" style="background:' + brand + ';color:' + btnTextC + '" tabindex="-1">'
    + esc(cfg.btnLabel || 'Get My Market Report') + '</button>'
    + '</div>'
    + '<div class="lc-disclaimer">Your information is kept private and never sold.</div>';
}

/* ─────────────────────────────────────────────
   Code output
───────────────────────────────────────────── */
function renderCode(cfg) {
  const reports = cfg.reports.filter(r => r.label && r.url);
  const lines   = [];

  lines.push('<script');
  lines.push('  src="https://reggienicolay.github.io/rpr-reports-embed/rpr-reports-embed.js"');

  if (reports.length) {
    const json = JSON.stringify(reports, null, 2)
      .replace(/'/g, '&#x27;')
      .split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');
    lines.push("  data-reports='" + json + "'");
  } else {
    lines.push("  data-reports='[]'");
  }

  if (cfg.webhook)     lines.push('  data-webhook="'      + av(cfg.webhook)      + '"');
  if (cfg.agentName)   lines.push('  data-agent-name="'   + av(cfg.agentName)    + '"');
  if (cfg.brokerage)   lines.push('  data-brokerage="'    + av(cfg.brokerage)    + '"');
  if (cfg.logoUrl)     lines.push('  data-logo-url="'     + av(cfg.logoUrl)      + '"');
  if (cfg.colorBrand && cfg.colorBrand.toLowerCase() !== '#1a1a2e')
                       lines.push('  data-color-brand="'  + av(cfg.colorBrand)   + '"');
  if (cfg.fontHeading) lines.push('  data-font-heading="' + av(cfg.fontHeading)  + '"');
  if (cfg.fontBody)    lines.push('  data-font-body="'    + av(cfg.fontBody)     + '"');
  if (cfg.headline)    lines.push('  data-headline="'     + av(cfg.headline)     + '"');
  if (cfg.subheadline) lines.push('  data-subheadline="'  + av(cfg.subheadline)  + '"');
  if (cfg.btnLabel && cfg.btnLabel !== 'Get My Market Report')
                       lines.push('  data-btn-label="'    + av(cfg.btnLabel)     + '"');

  lines.push('  data-display-mode="' + av(cfg.displayMode) + '"');
  if (cfg.displayMode === 'floating') {
    if (cfg.floatLabel)
      lines.push('  data-float-label="' + av(cfg.floatLabel) + '"');
    if (cfg.floatPosition && cfg.floatPosition !== 'bottom-right')
      lines.push('  data-float-position="' + av(cfg.floatPosition) + '"');
  }
  if (cfg.displayMode === 'modal' && cfg.modalTrigger)
    lines.push('  data-modal-trigger="' + av(cfg.modalTrigger) + '"');

  if (cfg.cardBg && cfg.cardBg !== '#ffffff')
    lines.push('  data-card-bg="'         + av(cfg.cardBg)         + '"');
  if (cfg.cardText && cfg.cardText !== '#333333')
    lines.push('  data-card-text="'       + av(cfg.cardText)       + '"');
  if (cfg.cardRadius && cfg.cardRadius !== '18')
    lines.push('  data-card-radius="'     + av(cfg.cardRadius)     + '"');
  if (cfg.areaLabel && cfg.areaLabel !== 'Area of interest')
    lines.push('  data-area-label="'      + av(cfg.areaLabel)      + '"');
  if (cfg.reportsHeading && cfg.reportsHeading !== 'Your Market Report')
    lines.push('  data-reports-heading="' + av(cfg.reportsHeading) + '"');
  if (cfg.gdprEnabled) {
    lines.push('  data-gdpr-enabled="true"');
    if (cfg.gdprText) lines.push('  data-gdpr-text="' + av(cfg.gdprText) + '"');
  }

  lines.push('><\/script>');

  const raw = lines.join('\n');
  document.getElementById('codeBlock').innerHTML   = syntaxHighlight(raw);
  document.getElementById('codeBlock').dataset.raw = raw;
}

/* ─────────────────────────────────────────────
   Syntax highlighting
───────────────────────────────────────────── */
function syntaxHighlight(raw) {
  const parts = [];
  const TOKEN = /(<\/?script[^>]*>)|(data-[\w-]+|src)(?==)|(="[^"]*")|('[\s\S]*?'(?=\s|>|$))/g;
  let last = 0, m;
  while ( (m = TOKEN.exec(raw)) !== null ) {
    if (m.index > last) parts.push({ t: 'text', v: raw.slice(last, m.index) });
    if      (m[1])      parts.push({ t: 'tag',  v: m[1] });
    else if (m[2])      parts.push({ t: 'attr', v: m[2] });
    else if (m[3])      parts.push({ t: 'val',  v: m[3] });
    else if (m[4])      parts.push({ t: 'str',  v: m[4] });
    last = m.index + m[0].length;
  }
  if (last < raw.length) parts.push({ t: 'text', v: raw.slice(last) });

  return parts.map(p => {
    const e = p.v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    switch (p.t) {
      case 'tag':  return '<span class="tag">'        + e + '</span>';
      case 'attr': return '<span class="attr-name">'  + e + '</span>';
      case 'val':  return '<span class="attr-value">' + e + '</span>';
      case 'str':  return '<span class="str">'        + e + '</span>';
      default:     return e;
    }
  }).join('');
}

/* ─────────────────────────────────────────────
   Copy
───────────────────────────────────────────── */
function copyCode() {
  const raw = document.getElementById('codeBlock').dataset.raw || '';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(raw).then(showCopied).catch(() => fallbackCopy(raw));
  } else {
    fallbackCopy(raw);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;width:1px;height:1px;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); showCopied(); } catch(e) {}
  document.body.removeChild(ta);
}

function showCopied() {
  const btn = document.getElementById('copyBtn');
  btn.textContent = 'Copied!';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function av(str) {
  return String(str || '').replace(/"/g, '&quot;');
}

function isLight(hex) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return (r*0.299 + g*0.587 + b*0.114) > 186;
}
