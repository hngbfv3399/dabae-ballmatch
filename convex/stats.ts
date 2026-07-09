import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 1. Get all character stats for a specific mode
export const getStats = query({
  args: { mode: v.string() },
  handler: async (ctx, args) => {
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
      })
    ),
  },
  handler: async (ctx, args) => {
    const modes = ["all", args.mode];
    for (const mode of modes) {
      // Increment win for winner
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
        });
      }

      // Add damages for all participants
      for (const char of args.allChars) {
        const charStats = await ctx.db
          .query("globalStats")
          .withIndex("by_mode_and_char", (q) =>
            q.eq("mode", mode).eq("characterId", char.characterId)
          )
          .unique();

        if (charStats) {
          await ctx.db.patch(charStats._id, {
            damageDealt: charStats.damageDealt + char.damageDealt,
            damageTaken: charStats.damageTaken + char.damageTaken,
          });
        } else {
          await ctx.db.insert("globalStats", {
            characterId: char.characterId,
            mode,
            wins: 0,
            games: 1,
            damageDealt: char.damageDealt,
            damageTaken: char.damageTaken,
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
export const resetStats = mutation({
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
