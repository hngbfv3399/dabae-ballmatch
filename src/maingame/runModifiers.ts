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
}

export interface RunModifierEffects {
  maxHpMultiplier?: number;
  attackMultiplier?: number;
  speedMultiplier?: number;
  skillChargeMultiplier?: number;
  instantHealPercent?: number;
  shieldPercent?: number;
}

export interface PveAugmentRequirements {
  characterId?: string;
  equippedSkillName?: string;
}

export interface PveAugmentContext {
  characterId: string;
  equippedSkillNames: readonly string[];
}

type AugmentDefinition = Omit<RunModifier, "kind" | "stacks" | "acquiredAtStage">;

const PVE_AUGMENTS: readonly AugmentDefinition[] = [
  { id: "silver-aim", rarity: "silver", name: "정밀 조준", description: "공격력이 25% 증가합니다.", icon: "◈", effects: { attackMultiplier: 1.25 } },
  { id: "silver-vital", rarity: "silver", name: "생명 증폭", description: "최대 체력이 30% 증가하고 체력을 모두 회복합니다.", icon: "✚", effects: { maxHpMultiplier: 1.3 } },
  { id: "silver-charge", rarity: "silver", name: "급속 충전", description: "스킬 게이지 충전 속도가 35% 증가합니다.", icon: "ϟ", effects: { skillChargeMultiplier: 1.35 } },
  { id: "silver-step", rarity: "silver", name: "경량 프레임", description: "이동 속도가 15% 증가합니다.", icon: "➤", effects: { speedMultiplier: 1.15 } },
  { id: "gold-overdrive", rarity: "gold", name: "과부하", description: "공격력이 40%, 이동 속도가 12% 증가합니다.", icon: "✹", effects: { attackMultiplier: 1.4, speedMultiplier: 1.12 } },
  { id: "gold-bulwark", rarity: "gold", name: "강철 심장", description: "최대 체력이 45% 증가하고 체력을 모두 회복합니다.", icon: "⬟", effects: { maxHpMultiplier: 1.45 } },
  { id: "gold-reactor", rarity: "gold", name: "고출력 반응로", description: "스킬 충전 속도가 60%, 이동 속도가 15% 증가합니다.", icon: "◉", effects: { skillChargeMultiplier: 1.6, speedMultiplier: 1.15 } },
  { id: "gold-hunter", rarity: "gold", name: "사냥 본능", description: "공격력이 30%, 스킬 충전 속도가 20% 증가합니다.", icon: "⚔", effects: { attackMultiplier: 1.3, skillChargeMultiplier: 1.2 } },
  { id: "platinum-titan", rarity: "platinum", name: "거인의 심장", description: "최대 체력이 60%, 공격력이 25% 증가하고 체력을 모두 회복합니다.", icon: "♛", effects: { maxHpMultiplier: 1.6, attackMultiplier: 1.25 } },
  { id: "platinum-apex", rarity: "platinum", name: "극한의 각성", description: "공격력이 65% 증가합니다.", icon: "✦", effects: { attackMultiplier: 1.65 } },
  { id: "platinum-time", rarity: "platinum", name: "시간 가속", description: "스킬 충전 속도가 90%, 이동 속도가 25% 증가합니다.", icon: "⌛", effects: { skillChargeMultiplier: 1.9, speedMultiplier: 1.25 } },
  { id: "platinum-perfect", rarity: "platinum", name: "완전한 조율", description: "최대 체력 35%, 공격력 40%가 증가하고 체력을 모두 회복합니다.", icon: "☼", effects: { maxHpMultiplier: 1.35, attackMultiplier: 1.4 } },
  { id: "doyun-slam-silver", rarity: "silver", name: "슬램 예열", description: "불꽃 덩크슛 슬램의 충전 속도가 45% 증가합니다.", icon: "🏀", effects: { skillChargeMultiplier: 1.45 }, requirements: { characterId: "doyun", equippedSkillName: "불꽃 덩크슛 슬램" } },
  { id: "doyun-slam-gold", rarity: "gold", name: "불꽃 부스터", description: "불꽃 덩크슛 슬램의 충전 속도가 70%, 이동 속도가 10% 증가합니다.", icon: "🔥", effects: { skillChargeMultiplier: 1.7, speedMultiplier: 1.1 }, requirements: { characterId: "doyun", equippedSkillName: "불꽃 덩크슛 슬램" } },
  { id: "doyun-slam-platinum", rarity: "platinum", name: "코트의 지배자", description: "불꽃 덩크슛 슬램의 충전 속도가 100%, 최대 체력이 20% 증가하고 체력을 모두 회복합니다.", icon: "👑", effects: { skillChargeMultiplier: 2, maxHpMultiplier: 1.2 }, requirements: { characterId: "doyun", equippedSkillName: "불꽃 덩크슛 슬램" } },
  { id: "juju-hole-silver", rarity: "silver", name: "특이점 충전", description: "전술적 특이점 블랙홀의 충전 속도가 45% 증가합니다.", icon: "◉", effects: { skillChargeMultiplier: 1.45 }, requirements: { characterId: "juju", equippedSkillName: "전술적 특이점 블랙홀" } },
  { id: "juju-hole-gold", rarity: "gold", name: "중력 가속", description: "전술적 특이점 블랙홀의 충전 속도가 70%, 이동 속도가 10% 증가합니다.", icon: "🌀", effects: { skillChargeMultiplier: 1.7, speedMultiplier: 1.1 }, requirements: { characterId: "juju", equippedSkillName: "전술적 특이점 블랙홀" } },
  { id: "juju-hole-platinum", rarity: "platinum", name: "사건의 지평선", description: "전술적 특이점 블랙홀의 충전 속도가 100%, 최대 체력이 20% 증가하고 체력을 모두 회복합니다.", icon: "🌌", effects: { skillChargeMultiplier: 2, maxHpMultiplier: 1.2 }, requirements: { characterId: "juju", equippedSkillName: "전술적 특이점 블랙홀" } },
  { id: "es-grenade-silver", rarity: "silver", name: "점화 장치", description: "부착형 수류탄의 충전 속도가 45% 증가합니다.", icon: "💣", effects: { skillChargeMultiplier: 1.45 }, requirements: { characterId: "es", equippedSkillName: "부착형 수류탄" } },
  { id: "es-grenade-gold", rarity: "gold", name: "폭발 가속", description: "부착형 수류탄의 충전 속도가 70%, 이동 속도가 10% 증가합니다.", icon: "🧨", effects: { skillChargeMultiplier: 1.7, speedMultiplier: 1.1 }, requirements: { characterId: "es", equippedSkillName: "부착형 수류탄" } },
  { id: "es-grenade-platinum", rarity: "platinum", name: "폭탄의 왕", description: "부착형 수류탄의 충전 속도가 100%, 최대 체력이 20% 증가하고 체력을 모두 회복합니다.", icon: "💥", effects: { skillChargeMultiplier: 2, maxHpMultiplier: 1.2 }, requirements: { characterId: "es", equippedSkillName: "부착형 수류탄" } },
  { id: "puman-venom-silver", rarity: "silver", name: "독성 촉진", description: "독사의 맹독액 충전 속도가 45% 증가합니다.", icon: "☣", effects: { skillChargeMultiplier: 1.45 }, requirements: { characterId: "puman", equippedSkillName: "독사의 맹독액" } },
  { id: "puman-venom-gold", rarity: "gold", name: "맹독 순환", description: "독사의 맹독액 충전 속도가 70%, 이동 속도가 10% 증가합니다.", icon: "🐍", effects: { skillChargeMultiplier: 1.7, speedMultiplier: 1.1 }, requirements: { characterId: "puman", equippedSkillName: "독사의 맹독액" } },
  { id: "puman-venom-platinum", rarity: "platinum", name: "포식자의 혈청", description: "독사의 맹독액 충전 속도가 100%, 최대 체력이 20% 증가하고 체력을 모두 회복합니다.", icon: "🧪", effects: { skillChargeMultiplier: 2, maxHpMultiplier: 1.2 }, requirements: { characterId: "puman", equippedSkillName: "독사의 맹독액" } },
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
  const requirements = augment.requirements;
  if (!requirements) return true;
  return (!requirements.characterId || requirements.characterId === context.characterId)
    && (!requirements.equippedSkillName || context.equippedSkillNames.includes(requirements.equippedSkillName));
}

export function rollPveAugmentChoices(rarity: Extract<RunModifierRarity, "silver" | "gold" | "platinum">, selectedIds: readonly string[], acquiredAtStage: number, context: PveAugmentContext): RunModifier[] {
  const selected = new Set(selectedIds);
  const eligible = PVE_AUGMENTS.filter((augment) => augment.rarity === rarity && !selected.has(augment.id) && matchesAugmentContext(augment, context));
  const characterSkillChoices = shuffle(eligible.filter((augment) => augment.requirements));
  const commonChoices = shuffle(eligible.filter((augment) => !augment.requirements));
  const choices = [...characterSkillChoices.slice(0, 1), ...commonChoices].slice(0, 3);
  return shuffle(choices).map((augment) => ({ ...augment, kind: "augment", stacks: 1, acquiredAtStage }));
}

export function addPveRunAugment(modifiers: PveRunModifiers, augment: RunModifier): void {
  if (augment.kind !== "augment" || modifiers.augments.some((entry) => entry.id === augment.id)) return;
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
    state.maxHp *= effects.maxHpMultiplier ?? 1;
    state.attackPower *= effects.attackMultiplier ?? 1;
    state.speed *= effects.speedMultiplier ?? 1;
    state.skillChargeRate *= effects.skillChargeMultiplier ?? 1;
  }
  state.maxHp = Math.round(state.maxHp);
  state.attackPower = Math.round(state.attackPower);
}
