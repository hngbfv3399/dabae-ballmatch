import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { FIRST_DUNGEON_ID } from "./v3Constants";

export const SEASON_DURATION_MS = 56 * 24 * 60 * 60 * 1000;
const SEASON_EPOCH_MS = Date.parse("2026-07-13T00:00:00+09:00");
const RESET_BATCH_SIZE = 100;

export function currentSeasonWindow(timestamp: number) {
  const index = Math.max(0, Math.floor((timestamp - SEASON_EPOCH_MS) / SEASON_DURATION_MS));
  const startedAt = SEASON_EPOCH_MS + index * SEASON_DURATION_MS;
  return { seasonId: `v3-s${index + 1}`, startedAt, endsAt: startedAt + SEASON_DURATION_MS };
}

async function clearSeasonDataBatch(ctx: MutationCtx, seasonId: string) {
  const dungeonRecords = await ctx.db.query("dungeonCharacterRecords").take(RESET_BATCH_SIZE);
  const stageRecords = await ctx.db.query("dungeonStageRecords").take(RESET_BATCH_SIZE);
  const gachaStates = await ctx.db.query("anonymousGachaStates").take(RESET_BATCH_SIZE);
  const gachaHistory = await ctx.db.query("gachaDrawHistory").take(RESET_BATCH_SIZE);
  for (const entry of [...dungeonRecords, ...stageRecords, ...gachaStates, ...gachaHistory]) await ctx.db.delete(entry._id);

  const firstDungeon = await ctx.db.query("dungeonProgress").withIndex("by_dungeonId", (q) => q.eq("dungeonId", FIRST_DUNGEON_ID)).unique();
  if (firstDungeon) await ctx.db.replace(firstDungeon._id, { dungeonId: FIRST_DUNGEON_ID, isUnlocked: true, clearCount: 0 });
  else await ctx.db.insert("dungeonProgress", { dungeonId: FIRST_DUNGEON_ID, isUnlocked: true, clearCount: 0 });

  if (dungeonRecords.length === RESET_BATCH_SIZE || stageRecords.length === RESET_BATCH_SIZE || gachaStates.length === RESET_BATCH_SIZE || gachaHistory.length === RESET_BATCH_SIZE) {
    await ctx.scheduler.runAfter(0, internal.season.continueReset, { seasonId });
  }
}

export async function ensureSeasonReset(ctx: MutationCtx, now: number) {
  const window = currentSeasonWindow(now);
  const state = await ctx.db.query("v3SeasonStates").withIndex("by_key", (q) => q.eq("key", "global")).unique();
  if (state?.seasonId === window.seasonId) return window;
  if (state) await ctx.db.patch(state._id, { seasonId: window.seasonId, updatedAt: now });
  else await ctx.db.insert("v3SeasonStates", { key: "global", seasonId: window.seasonId, updatedAt: now });
  await clearSeasonDataBatch(ctx, window.seasonId);
  return window;
}

export const continueReset = internalMutation({
  args: { seasonId: v.string() },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("v3SeasonStates").withIndex("by_key", (q) => q.eq("key", "global")).unique();
    if (!state || state.seasonId !== args.seasonId) return;
    await clearSeasonDataBatch(ctx, args.seasonId);
  },
});
