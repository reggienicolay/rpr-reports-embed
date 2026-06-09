export function handleHealth(): Response {
	return Response.json(
		{ status: 'ok', service: 'rpr-lead-proxy', timestamp: new Date().toISOString() },
		{ status: 200 }
	);
}
