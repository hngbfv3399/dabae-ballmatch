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
}

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
