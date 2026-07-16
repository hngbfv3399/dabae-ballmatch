import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { V3_CHARACTER_IDS, isV3CharacterId } from "./v3Constants";
import { currentSeasonWindow, ensureSeasonReset } from "./season";

const INITIAL_SCORE = 1000;

type RankingMode = "solo" | "team" | "tournament";

function rankingModeForLegacyMode(mode: string): RankingMode {
  if (mode === "tournament") return "tournament";
  if (mode.startsWith("team")) return "team";
  return "solo";
}

function assertParticipants(participantIds: string[]) {
  if (participantIds.length < 2 || participantIds.length > 16) throw new Error("A ranked match needs 2 to 16 characters");
  if (new Set(participantIds).size !== participantIds.length) throw new Error("Ranked participants must be unique");
  participantIds.forEach((characterId) => {
    if (!isV3CharacterId(characterId)) throw new Error("Unknown ranked character");
  });
}

async function ensureSeason(ctx: MutationCtx, now: number) {
  const window = currentSeasonWindow(now);
  const existing = await ctx.db
    .query("pvpSeasons")
    .withIndex("by_seasonId", (q) => q.eq("seasonId", window.seasonId))
    .unique();
  if (existing) return existing;

  const activeSeasons = await ctx.db.query("pvpSeasons").withIndex("by_status", (q) => q.eq("status", "active")).take(10);
  for (const season of activeSeasons) await ctx.db.patch(season._id, { status: "ended" });
  const id = await ctx.db.insert("pvpSeasons", { ...window, status: "active" });
  return await ctx.db.get(id);
}

function scoreDelta(mode: RankingMode, result: "win" | "loss" | "draw") {
  if (result === "draw") return 5;
  if (mode === "tournament") return result === "win" ? 35 : -15;
  return result === "win" ? 25 : -10;
}

export const getRankingOverview = query({
  args: { mode: v.union(v.literal("solo"), v.literal("team"), v.literal("tournament")) },
  handler: async (ctx, args) => {
    const window = currentSeasonWindow(Date.now());
    const season = await ctx.db.query("pvpSeasons").withIndex("by_seasonId", (q) => q.eq("seasonId", window.seasonId)).unique();
    const rankings = await ctx.db
      .query("pvpCharacterRankings")
      .withIndex("by_seasonId_and_mode_and_score", (q) => q.eq("seasonId", window.seasonId).eq("mode", args.mode))
      .order("desc")
      .take(V3_CHARACTER_IDS.length);
    return {
      season: season ?? { ...window, status: "active" as const },
      rankings: rankings.map((entry) => ({
        characterId: entry.characterId,
        score: entry.score,
        wins: entry.wins,
        games: entry.games,
        draws: entry.draws,
        winRate: entry.games > 0 ? Math.round((entry.wins / entry.games) * 1000) / 10 : 0,
      })),
    };
  },
});

export const recordGameStart = mutation({ args: { participantIds: v.array(v.string()), mode: v.string() }, handler: async () => null });

export const recordGameEnd = mutation({
  args: {
    winnerId: v.string(),
    mode: v.string(),
    allChars: v.array(v.object({
      characterId: v.string(), damageDealt: v.number(), damageTaken: v.number(), rank: v.number(), isMvp: v.boolean(), teamId: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const participantIds = args.allChars.map((entry) => entry.characterId);
    assertParticipants(participantIds);
    const mode = rankingModeForLegacyMode(args.mode);
    const now = Date.now();
    await ensureSeasonReset(ctx, now);
    const season = await ensureSeason(ctx, now);
    const isDraw = args.winnerId === "draw";
    if (!isDraw && !isV3CharacterId(args.winnerId)) throw new Error("Unknown winner");
    const winner = args.allChars.find((entry) => entry.characterId === args.winnerId);
    const winningIds = isDraw
      ? new Set<string>()
      : mode === "team" && winner?.teamId !== undefined
        ? new Set(args.allChars.filter((entry) => entry.teamId === winner.teamId).map((entry) => entry.characterId))
        : new Set([args.winnerId]);

    for (const characterId of participantIds) {
      const result = isDraw ? "draw" : winningIds.has(characterId) ? "win" : "loss";
      const existing = await ctx.db
        .query("pvpCharacterRankings")
        .withIndex("by_seasonId_and_mode_and_characterId", (q) => q.eq("seasonId", season!.seasonId).eq("mode", mode).eq("characterId", characterId))
        .unique();
      const delta = scoreDelta(mode, result);
      if (existing) {
        await ctx.db.patch(existing._id, { score: Math.max(0, existing.score + delta), wins: existing.wins + (result === "win" ? 1 : 0), games: existing.games + 1, draws: existing.draws + (result === "draw" ? 1 : 0), updatedAt: now });
      } else {
        await ctx.db.insert("pvpCharacterRankings", { seasonId: season!.seasonId, mode, characterId, score: Math.max(0, INITIAL_SCORE + delta), wins: result === "win" ? 1 : 0, games: 1, draws: result === "draw" ? 1 : 0, updatedAt: now });
      }

      // PvP 매치 보상 코인 지급 연동
      const progress = await ctx.db
        .query("characterProgress")
        .withIndex("by_characterId", (q) => q.eq("characterId", characterId))
        .unique();
      if (progress) {
        let coinReward = 10; // 패배 시 10코인
        if (result === "win") coinReward = 30; // 승리 시 30코인
        else if (result === "draw") coinReward = 15; // 무승부 시 15코인

        await ctx.db.patch(progress._id, {
          coins: progress.coins + coinReward,
          updatedAt: now,
        });
      }
    }
    return { seasonId: season!.seasonId, mode, recorded: participantIds.length };
  },
});

export const getStats = query({
  args: { mode: v.string() },
  handler: async (ctx, args) => {
    const mode = rankingModeForLegacyMode(args.mode);
    const seasonId = currentSeasonWindow(Date.now()).seasonId;
    const rankings = await ctx.db.query("pvpCharacterRankings").withIndex("by_seasonId_and_mode_and_score", (q) => q.eq("seasonId", seasonId).eq("mode", mode)).order("desc").take(V3_CHARACTER_IDS.length);
    return rankings.map((entry) => ({ characterId: entry.characterId, wins: entry.wins, games: entry.games, damageDealt: entry.score, damageTaken: 0, rankSum: 0, mvpCount: 0, score: entry.score }));
  },
});

export const getCounters = query({ args: { mode: v.string() }, handler: async () => [] });
export const getDamageRanking = query({ args: { mode: v.string() }, handler: async () => [] });
export const recordCharacterDeath = mutation({ args: { victimId: v.string(), killerId: v.string(), mode: v.string() }, handler: async () => null });
export const recordBossResult = mutation({ args: { bossId: v.string(), cleared: v.boolean() }, handler: async () => null });
export const getBossDifficulty = query({ args: {}, handler: async () => [] });

export const resetMatchHistory = mutation({
  args: { confirmation: v.literal("RESET_MATCH_HISTORY") },
  handler: async (ctx) => {
    const seasonId = currentSeasonWindow(Date.now()).seasonId;
    for (const mode of ["solo", "team", "tournament"] as const) {
      const rows = await ctx.db
        .query("pvpCharacterRankings")
        .withIndex("by_seasonId_and_mode_and_score", (q) => q.eq("seasonId", seasonId).eq("mode", mode))
        .take(V3_CHARACTER_IDS.length);
      for (const row of rows) await ctx.db.delete(row._id);
    }
    return { scheduled: false };
  },
});
