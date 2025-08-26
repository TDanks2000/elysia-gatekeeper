## Elysia Gatekeeper

Rate limiting plugin for Elysia (Bun) with pluggable strategies and stores. Simple defaults, flexible configuration, and helpful headers out of the box.

### Features
- **Strategies**: fixed window (default) and sliding window; bring your own custom strategy
- **Stores**: in-memory store included; bring your own store for distributed setups
- **Headers**: standard `X-RateLimit-*` and optional `Retry-After` headers
- **Flexible keys**: per-IP, per-user, per-tenant, or any custom key
- **Zero-config**: sensible defaults (`windowMs=60_000`, `max=100`)

## Installation
```bash
bun add elysia-gatekeeper
```

## Quick start
```ts
import { Elysia } from "elysia";
import { rateLimiter } from "elysia-gatekeeper";

new Elysia()
  .use(rateLimiter())
  .get("/", () => "ok")
  .listen(3000);
```

## Options
```ts
import type { Context } from "elysia";

interface RateLimiterOptions {
  windowMs: number; // length of the rate limit window in ms
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
  store?: "memory" | RateLimitStore; // default: memory
  strategy?: "fixed" | "sliding" | RateLimitStrategy; // default: fixed
  statusCode?: number; // default: 429
  message?: string | ((ctx: Context) => Response); // default: "Too many requests"
  draftSpecHeaders?: boolean; // default: true (lowercase header aliases)
}
```

### Store interface
```ts
interface RateLimitStore {
  incr(key: string, windowMs: number): Promise<{ totalHits: number; resetMs: number }>;
  resetKey(key: string): Promise<void>;
  shutdown?(): Promise<void>;
}
```

### Strategy interface
```ts
interface RateLimitStrategy {
  incr(
    store: RateLimitStore,
    key: string,
    windowMs: number,
  ): Promise<{ totalHits: number; resetMs: number }>;
}
```

## Usage examples

### Sliding window strategy
```ts
import { rateLimiter } from "elysia-gatekeeper";

app.use(
  rateLimiter({
    windowMs: 60_000,
    max: 100,
    strategy: "sliding",
  }),
);
```

### Custom key generator (per-user or per-tenant)
```ts
app.use(
  rateLimiter({
    keyGenerator: (ctx) => ctx.request.headers.get("x-user-id") || "anonymous",
  }),
);
```

### Disable/enable specific headers
```ts
app.use(
  rateLimiter({
    headers: { limit: true, remaining: true, reset: true, retryAfter: true },
  }),
);
```

### Custom strategy
```ts
const tokenBucketStrategy: RateLimitStrategy = {
  async incr(store, key, windowMs) {
    // implement token bucket using store
    return store.incr(key, windowMs);
  },
};

app.use(
  rateLimiter({
    strategy: tokenBucketStrategy,
  }),
);
```

## Headers
When enabled (default), responses include:
- `X-RateLimit-Limit`: configured `max`
- `X-RateLimit-Remaining`: remaining requests in the current window
- `X-RateLimit-Reset`: absolute UNIX time in seconds when the window resets

If a request is blocked, `Retry-After` is set using the computed reset time. When `draftSpecHeaders` is `true`, lowercase header aliases are also set.

## Stores and distribution
- The included `MemoryStore` is fast and simple for single-instance apps.
- For multi-instance/distributed deployments, implement a custom `RateLimitStore` using a central backend (e.g., Redis). For sliding windows, a structure like a sorted set is recommended.

## Helpers
This package exports helper key generators under `helpers` (IP-based, header-based, etc.). Example:
```ts
import { helpers, rateLimiter } from "elysia-gatekeeper";

app.use(rateLimiter({ keyGenerator: helpers.ipKey }));
```

## Development
- Build: `bun run build`
- Test: `bun test`

## Notes
- Default behavior is a fixed window strategy with an in-memory store.
- Sliding window strategy in-memory keeps a timestamp queue per key. For high-cardinality or distributed systems, prefer a centralized store.

## Acknowledgements
- Built for the Elysia framework on the [Bun](https://bun.sh) runtime
- Inspired by common rate-limiting primitives across web frameworks

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

## ❤️ Mental Health Reminder

<p align="start">
  <a target="_blank" href="https://tdanks.com/mental-health/quote">
    ❤️ You are great, you are enough, and your presence is valued. If you’re struggling with your mental health, please reach out to someone you love and consult a professional. You are not alone. ❤️
  </a>
</p>
