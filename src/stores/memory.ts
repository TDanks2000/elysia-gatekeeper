import type { RateLimitStore } from "../@types";

interface MemoryEntry {
	hits: number;
	resetAt: number;
}

export class MemoryStore implements RateLimitStore {
	private readonly keyToEntry: Map<string, MemoryEntry>;

	constructor() {
		this.keyToEntry = new Map<string, MemoryEntry>();
	}

	async incr(
		key: string,
		windowMs: number,
	): Promise<{ totalHits: number; resetMs: number }> {
		const now = Date.now();
		const existing = this.keyToEntry.get(key);

		if (!existing || existing.resetAt <= now) {
			const resetAt = now + windowMs;
			this.keyToEntry.set(key, { hits: 1, resetAt });
			return { totalHits: 1, resetMs: resetAt };
		}

		existing.hits += 1;
		this.keyToEntry.set(key, existing);
		return { totalHits: existing.hits, resetMs: existing.resetAt };
	}

	async resetKey(key: string): Promise<void> {
		this.keyToEntry.delete(key);
	}

	async shutdown(): Promise<void> {
		this.keyToEntry.clear();
	}
}
