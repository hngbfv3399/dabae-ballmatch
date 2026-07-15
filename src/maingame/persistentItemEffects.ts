import type { CharacterState } from "../characters/character.interface";

export interface PersistentItemEffects {
  maxHpMultiplier?: number;
  speedMultiplier?: number;
  baseAttackRangeBonus?: number;
  defenseShieldBonus?: number;
}

export interface CatalogItem {
  itemId: string;
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "unique";
  characterId?: string;
  isActive: boolean;
  effects: PersistentItemEffects;
  isUnlocked?: boolean;
}

export interface CharacterItemLoadout {
  clientId: string;
  characterId: string;
  slot1ItemId?: string;
  slot2ItemId?: string;
  slot3ItemId?: string;
  updatedAt: number;
}

export function getEquippedPersistentItemIds(loadout: CharacterItemLoadout | undefined): string[] {
  if (!loadout) return [];
  const ids: string[] = [];
  if (loadout.slot1ItemId) ids.push(loadout.slot1ItemId);
  if (loadout.slot2ItemId) ids.push(loadout.slot2ItemId);
  if (loadout.slot3ItemId) ids.push(loadout.slot3ItemId);
  return ids;
}

export function resolvePersistentItemEffects(
  catalog: CatalogItem[],
  loadout: CharacterItemLoadout | undefined,
  characterId: string
): PersistentItemEffects {
  const equippedIds = getEquippedPersistentItemIds(loadout);
  const effects: PersistentItemEffects = {
    maxHpMultiplier: 1,
    speedMultiplier: 1,
    baseAttackRangeBonus: 0,
    defenseShieldBonus: 0,
  };

  for (const itemId of equippedIds) {
    const item = catalog.find((entry) => entry.itemId === itemId && entry.isActive);
    if (!item) continue;

    // Verify character restrictions if any
    if (item.characterId && item.characterId !== characterId) continue;

    if (item.effects.maxHpMultiplier) {
      effects.maxHpMultiplier = (effects.maxHpMultiplier ?? 1) * item.effects.maxHpMultiplier;
    }
    if (item.effects.speedMultiplier) {
      effects.speedMultiplier = (effects.speedMultiplier ?? 1) * item.effects.speedMultiplier;
    }
    if (item.effects.baseAttackRangeBonus) {
      effects.baseAttackRangeBonus = (effects.baseAttackRangeBonus ?? 0) + item.effects.baseAttackRangeBonus;
    }
    if (item.effects.defenseShieldBonus) {
      effects.defenseShieldBonus = (effects.defenseShieldBonus ?? 0) + item.effects.defenseShieldBonus;
    }
  }

  return effects;
}

export function applyPersistentItemStats(state: CharacterState, effects: PersistentItemEffects): void {
  // Apply max HP multiplier
  if (effects.maxHpMultiplier && effects.maxHpMultiplier !== 1) {
    state.maxHp = Math.round(state.maxHp * effects.maxHpMultiplier);
    state.hp = state.maxHp;
  }

  // Apply speed multiplier
  if (effects.speedMultiplier && effects.speedMultiplier !== 1) {
    state.speed = state.speed * effects.speedMultiplier;
  }

  // Apply base attack range bonus
  if (effects.baseAttackRangeBonus) {
    state.baseAttackRange = state.baseAttackRange + effects.baseAttackRangeBonus;
  }

  // Apply defense shield bonus
  if (effects.defenseShieldBonus) {
    state.maxDefenseShield = (state.maxDefenseShield ?? 0) + effects.defenseShieldBonus;
    state.defenseShield = state.maxDefenseShield;
  }
}

export function getPersistentItemDisplayEffects(catalog: CatalogItem[], loadout: CharacterItemLoadout | undefined, characterId: string): string[] {
  const equippedIds = getEquippedPersistentItemIds(loadout);
  const displays: string[] = [];

  for (const itemId of equippedIds) {
    const item = catalog.find((entry) => entry.itemId === itemId && entry.isActive);
    if (item) {
      if (item.characterId && item.characterId !== characterId) continue;
      displays.push(`${item.name} (${item.description})`);
    }
  }

  return displays;
}
