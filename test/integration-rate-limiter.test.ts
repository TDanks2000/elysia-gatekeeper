import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { rateLimiter } from "../src";

describe("integration: rateLimiter", () => {
	it("sets headers and allows under limit; blocks over limit", async () => {
		const app = new Elysia()
			.use(
				rateLimiter({
					windowMs: 200,
					max: 2,
					keyGenerator: () => "test-key",
				}),
			)
			.get("/", () => "ok")
			.listen(0);

		const url = `http://localhost:${app.server?.port}`;
		const r1 = await fetch(url);
		expect(r1.status).toBe(200);
		expect(r1.headers.get("x-ratelimit-limit")).toBe("2");
		expect(r1.headers.get("x-ratelimit-remaining")).toBe("1");
		expect(r1.headers.get("x-ratelimit-reset")).toBeTruthy();

		const r2 = await fetch(url);
		expect(r2.status).toBe(200);
		expect(r2.headers.get("x-ratelimit-remaining")).toBe("0");

		const r3 = await fetch(url);
		expect(r3.status).toBe(429);
		expect(r3.headers.get("retry-after")).toBeTruthy();

		app.stop();
	});
});
