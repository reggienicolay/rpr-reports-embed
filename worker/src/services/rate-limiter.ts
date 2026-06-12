import type { Env } from '../types';

interface RateLimitResult {
	allowed: boolean;
	remaining?: number;
	retryAfter?: number;
}

/**
 * Durable Object: per-IP sliding window rate limiter.
 *
 * Each instance tracks request timestamps for a single agentToken:clientIP pair.
 * Entries older than the window are pruned on every check and via alarm.
 */
export class RateLimiter implements DurableObject {
	private timestamps: number[] = [];
	private state: DurableObjectState;

	constructor(state: DurableObjectState) {
		this.state = state;
		this.state.blockConcurrencyWhile(async () => {
			this.timestamps = (await this.state.storage.get<number[]>('timestamps')) ?? [];
		});
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
		const windowMs = 60_000; // 1 minute

		const now = Date.now();
		this.timestamps = this.timestamps.filter(t => now - t < windowMs);

		if (this.timestamps.length >= limit) {
			const oldestInWindow = this.timestamps[0];
			const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);

			return Response.json({
				allowed: false,
				retryAfter: Math.max(retryAfter, 1),
			} satisfies RateLimitResult);
		}

		this.timestamps.push(now);
		await this.state.storage.put('timestamps', this.timestamps);

		await this.state.storage.setAlarm(now + windowMs + 1000);

		return Response.json({
			allowed: true,
			remaining: limit - this.timestamps.length,
		} satisfies RateLimitResult);
	}

	async alarm(): Promise<void> {
		const now = Date.now();
		this.timestamps = this.timestamps.filter(t => now - t < 60_000);

		if (this.timestamps.length === 0) {
			await this.state.storage.deleteAll();
		} else {
			await this.state.storage.put('timestamps', this.timestamps);
			const nextExpiry = this.timestamps[0] + 60_000 + 1000;
			await this.state.storage.setAlarm(nextExpiry);
		}
	}
}

export async function checkRateLimit(
	rateLimiterNs: DurableObjectNamespace,
	agentToken: string,
	clientIp: string,
	limit: number
): Promise<RateLimitResult> {
	const id = rateLimiterNs.idFromName(`${agentToken}:${clientIp}`);
	const stub = rateLimiterNs.get(id);

	const res = await stub.fetch(`http://rate-limiter/?limit=${limit}`);
	return res.json() as Promise<RateLimitResult>;
}
