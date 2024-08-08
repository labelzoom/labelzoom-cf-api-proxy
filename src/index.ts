/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { handleOptions, responseWithAllowOrigin } from "./cors";

const IS_TRUE = /true/i;

/**
 * Log conversion request and response data to Cloudflare R2
 * @param request 
 * @param env 
 * @param ctx 
 * @param url 
 * @returns 
 */
async function handleConversionLog(request: Request<unknown, IncomingRequestCfProperties<unknown>>, env: Env, ctx: ExecutionContext, url: URL) {
	const requestID = new Date().toISOString().substring(0, 19).replaceAll('-', '/').replaceAll('T', '/').replaceAll(':', '') + '--' + crypto.randomUUID();
	const loggingEnabled = IS_TRUE.test(env.LZ_LOG_CONVERSION_DATA);

	// Clone and log request asynchronously
	if (loggingEnabled) ctx.waitUntil(env.LZ_R2_BUCKET.put(requestID + '/in', request.clone().body));
	if (loggingEnabled && url.searchParams.has('params')) ctx.waitUntil(env.LZ_R2_BUCKET.put(requestID + '/params.json', url.searchParams.get('params')));

	// Generate response
	const response = await fetch(requestProxyToBackend(request, url, env, requestID));

	// Clone and log response asynchronously
	if (loggingEnabled) ctx.waitUntil(env.LZ_R2_BUCKET.put(requestID + '/out', response.clone().body));

	// Return response to client
	return response;
}

/**
 * Adds X-LZ-IP header to mimic the original behavior of the Cloudflare IP passthrough, then passes the request to the backend URL
 * @param request 
 * @param backendUrl 
 * @returns 
 */
function requestProxyToBackend(request: Request, url: URL, env: Env, requestID = ''): Request {
	const backendUrl = env.LZ_PROD_API_BASE_URL + url.pathname + url.search;
	const newRequest = new Request(backendUrl ?? request.url, request);
	let ip = request.headers.get("X-Forwarded-For") ?? '';
	if (!ip) {
		ip = request.headers.get("Cf-Connecting-Ip") ?? '';
	}
	newRequest.headers.set('X-LZ-IP', ip);
	newRequest.headers.set('X-LZ-Secret-Key', env.LZ_PROD_API_SECRET_KEY)
	if (requestID) newRequest.headers.set("X-LZ-RequestID", requestID);
	return newRequest;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// API modifiers
		if (url.pathname.startsWith('/api/')) {
			if (request.method === "OPTIONS") {
				// Handle CORS preflight requests
				return handleOptions(request);
			}
			if (url.pathname.startsWith('/api/v2/convert/')) {
				return responseWithAllowOrigin(
					await handleConversionLog(request, env, ctx, url),
					request.headers.get('Origin') ?? '*'
				);
			}

			// Fallthrough behavior, proxy request to Spring Web
			return responseWithAllowOrigin(
				await fetch(
					requestProxyToBackend(request, url, env)
				),
				request.headers.get('Origin') ?? '*'
			);
		} else if (url.pathname === '/api') {
			// Force trailing slash after /api
			return Response.redirect(request.url + '/' + url.search);
		}

		// TODO: Eventually we'll wall off access to the rest of the endpoints once everything has been fully migrated
		// return new Response(`Not found`, { status: 404 });

		// Fallthrough behavior, proxy request to Spring Web
		return responseWithAllowOrigin(
			await fetch(
				requestProxyToBackend(request, url, env)
			),
			request.headers.get('Origin') ?? '*'
		);
	},
} satisfies ExportedHandler<Env>;
