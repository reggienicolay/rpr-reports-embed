export type RetryDecision = 'success' | 'retry' | 'permanent-fail';

export function classifyRetry(status: number): RetryDecision {
	if (status >= 200 && status < 300) return 'success';
	if (status === 408 || status === 429) return 'retry';
	if (status >= 500) return 'retry';
	return 'permanent-fail';
}
