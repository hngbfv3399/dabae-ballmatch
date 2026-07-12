import { internalMutation, query, mutation } from "./_generated/server";
import { v } from "convex/values";

const CHARACTER_IDS = new Set([
  "doyun", "jiho", "su", "chanik", "chanhwi", "nayuta", "unhee", "dongjun", "seyeon", "puman",
  "eunsu", "myeongseok", "juju", "juyeon", "sungjae", "mongshil", "seojun", "jiwoo", "juju_singularity_boss",
]);
const MODES = new Set(["all", "2", "3", "4", "5", "6", "team", "boss"]);
const MAX_PARTICIPANTS = 6;

function assertCharacterId(characterId: string): void {
  if (!CHARACTER_IDS.has(characterId)) throw new Error("Unknown character ID");
}

function assertMode(mode: string): void {
  if (!MODES.has(mode)) throw new Error("Unknown game mode");
}

// 1. Get all character stats for a specific mode
export const getStats = query({
  args: { mode: v.string() },
  handler: async (ctx, args) => {
    assertMode(args.mode);
    return await ctx.db
      .query("globalStats")
      .withIndex("by_mode_and_char", (q) => q.eq("mode", args.mode))
      .collect();
  },
});

// 2. Get all counter stats for a specific mode
export const getCounters = query({
  args: { mode: v.string() },
  handler: async (ctx, args) => {
    assertMode(args.mode);
    return await ctx.db
      .query("globalCounters")
      .withIndex("by_mode_victim_and_killer", (q) => q.eq("mode", args.mode))
      .collect();
  },
});

// 3. Record game start for participantIds (increment games by 1)
export const recordGameStart = mutation({
  args: {
    participantIds: v.array(v.string()),
    mode: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.participantIds.length === 0 || args.participantIds.length > MAX_PARTICIPANTS) {
      throw new Error(`participantIds must contain between 1 and ${MAX_PARTICIPANTS} characters`);
    }
    if (new Set(args.participantIds).size !== args.participantIds.length) {
      throw new Error("participantIds must not contain duplicates");
    }
    args.participantIds.forEach(assertCharacterId);
    assertMode(args.mode);
    const modes = ["all", args.mode];
    for (const mode of modes) {
      for (const charId of args.participantIds) {
        const existing = await ctx.db
          .query("globalStats")
          .withIndex("by_mode_and_char", (q) =>
            q.eq("mode", mode).eq("characterId", charId)
          )
          .unique();

        if (existing) {
          await ctx.db.patch(existing._id, {
            games: existing.games + 1,
          });
        } else {
          await ctx.db.insert("globalStats", {
            characterId: charId,
            mode,
            wins: 0,
            games: 1,
            damageDealt: 0,
            damageTaken: 0,
            rankSum: 0,
            mvpCount: 0,
          });
        }
      }
    }
  },
});

// 4. Record game end (increment wins for winner, add damageDealt and damageTaken for all chars)
export const recordGameEnd = mutation({
  args: {
    winnerId: v.string(),
    mode: v.string(),
    allChars: v.array(
      v.object({
        characterId: v.string(),
        damageDealt: v.number(),
        damageTaken: v.number(),
        rank: v.number(),
        isMvp: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.allChars.length === 0 || args.allChars.length > MAX_PARTICIPANTS) {
      throw new Error(`allChars must contain between 1 and ${MAX_PARTICIPANTS} characters`);
    }
    if (new Set(args.allChars.map((char) => char.characterId)).size !== args.allChars.length) {
      throw new Error("allChars must not contain duplicate characters");
    }
    if (args.winnerId !== "draw") assertCharacterId(args.winnerId);
    assertMode(args.mode);
    args.allChars.forEach((char) => assertCharacterId(char.characterId));
    const modes = ["all", args.mode];
    for (const mode of modes) {
      // Increment win for winner (if valid character)
      const hasWinner = args.winnerId && args.winnerId !== "draw";
      if (hasWinner) {
        const winnerStats = await ctx.db
          .query("globalStats")
          .withIndex("by_mode_and_char", (q) =>
            q.eq("mode", mode).eq("characterId", args.winnerId)
          )
          .unique();

        if (winnerStats) {
          await ctx.db.patch(winnerStats._id, {
            wins: winnerStats.wins + 1,
          });
        } else {
          await ctx.db.insert("globalStats", {
            characterId: args.winnerId,
            mode,
            wins: 1,
            games: 1,
            damageDealt: 0,
            damageTaken: 0,
            rankSum: 0,
            mvpCount: 0,
          });
        }
      }

      // Add damages, rank, and MVP count for all participants
      for (const char of args.allChars) {
        const charStats = await ctx.db
          .query("globalStats")
          .withIndex("by_mode_and_char", (q) =>
            q.eq("mode", mode).eq("characterId", char.characterId)
          )
          .unique();

        const addedRankSum = char.rank;
        const addedMvpCount = char.isMvp ? 1 : 0;

        if (charStats) {
          await ctx.db.patch(charStats._id, {
            damageDealt: charStats.damageDealt + char.damageDealt,
            damageTaken: charStats.damageTaken + char.damageTaken,
            rankSum: (charStats.rankSum ?? 0) + addedRankSum,
            mvpCount: (charStats.mvpCount ?? 0) + addedMvpCount,
          });
        } else {
          await ctx.db.insert("globalStats", {
            characterId: char.characterId,
            mode,
            wins: 0,
            games: 1,
            damageDealt: char.damageDealt,
            damageTaken: char.damageTaken,
            rankSum: addedRankSum,
            mvpCount: addedMvpCount,
          });
        }
      }
    }
  },
});

// 5. Record character death (increment counter victim -> killer)
export const recordCharacterDeath = mutation({
  args: {
    victimId: v.string(),
    killerId: v.string(),
    mode: v.string(),
  },
  handler: async (ctx, args) => {
    assertCharacterId(args.victimId);
    assertCharacterId(args.killerId);
    assertMode(args.mode);
    const modes = ["all", args.mode];
    for (const mode of modes) {
      const existing = await ctx.db
        .query("globalCounters")
        .withIndex("by_mode_victim_and_killer", (q) =>
          q.eq("mode", mode).eq("victimId", args.victimId).eq("killerId", args.killerId)
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          count: existing.count + 1,
        });
      } else {
        await ctx.db.insert("globalCounters", {
          victimId: args.victimId,
          killerId: args.killerId,
          mode,
          count: 1,
        });
      }
    }
  },
});

// 6. Reset all global stats and counters
export const resetStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allStats = await ctx.db.query("globalStats").collect();
    for (const doc of allStats) {
      await ctx.db.delete(doc._id);
    }
    const allCounters = await ctx.db.query("globalCounters").collect();
    for (const doc of allCounters) {
      await ctx.db.delete(doc._id);
    }
  },
});

// 7. Get sorted average damage ranking for a specific mode
export const getDamageRanking = query({
  args: { mode: v.string() },
  handler: async (ctx, args) => {
    assertMode(args.mode);
    const stats = await ctx.db
      .query("globalStats")
      .withIndex("by_mode_and_char", (q) => q.eq("mode", args.mode))
      .collect();

    const ranking = stats.map((item) => ({
      characterId: item.characterId,
      games: item.games,
      avgDamageDealt: item.games > 0 ? item.damageDealt / item.games : 0,
    }));

    // Sort by avgDamageDealt descending
    ranking.sort((a, b) => b.avgDamageDealt - a.avgDamageDealt);
    return ranking;
  },
});

// 8. Get all 1v1 tier test results
export const getOneOnOneTiers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("oneOnOneTiers").collect();
  },
});

// 9. Update 1v1 tier test result for a character
export const updateOneOnOneTier = mutation({
  args: {
    characterId: v.string(),
    tier: v.string(),
  },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const existing = await ctx.db
      .query("oneOnOneTiers")
      .withIndex("by_char", (q) => q.eq("characterId", args.characterId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tier: args.tier,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("oneOnOneTiers", {
        characterId: args.characterId,
        tier: args.tier,
        updatedAt: Date.now(),
      });
    }
  },
});
