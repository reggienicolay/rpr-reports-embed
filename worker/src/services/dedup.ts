import type { LeadPayload } from '../types';

const DEDUP_TTL_SECONDS = 300; // 5 minutes

export async function checkDuplicate(
	kv: KVNamespace,
	agentToken: string,
	payload: LeadPayload
): Promise<boolean> {
	const key = await dedupKey(agentToken, payload);
	const existing = await kv.get(key);
	return existing !== null;
}

export async function markSeen(
	kv: KVNamespace,
	agentToken: string,
	payload: LeadPayload
): Promise<void> {
	const key = await dedupKey(agentToken, payload);
	await kv.put(key, new Date().toISOString(), { expirationTtl: DEDUP_TTL_SECONDS });
}

async function dedupKey(agentToken: string, payload: LeadPayload): Promise<string> {
	const raw = `${agentToken}:${payload.email ?? ''}:${payload.phone ?? ''}:${payload.timestamp ?? ''}`;
	const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
	const hex = Array.from(new Uint8Array(hash))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
	return `dedup:${hex}`;
}
