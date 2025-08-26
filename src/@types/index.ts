import type { Context } from "elysia";

export interface RateLimiterOptions {
	windowMs: number;
	max: number | ((ctx: Context) => number | Promise<number>);
	headers?:
		| boolean
		| {
				limit?: boolean;
				remaining?: boolean;
				reset?: boolean;
				retryAfter?: boolean;
		  };
	keyGenerator?: (ctx: Context) => string | Promise<string>;
	skip?: (ctx: Context) => boolean | Promise<boolean>;
	store?: "memory" | RateLimitStore;
	strategy?: "fixed" | "sliding" | RateLimitStrategy;
	statusCode?: number;
	message?:
		| string
		| Response
		| ((ctx: Context) => string | Response | Promise<string | Response>);
	draftSpecHeaders?: boolean;
}

export interface RateLimitStore {
	incr(
		key: string,
		windowMs: number,
	): Promise<{ totalHits: number; resetMs: number }>;
	resetKey(key: string): Promise<void>;
	shutdown?(): Promise<void>;
}

export interface RateLimitStrategy {
	incr(
		store: RateLimitStore,
		key: string,
		windowMs: number,
	): Promise<{ totalHits: number; resetMs: number }>;
}

export interface RateLimiterComputation {
	totalHits: number;
	remaining: number;
	resetMs: number;
	limited: boolean;
}
