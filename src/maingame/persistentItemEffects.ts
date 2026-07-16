import type { CharacterState } from "../characters/character.interface";

export type OrbitSatelliteStyle = "drone" | "shard" | "nova" | "singularity";
export interface OrbitSatelliteDefinition {
  count: number;
  style: OrbitSatelliteStyle;
}

export interface PersistentItemEffects {
  maxHpBonus?: number;
  maxHpMultiplier?: number;
  speedMultiplier?: number;
  attackSpeedMultiplier?: number;
  attackPowerBonus?: number;
  attackMultiplier?: number;
  baseAttackRangeBonus?: number;
  defenseShieldBonus?: number;
  defenseBonus?: number;
  damageReductionMultiplier?: number;
  skillChargeRateMultiplier?: number;
  luckBonus?: number;
  criticalDamageMultiplier?: number;
  skillCastHealPercent?: number;
  orbitDamage?: number;
  orbitRadius?: number;
  orbitInterval?: number;
  orbitSatelliteCount?: number;
  orbitSatelliteStyle?: OrbitSatelliteStyle;
  orbitDamageBonus?: number;
  orbitRadiusBonus?: number;
  // 장착 아이템에서 해석한 전투 전용 결과값이며 DB에는 저장하지 않는다.
  orbitSatellites?: OrbitSatelliteDefinition[];
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
    maxHpBonus: 0,
    maxHpMultiplier: 1,
    speedMultiplier: 1,
    attackSpeedMultiplier: 1,
    attackPowerBonus: 0,
    attackMultiplier: 1,
    baseAttackRangeBonus: 0,
    defenseShieldBonus: 0,
    defenseBonus: 0,
    damageReductionMultiplier: 1,
    skillChargeRateMultiplier: 1,
    luckBonus: 0,
    criticalDamageMultiplier: 1,
    skillCastHealPercent: 0,
    orbitDamage: 0,
    orbitRadius: 0,
    orbitInterval: 0,
    orbitSatellites: [],
    orbitDamageBonus: 0,
    orbitRadiusBonus: 0,
    pulseDamage: 0,
    pulseRadius: 0,
    pulseInterval: 0,
  };

  const equippedItems = playerItems.filter((item) => item.equippedSlot >= 1 && item.equippedSlot <= 8);

  for (const item of equippedItems) {
    if (item.effects.maxHpBonus) {
      effects.maxHpBonus = (effects.maxHpBonus ?? 0) + item.effects.maxHpBonus;
    }
    if (item.effects.maxHpMultiplier) {
      effects.maxHpMultiplier = (effects.maxHpMultiplier ?? 1) * item.effects.maxHpMultiplier;
    }
    if (item.effects.speedMultiplier) {
      effects.speedMultiplier = (effects.speedMultiplier ?? 1) * item.effects.speedMultiplier;
    }
    if (item.effects.attackSpeedMultiplier) {
      effects.attackSpeedMultiplier = (effects.attackSpeedMultiplier ?? 1) * item.effects.attackSpeedMultiplier;
    }
    if (item.effects.attackMultiplier) {
      effects.attackMultiplier = (effects.attackMultiplier ?? 1) * item.effects.attackMultiplier;
    }
    if (item.effects.attackPowerBonus) {
      effects.attackPowerBonus = (effects.attackPowerBonus ?? 0) + item.effects.attackPowerBonus;
    }
    if (item.effects.baseAttackRangeBonus) {
      effects.baseAttackRangeBonus = (effects.baseAttackRangeBonus ?? 0) + item.effects.baseAttackRangeBonus;
    }
    if (item.effects.defenseShieldBonus) {
      effects.defenseShieldBonus = (effects.defenseShieldBonus ?? 0) + item.effects.defenseShieldBonus;
    }
    if (item.effects.defenseBonus) {
      effects.defenseBonus = (effects.defenseBonus ?? 0) + item.effects.defenseBonus;
    }
    if (item.effects.damageReductionMultiplier) {
      effects.damageReductionMultiplier = (effects.damageReductionMultiplier ?? 1) * item.effects.damageReductionMultiplier;
    }
    if (item.effects.skillChargeRateMultiplier) {
      effects.skillChargeRateMultiplier = (effects.skillChargeRateMultiplier ?? 1) * item.effects.skillChargeRateMultiplier;
    }
    if (item.effects.luckBonus) effects.luckBonus = (effects.luckBonus ?? 0) + item.effects.luckBonus;
    if (item.effects.criticalDamageMultiplier) {
      effects.criticalDamageMultiplier = (effects.criticalDamageMultiplier ?? 1) * item.effects.criticalDamageMultiplier;
    }
    if (item.effects.skillCastHealPercent) {
      effects.skillCastHealPercent = Math.max(effects.skillCastHealPercent ?? 0, item.effects.skillCastHealPercent);
    }
    if (item.effects.orbitDamage) effects.orbitDamage = (effects.orbitDamage ?? 0) + item.effects.orbitDamage;
    if (item.effects.orbitRadius) effects.orbitRadius = Math.max(effects.orbitRadius ?? 0, item.effects.orbitRadius);
    if (item.effects.orbitInterval) effects.orbitInterval = Math.min(effects.orbitInterval || Infinity, item.effects.orbitInterval);
    if (item.effects.orbitDamageBonus) effects.orbitDamageBonus = (effects.orbitDamageBonus ?? 0) + item.effects.orbitDamageBonus;
    if (item.effects.orbitRadiusBonus) effects.orbitRadiusBonus = (effects.orbitRadiusBonus ?? 0) + item.effects.orbitRadiusBonus;
    if (item.effects.orbitDamage && item.effects.orbitSatelliteStyle) {
      effects.orbitSatellites?.push({
        count: Math.max(1, item.effects.orbitSatelliteCount ?? 1),
        style: item.effects.orbitSatelliteStyle,
      });
    }
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
  if (effects.maxHpBonus) {
    state.maxHp += effects.maxHpBonus;
    state.hp = state.maxHp;
  }

  // Speed multiplier
  if (effects.speedMultiplier && effects.speedMultiplier !== 1) {
    state.speed = state.speed * Math.min(2.5, effects.speedMultiplier); // cap speed multiplier at 2.5
  }

  if (effects.attackSpeedMultiplier && effects.attackSpeedMultiplier !== 1) {
    state.attackSpeed = Math.max(0.35, (state.attackSpeed ?? 1.2) * effects.attackSpeedMultiplier);
  }

  // Attack power multiplier
  if (effects.attackMultiplier && effects.attackMultiplier !== 1) {
    state.attackPower = Math.round(state.attackPower * effects.attackMultiplier);
  }
  if (effects.attackPowerBonus) {
    state.attackPower += effects.attackPowerBonus;
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
  if (effects.defenseBonus) {
    state.persistentItemDefenseBonus = effects.defenseBonus;
  }

  if (effects.damageReductionMultiplier && effects.damageReductionMultiplier !== 1) {
    state.persistentItemDamageReductionMultiplier = effects.damageReductionMultiplier;
  }
  if (effects.skillChargeRateMultiplier && effects.skillChargeRateMultiplier !== 1) {
    state.skillChargeRate *= effects.skillChargeRateMultiplier;
  }
  if (effects.luckBonus) state.luck = (state.luck ?? 0) + effects.luckBonus;
  if (effects.criticalDamageMultiplier && effects.criticalDamageMultiplier !== 1) {
    state.persistentItemCriticalDamageMultiplier = effects.criticalDamageMultiplier;
  }
  if (effects.skillCastHealPercent) state.persistentItemSkillCastHealPercent = effects.skillCastHealPercent;
  if (effects.orbitDamage && effects.orbitRadius && effects.orbitInterval) {
    state.persistentItemOrbitDamage = effects.orbitDamage + (effects.orbitDamageBonus ?? 0);
    state.persistentItemOrbitRadius = effects.orbitRadius + (effects.orbitRadiusBonus ?? 0);
    state.persistentItemOrbitInterval = effects.orbitInterval;
    state.persistentItemOrbitTimer = 0;
    state.persistentItemOrbitSatellites = effects.orbitSatellites?.length
      ? effects.orbitSatellites
      : [{ count: 1, style: "shard" }];
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
