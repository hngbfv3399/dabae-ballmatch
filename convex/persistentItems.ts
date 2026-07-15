import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isV3CharacterId } from "./v3Constants";

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
];

const MILESTONES = [5, 10, 15, 20, 25, 30] as const;

function assertCharacterId(characterId: string): void {
  if (!isV3CharacterId(characterId)) {
    throw new Error("Unknown character ID");
  }
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
      .filter((q) => q.eq(q.field("isActive"), true))
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
      .filter((q) => q.eq(q.field("isActive"), true))
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

    // Draw one random locked item
    const drawIndex = Math.floor(Math.random() * lockedItems.length);
    const drawnItem = lockedItems[drawIndex];

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
      .filter((q) => q.eq(q.field("isActive"), true))
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
