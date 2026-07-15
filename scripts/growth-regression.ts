import { availableCharacters, createCharacterState } from "../src/characterManager.ts";
import {
  addPveRunAugment,
  applyPveRunModifierStats,
  clearPveRunModifiers,
  createPveRunModifiers,
  type RunModifier,
} from "../src/maingame/runModifiers.ts";

const character = availableCharacters.find((entry) => entry.id === "doyun");
if (!character) throw new Error("Regression fixture character is missing.");

const permanentLevel = 12;
const getLevelStatSteps = (level: number) => Math.max(0, (level - 1) - Math.floor(level / 5));
const getLeveledHp = (baseHp: number) => Math.ceil(baseHp * (1 + 0.02 * getLevelStatSteps(permanentLevel)));
const getLeveledAttack = (baseAttack: number) => Math.ceil(baseAttack * (1 + 0.0125 * getLevelStatSteps(permanentLevel)));
const getLeveledDefenseShield = () => Math.round((character.defense ?? 0) + getLevelStatSteps(permanentLevel));

function createPermanentlyGrownState() {
  const state = createCharacterState(character, 0, 1, 1280, 720);
  state.maxHp = getLeveledHp(character.maxHp);
  state.hp = state.maxHp;
  state.attackPower = getLeveledAttack(character.attackPower);
  state.maxDefenseShield = getLeveledDefenseShield();
  state.defenseShield = state.maxDefenseShield;
  return state;
}

const firstRun = createPermanentlyGrownState();
const permanentSnapshot = {
  maxHp: firstRun.maxHp,
  attackPower: firstRun.attackPower,
  defenseShield: firstRun.defenseShield,
};
const modifiers = createPveRunModifiers();
const testAugment: RunModifier = {
  id: "regression-attack-augment",
  kind: "augment",
  rarity: "silver",
  name: "회귀 테스트 증강",
  description: "런 전용 공격력 증가 검증용입니다.",
  icon: "✓",
  stacks: 1,
  acquiredAtStage: 1,
  effects: { attackMultiplier: 1.25, maxHpMultiplier: 1.2 },
};

addPveRunAugment(modifiers, testAugment);
applyPveRunModifierStats(firstRun, modifiers);
if (firstRun.maxHp !== Math.round(permanentSnapshot.maxHp * 1.2)) throw new Error("Run augment did not apply to max HP.");
if (firstRun.attackPower !== Math.round(permanentSnapshot.attackPower * 1.25)) throw new Error("Run augment did not apply to attack.");
if (firstRun.defenseShield !== permanentSnapshot.defenseShield) throw new Error("Run augment must not overwrite permanent defense shield.");

clearPveRunModifiers(modifiers);
if (modifiers.augments.length !== 0 || modifiers.items.length !== 0) throw new Error("Run modifiers were not cleared.");

const nextRun = createPermanentlyGrownState();
if (nextRun.maxHp !== permanentSnapshot.maxHp || nextRun.attackPower !== permanentSnapshot.attackPower) {
  throw new Error("Run-only stats leaked into the next permanently grown state.");
}
if (nextRun.defenseShield !== permanentSnapshot.defenseShield) {
  throw new Error("Permanent defense shield did not persist into the next run.");
}

console.log("Growth regression passed: permanent level stats persist; run modifiers apply once and reset.");
