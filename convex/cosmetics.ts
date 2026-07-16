import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isV3CharacterId } from "./v3Constants";

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

type VictoryCeremonyAnimation = "wave" | "jump" | "clap" | "dance" | "trophy" | "fireworks" | "sniper";
type VictoryActionDefinition = {
  actionId: string;
  name: string;
  characterId?: string;
  rarity: Rarity;
  animation: VictoryCeremonyAnimation;
};

type VictoryBackgroundDefinition = {
  backgroundId: string;
  name: string;
  characterId?: string;
  rarity: Rarity;
  animation: VictoryCeremonyAnimation;
};

type VictorySpecialEventEffect = "sniper";
type VictorySpecialEventDefinition = {
  specialEventId: string;
  name: string;
  characterId?: string;
  rarity: Rarity;
  effect: VictorySpecialEventEffect;
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

const INITIAL_VICTORY_ACTIONS: readonly VictoryActionDefinition[] = [
  { actionId: "action-champion-wave", name: "챔피언 인사", rarity: "common", animation: "wave" },
  { actionId: "action-victory-jump", name: "승리 점프", rarity: "common", animation: "jump" },
  { actionId: "action-spotlight-clap", name: "박자 튀기", rarity: "rare", animation: "clap" },
  { actionId: "action-rhythm-dance", name: "리듬 댄스", rarity: "epic", animation: "dance" },
  { actionId: "action-trophy-lift", name: "승리 상승", rarity: "legendary", animation: "trophy" },
  { actionId: "action-fireworks-finale", name: "반짝임", rarity: "unique", animation: "fireworks" },
];

const INITIAL_VICTORY_BACKGROUNDS: readonly VictoryBackgroundDefinition[] = [
  { backgroundId: "background-starlight-stage", name: "별빛 무대", rarity: "common", animation: "wave" },
  { backgroundId: "background-clear-sky", name: "맑은 하늘", rarity: "common", animation: "jump" },
  { backgroundId: "background-gold-spotlight", name: "골드 스포트라이트", rarity: "rare", animation: "clap" },
  { backgroundId: "background-neon-rhythm", name: "네온 리듬", rarity: "epic", animation: "dance" },
  { backgroundId: "background-champion-gold", name: "챔피언 골드", rarity: "legendary", animation: "trophy" },
  { backgroundId: "background-fireworks-festival", name: "불꽃 축제", rarity: "unique", animation: "fireworks" },
];

const INITIAL_VICTORY_SPECIAL_EVENTS: readonly VictorySpecialEventDefinition[] = [
  { specialEventId: "event-su-one-shot", name: "원 샷", characterId: "su", rarity: "unique", effect: "sniper" },
];

const RARITY_WEIGHTS: readonly { rarity: Rarity; weight: number }[] = [
  { rarity: "common", weight: 47 },
  { rarity: "rare", weight: 30 },
  { rarity: "epic", weight: 15 },
  { rarity: "legendary", weight: 6 },
  { rarity: "unique", weight: 2 },
];

// 스킨 가방 중복 획득 시 환불 코인 금액
const DUPLICATE_COIN_REFUND: Record<Rarity, number> = {
  common: 40,
  rare: 80,
  epic: 150,
  legendary: 300,
  unique: 600,
};

const COSMETIC_GACHA_COST = 200; // 가챠 1회 비용 (코인)

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

// 1. 스킨 도감 시딩
export const ensureInitialCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
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

// 2. 세레모니 도감 시딩
export const ensureInitialVictoryCeremonyCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let created = 0;
    for (const action of INITIAL_VICTORY_ACTIONS) {
      const existing = await ctx.db
        .query("victoryActions")
        .withIndex("by_actionId", (q) => q.eq("actionId", action.actionId))
        .unique();
      if (!existing) {
        await ctx.db.insert("victoryActions", { ...action, isActive: true, createdAt: now });
        created += 1;
      }
    }
    for (const background of INITIAL_VICTORY_BACKGROUNDS) {
      const existing = await ctx.db
        .query("victoryBackgrounds")
        .withIndex("by_backgroundId", (q) => q.eq("backgroundId", background.backgroundId))
        .unique();
      if (!existing) {
        await ctx.db.insert("victoryBackgrounds", { ...background, isActive: true, createdAt: now });
        created += 1;
      }
    }
    for (const specialEvent of INITIAL_VICTORY_SPECIAL_EVENTS) {
      const existing = await ctx.db
        .query("victorySpecialEvents")
        .withIndex("by_specialEventId", (q) => q.eq("specialEventId", specialEvent.specialEventId))
        .unique();
      if (!existing) {
        await ctx.db.insert("victorySpecialEvents", { ...specialEvent, isActive: true, createdAt: now });
        created += 1;
      }
    }
    return { created };
  },
});

// 3. 스킨 목록 조회 API (해당 캐릭터 계정의 해금 여부 포함)
export const listCatalog = query({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const cosmetics = await ctx.db.query("cosmetics").take(100);
    const unlocks = await ctx.db
      .query("cosmeticUnlocks")
      .withIndex("by_characterId_and_cosmeticId", (q) => q.eq("characterId", args.characterId))
      .collect();
    const unlockedIds = new Set(unlocks.map((unlock) => unlock.cosmeticId));
    return cosmetics
      .filter((cosmetic) => cosmetic.isActive)
      .map((cosmetic) => ({ ...cosmetic, isUnlocked: unlockedIds.has(cosmetic.cosmeticId) }));
  },
});

// 4. 승리 모달 컴포넌트 도감 조회 (해금 여부 포함)
export const listVictoryActionCatalog = query({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const actions = await ctx.db.query("victoryActions").take(50);
    const unlocks = await ctx.db
      .query("victoryActionUnlocks")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .collect();
    const unlockedIds = new Set(unlocks.map((u) => u.actionId));
    return actions
      .filter((action) => action.isActive && (!action.characterId || action.characterId === args.characterId))
      .map((action) => ({ ...action, isUnlocked: unlockedIds.has(action.actionId) }));
  },
});

export const listVictoryBackgroundCatalog = query({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const backgrounds = await ctx.db.query("victoryBackgrounds").take(50);
    const unlocks = await ctx.db
      .query("victoryBackgroundUnlocks")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .collect();
    const unlockedIds = new Set(unlocks.map((u) => u.backgroundId));
    return backgrounds
      .filter((bg) => bg.isActive && (!bg.characterId || bg.characterId === args.characterId))
      .map((bg) => ({ ...bg, isUnlocked: unlockedIds.has(bg.backgroundId) }));
  },
});

export const listVictorySpecialEventCatalog = query({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const events = await ctx.db.query("victorySpecialEvents").take(50);
    const unlocks = await ctx.db
      .query("victorySpecialEventUnlocks")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .collect();
    const unlockedIds = new Set(unlocks.map((u) => u.specialEventId));
    return events
      .filter((ev) => ev.isActive && (!ev.characterId || ev.characterId === args.characterId))
      .map((ev) => ({ ...ev, isUnlocked: unlockedIds.has(ev.specialEventId) }));
  },
});

// 5. 캐릭터 현재 장착 외형 로드아웃 조회
export const getCharacterLoadout = query({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    return await ctx.db
      .query("characterCosmeticLoadouts")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
  },
});

// 6. 스킨 및 세레모니 통합 가챠 상점
export const drawUnified = mutation({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const now = Date.now();

    const progress = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    if (!progress) throw new Error("Character not found");
    if (progress.coins < COSMETIC_GACHA_COST) throw new Error("코인이 부족합니다.");

    const activeCosmetics = (await ctx.db.query("cosmetics").take(100)).filter((c) => c.isActive && c.scope === "global");
    const activeActions = (await ctx.db.query("victoryActions").take(50)).filter((a) => a.isActive && (!a.characterId || a.characterId === args.characterId));
    const activeBackgrounds = (await ctx.db.query("victoryBackgrounds").take(50)).filter((b) => b.isActive && (!b.characterId || b.characterId === args.characterId));
    const activeSpecialEvents = (await ctx.db.query("victorySpecialEvents").take(50)).filter((s) => s.isActive && (!s.characterId || s.characterId === args.characterId));

    if (activeCosmetics.length + activeActions.length + activeBackgrounds.length + activeSpecialEvents.length === 0) {
      throw new Error("Gacha catalog has not been initialized");
    }

    const rarity = rollRarity();
    const rarityCosmetics = activeCosmetics.filter((c) => c.rarity === rarity);
    const rarityActions = activeActions.filter((a) => a.rarity === rarity);
    const rarityBackgrounds = activeBackgrounds.filter((b) => b.rarity === rarity);
    const raritySpecialEvents = activeSpecialEvents.filter((s) => s.rarity === rarity);

    const hasRarityCandidates = rarityCosmetics.length + rarityActions.length + rarityBackgrounds.length + raritySpecialEvents.length > 0;
    const candidates = [
      ...(hasRarityCandidates ? rarityCosmetics : activeCosmetics).map((c) => ({ itemType: "skin" as const, item: c })),
      ...(hasRarityCandidates ? rarityActions : activeActions).map((a) => ({ itemType: "action" as const, item: a })),
      ...(hasRarityCandidates ? rarityBackgrounds : activeBackgrounds).map((b) => ({ itemType: "background" as const, item: b })),
      ...(hasRarityCandidates ? raritySpecialEvents : activeSpecialEvents).map((s) => ({ itemType: "specialEvent" as const, item: s })),
    ];

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    if (!selected) throw new Error("Gacha draw failed");

    let result: "unlocked" | "duplicate" = "unlocked";
    let coinRefund = 0;

    if (selected.itemType === "skin") {
      const unlock = await ctx.db
        .query("cosmeticUnlocks")
        .withIndex("by_characterId_and_cosmeticId", (q) => q.eq("characterId", args.characterId).eq("cosmeticId", selected.item.cosmeticId))
        .unique();
      result = unlock ? "duplicate" : "unlocked";
      coinRefund = unlock ? DUPLICATE_COIN_REFUND[selected.item.rarity] : 0;
      if (!unlock) {
        await ctx.db.insert("cosmeticUnlocks", { characterId: args.characterId, cosmeticId: selected.item.cosmeticId, unlockedAt: now });
      }
    } else if (selected.itemType === "action") {
      const unlock = await ctx.db
        .query("victoryActionUnlocks")
        .withIndex("by_characterId_and_actionId", (q) => q.eq("characterId", args.characterId).eq("actionId", selected.item.actionId))
        .unique();
      result = unlock ? "duplicate" : "unlocked";
      coinRefund = unlock ? DUPLICATE_COIN_REFUND[selected.item.rarity] : 0;
      if (!unlock) {
        await ctx.db.insert("victoryActionUnlocks", { characterId: args.characterId, actionId: selected.item.actionId, unlockedAt: now });
      }
    } else if (selected.itemType === "background") {
      const unlock = await ctx.db
        .query("victoryBackgroundUnlocks")
        .withIndex("by_characterId_and_backgroundId", (q) => q.eq("characterId", args.characterId).eq("backgroundId", selected.item.backgroundId))
        .unique();
      result = unlock ? "duplicate" : "unlocked";
      coinRefund = unlock ? DUPLICATE_COIN_REFUND[selected.item.rarity] : 0;
      if (!unlock) {
        await ctx.db.insert("victoryBackgroundUnlocks", { characterId: args.characterId, backgroundId: selected.item.backgroundId, unlockedAt: now });
      }
    } else {
      const unlock = await ctx.db
        .query("victorySpecialEventUnlocks")
        .withIndex("by_characterId_and_specialEventId", (q) => q.eq("characterId", args.characterId).eq("specialEventId", selected.item.specialEventId))
        .unique();
      result = unlock ? "duplicate" : "unlocked";
      coinRefund = unlock ? DUPLICATE_COIN_REFUND[selected.item.rarity] : 0;
      if (!unlock) {
        await ctx.db.insert("victorySpecialEventUnlocks", { characterId: args.characterId, specialEventId: selected.item.specialEventId, unlockedAt: now });
      }
    }

    const nextCoins = progress.coins - COSMETIC_GACHA_COST + coinRefund;
    await ctx.db.patch(progress._id, {
      coins: nextCoins,
      updatedAt: now,
    });

    return {
      itemType: selected.itemType,
      item: selected.item,
      result,
      coinRefund,
      coins: nextCoins,
    };
  },
});

// 7. 장착 뮤테이션들
export const equipForCharacter = mutation({
  args: { characterId: v.string(), cosmeticId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const cosmetic = await ctx.db.query("cosmetics").withIndex("by_cosmeticId", (q) => q.eq("cosmeticId", args.cosmeticId)).unique();
    if (!cosmetic || !cosmetic.isActive) throw new Error("Unknown cosmetic");

    const unlock = await ctx.db
      .query("cosmeticUnlocks")
      .withIndex("by_characterId_and_cosmeticId", (q) => q.eq("characterId", args.characterId).eq("cosmeticId", args.cosmeticId))
      .unique();
    if (!unlock) throw new Error("Cosmetic has not been unlocked");

    const now = Date.now();
    const loadout = await ctx.db.query("characterCosmeticLoadouts").withIndex("by_characterId", (q) => q.eq("characterId", args.characterId)).unique();
    if (loadout) {
      await ctx.db.patch(loadout._id, { equippedCosmeticId: args.cosmeticId, updatedAt: now });
    } else {
      await ctx.db.insert("characterCosmeticLoadouts", {
        characterId: args.characterId,
        equippedCosmeticId: args.cosmeticId,
        updatedAt: now,
      });
    }
    return { characterId: args.characterId, cosmeticId: args.cosmeticId };
  },
});

export const clearForCharacter = mutation({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const loadout = await ctx.db.query("characterCosmeticLoadouts").withIndex("by_characterId", (q) => q.eq("characterId", args.characterId)).unique();
    if (loadout) {
      await ctx.db.patch(loadout._id, { equippedCosmeticId: undefined, updatedAt: Date.now() });
    }
    return { characterId: args.characterId, cosmeticId: null };
  },
});

export const equipVictoryAction = mutation({
  args: { characterId: v.string(), actionId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const action = await ctx.db.query("victoryActions").withIndex("by_actionId", (q) => q.eq("actionId", args.actionId)).unique();
    if (!action?.isActive) throw new Error("Unknown victory action");

    const unlock = await ctx.db
      .query("victoryActionUnlocks")
      .withIndex("by_characterId_and_actionId", (q) => q.eq("characterId", args.characterId).eq("actionId", args.actionId))
      .unique();
    if (!unlock) throw new Error("Victory action has not been unlocked");

    const now = Date.now();
    const loadout = await ctx.db.query("characterCosmeticLoadouts").withIndex("by_characterId", (q) => q.eq("characterId", args.characterId)).unique();
    if (loadout) {
      await ctx.db.patch(loadout._id, { equippedActionId: args.actionId, updatedAt: now });
    } else {
      await ctx.db.insert("characterCosmeticLoadouts", {
        characterId: args.characterId,
        equippedActionId: args.actionId,
        updatedAt: now,
      });
    }
    return { actionId: args.actionId };
  },
});

export const clearVictoryAction = mutation({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const loadout = await ctx.db.query("characterCosmeticLoadouts").withIndex("by_characterId", (q) => q.eq("characterId", args.characterId)).unique();
    if (loadout) {
      await ctx.db.patch(loadout._id, { equippedActionId: undefined, updatedAt: Date.now() });
    }
    return { actionId: null };
  },
});

export const equipVictoryBackground = mutation({
  args: { characterId: v.string(), backgroundId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const background = await ctx.db.query("victoryBackgrounds").withIndex("by_backgroundId", (q) => q.eq("backgroundId", args.backgroundId)).unique();
    if (!background?.isActive) throw new Error("Unknown victory background");

    const unlock = await ctx.db
      .query("victoryBackgroundUnlocks")
      .withIndex("by_characterId_and_backgroundId", (q) => q.eq("characterId", args.characterId).eq("backgroundId", args.backgroundId))
      .unique();
    if (!unlock) throw new Error("Victory background has not been unlocked");

    const now = Date.now();
    const loadout = await ctx.db.query("characterCosmeticLoadouts").withIndex("by_characterId", (q) => q.eq("characterId", args.characterId)).unique();
    if (loadout) {
      await ctx.db.patch(loadout._id, { equippedBackgroundId: args.backgroundId, updatedAt: now });
    } else {
      await ctx.db.insert("characterCosmeticLoadouts", {
        characterId: args.characterId,
        equippedBackgroundId: args.backgroundId,
        updatedAt: now,
      });
    }
    return { backgroundId: args.backgroundId };
  },
});

export const clearVictoryBackground = mutation({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const loadout = await ctx.db.query("characterCosmeticLoadouts").withIndex("by_characterId", (q) => q.eq("characterId", args.characterId)).unique();
    if (loadout) {
      await ctx.db.patch(loadout._id, { equippedBackgroundId: undefined, updatedAt: Date.now() });
    }
    return { backgroundId: null };
  },
});

export const equipVictorySpecialEvent = mutation({
  args: { characterId: v.string(), specialEventId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const specialEvent = await ctx.db.query("victorySpecialEvents").withIndex("by_specialEventId", (q) => q.eq("specialEventId", args.specialEventId)).unique();
    if (!specialEvent?.isActive) throw new Error("Unknown victory special event");

    const unlock = await ctx.db
      .query("victorySpecialEventUnlocks")
      .withIndex("by_characterId_and_specialEventId", (q) => q.eq("characterId", args.characterId).eq("specialEventId", args.specialEventId))
      .unique();
    if (!unlock) throw new Error("Victory special event has not been unlocked");

    const now = Date.now();
    const loadout = await ctx.db.query("characterCosmeticLoadouts").withIndex("by_characterId", (q) => q.eq("characterId", args.characterId)).unique();
    if (loadout) {
      await ctx.db.patch(loadout._id, { equippedSpecialEventId: args.specialEventId, updatedAt: now });
    } else {
      await ctx.db.insert("characterCosmeticLoadouts", {
        characterId: args.characterId,
        equippedSpecialEventId: args.specialEventId,
        updatedAt: now,
      });
    }
    return { specialEventId: args.specialEventId };
  },
});

export const clearVictorySpecialEvent = mutation({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const loadout = await ctx.db.query("characterCosmeticLoadouts").withIndex("by_characterId", (q) => q.eq("characterId", args.characterId)).unique();
    if (loadout) {
      await ctx.db.patch(loadout._id, { equippedSpecialEventId: undefined, updatedAt: Date.now() });
    }
    return { specialEventId: null };
  },
});
