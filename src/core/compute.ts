export function computeRemaining(totalHits: number, max: number): number {
	return Math.max(0, max - totalHits);
}

export function computeResetSeconds(
	resetMs: number,
	nowMs: number = Date.now(),
): number {
	return Math.ceil((resetMs - nowMs) / 1000);
}
