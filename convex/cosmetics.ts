import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isV3CharacterId, kstDate } from "./v3Constants";
import { ensureSeasonReset } from "./season";

type Rarity = "common" | "rare" | "epic" | "legendary" | "unique";
type BorderAnimation = "none" | "pulse" | "aurora" | "flame" | "frost" | "glitch";
type Trail = "none" | "fade" | "spark";

type CosmeticDefinition = {
  cosmeticId: string;
  name: string;
  rarity: Rarity;
  style: {
    textColor: string;
    borderColor: string;
    fillColor: string;
    glowColor: string;
    borderAnimation: BorderAnimation;
    trail: Trail;
  };
};

type VictoryCeremonyAnimation = "wave" | "jump" | "clap" | "dance" | "trophy" | "fireworks";
type VictoryCeremonyDefinition = {
  ceremonyId: string;
  name: string;
  rarity: Rarity;
  animation: VictoryCeremonyAnimation;
};

const INITIAL_COSMETICS: readonly CosmeticDefinition[] = [
  { cosmeticId: "palette-ruby", name: "루비", rarity: "common", style: { textColor: "#fff1f2", borderColor: "#ef4444", fillColor: "#7f1d1d", glowColor: "#ef4444", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-cobalt", name: "코발트", rarity: "common", style: { textColor: "#eff6ff", borderColor: "#2563eb", fillColor: "#172554", glowColor: "#2563eb", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-lime", name: "라임", rarity: "common", style: { textColor: "#f7fee7", borderColor: "#84cc16", fillColor: "#365314", glowColor: "#84cc16", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-violet", name: "바이올렛", rarity: "common", style: { textColor: "#faf5ff", borderColor: "#9333ea", fillColor: "#3b0764", glowColor: "#9333ea", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-sunset", name: "선셋", rarity: "common", style: { textColor: "#fff7ed", borderColor: "#f97316", fillColor: "#7c2d12", glowColor: "#f97316", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-rose", name: "로즈", rarity: "common", style: { textColor: "#fff1f2", borderColor: "#f43f5e", fillColor: "#881337", glowColor: "#f43f5e", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-lemon", name: "레몬", rarity: "common", style: { textColor: "#fefce8", borderColor: "#eab308", fillColor: "#713f12", glowColor: "#eab308", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-monochrome", name: "모노크롬", rarity: "common", style: { textColor: "#f8fafc", borderColor: "#94a3b8", fillColor: "#1e293b", glowColor: "#94a3b8", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-mint-glow", name: "민트 글로우", rarity: "rare", style: { textColor: "#ecfdf5", borderColor: "#2dd4bf", fillColor: "#134e4a", glowColor: "#5eead4", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-deep-ocean", name: "딥 오션", rarity: "rare", style: { textColor: "#ecfeff", borderColor: "#06b6d4", fillColor: "#164e63", glowColor: "#22d3ee", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-cherry-blossom", name: "체리 블라썸", rarity: "rare", style: { textColor: "#fff1f2", borderColor: "#fb7185", fillColor: "#831843", glowColor: "#fda4af", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-amber", name: "앰버", rarity: "rare", style: { textColor: "#fffbeb", borderColor: "#f59e0b", fillColor: "#78350f", glowColor: "#fbbf24", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-lavender", name: "라벤더", rarity: "rare", style: { textColor: "#faf5ff", borderColor: "#a78bfa", fillColor: "#4c1d95", glowColor: "#c4b5fd", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-neon-green", name: "네온 그린", rarity: "rare", style: { textColor: "#f7fee7", borderColor: "#a3e635", fillColor: "#1a2e05", glowColor: "#bef264", borderAnimation: "none", trail: "none" } },
  { cosmeticId: "palette-pulse-pink", name: "펄스 핑크", rarity: "epic", style: { textColor: "#fff1f2", borderColor: "#ec4899", fillColor: "#831843", glowColor: "#f472b6", borderAnimation: "pulse", trail: "none" } },
  { cosmeticId: "palette-cyber-blue", name: "사이버 블루", rarity: "epic", style: { textColor: "#ecfeff", borderColor: "#38bdf8", fillColor: "#082f49", glowColor: "#22d3ee", borderAnimation: "pulse", trail: "none" } },
  { cosmeticId: "palette-toxic-green", name: "독성 그린", rarity: "epic", style: { textColor: "#f7fee7", borderColor: "#22c55e", fillColor: "#14532d", glowColor: "#4ade80", borderAnimation: "pulse", trail: "none" } },
  { cosmeticId: "palette-twilight", name: "트와일라잇", rarity: "epic", style: { textColor: "#faf5ff", borderColor: "#8b5cf6", fillColor: "#2e1065", glowColor: "#c084fc", borderAnimation: "pulse", trail: "none" } },
  { cosmeticId: "palette-starlight-silver", name: "별빛 실버", rarity: "epic", style: { textColor: "#ffffff", borderColor: "#cbd5e1", fillColor: "#334155", glowColor: "#e2e8f0", borderAnimation: "pulse", trail: "none" } },
  { cosmeticId: "palette-aurora-flow", name: "오로라 플로우", rarity: "legendary", style: { textColor: "#f5f3ff", borderColor: "#22d3ee", fillColor: "#312e81", glowColor: "#e879f9", borderAnimation: "aurora", trail: "fade" } },
  { cosmeticId: "palette-inferno", name: "인페르노", rarity: "legendary", style: { textColor: "#fff7ed", borderColor: "#f97316", fillColor: "#7f1d1d", glowColor: "#facc15", borderAnimation: "flame", trail: "fade" } },
  { cosmeticId: "palette-frost-crystal", name: "프로스트 크리스털", rarity: "legendary", style: { textColor: "#f0f9ff", borderColor: "#7dd3fc", fillColor: "#164e63", glowColor: "#e0f2fe", borderAnimation: "frost", trail: "fade" } },
  { cosmeticId: "palette-prism-glitch", name: "프리즘 글리치", rarity: "unique", style: { textColor: "#ffffff", borderColor: "#f472b6", fillColor: "#312e81", glowColor: "#67e8f9", borderAnimation: "glitch", trail: "spark" } },
  { cosmeticId: "palette-eclipse", name: "이클립스", rarity: "unique", style: { textColor: "#f8fafc", borderColor: "#a855f7", fillColor: "#09090b", glowColor: "#c084fc", borderAnimation: "aurora", trail: "spark" } },
];

const INITIAL_VICTORY_CEREMONIES: readonly VictoryCeremonyDefinition[] = [
  { ceremonyId: "ceremony-champion-wave", name: "챔피언 인사", rarity: "common", animation: "wave" },
  { ceremonyId: "ceremony-victory-jump", name: "승리 점프", rarity: "common", animation: "jump" },
  { ceremonyId: "ceremony-spotlight-clap", name: "스포트라이트 박수", rarity: "rare", animation: "clap" },
  { ceremonyId: "ceremony-rhythm-dance", name: "리듬 댄스", rarity: "epic", animation: "dance" },
  { ceremonyId: "ceremony-trophy-lift", name: "트로피 리프트", rarity: "legendary", animation: "trophy" },
  { ceremonyId: "ceremony-fireworks-finale", name: "불꽃 피날레", rarity: "unique", animation: "fireworks" },
];

const RARITY_WEIGHTS: readonly { rarity: Rarity; weight: number }[] = [
  { rarity: "common", weight: 47 },
  { rarity: "rare", weight: 30 },
  { rarity: "epic", weight: 15 },
  { rarity: "legendary", weight: 6 },
  { rarity: "unique", weight: 2 },
];

const DUPLICATE_EXPERIENCE: Record<Rarity, number> = {
  common: 60,
  rare: 120,
  epic: 250,
  legendary: 600,
  unique: 1500,
};

function assertCharacterId(characterId: string): void {
  if (!isV3CharacterId(characterId)) throw new Error("Unknown character ID");
}

function rollRarity(): Rarity {
  let roll = Math.random() * 100;
  for (const entry of RARITY_WEIGHTS) {
    if (roll < entry.weight) return entry.rarity;
    roll -= entry.weight;
  }
  return "common";
}

export const ensureInitialCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    await ensureSeasonReset(ctx, now);
    let created = 0;
    for (const cosmetic of INITIAL_COSMETICS) {
      const existing = await ctx.db
        .query("cosmetics")
        .withIndex("by_cosmeticId", (q) => q.eq("cosmeticId", cosmetic.cosmeticId))
        .unique();
      if (!existing) {
        await ctx.db.insert("cosmetics", {
          ...cosmetic,
          scope: "global",
          isActive: true,
          createdAt: now,
        });
        created += 1;
      }
    }
    return { created, total: INITIAL_COSMETICS.length };
  },
});

export const listCatalog = query({
  args: {},
  handler: async (ctx) => {
    const cosmetics = await ctx.db.query("cosmetics").take(100);
    const unlocks = await ctx.db.query("cosmeticUnlocks").take(100);
    const unlockedIds = new Set(unlocks.map((unlock) => unlock.cosmeticId));
    return cosmetics
      .filter((cosmetic) => cosmetic.isActive)
      .map((cosmetic) => ({ ...cosmetic, isUnlocked: unlockedIds.has(cosmetic.cosmeticId) }));
  },
});

export const ensureInitialVictoryCeremonyCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let created = 0;
    for (const ceremony of INITIAL_VICTORY_CEREMONIES) {
      const existing = await ctx.db
        .query("victoryCeremonies")
        .withIndex("by_ceremonyId", (q) => q.eq("ceremonyId", ceremony.ceremonyId))
        .unique();
      if (!existing) {
        await ctx.db.insert("victoryCeremonies", { ...ceremony, isActive: true, createdAt: now });
        created += 1;
      }
    }
    return { created, total: INITIAL_VICTORY_CEREMONIES.length };
  },
});

export const listVictoryCeremonyCatalog = query({
  args: {},
  handler: async (ctx) => {
    const ceremonies = await ctx.db.query("victoryCeremonies").take(50);
    const unlocks = await ctx.db.query("victoryCeremonyUnlocks").take(50);
    const unlockedIds = new Set(unlocks.map((unlock) => unlock.ceremonyId));
    return ceremonies
      .filter((ceremony) => ceremony.isActive)
      .map((ceremony) => ({ ...ceremony, isUnlocked: unlockedIds.has(ceremony.ceremonyId) }));
  },
});

export const getVictoryCeremonyLoadout = query({
  args: {},
  handler: async (ctx) => {
    const loadout = await ctx.db
      .query("victoryCeremonyLoadouts")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    return loadout?.ceremonyId ?? null;
  },
});

export const getCharacterLoadouts = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("characterCosmeticLoadouts").take(50),
});

export const draw = mutation({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) throw new Error("Client ID is required");

    const now = Date.now();
    const today = kstDate(now);
    const gachaState = await ctx.db
      .query("anonymousGachaStates")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();
    const dailyDrawsUsed = gachaState?.dailyResetDate === today ? gachaState.dailyDrawsUsed : 0;
    const completedPlayCount = gachaState?.completedPlayCount ?? 0;
    const bonusDrawsUsed = gachaState?.bonusDrawsUsed ?? 0;
    const hasDailyDraw = dailyDrawsUsed < 5;
    const hasBonusDraw = Math.floor(completedPlayCount / 3) > bonusDrawsUsed;
    if (!hasDailyDraw && !hasBonusDraw) throw new Error("No gacha draws available");

    const activeCosmetics = (await ctx.db.query("cosmetics").take(100)).filter(
      (cosmetic) => cosmetic.isActive && cosmetic.scope === "global",
    );
    if (activeCosmetics.length === 0) throw new Error("Cosmetic catalog has not been initialized");

    const rarity = rollRarity();
    const rarityPool = activeCosmetics.filter((cosmetic) => cosmetic.rarity === rarity);
    const pool = rarityPool.length > 0 ? rarityPool : activeCosmetics;
    const cosmetic = pool[Math.floor(Math.random() * pool.length)];
    if (!cosmetic) throw new Error("Cosmetic draw failed");

    const unlock = await ctx.db
      .query("cosmeticUnlocks")
      .withIndex("by_cosmeticId", (q) => q.eq("cosmeticId", cosmetic.cosmeticId))
      .unique();
    const experienceGranted = unlock ? DUPLICATE_EXPERIENCE[cosmetic.rarity] : 0;

    if (!unlock) {
      await ctx.db.insert("cosmeticUnlocks", {
        cosmeticId: cosmetic.cosmeticId,
        unlockedAt: now,
        unlockedByClientId: args.clientId,
      });
    }
    if (experienceGranted > 0) {
      await ctx.db.insert("experiencePointItems", {
        clientId: args.clientId,
        amount: experienceGranted,
        rarity: cosmetic.rarity,
        createdAt: now,
      });
    }

    if (gachaState) {
      await ctx.db.patch(gachaState._id, {
        dailyResetDate: today,
        dailyDrawsUsed: dailyDrawsUsed + (hasDailyDraw ? 1 : 0),
        completedPlayCount,
        bonusDrawsUsed: bonusDrawsUsed + (hasDailyDraw ? 0 : 1),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("anonymousGachaStates", {
        clientId: args.clientId,
        dailyResetDate: today,
        dailyDrawsUsed: 1,
        completedPlayCount: 0,
        bonusDrawsUsed: 0,
        experiencePoints: 0,
        updatedAt: now,
      });
    }

    await ctx.db.insert("gachaDrawHistory", {
      clientId: args.clientId,
      cosmeticId: cosmetic.cosmeticId,
      result: unlock ? "duplicateExperience" : "unlocked",
      experienceGranted,
      createdAt: now,
    });

    return {
      cosmetic,
      result: unlock ? "duplicateExperience" : "unlocked",
      experienceGranted,
      drawSource: hasDailyDraw ? "daily" : "bonus",
    };
  },
});

export const drawVictoryCeremony = mutation({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) throw new Error("Client ID is required");

    const now = Date.now();
    const today = kstDate(now);
    const gachaState = await ctx.db
      .query("anonymousGachaStates")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();
    const dailyDrawsUsed = gachaState?.dailyResetDate === today ? gachaState.dailyDrawsUsed : 0;
    const completedPlayCount = gachaState?.completedPlayCount ?? 0;
    const bonusDrawsUsed = gachaState?.bonusDrawsUsed ?? 0;
    const hasDailyDraw = dailyDrawsUsed < 5;
    const hasBonusDraw = Math.floor(completedPlayCount / 3) > bonusDrawsUsed;
    if (!hasDailyDraw && !hasBonusDraw) throw new Error("No gacha draws available");

    const activeCeremonies = (await ctx.db.query("victoryCeremonies").take(50)).filter((ceremony) => ceremony.isActive);
    if (activeCeremonies.length === 0) throw new Error("Victory ceremony catalog has not been initialized");

    const rarity = rollRarity();
    const rarityPool = activeCeremonies.filter((ceremony) => ceremony.rarity === rarity);
    const pool = rarityPool.length > 0 ? rarityPool : activeCeremonies;
    const ceremony = pool[Math.floor(Math.random() * pool.length)];
    if (!ceremony) throw new Error("Victory ceremony draw failed");

    const unlock = await ctx.db
      .query("victoryCeremonyUnlocks")
      .withIndex("by_ceremonyId", (q) => q.eq("ceremonyId", ceremony.ceremonyId))
      .unique();
    const experienceGranted = unlock ? DUPLICATE_EXPERIENCE[ceremony.rarity] : 0;
    if (!unlock) {
      await ctx.db.insert("victoryCeremonyUnlocks", {
        ceremonyId: ceremony.ceremonyId,
        unlockedAt: now,
        unlockedByClientId: args.clientId,
      });
    }
    if (experienceGranted > 0) {
      await ctx.db.insert("experiencePointItems", {
        clientId: args.clientId,
        amount: experienceGranted,
        rarity: ceremony.rarity,
        createdAt: now,
      });
    }

    if (gachaState) {
      await ctx.db.patch(gachaState._id, {
        dailyResetDate: today,
        dailyDrawsUsed: dailyDrawsUsed + (hasDailyDraw ? 1 : 0),
        completedPlayCount,
        bonusDrawsUsed: bonusDrawsUsed + (hasDailyDraw ? 0 : 1),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("anonymousGachaStates", {
        clientId: args.clientId,
        dailyResetDate: today,
        dailyDrawsUsed: 1,
        completedPlayCount: 0,
        bonusDrawsUsed: 0,
        experiencePoints: 0,
        updatedAt: now,
      });
    }

    await ctx.db.insert("victoryCeremonyDrawHistory", {
      clientId: args.clientId,
      ceremonyId: ceremony.ceremonyId,
      result: unlock ? "duplicateExperience" : "unlocked",
      experienceGranted,
      createdAt: now,
    });
    return {
      ceremony,
      result: unlock ? "duplicateExperience" : "unlocked",
      experienceGranted,
      drawSource: hasDailyDraw ? "daily" : "bonus",
    };
  },
});

export const equipVictoryCeremony = mutation({
  args: { clientId: v.string(), ceremonyId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) throw new Error("Client ID is required");
    const ceremony = await ctx.db
      .query("victoryCeremonies")
      .withIndex("by_ceremonyId", (q) => q.eq("ceremonyId", args.ceremonyId))
      .unique();
    if (!ceremony || !ceremony.isActive) throw new Error("Unknown victory ceremony");
    const unlock = await ctx.db
      .query("victoryCeremonyUnlocks")
      .withIndex("by_ceremonyId", (q) => q.eq("ceremonyId", args.ceremonyId))
      .unique();
    if (!unlock) throw new Error("Victory ceremony has not been unlocked globally");

    const now = Date.now();
    const loadout = await ctx.db
      .query("victoryCeremonyLoadouts")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    if (loadout) {
      await ctx.db.patch(loadout._id, { ceremonyId: args.ceremonyId, updatedAt: now, updatedByClientId: args.clientId });
    } else {
      await ctx.db.insert("victoryCeremonyLoadouts", {
        key: "global",
        ceremonyId: args.ceremonyId,
        updatedAt: now,
        updatedByClientId: args.clientId,
      });
    }
    return { ceremonyId: args.ceremonyId };
  },
});

export const equipForCharacter = mutation({
  args: { clientId: v.string(), characterId: v.string(), cosmeticId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) throw new Error("Client ID is required");
    assertCharacterId(args.characterId);
    const cosmetic = await ctx.db
      .query("cosmetics")
      .withIndex("by_cosmeticId", (q) => q.eq("cosmeticId", args.cosmeticId))
      .unique();
    if (!cosmetic || !cosmetic.isActive) throw new Error("Unknown cosmetic");
    const unlock = await ctx.db
      .query("cosmeticUnlocks")
      .withIndex("by_cosmeticId", (q) => q.eq("cosmeticId", args.cosmeticId))
      .unique();
    if (!unlock) throw new Error("Cosmetic has not been unlocked globally");

    const now = Date.now();
    const loadout = await ctx.db
      .query("characterCosmeticLoadouts")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    if (loadout) {
      await ctx.db.patch(loadout._id, {
        cosmeticId: args.cosmeticId,
        updatedAt: now,
        updatedByClientId: args.clientId,
      });
    } else {
      await ctx.db.insert("characterCosmeticLoadouts", {
        characterId: args.characterId,
        cosmeticId: args.cosmeticId,
        updatedAt: now,
        updatedByClientId: args.clientId,
      });
    }
    return { characterId: args.characterId, cosmeticId: args.cosmeticId };
  },
});

export const clearForCharacter = mutation({
  args: { clientId: v.string(), characterId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) throw new Error("Client ID is required");
    assertCharacterId(args.characterId);
    const loadout = await ctx.db
      .query("characterCosmeticLoadouts")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    if (loadout) await ctx.db.delete(loadout._id);
    return { characterId: args.characterId, cosmeticId: null };
  },
});
