import { describe, expect, it } from "bun:test";
import { computeRemaining, computeResetSeconds } from "../src/core/compute";

describe("computeRemaining", () => {
	it("returns max - hits when below max", () => {
		expect(computeRemaining(0, 10)).toBe(10);
		expect(computeRemaining(3, 10)).toBe(7);
	});

	it("clamps at 0 when hits exceed max", () => {
		expect(computeRemaining(10, 10)).toBe(0);
		expect(computeRemaining(12, 10)).toBe(0);
	});
});

describe("computeResetSeconds", () => {
	it("ceil rounds up to the next second", () => {
		const now = 1_000_000;
		const in1_2s = now + 1_200; // 1.2s in the future
		expect(computeResetSeconds(in1_2s, now)).toBe(2);
	});

	it("returns 0 or negative mapped to 0 when already reset (by callers)", () => {
		const now = 1_000_000;
		const inPast = now - 1000;
		expect(computeResetSeconds(inPast, now)).toBeLessThanOrEqual(0);
	});
});
