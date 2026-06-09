import type { Env, QueueMessage } from './types';
import { handleHealth } from './routes/health';
import { handleIngest, corsHeaders } from './routes/ingest';
import { handleAdmin } from './routes/admin';
import { handleDelivery } from './delivery/handler';

export { RateLimiter } from './services/rate-limiter';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if (request.method === 'OPTIONS') {
			const allowHeaders = path.startsWith('/api/')
				? 'Content-Type, Authorization'
				: 'Content-Type';
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': allowHeaders,
				},
			});
		}

		if (path === '/health' && request.method === 'GET') {
			return handleHealth();
		}

		if (path.startsWith('/api/config')) {
			return handleAdmin(request, env, path);
		}

		const tokenMatch = path.match(/^\/([a-zA-Z0-9_]+)$/);
		if (tokenMatch && request.method === 'POST') {
			const agentToken = tokenMatch[1];
			const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
			return handleIngest(request, env, agentToken, clientIp);
		}

		return Response.json(
			{ status: 'error', error: 'Not found' },
			{ status: 404, headers: corsHeaders() }
		);
	},

	async queue(batch: MessageBatch, env: Env): Promise<void> {
		await handleDelivery(batch as MessageBatch<QueueMessage>, env);
	},
} satisfies ExportedHandler<Env>;
