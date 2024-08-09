const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,DELETE,OPTIONS",
	"Access-Control-Max-Age": "86400",
	"Access-Control-Allow-Credentials": "true",
};

const corsValidOrigins = [
	'https://labelzoom.net',
	'https://www.labelzoom.net',
	'https://api.labelzoom.net',
	// 'http://localhost:3000',
];

/**
 * Handle OPTIONS request for CORS
 * @param request 
 * @returns 
 */
export async function handleOptions(request: Request): Promise<Response> {
	const origin = request.headers.get("Origin") ?? '';

	if (!corsValidOrigins.includes(origin)) {
		return new Response(`Origin ${origin} not allowed`, { status: 403 });
	}

	if (
		request.headers.get("Origin") !== null &&
		request.headers.get("Access-Control-Request-Method") !== null &&
		request.headers.get("Access-Control-Request-Headers") !== null
	) {
		// Handle CORS preflight requests.
		return new Response(null, {
			headers: {
				...corsHeaders,
				"Access-Control-Allow-Origin": request.headers.get("Origin") ?? '',
				"Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") ?? '',
			},
		});
	} else {
		// Handle standard OPTIONS request.
		return new Response(null, {
			headers: {
				Allow: "GET,HEAD,POST,PUT,DELETE,OPTIONS",
			},
		});
	}
}

/**
 * Add access control headers to API request
 * @param response 
 * @param origin 
 * @returns 
 */
export function responseWithAllowOrigin(response: Response, origin = '*'): Response {
	// Clone the response so that it's no longer immutable
	const newResponse = new Response(response.body, response);

	// Add cache control headers
	newResponse.headers.set('Access-Control-Allow-Origin', origin);
	newResponse.headers.set('Access-Control-Allow-Credentials', 'true');

	return newResponse;
}
