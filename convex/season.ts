import type { MutationCtx } from "./_generated/server";

export const SEASON_DURATION_MS = 56 * 24 * 60 * 60 * 1000;
const SEASON_EPOCH_MS = Date.parse("2026-07-13T00:00:00+09:00");

export function currentSeasonWindow(timestamp: number) {
  const index = Math.max(0, Math.floor((timestamp - SEASON_EPOCH_MS) / SEASON_DURATION_MS));
  const startedAt = SEASON_EPOCH_MS + index * SEASON_DURATION_MS;
  return { seasonId: `v4-s${index + 1}`, startedAt, endsAt: startedAt + SEASON_DURATION_MS };
}

export async function ensureSeasonReset(_ctx: MutationCtx, now: number) {
  // 시즌 4 개편으로 자동 리셋(Wipe)은 수행하지 않고,
  // 현재 일자에 맞는 시즌 정보 산출만 담당합니다.
  return currentSeasonWindow(now);
}
