import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { rateLimiter } from "../src";

describe("integration: sliding strategy", () => {
	it("blocks on 3rd within window; unblocks after oldest expires", async () => {
		const app = new Elysia()
			.use(
				rateLimiter({
					windowMs: 200,
					max: 2,
					keyGenerator: () => "sliding-key",
					strategy: "sliding",
				}),
			)
			.get("/", () => "ok")
			.listen(0);

		const url = `http://localhost:${app.server?.port}`;

		const r1 = await fetch(url);
		expect(r1.status).toBe(200);
		expect(r1.headers.get("x-ratelimit-limit")).toBe("2");
		expect(r1.headers.get("x-ratelimit-remaining")).toBe("1");

		const r2 = await fetch(url);
		expect(r2.status).toBe(200);
		expect(r2.headers.get("x-ratelimit-remaining")).toBe("0");

		const r3 = await fetch(url);
		expect(r3.status).toBe(429);
		expect(r3.headers.get("retry-after")).toBeTruthy();

		// Wait for the oldest request in the window to expire
		await new Promise((r) => setTimeout(r, 230));

		const r4 = await fetch(url);
		expect(r4.status).toBe(200);
		expect(r4.headers.get("x-ratelimit-remaining")).toBe("1");

		const r5 = await fetch(url);
		expect(r5.status).toBe(200);
		expect(r5.headers.get("x-ratelimit-remaining")).toBe("0");

		const r6 = await fetch(url);
		expect(r6.status).toBe(429);

		app.stop();
	});
});
