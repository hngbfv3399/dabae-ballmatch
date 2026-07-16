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
}

export interface PlayerItem {
  itemId: string;
  name: string;
  itemCatalogId: string;
  equippedSlot: number;
  effects: PersistentItemEffects;
  level: number;
  rarity: string;
  experience: number;
}

export function resolvePersistentItemEffects(
  playerItems: PlayerItem[]
): PersistentItemEffects {
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

  const equippedItems = playerItems.filter((item) => item.equippedSlot >= 1 && item.equippedSlot <= 8);

  for (const item of equippedItems) {
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
  // HP multiplier
  if (effects.maxHpMultiplier && effects.maxHpMultiplier !== 1) {
    state.maxHp = Math.round(state.maxHp * effects.maxHpMultiplier);
    state.hp = state.maxHp;
  }

  // Speed multiplier
  if (effects.speedMultiplier && effects.speedMultiplier !== 1) {
    state.speed = state.speed * Math.min(2.5, effects.speedMultiplier); // cap speed multiplier at 2.5
  }

  // Attack power multiplier
  if (effects.attackMultiplier && effects.attackMultiplier !== 1) {
    state.attackPower = Math.round(state.attackPower * effects.attackMultiplier);
  }

  // Range bonus
  if (effects.baseAttackRangeBonus) {
    state.baseAttackRange = state.baseAttackRange + effects.baseAttackRangeBonus;
  }

  // Defense shield bonus
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

export function getPersistentItemDisplayEffects(playerItems: PlayerItem[]): string[] {
  return playerItems
    .filter((item) => item.equippedSlot >= 1 && item.equippedSlot <= 8)
    .map((item) => `${item.name} (Lv.${item.level})`);
}
