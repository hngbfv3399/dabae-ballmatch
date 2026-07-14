import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  FIRST_DUNGEON_FIRST_CLEAR_EXPERIENCE,
  FIRST_DUNGEON_ID,
  FIRST_DUNGEON_REPEAT_CLEAR_EXPERIENCE,
  MAX_CHARACTER_LEVEL,
  V3_CHARACTER_IDS,
  experienceRequiredForLevel,
  isV3CharacterId,
  kstDate,
  levelForExperience,
} from "./v3Constants";
import { ensureSeasonReset } from "./season";

const MAX_DUNGEON_CLEAR_TIME_MS = 30 * 60 * 1000;
const MIN_DUNGEON_CLEAR_TIME_MS = 1_000;

function assertCharacterId(characterId: string): void {
  if (!isV3CharacterId(characterId)) throw new Error("Unknown character ID");
}

function assertFirstDungeon(dungeonId: string): void {
  if (dungeonId !== FIRST_DUNGEON_ID) throw new Error("Unknown or locked dungeon");
}

function experienceAtLevelStart(level: number): number {
  let total = 0;
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += experienceRequiredForLevel(currentLevel);
  }
  return total;
}

export function growthSummary(experience: number) {
  const level = levelForExperience(experience);
  const isMaxLevel = level === MAX_CHARACTER_LEVEL;
  const healthMultiplier = 1 + 0.02 * (level - 1);
  const attackMultiplier = 1 + 0.0125 * (level - 1);
  const experienceToNextLevel =
    isMaxLevel ? 0 : experienceRequiredForLevel(level);

  return {
    level,
    experience,
    experienceInCurrentLevel: isMaxLevel ? 0 : experience - experienceAtLevelStart(level),
    experienceToNextLevel,
    isMaxLevel,
    healthMultiplier,
    attackMultiplier,
  };
}

// 새 클라이언트가 로비에 들어올 때 호출하는 안전한 멱등 초기화다.
export const ensureInitialState = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    await ensureSeasonReset(ctx, now);
    let createdCharacters = 0;

    for (const characterId of V3_CHARACTER_IDS) {
      const existing = await ctx.db
        .query("characterProgress")
        .withIndex("by_characterId", (q) => q.eq("characterId", characterId))
        .unique();
      if (!existing) {
        await ctx.db.insert("characterProgress", {
          characterId,
          level: 1,
          experience: 0,
          totalDungeonClears: 0,
          updatedAt: now,
        });
        createdCharacters += 1;
      }
    }

    const firstDungeon = await ctx.db
      .query("dungeonProgress")
      .withIndex("by_dungeonId", (q) => q.eq("dungeonId", FIRST_DUNGEON_ID))
      .unique();
    if (!firstDungeon) {
      await ctx.db.insert("dungeonProgress", {
        dungeonId: FIRST_DUNGEON_ID,
        isUnlocked: true,
        clearCount: 0,
      });
    }

    return { createdCharacters, dungeonCreated: !firstDungeon };
  },
});

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const progressByCharacter = new Map<string, { level: number; experience: number; totalDungeonClears: number; updatedAt: number }>();
    const progress = await ctx.db.query("characterProgress").take(V3_CHARACTER_IDS.length);
    for (const entry of progress) progressByCharacter.set(entry.characterId, entry);

    const characters = V3_CHARACTER_IDS.map((characterId) => {
      const entry = progressByCharacter.get(characterId);
      const experience = entry?.experience ?? 0;
      return {
        characterId,
        ...growthSummary(experience),
        totalDungeonClears: entry?.totalDungeonClears ?? 0,
        updatedAt: entry?.updatedAt ?? null,
      };
    });

    const firstDungeon = await ctx.db
      .query("dungeonProgress")
      .withIndex("by_dungeonId", (q) => q.eq("dungeonId", FIRST_DUNGEON_ID))
      .unique();

    return {
      characters,
      dungeon: firstDungeon ?? {
        dungeonId: FIRST_DUNGEON_ID,
        isUnlocked: true,
        clearCount: 0,
        lastClearedAt: null,
      },
    };
  },
});

export const getClientGachaProgress = query({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("anonymousGachaStates")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();
    const today = kstDate(Date.now());
    const dailyDrawsUsed = state?.dailyResetDate === today ? state.dailyDrawsUsed : 0;
    const completedPlayCount = state?.completedPlayCount ?? 0;
    const bonusDrawsUsed = state?.bonusDrawsUsed ?? 0;

    return {
      dailyDrawsRemaining: Math.max(0, 5 - dailyDrawsUsed),
      // 보너스 뽑기 카운트는 PvP 경기 수가 아닌 던전 클리어 수만 집계한다.
      completedDungeonClears: completedPlayCount,
      bonusDrawsAvailable: Math.max(0, Math.floor(completedPlayCount / 3) - bonusDrawsUsed),
    };
  },
});

export const recordDungeonClear = mutation({
  args: {
    clientId: v.string(),
    characterId: v.string(),
    dungeonId: v.string(),
    clearTimeMs: v.number(),
  },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    assertFirstDungeon(args.dungeonId);
    if (!Number.isFinite(args.clearTimeMs) || args.clearTimeMs < MIN_DUNGEON_CLEAR_TIME_MS || args.clearTimeMs > MAX_DUNGEON_CLEAR_TIME_MS) {
      throw new Error("Invalid dungeon clear time");
    }

    const now = Date.now();
    await ensureSeasonReset(ctx, now);
    const characterProgress = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    if (!characterProgress) throw new Error("Character progress has not been initialized");

    const characterRecord = await ctx.db
      .query("dungeonCharacterRecords")
      .withIndex("by_dungeonId_and_characterId", (q) =>
        q.eq("dungeonId", args.dungeonId).eq("characterId", args.characterId),
      )
      .unique();
    const experienceGranted = characterRecord
      ? FIRST_DUNGEON_REPEAT_CLEAR_EXPERIENCE
      : FIRST_DUNGEON_FIRST_CLEAR_EXPERIENCE;
    const experience = characterProgress.experience + experienceGranted;
    const level = levelForExperience(experience);

    await ctx.db.patch(characterProgress._id, {
      experience,
      level,
      totalDungeonClears: characterProgress.totalDungeonClears + 1,
      updatedAt: now,
    });

    if (characterRecord) {
      await ctx.db.patch(characterRecord._id, {
        clearCount: characterRecord.clearCount + 1,
        fastestClearMs: Math.min(characterRecord.fastestClearMs ?? args.clearTimeMs, args.clearTimeMs),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("dungeonCharacterRecords", {
        dungeonId: args.dungeonId,
        characterId: args.characterId,
        clearCount: 1,
        fastestClearMs: args.clearTimeMs,
        updatedAt: now,
      });
    }

    const dungeon = await ctx.db
      .query("dungeonProgress")
      .withIndex("by_dungeonId", (q) => q.eq("dungeonId", args.dungeonId))
      .unique();
    if (dungeon) {
      await ctx.db.patch(dungeon._id, {
        clearCount: dungeon.clearCount + 1,
        lastClearedAt: now,
      });
    } else {
      await ctx.db.insert("dungeonProgress", {
        dungeonId: args.dungeonId,
        isUnlocked: true,
        clearCount: 1,
        lastClearedAt: now,
      });
    }

    const today = kstDate(now);
    const gachaState = await ctx.db
      .query("anonymousGachaStates")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();
    const nextCompletedPlayCount = (gachaState?.completedPlayCount ?? 0) + 1;
    if (gachaState) {
      await ctx.db.patch(gachaState._id, {
        dailyResetDate: today,
        dailyDrawsUsed: gachaState.dailyResetDate === today ? gachaState.dailyDrawsUsed : 0,
        completedPlayCount: nextCompletedPlayCount,
        bonusDrawsUsed: gachaState.bonusDrawsUsed,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("anonymousGachaStates", {
        clientId: args.clientId,
        dailyResetDate: today,
        dailyDrawsUsed: 0,
        completedPlayCount: nextCompletedPlayCount,
        bonusDrawsUsed: 0,
        updatedAt: now,
      });
    }

    return {
      experienceGranted,
      ...growthSummary(experience),
      totalDungeonClears: characterProgress.totalDungeonClears + 1,
      completedDungeonClears: nextCompletedPlayCount,
      bonusDrawsAvailable: Math.floor(nextCompletedPlayCount / 3) - (gachaState?.bonusDrawsUsed ?? 0),
    };
  },
});
