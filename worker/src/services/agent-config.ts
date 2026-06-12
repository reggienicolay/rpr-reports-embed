import type { AgentConfig } from '../types';

const TOKEN_PATTERN = /^agt_[a-zA-Z0-9]{12,24}$/;

export function isValidToken(token: string): boolean {
	return TOKEN_PATTERN.test(token);
}

export async function getAgentConfig(db: D1Database, token: string): Promise<AgentConfig | null> {
	const result = await db
		.prepare('SELECT * FROM agent_configs WHERE token = ?')
		.bind(token)
		.first<AgentConfig>();

	return result ?? null;
}
