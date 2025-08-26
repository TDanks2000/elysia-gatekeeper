import type { Context, Elysia } from "elysia";
import type { RateLimiterOptions, RateLimitStore } from "./@types";
import { computeRemaining, computeResetSeconds } from "./core/compute";
import { applyHeaders, computeHeaderFlags } from "./core/headers";
import { MemoryStore } from "./stores/memory";

function resolveStore(
	store: RateLimiterOptions["store"] | undefined,
): RateLimitStore {
	if (!store || store === "memory") return new MemoryStore();
	if (typeof store === "object" && "incr" in store)
		return store as RateLimitStore;
	throw new Error(
		"Unsupported store provided. Only memory store is supported at this time.",
	);
}

export function rateLimiter(
	userOptions: RateLimiterOptions = { windowMs: 60_000, max: 100 },
) {
	const {
		windowMs = 60_000,
		max = 100,
		headers = true,
		keyGenerator,
		skip,
		store,
		statusCode = 429,
		message = "Too many requests",
		draftSpecHeaders = true,
	} = userOptions;

	const headerFlags = computeHeaderFlags({ headers, draftSpecHeaders });
	const backend = resolveStore(store);

	return (app: Elysia) =>
		app
			.derive(() => ({
				rateLimiter: { windowMs, max },
			}))
			.onBeforeHandle(async (ctx) => {
				if (skip && (await skip(ctx))) return;

				const resolvedMax = typeof max === "function" ? await max(ctx) : max;
				const key =
					(await (keyGenerator
						? keyGenerator(ctx)
						: defaultKeyGenerator(ctx))) || "anonymous";
				const { totalHits, resetMs } = await backend.incr(key, windowMs);
				const remaining = computeRemaining(totalHits, resolvedMax);
				applyHeaders(ctx.set, headerFlags, {
					limit: resolvedMax,
					remaining,
					resetMs,
				});

				if (totalHits > resolvedMax) {
					ctx.set.status = statusCode;
					ctx.set.headers["Retry-After"] = String(computeResetSeconds(resetMs));
					if (typeof message === "function") return message(ctx);
					return new Response(message, { status: statusCode });
				}
			});
}

async function defaultKeyGenerator(ctx: Context): Promise<string> {
	return (
		ctx?.request?.headers?.get?.("x-user-id") ||
		ctx?.request?.headers?.get?.("cf-connecting-ip") ||
		ctx?.request?.headers?.get?.("x-forwarded-for") ||
		ctx?.request?.headers?.get?.("x-real-ip") ||
		"anonymous"
	);
}
