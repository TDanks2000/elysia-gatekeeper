import type { Context } from "elysia";

export function ipKey(ctx: Context): string {
	return (
		ctx?.request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
		ctx?.request?.headers?.get?.("cf-connecting-ip") ||
		ctx?.request?.headers?.get?.("x-real-ip") ||
		"anonymous"
	);
}

export function headerKey(headerName: string) {
	return (ctx: Context): string =>
		ctx?.request?.headers?.get?.(headerName) || "anonymous";
}

export function authUserKey(ctx: Context): string {
	return (
		ctx?.request?.headers?.get?.("x-user-id") ||
		ctx?.request?.headers?.get?.("authorization") ||
		"anonymous"
	);
}

export function tenantKey(ctx: Context): string {
	return (
		ctx?.request?.headers?.get?.("x-tenant-id") ||
		ctx?.request?.headers?.get?.("x-org-id") ||
		"anonymous"
	);
}

export function skipHealthchecks(ctx: Context): boolean {
	const url = ctx?.request?.url || "";
	return (
		url.includes("/health") || url.includes("/ready") || url.includes("/live")
	);
}
