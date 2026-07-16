import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isV3CharacterId } from "./v3Constants";

type Rarity = "common" | "rare" | "epic" | "legendary" | "unique";

const RARITY_DRAW_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  rare: 30,
  epic: 14,
  legendary: 5,
  unique: 1,
};

const SEED_ITEMS = [
  { itemId: "inertial_bearing", name: "관성 베어링", description: "이동 속도 +8%", rarity: "common" as const, isActive: true, effects: { speedMultiplier: 1.08 } },
  { itemId: "tempered_core", name: "단련 코어", description: "공격력 +2", rarity: "common" as const, isActive: true, effects: { attackPowerBonus: 2 } },
  { itemId: "quick_charge_cell", name: "급속 충전 셀", description: "스킬 쿨다운 속도 +10%", rarity: "common" as const, isActive: true, effects: { skillChargeRateMultiplier: 1.10 } },
  { itemId: "reinforced_shell", name: "강화 외피", description: "최대 DEF 보호막 +12", rarity: "common" as const, isActive: true, effects: { defenseShieldBonus: 12 } },
  { itemId: "impact_lens", name: "충격 렌즈", description: "기본 공격 사거리 +18px", rarity: "common" as const, isActive: true, effects: { baseAttackRangeBonus: 18 } },
  { itemId: "bio_buffer", name: "생체 완충재", description: "최대 체력 +12", rarity: "common" as const, isActive: true, effects: { maxHpBonus: 12 } },
  { itemId: "carbon_plating", name: "카본 장갑판", description: "방어력 +1 (피해 1회당 -1)", rarity: "common" as const, isActive: true, effects: { defenseBonus: 1 } },
  
  { itemId: "longshot_scope", name: "롱샷 스코프", description: "기본 공격 사거리 +30px", rarity: "rare" as const, isActive: true, effects: { baseAttackRangeBonus: 30 } },
  { itemId: "vital_reactor", name: "생명 반응로", description: "최대 체력 +24", rarity: "rare" as const, isActive: true, effects: { maxHpBonus: 24 } },
  { itemId: "turbo_servo", name: "터보 서보", description: "이동 속도 +14%", rarity: "rare" as const, isActive: true, effects: { speedMultiplier: 1.14 } },
  { itemId: "titanium_guard", name: "티타늄 가드", description: "최대 DEF 보호막 +24", rarity: "rare" as const, isActive: true, effects: { defenseShieldBonus: 24 } },
  { itemId: "amplifier_chip", name: "증폭 칩", description: "공격력 +4", rarity: "rare" as const, isActive: true, effects: { attackPowerBonus: 4 } },
  { itemId: "adaptive_mesh", name: "적응형 메시", description: "방어력 +2 (피해 1회당 -2)", rarity: "rare" as const, isActive: true, effects: { defenseBonus: 2 } },
  
  { itemId: "orbiting_shard", name: "궤도 파편", description: "주변 82px 궤도 링이 1.4초마다 적에게 9 피해", rarity: "epic" as const, isActive: true, effects: { orbitDamage: 9, orbitRadius: 82, orbitInterval: 1.4 } },
  { itemId: "resonance_emitter", name: "공명 방출기", description: "주변 116px에 3초마다 충격파 16 피해", rarity: "epic" as const, isActive: true, effects: { pulseDamage: 16, pulseRadius: 116, pulseInterval: 3.0 } },
  { itemId: "overclock_matrix", name: "오버클록 매트릭스", description: "공격력 +6, 스킬 쿨다운 속도 +18%", rarity: "epic" as const, isActive: true, effects: { attackPowerBonus: 6, skillChargeRateMultiplier: 1.18 } },
  { itemId: "fortress_heart", name: "요새의 심장", description: "최대 체력 +32, 최대 DEF 보호막 +20", rarity: "epic" as const, isActive: true, effects: { maxHpBonus: 32, defenseShieldBonus: 20 } },
  
  { itemId: "nova_ring", name: "노바 링", description: "주변 104px 궤도 링이 1초마다 적에게 16 피해", rarity: "legendary" as const, isActive: true, effects: { orbitDamage: 16, orbitRadius: 104, orbitInterval: 1.0 } },
  { itemId: "aegis_protocol", name: "이지스 프로토콜", description: "최대 DEF 보호막 +38, 방어력 +3 (피해 1회당 -3)", rarity: "legendary" as const, isActive: true, effects: { defenseShieldBonus: 38, defenseBonus: 3 } },
  { itemId: "apex_drive", name: "에이펙스 드라이브", description: "공격력 +9, 이동 속도 +16%", rarity: "legendary" as const, isActive: true, effects: { attackPowerBonus: 9, speedMultiplier: 1.16 } },
  
  { itemId: "singularity_engine", name: "특이점 엔진", description: "주변 132px에 2.4초마다 충격파 28 피해, 스킬 쿨다운 속도 +25%", rarity: "unique" as const, isActive: true, effects: { pulseDamage: 28, pulseRadius: 132, pulseInterval: 2.4, skillChargeRateMultiplier: 1.25 } },
];

// 장비 제물 합성 경험치 계수
const MATERIAL_XP: Record<Rarity, number> = {
  common: 50,
  rare: 120,
  epic: 300,
  legendary: 800,
  unique: 2000,
};

// 장비 판매 시 환급 코인 계수
const BASE_SELL_VALUE: Record<Rarity, number> = {
  common: 20,
  rare: 50,
  epic: 120,
  legendary: 300,
  unique: 650,
};

function assertCharacterId(characterId: string): void {
  if (!isV3CharacterId(characterId)) {
    throw new Error("Unknown character ID");
  }
}

// 레벨당 요구 경험치 공식 (1 -> 2: 100 XP, 2 -> 3: 150 XP, ...)
function itemXpRequired(level: number): number {
  return 100 + (level - 1) * 50;
}

// 장비 스펙 레벨업 스케일링 계산 (레벨당 10% 복리 증가)
function scaleEffects(baseEffects: any, level: number): any {
  const scale = 1 + (level - 1) * 0.1;
  const scaled: any = {};
  for (const [key, value] of Object.entries(baseEffects)) {
    if (typeof value === "number") {
      // 퍼센트 배율 계수는 1을 뺀 나머지 증가량에 대해서만 배율 적용
      if (key.endsWith("Multiplier") || key === "damageReductionMultiplier") {
        const baseOffset = value - 1;
        scaled[key] = Number((1 + baseOffset * scale).toFixed(3));
      } else if (["maxHpBonus", "attackPowerBonus", "defenseBonus", "defenseShieldBonus"].includes(key)) {
        scaled[key] = Math.round(value * scale);
      } else {
        scaled[key] = Number((value * scale).toFixed(1));
      }
    }
  }
  return scaled;
}

function pickWeightedItem(rarity: Rarity) {
  const candidates = SEED_ITEMS.filter((i) => i.rarity === rarity && i.isActive);
  const items = candidates.length > 0 ? candidates : SEED_ITEMS.filter((i) => i.isActive);
  return items[Math.floor(Math.random() * items.length)];
}

function rollRarity(): Rarity {
  let roll = Math.random() * 100;
  let totalWeight = 0;
  for (const w of Object.values(RARITY_DRAW_WEIGHTS)) totalWeight += w;
  roll = Math.random() * totalWeight;

  for (const [rarity, weight] of Object.entries(RARITY_DRAW_WEIGHTS)) {
    roll -= weight;
    if (roll < 0) return rarity as Rarity;
  }
  return "common";
}

// 1. 장비 도감 시딩
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

// 현재 게임은 고정 20명 × 가방 20칸으로 최대 400개 인스턴스만 존재한다.
// 카탈로그의 밸런스를 변경할 때 보유 장비 효과도 레벨을 유지한 채 안전하게 동기화한다.
export const syncPersistentItemBalance = mutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("playerItems").take(500);
    let updated = 0;
    for (const item of items) {
      const catalogItem = SEED_ITEMS.find((entry) => entry.itemId === item.itemCatalogId);
      if (!catalogItem) continue;
      await ctx.db.patch(item._id, {
        name: catalogItem.name,
        rarity: catalogItem.rarity,
        effects: scaleEffects(catalogItem.effects, item.level),
      });
      updated += 1;
    }
    return { updated, inspected: items.length, complete: items.length < 500 };
  },
});

// 2. 장비 도감 전체 조회
export const listCatalog = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("persistentItemCatalog")
      .withIndex("by_itemId")
      .collect();
  },
});

// 3. 캐릭터 계정의 장비 가방 전체 로드
export const getCharacterItems = query({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    return await ctx.db
      .query("playerItems")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .collect();
  },
});

// 4. 장비 뽑기 상점 (1회: 100코인, 5회: 450코인)
export const drawPersistentItems = mutation({
  args: { characterId: v.string(), drawCount: v.number() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    if (args.drawCount !== 1 && args.drawCount !== 5) {
      throw new Error("가챠 횟수는 1회 또는 5회만 지원합니다.");
    }

    const progress = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    if (!progress) throw new Error("Character not found");

    const cost = args.drawCount === 1 ? 100 : 450;
    if (progress.coins < cost) throw new Error("코인이 부족합니다.");

    // 가방 인벤토리 초과 검증 (가방 한도: 20개)
    const currentItems = await ctx.db
      .query("playerItems")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .collect();
    if (currentItems.length + args.drawCount > 20) {
      throw new Error(`인벤토리 공간이 부족합니다. (현재 보유: ${currentItems.length}/20)`);
    }

    const now = Date.now();
    const drawnItems = [];

    for (let i = 0; i < args.drawCount; i++) {
      const rarity = rollRarity();
      const catalogItem = pickWeightedItem(rarity);

      // 인스턴스 장비 도큐먼트 생성
      const id = await ctx.db.insert("playerItems", {
        characterId: args.characterId,
        itemId: "", // 임시 공백
        itemCatalogId: catalogItem.itemId,
        name: catalogItem.name,
        rarity: catalogItem.rarity,
        level: 1,
        experience: 0,
        equippedSlot: 0,
        effects: catalogItem.effects,
        unlockedAt: now,
      });

      // itemId 컬럼에 고유 _id 값 갱신
      await ctx.db.patch(id, { itemId: id });
      
      const updatedItem = await ctx.db.get(id);
      if (updatedItem) drawnItems.push(updatedItem);
    }

    const nextCoins = progress.coins - cost;
    await ctx.db.patch(progress._id, {
      coins: nextCoins,
      updatedAt: now,
    });

    return { drawnItems, coins: nextCoins };
  },
});

// 5. 장비 장착 (슬롯 1~8)
export const equipPersistentItem = mutation({
  args: { characterId: v.string(), itemId: v.id("playerItems"), slot: v.number() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    if (args.slot < 1 || args.slot > 8) {
      throw new Error("올바르지 않은 슬롯 번호입니다. (1~8 슬롯만 가능)");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || item.characterId !== args.characterId) {
      throw new Error("소유하지 않은 아이템이거나 존재하지 않습니다.");
    }

    // 해당 슬롯에 이미 장착된 장비 해제
    const occupied = await ctx.db
      .query("playerItems")
      .withIndex("by_characterId_and_equippedSlot", (q) =>
        q.eq("characterId", args.characterId).eq("equippedSlot", args.slot)
      )
      .unique();
    if (occupied) {
      await ctx.db.patch(occupied._id, { equippedSlot: 0 });
    }

    // 대상 장비가 이미 다른 슬롯에 끼워져 있다면 이전 슬롯 해제
    if (item.equippedSlot > 0) {
      const allEquipped = await ctx.db
        .query("playerItems")
        .withIndex("by_characterId_and_equippedSlot", (q) =>
          q.eq("characterId", args.characterId).eq("equippedSlot", item.equippedSlot)
        )
        .unique();
      if (allEquipped && allEquipped._id === item._id) {
        await ctx.db.patch(allEquipped._id, { equippedSlot: 0 });
      }
    }

    // 장비 장착 완료
    await ctx.db.patch(item._id, { equippedSlot: args.slot });

    return { success: true, slot: args.slot, itemId: args.itemId };
  },
});

// 6. 장비 해제
export const clearPersistentItemSlot = mutation({
  args: { characterId: v.string(), slot: v.number() },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    if (args.slot < 1 || args.slot > 8) {
      throw new Error("올바르지 않은 슬롯 번호입니다. (1~8 슬롯만 가능)");
    }

    const item = await ctx.db
      .query("playerItems")
      .withIndex("by_characterId_and_equippedSlot", (q) =>
        q.eq("characterId", args.characterId).eq("equippedSlot", args.slot)
      )
      .unique();

    if (item) {
      await ctx.db.patch(item._id, { equippedSlot: 0 });
      return { success: true, clearedSlot: args.slot, itemId: item.itemId };
    }
    return { success: false, clearedSlot: args.slot, itemId: null };
  },
});

// 7. 장비 판매 (안쓰는 장비 판매하고 코인 회수)
export const sellItem = mutation({
  args: { characterId: v.string(), itemId: v.id("playerItems") },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    const item = await ctx.db.get(args.itemId);
    if (!item || item.characterId !== args.characterId) {
      throw new Error("소유하지 않은 장비이거나 존재하지 않습니다.");
    }
    if (item.equippedSlot > 0) {
      throw new Error("장착 중인 장비는 판매할 수 없습니다.");
    }

    const progress = await ctx.db
      .query("characterProgress")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .unique();
    if (!progress) throw new Error("Character not found");

    const sellValue = BASE_SELL_VALUE[item.rarity as Rarity] * item.level;
    await ctx.db.delete(item._id);

    const nextCoins = progress.coins + sellValue;
    await ctx.db.patch(progress._id, {
      coins: nextCoins,
      updatedAt: Date.now(),
    });

    return { success: true, coins: nextCoins, soldValue: sellValue };
  },
});

// 8. 제물 합성 강화 시스템
export const feedItem = mutation({
  args: {
    characterId: v.string(),
    targetItemId: v.id("playerItems"),
    materialItemIds: v.array(v.id("playerItems")),
  },
  handler: async (ctx, args) => {
    assertCharacterId(args.characterId);
    
    // 대상 장비 도큐먼트 검증
    const target = await ctx.db.get(args.targetItemId);
    if (!target || target.characterId !== args.characterId) {
      throw new Error("대상 강화 장비가 유효하지 않거나 본인 소유가 아닙니다.");
    }

    if (args.materialItemIds.length === 0) {
      throw new Error("제물로 사용할 장비를 선택해 주세요.");
    }

    let addedXp = 0;

    // 제물 장비 검증 및 누적 제공 경험치 계산
    for (const matId of args.materialItemIds) {
      if (matId === args.targetItemId) {
        throw new Error("강화 대상 장비를 제물로 사용할 수 없습니다.");
      }
      const matItem = await ctx.db.get(matId);
      if (!matItem || matItem.characterId !== args.characterId) {
        throw new Error("유효하지 않은 제물 장비가 포함되어 있습니다.");
      }
      if (matItem.equippedSlot > 0) {
        throw new Error("장착 중인 장비는 제물로 사용할 수 없습니다.");
      }

      // 제물 경험치 = 기본경험치 * 레벨
      addedXp += MATERIAL_XP[matItem.rarity as Rarity] * matItem.level;
      
      // 제물 아이템 가방에서 완전 삭제
      await ctx.db.delete(matItem._id);
    }

    const baseCatalogItem = SEED_ITEMS.find((s) => s.itemId === target.itemCatalogId);
    if (!baseCatalogItem) throw new Error("도감에 등록되지 않은 임의의 장비 카탈로그입니다.");

    let newLevel = target.level;
    let newExperience = target.experience + addedXp;

    // 레벨업 계산 루프
    while (true) {
      const required = itemXpRequired(newLevel);
      if (newExperience >= required) {
        newExperience -= required;
        newLevel += 1;
      } else {
        break;
      }
    }

    // 증가한 레벨에 따라 장비 효과(effects) 수치 증폭 적용
    const scaledEffects = scaleEffects(baseCatalogItem.effects, newLevel);

    // 주 장비 업데이트
    await ctx.db.patch(target._id, {
      level: newLevel,
      experience: newExperience,
      effects: scaledEffects,
    });

    return await ctx.db.get(target._id);
  },
});
