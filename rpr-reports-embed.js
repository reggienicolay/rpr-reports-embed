/**
 * rpr-reports-embed.js  v1.0.6
 *
 * Standalone market report lead capture widget.
 * Drop a single <script> tag on any page — no framework, no jQuery.
 *
 * IMPORTANT: Do NOT add async or defer to this script tag.
 *
 * Required attributes:
 *   data-reports   JSON array: [{"label":"Area Name","url":"https://narrpr.com/..."},…]
 *   data-webhook   HTTPS URL to receive lead payload (Zapier / Make / GHL / HubSpot)
 *
 * Optional attributes (all have sensible defaults):
 *   data-agent-name        Agent display name
 *   data-brokerage         Brokerage name
 *   data-logo-url          Logo image URL (must be https://)
 *   data-color-brand       Primary brand color (hex, default #1a1a2e)
 *   data-color-brand-hover Hover state (hex, auto-derived if omitted)
 *   data-font-heading      Google Font name for headings (default: inherit)
 *   data-font-body         Google Font name for body text (default: inherit)
 *   data-headline          Form headline text
 *   data-subheadline       Form subheadline text
 *   data-btn-label         Submit button text
 *   data-disclaimer        Footer disclaimer text
 *   data-display-mode      "inline" | "floating" | "modal"  (default: inline)
 *   data-float-label       Floating button label (display-mode=floating)
 *   data-float-position    "bottom-right" | "bottom-left"   (default: bottom-right)
 *   data-modal-trigger     CSS selector of element that opens modal (display-mode=modal)
 *   data-card-radius       Card border-radius in px (default: 18)
 *   data-card-bg           Card background color hex (default: #ffffff — change for dark sites)
 *   data-card-text         Card body text color hex (default: #333333 — change for dark sites)
 *   data-gdpr-enabled      "true" | "false"  (default: false)
 *   data-gdpr-text         GDPR checkbox label text
 *   data-reports-heading   Heading shown above report cards on step 2
 *   data-area-label        Label for the area dropdown (default: "Area of interest")
 *   data-area-placeholder  Placeholder for the area dropdown (default: "Select an area…")
 *
 * Changelog:
 *   v1.0.3 — 8 security fixes:
 *     SEC-1  XSS: btnText interpolated into innerHTML; icon SVG now built with DOM API
 *     SEC-2  XSS: viewBtn.innerHTML replaced with textNode + imperative SVG
 *     SEC-3  XSS: escHtml() did not escape single quotes; added &#x27; replacement
 *     SEC-4  CSS injection: font names from data-* unsanitized; sanitizeFontName() added
 *     SEC-5  Data exfiltration: data-logo-url accepted any URL; now enforces https://
 *     SEC-6  PII over HTTP: non-HTTPS webhook only warned; now blocked entirely
 *     SEC-7  Abuse: no post-success guard; repeated submits fired multiple webhooks
 *     SEC-8  Input validation: data-form-id accepted arbitrary chars; now alphanumeric only
 *
 *   v1.0.2 — 6 bug fixes:
 *     BUG A  Regression: duplicate cardBg key in CFG object (second silently overwrote first)
 *     BUG B  UX: "Sending…" status text never cleared when no webhook configured
 *     BUG C  UX: _rprReset used .value='' on area select; placeholder not reliably re-shown
 *     BUG D  Robustness: color helpers produced NaN on non-hex data-color-brand values
 *     BUG E  Robustness: cardRadius not validated; non-numeric value broke CSS custom property
 *     BUG F  Crash: invalid data-modal-trigger CSS selector threw unhandled SyntaxError
 *
 *   v1.0.1 — 10 bug fixes:
 *     BUG 1  Crash: parseInt on empty area value → NaN → undefined report
 *     BUG 2  Crash: document.currentScript null with async/defer; now fails loudly
 *     BUG 3  XSS: javascript: URLs in data-reports allowed; http(s) enforced at parse + render
 *     BUG 4  UX: button stuck disabled on network error; re-enabled in finally + user message
 *     BUG 5  UX: GDPR is-error state never cleared when user checks the box
 *     BUG 6  Logic: wrong error message on last_name (el.id string match, not loop variable)
 *     BUG 7  UX: floating/modal overlay reopen after submit caused double webhook fire
 *     BUG 8  CSS: hardcoded #fff/#333 broke dark host pages; now data-card-bg/text attrs
 *     BUG 9  UX: modal fallback button showed floatLabel instead of btnLabel
 *     BUG 10 CSS: Google Fonts URL broken for multi-word names (spaces must encode as +)
 */
( function () {
	'use strict';

	/* ================================================================
	   §0  FIND SCRIPT TAG & PARSE CONFIG
	   ================================================================ */

	/* BUG 2 FIX: document.currentScript is null when loaded with async/defer.
	   Capture it immediately and fail loudly rather than picking a wrong script. */
	const scriptEl = document.currentScript;
	if ( ! scriptEl ) {
		console.error( 'RPR Reports Embed: script must not use async or defer attributes. Remove them and reload.' );
		return;
	}

	/* ── Parse data-reports JSON ─────────────────────────────────── */
	let REPORTS = [];
	try {
		const raw = scriptEl.getAttribute( 'data-reports' ) || '[]';
		REPORTS = JSON.parse( raw );
		if ( ! Array.isArray( REPORTS ) || ! REPORTS.length ) {
			console.error( 'RPR Reports Embed: data-reports must be a non-empty JSON array.' );
			return;
		}
		// BUG 3 FIX: validate each entry has label + a safe http(s) URL
		REPORTS = REPORTS.filter( r => r.label && r.url && /^https?:\/\//i.test( r.url ) );
		if ( ! REPORTS.length ) {
			console.error( 'RPR Reports Embed: No valid entries in data-reports (each needs "label" and a https:// "url").' );
			return;
		}
	} catch ( e ) {
		console.error( 'RPR Reports Embed: Could not parse data-reports JSON.', e );
		return;
	}

	/* ── Helper: read a data-* attribute ─────────────────────────── */
	function attr( name, fallback ) {
		const val = scriptEl.getAttribute( name );
		return ( val !== null && val !== '' ) ? val : ( fallback !== undefined ? fallback : '' );
	}

	/* ── Input sanitizers ────────────────────────────────────────── */

	/* SEC-4 FIX: strip everything except letters, numbers, spaces, hyphens from font names */
	function sanitizeFontName( name ) {
		return name ? name.replace( /[^a-zA-Z0-9 \-]/g, '' ).trim() : '';
	}

	/* ── Config object ───────────────────────────────────────────── */
	const CFG = {
		reports:         REPORTS,
		webhook:         attr( 'data-webhook' ),
		agentName:       attr( 'data-agent-name' ),
		brokerage:       attr( 'data-brokerage' ),
		/* SEC-5 FIX: only allow https:// logo URLs to prevent credential-bearing requests */
		logoUrl:         ( () => { const u = attr( 'data-logo-url' ); return /^https:\/\//i.test( u ) ? u : ''; } )(),
		colorBrand:      attr( 'data-color-brand',       '#1a1a2e' ),
		colorBrandHover: attr( 'data-color-brand-hover', '' ),
		fontHeading:     sanitizeFontName( attr( 'data-font-heading' ) ),
		fontBody:        sanitizeFontName( attr( 'data-font-body' ) ),
		headline:        attr( 'data-headline',     'What\'s happening in your neighborhood?' ),
		subheadline:     attr( 'data-subheadline',  'Select your area below and get a free local market report — no obligation.' ),
		btnLabel:        attr( 'data-btn-label',    'Get My Market Report' ),
		disclaimer:      attr( 'data-disclaimer',   'Your information is kept private and never sold.' ),
		displayMode:     attr( 'data-display-mode', 'inline' ),
		floatLabel:      attr( 'data-float-label',  'Get Market Report' ),
		floatPosition:   attr( 'data-float-position', 'bottom-right' ),
		modalTrigger:    attr( 'data-modal-trigger' ),
		cardRadius:      String( parseInt( attr( 'data-card-radius', '18' ), 10 ) || 18 ),
		cardBg:          attr( 'data-card-bg',      '#ffffff' ),
		cardText:        attr( 'data-card-text',    '#333333' ),
		gdprEnabled:     attr( 'data-gdpr-enabled', 'false' ) === 'true',
		gdprText:        attr( 'data-gdpr-text',    'I agree to receive communications about local real estate market activity.' ),
		reportsHeading:  attr( 'data-reports-heading', 'Your Market Report' ),
		areaLabel:       attr( 'data-area-label',       'Area of interest' ),
		areaPlaceholder: attr( 'data-area-placeholder', 'Select an area…' ),
		/* SEC-8 FIX: restrict formId to safe alphanumeric/hyphen/underscore chars */
		formId:          ( attr( 'data-form-id' ).replace( /[^a-zA-Z0-9\-_]/g, '' ) )
		                 || ( 'rpr-reports-' + Math.random().toString( 36 ).slice( 2, 8 ) ),
	};

	/* SEC-6 FIX: block non-HTTPS webhooks entirely — don't transmit PII unencrypted */
	if ( CFG.webhook && ! CFG.webhook.startsWith( 'https://' ) ) {
		console.error( 'RPR Reports Embed: data-webhook must be an HTTPS URL. Webhook disabled.' );
		CFG.webhook = '';
	}

	/* ── Derived colors ──────────────────────────────────────────── */

	/* BUG D FIX: validate hex before passing to color helpers; fall back to default */
	function isValidHex( hex ) {
		return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test( ( hex || '' ).trim() );
	}
	if ( ! isValidHex( CFG.colorBrand ) ) {
		console.warn( 'RPR Reports Embed: data-color-brand is not a valid hex color. Falling back to #1a1a2e.' );
		CFG.colorBrand = '#1a1a2e';
	}
	if ( CFG.colorBrandHover && ! isValidHex( CFG.colorBrandHover ) ) {
		console.warn( 'RPR Reports Embed: data-color-brand-hover is not a valid hex color. It will be auto-derived.' );
		CFG.colorBrandHover = '';
	}

	function hexToRgba( hex, alpha ) {
		hex = hex.replace( '#', '' );
		if ( hex.length === 3 ) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
		const r = parseInt( hex.substring(0,2), 16 );
		const g = parseInt( hex.substring(2,4), 16 );
		const b = parseInt( hex.substring(4,6), 16 );
		return `rgba(${r},${g},${b},${alpha})`;
	}

	function darkenHex( hex, amount ) {
		hex = hex.replace( '#', '' );
		if ( hex.length === 3 ) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
		const r = Math.max( 0, parseInt( hex.substring(0,2), 16 ) - amount );
		const g = Math.max( 0, parseInt( hex.substring(2,4), 16 ) - amount );
		const b = Math.max( 0, parseInt( hex.substring(4,6), 16 ) - amount );
		return '#' + [r,g,b].map( c => c.toString(16).padStart(2,'0') ).join('');
	}

	/* Determine if brand color is light or dark for button text contrast */
	function isLightColor( hex ) {
		hex = hex.replace( '#', '' );
		if ( hex.length === 3 ) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
		const r = parseInt( hex.substring(0,2), 16 );
		const g = parseInt( hex.substring(2,4), 16 );
		const b = parseInt( hex.substring(4,6), 16 );
		return ( r * 0.299 + g * 0.587 + b * 0.114 ) > 186;
	}

	const brandHover = CFG.colorBrandHover || darkenHex( CFG.colorBrand, 20 );
	const focusRing  = hexToRgba( CFG.colorBrand, 0.15 );
	const btnText    = isLightColor( CFG.colorBrand ) ? '#1a1a1a' : '#ffffff';

	/* ================================================================
	   §1  LOAD GOOGLE FONTS (if configured)
	   ================================================================ */
	function loadGoogleFonts() {
		const fonts = [ CFG.fontHeading, CFG.fontBody ].filter( Boolean );
		if ( ! fonts.length ) return;
		const uniqueFonts = [ ...new Set( fonts ) ];
		const link = document.createElement( 'link' );
		link.rel  = 'stylesheet';
		link.href = 'https://fonts.googleapis.com/css2?family=' +
			uniqueFonts.map( f => f.replace( /\s+/g, '+' ) + ':wght@400;500;600' ).join( '&family=' ) +
			'&display=swap';
		document.head.appendChild( link );
	}
	loadGoogleFonts();

	/* ================================================================
	   §2  INJECT STYLES (scoped to .rpr-rep-embed)
	   ================================================================ */
	const STYLE_ID = 'rpr-reports-embed-styles';
	if ( ! document.getElementById( STYLE_ID ) ) {
		const style = document.createElement( 'style' );
		style.id = STYLE_ID;
		style.textContent = `
/* ── RPR Reports Embed — Scoped Styles ──────────────────── */
.rpr-rep-embed *,
.rpr-rep-embed *::before,
.rpr-rep-embed *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Floating trigger button */
.rpr-rep-embed .rpr-r-float-btn {
	position: fixed; bottom: 24px; right: 24px; z-index: 9998;
	padding: 13px 22px; border: none; border-radius: 50px; cursor: pointer;
	font-size: 14px; font-weight: 500; letter-spacing: .02em;
	transition: transform .15s, opacity .15s;
	box-shadow: 0 4px 20px rgba(0,0,0,.18);
	background: var(--rpr-r-brand); color: var(--rpr-r-btn-text);
	font-family: var(--rpr-r-font-body);
}
.rpr-rep-embed .rpr-r-float-btn:hover { transform: translateY(-2px); opacity: .9; }
.rpr-rep-embed .rpr-r-float-btn.left  { right: auto; left: 24px; }

/* Modal trigger button (used when display-mode=modal + data-modal-trigger absent) */
.rpr-rep-embed .rpr-r-modal-trigger {
	display: inline-flex; align-items: center; gap: 8px;
	padding: 13px 24px; border: none; border-radius: 8px;
	cursor: pointer; font-size: 15px; font-weight: 500;
	font-family: var(--rpr-r-font-body); letter-spacing: .01em;
	transition: background .15s, transform .1s;
	background: var(--rpr-r-brand); color: var(--rpr-r-btn-text);
}
.rpr-rep-embed .rpr-r-modal-trigger:hover { background: var(--rpr-r-brand-hover); }

/* Modal overlay */
.rpr-rep-embed .rpr-r-overlay {
	display: none; position: fixed; inset: 0; z-index: 99999;
	background: rgba(0,0,0,.55); align-items: center; justify-content: center;
	padding: 1rem; animation: rprRFadeIn .2s ease;
}
.rpr-rep-embed .rpr-r-overlay.open { display: flex; }
.rpr-rep-embed .rpr-r-overlay .rpr-r-card { max-height: 92vh; overflow-y: auto; }

/* Card */
.rpr-rep-embed .rpr-r-card {
	container-type: inline-size;
	width: 100%; max-width: var(--rpr-r-card-max-width, 520px);
	background: var(--rpr-r-card-bg, #ffffff); border: 1px solid var(--rpr-r-card-border, #e8e8e8);
	border-radius: var(--rpr-r-card-radius, 18px); overflow: hidden;
	margin: 0 auto; animation: rprRSlideUp .4s ease both;
	font-family: var(--rpr-r-font-body); line-height: 1.5; color: var(--rpr-r-card-text, #333333);
}

/* Header band */
.rpr-rep-embed .rpr-r-header {
	background: var(--rpr-r-brand); padding: 1.25rem 1.5rem;
	display: flex; align-items: center; gap: .75rem;
}
.rpr-rep-embed .rpr-r-header-logo { height: 36px; width: auto; object-fit: contain; }
.rpr-rep-embed .rpr-r-header-agent { margin-left: auto; text-align: right; }
.rpr-rep-embed .rpr-r-header-agent-name {
	font-family: var(--rpr-r-font-heading); font-size: 14px; font-weight: 600;
	color: var(--rpr-r-btn-text); line-height: 1.2;
}
.rpr-rep-embed .rpr-r-header-brokerage {
	font-size: 11px; color: var(--rpr-r-btn-text); opacity: .75; margin-top: 2px;
}

/* Hero (headline + subheadline) */
.rpr-rep-embed .rpr-r-hero {
	padding: 1.5rem 1.5rem .5rem;
	border-bottom: 1px solid #f0f0f0;
}
.rpr-rep-embed .rpr-r-headline {
	font-family: var(--rpr-r-font-heading); font-size: 22px; font-weight: 600;
	color: #1a1a1a; line-height: 1.25; margin-bottom: .5rem;
}
.rpr-rep-embed .rpr-r-subheadline {
	font-size: 14px; color: #666; line-height: 1.55;
}

/* Fields */
.rpr-rep-embed .rpr-r-body { padding: 1.25rem 1.5rem; }
.rpr-rep-embed .rpr-r-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
.rpr-rep-embed .rpr-r-field { display: flex; flex-direction: column; gap: 4px; }
.rpr-rep-embed .rpr-r-field.full { grid-column: 1 / -1; }
.rpr-rep-embed .rpr-r-label {
	font-size: 12px; font-weight: 500; color: #555; letter-spacing: .02em;
	text-transform: uppercase;
}
.rpr-rep-embed .rpr-r-input,
.rpr-rep-embed .rpr-r-select {
	width: 100%; padding: 10px 12px; font-size: 15px;
	border: 1.5px solid #d8d8d8; border-radius: 8px;
	background: var(--rpr-r-card-bg, #ffffff); color: var(--rpr-r-card-text, #333333);
	font-family: var(--rpr-r-font-body);
	transition: border-color .15s, box-shadow .15s;
	-webkit-appearance: none; appearance: none;
	outline: none;
}
.rpr-rep-embed .rpr-r-select {
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
	background-repeat: no-repeat;
	background-position: right 12px center;
	padding-right: 36px;
	cursor: pointer;
}
.rpr-rep-embed .rpr-r-input:focus,
.rpr-rep-embed .rpr-r-select:focus {
	border-color: var(--rpr-r-brand);
	box-shadow: 0 0 0 3px var(--rpr-r-focus-ring);
}
.rpr-rep-embed .rpr-r-input.is-error,
.rpr-rep-embed .rpr-r-select.is-error { border-color: var(--rpr-r-error); }
.rpr-rep-embed .rpr-r-error-msg {
	font-size: 12px; color: var(--rpr-r-error); min-height: 16px;
}

/* GDPR */
.rpr-rep-embed .rpr-r-gdpr {
	display: flex; align-items: flex-start; gap: 8px;
	margin: .75rem 0; font-size: 13px; color: #666;
}
.rpr-rep-embed .rpr-r-gdpr input[type="checkbox"] {
	width: 16px; height: 16px; margin-top: 1px; flex-shrink: 0;
	accent-color: var(--rpr-r-brand);
}
.rpr-rep-embed .rpr-r-gdpr.is-error label { color: var(--rpr-r-error); }

/* Submit button */
.rpr-rep-embed .rpr-r-submit-wrap { margin-top: 1rem; }
.rpr-rep-embed .rpr-r-submit {
	width: 100%; padding: 13px 20px;
	background: var(--rpr-r-brand); color: var(--rpr-r-btn-text);
	border: none; border-radius: 8px; cursor: pointer;
	font-size: 16px; font-weight: 600; font-family: var(--rpr-r-font-body);
	transition: background .15s, transform .1s;
}
.rpr-rep-embed .rpr-r-submit:hover:not(:disabled) { background: var(--rpr-r-brand-hover); }
.rpr-rep-embed .rpr-r-submit:active:not(:disabled) { transform: scale(.99); }
.rpr-rep-embed .rpr-r-submit:disabled { opacity: .6; cursor: not-allowed; }

/* Sending status */
.rpr-rep-embed .rpr-r-status {
	text-align: center; font-size: 13px; color: #888; margin-top: .5rem; min-height: 20px;
}

/* Disclaimer */
.rpr-rep-embed .rpr-r-disclaimer {
	text-align: center; font-size: 11px; color: #aaa; padding: .75rem 1.5rem 1.25rem;
	border-top: 1px solid #f0f0f0; line-height: 1.5;
}

/* ── Step 2: Report cards ─────────────────────────────── */
.rpr-rep-embed .rpr-r-step2 { padding: 1.5rem; }
.rpr-rep-embed .rpr-r-back-link {
	display: inline-flex; align-items: center; gap: 4px;
	font-size: 13px; color: var(--rpr-r-brand); cursor: pointer;
	background: none; border: none; padding: 0; margin-bottom: 1.25rem;
	font-family: var(--rpr-r-font-body); text-decoration: none;
}
.rpr-rep-embed .rpr-r-back-link:hover { text-decoration: underline; }
.rpr-rep-embed .rpr-r-back-link::before { content: '←'; font-size: 15px; }

.rpr-rep-embed .rpr-r-report-heading {
	font-family: var(--rpr-r-font-heading); font-size: 20px; font-weight: 600;
	color: #1a1a1a; margin-bottom: .375rem;
}
.rpr-rep-embed .rpr-r-report-subheading {
	font-size: 14px; color: #666; margin-bottom: 1.25rem; line-height: 1.5;
}

/* Report card */
.rpr-rep-embed .rpr-r-report-card {
	border: 1.5px solid #e8e8e8; border-radius: 12px;
	padding: 1.25rem 1.25rem 1rem; display: flex;
	align-items: center; gap: 1rem;
	transition: border-color .15s, box-shadow .15s;
}
.rpr-rep-embed .rpr-r-report-card:hover {
	border-color: var(--rpr-r-brand);
	box-shadow: 0 2px 12px rgba(0,0,0,.07);
}
.rpr-rep-embed .rpr-r-report-icon {
	flex-shrink: 0; width: 44px; height: 44px; border-radius: 10px;
	background: var(--rpr-r-brand); display: flex; align-items: center; justify-content: center;
}
.rpr-rep-embed .rpr-r-report-icon svg { width: 22px; height: 22px; }
.rpr-rep-embed .rpr-r-report-info { flex: 1; min-width: 0; }
.rpr-rep-embed .rpr-r-report-label {
	font-size: 15px; font-weight: 600; color: #1a1a1a;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rpr-rep-embed .rpr-r-report-meta { font-size: 12px; color: #888; margin-top: 2px; }
.rpr-rep-embed .rpr-r-report-btn {
	flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px;
	padding: 9px 16px; border-radius: 8px; text-decoration: none;
	font-size: 13px; font-weight: 600; font-family: var(--rpr-r-font-body);
	background: var(--rpr-r-brand); color: var(--rpr-r-btn-text);
	transition: background .15s; white-space: nowrap;
}
.rpr-rep-embed .rpr-r-report-btn:hover { background: var(--rpr-r-brand-hover); }
.rpr-rep-embed .rpr-r-report-btn svg { width: 14px; height: 14px; }

/* Responsive — container query so the card adapts to its parent width, not the viewport */
@container (max-width: 480px) {
	.rpr-rep-embed .rpr-r-fields { grid-template-columns: 1fr; }
	.rpr-rep-embed .rpr-r-field.full { grid-column: 1; }
	.rpr-rep-embed .rpr-r-report-card { flex-wrap: wrap; }
	.rpr-rep-embed .rpr-r-report-btn { width: 100%; justify-content: center; }
}

/* Animations */
@keyframes rprRFadeIn  { from { opacity: 0; } to { opacity: 1; } }
@keyframes rprRSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
`;
		document.head.appendChild( style );
	}

	/* ================================================================
	   §3  CSS CUSTOM PROPERTIES (brand tokens on each card root)
	   ================================================================ */
	function applyTokens( root ) {
		root.style.setProperty( '--rpr-r-brand',       CFG.colorBrand );
		root.style.setProperty( '--rpr-r-brand-hover', brandHover );
		root.style.setProperty( '--rpr-r-btn-text',    btnText );
		root.style.setProperty( '--rpr-r-focus-ring',  focusRing );
		root.style.setProperty( '--rpr-r-error',       '#d0021b' );
		root.style.setProperty( '--rpr-r-card-radius', CFG.cardRadius + 'px' );
		root.style.setProperty( '--rpr-r-card-bg',     CFG.cardBg );
		root.style.setProperty( '--rpr-r-card-border', CFG.cardBg === '#ffffff' ? '#e8e8e8' : 'rgba(255,255,255,0.12)' );
		root.style.setProperty( '--rpr-r-card-text',   CFG.cardText );
		if ( CFG.fontHeading ) root.style.setProperty( '--rpr-r-font-heading', `"${CFG.fontHeading}", serif` );
		if ( CFG.fontBody )    root.style.setProperty( '--rpr-r-font-body',    `"${CFG.fontBody}", sans-serif` );
	}

	/* ================================================================
	   §4  BUILD DOM
	   ================================================================ */

	/** Header band (logo + agent name/brokerage) */
	function buildHeader() {
		const header = document.createElement( 'div' );
		header.className = 'rpr-r-header';

		if ( CFG.logoUrl ) {
			const img = document.createElement( 'img' );
			img.src = CFG.logoUrl;
			img.alt = CFG.brokerage || CFG.agentName || '';
			img.className = 'rpr-r-header-logo';
			header.appendChild( img );
		}

		if ( CFG.agentName || CFG.brokerage ) {
			const agentWrap = document.createElement( 'div' );
			agentWrap.className = 'rpr-r-header-agent';
			if ( CFG.agentName ) {
				const nameEl = document.createElement( 'div' );
				nameEl.className = 'rpr-r-header-agent-name';
				nameEl.textContent = CFG.agentName;
				agentWrap.appendChild( nameEl );
			}
			if ( CFG.brokerage ) {
				const brEl = document.createElement( 'div' );
				brEl.className = 'rpr-r-header-brokerage';
				brEl.textContent = CFG.brokerage;
				agentWrap.appendChild( brEl );
			}
			header.appendChild( agentWrap );
		}

		return header;
	}

	/** Step 1: lead capture form */
	function buildStep1() {
		const step1 = document.createElement( 'div' );
		step1.className = 'rpr-r-step1';

		/* Hero */
		const hero = document.createElement( 'div' );
		hero.className = 'rpr-r-hero';
		hero.innerHTML =
			`<div class="rpr-r-headline">${ escHtml( CFG.headline ) }</div>` +
			`<div class="rpr-r-subheadline">${ escHtml( CFG.subheadline ) }</div>`;
		step1.appendChild( hero );

		/* Fields */
		const body = document.createElement( 'div' );
		body.className = 'rpr-r-body';

		const grid = document.createElement( 'div' );
		grid.className = 'rpr-r-fields';

		/* Standard fields: first name, last name, email, phone */
		const FIELDS = [
			{ id: 'first_name', label: 'First name',  placeholder: 'First name',        type: 'text',  required: true,  half: true,  error: 'Please enter your first name' },
			{ id: 'last_name',  label: 'Last name',   placeholder: 'Last name',         type: 'text',  required: true,  half: true,  error: 'Please enter your last name' },
			{ id: 'email',      label: 'Email',        placeholder: 'you@example.com',   type: 'email', required: true,  half: true,  error: 'Enter a valid email address' },
			{ id: 'phone',      label: 'Phone',        placeholder: '(555) 555-5555',    type: 'tel',   required: false, half: true,  error: 'Enter a valid phone number' },
		];

		FIELDS.forEach( f => {
			const wrap = document.createElement( 'div' );
			wrap.className = 'rpr-r-field' + ( f.half ? '' : ' full' );

			const label = document.createElement( 'label' );
			label.className = 'rpr-r-label';
			label.htmlFor = CFG.formId + '-' + f.id;
			label.textContent = f.label + ( f.required ? ' *' : '' );

			const input = document.createElement( 'input' );
			input.type = f.type;
			input.id = CFG.formId + '-' + f.id;
			input.className = 'rpr-r-input';
			input.placeholder = f.placeholder;
			input.dataset.fieldId = f.id;
			if ( f.required ) input.setAttribute( 'required', '' );

			const err = document.createElement( 'div' );
			err.className = 'rpr-r-error-msg';
			err.dataset.errorFor = f.id;

			wrap.appendChild( label );
			wrap.appendChild( input );
			wrap.appendChild( err );
			grid.appendChild( wrap );
		} );

		/* Area dropdown — full width */
		const areaWrap = document.createElement( 'div' );
		areaWrap.className = 'rpr-r-field full';

		const areaLabel = document.createElement( 'label' );
		areaLabel.className = 'rpr-r-label';
		areaLabel.htmlFor = CFG.formId + '-area';
		areaLabel.textContent = CFG.areaLabel + ' *';

		const areaSelect = document.createElement( 'select' );
		areaSelect.id = CFG.formId + '-area';
		areaSelect.className = 'rpr-r-select';
		areaSelect.dataset.fieldId = 'area';
		areaSelect.setAttribute( 'required', '' );

		const placeholder = document.createElement( 'option' );
		placeholder.value = '';
		placeholder.textContent = CFG.areaPlaceholder;
		placeholder.disabled = true;
		placeholder.selected = true;
		areaSelect.appendChild( placeholder );

		CFG.reports.forEach( ( report, i ) => {
			const opt = document.createElement( 'option' );
			opt.value = String( i );  // index into REPORTS array
			opt.textContent = report.label;
			areaSelect.appendChild( opt );
		} );

		const areaErr = document.createElement( 'div' );
		areaErr.className = 'rpr-r-error-msg';
		areaErr.dataset.errorFor = 'area';

		areaWrap.appendChild( areaLabel );
		areaWrap.appendChild( areaSelect );
		areaWrap.appendChild( areaErr );
		grid.appendChild( areaWrap );

		body.appendChild( grid );

		/* GDPR */
		if ( CFG.gdprEnabled ) {
			const gdpr = document.createElement( 'div' );
			gdpr.className = 'rpr-r-gdpr';
			const cb = document.createElement( 'input' );
			cb.type = 'checkbox';
			cb.id = CFG.formId + '-consent';
			cb.dataset.fieldId = 'consent';
			const lbl = document.createElement( 'label' );
			lbl.htmlFor = CFG.formId + '-consent';
			lbl.textContent = CFG.gdprText;
			/* BUG 5 FIX: clear error state when user checks the box */
			cb.addEventListener( 'change', () => gdpr.classList.remove( 'is-error' ) );
			gdpr.appendChild( cb );
			gdpr.appendChild( lbl );
			body.appendChild( gdpr );
		}

		/* Honeypot */
		const hp = document.createElement( 'input' );
		hp.type = 'text';
		hp.name = 'rpr_rep_hp';
		hp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
		hp.setAttribute( 'tabindex', '-1' );
		hp.setAttribute( 'autocomplete', 'off' );
		body.appendChild( hp );

		/* Submit */
		const submitWrap = document.createElement( 'div' );
		submitWrap.className = 'rpr-r-submit-wrap';
		const btn = document.createElement( 'button' );
		btn.type = 'button';
		btn.className = 'rpr-r-submit';
		btn.textContent = CFG.btnLabel;
		const status = document.createElement( 'div' );
		status.className = 'rpr-r-status';
		submitWrap.appendChild( btn );
		submitWrap.appendChild( status );
		body.appendChild( submitWrap );

		step1.appendChild( body );

		/* Disclaimer */
		if ( CFG.disclaimer ) {
			const disc = document.createElement( 'div' );
			disc.className = 'rpr-r-disclaimer';
			disc.textContent = CFG.disclaimer;
			step1.appendChild( disc );
		}

		return step1;
	}

	/** Step 2: report card(s) */
	function buildStep2() {
		const step2 = document.createElement( 'div' );
		step2.className = 'rpr-r-step2';
		step2.hidden = true;
		return step2;
	}

	/** Populate step 2 with the matched report */
	function populateStep2( step2, selectedIndex ) {
		step2.innerHTML = '';

		/* Back link */
		const back = document.createElement( 'button' );
		back.type = 'button';
		back.className = 'rpr-r-back-link';
		back.textContent = 'Back';
		step2.appendChild( back );

		/* Heading */
		const heading = document.createElement( 'div' );
		heading.className = 'rpr-r-report-heading';
		heading.textContent = CFG.reportsHeading;
		step2.appendChild( heading );

		const report = CFG.reports[ selectedIndex ];

		const subheading = document.createElement( 'div' );
		subheading.className = 'rpr-r-report-subheading';
		subheading.textContent = `Here's the latest market activity for ${ report.label }.`;
		step2.appendChild( subheading );

		/* Report card */
		const card = document.createElement( 'div' );
		card.className = 'rpr-r-report-card';

		/* Icon — SEC-1 FIX: build SVG via DOM API, no innerHTML interpolation */
		const iconWrap = document.createElement( 'div' );
		iconWrap.className = 'rpr-r-report-icon';
		( () => {
			const NS  = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS( NS, 'svg' );
			svg.setAttribute( 'viewBox', '0 0 24 24' );
			svg.setAttribute( 'fill', 'none' );
			svg.setAttribute( 'stroke', btnText );
			svg.setAttribute( 'stroke-width', '1.8' );
			svg.setAttribute( 'stroke-linecap', 'round' );
			svg.setAttribute( 'stroke-linejoin', 'round' );
			const paths = [
				[ 'path',     { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } ],
				[ 'polyline', { points: '14 2 14 8 20 8' } ],
				[ 'line',     { x1: '16', y1: '13', x2: '8',  y2: '13' } ],
				[ 'line',     { x1: '16', y1: '17', x2: '8',  y2: '17' } ],
				[ 'polyline', { points: '10 9 9 9 8 9' } ],
			];
			paths.forEach( ( [ tag, attrs ] ) => {
				const el = document.createElementNS( NS, tag );
				Object.entries( attrs ).forEach( ( [ k, v ] ) => el.setAttribute( k, v ) );
				svg.appendChild( el );
			} );
			iconWrap.appendChild( svg );
		} )();

		/* Info */
		const info = document.createElement( 'div' );
		info.className = 'rpr-r-report-info';

		const labelEl = document.createElement( 'div' );
		labelEl.className = 'rpr-r-report-label';
		labelEl.textContent = report.label;

		const meta = document.createElement( 'div' );
		meta.className = 'rpr-r-report-meta';
		meta.textContent = 'Local market report · RPR';

		info.appendChild( labelEl );
		info.appendChild( meta );

		/* View button */
		const viewBtn = document.createElement( 'a' );
		/* BUG 3 FIX: only allow http(s) URLs — already filtered at parse time,
		   but enforce again here as a second line of defence */
		viewBtn.href = /^https?:\/\//i.test( report.url ) ? report.url : '#';
		viewBtn.target = '_blank';
		viewBtn.rel = 'noopener noreferrer';
		viewBtn.className = 'rpr-r-report-btn';
		/* SEC-2 FIX: build button content via DOM API — no innerHTML with user data risk */
		viewBtn.appendChild( document.createTextNode( 'View Report\u00a0' ) );
		( () => {
			const NS  = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS( NS, 'svg' );
			svg.setAttribute( 'viewBox', '0 0 24 24' );
			svg.setAttribute( 'fill', 'none' );
			svg.setAttribute( 'stroke', 'currentColor' );
			svg.setAttribute( 'stroke-width', '2' );
			svg.setAttribute( 'stroke-linecap', 'round' );
			svg.setAttribute( 'stroke-linejoin', 'round' );
			const shapes = [
				[ 'path',     { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' } ],
				[ 'polyline', { points: '15 3 21 3 21 9' } ],
				[ 'line',     { x1: '10', y1: '14', x2: '21', y2: '3' } ],
			];
			shapes.forEach( ( [ tag, attrs ] ) => {
				const el = document.createElementNS( NS, tag );
				Object.entries( attrs ).forEach( ( [ k, v ] ) => el.setAttribute( k, v ) );
				svg.appendChild( el );
			} );
			viewBtn.appendChild( svg );
		} )();

		card.appendChild( iconWrap );
		card.appendChild( info );
		card.appendChild( viewBtn );
		step2.appendChild( card );

		return back;
	}

	/** Build the full card (both steps) and wire up events */
	function buildCard( wrap ) {
		applyTokens( wrap );

		const card = document.createElement( 'div' );
		card.className = 'rpr-r-card';

		card.appendChild( buildHeader() );

		const step1 = buildStep1();
		const step2 = buildStep2();
		card.appendChild( step1 );
		card.appendChild( step2 );

		wrap.appendChild( card );

		/* ── Wire submit ── */
		const btn    = step1.querySelector( '.rpr-r-submit' );
		const status = step1.querySelector( '.rpr-r-status' );

		btn.addEventListener( 'click', async () => {
			/* SEC-7 FIX: block re-submission after a successful submit */
			if ( wrap._rprSubmitted ) return;

			if ( ! validateStep1( step1 ) ) return;

			/* Honeypot check (client-side bail) */
			const hp = step1.querySelector( 'input[name="rpr_rep_hp"]' );
			if ( hp && hp.value ) return;

			/* BUG 1 FIX: guard against NaN from parseInt on unexpected select value */
			const selectedIndex = parseInt( step1.querySelector( '[data-field-id="area"]' ).value, 10 );
			if ( isNaN( selectedIndex ) || ! CFG.reports[ selectedIndex ] ) return;

			btn.disabled = true;
			status.textContent = 'Sending…';
			status.style.color = '';

			let webhookError = false;

			/* Fire webhook — non-fatal, we still show the report */
			if ( CFG.webhook ) {
				try {
					const payload = collectPayload( step1, selectedIndex );
					const res = await fetch( CFG.webhook, {
						method:  'POST',
						headers: { 'Content-Type': 'application/json' },
						body:    JSON.stringify( payload ),
					} );
					if ( ! res.ok ) {
						console.warn( 'RPR Reports Embed: Webhook returned ' + res.status );
					}
				} catch ( e ) {
					/* BUG 4 FIX: surface network errors to user rather than silently swallowing */
					console.warn( 'RPR Reports Embed: Webhook error', e );
					webhookError = true;
				} finally {
					/* BUG 4 FIX: always re-enable button so user is never stuck */
					btn.disabled = false;
				}
			} else {
				btn.disabled = false;
				status.textContent = '';
			}

			if ( webhookError ) {
				status.textContent = 'Something went wrong — please try again.';
				status.style.color = '#d0021b';
				setTimeout( () => { status.textContent = ''; status.style.color = ''; }, 4000 );
				return;
			}

			status.textContent = '';

			/* Show step 2 */
			wrap._rprSubmitted = true;   /* SEC-7 FIX: lock against re-submission */
			step1.hidden = true;
			step2.hidden = false;
			const backBtn = populateStep2( step2, selectedIndex );

			/* Back link */
			backBtn.addEventListener( 'click', () => {
				step2.hidden = true;
				step1.hidden = false;
				step2.innerHTML = '';
			} );
		} );

		/* Clear errors on input/change */
		step1.querySelectorAll( '.rpr-r-input, .rpr-r-select' ).forEach( el => {
			el.addEventListener( 'input', () => clearError( el ) );
			el.addEventListener( 'change', () => clearError( el ) );
		} );

		/* BUG 7 FIX: expose a reset function so overlay close can restore step 1 state */
		wrap._rprReset = () => {
			wrap._rprSubmitted = false;  /* SEC-7 FIX: allow re-submission after overlay reopen */
			step1.hidden = false;
			step2.hidden = true;
			step2.innerHTML = '';
			btn.disabled = false;
			status.textContent = '';
			status.style.color = '';
			step1.querySelectorAll( '.rpr-r-input' ).forEach( el => { el.value = ''; clearError( el ); } );
			const areaEl = step1.querySelector( '.rpr-r-select' );
			if ( areaEl ) { areaEl.selectedIndex = 0; clearError( areaEl ); }
			if ( CFG.gdprEnabled ) {
				const cb = step1.querySelector( '[data-field-id="consent"]' );
				if ( cb ) {
					cb.checked = false;
					cb.closest( '.rpr-r-gdpr' )?.classList.remove( 'is-error' );
				}
			}
		};
	}

	/* ================================================================
	   §5  VALIDATION
	   ================================================================ */
	function validateStep1( step1 ) {
		let ok = true;

		/* first_name, last_name */
		[ 'first_name', 'last_name' ].forEach( id => {
			const el = step1.querySelector( `[data-field-id="${ id }"]` );
			if ( ! el ) return;
			if ( el.value.trim().length < 2 ) {
				/* BUG 6 FIX: use loop variable id, not el.id string matching */
				setError( el, id === 'last_name' ? 'Please enter your last name' : 'Please enter your first name' );
				ok = false;
			}
		} );

		/* email */
		const emailEl = step1.querySelector( '[data-field-id="email"]' );
		if ( emailEl && ! /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test( emailEl.value.trim() ) ) {
			setError( emailEl, 'Enter a valid email address' );
			ok = false;
		}

		/* area */
		const areaEl = step1.querySelector( '[data-field-id="area"]' );
		if ( areaEl && areaEl.value === '' ) {
			setError( areaEl, 'Please select an area' );
			ok = false;
		}

		/* GDPR */
		if ( CFG.gdprEnabled ) {
			const cb = step1.querySelector( '[data-field-id="consent"]' );
			if ( cb && ! cb.checked ) {
				const gdprWrap = cb.closest( '.rpr-r-gdpr' );
				if ( gdprWrap ) gdprWrap.classList.add( 'is-error' );
				ok = false;
			}
		}

		return ok;
	}

	function setError( el, msg ) {
		el.classList.add( 'is-error' );
		const errEl = el.closest( '.rpr-r-field' )?.querySelector( '.rpr-r-error-msg' );
		if ( errEl ) errEl.textContent = msg;
	}

	function clearError( el ) {
		el.classList.remove( 'is-error' );
		const errEl = el.closest( '.rpr-r-field' )?.querySelector( '.rpr-r-error-msg' );
		if ( errEl ) errEl.textContent = '';
	}

	/* ================================================================
	   §6  COLLECT WEBHOOK PAYLOAD
	   ================================================================ */
	function collectPayload( step1, selectedIndex ) {
		const report = CFG.reports[ selectedIndex ];
		const get    = id => {
			const el = step1.querySelector( `[data-field-id="${ id }"]` );
			return el ? el.value.trim() : '';
		};

		return {
			form_id:       CFG.formId,
			first_name:    get( 'first_name' ),
			last_name:     get( 'last_name' ),
			email:         get( 'email' ),
			phone:         get( 'phone' ),
			selected_area: report.label,
			report_url:    report.url,
			agent_name:    CFG.agentName,
			brokerage:     CFG.brokerage,
			gdpr_consent:  CFG.gdprEnabled ? ( step1.querySelector( '[data-field-id="consent"]' )?.checked ? 1 : 0 ) : null,
			source_url:    window.location.href,
			timestamp:     new Date().toISOString(),
		};
	}

	/* ================================================================
	   §7  UTILITY
	   ================================================================ */
	function escHtml( str ) {
		return String( str )
			.replace( /&/g,  '&amp;' )
			.replace( /</g,  '&lt;' )
			.replace( />/g,  '&gt;' )
			.replace( /"/g,  '&quot;' )
			.replace( /'/g,  '&#x27;' );   /* SEC-3 FIX: escape single quotes for attribute safety */
	}

	/* ================================================================
	   §8  DISPLAY MODES
	   ================================================================ */

	/** INLINE — renders directly at the script tag location */
	function initInline() {
		const wrap = document.createElement( 'div' );
		wrap.className = 'rpr-rep-embed';
		scriptEl.parentNode.insertBefore( wrap, scriptEl );
		buildCard( wrap );
	}

	/** FLOATING — fixed button in corner, opens modal on click */
	function initFloating() {
		const root = document.createElement( 'div' );
		root.className = 'rpr-rep-embed';
		applyTokens( root );
		document.body.appendChild( root );

		/* Floating button */
		const floatBtn = document.createElement( 'button' );
		floatBtn.type = 'button';
		floatBtn.className = 'rpr-r-float-btn' + ( CFG.floatPosition === 'bottom-left' ? ' left' : '' );
		floatBtn.textContent = CFG.floatLabel;
		root.appendChild( floatBtn );

		/* Overlay */
		const overlay = document.createElement( 'div' );
		overlay.className = 'rpr-r-overlay';
		root.appendChild( overlay );

		const wrap = document.createElement( 'div' );
		applyTokens( wrap );
		overlay.appendChild( wrap );
		buildCard( wrap );

		/* BUG 7 FIX: reset form to step 1 whenever the overlay closes */
		const closeOverlay = () => {
			overlay.classList.remove( 'open' );
			if ( typeof wrap._rprReset === 'function' ) wrap._rprReset();
		};

		floatBtn.addEventListener( 'click', () => overlay.classList.add( 'open' ) );
		overlay.addEventListener( 'click', e => { if ( e.target === overlay ) closeOverlay(); } );
		document.addEventListener( 'keydown', e => { if ( e.key === 'Escape' ) closeOverlay(); } );
	}

	/** MODAL — external trigger element opens the overlay */
	function initModal() {
		const root = document.createElement( 'div' );
		root.className = 'rpr-rep-embed';
		applyTokens( root );
		document.body.appendChild( root );

		/* Overlay */
		const overlay = document.createElement( 'div' );
		overlay.className = 'rpr-r-overlay';
		root.appendChild( overlay );

		const wrap = document.createElement( 'div' );
		applyTokens( wrap );
		overlay.appendChild( wrap );
		buildCard( wrap );

		const open = () => overlay.classList.add( 'open' );

		/* BUG 7 FIX: reset form to step 1 whenever the overlay closes */
		const closeOverlay = () => {
			overlay.classList.remove( 'open' );
			if ( typeof wrap._rprReset === 'function' ) wrap._rprReset();
		};

		/* Wire up the external trigger element(s) */
		if ( CFG.modalTrigger ) {
			/* BUG F FIX: invalid CSS selector throws SyntaxError; catch it gracefully */
			try {
				document.querySelectorAll( CFG.modalTrigger ).forEach( el => {
					el.addEventListener( 'click', e => { e.preventDefault(); open(); } );
				} );
			} catch ( e ) {
				console.error( 'RPR Reports Embed: invalid data-modal-trigger selector "' + CFG.modalTrigger + '"', e );
			}
		} else {
			/* Fallback: render a button right where the script tag is */
			const fallbackWrap = document.createElement( 'div' );
			fallbackWrap.className = 'rpr-rep-embed';
			applyTokens( fallbackWrap );
			const fallbackBtn = document.createElement( 'button' );
			fallbackBtn.type = 'button';
			fallbackBtn.className = 'rpr-r-modal-trigger';
			/* BUG 9 FIX: was incorrectly using floatLabel; use btnLabel for modal fallback */
			fallbackBtn.textContent = CFG.btnLabel;
			fallbackWrap.appendChild( fallbackBtn );
			scriptEl.parentNode.insertBefore( fallbackWrap, scriptEl );
			fallbackBtn.addEventListener( 'click', open );
		}

		overlay.addEventListener( 'click', e => { if ( e.target === overlay ) closeOverlay(); } );
		document.addEventListener( 'keydown', e => { if ( e.key === 'Escape' ) closeOverlay(); } );
	}

	/* ================================================================
	   §9  INIT
	   ================================================================ */
	function init() {
		switch ( CFG.displayMode ) {
			case 'floating': initFloating(); break;
			case 'modal':    initModal();    break;
			default:         initInline();   break;
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

} )();
