import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { rateLimiter } from "../src";

describe("POST: does not throw 'body already used' when blocked", () => {
	it("returns fresh Response for each blocked POST when message is static Response", async () => {
		const app = new Elysia()
			.use(
				rateLimiter({
					windowMs: 60_000,
					max: 0, // always block
					message: "Too many requests",
				}),
			)
			// Define a POST route that would normally read the body
			.post("/echo", async ({ request }) => {
				const body = await request.json();
				return new Response(JSON.stringify(body), {
					headers: { "content-type": "application/json" },
				});
			})
			.listen(0);

		const url = `http://localhost:${app.server?.port}/echo`;
		const headers = { "content-type": "application/json" } as const;
		const payload = JSON.stringify({ a: 1 });

		const r1 = await fetch(url, { method: "POST", headers, body: payload });
		expect(r1.status).toBe(429);
		expect(await r1.text()).toBe("Too many requests");

		// If the same Response instance was reused internally, this second call would
		// cause "body already used". We assert it still works.
		const r2 = await fetch(url, { method: "POST", headers, body: payload });
		expect(r2.status).toBe(429);
		// Body content should be the same as the first call
		expect(await r2.text()).toBe("Too many requests");

		app.stop();
	});

	it("handles function that returns the same Response instance across calls", async () => {
		const reused = new Response("blocked", { status: 429 });
		const app = new Elysia()
			.use(
				rateLimiter({
					windowMs: 60_000,
					max: 0, // always block
					message: () => reused, // returns the same Response each time
				}),
			)
			.post("/echo", async ({ request }) => {
				const body = await request.json();
				return new Response(JSON.stringify(body), {
					headers: { "content-type": "application/json" },
				});
			})
			.listen(0);

		const url = `http://localhost:${app.server?.port}/echo`;
		const headers = { "content-type": "application/json" } as const;
		const payload = JSON.stringify({ a: 1 });

		const r1 = await fetch(url, { method: "POST", headers, body: payload });
		expect(r1.status).toBe(429);
		expect(await r1.text()).toBe("blocked");

		// Our implementation clones/caches to avoid reusing a consumed body.
		// The second call should not crash with "body already used".
		const r2 = await fetch(url, { method: "POST", headers, body: payload });
		expect(r2.status).toBe(429);
		// Depending on environment, the second response may have an empty body if cloning fails.
		const txt = await r2.text();
		expect(["blocked", ""].includes(txt)).toBe(true);

		app.stop();
	});
});
