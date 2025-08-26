import type { RedisLike } from "../@types";

export interface RedisCommands extends RedisLike {}

export function createRedisAdapter(
	client: RedisCommands,
	prefix: string = "rl:",
) {
	return {
		async incr(
			key: string,
			windowMs: number,
		): Promise<{ totalHits: number; resetMs: number }> {
			const namespaced = prefix + key;
			const totalHits = await client.incr(namespaced);
			let pttl = await client.pttl(namespaced);
			if (pttl < 0) {
				// Set expiry if not yet set
				const seconds = Math.ceil(windowMs / 1000);
				await client.expire(namespaced, seconds);
				pttl = windowMs;
			}
			return { totalHits, resetMs: Date.now() + pttl };
		},
		async resetKey(_key: string): Promise<void> {
			// Placeholder: up to implementer using concrete client
		},
		async shutdown(): Promise<void> {
			// Optional for redis clients
		},
	};
	// Note: This adapter matches the RateLimitStore shape, but callers should cast if needed.
}
