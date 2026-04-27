/* ═══════════════════════════════════════════════
   RPR Market Reports — Embed Generator JS
   v1.1.0 (redesign branch — side nav + form-mode toggle)
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

/* Field IDs for URL hash encoding (scalar fields only) */
const FIELD_KEYS = [
  'deliveryMethod','deliveryUrl','formMode','agentName','brokerage','logoUrl','colorBrandHex',
  'fontHeading','fontBody','headline','subheadline','btnLabel',
  'floatLabel','floatPosition','modalTrigger','cardBg','cardText',
  'cardRadius','areaLabel','reportsHeading','gdprText',
];

/* Per-method copy: placeholders + "check your X" success suffix */
const DELIVERY_META = {
  ntfy:       { placeholder: 'https://ntfy.sh/your-topic-name',                                  destination: 'ntfy app' },
  simplepush: { placeholder: 'https://api.simplepush.io/send/YOUR-KEY',                          destination: 'SimplePush app' },
  pushover:   { placeholder: 'https://api.pushover.net/1/messages.json?token=...&user=...',     destination: 'Pushover app' },
  toolkit:    { placeholder: 'https://gettoolkit.app/webhook/...',                              destination: 'email inbox' },
  slack:      { placeholder: 'https://hooks.slack.com/services/...',                             destination: 'Slack channel' },
  discord:    { placeholder: 'https://discord.com/api/webhooks/...',                             destination: 'Discord channel' },
  sheets:     { placeholder: 'https://script.google.com/macros/s/.../exec',                      destination: 'Google Sheet' },
  ghl:        { placeholder: 'https://services.leadconnectorhq.com/hooks/...',                   destination: 'GoHighLevel workflow' },
  make:       { placeholder: 'https://hook.us1.make.com/...',                                    destination: 'Make scenario' },
  zapier:     { placeholder: 'https://hooks.zapier.com/hooks/catch/...',                         destination: 'Zapier task history' },
  custom:     { placeholder: 'https://your-webhook-endpoint.com/...',                            destination: 'webhook destination' },
};

/* ─────────────────────────────────────────────
   State
───────────────────────────────────────────── */
let displayMode      = 'inline';
let rowId            = 0;
let _suppressGenerate = false;

/* ─────────────────────────────────────────────
   Boot
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Restore config from URL hash or localStorage ── */
  const hashStr  = location.hash.slice(1);
  const stored   = (() => { try { return localStorage.getItem('rpr-generator-config') || ''; } catch(e) { return ''; } })();
  const configStr = hashStr || stored;

  if (configStr) {
    applyConfig(hashToConfig(configStr));
  } else {
    /* Default seed rows */
    addReportRow('Beverly Hills 90210', '', true);
    addReportRow('Santa Monica 90401', '', true);
  }
  updateRemoveButtons();

  /* ── Collapsible sections ── */
  initCollapsibleSections();

  /* ── Static input listeners ── */
  const genInputIds = [
    'agentName','brokerage','logoUrl',
    'headline','subheadline','btnLabel','floatLabel','modalTrigger',
    'fontHeading','fontBody','cardRadius',
    'areaLabel','reportsHeading','gdprText',
  ];
  genInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', generate);
  });

  /* Delivery method dropdown — toggles panels + URL field, then generates */
  document.getElementById('deliveryMethod').addEventListener('change', function() {
    handleDeliveryChange();
    generate();
  });

  /* Shared delivery URL input */
  document.getElementById('deliveryUrl').addEventListener('input', function() {
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

  /* Card background color picker <-> hex sync */
  initColorPair('cardBgPicker', 'cardBg');
  initColorPair('cardTextPicker', 'cardText');

  /* Add area button (cap at 50 areas) */
  document.getElementById('addReport').addEventListener('click', () => {
    if (document.querySelectorAll('.report-row').length >= DEFAULTS.maxReportRows) return;
    addReportRow('', '');
  });

  /* Copy buttons */
  document.getElementById('copyBtn').addEventListener('click', copyCode);
  document.getElementById('copyLinkBtn').addEventListener('click', copyLink);

  /* Reset button — clears localStorage + URL hash, reloads with defaults */
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetConfig);

  /* Side nav: click switches which .section-pane is visible. */
  document.querySelectorAll('.side-nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchPane(btn.dataset.pane));
  });

  /* Form Mode tabs (radio-card style). The visible buttons set
     #formMode (a hidden input that participates in vals() / persistence). */
  document.querySelectorAll('.form-mode-tab').forEach(btn => {
    btn.addEventListener('click', () => setFormMode(btn.dataset.formMode));
  });

  /* Test webhook button */
  document.getElementById('testWebhookBtn').addEventListener('click', sendTestWebhook);

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

  /* Report rows — event delegation for remove buttons, input changes, and URL validation */
  document.getElementById('reportsList').addEventListener('click', e => {
    const btn = e.target.closest('.btn-remove');
    if (btn) {
      const row = btn.closest('.report-row');
      if (row) removeRow(Number(row.dataset.id));
    }
  });
  document.getElementById('reportsList').addEventListener('input', e => {
    if (e.target.classList.contains('report-url')) validateReportUrl(e.target);
    generate();
  });
  document.getElementById('reportsList').addEventListener('focusout', e => {
    if (e.target.classList.contains('report-url')) validateReportUrl(e.target);
  });

  /* Initial delivery panel + warning state (after applyConfig has run) */
  handleDeliveryChange();

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
    header.setAttribute('aria-expanded', header.classList.contains('open') ? 'true' : 'false');
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
   Delivery method panel handler
───────────────────────────────────────────── */
function handleDeliveryChange() {
  const method   = document.getElementById('deliveryMethod').value;
  const urlGroup = document.getElementById('deliveryUrlGroup');
  const urlInput = document.getElementById('deliveryUrl');

  /* Hide all panels, show the selected one */
  document.querySelectorAll('.delivery-panel').forEach(p => p.hidden = true);
  const panel = document.getElementById('panel-' + method);
  if (panel) panel.hidden = false;

  /* Show URL input for everything except none/sheets/empty */
  const noUrl = !method || method === 'none' || method === 'sheets';
  urlGroup.hidden = noUrl;

  /* Update placeholder for the selected service */
  const meta = DELIVERY_META[method];
  if (urlInput && meta) urlInput.placeholder = meta.placeholder;

  updateWebhookWarning();
}

/* ─────────────────────────────────────────────
   Webhook warning + test button visibility
───────────────────────────────────────────── */
function updateWebhookWarning() {
  const method  = document.getElementById('deliveryMethod').value;
  const url     = document.getElementById('deliveryUrl').value.trim();
  const noDelivery = !method || method === 'none';

  document.getElementById('webhookWarning').style.display = noDelivery ? 'flex' : 'none';

  /* HTTPS warning — surfaces in the generator before the embed widget rejects it at runtime */
  const urlWarning = document.getElementById('deliveryUrlWarning');
  if (urlWarning) urlWarning.hidden = !url || /^https:\/\//i.test(url);

  /* Test button only shows when a URL has been entered */
  const testBtn = document.getElementById('testWebhookBtn');
  if (testBtn) testBtn.style.display = url ? 'inline-block' : 'none';

  const result = document.getElementById('testWebhookResult');
  if (result) {
    result.textContent = '';
    result.className = 'test-webhook-result';
  }
}

/* ─────────────────────────────────────────────
   Test webhook
───────────────────────────────────────────── */
function sendTestWebhook() {
  const cfg    = vals();
  const btn    = document.getElementById('testWebhookBtn');
  const result = document.getElementById('testWebhookResult');

  if (!cfg.webhookUrl) return;

  /* Enforce HTTPS \u2014 matches what the embed widget enforces at runtime */
  if (!/^https:\/\//i.test(cfg.webhookUrl)) {
    result.textContent = 'Webhook URL must start with https:// \u2014 leads will not be sent over insecure connections.';
    result.className = 'test-webhook-result error';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending\u2026';
  result.textContent = '';
  result.className = 'test-webhook-result';

  const firstLabel = cfg.reports.length ? cfg.reports[0].label : 'Test Area';

  const payload = {
    form_id:       'rpr-test-000',
    first_name:    'Test',
    last_name:     'Lead (from RPR Generator)',
    email:         'test@example.com',
    phone:         '(555) 000-0000',
    selected_area: firstLabel,
    report_url:    'https://www.narrpr.com/reports-v2/test/pdf',
    agent_name:    cfg.agentName || '',
    brokerage:     cfg.brokerage || '',
    gdpr_consent:  null,
    source_url:    location.href,
    timestamp:     new Date().toISOString(),
  };

  /* no-cors so we don't trip CORS preflight on Slack/Discord/etc;
     trade-off is we can't read the response, only confirm it sent */
  const meta        = DELIVERY_META[cfg.deliveryMethod] || {};
  const destination = meta.destination || 'webhook destination';

  fetch(cfg.webhookUrl, {
    method:  'POST',
    mode:    'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify(payload),
  })
  .then(() => {
    result.textContent = 'Test sent \u2014 check your ' + destination + '.';
    result.className = 'test-webhook-result success';
  })
  .catch(() => {
    result.textContent = 'Could not send test \u2014 check your URL and try again.';
    result.className = 'test-webhook-result error';
  })
  .finally(() => {
    btn.disabled = false;
    btn.textContent = 'Send test';
  });
}

/* ─────────────────────────────────────────────
   Report URL validation
───────────────────────────────────────────── */
function validateReportUrl(input) {
  const row     = input.closest('.report-row');
  if (!row) return;
  let warning   = row.querySelector('.report-url-warning');
  const val     = input.value.trim();

  if (!val) {
    if (warning) warning.classList.remove('visible');
    return;
  }

  if (!/narrpr\.com/i.test(val)) {
    if (!warning) {
      warning = document.createElement('div');
      warning.className = 'report-url-warning';
      warning.textContent = 'This doesn\u2019t look like an RPR report URL \u2014 make sure you clicked Share and copied the PDF link from narrpr.com';
      row.appendChild(warning);
    }
    warning.classList.add('visible');
  } else {
    if (warning) warning.classList.remove('visible');
  }
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
  urlInput.placeholder   = 'https://www.narrpr.com/reports-v2/\u2026';
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

/* Also read ALL report rows including incomplete ones (for URL persistence) */
function getAllReportRows() {
  return Array.from(document.querySelectorAll('.report-row')).map(row => ({
    label: row.querySelector('.report-label').value.trim(),
    url:   row.querySelector('.report-url').value.trim(),
  }));
}

/* ─────────────────────────────────────────────
   Side nav: show one .section-pane at a time.
   Pane visibility is purely a UI affordance; all
   inputs remain in the DOM so vals() / persistence
   work the same way regardless of which pane is
   on screen.
───────────────────────────────────────────── */
function switchPane(pane) {
  if (!pane) return;
  document.querySelectorAll('.section-pane').forEach(p => {
    p.classList.toggle('active', p.dataset.pane === pane);
  });
  document.querySelectorAll('.side-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.pane === pane);
  });
}

/* ─────────────────────────────────────────────
   Form Mode toggle (Minimal vs Full)
───────────────────────────────────────────── */
function setFormMode(mode) {
  if (mode !== 'minimal' && mode !== 'full') return;
  const hidden = document.getElementById('formMode');
  if (hidden) hidden.value = mode;
  document.querySelectorAll('.form-mode-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.formMode === mode);
  });
  generate();
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
  const method = v('deliveryMethod');
  const url    = (!method || method === 'none' || method === 'sheets') ? '' : v('deliveryUrl');
  const formMode = (v('formMode') === 'full') ? 'full' : 'minimal';  /* default minimal */
  return {
    reports:        getReports(),
    deliveryMethod: method,
    webhookUrl:     url,
    formMode:       formMode,
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
  if (_suppressGenerate) return;
  clearTimeout(_genTimer);
  _genTimer = setTimeout(_generateNow, 60);
}
function generateNow() { clearTimeout(_genTimer); _generateNow(); }
function _generateNow() {
  const cfg = vals();
  renderPreview(cfg);
  renderCode(cfg);
  persistConfig(cfg);
}

/* ─────────────────────────────────────────────
   URL hash + localStorage persistence
───────────────────────────────────────────── */
function configToHash() {
  const params = new URLSearchParams();

  /* Scalar fields — only encode non-empty, non-default values */
  FIELD_KEYS.forEach(key => {
    const el = document.getElementById(key);
    if (!el) return;
    const val = el.value.trim();
    if (!val) return;
    params.set(key, val);
  });

  /* Display mode — only if not inline */
  if (displayMode !== 'inline') params.set('displayMode', displayMode);

  /* GDPR checkbox */
  if (document.getElementById('gdprEnabled').checked) params.set('gdprEnabled', '1');

  /* Reports — include all rows (even incomplete) so partial work is preserved */
  const rows = getAllReportRows();
  if (rows.length) params.set('reports', JSON.stringify(rows));

  return params.toString();
}

function hashToConfig(str) {
  const config = {};
  let params;
  try { params = new URLSearchParams(str); } catch(e) { return config; }

  FIELD_KEYS.forEach(key => {
    if (params.has(key)) config[key] = params.get(key);
  });

  /* Legacy field — pre-1.0.6 hashes used `webhook` instead of deliveryUrl. */
  if (params.has('webhook')) config.webhook = params.get('webhook');

  if (params.has('displayMode')) config.displayMode = params.get('displayMode');
  if (params.has('gdprEnabled')) config.gdprEnabled = params.get('gdprEnabled') === '1';
  if (params.has('reports')) {
    try { config.reports = JSON.parse(params.get('reports')); } catch(e) { /* ignore */ }
  }

  return config;
}

function applyConfig(config) {
  _suppressGenerate = true;

  /* Backwards-compat: pre-1.0.6 saved configs used `webhook=…` with no
     deliveryMethod. Treat any saved URL as a custom webhook. */
  if (config.webhook && !config.deliveryMethod) {
    config.deliveryMethod = 'custom';
    config.deliveryUrl    = config.webhook;
  }

  /* Scalar fields */
  FIELD_KEYS.forEach(key => {
    if (!(key in config)) return;
    const el = document.getElementById(key);
    if (el) el.value = config[key];
  });

  /* Sync form-mode-tabs to whichever value we just restored. */
  if (config.formMode) {
    document.querySelectorAll('.form-mode-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.formMode === config.formMode);
    });
  }

  /* Sync color picker to hex field */
  if (config.colorBrandHex) {
    const hex = config.colorBrandHex;
    if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) {
      document.getElementById('colorBrand').value = hex;
    }
  }

  /* Sync card color pickers to hex fields */
  ['cardBg','cardText'].forEach(id => {
    const hex = config[id];
    if (hex && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) {
      const picker = document.getElementById(id + 'Picker');
      if (picker) picker.value = hex.length === 4
        ? '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3]
        : hex;
    }
  });

  /* GDPR checkbox */
  if (config.gdprEnabled) {
    document.getElementById('gdprEnabled').checked = true;
    document.getElementById('gdprTextField').style.display = 'block';
  }

  /* Display mode */
  if (config.displayMode) {
    displayMode = config.displayMode;
    document.querySelectorAll('.mode-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.mode === displayMode)
    );
    document.querySelectorAll('.mode-detail').forEach(d => d.classList.remove('visible'));
    const detail = document.getElementById('detail-' + displayMode);
    if (detail) detail.classList.add('visible');
  }

  /* Reports */
  if (Array.isArray(config.reports) && config.reports.length) {
    config.reports.forEach(r => addReportRow(r.label || '', r.url || '', true));
  } else {
    /* No reports in config — seed defaults */
    addReportRow('Beverly Hills 90210', '', true);
    addReportRow('Santa Monica 90401', '', true);
  }

  _suppressGenerate = false;
}

function persistConfig() {
  const hash = configToHash();
  history.replaceState(null, '', hash ? '#' + hash : location.pathname + location.search);
  try { localStorage.setItem('rpr-generator-config', hash); } catch(e) { /* ignore */ }
}

/* ─────────────────────────────────────────────
   Google Fonts loader for preview
───────────────────────────────────────────── */
let _loadedFonts = new Set();
function loadPreviewFonts(heading, body) {
  const fonts = [heading, body].filter(Boolean);
  /* Only load fonts we haven't already injected */
  const toLoad = fonts.filter(f => !_loadedFonts.has(f));
  if (!toLoad.length) return;
  toLoad.forEach(f => _loadedFonts.add(f));
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family='
    + toLoad.map(f => f.replace(/\s+/g, '+') + ':wght@400;500;600').join('&family=')
    + '&display=swap';
  document.head.appendChild(link);
}

/* ─────────────────────────────────────────────
   Live preview render
───────────────────────────────────────────── */
function renderPreview(cfg) {
  const brand    = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(cfg.colorBrand)
                   ? cfg.colorBrand : DEFAULTS.colorBrand;
  const btnTextC = isLight(brand) ? '#18181b' : '#ffffff';
  const card     = document.getElementById('liveCard');

  /* Load and apply Google Fonts in preview */
  loadPreviewFonts(cfg.fontHeading, cfg.fontBody);
  const headingFont = cfg.fontHeading ? '"' + cfg.fontHeading + '", serif' : '';
  const bodyFont    = cfg.fontBody    ? '"' + cfg.fontBody    + '", sans-serif' : '';

  /* Area dropdown options */
  const areas    = cfg.reports.length
    ? cfg.reports.map(r => '<option>' + esc(r.label) + '</option>').join('')
    : '<option>Select an area\u2026</option>';
  const areaLabel = cfg.areaLabel || DEFAULTS.areaLabel;

  /* Agent header — matches the embed widget layout */
  const hasAgent = cfg.agentName || cfg.brokerage || cfg.logoUrl;
  let headerHTML = '';
  if (hasAgent) {
    if (cfg.logoUrl) {
      headerHTML += '<img class="lc-logo" src="' + esc(cfg.logoUrl) + '" alt="">';
    }
    if (cfg.agentName || cfg.brokerage) {
      headerHTML += '<div class="lc-agent-info">'
        + (cfg.agentName ? '<div class="lc-agent-name">' + esc(cfg.agentName) + '</div>' : '')
        + (cfg.brokerage ? '<div class="lc-brokerage">' + esc(cfg.brokerage) + '</div>' : '')
        + '</div>';
    }
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
    + '<div class="lc-headline"' + (headingFont ? ' style="font-family:' + headingFont + '"' : '') + '>' + esc(cfg.headline || DEFAULTS.headline) + '</div>'
    + '<div class="lc-subheadline"' + (bodyFont ? ' style="font-family:' + bodyFont + '"' : '') + '>' + esc(cfg.subheadline || DEFAULTS.subheadline) + '</div>'
    + '</div>'
    + '<div class="lc-body"><div class="lc-grid">'
    + (cfg.formMode === 'minimal'
        /* Minimal: area on top, email below — matches embed widget render order */
        ? '<div class="lc-field full"><div class="lc-label">' + esc(areaLabel) + ' *</div>'
          + '<select class="lc-select" tabindex="-1">' + areas + '</select></div>'
          + '<div class="lc-field full"><div class="lc-label">Email *</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="you@example.com" tabindex="-1" readonly></div>'
        /* Full: 2-column grid of first/last/email/phone, then area full-width */
        : '<div class="lc-field"><div class="lc-label">First name *</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="First name" tabindex="-1" readonly></div>'
          + '<div class="lc-field"><div class="lc-label">Last name *</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="Last name" tabindex="-1" readonly></div>'
          + '<div class="lc-field"><div class="lc-label">Email *</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="you@example.com" tabindex="-1" readonly></div>'
          + '<div class="lc-field"><div class="lc-label">Phone</div><input class="lc-input" style="border-color:#e0e0e0" placeholder="(555) 555-5555" tabindex="-1" readonly></div>'
          + '<div class="lc-field full"><div class="lc-label">' + esc(areaLabel) + ' *</div>'
          + '<select class="lc-select" tabindex="-1">' + areas + '</select></div>'
      )
    + '</div>'
    + gdprHTML
    + '<button class="lc-btn" style="background:' + brand + ';color:' + btnTextC + (bodyFont ? ';font-family:' + bodyFont : '') + '" tabindex="-1">'
    + esc(cfg.btnLabel || DEFAULTS.btnLabel) + '</button>'
    + '</div>'
    + '<div class="lc-disclaimer">Your information is kept private and never sold.</div>';

  /* ── Mode-specific preview chrome ── */
  const body  = document.getElementById('previewBody');

  /* Clean up previous mode artifacts */
  const oldFloat   = body.querySelector('.float-preview');
  const oldOverlay = body.querySelector('.modal-preview-overlay');
  const oldHint    = document.getElementById('liveCardWrap').querySelector('.modal-trigger-hint');
  if (oldFloat)   oldFloat.remove();
  if (oldOverlay) oldOverlay.remove();
  if (oldHint)    oldHint.remove();

  if (cfg.displayMode === 'floating') {
    const pill = document.createElement('button');
    pill.className = 'float-preview' + (cfg.floatPosition === 'bottom-left' ? ' left' : '');
    pill.style.background = brand;
    pill.style.color = btnTextC;
    pill.textContent = cfg.floatLabel || 'Get Market Report';
    pill.style.cursor = 'pointer';
    pill.style.pointerEvents = 'auto';
    pill.addEventListener('click', function() {
      var wrap = document.getElementById('liveCardWrap');
      var overlay = body.querySelector('.modal-preview-overlay');
      if (wrap.style.display === 'none') {
        wrap.style.display = '';
        if (overlay) overlay.style.display = '';
      } else {
        wrap.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
      }
    });
    body.appendChild(pill);
  }

  if (cfg.displayMode === 'modal') {
    const wrap = document.getElementById('liveCardWrap');
    const hint = document.createElement('div');
    hint.className = 'modal-trigger-hint';
    hint.innerHTML = '<div style="margin-bottom:6px">Your button triggers the modal</div>'
      + '<span class="modal-trigger-btn-preview">'
      + esc(cfg.modalTrigger || '#your-button')
      + '</span>';
    wrap.insertBefore(hint, wrap.firstChild);

    const overlay = document.createElement('div');
    overlay.className = 'modal-preview-overlay';
    body.appendChild(overlay);
  }
}

/* ─────────────────────────────────────────────
   Code output
───────────────────────────────────────────── */
function renderCode(cfg) {
  const reports = cfg.reports.filter(r => r.label && r.url);
  const lines   = [];

  lines.push('<script');
  lines.push('  src="https://pub-6607a59d1d3b4ed18490937c995526d1.r2.dev/rpr-reports-embed.js"');

  if (reports.length) {
    const json = JSON.stringify(reports, null, 2)
      .replace(/'/g, '&#x27;')
      .split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');
    lines.push("  data-reports='" + json + "'");
  } else {
    lines.push("  data-reports='[]'");
  }

  if (cfg.webhookUrl)  lines.push('  data-webhook="'      + av(cfg.webhookUrl)   + '"');
  /* Always emit data-form-mode so the embed code is explicit about which
     form variant the agent picked. The widget itself defaults to 'full' for
     backwards-compat, so omitting would silently flip new minimal embeds. */
  lines.push('  data-form-mode="' + av(cfg.formMode) + '"');
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
   Reset config — clears localStorage + URL hash and reloads.
   Reload is the simplest way to re-seed defaults across all
   fields (the alternative would be to manually walk every
   field, including dynamic report rows).
───────────────────────────────────────────── */
function resetConfig() {
  if (!confirm('Clear all saved generator fields and start fresh? This cannot be undone.')) return;
  try { localStorage.removeItem('rpr-generator-config'); } catch(e) { /* ignore */ }
  /* Strip hash and reload */
  history.replaceState(null, '', location.pathname + location.search);
  location.reload();
}

/* ─────────────────────────────────────────────
   Copy embed code
───────────────────────────────────────────── */
function copyCode() {
  const raw = document.getElementById('codeBlock').dataset.raw || '';
  const btn = document.getElementById('copyBtn');
  clipboardWrite(raw, btn, 'Copy');
}

/* ─────────────────────────────────────────────
   Copy generator link
───────────────────────────────────────────── */
function copyLink() {
  const btn = document.getElementById('copyLinkBtn');
  clipboardWrite(location.href, btn, 'Copy generator link');
}

/* ─────────────────────────────────────────────
   Shared clipboard helper
───────────────────────────────────────────── */
function clipboardWrite(text, btn, resetLabel) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = resetLabel; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    /* Fallback for non-HTTPS or iframe contexts */
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = resetLabel; btn.classList.remove('copied'); }, 2000);
  });
}

/* ─────────────────────────────────────────────
   Color picker <-> hex text field pair
───────────────────────────────────────────── */
function initColorPair(pickerId, hexId) {
  const picker = document.getElementById(pickerId);
  const hex    = document.getElementById(hexId);
  if (!picker || !hex) return;

  picker.addEventListener('input', function() {
    hex.value = this.value;
    generate();
  });

  hex.addEventListener('input', function() {
    const val = this.value.trim();
    if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(val)) {
      picker.value = val.length === 4
        ? '#' + val[1]+val[1] + val[2]+val[2] + val[3]+val[3]
        : val;
    }
    generate();
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

