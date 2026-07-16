import { api } from "../convex/_generated/api";
import { convexClient } from "./convexClient";
import { availableCharacters } from "./characterManager";
import {
  globalState,
  pveStartBtn,
  pveDungeonSelect,
  pveCharacterModal,
  pveCharacterList,
  pveCharacterSelectAvatar,
  pveCharacterSelectName,
  pveCharacterSelectStats,
  getPveProgress,
  getAvatarHTML,
  updateCoinsDisplay
} from "./globals";
import {
  createSlimeMeadowStage,
  SLIME_MEADOW_DUNGEON_ID,
  SLIME_MEADOW_STAGE_COUNT
} from "./pve/slimeDungeon";
import {
  createCollapsedLaboratoryStage,
  LABORATORY_DUNGEON_ID,
  LABORATORY_STAGE_COUNT
} from "./pve/labDungeon";
import {
  getLeveledHp,
  getLeveledDefenseShield,
  getExperienceLabel
} from "./rosterManager";
import {
  addPveRunAugment,
  addPveRunItem,
  createPveRunModifiers,
  getAllRunModifiers,
  rollPveAugmentChoices,
  rollPveItemChoices
} from "./maingame/runModifiers";
import type { RunModifierRarity } from "./maingame/runModifiers";
import type { PveRun } from "./globals";

export const PVE_DUNGEONS = {
  [SLIME_MEADOW_DUNGEON_ID]: {
    number: "01",
    name: "초원의 슬라임 소굴",
    description: "기본·빠른·단단한 슬라임을 돌파하는 화력 중심 던전입니다.",
    requiresFirstDungeonClear: false,
    stageCount: SLIME_MEADOW_STAGE_COUNT,
    createStage: createSlimeMeadowStage,
  },
  [LABORATORY_DUNGEON_ID]: {
    number: "02",
    name: "붕괴한 연구소",
    description: "예측 탄환을 피하며 드론과 포탑을 돌파하는 고난도 생존·포지셔닝 던전입니다.",
    requiresFirstDungeonClear: true,
    stageCount: LABORATORY_STAGE_COUNT,
    createStage: createCollapsedLaboratoryStage,
  },
} as const;

export function getPveDungeon(dungeonId: string) {
  const dungeon = PVE_DUNGEONS[dungeonId as keyof typeof PVE_DUNGEONS];
  if (!dungeon) throw new Error(`Unknown PvE dungeon: ${dungeonId}`);
  return dungeon;
}

export function updatePveDungeonUI() {
  const dungeon = getPveDungeon(pveDungeonSelect.value);
  const selectedProgress = globalState.selectedPveCharacterId ? getPveProgress(globalState.selectedPveCharacterId) : null;
  const isLocked = dungeon.requiresFirstDungeonClear === true && !selectedProgress?.unlockedDungeonIds?.includes(LABORATORY_DUNGEON_ID);
  const reward = globalState.pveDungeonRewards.get(pveDungeonSelect.value);

  const dungeonNumEl = document.getElementById("pve-dungeon-number");
  if (dungeonNumEl) dungeonNumEl.textContent = `DUNGEON · ${dungeon.number}`;

  const dungeonNameEl = document.getElementById("pve-dungeon-name");
  if (dungeonNameEl) dungeonNameEl.textContent = dungeon.name;

  const dungeonDescEl = document.getElementById("pve-dungeon-description");
  if (dungeonDescEl) {
    dungeonDescEl.textContent = isLocked
      ? "잠김 · 선택한 캐릭터로 초원의 슬라임 소굴을 1회 완주하면 해금됩니다."
      : `${dungeon.description} 각 스테이지를 클리어하면 즉시 경험치를 획득합니다.`;
  }

  const rewardCard = document.querySelector(".pve-reward-card");
  if (rewardCard) {
    rewardCard.innerHTML = reward
      ? `<span>첫 클리어</span><strong>${reward.firstClearExperience} XP</strong><small>반복 클리어 ${reward.repeatClearExperience} XP${dungeon.requiresFirstDungeonClear ? " · 던전 1 완주 필요" : ""}</small>`
      : `<span>던전 보상</span><strong>…</strong><small>서버 보상 설정을 불러오는 중입니다.</small>`;
  }
  pveStartBtn.disabled = !globalState.selectedPveCharacterId || isLocked;
}

export function initPveProgressSubscription() {
  void convexClient.mutation(api.progression.ensureInitialState, {});
  globalState.pveProgressUnsubscribe?.();

  if (globalState.currentCharacterId) {
    globalState.pveProgressUnsubscribe = convexClient.onUpdate(
      api.progression.getOverview,
      { characterId: globalState.currentCharacterId },
      (overview) => {
        if (!overview) return;
        globalState.pveProgressByCharacter.set(overview.character.characterId, overview.character as any);
        globalState.pveDungeonRewards.clear();
        overview.dungeons.forEach((d) => {
          globalState.pveDungeonRewards.set(d.dungeonId, d);
        });
        updatePveDungeonUI();
        if (globalState.currentCharacterId === overview.character.characterId) {
          selectPveCharacter(overview.character.characterId);
        }
      }
    );
  }
}

export function selectPveCharacter(characterId: string) {
  globalState.selectedPveCharacterId = characterId;
  const character = availableCharacters.find((c) => c.id === characterId);
  if (!character) return;

  if (pveCharacterSelectAvatar) {
    pveCharacterSelectAvatar.style.borderColor = character.color;
    pveCharacterSelectAvatar.style.boxShadow = `0 0 15px ${character.color}`;
    pveCharacterSelectAvatar.innerHTML = getAvatarHTML(character.name, character.image, "pve-select-avatar-img");
  }
  if (pveCharacterSelectName) {
    pveCharacterSelectName.textContent = character.name;
    pveCharacterSelectName.style.color = character.color;
  }

  const progress = getPveProgress(characterId);
  if (pveCharacterSelectStats) {
    pveCharacterSelectStats.textContent = `LV ${progress.level}  |  ${getExperienceLabel(progress)}`;
  }
  updatePveDungeonUI();
  pveCharacterModal?.classList.add("hidden");
}

export function renderPveCharacterModalList() {
  if (!pveCharacterList) return;
  const characterList = pveCharacterList;
  characterList.innerHTML = "";

  availableCharacters.forEach((char) => {
    const progress = getPveProgress(char.id);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `pve-char-card ${globalState.selectedPveCharacterId === char.id ? "active" : ""}`;
    card.style.setProperty("--char-color", char.color);

    card.innerHTML = `
      ${getAvatarHTML(char.name, char.image, "pve-char-card-img")}
      <div>
        <strong>${char.name}</strong>
        <small>LV ${progress.level}</small>
      </div>
    `;
    card.onclick = () => selectPveCharacter(char.id);
    characterList.appendChild(card);
  });
}

export function openPveCharacterModal() {
  pveCharacterModal?.classList.remove("hidden");
  renderPveCharacterModalList();
}

// Lazy loaded functions to avoid circular deps
let launchPveBattleRef: (run: PveRun) => void;
export function registerPveLauncher(launcher: (run: PveRun) => void) {
  launchPveBattleRef = launcher;
}

export function startPveDungeon() {
  if (!globalState.selectedPveCharacterId) return;
  const dungeonId = pveDungeonSelect.value;
  const progress = getPveProgress(globalState.selectedPveCharacterId);
  const maxHp = getLeveledHp(availableCharacters.find((c) => c.id === globalState.selectedPveCharacterId!)!.maxHp, progress.level);

  globalState.pveRun = {
    characterId: globalState.selectedPveCharacterId,
    dungeonId,
    stage: 1,
    startedAt: Date.now(),
    currentHp: maxHp,
    currentDefenseShield: getLeveledDefenseShield(availableCharacters.find((c) => c.id === globalState.selectedPveCharacterId!)!, progress.level),
    currentShield: 0,
    maxHp,
    rewardEligible: true,
    modifiers: createPveRunModifiers(),
  };

  launchPveBattleRef?.(globalState.pveRun);
}

export function renderPveRunModifiers() {
  const pveRunModifiersPanel = document.getElementById("pve-run-modifiers");
  if (!pveRunModifiersPanel || !globalState.pveRun) return;

  const augmentsMarkup = globalState.pveRun.modifiers.augments
    .map((aug) => `<span class="run-aug-badge rarity-${aug.rarity}">✦ ${aug.name}</span>`)
    .join(" ");

  const itemsMarkup = globalState.pveRun.modifiers.items
    .map((item) => `<span class="run-item-badge rarity-${item.rarity}">⚙️ ${item.name}</span>`)
    .join(" ");

  pveRunModifiersPanel.innerHTML = `
    <div style="font-family:'Orbit'; font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">획득한 던전 증강/아이템</div>
    <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
      ${augmentsMarkup || '<span style="color:var(--text-secondary); font-size:0.75rem;">아직 획득한 증강 없음</span>'}
      ${itemsMarkup}
    </div>
  `;
}

export function getPveRunSummaryMarkup(run: PveRun): string {
  const augs = run.modifiers.augments.map((a) => `<span class="rarity-${a.rarity}">${a.name}</span>`).join(", ");
  const items = run.modifiers.items.map((i) => `<span class="rarity-${i.rarity}">${i.name}</span>`).join(", ");
  return `<strong>획득 증강:</strong> ${augs || "없음"}<br><strong>획득 장비:</strong> ${items || "없음"}`;
}

export function getPveRunMaximumHp(run: PveRun): number {
  const character = availableCharacters.find((c) => c.id === run.characterId)!;
  const progress = getPveProgress(character.id);
  const baseHp = getLeveledHp(character.maxHp, progress.level);
  const maxHpMultiplier = getAllRunModifiers(run.modifiers).reduce(
    (multiplier, modifier) => multiplier * (modifier.effects?.maxHpMultiplier ?? 1),
    1,
  );
  return Math.ceil(baseHp * maxHpMultiplier);
}

export function getPveAugmentContext(run: PveRun) {
  const character = availableCharacters.find((c) => c.id === run.characterId)!;
  return {
    characterId: character.id,
    equippedSkillNames: [character.skillName],
    dungeonId: run.dungeonId,
    stage: run.stage,
  };
}

export function applyPveRunSelectionEffect(
  run: PveRun,
  effects: { maxHpMultiplier?: number; instantHealPercent?: number; shieldPercent?: number } | undefined
) {
  const maxHp = getPveRunMaximumHp(run);
  if (effects?.instantHealPercent) {
    run.currentHp = Math.min(maxHp, run.currentHp + Math.ceil(maxHp * effects.instantHealPercent));
  }
}

export function getPveAugmentRarityForClearedStage(
  stageNumber: number
): Extract<RunModifierRarity, "silver" | "gold" | "platinum"> | null {
  if (stageNumber === 1 || stageNumber === 2) return "silver";
  if (stageNumber === 3 || stageNumber === 4) return "gold";
  if (stageNumber === 5) return "platinum";
  return null;
}

export function showAugmentChoice(run: PveRun, clearedStageNumber: number, onChoose: () => void) {
  const augmentChoiceModal = document.getElementById("augment-choice-modal") as HTMLElement;
  const augmentChoiceTier = document.getElementById("augment-choice-tier") as HTMLElement;
  const augmentChoiceTitle = document.getElementById("augment-choice-title") as HTMLElement;
  const augmentChoiceSubtitle = document.getElementById("augment-choice-subtitle") as HTMLElement;
  const augmentChoiceCards = document.getElementById("augment-choice-cards") as HTMLElement;
  if (!augmentChoiceModal || !augmentChoiceCards) return;

  const rarity = getPveAugmentRarityForClearedStage(clearedStageNumber);
  if (!rarity) {
    onChoose();
    return;
  }

  const choices = rollPveAugmentChoices(
    rarity,
    run.modifiers.augments.map((augment) => augment.id),
    clearedStageNumber,
    getPveAugmentContext(run)
  );

  augmentChoiceTier.textContent = `${rarity.toUpperCase()} AUGMENT`;
  augmentChoiceTier.className = `augment-tier-label rarity-${rarity}`;
  augmentChoiceTitle.textContent = "스테이지 돌파 증강 선택";
  augmentChoiceSubtitle.textContent = "현재 던전 런 동안 유지되는 강력한 시너지 효과를 고르세요.";
  augmentChoiceCards.innerHTML = "";

  choices.forEach((choice) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `augment-choice-card rarity-${choice.rarity}`;
    card.innerHTML = `
      <div class="augment-card-header">
        <strong>${choice.name}</strong>
        <span class="rarity-${choice.rarity}">${choice.rarity.toUpperCase()}</span>
      </div>
      <p class="augment-card-desc">${choice.description}</p>
    `;
    card.onclick = () => {
      addPveRunAugment(run.modifiers, choice);
      applyPveRunSelectionEffect(run, choice.effects);
      renderPveRunModifiers();
      augmentChoiceModal.classList.add("hidden");
      onChoose();
    };
    augmentChoiceCards.appendChild(card);
  });

  augmentChoiceModal.classList.remove("hidden");
}

export function showItemChoice(run: PveRun, clearedStageNumber: number, onChoose: () => void) {
  const augmentChoiceModal = document.getElementById("augment-choice-modal") as HTMLElement;
  const augmentChoiceTier = document.getElementById("augment-choice-tier") as HTMLElement;
  const augmentChoiceTitle = document.getElementById("augment-choice-title") as HTMLElement;
  const augmentChoiceSubtitle = document.getElementById("augment-choice-subtitle") as HTMLElement;
  const augmentChoiceCards = document.getElementById("augment-choice-cards") as HTMLElement;
  if (!augmentChoiceModal || !augmentChoiceCards) return;

  const rarity = getPveAugmentRarityForClearedStage(clearedStageNumber);
  if (!rarity) {
    onChoose();
    return;
  }

  const itemRarity = rarity === "silver" ? "common" : rarity === "gold" ? "rare" : "epic";
  const choices = rollPveItemChoices(
    itemRarity,
    run.modifiers.items.map((item) => item.id),
    clearedStageNumber
  );

  augmentChoiceTier.textContent = `${rarity.toUpperCase()} GEAR ITEM`;
  augmentChoiceTier.className = `augment-tier-label rarity-${rarity}`;
  augmentChoiceTitle.textContent = "스테이지 돌파 장비 획득";
  augmentChoiceSubtitle.textContent = "던전 생존력을 올려줄 임시 모험 기어를 추가하세요.";
  augmentChoiceCards.innerHTML = "";

  choices.forEach((choice) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `augment-choice-card rarity-${choice.rarity}`;
    card.innerHTML = `
      <div class="augment-card-header">
        <strong>⚙️ ${choice.name}</strong>
        <span class="rarity-${choice.rarity}">${choice.rarity.toUpperCase()}</span>
      </div>
      <p class="augment-card-desc">${choice.description}</p>
    `;
    card.onclick = () => {
      addPveRunItem(run.modifiers, choice);
      applyPveRunSelectionEffect(run, choice.effects);
      renderPveRunModifiers();
      augmentChoiceModal.classList.add("hidden");
      onChoose();
    };
    augmentChoiceCards.appendChild(card);
  });

  augmentChoiceModal.classList.remove("hidden");
}

export async function recordPveStageExperience(run: PveRun, stageNumber: number) {
  try {
    const result = await convexClient.mutation(api.progression.recordDungeonStageClear, {
      characterId: run.characterId,
      dungeonId: run.dungeonId,
      stageNumber,
    });
    updateCoinsDisplay(result.coins);
    if (globalState.currentCharacterProgress) {
      globalState.currentCharacterProgress.coins = result.coins;
    }
    return result;
  } catch (err) {
    console.error("Failed to record stage clear experience:", err);
    return null;
  }
}
