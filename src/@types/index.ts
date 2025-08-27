export interface RateLimiterOptions<Context = unknown> {
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
	statusCode?: number;
	message?: string | ((ctx: Context) => Response);
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

export interface RateLimiterComputation {
	totalHits: number;
	remaining: number;
	resetMs: number;
	limited: boolean;
}
