import type { CharacterState } from "../characters/character.interface";

export interface PersistentItemEffects {
  maxHpMultiplier?: number;
  speedMultiplier?: number;
  attackMultiplier?: number;
  baseAttackRangeBonus?: number;
  defenseShieldBonus?: number;
  damageReductionMultiplier?: number;
  skillChargeRateMultiplier?: number;
  orbitDamage?: number;
  orbitRadius?: number;
  orbitInterval?: number;
  pulseDamage?: number;
  pulseRadius?: number;
  pulseInterval?: number;
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
    attackMultiplier: 1,
    baseAttackRangeBonus: 0,
    defenseShieldBonus: 0,
    damageReductionMultiplier: 1,
    skillChargeRateMultiplier: 1,
    orbitDamage: 0,
    orbitRadius: 0,
    orbitInterval: 0,
    pulseDamage: 0,
    pulseRadius: 0,
    pulseInterval: 0,
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
    if (item.effects.attackMultiplier) {
      effects.attackMultiplier = (effects.attackMultiplier ?? 1) * item.effects.attackMultiplier;
    }
    if (item.effects.baseAttackRangeBonus) {
      effects.baseAttackRangeBonus = (effects.baseAttackRangeBonus ?? 0) + item.effects.baseAttackRangeBonus;
    }
    if (item.effects.defenseShieldBonus) {
      effects.defenseShieldBonus = (effects.defenseShieldBonus ?? 0) + item.effects.defenseShieldBonus;
    }
    if (item.effects.damageReductionMultiplier) {
      effects.damageReductionMultiplier = (effects.damageReductionMultiplier ?? 1) * item.effects.damageReductionMultiplier;
    }
    if (item.effects.skillChargeRateMultiplier) {
      effects.skillChargeRateMultiplier = (effects.skillChargeRateMultiplier ?? 1) * item.effects.skillChargeRateMultiplier;
    }
    if (item.effects.orbitDamage) effects.orbitDamage = (effects.orbitDamage ?? 0) + item.effects.orbitDamage;
    if (item.effects.orbitRadius) effects.orbitRadius = Math.max(effects.orbitRadius ?? 0, item.effects.orbitRadius);
    if (item.effects.orbitInterval) effects.orbitInterval = Math.min(effects.orbitInterval || Infinity, item.effects.orbitInterval);
    if (item.effects.pulseDamage) effects.pulseDamage = (effects.pulseDamage ?? 0) + item.effects.pulseDamage;
    if (item.effects.pulseRadius) effects.pulseRadius = Math.max(effects.pulseRadius ?? 0, item.effects.pulseRadius);
    if (item.effects.pulseInterval) effects.pulseInterval = Math.min(effects.pulseInterval || Infinity, item.effects.pulseInterval);
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

  if (effects.attackMultiplier && effects.attackMultiplier !== 1) {
    state.attackPower = Math.round(state.attackPower * effects.attackMultiplier);
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

  if (effects.damageReductionMultiplier && effects.damageReductionMultiplier !== 1) {
    state.persistentItemDamageReductionMultiplier = effects.damageReductionMultiplier;
  }
  if (effects.skillChargeRateMultiplier && effects.skillChargeRateMultiplier !== 1) {
    state.skillChargeRate *= effects.skillChargeRateMultiplier;
  }
  if (effects.orbitDamage && effects.orbitRadius && effects.orbitInterval) {
    state.persistentItemOrbitDamage = effects.orbitDamage;
    state.persistentItemOrbitRadius = effects.orbitRadius;
    state.persistentItemOrbitInterval = effects.orbitInterval;
    state.persistentItemOrbitTimer = 0;
  }
  if (effects.pulseDamage && effects.pulseRadius && effects.pulseInterval) {
    state.persistentItemPulseDamage = effects.pulseDamage;
    state.persistentItemPulseRadius = effects.pulseRadius;
    state.persistentItemPulseInterval = effects.pulseInterval;
    state.persistentItemPulseTimer = effects.pulseInterval;
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
