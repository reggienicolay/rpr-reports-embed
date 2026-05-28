import type { Env, QueueMessage } from '../types';
import { getAgentConfig } from '../services/agent-config';
import { signPayload } from '../services/signing';
import { classifyRetry } from './retry';

const DELIVERY_TIMEOUT_MS = 30_000;

export async function handleDelivery(
	batch: MessageBatch<QueueMessage>,
	env: Env
): Promise<void> {
	for (const msg of batch.messages) {
		const { agentToken, payload, id, client_ip } = msg.body;

		const agent = await getAgentConfig(env.DB, agentToken);
		if (!agent || !agent.active) {
			console.error(`Delivery ${id}: agent ${agentToken} not found or inactive, sending to DLQ`);
			await env.DLQ.send({ ...msg.body, error: 'Agent not found or inactive' });
			msg.ack();
			continue;
		}

		if (!agent.webhook_url.startsWith('https://')) {
			console.error(`Delivery ${id}: webhook URL is not HTTPS, sending to DLQ`);
			await env.DLQ.send({ ...msg.body, error: 'Webhook URL is not HTTPS' });
			msg.ack();
			continue;
		}

		const bodyStr = JSON.stringify({
			...payload,
			_proxy: {
				delivery_id: id,
				forwarded_at: new Date().toISOString(),
				client_ip,
				attempt: msg.attempts + 1,
			},
		});

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'X-RPR-Delivery-Id': id,
			'X-RPR-Attempt': String(msg.attempts + 1),
			'User-Agent': 'RPR-Lead-Proxy/1.0',
		};

		if (agent.hmac_secret) {
			headers['X-RPR-Signature'] = await signPayload(agent.hmac_secret, bodyStr);
		}

		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

			const res = await fetch(agent.webhook_url, {
				method: 'POST',
				headers,
				body: bodyStr,
				signal: controller.signal,
			});

			clearTimeout(timeout);

			const decision = classifyRetry(res.status);

			if (decision === 'success') {
				msg.ack();
			} else if (decision === 'retry') {
				console.warn(`Delivery ${id}: webhook returned ${res.status}, will retry`);
				msg.retry();
			} else {
				console.error(`Delivery ${id}: permanent fail (${res.status})`);
				await env.DLQ.send({ ...msg.body, error: `HTTP ${res.status}`, status: res.status });
				msg.ack();
			}
		} catch (err) {
			const isTimeout = err instanceof DOMException && err.name === 'AbortError';
			console.warn(`Delivery ${id}: ${isTimeout ? 'timeout' : 'network error'}, will retry`);
			msg.retry();
		}
	}
}
