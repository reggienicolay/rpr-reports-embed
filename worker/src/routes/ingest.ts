import type { Env, LeadPayload, IngestResponse, QueueMessage } from '../types';
import { getAgentConfig, isValidToken } from '../services/agent-config';
import { checkDuplicate, markSeen } from '../services/dedup';
import { checkRateLimit } from '../services/rate-limiter';

export async function handleIngest(
	request: Request,
	env: Env,
	agentToken: string,
	clientIp: string
): Promise<Response> {
	if (!isValidToken(agentToken)) {
		return jsonError('Invalid agent token format', 400);
	}

	const agent = await getAgentConfig(env.DB, agentToken);
	if (!agent) {
		return jsonError('Agent not found', 404);
	}
	if (!agent.active) {
		return jsonError('Agent account is inactive', 403);
	}

	const contentType = request.headers.get('content-type') || '';
	if (!contentType.includes('application/json')) {
		return jsonError('Content-Type must be application/json', 415);
	}

	const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
	if (contentLength > 65_536) {
		return jsonError('Request body too large (max 64KB)', 413);
	}

	let payload: LeadPayload;
	try {
		payload = await request.json() as LeadPayload;
	} catch {
		return jsonError('Invalid JSON body', 400);
	}

	if (!payload.email && !payload.phone) {
		return jsonError('At least one of email or phone is required', 400);
	}

	const rateCheck = await checkRateLimit(env.RATE_LIMITER, agentToken, clientIp, agent.rate_limit_per_min);
	if (!rateCheck.allowed) {
		return Response.json(
			{ status: 'error', error: 'Rate limit exceeded' } satisfies IngestResponse,
			{
				status: 429,
				headers: { ...corsHeaders(), 'Retry-After': String(rateCheck.retryAfter ?? 60) },
			}
		);
	}

	const isDuplicate = await checkDuplicate(env.IDEMPOTENCY, agentToken, payload);
	if (isDuplicate) {
		return Response.json(
			{ status: 'duplicate' } satisfies IngestResponse,
			{ status: 200, headers: corsHeaders() }
		);
	}

	const messageId = crypto.randomUUID();

	const message: QueueMessage = {
		id: messageId,
		agentToken,
		payload,
		client_ip: clientIp,
		received_at: new Date().toISOString(),
	};

	await env.LEAD_QUEUE.send(message);
	await markSeen(env.IDEMPOTENCY, agentToken, payload);

	return Response.json(
		{ status: 'queued', id: messageId } satisfies IngestResponse,
		{ status: 202, headers: corsHeaders() }
	);
}

function jsonError(error: string, status: number): Response {
	return Response.json(
		{ status: 'error', error } satisfies IngestResponse,
		{ status, headers: corsHeaders() }
	);
}

export function corsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	};
}
