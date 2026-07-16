import type { CharacterState } from "../characters/character.interface";

export type RunModifierKind = "augment" | "item";
export type RunModifierRarity = "silver" | "gold" | "platinum" | "common" | "rare" | "epic";

export interface RunModifier {
  id: string;
  kind: RunModifierKind;
  rarity: RunModifierRarity;
  name: string;
  description: string;
  icon: string;
  stacks: number;
  acquiredAtStage: number;
  effects?: RunModifierEffects;
  requirements?: PveAugmentRequirements;
  minStage?: number;
  dungeonIds?: readonly string[];
  weight?: number;
}

export interface RunModifierEffects {
  maxHpMultiplier?: number;
  attackMultiplier?: number;
  speedMultiplier?: number;
  skillChargeMultiplier?: number;
  instantHealPercent?: number;
  shieldPercent?: number;
  orbitDamage?: number;
  orbitRadius?: number;
  orbitInterval?: number;
  companionDamage?: number;
  companionRange?: number;
  companionInterval?: number;
}

export interface PveAugmentRequirements {
  characterId?: string;
  equippedSkillName?: string;
}

export interface PveAugmentContext {
  characterId: string;
  equippedSkillNames: readonly string[];
  dungeonId?: string;
  stage?: number;
}

type AugmentDefinition = Omit<RunModifier, "kind" | "stacks" | "acquiredAtStage">;

const PVE_AUGMENTS: readonly AugmentDefinition[] = [
  { id: "silver-aim", rarity: "silver", name: "정밀 조준", description: "공격력이 25% 증가합니다.", icon: "◈", effects: { attackMultiplier: 1.25 } },
  { id: "silver-vital", rarity: "silver", name: "생명 증폭", description: "최대 체력이 30% 증가하고 체력을 모두 회복합니다.", icon: "✚", effects: { maxHpMultiplier: 1.3 } },
  { id: "silver-charge", rarity: "silver", name: "급속 충전", description: "스킬 게이지 충전 속도가 35% 증가합니다.", icon: "ϟ", effects: { skillChargeMultiplier: 1.35 } },
  { id: "silver-step", rarity: "silver", name: "경량 프레임", description: "이동 속도가 15% 증가합니다.", icon: "➤", effects: { speedMultiplier: 1.15 } },
  { id: "silver-scout-pet", rarity: "silver", name: "정찰 드론", description: "동행 드론이 가까운 적에게 1.2초마다 9 피해를 줍니다.", icon: "🐾", effects: { companionDamage: 9, companionRange: 170, companionInterval: 1.2 }, dungeonIds: ["survival"] },
  { id: "gold-overdrive", rarity: "gold", name: "과부하", description: "공격력이 40%, 이동 속도가 12% 증가합니다.", icon: "✹", effects: { attackMultiplier: 1.4, speedMultiplier: 1.12 } },
  { id: "gold-bulwark", rarity: "gold", name: "강철 심장", description: "최대 체력이 45% 증가하고 체력을 모두 회복합니다.", icon: "⬟", effects: { maxHpMultiplier: 1.45 } },
  { id: "gold-reactor", rarity: "gold", name: "고출력 반응로", description: "스킬 충전 속도가 60%, 이동 속도가 15% 증가합니다.", icon: "◉", effects: { skillChargeMultiplier: 1.6, speedMultiplier: 1.15 } },
  { id: "gold-hunter", rarity: "gold", name: "사냥 본능", description: "공격력이 30%, 스킬 충전 속도가 20% 증가합니다.", icon: "⚔", effects: { attackMultiplier: 1.3, skillChargeMultiplier: 1.2 } },
  { id: "gold-orbit-blade", rarity: "gold", name: "회전 절단기", description: "주변 96px의 적에게 0.85초마다 13 피해를 줍니다.", icon: "🌀", effects: { orbitDamage: 13, orbitRadius: 96, orbitInterval: .85 }, dungeonIds: ["survival"] },
  { id: "platinum-titan", rarity: "platinum", name: "거인의 심장", description: "최대 체력이 60%, 공격력이 25% 증가하고 체력을 모두 회복합니다.", icon: "♛", effects: { maxHpMultiplier: 1.6, attackMultiplier: 1.25 } },
  { id: "platinum-apex", rarity: "platinum", name: "극한의 각성", description: "공격력이 65% 증가합니다.", icon: "✦", effects: { attackMultiplier: 1.65 } },
  { id: "platinum-time", rarity: "platinum", name: "시간 가속", description: "스킬 충전 속도가 90%, 이동 속도가 25% 증가합니다.", icon: "⌛", effects: { skillChargeMultiplier: 1.9, speedMultiplier: 1.25 } },
  { id: "platinum-perfect", rarity: "platinum", name: "완전한 조율", description: "최대 체력 35%, 공격력 40%가 증가하고 체력을 모두 회복합니다.", icon: "☼", effects: { maxHpMultiplier: 1.35, attackMultiplier: 1.4 } },
  { id: "platinum-sentry-pack", rarity: "platinum", name: "쌍둥이 수호 펫", description: "수호 펫이 0.7초마다 24 피해를 주고, 최대 체력이 20% 증가합니다.", icon: "🦾", effects: { companionDamage: 24, companionRange: 245, companionInterval: .7, maxHpMultiplier: 1.2 }, dungeonIds: ["survival"] },
];

const PVE_ITEMS: readonly AugmentDefinition[] = [
  { id: "item-field-medkit", rarity: "common", name: "야전 구급상자", description: "현재 체력을 최대 체력의 35%만큼 회복합니다.", icon: "🩹", effects: { instantHealPercent: 0.35 } },
  { id: "item-charge-cell", rarity: "common", name: "충전 셀", description: "스킬 게이지 충전 속도가 25% 증가합니다.", icon: "🔋", effects: { skillChargeMultiplier: 1.25 } },
  { id: "item-combat-chip", rarity: "common", name: "전투 칩", description: "공격력이 18% 증가합니다.", icon: "▣", effects: { attackMultiplier: 1.18 } },
  { id: "item-light-boots", rarity: "common", name: "경량 부츠", description: "이동 속도가 15% 증가합니다.", icon: "👟", effects: { speedMultiplier: 1.15 } },
  { id: "item-barrier-pack", rarity: "common", name: "방벽 팩", description: "최대 체력의 25%만큼 보호막을 얻습니다.", icon: "🛡", effects: { shieldPercent: 0.25 } },
  { id: "item-emergency-kit", rarity: "rare", name: "응급 처치 키트", description: "현재 체력을 최대 체력의 65%만큼 회복합니다.", icon: "⛑", effects: { instantHealPercent: 0.65 } },
  { id: "item-overclock-core", rarity: "rare", name: "오버클럭 코어", description: "공격력이 20%, 스킬 게이지 충전 속도가 45% 증가합니다.", icon: "⚡", effects: { attackMultiplier: 1.2, skillChargeMultiplier: 1.45 } },
  { id: "item-thruster", rarity: "rare", name: "추진 엔진", description: "이동 속도가 30%, 공격력이 15% 증가합니다.", icon: "🚀", effects: { speedMultiplier: 1.3, attackMultiplier: 1.15 } },
  { id: "item-fortress-shell", rarity: "rare", name: "요새 외피", description: "최대 체력이 15% 증가하고, 최대 체력의 55%만큼 보호막을 얻습니다.", icon: "⬢", effects: { maxHpMultiplier: 1.15, shieldPercent: 0.55 } },
  { id: "item-execution-module", rarity: "rare", name: "처형 모듈", description: "공격력이 42% 증가합니다.", icon: "⚔", effects: { attackMultiplier: 1.42 } },
];

export interface PveRunModifiers {
  augments: RunModifier[];
  items: RunModifier[];
}

export function createPveRunModifiers(): PveRunModifiers {
  return { augments: [], items: [] };
}

/**
 * UI·밸런스 도구가 전투와 동일한 증강 풀을 읽을 때 사용한다.
 * 반환값은 새 객체이므로 테스트 화면에서 선택 상태를 바꿔도 원본 카탈로그는 변하지 않는다.
 */
export function getAvailablePveAugments(context: PveAugmentContext): RunModifier[] {
  return PVE_AUGMENTS
    .filter((augment) => matchesAugmentContext(augment, context))
    .map((augment) => ({ ...augment, kind: "augment", stacks: 1, acquiredAtStage: context.stage ?? 1 }));
}

export function getAllRunModifiers(modifiers: PveRunModifiers): RunModifier[] {
  return [...modifiers.augments, ...modifiers.items];
}

export function clearPveRunModifiers(modifiers: PveRunModifiers): void {
  modifiers.augments.length = 0;
  modifiers.items.length = 0;
}

function shuffle<T>(entries: readonly T[]): T[] {
  const shuffled = [...entries];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function matchesAugmentContext(augment: AugmentDefinition, context: PveAugmentContext): boolean {
  if (augment.minStage !== undefined && context.stage !== undefined && context.stage < augment.minStage) {
    return false;
  }
  if (augment.dungeonIds && context.dungeonId && !augment.dungeonIds.includes(context.dungeonId)) {
    return false;
  }
  const requirements = augment.requirements;
  if (!requirements) return true;
  return (!requirements.characterId || requirements.characterId === context.characterId)
    && (!requirements.equippedSkillName || context.equippedSkillNames.includes(requirements.equippedSkillName));
}

export function rollPveAugmentChoices(rarity: Extract<RunModifierRarity, "silver" | "gold" | "platinum">, selectedIds: readonly string[], acquiredAtStage: number, context: PveAugmentContext): RunModifier[] {
  const selected = new Set(selectedIds);
  // 무한 생존전은 증강 풀이 모두 소진된 뒤에도 같은 증강을 중첩 선택할 수 있다.
  const allowStacks = context.dungeonId === "survival";
  const eligible = PVE_AUGMENTS.filter((augment) => augment.rarity === rarity && (allowStacks || !selected.has(augment.id)) && matchesAugmentContext(augment, context));
  const characterSkillChoices = shuffle(eligible.filter((augment) => augment.requirements));
  const commonChoices = shuffle(eligible.filter((augment) => !augment.requirements));
  const choices = [...characterSkillChoices.slice(0, 1), ...commonChoices].slice(0, 3);
  return shuffle(choices).map((augment) => ({ ...augment, kind: "augment", stacks: 1, acquiredAtStage }));
}

export function addPveRunAugment(modifiers: PveRunModifiers, augment: RunModifier): void {
  if (augment.kind !== "augment") return;
  const existing = modifiers.augments.find((entry) => entry.id === augment.id);
  if (existing) {
    existing.stacks += augment.stacks;
    return;
  }
  modifiers.augments.push(augment);
}

export function rollPveItemChoices(rarity: Extract<RunModifierRarity, "common" | "rare" | "epic">, selectedIds: readonly string[], acquiredAtStage: number): RunModifier[] {
  const selected = new Set(selectedIds);
  return shuffle(PVE_ITEMS.filter((item) => item.rarity === rarity && !selected.has(item.id)))
    .slice(0, 3)
    .map((item) => ({ ...item, kind: "item", stacks: 1, acquiredAtStage }));
}

export function addPveRunItem(modifiers: PveRunModifiers, item: RunModifier): void {
  if (item.kind !== "item" || modifiers.items.length >= 3 || modifiers.items.some((entry) => entry.id === item.id)) return;
  modifiers.items.push(item);
}

export function applyPveRunModifierStats(state: CharacterState, modifiers: PveRunModifiers): void {
  for (const modifier of getAllRunModifiers(modifiers)) {
    const effects = modifier.effects;
    if (!effects) continue;
    for (let stack = 0; stack < modifier.stacks; stack += 1) {
      state.maxHp *= effects.maxHpMultiplier ?? 1;
      state.attackPower *= effects.attackMultiplier ?? 1;
      state.speed *= effects.speedMultiplier ?? 1;
      state.skillChargeRate *= effects.skillChargeMultiplier ?? 1;
    }
    if (effects.orbitDamage && effects.orbitRadius && effects.orbitInterval) {
      state.persistentItemOrbitDamage = Math.max(state.persistentItemOrbitDamage ?? 0, effects.orbitDamage * modifier.stacks);
      state.persistentItemOrbitRadius = Math.max(state.persistentItemOrbitRadius ?? 0, effects.orbitRadius);
      state.persistentItemOrbitInterval = Math.min(state.persistentItemOrbitInterval ?? Infinity, effects.orbitInterval);
      state.persistentItemOrbitTimer = 0;
    }
    if (effects.companionDamage && effects.companionRange && effects.companionInterval) {
      state.runCompanionDamage = Math.max(state.runCompanionDamage ?? 0, effects.companionDamage * modifier.stacks);
      state.runCompanionRange = Math.max(state.runCompanionRange ?? 0, effects.companionRange);
      state.runCompanionInterval = Math.min(state.runCompanionInterval ?? Infinity, effects.companionInterval);
      state.runCompanionTimer = 0;
    }
  }
  state.maxHp = Math.round(state.maxHp);
  state.attackPower = Math.round(state.attackPower);
}
