import type { RateLimitStore, RateLimitStrategy } from "../@types";

// In-memory sliding window storage per key. We retain request timestamps and
// prune those that are outside of the [now - windowMs, now] range on each hit.
const keyToTimestamps = new Map<string, number[]>();

export const slidingWindowStrategy: RateLimitStrategy = {
	async incr(
		_store: RateLimitStore,
		key: string,
		windowMs: number,
	): Promise<{ totalHits: number; resetMs: number }> {
		const now = Date.now();
		const cutoff = now - windowMs;

		const existing = keyToTimestamps.get(key) ?? [];
		// Prune timestamps outside of the sliding window
		let startIndex = 0;
		while (startIndex < existing.length && existing[startIndex] <= cutoff) {
			startIndex += 1;
		}
		const pruned = startIndex > 0 ? existing.slice(startIndex) : existing;

		// Record current hit
		pruned.push(now);

		// Persist back
		keyToTimestamps.set(key, pruned);

		const totalHits = pruned.length;
		const oldest = pruned[0] ?? now;
		const resetMs = oldest + windowMs;

		return { totalHits, resetMs };
	},
};
