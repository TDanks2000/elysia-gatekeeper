import type { Context } from "elysia";
import type { RateLimiterOptions } from "../@types";

export type HeaderFlags = {
	limit: boolean;
	remaining: boolean;
	reset: boolean;
	retryAfter: boolean;
	draft: boolean;
};

export function computeHeaderFlags(
	options: Required<Pick<RateLimiterOptions, "headers" | "draftSpecHeaders">>,
): HeaderFlags {
	const enabled =
		options.headers === true || typeof options.headers === "object";
	const isConfig = (
		h: unknown,
	): h is {
		limit?: boolean;
		remaining?: boolean;
		reset?: boolean;
		retryAfter?: boolean;
	} => typeof h === "object" && h !== null;

	const hdr = options.headers;
	return {
		limit: enabled
			? hdr === true
				? true
				: isConfig(hdr)
					? !!hdr.limit
					: false
			: false,
		remaining: enabled
			? hdr === true
				? true
				: isConfig(hdr)
					? !!hdr.remaining
					: false
			: false,
		reset: enabled
			? hdr === true
				? true
				: isConfig(hdr)
					? !!hdr.reset
					: false
			: false,
		retryAfter: enabled
			? hdr === true
				? true
				: isConfig(hdr)
					? !!hdr.retryAfter
					: true
			: true,
		draft: options.draftSpecHeaders !== false,
	};
}

export function applyHeaders(
	set: Context["set"],
	flags: HeaderFlags,
	values: { limit: number; remaining: number; resetMs: number },
): void {
	const resetSeconds = Math.ceil((values.resetMs - Date.now()) / 1000);
	if (flags.limit) set.headers["X-RateLimit-Limit"] = String(values.limit);
	if (flags.remaining)
		set.headers["X-RateLimit-Remaining"] = String(values.remaining);
	if (flags.reset)
		set.headers["X-RateLimit-Reset"] = String(
			Math.floor(values.resetMs / 1000),
		);
	if (flags.draft) {
		set.headers["RateLimit-Limit"] = String(values.limit);
		set.headers["RateLimit-Remaining"] = String(values.remaining);
		set.headers["RateLimit-Reset"] = String(resetSeconds);
	}
}
