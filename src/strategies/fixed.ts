import type { RateLimitStore } from "../@types";

export interface RateLimitStrategy {
	incr(
		store: RateLimitStore,
		key: string,
		windowMs: number,
	): Promise<{ totalHits: number; resetMs: number }>;
}

export const fixedWindowStrategy: RateLimitStrategy = {
	async incr(store, key, windowMs) {
		return store.incr(key, windowMs);
	},
};
