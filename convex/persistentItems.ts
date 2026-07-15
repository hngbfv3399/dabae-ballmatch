import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isV3CharacterId } from "./v3Constants";

const RARITY_DRAW_WEIGHTS = {
  common: 50,
  rare: 30,
  epic: 14,
  legendary: 5,
  unique: 1,
} as const;

const SEED_ITEMS = [
  {
    itemId: "inertial_bearing",
    name: "관성 베어링",
    description: "이동 속도 +8%",
    rarity: "common" as const,
    isActive: true,
    effects: {
      speedMultiplier: 1.08,
    },
  },
  { itemId: "tempered_core", name: "단련 코어", description: "공격력 +7%", rarity: "common" as const, isActive: true, effects: { attackMultiplier: 1.07 } },
  { itemId: "quick_charge_cell", name: "급속 충전 셀", description: "스킬 충전 속도 +10%", rarity: "common" as const, isActive: true, effects: { skillChargeRateMultiplier: 1.1 } },
  {
    itemId: "reinforced_shell",
    name: "강화 외피",
    description: "최대 DEF 보호막 +12",
    rarity: "common" as const,
    isActive: true,
    effects: {
      defenseShieldBonus: 12,
    },
  },
  {
    itemId: "impact_lens",
    name: "충격 렌즈",
    description: "기본 공격 사거리 +18px",
    rarity: "common" as const,
    isActive: true,
    effects: {
      baseAttackRangeBonus: 18,
    },
  },
  {
    itemId: "bio_buffer",
    name: "생체 완충재",
    description: "최대 체력 +8%",
    rarity: "common" as const,
    isActive: true,
    effects: {
      maxHpMultiplier: 1.08,
    },
  },
  { itemId: "carbon_plating", name: "카본 장갑판", description: "받는 피해 -6%", rarity: "common" as const, isActive: true, effects: { damageReductionMultiplier: 0.94 } },
  { itemId: "longshot_scope", name: "롱샷 스코프", description: "기본 공격 사거리 +30px", rarity: "rare" as const, isActive: true, effects: { baseAttackRangeBonus: 30 } },
  { itemId: "vital_reactor", name: "생명 반응로", description: "최대 체력 +14%", rarity: "rare" as const, isActive: true, effects: { maxHpMultiplier: 1.14 } },
  { itemId: "turbo_servo", name: "터보 서보", description: "이동 속도 +14%", rarity: "rare" as const, isActive: true, effects: { speedMultiplier: 1.14 } },
  { itemId: "titanium_guard", name: "티타늄 가드", description: "최대 DEF 보호막 +24", rarity: "rare" as const, isActive: true, effects: { defenseShieldBonus: 24 } },
  { itemId: "amplifier_chip", name: "증폭 칩", description: "공격력 +13%", rarity: "rare" as const, isActive: true, effects: { attackMultiplier: 1.13 } },
  { itemId: "adaptive_mesh", name: "적응형 메시", description: "받는 피해 -11%", rarity: "rare" as const, isActive: true, effects: { damageReductionMultiplier: 0.89 } },
  { itemId: "orbiting_shard", name: "궤도 파편", description: "주변 82px 궤도 링이 1.4초마다 적에게 9 피해", rarity: "epic" as const, isActive: true, effects: { orbitDamage: 9, orbitRadius: 82, orbitInterval: 1.4 } },
  { itemId: "resonance_emitter", name: "공명 방출기", description: "주변 116px에 3초마다 충격파 16 피해", rarity: "epic" as const, isActive: true, effects: { pulseDamage: 16, pulseRadius: 116, pulseInterval: 3 } },
  { itemId: "overclock_matrix", name: "오버클록 매트릭스", description: "공격력 +18%, 스킬 충전 속도 +18%", rarity: "epic" as const, isActive: true, effects: { attackMultiplier: 1.18, skillChargeRateMultiplier: 1.18 } },
  { itemId: "fortress_heart", name: "요새의 심장", description: "최대 체력 +18%, 최대 DEF 보호막 +20", rarity: "epic" as const, isActive: true, effects: { maxHpMultiplier: 1.18, defenseShieldBonus: 20 } },
  { itemId: "nova_ring", name: "노바 링", description: "주변 104px 궤도 링이 1초마다 적에게 16 피해", rarity: "legendary" as const, isActive: true, effects: { orbitDamage: 16, orbitRadius: 104, orbitInterval: 1 } },
  { itemId: "aegis_protocol", name: "이지스 프로토콜", description: "최대 DEF 보호막 +38, 받는 피해 -15%", rarity: "legendary" as const, isActive: true, effects: { defenseShieldBonus: 38, damageReductionMultiplier: 0.85 } },
  { itemId: "apex_drive", name: "에이펙스 드라이브", description: "공격력 +22%, 이동 속도 +16%", rarity: "legendary" as const, isActive: true, effects: { attackMultiplier: 1.22, speedMultiplier: 1.16 } },
  { itemId: "singularity_engine", name: "특이점 엔진", description: "주변 132px에 2.4초마다 충격파 28 피해, 스킬 충전 속도 +25%", rarity: "unique" as const, isActive: true, effects: { pulseDamage: 28, pulseRadius: 132, pulseInterval: 2.4, skillChargeRateMultiplier: 1.25 } },
];

const MILESTONES = [5, 10, 15, 20, 25, 30] as const;

function assertCharacterId(characterId: string): void {
  if (!isV3CharacterId(characterId)) {
    throw new Error("Unknown character ID");
  }
}

function pickWeightedLockedItem<T extends { rarity: keyof typeof RARITY_DRAW_WEIGHTS }>(items: T[]): T {
  const totalWeight = items.reduce((total, item) => total + RARITY_DRAW_WEIGHTS[item.rarity], 0);
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= RARITY_DRAW_WEIGHTS[item.rarity];
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

// 1. Seed / ensure catalog items
export const ensureInitialPersistentItemCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let seeded = 0;
    let patched = 0;

    for (const item of SEED_ITEMS) {
      const existing = await ctx.db
        .query("persistentItemCatalog")
        .withIndex("by_itemId", (q) => q.eq("itemId", item.itemId))
        .unique();

      if (!existing) {
        await ctx.db.insert("persistentItemCatalog", {
          ...item,
          createdAt: now,
        });
        seeded += 1;
      } else {
        // Safe patch to update description or effects if changed
        await ctx.db.patch(existing._id, {
          name: item.name,
          description: item.description,
          rarity: item.rarity,
          isActive: item.isActive,
          effects: item.effects,
        });
        patched += 1;
      }
    }

    return { seeded, patched };
  },
});

// 2. List item catalog along with ownership
export const listPersistentItemCatalog = query({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    const activeCatalog = await ctx.db
      .query("persistentItemCatalog")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(100);

    const unlocks = await ctx.db
      .query("persistentItemUnlocks")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .take(100);

    const unlockedIds = new Set(unlocks.map((u) => u.itemId));

    return activeCatalog.map((item) => ({
      ...item,
      isUnlocked: unlockedIds.has(item.itemId),
    }));
  },
});

// 3. Get loadouts for all characters for a clientId
export const getCharacterItemLoadouts = query({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) return [];
    return await ctx.db
      .query("characterItemLoadouts")
      .withIndex("by_clientId_and_characterId", (q) => q.eq("clientId", args.clientId))
      .take(100);
  },
});

// 4. Get ticket summary, character level milestones for a character
export const getItemTicketSummary = query({
  args: { clientId: v.string(), characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);

    // Get character level
    const progress = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    const currentLevel = progress?.level ?? 1;

    // Get claim history
    const claims = await ctx.db
      .query("itemTicketClaims")
      .withIndex("by_clientId_and_characterId", (q) =>
        q.eq("clientId", args.clientId).eq("characterId", args.characterId)
      )
      .take(50);
    const claimedMilestones = claims.map((c) => c.milestoneLevel);

    // Get available tickets
    const balanceDoc = await ctx.db
      .query("itemTicketBalances")
      .withIndex("by_clientId_and_characterId", (q) =>
        q.eq("clientId", args.clientId).eq("characterId", args.characterId)
      )
      .unique();
    const availableTickets = balanceDoc?.availableTickets ?? 0;

    // Calculate next milestone
    const nextMilestoneLevel = MILESTONES.find((m) => !claimedMilestones.includes(m)) ?? null;

    return {
      currentLevel,
      nextMilestoneLevel,
      claimedMilestones,
      availableTickets,
      slot3Unlocked: currentLevel >= 20,
    };
  },
});

// 5. Claim milestone tickets
export const claimAvailableItemTickets = mutation({
  args: { clientId: v.string(), characterId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) throw new Error("Client ID is required");
    assertCharacterId(args.characterId);

    const now = Date.now();

    // Get current level
    const progress = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    const currentLevel = progress?.level ?? 1;

    // Find claimable milestones
    let newTickets = 0;
    const claimedMilestones: number[] = [];

    for (const milestone of MILESTONES) {
      if (currentLevel >= milestone) {
        const existingClaim = await ctx.db
          .query("itemTicketClaims")
          .withIndex("by_clientId_and_characterId_and_milestoneLevel", (q) =>
            q
              .eq("clientId", args.clientId)
              .eq("characterId", args.characterId)
              .eq("milestoneLevel", milestone)
          )
          .unique();

        if (!existingClaim) {
          await ctx.db.insert("itemTicketClaims", {
            clientId: args.clientId,
            characterId: args.characterId,
            milestoneLevel: milestone,
            claimedAt: now,
          });
          newTickets += 1;
        }
        claimedMilestones.push(milestone);
      }
    }

    const balanceDoc = await ctx.db
      .query("itemTicketBalances")
      .withIndex("by_clientId_and_characterId", (q) =>
        q.eq("clientId", args.clientId).eq("characterId", args.characterId)
      )
      .unique();

    let availableTickets = 0;
    if (balanceDoc) {
      availableTickets = balanceDoc.availableTickets + newTickets;
      if (newTickets > 0) {
        await ctx.db.patch(balanceDoc._id, {
          availableTickets,
          updatedAt: now,
        });
      }
    } else {
      // Self-healing migration: count existing claims and unlocks to restore balance
      const claims = await ctx.db
        .query("itemTicketClaims")
        .withIndex("by_clientId_and_characterId", (q) =>
          q.eq("clientId", args.clientId).eq("characterId", args.characterId)
        )
        .collect();
      const unlocks = await ctx.db
        .query("persistentItemUnlocks")
        .withIndex("by_clientId_and_characterId", (q) =>
          q.eq("clientId", args.clientId).eq("characterId", args.characterId)
        )
        .collect();

      const migratedTickets = Math.max(0, claims.length - newTickets - unlocks.length);
      availableTickets = migratedTickets + newTickets;

      await ctx.db.insert("itemTicketBalances", {
        clientId: args.clientId,
        characterId: args.characterId,
        availableTickets,
        updatedAt: now,
      });
    }

    return {
      claimedCount: newTickets,
      totalTickets: availableTickets,
      claimedMilestones,
    };
  },
});

// 6. Draw persistent item (Gacha)
export const drawPersistentItem = mutation({
  args: { clientId: v.string(), characterId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) throw new Error("Client ID is required");
    assertCharacterId(args.characterId);

    const now = Date.now();

    // Check ticket balance
    const balanceDoc = await ctx.db
      .query("itemTicketBalances")
      .withIndex("by_clientId_and_characterId", (q) =>
        q.eq("clientId", args.clientId).eq("characterId", args.characterId)
      )
      .unique();

    const availableTickets = balanceDoc?.availableTickets ?? 0;
    if (availableTickets < 1) {
      throw new Error("보유한 아이템 뽑기권이 부족합니다.");
    }

    // Get catalog and unlocks
    const activeCatalog = await ctx.db
      .query("persistentItemCatalog")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(100);

    const unlocks = await ctx.db
      .query("persistentItemUnlocks")
      .withIndex("by_clientId_and_characterId", (q) =>
        q.eq("clientId", args.clientId).eq("characterId", args.characterId)
      )
      .take(100);

    const unlockedIds = new Set(unlocks.map((u) => u.itemId));
    const lockedItems = activeCatalog.filter((item) => !unlockedIds.has(item.itemId));

    if (lockedItems.length === 0) {
      // Catalog complete: do not consume ticket
      return {
        catalogComplete: true,
        item: null,
      };
    }

    // 등급 확률은 남은 아이템만 대상으로 계산한다. 이미 보유한 아이템은 재추첨 대상이 아니다.
    const drawnItem = pickWeightedLockedItem(lockedItems);

    // Create unlock
    await ctx.db.insert("persistentItemUnlocks", {
      clientId: args.clientId,
      characterId: args.characterId,
      itemId: drawnItem.itemId,
      unlockedAt: now,
    });

    // Deduct ticket
    if (balanceDoc) {
      await ctx.db.patch(balanceDoc._id, {
        availableTickets: balanceDoc.availableTickets - 1,
        updatedAt: now,
      });
    }

    // Log draw history
    await ctx.db.insert("itemDrawHistory", {
      clientId: args.clientId,
      characterId: args.characterId,
      itemId: drawnItem.itemId,
      result: "unlocked",
      ticketConsumed: 1,
      createdAt: now,
    });

    return {
      catalogComplete: false,
      item: drawnItem,
    };
  },
});

// 7. Equip persistent item
export const equipPersistentItem = mutation({
  args: {
    clientId: v.string(),
    characterId: v.string(),
    slot: v.number(),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) throw new Error("Client ID is required");
    assertCharacterId(args.characterId);

    if (args.slot !== 1 && args.slot !== 2 && args.slot !== 3) {
      throw new Error("올바르지 않은 슬롯 번호입니다. (1, 2, 3만 허용)");
    }

    // Verify slot 3 unlocked
    if (args.slot === 3) {
      const progress = await ctx.db
        .query("characterProgress")
        .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
        .unique();
      const currentLevel = progress?.level ?? 1;
      if (currentLevel < 20) {
        throw new Error("3번째 장착 슬롯은 레벨 20 이상부터 해금됩니다.");
      }
    }

    // Verify item catalog definitions and character restriction
    const itemCatalog = await ctx.db
      .query("persistentItemCatalog")
      .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
      .unique();
    if (!itemCatalog || !itemCatalog.isActive) {
      throw new Error("존재하지 않거나 비활성화된 아이템입니다.");
    }
    if (itemCatalog.characterId && itemCatalog.characterId !== args.characterId) {
      throw new Error("이 캐릭터 전용 아이템이 아닙니다.");
    }

    // Verify item is unlocked by player for this specific character
    const isUnlocked = await ctx.db
      .query("persistentItemUnlocks")
      .withIndex("by_clientId_and_characterId_and_itemId", (q) =>
        q.eq("clientId", args.clientId)
          .eq("characterId", args.characterId)
          .eq("itemId", args.itemId)
      )
      .unique();
    if (!isUnlocked) {
      throw new Error("해당 아이템을 보유하고 있지 않습니다.");
    }

    // Get current loadout
    const existingLoadout = await ctx.db
      .query("characterItemLoadouts")
      .withIndex("by_clientId_and_characterId", (q) =>
        q.eq("clientId", args.clientId).eq("characterId", args.characterId)
      )
      .unique();

    // Check for duplicates in other slots
    if (existingLoadout) {
      if (
        (args.slot !== 1 && existingLoadout.slot1ItemId === args.itemId) ||
        (args.slot !== 2 && existingLoadout.slot2ItemId === args.itemId) ||
        (args.slot !== 3 && existingLoadout.slot3ItemId === args.itemId)
      ) {
        throw new Error("동일한 아이템을 중복 장착할 수 없습니다.");
      }

      // Update
      const patches: Record<string, string | undefined> = {};
      if (args.slot === 1) patches.slot1ItemId = args.itemId;
      if (args.slot === 2) patches.slot2ItemId = args.itemId;
      if (args.slot === 3) patches.slot3ItemId = args.itemId;

      await ctx.db.patch(existingLoadout._id, {
        ...patches,
        updatedAt: Date.now(),
      });
    } else {
      // Create new loadout
      await ctx.db.insert("characterItemLoadouts", {
        clientId: args.clientId,
        characterId: args.characterId,
        slot1ItemId: args.slot === 1 ? args.itemId : undefined,
        slot2ItemId: args.slot === 2 ? args.itemId : undefined,
        slot3ItemId: args.slot === 3 ? args.itemId : undefined,
        updatedAt: Date.now(),
      });
    }

    return await ctx.db
      .query("characterItemLoadouts")
      .withIndex("by_clientId_and_characterId", (q) =>
        q.eq("clientId", args.clientId).eq("characterId", args.characterId)
      )
      .unique();
  },
});

// 8. Clear slot
export const clearPersistentItemSlot = mutation({
  args: {
    clientId: v.string(),
    characterId: v.string(),
    slot: v.number(),
  },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) throw new Error("Client ID is required");
    assertCharacterId(args.characterId);

    if (args.slot !== 1 && args.slot !== 2 && args.slot !== 3) {
      throw new Error("올바르지 않은 슬롯 번호입니다. (1, 2, 3만 허용)");
    }

    const existingLoadout = await ctx.db
      .query("characterItemLoadouts")
      .withIndex("by_clientId_and_characterId", (q) =>
        q.eq("clientId", args.clientId).eq("characterId", args.characterId)
      )
      .unique();

    if (existingLoadout) {
      const patches: Record<string, undefined> = {};
      if (args.slot === 1) patches.slot1ItemId = undefined;
      if (args.slot === 2) patches.slot2ItemId = undefined;
      if (args.slot === 3) patches.slot3ItemId = undefined;

      await ctx.db.patch(existingLoadout._id, {
        ...patches,
        updatedAt: Date.now(),
      });
    }

    return await ctx.db
      .query("characterItemLoadouts")
      .withIndex("by_clientId_and_characterId", (q) =>
        q.eq("clientId", args.clientId).eq("characterId", args.characterId)
      )
      .unique();
  },
});

export const getPersistentItemSummary = query({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) {
      return { catalog: [], loadouts: [], unlocks: [], ticketBalances: [] };
    }

    const catalog = await ctx.db
      .query("persistentItemCatalog")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(100);

    const unlocksDocs = await ctx.db
      .query("persistentItemUnlocks")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .take(500);
        const unlocks = unlocksDocs
      .filter((u) => u.characterId !== undefined)
      .map((u) => ({
        characterId: u.characterId,
        itemId: u.itemId,
      }));

    const loadouts = await ctx.db
      .query("characterItemLoadouts")
      .withIndex("by_clientId_and_characterId", (q) => q.eq("clientId", args.clientId))
      .take(100);

    const balancesDocs = await ctx.db
      .query("itemTicketBalances")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .take(100);
    const ticketBalances = balancesDocs
      .filter((b) => b.characterId !== undefined)
      .map((b) => ({
        characterId: b.characterId,
        availableTickets: b.availableTickets,
      }));

    return {
      catalog,
      loadouts,
      unlocks,
      ticketBalances,
    };
  },
});
