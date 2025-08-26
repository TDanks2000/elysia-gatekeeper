import type { RateLimitStore } from "../@types";
import type { RateLimitStrategy } from "./fixed";

export const slidingWindowStrategy: RateLimitStrategy = {
	async incr(
		_store: RateLimitStore,
		_key: string,
		_windowMs: number,
	): Promise<{ totalHits: number; resetMs: number }> {
		throw new Error("Sliding window strategy not implemented yet");
	},
};
