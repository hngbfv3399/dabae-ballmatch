import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  FIRST_DUNGEON_FIRST_CLEAR_EXPERIENCE,
  FIRST_DUNGEON_ID,
  FIRST_DUNGEON_REPEAT_CLEAR_EXPERIENCE,
  LABORATORY_DUNGEON_ID,
  LABORATORY_FIRST_CLEAR_EXPERIENCE,
  LABORATORY_REPEAT_CLEAR_EXPERIENCE,
  DUNGEON_IDS,
  getDungeonRewardConfig,
  MAX_CHARACTER_LEVEL,
  V3_CHARACTER_IDS,
  experienceRequiredForLevel,
  isV3CharacterId,
  isDungeonId,
  levelForExperience,
} from "./v3Constants";
import { ensureSeasonReset } from "./season";

const MAX_DUNGEON_CLEAR_TIME_MS = 30 * 60 * 1000;
const MIN_DUNGEON_CLEAR_TIME_MS = 1_000;
const FIRST_STAGE_FIRST_CLEAR_EXPERIENCE = FIRST_DUNGEON_FIRST_CLEAR_EXPERIENCE / 5;
const FIRST_STAGE_REPEAT_CLEAR_EXPERIENCE = FIRST_DUNGEON_REPEAT_CLEAR_EXPERIENCE / 5;
const LABORATORY_STAGE_FIRST_CLEAR_EXPERIENCE = LABORATORY_FIRST_CLEAR_EXPERIENCE / 5;
const LABORATORY_STAGE_REPEAT_CLEAR_EXPERIENCE = LABORATORY_REPEAT_CLEAR_EXPERIENCE / 5;

// 코인 지급 상수 정의
const STAGE_CLEAR_COIN_REWARD = 20;
const DUNGEON_CLEAR_COIN_REWARD = 100;
const SURVIVAL_COIN_PER_CLEARED_WAVE = 5;
const SURVIVAL_EXPERIENCE_PER_CLEARED_WAVE = 10;
const MAX_SURVIVAL_WAVES_PER_RUN = 10_000;
const MAX_SURVIVAL_SECONDS_PER_RUN = 24 * 60 * 60;

function assertCharacterId(characterId: string): void {
  if (!isV3CharacterId(characterId)) throw new Error("Unknown character ID");
}

function assertDungeon(dungeonId: string): void {
  if (!isDungeonId(dungeonId)) throw new Error("Unknown or locked dungeon");
}

function stageExperienceForDungeon(dungeonId: string, isRepeat: boolean): number {
  if (dungeonId === LABORATORY_DUNGEON_ID) {
    return isRepeat ? LABORATORY_STAGE_REPEAT_CLEAR_EXPERIENCE : LABORATORY_STAGE_FIRST_CLEAR_EXPERIENCE;
  }
  return isRepeat ? FIRST_STAGE_REPEAT_CLEAR_EXPERIENCE : FIRST_STAGE_FIRST_CLEAR_EXPERIENCE;
}

async function assertDungeonAccess(ctx: Parameters<typeof ensureSeasonReset>[0], dungeonId: string, characterId: string): Promise<void> {
  if (dungeonId !== LABORATORY_DUNGEON_ID) return;
  const firstDungeonClear = await ctx.db
    .query("dungeonCharacterRecords")
    .withIndex("by_dungeonId_and_characterId", (q) =>
      q.eq("dungeonId", FIRST_DUNGEON_ID).eq("characterId", characterId)
    )
    .unique();
  if (!firstDungeonClear || firstDungeonClear.clearCount < 1) {
    throw new Error("붕괴한 연구소는 초원의 슬라임 소굴을 1회 완주한 캐릭터만 입장할 수 있습니다.");
  }
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
  const statGrowthSteps = Math.max(0, (level - 1) - Math.floor(level / 5));
  const healthMultiplier = 1 + 0.02 * statGrowthSteps;
  const attackMultiplier = 1 + 0.0125 * statGrowthSteps;
  const defenseShieldBonus = statGrowthSteps;
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
    defenseShieldBonus,
  };
}

// 스키마 배포 후 강제 동기화용 시딩 액션
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
          coins: 1000,               // 기본 1000코인
          skillPoints: 0,
          totalDungeonClears: 0,
          updatedAt: now,
        });
        createdCharacters += 1;
      }
    }

    let createdDungeons = 0;
    for (const dungeonId of DUNGEON_IDS) {
      const dungeon = await ctx.db.query("dungeonProgress").withIndex("by_dungeonId", (q) => q.eq("dungeonId", dungeonId)).unique();
      if (!dungeon) {
        await ctx.db.insert("dungeonProgress", { dungeonId, isUnlocked: true, clearCount: 0 });
        createdDungeons += 1;
      }
    }
    return { createdCharacters, createdDungeons };
  },
});

// 로그인 검증을 위한 캐릭터 프로필 조회 API
export const getCharacterProgress = query({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const entry = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    // 로비·도감은 DB의 누적 경험치와 동일한 서버 성장 공식을 함께 받아야 한다.
    // 누적 XP와 현재 레벨 구간 XP를 클라이언트에서 따로 추측하지 않는다.
    return entry ? { ...entry, ...growthSummary(entry.experience) } : null;
  },
});

// 로비 종합 정보 조회 API
export const getOverview = query({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const entry = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    
    if (!entry) return null;

    const firstDungeon = await ctx.db
      .query("dungeonProgress")
      .withIndex("by_dungeonId", (q) => q.eq("dungeonId", FIRST_DUNGEON_ID))
      .unique();

    const isLaboratoryUnlocked = await (async () => {
      const clear = await ctx.db
        .query("dungeonCharacterRecords")
        .withIndex("by_dungeonId_and_characterId", (q) =>
          q.eq("dungeonId", FIRST_DUNGEON_ID).eq("characterId", args.characterId)
        )
        .unique();
      return !!(clear && clear.clearCount > 0);
    })();

    return {
      character: {
        characterId: args.characterId,
        ...growthSummary(entry.experience),
        coins: entry.coins,
        skillPoints: entry.skillPoints,
        totalDungeonClears: entry.totalDungeonClears,
        updatedAt: entry.updatedAt,
      },
      isLaboratoryUnlocked,
      dungeons: DUNGEON_IDS.map((dungeonId) => ({
        dungeonId,
        ...getDungeonRewardConfig(dungeonId),
      })),
      dungeon: firstDungeon ?? {
        dungeonId: FIRST_DUNGEON_ID,
        isUnlocked: true,
        clearCount: 0,
        lastClearedAt: null,
      },
    };
  },
});

// 코인 보상 연동 뮤테이션
export const rewardCoins = mutation({
  args: { characterId: v.string(), amount: v.number() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const progress = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    if (!progress) throw new Error("Character not found");

    const now = Date.now();
    const newCoins = progress.coins + args.amount;
    await ctx.db.patch(progress._id, {
      coins: newCoins,
      updatedAt: now,
    });
    return { success: true, newCoins };
  },
});

// 생존전 보상은 프론트가 전달한 보상 값을 신뢰하지 않는다. 완료 웨이브만 받아
// 서버가 코인·경험치 합계를 계산하고 개인 최고 기록을 같은 트랜잭션에서 갱신한다.
export const recordSurvivalRun = mutation({
  args: {
    characterId: v.string(),
    clearedWaves: v.number(),
    survivalSeconds: v.number(),
    kills: v.number(),
    damageDealt: v.number(),
    damageTaken: v.number(),
  },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const numericValues = [args.clearedWaves, args.survivalSeconds, args.kills, args.damageDealt, args.damageTaken];
    if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error("생존전 결과 수치가 올바르지 않습니다.");
    }
    const clearedWaves = Math.min(MAX_SURVIVAL_WAVES_PER_RUN, Math.floor(args.clearedWaves));
    const survivalSeconds = Math.min(MAX_SURVIVAL_SECONDS_PER_RUN, Math.floor(args.survivalSeconds));
    const kills = Math.floor(args.kills);
    const damageDealt = Math.floor(args.damageDealt);
    const damageTaken = Math.floor(args.damageTaken);
    // 1웨이브 5코인·10XP, 2웨이브 10코인·20XP … 완료 웨이브의 합계.
    const coinsGranted = SURVIVAL_COIN_PER_CLEARED_WAVE * clearedWaves * (clearedWaves + 1) / 2;
    const experienceGranted = SURVIVAL_EXPERIENCE_PER_CLEARED_WAVE * clearedWaves * (clearedWaves + 1) / 2;
    const progress = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    if (!progress) throw new Error("Character not found");

    const now = Date.now();
    const newExperience = progress.experience + experienceGranted;
    await ctx.db.patch(progress._id, {
      coins: progress.coins + coinsGranted,
      experience: newExperience,
      updatedAt: now,
    });
    const record = await ctx.db
      .query("survivalCharacterRecords")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    const nextRecord = {
      characterId: args.characterId,
      bestWave: Math.max(record?.bestWave ?? 0, clearedWaves),
      bestSurvivalSeconds: Math.max(record?.bestSurvivalSeconds ?? 0, survivalSeconds),
      bestKills: Math.max(record?.bestKills ?? 0, kills),
      bestDamageDealt: Math.max(record?.bestDamageDealt ?? 0, damageDealt),
      bestDamageTaken: Math.max(record?.bestDamageTaken ?? 0, damageTaken),
      totalRuns: (record?.totalRuns ?? 0) + 1,
      totalCoinsEarned: (record?.totalCoinsEarned ?? 0) + coinsGranted,
      updatedAt: now,
    };
    if (record) await ctx.db.patch(record._id, nextRecord);
    else await ctx.db.insert("survivalCharacterRecords", nextRecord);
    return {
      coinsGranted,
      experienceGranted,
      newCoins: progress.coins + coinsGranted,
      newExperience,
      growth: growthSummary(newExperience),
      record: nextRecord,
    };
  },
});

// 캐릭터 스킬 투자 현황 조회 API
export const getCharacterSkills = query({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    return await ctx.db
      .query("characterSkills")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .collect();
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  스킬 체인 트리 구조 (Tier 1 → 2 → 3)
//  Tier 1: atk / hp / cd          (각 최대 3레벨)
//  Tier 2: pwr / tank              (각 최대 3레벨, Tier 1 전체 마스터 조건)
//  Tier 3: lucky                   (최대 3레벨, Tier 2 전체 마스터 조건)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SKILL_CHAIN_TIERS: Record<string, { tier: number; requires: string[] }> = {
  atk:   { tier: 1, requires: [] },
  hp:    { tier: 1, requires: [] },
  cd:    { tier: 1, requires: [] },
  pwr:   { tier: 2, requires: ["atk", "hp", "cd"] },
  tank:  { tier: 2, requires: ["atk", "hp", "cd"] },
  lucky: { tier: 3, requires: ["pwr", "tank"] },
};

const SKILL_MAX_LEVEL = 3;

// 스킬 포인트 투자 뮤테이션 (체인 트리 잠금 검증 포함)
export const investSkillPoint = mutation({
  args: { characterId: v.string(), skillId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);

    const chainInfo = SKILL_CHAIN_TIERS[args.skillId];
    if (!chainInfo) throw new Error(`Unknown skill: ${args.skillId}`);

    const progress = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    if (!progress) throw new Error("Character progress not found");
    if (progress.skillPoints < 1) throw new Error("스킬 포인트가 부족합니다.");

    // ── 선행 스킬 조건 확인 ──
    if (chainInfo.requires.length > 0) {
      const allSkills = await ctx.db
        .query("characterSkills")
        .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
        .collect();
      const skillMap = new Map(allSkills.map((s) => [s.skillId, s.investedPoints]));

      for (const requiredId of chainInfo.requires) {
        const invested = skillMap.get(requiredId) ?? 0;
        if (invested < SKILL_MAX_LEVEL) {
          const tierLabel = chainInfo.tier === 2 ? "Tier 1 (ATK·HP·CD)" : "Tier 2 (PWR·TANK)";
          throw new Error(
            `${tierLabel} 스킬을 모두 최대 레벨(${SKILL_MAX_LEVEL})로 마스터해야 이 스킬을 해금할 수 있습니다.`
          );
        }
      }
    }

    // ── 현재 스킬 레벨 확인 및 투자 ──
    const existingSkill = await ctx.db
      .query("characterSkills")
      .withIndex("by_characterId_and_skillId", (q) =>
        q.eq("characterId", args.characterId).eq("skillId", args.skillId)
      )
      .unique();

    const now = Date.now();
    if (existingSkill) {
      if (existingSkill.investedPoints >= SKILL_MAX_LEVEL) {
        throw new Error(`스킬이 이미 최대 레벨(${SKILL_MAX_LEVEL})에 도달했습니다.`);
      }
      await ctx.db.patch(existingSkill._id, {
        investedPoints: existingSkill.investedPoints + 1,
      });
    } else {
      await ctx.db.insert("characterSkills", {
        characterId: args.characterId,
        skillId: args.skillId,
        investedPoints: 1,
      });
    }

    await ctx.db.patch(progress._id, {
      skillPoints: progress.skillPoints - 1,
      updatedAt: now,
    });

    return { success: true, newSkillPoints: progress.skillPoints - 1 };
  },
});

// 스킬 포인트 초기화 (100코인 소모)
export const resetSkills = mutation({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const progress = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    if (!progress) throw new Error("Character progress not found");
    if (progress.coins < 100) throw new Error("코인이 부족합니다. (100 코인 필요)");

    const skills = await ctx.db
      .query("characterSkills")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .collect();

    let recoveredPoints = 0;
    for (const skill of skills) {
      recoveredPoints += skill.investedPoints;
      await ctx.db.delete(skill._id);
    }

    const now = Date.now();
    await ctx.db.patch(progress._id, {
      coins: progress.coins - 100,
      skillPoints: progress.skillPoints + recoveredPoints,
      updatedAt: now,
    });

    return { success: true, newCoins: progress.coins - 100, newSkillPoints: progress.skillPoints + recoveredPoints };
  },
});

// 던전 스테이지 클리어 기록 및 경험치/코인 획득
export const recordDungeonStageClear = mutation({
  args: { characterId: v.string(), dungeonId: v.string(), stageNumber: v.number() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    assertDungeon(args.dungeonId);
    if (!Number.isInteger(args.stageNumber) || args.stageNumber < 1 || args.stageNumber > 5) {
      throw new Error("Invalid dungeon stage");
    }

    const now = Date.now();
    await ensureSeasonReset(ctx, now);
    const characterProgress = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    if (!characterProgress) throw new Error("Character progress has not been initialized");
    await assertDungeonAccess(ctx, args.dungeonId, args.characterId);

    const stageRecord = await ctx.db
      .query("dungeonStageRecords")
      .withIndex("by_dungeonId_and_characterId_and_stageNumber", (q) =>
        q.eq("dungeonId", args.dungeonId).eq("characterId", args.characterId).eq("stageNumber", args.stageNumber),
      )
      .unique();
    const experienceGranted = stageExperienceForDungeon(args.dungeonId, Boolean(stageRecord));
    const experience = characterProgress.experience + experienceGranted;
    
    // 코인 보상 추가
    const coins = characterProgress.coins + STAGE_CLEAR_COIN_REWARD;

    const oldLevel = characterProgress.level;
    const newLevel = levelForExperience(experience);
    const levelDiff = newLevel - oldLevel;
    const skillPoints = characterProgress.skillPoints + levelDiff;

    await ctx.db.patch(characterProgress._id, {
      experience,
      level: newLevel,
      skillPoints,
      coins,
      updatedAt: now,
    });

    if (stageRecord) {
      await ctx.db.patch(stageRecord._id, { clearCount: stageRecord.clearCount + 1, updatedAt: now });
    } else {
      await ctx.db.insert("dungeonStageRecords", {
        dungeonId: args.dungeonId,
        characterId: args.characterId,
        stageNumber: args.stageNumber,
        clearCount: 1,
        updatedAt: now,
      });
    }

    return { experienceGranted, coinReward: STAGE_CLEAR_COIN_REWARD, ...growthSummary(experience), coins };
  },
});

// 던전 완주 기록 및 완주 코인 보상
export const recordDungeonClear = mutation({
  args: {
    characterId: v.string(),
    dungeonId: v.string(),
    clearTimeMs: v.number(),
  },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    assertDungeon(args.dungeonId);
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
    await assertDungeonAccess(ctx, args.dungeonId, args.characterId);

    const characterRecord = await ctx.db
      .query("dungeonCharacterRecords")
      .withIndex("by_dungeonId_and_characterId", (q) =>
        q.eq("dungeonId", args.dungeonId).eq("characterId", args.characterId),
      )
      .unique();

    // 완주 코인 보상 합산
    const coins = characterProgress.coins + DUNGEON_CLEAR_COIN_REWARD;

    await ctx.db.patch(characterProgress._id, {
      totalDungeonClears: characterProgress.totalDungeonClears + 1,
      coins,
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

    return {
      ...growthSummary(characterProgress.experience),
      totalDungeonClears: characterProgress.totalDungeonClears + 1,
      coinReward: DUNGEON_CLEAR_COIN_REWARD,
      coins,
    };
  },
});
