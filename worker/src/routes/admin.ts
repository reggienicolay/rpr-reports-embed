import type { Env, AgentConfig } from '../types';
import { getAgentConfig, isValidToken } from '../services/agent-config';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateToken(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	let id = '';
	for (const b of bytes) id += CHARS[b % CHARS.length];
	return `agt_${id}`;
}

function adminCorsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	};
}

function jsonOk(data: unknown, status = 200): Response {
	return Response.json(data, { status, headers: adminCorsHeaders() });
}

function jsonErr(error: string, status: number): Response {
	return Response.json({ status: 'error', error }, { status, headers: adminCorsHeaders() });
}

function authenticate(request: Request, env: Env): boolean {
	const header = request.headers.get('Authorization') || '';
	const key = header.replace(/^Bearer\s+/i, '');
	return !!env.ADMIN_API_KEY && key === env.ADMIN_API_KEY;
}

export async function handleAdmin(
	request: Request,
	env: Env,
	path: string,
): Promise<Response> {
	if (request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: adminCorsHeaders() });
	}

	const tokenMatch = path.match(/^\/api\/config\/([a-zA-Z0-9_]+)$/);
	const token = tokenMatch ? tokenMatch[1] : null;

	// POST /api/config is public — agents self-register from the generator.
	// All other operations (read, update, delete) require admin auth.
	if (path === '/api/config' && request.method === 'POST') {
		return createConfig(request, env);
	}

	if (!authenticate(request, env)) {
		return jsonErr('Unauthorized', 401);
	}

	if (token && request.method === 'GET') {
		return getConfig(env, token);
	}
	if (token && request.method === 'PUT') {
		return updateConfig(request, env, token);
	}
	if (token && request.method === 'DELETE') {
		return deleteConfig(env, token);
	}

	return jsonErr('Not found', 404);
}

async function createConfig(request: Request, env: Env): Promise<Response> {
	let body: Record<string, unknown>;
	try {
		body = await request.json() as Record<string, unknown>;
	} catch {
		return jsonErr('Invalid JSON body', 400);
	}

	const webhookUrl = String(body.webhook_url || '').trim();
	if (!webhookUrl) {
		return jsonErr('webhook_url is required', 400);
	}
	if (!webhookUrl.startsWith('https://')) {
		return jsonErr('webhook_url must be HTTPS', 400);
	}

	const token = generateToken();
	const agentName = body.agent_name ? String(body.agent_name).trim() : null;
	const hmacSecret = body.hmac_secret ? String(body.hmac_secret) : null;
	const rateLimit = typeof body.rate_limit_per_min === 'number' ? body.rate_limit_per_min : 10;

	await env.DB
		.prepare(
			`INSERT INTO agent_configs (token, webhook_url, agent_name, hmac_secret, rate_limit_per_min)
			 VALUES (?, ?, ?, ?, ?)`
		)
		.bind(token, webhookUrl, agentName, hmacSecret, rateLimit)
		.run();

	const config = await getAgentConfig(env.DB, token);
	return jsonOk(config, 201);
}

async function getConfig(env: Env, token: string): Promise<Response> {
	if (!isValidToken(token)) {
		return jsonErr('Invalid token format', 400);
	}
	const config = await getAgentConfig(env.DB, token);
	if (!config) {
		return jsonErr('Agent not found', 404);
	}
	return jsonOk(config);
}

async function updateConfig(request: Request, env: Env, token: string): Promise<Response> {
	if (!isValidToken(token)) {
		return jsonErr('Invalid token format', 400);
	}

	const existing = await getAgentConfig(env.DB, token);
	if (!existing) {
		return jsonErr('Agent not found', 404);
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json() as Record<string, unknown>;
	} catch {
		return jsonErr('Invalid JSON body', 400);
	}

	const fields: string[] = [];
	const values: unknown[] = [];

	if (body.webhook_url !== undefined) {
		const url = String(body.webhook_url).trim();
		if (!url.startsWith('https://')) return jsonErr('webhook_url must be HTTPS', 400);
		fields.push('webhook_url = ?');
		values.push(url);
	}
	if (body.agent_name !== undefined) {
		fields.push('agent_name = ?');
		values.push(body.agent_name ? String(body.agent_name).trim() : null);
	}
	if (body.hmac_secret !== undefined) {
		fields.push('hmac_secret = ?');
		values.push(body.hmac_secret ? String(body.hmac_secret) : null);
	}
	if (body.rate_limit_per_min !== undefined) {
		fields.push('rate_limit_per_min = ?');
		values.push(Number(body.rate_limit_per_min));
	}
	if (body.active !== undefined) {
		fields.push('active = ?');
		values.push(body.active ? 1 : 0);
	}

	if (fields.length === 0) {
		return jsonErr('No fields to update', 400);
	}

	fields.push("updated_at = datetime('now')");
	values.push(token);

	await env.DB
		.prepare(`UPDATE agent_configs SET ${fields.join(', ')} WHERE token = ?`)
		.bind(...values)
		.run();

	const updated = await getAgentConfig(env.DB, token);
	return jsonOk(updated);
}

async function deleteConfig(env: Env, token: string): Promise<Response> {
	if (!isValidToken(token)) {
		return jsonErr('Invalid token format', 400);
	}

	const existing = await getAgentConfig(env.DB, token);
	if (!existing) {
		return jsonErr('Agent not found', 404);
	}

	await env.DB
		.prepare("UPDATE agent_configs SET active = 0, updated_at = datetime('now') WHERE token = ?")
		.bind(token)
		.run();

	return jsonOk({ status: 'deactivated', token });
}
