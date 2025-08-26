import type { RateLimitStrategy } from "../@types";

export const fixedWindowStrategy: RateLimitStrategy = {
	async incr(store, key, windowMs) {
		return store.incr(key, windowMs);
	},
};
