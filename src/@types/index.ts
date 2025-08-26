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
	store?:
		| "memory"
		| { type: "redis"; client: RedisLike; prefix?: string }
		| RateLimitStore;
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

export interface RedisLike {
	incr(key: string): Promise<number> | number;
	pttl(key: string): Promise<number> | number;
	expire(key: string, seconds: number): Promise<number> | number;
	pexpire?(key: string, milliseconds: number): Promise<number> | number;
}

export interface RateLimiterComputation {
	totalHits: number;
	remaining: number;
	resetMs: number;
	limited: boolean;
}
