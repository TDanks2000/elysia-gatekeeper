## Rate Limiter Implementation TODO

High-level tasks to ship an Elysia rate limiter plugin.

1. ~~Define public API and types~~ ✅
   - Options interface, store interface, middleware signature
   - Header options and defaults

2. ~~Implement memory store~~ ✅
   - Map-based counter with expiration
   - Handle rollover and reset

3. Implement Redis store
   - Atomic INCR + EXPIRE/PEXPIRE; compute reset time
   - Prefix support; graceful shutdown

4. ~~Implement middleware core~~ ✅
   - Resolve key via `keyGenerator`
   - Call store.incr; compute remaining and reset
   - Apply headers (X-RateLimit-* and optional RateLimit-*)
   - On exceed: send 429 with `Retry-After` and message/body

5. ~~Support per-route/per-group scoping~~ ✅
   - Document usage with `app.group`
   - Provide helper sugar if valuable

6. ~~Add configuration helpers~~ ✅
   - Common key generators: IP, header, auth user, tenant
   - Skip hook for healthchecks/allowlist

7. Tests
   - Unit tests for stores and window rollover
   - Integration tests with Elysia for headers and 429
   - Optional: Redis tests via testcontainer or upstash mock

8. ~~Examples and docs~~ ✅
   - Basic usage, per-group limits, Redis/Upstash examples
   - Security notes for proxies and client IP handling

9. CI and quality
   - TypeScript strict mode, BIOME
   - Build step and publish configuration

10. Benchmarks (optional)
   - Compare memory vs Redis; fixed vs sliding


