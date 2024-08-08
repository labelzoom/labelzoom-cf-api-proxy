// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('LabelZoom Reverse Proxy worker (API routes)', () => {
	it('responds with LabelZoom API version (unit style)', async () => {
		const request = new IncomingRequest('https://www.labelzoom.net/api/v2/heartbeat');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toMatch(/LabelZoom v\d+\.\d+\.\d+/);
	});

	it('responds with LabelZoom API version (integration style)', async () => {
		const response = await SELF.fetch('https://www.labelzoom.net/api/v2/heartbeat');
		expect(await response.text()).toMatch(/LabelZoom v\d+\.\d+\.\d+/);
	});
});
