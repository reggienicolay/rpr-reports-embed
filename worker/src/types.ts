export interface Env {
	DB: D1Database;
	IDEMPOTENCY: KVNamespace;
	LEAD_QUEUE: Queue;
	DLQ: Queue;
	RATE_LIMITER: DurableObjectNamespace;
}

export interface AgentConfig {
	token: string;
	webhook_url: string;
	agent_name: string | null;
	hmac_secret: string | null;
	turnstile_sitekey: string | null; // Reserved for Phase 3 — not used in ingest yet
	rate_limit_per_min: number;
	active: number;
	created_at: string;
	updated_at: string;
}

export interface LeadPayload {
	form_id?: string;
	first_name?: string;
	last_name?: string;
	email?: string;
	phone?: string;
	selected_area?: string;
	report_url?: string;
	agent_name?: string;
	brokerage?: string;
	gdpr_consent?: number | null;
	source_url?: string;
	timestamp?: string;
	_meta?: {
		widget_version?: string;
		source_url?: string;
		timestamp?: string;
	};
}

export interface QueueMessage {
	id: string;
	agentToken: string;
	payload: LeadPayload;
	client_ip: string;
	received_at: string;
}

export interface IngestResponse {
	status: 'queued' | 'duplicate' | 'error';
	id?: string;
	error?: string;
}
