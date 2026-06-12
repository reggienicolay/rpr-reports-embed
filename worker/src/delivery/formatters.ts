import type { LeadPayload } from '../types';

export interface FormattedRequest {
	url: string;
	method: string;
	headers: Record<string, string>;
	body: string;
}

interface ProxyMeta {
	delivery_id: string;
	client_ip: string;
	attempt: number;
}

type Destination = 'slack' | 'discord' | 'ntfy' | 'simplepush' | 'pushover' | 'default';

const PATTERNS: [RegExp, Destination][] = [
	[/^https:\/\/hooks\.slack\.com\//i, 'slack'],
	[/^https:\/\/discord(app)?\.com\/api\/webhooks\//i, 'discord'],
	[/^https:\/\/ntfy\.sh\//i, 'ntfy'],
	[/^https:\/\/(api\.)?simplepush\.io\//i, 'simplepush'],
	[/^https:\/\/simplepu\.sh\//i, 'simplepush'],
	[/^https:\/\/api\.pushover\.net\//i, 'pushover'],
];

function detectDestination(url: string): Destination {
	for (const [pattern, dest] of PATTERNS) {
		if (pattern.test(url)) return dest;
	}
	return 'default';
}

const s = (v: unknown): string => String(v || '').trim();

function leadName(payload: LeadPayload): string {
	return [s(payload.first_name), s(payload.last_name)].filter(Boolean).join(' ');
}

function leadTitle(payload: LeadPayload): string {
	const name = leadName(payload);
	return 'New RPR Lead' + (name ? ': ' + name : '');
}

function leadBodyLines(payload: LeadPayload): string[] {
	const name = leadName(payload);
	const lines: string[] = [];
	if (name) lines.push('Name:  ' + name);
	if (payload.email) lines.push('Email: ' + s(payload.email));
	if (payload.phone) lines.push('Phone: ' + s(payload.phone));
	if (payload.selected_area) lines.push('Area:  ' + s(payload.selected_area));
	return lines;
}

// Latin-1 safe: strip code points > 255 and CRLF (ntfy headers requirement)
function headerSafe(str: string): string {
	return String(str || '')
		.replace(/[\r\n]+/g, ' ')
		.trim()
		.replace(/[^\x00-\xFF]/g, '?');
}

/* ── Slack ─────────────────────────────────────────── */

function formatSlack(url: string, payload: LeadPayload): FormattedRequest {
	const name = leadName(payload);
	const fallback = leadTitle(payload);
	const lines: string[] = [];
	if (name) lines.push('*Name:* ' + name);
	if (payload.email) lines.push('*Email:* ' + s(payload.email));
	if (payload.phone) lines.push('*Phone:* ' + s(payload.phone));
	if (payload.selected_area) {
		const areaText = payload.report_url
			? '<' + s(payload.report_url) + '|' + s(payload.selected_area) + '>'
			: s(payload.selected_area);
		lines.push('*Area:* ' + areaText);
	}
	if (payload.source_url) lines.push('*Source:* ' + s(payload.source_url));

	const body = {
		text: fallback,
		blocks: [
			{ type: 'section', text: { type: 'mrkdwn', text: ':house: *' + fallback + '*' } },
			{ type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } },
			{
				type: 'context',
				elements: [
					{ type: 'mrkdwn', text: 'Sent by RPR Reports Widget \u00b7 ' + (payload.timestamp || new Date().toISOString()) },
				],
			},
		],
	};

	return {
		url,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	};
}

/* ── Discord ───────────────────────────────────────── */

function formatDiscord(url: string, payload: LeadPayload): FormattedRequest {
	const name = leadName(payload);
	const fields: { name: string; value: string; inline: boolean }[] = [];
	if (name) fields.push({ name: 'Name', value: name, inline: true });
	if (payload.email) fields.push({ name: 'Email', value: s(payload.email), inline: true });
	if (payload.phone) fields.push({ name: 'Phone', value: s(payload.phone), inline: true });
	if (payload.selected_area) fields.push({ name: 'Area', value: s(payload.selected_area), inline: false });
	if (payload.report_url) fields.push({ name: 'Report', value: '[View Report](' + s(payload.report_url) + ')', inline: false });
	if (payload.source_url) fields.push({ name: 'Source', value: s(payload.source_url), inline: false });

	const embed = {
		title: leadTitle(payload),
		color: 34534,
		fields,
		timestamp: payload.timestamp || new Date().toISOString(),
		footer: { text: 'RPR Reports Widget' },
	};

	return {
		url,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ embeds: [embed] }),
	};
}

/* ── ntfy ──────────────────────────────────────────── */

function formatNtfy(url: string, payload: LeadPayload): FormattedRequest {
	const title = leadTitle(payload);
	const bodyLines = leadBodyLines(payload);

	const headers: Record<string, string> = {
		'Title': headerSafe(title),
		'Tags': 'house',
		'Content-Type': 'text/plain',
	};

	if (payload.report_url) {
		headers['Click'] = headerSafe(s(payload.report_url));
	}

	return { url, method: 'POST', headers, body: bodyLines.join('\n') };
}

/* ── SimplePush ────────────────────────────────────── */

function formatSimplePush(url: string, payload: LeadPayload): FormattedRequest {
	const keyMatch = url.match(/\/send\/([A-Za-z0-9_-]+)/i) || url.match(/\/([A-Za-z0-9_-]+)\/?$/);
	const spKey = keyMatch ? keyMatch[1] : '';
	const title = leadTitle(payload);
	const bodyLines = leadBodyLines(payload);

	const spPayload: Record<string, string> = {
		key: spKey,
		title,
		msg: bodyLines.join('\n'),
	};
	if (payload.report_url) spPayload.event = 'rpr_lead';

	return {
		url: 'https://api.simplepush.io/send',
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(spPayload),
	};
}

/* ── Pushover ──────────────────────────────────────── */

function formatPushover(url: string, payload: LeadPayload): FormattedRequest {
	const urlObj = new URL(url);
	const token = urlObj.searchParams.get('token') || '';
	const user = urlObj.searchParams.get('user') || '';
	const title = leadTitle(payload);
	const bodyLines = leadBodyLines(payload);

	const poPayload: Record<string, string> = {
		token,
		user,
		title,
		message: bodyLines.join('\n'),
		sound: 'cashregister',
	};

	if (payload.report_url) {
		poPayload.url = s(payload.report_url);
		poPayload.url_title = 'View Report: ' + s(payload.selected_area);
	}

	return {
		url: 'https://api.pushover.net/1/messages.json',
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(poPayload),
	};
}

/* ── Default (raw JSON passthrough) ────────────────── */

function formatDefault(url: string, payload: LeadPayload, meta: ProxyMeta): FormattedRequest {
	return {
		url,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...payload,
			_proxy: {
				delivery_id: meta.delivery_id,
				forwarded_at: new Date().toISOString(),
				client_ip: meta.client_ip,
				attempt: meta.attempt,
			},
		}),
	};
}

/* ── Public API ────────────────────────────────────── */

const FORMATTER_MAP: Record<Destination, (url: string, payload: LeadPayload, meta: ProxyMeta) => FormattedRequest> = {
	slack: (url, p) => formatSlack(url, p),
	discord: (url, p) => formatDiscord(url, p),
	ntfy: (url, p) => formatNtfy(url, p),
	simplepush: (url, p) => formatSimplePush(url, p),
	pushover: (url, p) => formatPushover(url, p),
	default: formatDefault,
};

export function formatForDestination(
	webhookUrl: string,
	payload: LeadPayload,
	meta: ProxyMeta,
): FormattedRequest {
	const dest = detectDestination(webhookUrl);
	return FORMATTER_MAP[dest](webhookUrl, payload, meta);
}
