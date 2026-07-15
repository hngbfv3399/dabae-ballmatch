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
}

export interface RunModifierEffects {
  maxHpMultiplier?: number;
  attackMultiplier?: number;
  speedMultiplier?: number;
  skillChargeMultiplier?: number;
}

type AugmentDefinition = Omit<RunModifier, "kind" | "stacks" | "acquiredAtStage">;

const PVE_AUGMENTS: readonly AugmentDefinition[] = [
  { id: "silver-aim", rarity: "silver", name: "정밀 조준", description: "공격력이 25% 증가합니다.", icon: "◈", effects: { attackMultiplier: 1.25 } },
  { id: "silver-vital", rarity: "silver", name: "생명 증폭", description: "최대 체력이 30% 증가합니다.", icon: "✚", effects: { maxHpMultiplier: 1.3 } },
  { id: "silver-charge", rarity: "silver", name: "급속 충전", description: "스킬 게이지 충전 속도가 35% 증가합니다.", icon: "ϟ", effects: { skillChargeMultiplier: 1.35 } },
  { id: "silver-step", rarity: "silver", name: "경량 프레임", description: "이동 속도가 15% 증가합니다.", icon: "➤", effects: { speedMultiplier: 1.15 } },
  { id: "gold-overdrive", rarity: "gold", name: "과부하", description: "공격력이 40%, 이동 속도가 12% 증가합니다.", icon: "✹", effects: { attackMultiplier: 1.4, speedMultiplier: 1.12 } },
  { id: "gold-bulwark", rarity: "gold", name: "강철 심장", description: "최대 체력이 45% 증가합니다.", icon: "⬟", effects: { maxHpMultiplier: 1.45 } },
  { id: "gold-reactor", rarity: "gold", name: "고출력 반응로", description: "스킬 충전 속도가 60%, 이동 속도가 15% 증가합니다.", icon: "◉", effects: { skillChargeMultiplier: 1.6, speedMultiplier: 1.15 } },
  { id: "gold-hunter", rarity: "gold", name: "사냥 본능", description: "공격력이 30%, 스킬 충전 속도가 20% 증가합니다.", icon: "⚔", effects: { attackMultiplier: 1.3, skillChargeMultiplier: 1.2 } },
  { id: "platinum-titan", rarity: "platinum", name: "거인의 심장", description: "최대 체력이 60%, 공격력이 25% 증가합니다.", icon: "♛", effects: { maxHpMultiplier: 1.6, attackMultiplier: 1.25 } },
  { id: "platinum-apex", rarity: "platinum", name: "극한의 각성", description: "공격력이 65% 증가합니다.", icon: "✦", effects: { attackMultiplier: 1.65 } },
  { id: "platinum-time", rarity: "platinum", name: "시간 가속", description: "스킬 충전 속도가 90%, 이동 속도가 25% 증가합니다.", icon: "⌛", effects: { skillChargeMultiplier: 1.9, speedMultiplier: 1.25 } },
  { id: "platinum-perfect", rarity: "platinum", name: "완전한 조율", description: "최대 체력 35%, 공격력 40%가 증가합니다.", icon: "☼", effects: { maxHpMultiplier: 1.35, attackMultiplier: 1.4 } },
];

export interface PveRunModifiers {
  augments: RunModifier[];
  items: RunModifier[];
}

export function createPveRunModifiers(): PveRunModifiers {
  return { augments: [], items: [] };
}

export function getAllRunModifiers(modifiers: PveRunModifiers): RunModifier[] {
  return [...modifiers.augments, ...modifiers.items];
}

export function clearPveRunModifiers(modifiers: PveRunModifiers): void {
  modifiers.augments.length = 0;
  modifiers.items.length = 0;
}

export function rollPveAugmentChoices(rarity: Extract<RunModifierRarity, "silver" | "gold" | "platinum">, selectedIds: readonly string[], acquiredAtStage: number): RunModifier[] {
  const selected = new Set(selectedIds);
  const pool = PVE_AUGMENTS.filter((augment) => augment.rarity === rarity && !selected.has(augment.id));
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
  }
  return pool.slice(0, 3).map((augment) => ({ ...augment, kind: "augment", stacks: 1, acquiredAtStage }));
}

export function addPveRunAugment(modifiers: PveRunModifiers, augment: RunModifier): void {
  if (augment.kind !== "augment" || modifiers.augments.some((entry) => entry.id === augment.id)) return;
  modifiers.augments.push(augment);
}

export function applyPveRunModifierStats(state: CharacterState, modifiers: PveRunModifiers): void {
  for (const modifier of getAllRunModifiers(modifiers)) {
    const effects = modifier.effects;
    if (!effects) continue;
    state.maxHp *= effects.maxHpMultiplier ?? 1;
    state.attackPower *= effects.attackMultiplier ?? 1;
    state.speed *= effects.speedMultiplier ?? 1;
    state.skillChargeRate *= effects.skillChargeMultiplier ?? 1;
  }
  state.maxHp = Math.round(state.maxHp);
  state.attackPower = Math.round(state.attackPower);
}
