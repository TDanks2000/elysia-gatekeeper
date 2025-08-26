## Elysia Rate Limiter (Gatekeeper)

A lightweight, configurable rate limiter plugin for Elysia (Bun) designed for simple defaults and flexible stores (in-memory, Redis, or custom).

### Goals

- **Simple defaults**: drop-in, safe-by-default limits and headers
- **Flexible stores**: memory for local/dev; Redis or custom for production
- **Per-scope control**: apply globally, per-group, or per-route via Elysia scoping
- **Standards-aligned**: returns 429 with `Retry-After`; sends common `X-RateLimit-*` headers

### Quick Start

```ts
import { Elysia } from 'elysia'
import { rateLimiter, helpers } from 'elysia-gatekeeper'

const app = new Elysia()
  .use(rateLimiter({
    windowMs: 60_000,   // 1 minute
    max: 100,           // 100 requests per window
    // Use helpers to configure common patterns
    keyGenerator: helpers.authUserKey,
    skip: helpers.skipHealthchecks,
  }))
  .get('/api/health', () => ({ ok: true }))
  .listen(3000)
```

### Examples

#### Allowlist/healthcheck skip

```ts
import { Elysia } from 'elysia'
import { rateLimiter, helpers } from 'elysia-gatekeeper'

const allowlisted = new Set(["10.0.0.1", "10.0.0.2"]) 

new Elysia()
  .use(rateLimiter({
    windowMs: 60_000,
    max: 100,
    keyGenerator: helpers.ipKey,
    skip: (ctx) => helpers.skipHealthchecks(ctx) || allowlisted.has(helpers.ipKey(ctx))
  }))
  .listen(3000)
```

#### Per-tenant limits

```ts
import { Elysia } from 'elysia'
import { rateLimiter, helpers } from 'elysia-gatekeeper'

new Elysia()
  .group('/api', (api) =>
    api.use(rateLimiter({
      windowMs: 60_000,
      max: 200,
      keyGenerator: helpers.tenantKey
    }))
    .get('/data', () => 'ok')
  )
  .listen(3000)
```

### Applying limits per group/route

Use Elysia's scoping to apply different limits:

```ts
const app = new Elysia()
  .use(rateLimiter({ windowMs: 60_000, max: 120 })) // global

app.group('/auth', (auth) =>
  auth
    .use(rateLimiter({ windowMs: 60_000, max: 10 })) // tighter on login
    .post('/login', /* ... */)
)

app.group('/api', (api) =>
  api
    .use(rateLimiter({ windowMs: 1_000, max: 10 })) // bursty endpoints
    .get('/data', /* ... */)
)
```

Apply to a single route by creating a tiny scoped group for just that route:

```ts
const app = new Elysia()
  .use(rateLimiter({ windowMs: 60_000, max: 120 })) // global

// Per-route limiter for a single endpoint
app.group('/reports/export', (r) =>
  r
    .use(rateLimiter({ windowMs: 60_000, max: 2 }))
    .get('', /* handler */)
)

// Alternatively, group a couple of related routes under a prefix
app.group('/billing', (b) =>
  b
    .use(rateLimiter({ windowMs: 10_000, max: 5 }))
    .get('/invoices', /* handler */)
    .post('/pay', /* handler */)
)
```

Notes:

- Inner scopes override or layer on top of outer/global settings.
- You can define multiple independent groups, each with its own `rateLimiter` configuration.

### Configuration

- **windowMs**: number
  - Rolling window length in milliseconds
- **max**: number | (ctx) => number | Promise<number>
  - Max requests allowed per window
- **headers**: boolean | { limit?: boolean; remaining?: boolean; reset?: boolean; retryAfter?: boolean }
  - Control which rate limit headers are sent
- **keyGenerator**: (ctx) => string | Promise<string>
  - Partition key (e.g., user id, API key, tenant id, IP)
  - Built-ins under `helpers`: `authUserKey`, `tenantKey`, `headerKey(name)`, `ipKey`
- **skip**: (ctx) => boolean | Promise<boolean>
  - Skip rate limiting for certain requests (health, internal, allowlist)
  - Built-in: `helpers.skipHealthchecks`
- **store**: 'memory' | { type: 'redis'; client: RedisLike; prefix?: string } | CustomStore
  - Choose backend store; see Store API below
- **statusCode**: number (default: 429)
  - HTTP status when limit exceeded
- **message**: string | (ctx) => Response
  - Body when blocked; function can send custom Response
- **draftSpecHeaders**: boolean (default: true)
  - If true, also include `RateLimit-*` draft standard headers

### Response headers

When enabled, responses include:

- `X-RateLimit-Limit`: configured max
- `X-RateLimit-Remaining`: remaining in window
- `X-RateLimit-Reset`: unix seconds when window resets
- `Retry-After`: seconds until reset (on 429)

Optionally, draft standard headers:

- `RateLimit-Limit` / `RateLimit-Policy`
- `RateLimit-Remaining`
- `RateLimit-Reset`

### Types

```ts
export interface RateLimiterOptions {
  windowMs: number
  max: number | ((ctx: any) => number | Promise<number>)
  headers?: boolean | {
    limit?: boolean
    remaining?: boolean
    reset?: boolean
    retryAfter?: boolean
  }
  keyGenerator?: (ctx: any) => string | Promise<string>
  skip?: (ctx: any) => boolean | Promise<boolean>
  store?: 'memory' | { type: 'redis'; client: RedisLike; prefix?: string } | RateLimitStore
  statusCode?: number
  message?: string | ((ctx: any) => Response)
  draftSpecHeaders?: boolean
}

export interface RateLimitStore {
  incr(key: string, windowMs: number): Promise<{ totalHits: number; resetMs: number }>
  resetKey(key: string): Promise<void>
  shutdown?(): Promise<void>
}

export interface RedisLike {
  incr(key: string): Promise<number> | number
  pttl(key: string): Promise<number> | number
  expire(key: string, seconds: number): Promise<number> | number
  pexpire?(key: string, milliseconds: number): Promise<number> | number
}

export interface RateLimiterResult {
  totalHits: number
  remaining: number
  resetMs: number
  limited: boolean
}

export type RateLimiter = (ctx: any) => Promise<void> | void
```

#### Defaults

- `windowMs`: 60_000
- `max`: 100
- `headers`: true (send `X-RateLimit-*` and `Retry-After` on 429)
- `draftSpecHeaders`: true
- `statusCode`: 429
- `message`: "Too many requests"
- `store`: `memory` in dev/local
- `keyGenerator`: best-effort IP from common headers with fallback to `anonymous`

### Store API

Custom stores must implement:

```ts
interface RateLimitStore {
  incr(key: string, windowMs: number): Promise<{ totalHits: number; resetMs: number }>
  resetKey(key: string): Promise<void>
  shutdown?(): Promise<void>
}
```

Provided stores (planned):

- `memory`: simple Map-based store (dev/single-instance only)
- `redis`: Redis-backed fixed window with atomic increment + TTL

### Memory store

In-memory fixed window store suitable for local development and single-instance deployments. Not safe for multi-instance production.

```ts
import { Elysia } from 'elysia'
import { rateLimiter, MemoryStore } from 'elysia-gatekeeper'

new Elysia()
  .use(rateLimiter({
    windowMs: 60_000,
    max: 100,
    store: 'memory', // or store: new MemoryStore()
  }))
  .listen(3000)
```

Behavior:

- Map keyed by token from `keyGenerator`
- Each key tracks `{ hits, resetAt }`
- On first hit or after window expiry: reset to `{ hits: 1, resetAt: now + windowMs }`
- On subsequent hits before expiry: increment `hits`
- Returns `{ totalHits, resetMs }`

Reset and lifecycle:

- `resetKey(key)` clears an individual key
- `shutdown()` clears the map

#### Redis example (ioredis)

```ts
import { Elysia } from 'elysia'
import Redis from 'ioredis'
import { rateLimiter } from '@gatekeeper/rate-limiter'

const redis = new Redis(process.env.REDIS_URL!)

new Elysia()
  .use(rateLimiter({
    windowMs: 60_000,
    max: 100,
    store: { type: 'redis', client: redis, prefix: 'rl:' },
  }))
  .listen(3000)
```

#### Redis example (Upstash)

```ts
import { Redis } from '@upstash/redis'
import { Elysia } from 'elysia'
import { rateLimiter } from '@gatekeeper/rate-limiter'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })

new Elysia()
  .use(rateLimiter({ windowMs: 60_000, max: 100, store: { type: 'redis', client: redis } }))
  .listen(3000)
```

### Strategies

- **Fixed window (default)**: simple counter per time bucket
- **Sliding window (approx.)**: dual-bucket or sorted-set (Redis) for smoother limits
- **Token bucket**: refill rate and burst capacity (planned option)

### Security and deployment

- Behind proxies/CDNs, configure a trusted client IP header and set `keyGenerator` accordingly
- Prefer Redis for multi-instance deployments
- Consider separate limits for anonymous vs authenticated users
- Use smaller windows for burst control and bigger windows for abuse control

### Testing

- Unit test store behavior and window rollover
- Integration test headers and 429 responses
- Load test with `bombardier`/`wrk` to validate limits and latency

### Roadmap

- Token bucket strategy and leaky bucket variant
- Route-level overrides via helper sugar (thin wrappers around Elysia scoping)
- First-class Upstash Redis support with REST pipeline
- Example app and benchmark suite

### License

MIT


