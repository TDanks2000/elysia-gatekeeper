import { describe, expect, it } from "bun:test";
import { MemoryStore } from "../src/stores/memory";

describe("MemoryStore", () => {
	it("increments and returns hits with stable reset within window", async () => {
		const store = new MemoryStore();
		const windowMs = 2000;
		const a1 = await store.incr("a", windowMs);
		const a2 = await store.incr("a", windowMs);
		expect(a1.totalHits).toBe(1);
		expect(a2.totalHits).toBe(2);
		expect(a1.resetMs).toBe(a2.resetMs);
	});

	it("rolls over after window and resets hits to 1", async () => {
		const store = new MemoryStore();
		const windowMs = 50;
		await store.incr("k", windowMs);
		await new Promise((r) => setTimeout(r, windowMs + 5));
		const next = await store.incr("k", windowMs);
		expect(next.totalHits).toBe(1);
	});

	it("resetKey clears state", async () => {
		const store = new MemoryStore();
		const windowMs = 1000;
		await store.incr("u", windowMs);
		await store.resetKey("u");
		const after = await store.incr("u", windowMs);
		expect(after.totalHits).toBe(1);
	});
});
