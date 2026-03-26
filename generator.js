/* ═══════════════════════════════════════════════
   RPR Market Reports — Embed Generator JS
   v1.0.4
═══════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   Defaults — single source of truth for all
   magic strings. Change here, reflected everywhere.
───────────────────────────────────────────── */
const DEFAULTS = {
  colorBrand:     '#0086E6',
  btnLabel:       'Get My Market Report',
  headline:       'What\u2019s happening in your neighborhood?',
  subheadline:    'Select your area and get a free local market report.',
  areaLabel:      'Area of interest',
  reportsHeading: 'Your Market Report',
  floatPosition:  'bottom-right',
  cardBg:         '#ffffff',
  cardText:       '#333333',
  cardRadius:     '18',
  gdprText:       'I agree to receive communications about local real estate market activity.',
  maxReportRows:  50,
};

/* ─────────────────────────────────────────────
   State
───────────────────────────────────────────── */
let displayMode = 'inline';
let rowId       = 0;

/* ─────────────────────────────────────────────
   Boot
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Seed two example rows (skip generate until boot is done) */
  addReportRow('Beverly Hills 90210', '', true);
  addReportRow('Santa Monica 90401', '', true);
  updateRemoveButtons();

  /* ── Collapsible sections ── */
  initCollapsibleSections();

  /* ── Static input listeners ── */
  const genInputIds = [
    'agentName','brokerage','logoUrl',
    'headline','subheadline','btnLabel','floatLabel','modalTrigger',
    'fontHeading','fontBody','cardBg','cardText','cardRadius',
    'areaLabel','reportsHeading','gdprText',
  ];
  genInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', generate);
  });

  /* Webhook gets its own listener: generate + update warning */
  document.getElementById('webhook').addEventListener('input', function() {
    updateWebhookWarning();
    generate();
  });

  /* floatPosition is a <select> — fires 'change' not 'input' */
  document.getElementById('floatPosition').addEventListener('change', generate);

  /* gdprEnabled checkbox — also toggles the text field */
  document.getElementById('gdprEnabled').addEventListener('change', function() {
    document.getElementById('gdprTextField').style.display = this.checked ? 'block' : 'none';
    generate();
  });

  /* colorBrand picker syncs to hex text field */
  document.getElementById('colorBrand').addEventListener('input', function() {
    document.getElementById('colorBrandHex').value = this.value;
    generate();
  });

  /* colorBrandHex text field syncs to picker */
  document.getElementById('colorBrandHex').addEventListener('input', function() {
    const val = this.value.trim();
    if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(val)) {
      document.getElementById('colorBrand').value = val;
    }
    generate();
  });

  /* Add area button (cap at 50 areas) */
  document.getElementById('addReport').addEventListener('click', () => {
    if (document.querySelectorAll('.report-row').length >= DEFAULTS.maxReportRows) return;
    addReportRow('', '');
  });

  /* Copy button */
  document.getElementById('copyBtn').addEventListener('click', copyCode);

  /* Mode tabs — use event delegation on parent */
  document.querySelector('.mode-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.mode-tab');
    if (tab && tab.dataset.mode) setMode(tab.dataset.mode);
  });

  /* Device tabs — event delegation */
  document.querySelector('.preview-device-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.device-tab');
    if (tab && tab.dataset.device) setDevice(tab.dataset.device, tab);
  });

  /* Report rows — event delegation for remove buttons and input changes */
  document.getElementById('reportsList').addEventListener('click', e => {
    const btn = e.target.closest('.btn-remove');
    if (btn) {
      const row = btn.closest('.report-row');
      if (row) removeRow(Number(row.dataset.id));
    }
  });
  document.getElementById('reportsList').addEventListener('input', generate);

  /* Webhook warning: check initial state */
  updateWebhookWarning();

  generateNow();
});

/* ─────────────────────────────────────────────
   Collapsible sections
───────────────────────────────────────────── */
function initCollapsibleSections() {
  document.querySelectorAll('.section-header').forEach(function(header) {
    const sectionId = header.getAttribute('data-section');
    const body = document.querySelector('.section-body[data-section="' + sectionId + '"]');
    if (!body) return;

    /* Accessibility: make header keyboard-focusable and announce state */
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'true');
    body.id = body.id || 'section-body-' + sectionId;
    header.setAttribute('aria-controls', body.id);

    function toggle() {
      const isOpen = header.classList.contains('open');
      if (isOpen) {
        body.classList.add('collapsed');
        header.classList.remove('open');
        header.classList.add('collapsed');
        header.setAttribute('aria-expanded', 'false');
      } else {
        body.classList.remove('collapsed');
        header.classList.add('open');
        header.classList.remove('collapsed');
        header.setAttribute('aria-expanded', 'true');
      }
    }

    header.addEventListener('click', toggle);
    header.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

/* ─────────────────────────────────────────────
   Webhook warning
───────────────────────────────────────────── */
function updateWebhookWarning() {
  const val = document.getElementById('webhook').value.trim();
  document.getElementById('webhookWarning').style.display = val ? 'none' : 'flex';
}

/* ─────────────────────────────────────────────
   Report rows
───────────────────────────────────────────── */
function addReportRow(label, url, skipGenerate) {
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
  urlInput.placeholder   = 'https://www.narrpr.com/reports-v2/…';
  urlInput.value         = url;
  urlInput.className     = 'report-url';

  const removeBtn       = document.createElement('button');
  removeBtn.className   = 'btn-remove';
  removeBtn.innerHTML   = '&times;';
  removeBtn.type        = 'button';
  removeBtn.setAttribute('aria-label', 'Remove area');

  row.appendChild(labelInput);
  row.appendChild(urlInput);
  row.appendChild(removeBtn);
  list.appendChild(row);

  updateRemoveButtons();

  if (!skipGenerate) generate();
}

function removeRow(id) {
  const row = document.querySelector('.report-row[data-id="' + id + '"]');
  if (row) row.remove();
  updateRemoveButtons();

  generate();
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('.report-row');
  const solo = rows.length <= 1;
  rows.forEach(row => {
    const btn = row.querySelector('.btn-remove');
    if (!btn) return;
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
   Device preview
───────────────────────────────────────────── */
function setDevice(device, btn) {
  if (device !== 'desktop' && device !== 'mobile') return;
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
    colorBrand:     v('colorBrandHex') || DEFAULTS.colorBrand,
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
   Generate (debounced for fast typists)
───────────────────────────────────────────── */
let _genTimer = 0;
function generate() {
  clearTimeout(_genTimer);
  _genTimer = setTimeout(_generateNow, 60);
}
function generateNow() { clearTimeout(_genTimer); _generateNow(); }
function _generateNow() {
  const cfg = vals();
  renderPreview(cfg);
  renderCode(cfg);
}

/* ─────────────────────────────────────────────
   Live preview render
───────────────────────────────────────────── */
function renderPreview(cfg) {
  const brand    = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(cfg.colorBrand)
                   ? cfg.colorBrand : DEFAULTS.colorBrand;
  const btnTextC = isLight(brand) ? '#18181b' : '#ffffff';
  const card     = document.getElementById('liveCard');

  /* Area dropdown options */
  const areas    = cfg.reports.length
    ? cfg.reports.map(r => '<option>' + esc(r.label) + '</option>').join('')
    : '<option>Select an area…</option>';
  const areaLabel = cfg.areaLabel || DEFAULTS.areaLabel;

  /* Agent header */
  const hasAgent = cfg.agentName || cfg.brokerage || cfg.logoUrl;
  let headerHTML = '';
  if (hasAgent) {
    let avatarInner = '';
    if (cfg.logoUrl) {
      avatarInner = '<img src="' + esc(cfg.logoUrl) + '" alt="">';
    } else {
      avatarInner = initials(cfg.agentName) || initials(cfg.brokerage);
    }
    headerHTML = '<div class="lc-avatar">' + avatarInner + '</div>'
      + '<div class="lc-agent-info">'
      + (cfg.agentName ? '<div class="lc-agent-name">' + esc(cfg.agentName) + '</div>' : '')
      + (cfg.brokerage ? '<div class="lc-brokerage">' + esc(cfg.brokerage) + '</div>' : '')
      + '</div>'
      + '<span class="lc-badge">Powered by RPR</span>';
  }

  /* GDPR */
  const gdprHTML = cfg.gdprEnabled
    ? '<div class="lc-gdpr"><div class="lc-gdpr-box"></div><span>' + esc(cfg.gdprText || DEFAULTS.gdprText) + '</span></div>'
    : '';

  card.innerHTML =
    '<div class="lc-header" style="background:' + brand + '">'
    + (headerHTML || '<div style="width:8px"></div>')
    + '</div>'
    + '<div class="lc-hero">'
    + '<div class="lc-headline">' + esc(cfg.headline || DEFAULTS.headline) + '</div>'
    + '<div class="lc-subheadline">' + esc(cfg.subheadline || DEFAULTS.subheadline) + '</div>'
    + '</div>'
    + '<div class="lc-body"><div class="lc-grid">'
    + '<div class="lc-field"><div class="lc-label">First name *</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="First name" tabindex="-1" readonly></div>'
    + '<div class="lc-field"><div class="lc-label">Last name *</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="Last name" tabindex="-1" readonly></div>'
    + '<div class="lc-field"><div class="lc-label">Email *</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="you@example.com" tabindex="-1" readonly></div>'
    + '<div class="lc-field"><div class="lc-label">Phone</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="(555) 555-5555" tabindex="-1" readonly></div>'
    + '<div class="lc-field full"><div class="lc-label">' + esc(areaLabel) + ' *</div>'
    + '<select class="lc-select" tabindex="-1">' + areas + '</select></div>'
    + '</div>'
    + gdprHTML
    + '<button class="lc-btn" style="background:' + brand + ';color:' + btnTextC + '" tabindex="-1">'
    + esc(cfg.btnLabel || DEFAULTS.btnLabel) + '</button>'
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
  if (cfg.colorBrand && cfg.colorBrand.toLowerCase() !== DEFAULTS.colorBrand.toLowerCase())
                       lines.push('  data-color-brand="'  + av(cfg.colorBrand)   + '"');
  if (cfg.fontHeading) lines.push('  data-font-heading="' + av(cfg.fontHeading)  + '"');
  if (cfg.fontBody)    lines.push('  data-font-body="'    + av(cfg.fontBody)     + '"');
  if (cfg.headline)    lines.push('  data-headline="'     + av(cfg.headline)     + '"');
  if (cfg.subheadline) lines.push('  data-subheadline="'  + av(cfg.subheadline)  + '"');
  if (cfg.btnLabel && cfg.btnLabel !== DEFAULTS.btnLabel)
                       lines.push('  data-btn-label="'    + av(cfg.btnLabel)     + '"');

  lines.push('  data-display-mode="' + av(cfg.displayMode) + '"');
  if (cfg.displayMode === 'floating') {
    if (cfg.floatLabel)
      lines.push('  data-float-label="' + av(cfg.floatLabel) + '"');
    if (cfg.floatPosition && cfg.floatPosition !== DEFAULTS.floatPosition)
      lines.push('  data-float-position="' + av(cfg.floatPosition) + '"');
  }
  if (cfg.displayMode === 'modal' && cfg.modalTrigger)
    lines.push('  data-modal-trigger="' + av(cfg.modalTrigger) + '"');

  if (cfg.cardBg && cfg.cardBg !== DEFAULTS.cardBg)
    lines.push('  data-card-bg="'         + av(cfg.cardBg)         + '"');
  if (cfg.cardText && cfg.cardText !== DEFAULTS.cardText)
    lines.push('  data-card-text="'       + av(cfg.cardText)       + '"');
  if (cfg.cardRadius && cfg.cardRadius !== DEFAULTS.cardRadius)
    lines.push('  data-card-radius="'     + av(cfg.cardRadius)     + '"');
  if (cfg.areaLabel && cfg.areaLabel !== DEFAULTS.areaLabel)
    lines.push('  data-area-label="'      + av(cfg.areaLabel)      + '"');
  if (cfg.reportsHeading && cfg.reportsHeading !== DEFAULTS.reportsHeading)
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
  let out = '';
  let i = 0;
  const len = raw.length;

  while (i < len) {
    /* Match attribute name: data-xxx= or src= */
    const attrMatch = raw.slice(i).match(/^(data-[\w-]+|src)(?==)/);
    if (attrMatch) {
      out += '<span class="attr-name">' + attrMatch[0] + '</span>';
      i += attrMatch[0].length;
      continue;
    }

    /* Match double-quoted value: ="..." */
    if (raw[i] === '=' && raw[i+1] === '"') {
      const end = raw.indexOf('"', i + 2);
      if (end !== -1) {
        out += '=<span class="attr-value">"' + escHtml(raw.slice(i + 2, end)) + '"</span>';
        i = end + 1;
        continue;
      }
    }

    /* Match single-quoted value: ='...' (used for data-reports JSON) */
    if (raw[i] === '=' && raw[i+1] === "'") {
      const end = raw.indexOf("'", i + 2);
      if (end !== -1) {
        out += "=<span class=\"str\">'" + escHtml(raw.slice(i + 2, end)) + "'</span>";
        i = end + 1;
        continue;
      }
    }

    /* Match tags: <script (opening keyword) or ></script> (closing) */
    const tagMatch = raw.slice(i).match(/^(><\/script>|<script\b)/);
    if (tagMatch) {
      out += '<span class="tag">' + escHtml(tagMatch[0]) + '</span>';
      i += tagMatch[0].length;
      continue;
    }

    /* Default: escape and emit character */
    out += escHtml(raw[i]);
    i++;
  }

  return out;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─────────────────────────────────────────────
   Copy
───────────────────────────────────────────── */
function copyCode() {
  const raw = document.getElementById('codeBlock').dataset.raw || '';
  const btn = document.getElementById('copyBtn');
  navigator.clipboard.writeText(raw).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    /* Fallback for non-HTTPS or iframe contexts */
    const ta = document.createElement('textarea');
    ta.value = raw;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  });
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

function av(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function isLight(hex) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return (r*0.299 + g*0.587 + b*0.114) > 186;
}

function initials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
}
