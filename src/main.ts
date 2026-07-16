import "./style.css";
import {
  availableBossCharacters,
  availableCharacters,
  createCharacterState,
} from "./characterManager";
import type { CharacterCosmeticStyle, CharacterState } from "./characters/character.interface";
import {
  defaultArena,
  getArenaForMatch,
  type ArenaConfig,
  type TeamGameType,
} from "./maps";
import { GameLounge } from "./maingame/gameLounge";
import { getCharacterStatusEffects } from "./maingame/statusEffects";
import { addPveRunAugment, addPveRunItem, applyPveRunModifierStats, clearPveRunModifiers, createPveRunModifiers, getAllRunModifiers, rollPveAugmentChoices, rollPveItemChoices, type PveRunModifiers, type RunModifierRarity } from "./maingame/runModifiers";
import { initPatchNotesSubscription, convexClient } from "./convexClient";
import { api } from "../convex/_generated/api";
import { createSlimeMeadowStage, SLIME_MEADOW_DUNGEON_ID, SLIME_MEADOW_STAGE_COUNT } from "./pve/slimeDungeon";
import { createCollapsedLaboratoryStage, LABORATORY_DUNGEON_ID, LABORATORY_STAGE_COUNT } from "./pve/labDungeon";
import {
  type CatalogItem,
  type PlayerItem,
  resolvePersistentItemEffects,
  applyPersistentItemStats
} from "./maingame/persistentItemEffects";


// DOM Elements
const lobbyView = document.getElementById("lobby-view") as HTMLElement;
const gameView = document.getElementById("game-view") as HTMLElement;
const characterListContainer = document.getElementById(
  "character-list",
) as HTMLElement;
const startBtn = document.getElementById("start-btn") as HTMLButtonElement;
const backToLobbyBtn = document.getElementById(
  "back-to-lobby-btn",
) as HTMLButtonElement;
const focusModeBtn = document.getElementById("focus-mode-btn") as HTMLButtonElement;
const gameCanvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const pveCommandPanel = document.getElementById("pve-command-panel") as HTMLElement;
const pvpSetupPanel = document.getElementById("pvp-setup-panel") as HTMLElement;
const pveCharacterSelectBtn = document.getElementById("pve-character-select-btn") as HTMLButtonElement | null;
const pveCharacterSelectAvatar = document.getElementById("pve-character-select-avatar") as HTMLElement | null;
const pveCharacterSelectName = document.getElementById("pve-character-select-name") as HTMLElement | null;
const pveCharacterSelectStats = document.getElementById("pve-character-select-stats") as HTMLElement | null;
const pveStartBtn = document.getElementById("pve-start-btn") as HTMLButtonElement;
const pveCharacterModal = document.getElementById("pve-character-modal") as HTMLElement | null;
const pveCharacterModalClose = document.getElementById("pve-character-modal-close") as HTMLButtonElement | null;
const pveCharacterList = document.getElementById("pve-character-list") as HTMLElement | null;
const pveDungeonSelect = document.getElementById("pve-dungeon-select") as HTMLSelectElement;

const matchSelectionSlots = document.getElementById("match-selection-slots") as HTMLElement;
const fillRandomSlotsBtn = document.getElementById("fill-random-slots-btn") as HTMLButtonElement;
const matchCharacterPickerModal = document.getElementById("match-character-picker-modal") as HTMLElement;
const matchCharacterPickerClose = document.getElementById("match-character-picker-close") as HTMLButtonElement;
const matchCharacterPickerList = document.getElementById("match-character-picker-list") as HTMLElement;
const matchCharacterPickerDetail = document.getElementById("match-character-picker-detail") as HTMLElement;
const rankingSeasonLabel = document.getElementById("ranking-season-label") as HTMLElement;
const rankingList = document.getElementById("ranking-list") as HTMLElement;
const openGameModeBtn = document.getElementById("open-game-finder-btn") as HTMLButtonElement;
const gameModeModal = document.getElementById("game-finder-modal") as HTMLElement;
const gameModeModalClose = document.getElementById("game-finder-modal-close") as HTMLButtonElement;
const pveSetupOverlay = document.getElementById("pve-setup-wrapper-overlay") as HTMLElement;
const pvpSetupOverlay = document.getElementById("pvp-setup-wrapper-overlay") as HTMLElement;
const pveSetupCloseBtn = document.getElementById("pve-setup-close") as HTMLButtonElement;
const pvpSetupCloseBtn = document.getElementById("pvp-setup-close") as HTMLButtonElement;
const gachaResult = document.getElementById("gacha-result") as HTMLElement;
const gachaTitle = document.getElementById("gacha-title") as HTMLElement;
const gachaTypeHelp = document.getElementById("gacha-type-help") as HTMLElement;
const gachaCatalog = document.getElementById("gacha-catalog") as HTMLElement;
const gachaPreview = document.getElementById("gacha-preview") as HTMLElement;
const gachaRevealModal = document.getElementById("gacha-reveal-modal") as HTMLElement;
const gachaRevealContent = document.getElementById("gacha-reveal-content") as HTMLElement;
const persistentItemRateModal = document.getElementById("persistent-item-rate-modal") as HTMLElement;
const persistentItemRateContent = document.getElementById("persistent-item-rate-content") as HTMLElement;

function applyArenaToCanvas(arena: ArenaConfig = defaultArena) {
  gameCanvas.width = arena.width;
  gameCanvas.height = arena.height;
  gameCanvas.style.backgroundColor = arena.backgroundColor;
}
const countdownOverlay = document.getElementById(
  "countdown-overlay",
) as HTMLElement;
const countdownNumber = document.getElementById(
  "countdown-number",
) as HTMLElement;
const gameStatusText = document.getElementById(
  "game-status-text",
) as HTMLElement;
const aliveCountEl = document.getElementById("alive-count") as HTMLElement;
const totalCountEl = document.getElementById("total-count") as HTMLElement;
const hudSidebar = document.getElementById("hud") as HTMLElement;
const hudList = document.getElementById("hud-list") as HTMLElement;
const pveRunModifiersPanel = document.getElementById("pve-run-modifiers") as HTMLElement;
const augmentChoiceModal = document.getElementById("augment-choice-modal") as HTMLElement;
const augmentChoiceTier = document.getElementById("augment-choice-tier") as HTMLElement;
const augmentChoiceTitle = document.getElementById("augment-choice-title") as HTMLElement;
const augmentChoiceSubtitle = document.getElementById("augment-choice-subtitle") as HTMLElement;
const augmentChoiceCards = document.getElementById("augment-choice-cards") as HTMLElement;
const hudToggleBtn = document.getElementById("hud-toggle-btn") as HTMLButtonElement;
const randomStartBtn = document.getElementById(
  "random-start-btn",
) as HTMLButtonElement | null;
const tierListNotice = document.getElementById(
  "tier-list-notice",
) as HTMLElement;
const tierRowsWrapper = document.getElementById(
  "tier-rows-wrapper",
) as HTMLElement;
const totalSimGamesEl = document.getElementById(
  "total-sim-games",
) as HTMLElement;
const teamGameTypeSelect = document.getElementById(
  "team-game-type",
) as HTMLSelectElement;
const teamGameTypeSetting = document.getElementById(
  "team-game-type-setting",
) as HTMLElement;
const tournamentHeader = document.getElementById("tournament-battle-header") as HTMLElement;

function setHudCollapsed(collapsed: boolean) {
  hudSidebar.classList.toggle("is-collapsed", collapsed);
  hudToggleBtn.setAttribute("aria-expanded", String(!collapsed));
  hudToggleBtn.textContent = collapsed ? "상태 보기" : "접기";
}

hudToggleBtn.addEventListener("click", () => {
  setHudCollapsed(!hudSidebar.classList.contains("is-collapsed"));
});

async function setFocusMode(enabled: boolean) {
  gameView.classList.toggle("is-focus-mode", enabled);
  focusModeBtn.textContent = enabled ? "✕ 전장 닫기" : "⛶ 전장 확대";
  focusModeBtn.setAttribute("aria-pressed", String(enabled));

  // 모바일은 전체 화면 API가 브라우저 UI와 충돌하면서 하단을 가리거나
  // 닫기 버튼에 닿지 못하는 경우가 있어, 스크롤 가능한 CSS 집중 모드만 사용한다.
  const isMobileFocus = window.matchMedia("(max-width: 700px)").matches;
  if (isMobileFocus) {
    if (enabled) gameView.scrollIntoView({ block: "start", behavior: "smooth" });
    return;
  }

  if (enabled) {
    try {
      await gameView.requestFullscreen?.();
      await screen.orientation?.lock?.("landscape");
    } catch {
      // 전체 화면/화면 회전이 제한된 브라우저에서는 CSS 집중 모드만 적용한다.
    }
  } else {
    try {
      await screen.orientation?.unlock?.();
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // 브라우저가 전체 화면 종료 API를 지원하지 않아도 UI는 정상 복귀한다.
    }
  }
}

focusModeBtn.addEventListener("click", () => {
  void setFocusMode(!gameView.classList.contains("is-focus-mode"));
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && gameView.classList.contains("is-focus-mode") && !window.matchMedia("(max-width: 700px)").matches) {
    void setFocusMode(false);
  }
});
const tournamentStatus = document.getElementById("tournament-status") as HTMLElement;

const openStatsBtn = document.getElementById(
  "open-stats-btn",
) as HTMLButtonElement;
const closeStatsBtn = document.getElementById(
  "close-stats-btn",
) as HTMLButtonElement;
const resetStatsBtn = document.getElementById(
  "reset-stats-btn",
) as HTMLButtonElement;
const statsCenterModal = document.getElementById(
  "stats-center-modal",
) as HTMLElement;
const damageRankingWrapper = document.getElementById(
  "damage-ranking-wrapper",
) as HTMLElement;
const emptyRoleNotice = document.getElementById(
  "empty-role-notice",
) as HTMLElement;
let lobbyTotalGames = 0;
let currentRoleFilter = "all";
let gameSpeedMultiplier = 1;
let selectedStatsMode = "solo";

// Winner Modal Elements
const winnerModal = document.getElementById("winner-modal") as HTMLElement;
const winnerInfo = document.getElementById("winner-info") as HTMLElement;
const modalCloseBtn = document.getElementById(
  "modal-close-btn",
) as HTMLButtonElement;

// Selected characters state
const selectedIds: Set<string> = new Set();
const selectedRedIds: Set<string> = new Set();
const selectedBlueIds: Set<string> = new Set();
let gameLounge: GameLounge | null = null;
let isPracticeMode = false;

// 게임 모드 상태 변수
type GameMode = "pve" | "solo" | "team" | "boss" | "tournament";
type TournamentMatch = { players: [string | null, string | null]; winnerId?: string };
type TournamentState = { rounds: TournamentMatch[][]; currentRound: number; championId?: string; awaitingNext: boolean };

let currentMode: GameMode = "pve";
let teamGameType: TeamGameType = "deathmatch";
let bossCharacterId: string | null = null;
const LARGE_SOLO_CHARACTER_RADIUS = 53;
const BOSS_CHALLENGER_COUNT = 4;
let tournamentState: TournamentState | null = null;
type PveProgress = { level: number; experience: number; experienceInCurrentLevel: number; experienceToNextLevel: number; isMaxLevel: boolean; healthMultiplier: number; attackMultiplier: number; defenseShieldBonus: number; unlockedSkillLevels?: number[]; nextSkillUnlockLevel?: number | null; totalDungeonClears: number; unlockedDungeonIds?: string[] };
type PveDungeonReward = { dungeonId: string; firstClearExperience: number; repeatClearExperience: number };
type PveRun = { characterId: string; dungeonId: string; stage: number; startedAt: number; currentHp: number; currentDefenseShield: number; currentShield: number; maxHp: number; rewardEligible: boolean; modifiers: PveRunModifiers };
let pveRun: PveRun | null = null;
let selectedPveCharacterId: string | null = null;
let pveProgressByCharacter = new Map<string, PveProgress>();
let pveProgressUnsubscribe: (() => void) | null = null;
let pveAdvancePending = false;
let pveDungeonRewards = new Map<string, PveDungeonReward>();

const PVE_DUNGEONS = {
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

function getPveDungeon(dungeonId: string) {
  const dungeon = PVE_DUNGEONS[dungeonId as keyof typeof PVE_DUNGEONS];
  if (!dungeon) throw new Error(`Unknown PvE dungeon: ${dungeonId}`);
  return dungeon;
}

function updatePveDungeonUI() {
  const dungeon = getPveDungeon(pveDungeonSelect.value);
  const selectedProgress = selectedPveCharacterId ? getPveProgress(selectedPveCharacterId) : null;
  const isLocked = dungeon.requiresFirstDungeonClear === true && !selectedProgress?.unlockedDungeonIds?.includes(LABORATORY_DUNGEON_ID);
  const reward = pveDungeonRewards.get(pveDungeonSelect.value);
  document.getElementById("pve-dungeon-number")!.textContent = `DUNGEON · ${dungeon.number}`;
  document.getElementById("pve-dungeon-name")!.textContent = dungeon.name;
  document.getElementById("pve-dungeon-description")!.textContent = isLocked
    ? "잠김 · 선택한 캐릭터로 초원의 슬라임 소굴을 1회 완주하면 해금됩니다."
    : `${dungeon.description} 각 스테이지를 클리어하면 즉시 경험치를 획득합니다.`;
  const rewardCard = document.querySelector(".pve-reward-card");
  if (rewardCard) rewardCard.innerHTML = reward
    ? `<span>첫 클리어</span><strong>${reward.firstClearExperience} XP</strong><small>반복 클리어 ${reward.repeatClearExperience} XP${dungeon.requiresFirstDungeonClear ? " · 던전 1 완주 필요" : ""}</small>`
    : `<span>던전 보상</span><strong>…</strong><small>서버 보상 설정을 불러오는 중입니다.</small>`;
  pveStartBtn.disabled = !selectedPveCharacterId || isLocked;
}
type Cosmetic = { cosmeticId: string; name: string; rarity: "common" | "rare" | "epic" | "legendary" | "unique"; isUnlocked: boolean; style: CharacterCosmeticStyle };
type VictoryAnimation = "wave" | "jump" | "clap" | "dance" | "trophy" | "fireworks" | "sniper";
type VictoryAction = { actionId: string; name: string; characterId?: string; rarity: Cosmetic["rarity"]; animation: VictoryAnimation; isUnlocked: boolean };
type VictoryBackground = { backgroundId: string; name: string; characterId?: string; rarity: Cosmetic["rarity"]; animation: VictoryAnimation; isUnlocked: boolean };
type VictorySpecialEvent = { specialEventId: string; name: string; characterId?: string; rarity: Cosmetic["rarity"]; effect: "sniper"; isUnlocked: boolean };
type GachaType = "skin" | "action" | "background" | "specialEvent";
let cosmeticCatalog: Cosmetic[] = [];
let victoryActionCatalog: VictoryAction[] = [];
let victoryBackgroundCatalog: VictoryBackground[] = [];
let victorySpecialEventCatalog: VictorySpecialEvent[] = [];
let cosmeticLoadouts = new Map<string, string>();
let equippedVictoryActionId: string | null = null;
let equippedVictoryBackgroundId: string | null = null;
let equippedVictorySpecialEventId: string | null = null;
let cosmeticCatalogUnsubscribe: (() => void) | null = null;
let cosmeticLoadoutUnsubscribe: (() => void) | null = null;
let victoryActionCatalogUnsubscribe: (() => void) | null = null;
let victoryBackgroundCatalogUnsubscribe: (() => void) | null = null;
let victorySpecialEventCatalogUnsubscribe: (() => void) | null = null;
let characterSkillsInvested = new Map<string, number>(); // skillId -> investedPoints
let skillsUnsubscribe: (() => void) | null = null;

// 영구 플레이어 아이템 관련 전역 상태
let persistentItemCatalog: CatalogItem[] = [];
let characterPlayerItems = new Map<string, PlayerItem[]>(); // characterId -> owned items
let persistentItemUnlocks = new Set<string>(); // Set of "characterId:itemId"
let persistentItemCatalogUnsubscribe: (() => void) | null = null;
let playerItemsUnsubscribe: (() => void) | null = null;

// v4 로그인 세션 상태
let currentCharacterId: string | null = localStorage.getItem("dambae-v4-character-id");
let currentCharacterProgress: any = null;
let progressUnsubscribe: (() => void) | null = null;
let selectedGrowthSubTab: "equipment" | "skills" = "equipment";
let selectedItemId: string | null = null;
let selectedFeedMaterialIds = new Set<string>();
let activeSkinTabType: "skin" | "action" | "background" | "specialEvent" = "skin";


let activeMatchSlot = -1;
let matchSlotIds: Array<string | null> = [];
const randomMatchSlotIndexes = new Set<number>();
let previewGachaCosmeticId: string | null = null;
let previewVictoryActionId: string | null = null;
let previewVictoryBackgroundId: string | null = null;
let previewVictorySpecialEventId: string | null = null;
let activeGachaType: GachaType = "skin";
let previewMatchCharacterId: string | null = null;
let isPickingPveCharacter = false;
type RankingEntry = { characterId: string; score: number; wins: number; games: number; draws: number; winRate: number };
type RankingSeason = { seasonId: string; startedAt: number; endsAt: number; status: string };
let activeRankingMode: "solo" | "team" | "tournament" = "solo";
let currentRankingEntries: RankingEntry[] = [];
let currentRankingSeason: RankingSeason | null = null;
let rankingUnsubscribe: (() => void) | null = null;





function applyEquippedCosmetic(state: CharacterState) {
  const cosmeticId = cosmeticLoadouts.get(state.id);
  const cosmetic = cosmeticCatalog.find((entry) => entry.cosmeticId === cosmeticId && entry.isUnlocked);
  if (cosmetic) state.cosmeticStyle = cosmetic.style;
  return state;
}

// 레벨 성장으로 계산되는 실제 전투 스탯은 항상 정수로 확정한다.
// 공격력이 0인 특수 캐릭터도 있으므로 고정 +1이 아닌, 양수 기본 스탯의 올림 보정을 사용한다.
function getLevelStatGrowthSteps(level: number): number {
  return Math.max(0, (level - 1) - Math.floor(level / 5));
}

function getLeveledHp(baseHp: number, progress: PveProgress): number {
  return Math.ceil(baseHp * (1 + 0.02 * getLevelStatGrowthSteps(progress.level)));
}

function getLeveledAttack(baseAttack: number, progress: PveProgress): number {
  return Math.ceil(baseAttack * (1 + 0.0125 * getLevelStatGrowthSteps(progress.level)));
}

function getLeveledDefenseShield(character: { defense?: number }, progress: PveProgress): number {
  return Math.max(0, Math.round((character.defense ?? 0) + getLevelStatGrowthSteps(progress.level)));
}

function getNextSkillUnlockLevel(level: number): number | null {
  if (level >= 30) return null;
  return Math.min(30, (Math.floor(level / 5) + 1) * 5);
}

function getExperienceLabel(progress: PveProgress): string {
  return progress.isMaxLevel ? "MAX" : `${progress.experienceInCurrentLevel} / ${progress.experienceToNextLevel} XP`;
}

function applyCharacterLevel(state: CharacterState) {
  const progress = getPveProgress(state.id);
  state.maxHp = getLeveledHp(state.maxHp, progress);
  state.hp = state.maxHp;
  state.attackPower = getLeveledAttack(state.attackPower, progress);
  state.maxDefenseShield = getLeveledDefenseShield(state, progress);
  state.defenseShield = state.maxDefenseShield;
  return state;
}

function getSkinVisualMarkup(
  style: CharacterCosmeticStyle,
  label: string,
  size: "icon" | "preview" | "management" | "reveal",
) {
  const contextClass = size === "reveal" ? " gacha-reveal-orb" : size === "preview" ? " gacha-preview-orb" : "";
  return `<span class="skin-visual skin-visual-${size}${contextClass} anim-${style.borderAnimation} trail-${style.trail}" aria-hidden="true"><i></i><i></i><i></i><b>${label}</b></span>`;
}

function getVictoryPlayerMarkup(player: { id: string; name: string; image?: string }): string {
  const cosmetic = cosmeticCatalog.find((entry) => entry.cosmeticId === cosmeticLoadouts.get(player.id) && entry.isUnlocked);
  if (!cosmetic) return getAvatarHTML(player.name, player.image, "mvp-avatar");
  const { style } = cosmetic;
  return `<span class="skin-visual skin-visual-victory anim-${style.borderAnimation} trail-${style.trail}" style="--skin-border:${style.borderColor};--skin-fill:${style.fillColor};--skin-text:${style.textColor};--skin-glow:${style.glowColor}" aria-label="${cosmetic.name} 스킨"><i></i><i></i><i></i>${getAvatarHTML(player.name, player.image, "victory-skin-avatar")}</span>`;
}

function renderGachaCatalog() {
  if (!gachaCatalog) return;
  gachaCatalog.innerHTML = "";
  if (activeGachaType === "action") {
    [...victoryActionCatalog].sort((a, b) => Number(Boolean(b.characterId)) - Number(Boolean(a.characterId))).forEach((action) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `gacha-skin-icon ceremony-catalog-icon ${action.isUnlocked ? "unlocked" : "locked"} ${previewVictoryActionId === action.actionId ? "active" : ""}`;
      card.dataset.ceremonyAnimation = action.animation;
      card.innerHTML = `${getCeremonyActionPreviewMarkup(action.animation)}<small class="rarity-${action.rarity}">${action.characterId === "su" ? "NEW · " : ""}${action.name}${action.characterId === "su" ? " · 수 전용" : ""}</small>`;
      card.addEventListener("click", () => { previewVictoryActionId = action.actionId; renderGachaCatalog(); });
      gachaCatalog.appendChild(card);
    });
    renderGachaPreview();
    return;
  }
  if (activeGachaType === "background") {
    [...victoryBackgroundCatalog].sort((a, b) => Number(Boolean(b.characterId)) - Number(Boolean(a.characterId))).forEach((background) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `gacha-skin-icon ceremony-catalog-icon ${background.isUnlocked ? "unlocked" : "locked"} ${previewVictoryBackgroundId === background.backgroundId ? "active" : ""}`;
      card.dataset.ceremonyAnimation = background.animation;
      card.innerHTML = `${getCeremonyBackgroundPreviewMarkup(background.animation)}<small class="rarity-${background.rarity}">${background.characterId === "su" ? "NEW · " : ""}${background.name}${background.characterId === "su" ? " · 수 전용" : ""}</small>`;
      card.addEventListener("click", () => { previewVictoryBackgroundId = background.backgroundId; renderGachaCatalog(); });
      gachaCatalog.appendChild(card);
    });
    renderGachaPreview();
    return;
  }
  if (activeGachaType === "specialEvent") {
    victorySpecialEventCatalog.forEach((specialEvent) => {
      const renderer = getSpecialEventRenderer(specialEvent);
      if (!renderer) return;
      const card = document.createElement("button");
      card.type = "button";
      card.className = `gacha-skin-icon ceremony-catalog-icon ${specialEvent.isUnlocked ? "unlocked" : "locked"} ${previewVictorySpecialEventId === specialEvent.specialEventId ? "active" : ""}`;
      card.innerHTML = `${renderer.getCatalogMarkup()}<small class="rarity-${specialEvent.rarity}">${specialEvent.name}${specialEvent.characterId ? " · 수 전용" : ""}</small>`;
      card.addEventListener("click", () => { previewVictorySpecialEventId = specialEvent.specialEventId; renderGachaCatalog(); });
      gachaCatalog.appendChild(card);
    });
    renderGachaPreview();
    return;
  }
  cosmeticCatalog.forEach((cosmetic) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `gacha-skin-icon ${cosmetic.isUnlocked ? "unlocked" : "locked"} ${previewGachaCosmeticId === cosmetic.cosmeticId ? "active" : ""}`;
    card.style.setProperty("--skin-border", cosmetic.style.borderColor);
    card.style.setProperty("--skin-fill", cosmetic.style.fillColor);
    card.style.setProperty("--skin-text", cosmetic.style.textColor);
    card.style.setProperty("--skin-glow", cosmetic.style.glowColor);
    card.innerHTML = `${getSkinVisualMarkup(cosmetic.style, cosmetic.isUnlocked ? "SKIN" : "?", "icon")}<small class="rarity-${cosmetic.rarity}">${cosmetic.name}</small>`;
    card.addEventListener("click", () => { previewGachaCosmeticId = cosmetic.cosmeticId; renderGachaCatalog(); });
    gachaCatalog.appendChild(card);
  });
  renderGachaPreview();
}

function renderGachaPreview() {
  if (activeGachaType === "specialEvent") {
    const specialEvent = victorySpecialEventCatalog.find((entry) => entry.specialEventId === previewVictorySpecialEventId) ?? victorySpecialEventCatalog[0];
    const renderer = getSpecialEventRenderer(specialEvent);
    if (!specialEvent || !renderer) { gachaPreview.textContent = "특수 이벤트를 불러오는 중입니다."; return; }
    gachaPreview.innerHTML = `${renderer.getPreviewMarkup()}<span class="eyebrow">${specialEvent.isUnlocked ? "획득" : "미획득"} · ${specialEvent.rarity.toUpperCase()}</span><h3>${specialEvent.name}</h3><p>${specialEvent.characterId === "su" ? "수 전용 · 수가 1위일 때만 발동합니다." : "승리 모달 전체에 적용되는 특수 연출입니다."}</p><p class="gacha-preview-note">특수 이벤트는 행동·배경과 별개 아이템입니다. 장착은 <b>도감 탭</b>에서 할 수 있습니다.</p>`;
    return;
  }
  if (activeGachaType === "action") {
    const action = victoryActionCatalog.find((entry) => entry.actionId === previewVictoryActionId) ?? victoryActionCatalog[0];
    if (!action) { gachaPreview.textContent = "승리 행동을 불러오는 중입니다."; return; }
    gachaPreview.innerHTML = `${getCeremonyActionPreviewMarkup(action.animation)}<span class="eyebrow">${action.isUnlocked ? "획득" : "미획득"} · ${action.rarity.toUpperCase()}</span><h3>${action.name}</h3><p>${action.characterId === "su" ? "수 전용 · 수가 1위일 때만 발동합니다." : "게임 종료 시 실제 1위 플레이어 공에 적용되는 행동입니다."}</p><p class="gacha-preview-note">행동은 배경과 별개의 가챠·장착 항목입니다. 장착은 <b>도감 탭</b>에서 할 수 있습니다.</p>`;
    return;
  }
  if (activeGachaType === "background") {
    const background = victoryBackgroundCatalog.find((entry) => entry.backgroundId === previewVictoryBackgroundId) ?? victoryBackgroundCatalog[0];
    if (!background) { gachaPreview.textContent = "승리 배경을 불러오는 중입니다."; return; }
    gachaPreview.innerHTML = `${getCeremonyBackgroundPreviewMarkup(background.animation)}<span class="eyebrow">${background.isUnlocked ? "획득" : "미획득"} · ${background.rarity.toUpperCase()}</span><h3>${background.name}</h3><p>${background.characterId === "su" ? "수 전용 · 수가 1위일 때만 발동합니다." : "게임 종료 시 1위 플레이어 공 뒤에 표시되는 승리 무대입니다."}</p><p class="gacha-preview-note">배경은 행동과 별개의 가챠·장착 항목입니다. 장착은 <b>도감 탭</b>에서 할 수 있습니다.</p>`;
    return;
  }
  const cosmetic = cosmeticCatalog.find((entry) => entry.cosmeticId === previewGachaCosmeticId) ?? cosmeticCatalog[0];
  if (!cosmetic) { gachaPreview.textContent = "스킨을 불러오는 중입니다."; return; }
  const effect = `${cosmetic.style.borderAnimation === "none" ? "기본 테두리" : `${cosmetic.style.borderAnimation} 테두리`} · ${cosmetic.style.trail === "none" ? "이동 흔적 없음" : `${cosmetic.style.trail} 이동 흔적`}`;
  gachaPreview.innerHTML = `<div class="skin-preview-stage" style="--skin-border:${cosmetic.style.borderColor};--skin-fill:${cosmetic.style.fillColor};--skin-text:${cosmetic.style.textColor};--skin-glow:${cosmetic.style.glowColor}">${getSkinVisualMarkup(cosmetic.style, "SKIN", "preview")}</div><span class="eyebrow">${cosmetic.isUnlocked ? "획득" : "미획득"} · ${cosmetic.rarity.toUpperCase()}</span><h3>${cosmetic.name}</h3><p>공통 스킨</p><div class="skill-slot"><b>외형 효과 미리보기</b><br>${effect}</div><p class="gacha-preview-note">아이콘·미리보기·전투에 같은 색상, 테두리 효과, 이동 흔적 설정이 적용됩니다. 가챠 탭에서는 장착할 수 없으며, 장착은 캐릭터 관리에서만 가능합니다.</p>`;
}

function updateGachaUI() {
  const catalogReady = cosmeticCatalog.length + victoryActionCatalog.length + victoryBackgroundCatalog.length + victorySpecialEventCatalog.length > 0;
  gachaTitle.textContent = "통합 가챠";
  gachaTypeHelp.innerHTML = activeGachaType === "specialEvent"
    ? `현재 탭은 <b>특수 이벤트</b> 도감 필터입니다. 특수 이벤트는 승리 모달 전체에 적용되며, 뽑기는 모든 카테고리 <b>전체 풀</b>에서 진행됩니다.`
    : activeGachaType === "action"
    ? `현재 탭은 <b>플레이어 행동</b> 도감 필터입니다. 행동과 배경은 별도 아이템이며, 뽑기는 스킨·행동·배경 <b>전체 풀</b>에서 진행됩니다.`
    : activeGachaType === "background"
      ? `현재 탭은 <b>배경 효과</b> 도감 필터입니다. 행동과 배경은 별도 아이템이며, 뽑기는 스킨·행동·배경 <b>전체 풀</b>에서 진행됩니다.`
      : `현재 탭은 스킨 도감 필터입니다. 뽑기는 스킨·승리 행동·승리 배경 <b>전체 풀</b>에서 진행됩니다. 중복 획득 시 코인이 환급됩니다.`;
  
  const gachaDrawStatus = document.getElementById("gacha-draw-status");
  if (gachaDrawStatus) {
    gachaDrawStatus.textContent = `코인을 사용해 스킨·행동·배경·특수 이벤트 전체 풀에서 뽑습니다.`;
  }

  const storeSkinBtn = document.getElementById("store-gacha-skin-btn") as HTMLButtonElement;
  if (storeSkinBtn) {
    storeSkinBtn.disabled = !catalogReady;
  }

  renderGachaCatalog();
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function closeGachaReveal() {
  gachaRevealModal.classList.add("hidden");
}

function showGachaRevealRolling() {
  gachaRevealContent.innerHTML = `<div class="gacha-reveal rolling"><span class="eyebrow">UNIFIED GACHA SIGNAL</span><div class="gacha-reveal-orb"><i></i><i></i><i></i><b>?</b></div><h2>보상을 해석하는 중…</h2><p>스킨과 승리 세레모니 전체 풀에서 결과를 불러옵니다.</p></div>`;
  gachaRevealModal.classList.remove("hidden");
}

type GachaRevealCosmetic = Omit<Cosmetic, "isUnlocked" | "style"> & {
  style: Omit<CharacterCosmeticStyle, "glowColor"> & { glowColor?: string };
};

function showGachaRevealResult(result: { result: string; item: GachaRevealCosmetic; coinRefund: number }) {
  const cosmetic = result.item;
  const glowColor = cosmetic.style.glowColor ?? cosmetic.style.borderColor;
  const rarityLabel: Record<Cosmetic["rarity"], string> = { common: "일반", rare: "희귀", epic: "에픽", legendary: "레전드", unique: "유니크" };
  const isDuplicate = result.result === "duplicate";
  const effect = `${cosmetic.style.borderAnimation === "none" ? "기본 테두리" : `${cosmetic.style.borderAnimation} 테두리`} · ${cosmetic.style.trail === "none" ? "이동 흔적 없음" : `${cosmetic.style.trail} 이동 흔적`}`;
  const specialClass = cosmetic.rarity === "legendary" || cosmetic.rarity === "unique" ? "is-special" : "";
  gachaRevealContent.innerHTML = `<div class="gacha-reveal revealed ${specialClass}" style="--skin-border:${cosmetic.style.borderColor};--skin-fill:${cosmetic.style.fillColor};--skin-text:${cosmetic.style.textColor};--skin-glow:${glowColor}"><span class="eyebrow rarity-${cosmetic.rarity}">${rarityLabel[cosmetic.rarity].toUpperCase()} SKIN</span>${getSkinVisualMarkup({ ...cosmetic.style, glowColor }, "SKIN", "reveal")}<h2>${cosmetic.name}</h2><p>${isDuplicate ? `중복 스킨 · +${result.coinRefund} 코인 환급` : "새 공통 스킨을 획득했습니다!"}</p><div class="gacha-reveal-effect">${effect}</div><button id="gacha-reveal-close" class="btn btn-primary" type="button">확인</button></div>`;
  document.getElementById("gacha-reveal-close")?.addEventListener("click", closeGachaReveal);
}

function getCeremonySceneMarkup(background: VictoryAnimation | null, action: VictoryAnimation | null, size: "catalog" | "preview" | "reveal", playerMarkup = "<b>PLAYER</b>"): string {
  return `<div class="ceremony-scene ceremony-scene-${size}${background ? ` ceremony-scene-${background}` : ""}" aria-hidden="true"><i></i><i></i><i></i><span class="ceremony-scene-ball${action ? ` ceremony-action-${action}` : ""}">${playerMarkup}</span></div>`;
}

function getCeremonyActionPreviewMarkup(animation: VictoryAnimation): string {
  return `<div class="ceremony-action-preview" aria-hidden="true"><span class="ceremony-scene-ball ceremony-action-${animation}"><b>PLAYER</b></span></div>`;
}

function getCeremonyBackgroundPreviewMarkup(animation: VictoryAnimation): string {
  return `<div class="ceremony-background-preview ceremony-scene ceremony-scene-${animation}" aria-hidden="true"><i></i><i></i><i></i></div>`;
}

const SPECIAL_EVENT_RENDERERS: Record<VictorySpecialEvent["effect"], { modalClass: string; getOverlayMarkup: (playerMarkup?: string) => string; getCatalogMarkup: () => string; getPreviewMarkup: () => string }> = {
  sniper: {
    modalClass: "victory-special-sniper-active",
    getOverlayMarkup: (playerMarkup = "<b>SU</b>") => `<div class="victory-special-overlay victory-special-overlay-sniper" aria-hidden="true"><span class="special-sniper-afterimage"></span><span class="special-sniper-shooter">${playerMarkup}</span><span class="special-sniper-rifle"><i></i></span><span class="special-sniper-muzzle"></span><b>+</b></div>`,
    getCatalogMarkup: () => `<div class="special-event-catalog-thumb special-event-catalog-thumb-sniper" aria-hidden="true"><b>+</b><span>SU</span><i></i></div>`,
    getPreviewMarkup: () => `<div class="special-event-preview special-event-preview-sniper" aria-hidden="true"><div class="special-preview-gunman"><b>SU</b><i></i></div><strong>+</strong><small>등장 · 조준 · 반동 · 잔상 소멸</small></div>`,
  },
};

function getSpecialEventRenderer(event: VictorySpecialEvent | null | undefined) {
  return event ? SPECIAL_EVENT_RENDERERS[event.effect] : undefined;
}

function showVictoryPartRevealResult(itemType: "action" | "background", item: Omit<VictoryAction, "isUnlocked"> | Omit<VictoryBackground, "isUnlocked">, result: { result: string; coinRefund: number }) {
  const isDuplicate = result.result === "duplicate";
  const specialClass = item.rarity === "legendary" || item.rarity === "unique" ? "is-special" : "";
  const label = itemType === "action" ? "VICTORY ACTION" : "VICTORY BACKGROUND";
  const preview = itemType === "action" ? getCeremonyActionPreviewMarkup(item.animation) : getCeremonyBackgroundPreviewMarkup(item.animation);
  gachaRevealContent.innerHTML = `<div class="gacha-reveal revealed ceremony-reveal ${specialClass}"><span class="eyebrow rarity-${item.rarity}">${label}</span>${preview}<h2>${item.name}</h2><p>${isDuplicate ? `중복 ${itemType === "action" ? "승리 행동" : "승리 배경"} · +${result.coinRefund} 코인 환급` : `새 ${itemType === "action" ? "승리 행동" : "승리 배경"}을 획득했습니다!`}</p><div class="gacha-reveal-effect">${itemType === "action" ? "실제 1위 플레이어 공에 적용되는 행동입니다." : "실제 1위 플레이어 공 뒤에 표시되는 배경입니다."}</div><button id="gacha-reveal-close" class="btn btn-primary" type="button">확인</button></div>`;
  document.getElementById("gacha-reveal-close")?.addEventListener("click", closeGachaReveal);
}

function showVictorySpecialEventRevealResult(specialEvent: Omit<VictorySpecialEvent, "isUnlocked">, result: { result: string; coinRefund: number }) {
  const renderer = getSpecialEventRenderer(specialEvent as VictorySpecialEvent);
  if (!renderer) return;
  const isDuplicate = result.result === "duplicate";
  gachaRevealContent.innerHTML = `<div class="gacha-reveal revealed ceremony-reveal is-special"><span class="eyebrow rarity-${specialEvent.rarity}">SPECIAL EVENT</span>${renderer.getPreviewMarkup()}<h2>${specialEvent.name}</h2><p>${isDuplicate ? `중복 특수 이벤트 · +${result.coinRefund} 코인 환급` : "새 특수 이벤트를 획득했습니다!"}</p><div class="gacha-reveal-effect">승리 모달 전체에 적용되는 연출입니다. 장착은 스킨 탭에서 할 수 있습니다.</div><button id="gacha-reveal-close" class="btn btn-primary" type="button">확인</button></div>`;
  document.getElementById("gacha-reveal-close")?.addEventListener("click", closeGachaReveal);
}

function formatSeasonDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(timestamp);
}

function renderSeasonRanking() {
  if (!currentRankingSeason) {
    rankingSeasonLabel.textContent = "시즌 정보를 불러오는 중입니다.";
    rankingList.textContent = "랭킹을 불러오는 중입니다.";
    return;
  }
  rankingSeasonLabel.textContent = `${currentRankingSeason.seasonId.toUpperCase()} · ${formatSeasonDate(currentRankingSeason.startedAt)} ~ ${formatSeasonDate(currentRankingSeason.endsAt)}`;
  if (currentRankingEntries.length === 0) {
    rankingList.innerHTML = `<div class="ranking-empty">아직 기록된 ${activeRankingMode === "solo" ? "개인전" : activeRankingMode === "team" ? "팀전" : "토너먼트"}이 없습니다.<br><small>첫 전투를 완료하면 캐릭터별 시즌 점수가 기록됩니다.</small></div>`;
    return;
  }
  rankingList.innerHTML = currentRankingEntries.map((entry, index) => {
    const character = availableCharacters.find((candidate) => candidate.id === entry.characterId);
    if (!character) return "";
    return `<article class="ranking-row"><b class="ranking-place">${index + 1}</b>${getAvatarHTML(character.name, character.image, "ranking-avatar")}<div class="ranking-identity"><strong style="color:${character.color}">${character.name}</strong><small>${entry.wins}승 ${entry.games - entry.wins - entry.draws}패 ${entry.draws}무 · 승률 ${entry.winRate.toFixed(1)}%</small></div><strong class="ranking-score">${entry.score.toLocaleString()}<small>RP</small></strong></article>`;
  }).join("");
}

function subscribeSeasonRanking() {
  rankingUnsubscribe?.();
  rankingUnsubscribe = convexClient.onUpdate(api.stats.getRankingOverview, { mode: activeRankingMode }, (overview) => {
    currentRankingSeason = overview.season;
    currentRankingEntries = overview.rankings;
    renderSeasonRanking();
  });
}

async function equipCosmetic(characterId: string, cosmeticId: string) {
  try {
    await convexClient.mutation(api.cosmetics.equipForCharacter, { characterId, cosmeticId });
    gachaResult.textContent = `${availableCharacters.find((character) => character.id === characterId)?.name ?? "캐릭터"}에게 스킨을 장착했습니다. 모든 클라이언트에 반영됩니다.`;
    renderSkinTab();
  } catch {
    gachaResult.textContent = "스킨 장착에 실패했습니다. 잠시 후 다시 시도해주세요.";
  }
}

async function clearCosmetic(characterId: string) {
  try {
    await convexClient.mutation(api.cosmetics.clearForCharacter, { characterId });
    gachaResult.textContent = `${availableCharacters.find((character) => character.id === characterId)?.name ?? "캐릭터"}의 기본 외형을 장착했습니다. 모든 클라이언트에 반영됩니다.`;
    renderSkinTab();
  } catch {
    gachaResult.textContent = "기본 외형 장착에 실패했습니다. 잠시 후 다시 시도해주세요.";
  }
}

async function drawGacha() {
  const btn = document.getElementById("store-gacha-skin-btn") as HTMLButtonElement;
  if (btn) btn.disabled = true;
  showGachaRevealRolling();
  try {
    await convexClient.mutation(api.cosmetics.ensureInitialCatalog, {});
    await convexClient.mutation(api.cosmetics.ensureInitialVictoryCeremonyCatalog, {});
    const result = await convexClient.mutation(api.cosmetics.drawUnified, { characterId: currentCharacterId! }) as UnifiedGachaDrawResult;
    await delay(900);
    
    // Update coins
    updateCoinsDisplay(result.coins);
    
    if (result.itemType === "action" || result.itemType === "background") {
      const item = result.item;
      showVictoryPartRevealResult(result.itemType, item, result);
      gachaResult.textContent = result.result === "unlocked"
        ? `획득! ${item.name} (${item.rarity.toUpperCase()}) — ${result.itemType === "action" ? "1위 플레이어 공 행동" : "승리 배경"}으로 스킨 탭에서 장착할 수 있습니다.`
        : `중복! ${item.name} · 코인 ${result.coinRefund}개를 환급받았습니다.`;
    } else if (result.itemType === "specialEvent") {
      showVictorySpecialEventRevealResult(result.item, result);
      gachaResult.textContent = result.result === "unlocked"
        ? `획득! ${result.item.name} (${result.item.rarity.toUpperCase()}) — 스킨 탭에서 특수 이벤트로 장착할 수 있습니다.`
        : `중복! ${result.item.name} · 코인 ${result.coinRefund}개를 환급받았습니다.`;
    } else {
      showGachaRevealResult(result);
      gachaResult.textContent = result.result === "unlocked"
        ? `획득! ${result.item.name} (${result.item.rarity.toUpperCase()}) — 전 캐릭터에 장착할 수 있습니다.`
        : `중복! ${result.item.name} · 코인 ${result.coinRefund}개를 환급받았습니다.`;
    }
  } catch (error) {
    closeGachaReveal();
    gachaResult.textContent = error instanceof Error ? error.message : "뽑기에 실패했습니다.";
  } finally {
    if (btn) btn.disabled = false;
  }
}

type UnifiedGachaDrawResult = {
  itemType: "skin" | "action" | "background" | "specialEvent";
  item: any;
  result: "unlocked" | "duplicate";
  coinRefund: number;
  coins: number;
};

async function equipVictoryPart(itemType: "action" | "background", item: VictoryAction | VictoryBackground) {
  try {
    if (itemType === "action") {
      await convexClient.mutation(api.cosmetics.equipVictoryAction, { characterId: currentCharacterId!, actionId: (item as VictoryAction).actionId });
    } else {
      await convexClient.mutation(api.cosmetics.equipVictoryBackground, { characterId: currentCharacterId!, backgroundId: (item as VictoryBackground).backgroundId });
    }
    gachaResult.textContent = `${item.name} ${itemType === "action" ? "행동" : "배경"}을 장착했습니다. 다음 게임 결과에 적용됩니다.`;
    const result = document.getElementById("collection-victory-ceremony-result");
    if (result) result.textContent = `${item.name} ${itemType === "action" ? "행동" : "배경"}을 장착했습니다.`;
    renderSkinTab();
  } catch (error) {
    gachaResult.textContent = error instanceof Error ? error.message : "승리 항목 장착에 실패했습니다.";
    const result = document.getElementById("collection-victory-ceremony-result");
    if (result) result.textContent = error instanceof Error ? error.message : "승리 항목 장착에 실패했습니다.";
  }
}

async function equipVictorySpecialEvent(characterId: string, specialEvent: VictorySpecialEvent) {
  try {
    await convexClient.mutation(api.cosmetics.equipVictorySpecialEvent, { characterId, specialEventId: specialEvent.specialEventId });
    const result = document.getElementById("collection-victory-special-event-result");
    if (result) result.textContent = `${specialEvent.name} 특수 이벤트를 장착했습니다.`;
    renderSkinTab();
  } catch (error) {
    const result = document.getElementById("collection-victory-special-event-result");
    if (result) result.textContent = error instanceof Error ? error.message : "특수 이벤트 장착에 실패했습니다.";
  }
}

async function clearVictoryPart(itemType: "action" | "background") {
  try {
    if (itemType === "action") await convexClient.mutation(api.cosmetics.clearVictoryAction, { characterId: currentCharacterId! });
    else await convexClient.mutation(api.cosmetics.clearVictoryBackground, { characterId: currentCharacterId! });
    const result = document.getElementById("collection-victory-ceremony-result");
    if (result) result.textContent = `${itemType === "action" ? "플레이어 행동" : "배경 효과"}을 선택 안 함으로 변경했습니다.`;
    renderSkinTab();
  } catch (error) {
    const result = document.getElementById("collection-victory-ceremony-result");
    if (result) result.textContent = error instanceof Error ? error.message : "선택 해제에 실패했습니다.";
  }
}

async function clearVictorySpecialEvent(characterId: string) {
  try {
    await convexClient.mutation(api.cosmetics.clearVictorySpecialEvent, { characterId });
    const result = document.getElementById("collection-victory-special-event-result");
    if (result) result.textContent = "특수 이벤트를 선택 안 함으로 변경했습니다.";
    renderSkinTab();
  } catch (error) {
    const result = document.getElementById("collection-victory-special-event-result");
    if (result) result.textContent = error instanceof Error ? error.message : "선택 해제에 실패했습니다.";
  }
}

function initCosmetics() {
  void convexClient.mutation(api.cosmetics.ensureInitialCatalog, {});
  void convexClient.mutation(api.cosmetics.ensureInitialVictoryCeremonyCatalog, {});
  cosmeticCatalogUnsubscribe?.();
  cosmeticLoadoutUnsubscribe?.();
  victoryActionCatalogUnsubscribe?.();
  victoryBackgroundCatalogUnsubscribe?.();
  victorySpecialEventCatalogUnsubscribe?.();

  if (currentCharacterId) {
    cosmeticCatalogUnsubscribe = convexClient.onUpdate(
      api.cosmetics.listCatalog,
      { characterId: currentCharacterId },
      (catalog) => {
        cosmeticCatalog = catalog as Cosmetic[];
        updateGachaUI();
        renderSkinTab();
      }
    );

    victoryActionCatalogUnsubscribe = convexClient.onUpdate(
      api.cosmetics.listVictoryActionCatalog,
      { characterId: currentCharacterId },
      (catalog) => {
        victoryActionCatalog = catalog as VictoryAction[];
        updateGachaUI();
        renderSkinTab();
      }
    );

    victoryBackgroundCatalogUnsubscribe = convexClient.onUpdate(
      api.cosmetics.listVictoryBackgroundCatalog,
      { characterId: currentCharacterId },
      (catalog) => {
        victoryBackgroundCatalog = catalog as VictoryBackground[];
        updateGachaUI();
        renderSkinTab();
      }
    );

    victorySpecialEventCatalogUnsubscribe = convexClient.onUpdate(
      api.cosmetics.listVictorySpecialEventCatalog,
      { characterId: currentCharacterId },
      (catalog) => {
        victorySpecialEventCatalog = catalog as VictorySpecialEvent[];
        updateGachaUI();
        renderSkinTab();
      }
    );

    cosmeticLoadoutUnsubscribe = convexClient.onUpdate(
      api.cosmetics.getCharacterLoadout,
      { characterId: currentCharacterId },
      (loadout) => {
        if (loadout) {
          cosmeticLoadouts.set(currentCharacterId!, loadout.equippedCosmeticId ?? "");
          equippedVictoryActionId = loadout.equippedActionId ?? null;
          equippedVictoryBackgroundId = loadout.equippedBackgroundId ?? null;
          equippedVictorySpecialEventId = loadout.equippedSpecialEventId ?? null;
        }
        updateGachaUI();
        renderSkinTab();
      }
    );
  }
}

function initPersistentItems() {
  void convexClient.mutation(api.persistentItems.ensureInitialPersistentItemCatalog, {});
  persistentItemCatalogUnsubscribe?.();
  persistentItemCatalogUnsubscribe = convexClient.onUpdate(
    api.persistentItems.listCatalog,
    {},
    (catalog) => {
      persistentItemCatalog = catalog as CatalogItem[];
      renderGrowthTab();
    }
  );

  playerItemsUnsubscribe?.();
  if (currentCharacterId) {
    playerItemsUnsubscribe = convexClient.onUpdate(
      api.persistentItems.getCharacterItems,
      { characterId: currentCharacterId },
      (items) => {
        characterPlayerItems.set(currentCharacterId!, items as PlayerItem[]);
        
        // Populate unlocks
        persistentItemUnlocks.clear();
        (items as PlayerItem[]).forEach((item) => {
          persistentItemUnlocks.add(`${currentCharacterId}:${item.itemCatalogId}`);
        });

        renderGrowthTab();
      }
    );
  }
}

async function drawPersistentItemsAction(count: number) {
  if (!currentCharacterId) return;
  const item1Btn = document.getElementById("store-gacha-item-1-btn") as HTMLButtonElement;
  const item5Btn = document.getElementById("store-gacha-item-5-btn") as HTMLButtonElement;
  if (item1Btn) item1Btn.disabled = true;
  if (item5Btn) item5Btn.disabled = true;

  gachaRevealModal.classList.remove("hidden");
  gachaRevealContent.innerHTML = `
    <div class="gacha-reveal rolling">
      <span class="eyebrow">EQUIPMENT DRAW</span>
      <div class="gacha-roll-visual">
        <i></i><i></i><i></i><b>?</b>
      </div>
      <h2>아이템 기어를 소환하는 중…</h2>
      <p>보관 중인 영구 전투 아이템 카탈로그에서 해석하고 있습니다.</p>
    </div>
  `;

  try {
    const result = await convexClient.mutation(api.persistentItems.drawPersistentItems, {
      characterId: currentCharacterId,
      drawCount: count,
    });
    
    // update coins
    updateCoinsDisplay(result.coins);
    
    // show reveal result
    const items = result.drawnItems;
    const itemsListMarkup = items.map((item: any) => {
      return `<div style="margin: 0.5rem 0; padding: 0.6rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
        <strong class="rarity-${item.rarity}">${item.name}</strong>
        <span class="rarity-${item.rarity}" style="font-size: 0.72rem; text-transform: uppercase;">${item.rarity}</span>
      </div>`;
    }).join("");

    gachaRevealContent.innerHTML = `
      <div class="gacha-reveal revealed" style="--skin-border:var(--neon-cyan);--skin-fill:#121225;--skin-text:#fff;--skin-glow:var(--neon-cyan)">
        <span class="eyebrow rarity-epic">PLAYER ITEM DRAW</span>
        <div style="font-size:3rem; margin:1rem 0;">⚙️</div>
        <h2>소환 결과 (${items.length}개)</h2>
        <div style="max-height: 200px; overflow-y: auto; width: 100%; margin: 1rem 0;">
          ${itemsListMarkup}
        </div>
        <button id="gacha-reveal-close" class="btn btn-primary" type="button" style="margin-top:1.5rem;">확인</button>
      </div>
    `;

    document.getElementById("gacha-reveal-close")?.addEventListener("click", () => {
      closeGachaReveal();
      renderGrowthTab();
    });

  } catch (err) {
    closeGachaReveal();
    gachaResult.textContent = err instanceof Error ? err.message : "아이템 소환에 실패했습니다.";
    alert(err instanceof Error ? err.message : "아이템 소환에 실패했습니다.");
  } finally {
    if (item1Btn) item1Btn.disabled = false;
    if (item5Btn) item5Btn.disabled = false;
  }
}

const PERSISTENT_ITEM_RARITY_INFO: Array<{ rarity: CatalogItem["rarity"]; label: string; chance: number }> = [
  { rarity: "common", label: "일반", chance: 50 },
  { rarity: "rare", label: "레어", chance: 30 },
  { rarity: "epic", label: "에픽", chance: 14 },
  { rarity: "legendary", label: "레전더리", chance: 5 },
  { rarity: "unique", label: "유니크", chance: 1 },
];

function getEquippedPersistentItemIds(characterId: string): string[] {
  const items = characterPlayerItems.get(characterId) ?? [];
  return items.filter((item) => item.equippedSlot >= 1 && item.equippedSlot <= 8).map((item) => item.itemCatalogId);
}

function openPersistentItemRateModal(characterId: string) {
  const equippedIds = new Set(getEquippedPersistentItemIds(characterId));
  persistentItemRateContent.innerHTML = PERSISTENT_ITEM_RARITY_INFO.map(({ rarity, label, chance }) => {
    const items = persistentItemCatalog.filter((item) => item.rarity === rarity);
    const cards = items.map((item) => {
      const isOwned = persistentItemUnlocks.has(`${characterId}:${item.itemId}`);
      const isEquipped = equippedIds.has(item.itemId);
      const status = isEquipped ? "장착 중" : isOwned ? "보유" : "미보유";
      return `<article class="persistent-item-rate-card rarity-${rarity} ${isOwned ? "owned" : "locked"}">
        <div><strong>${item.name}</strong><span>${status}</span></div>
        <p>${item.description}</p>
      </article>`;
    }).join("") || `<p class="persistent-item-rate-empty">해당 등급 아이템을 불러오는 중입니다.</p>`;
    return `<section class="persistent-item-rate-tier rarity-${rarity}">
      <header><strong>${label}</strong><b>${chance}%</b><small>${items.length}종</small></header>
      <div class="persistent-item-rate-grid">${cards}</div>
    </section>`;
  }).join("");
  persistentItemRateModal.classList.remove("hidden");
}

document.getElementById("persistent-item-rate-close")?.addEventListener("click", () => {
  persistentItemRateModal.classList.add("hidden");
});
persistentItemRateModal.addEventListener("click", (event) => {
  if (event.target === persistentItemRateModal) persistentItemRateModal.classList.add("hidden");
});

function getCharacterFamilyId(character: { id: string; characterFamilyId?: string }) {
  return character.characterFamilyId ?? character.id;
}

function getSelectedBossFamilyId() {
  const boss = availableBossCharacters.find((character) => character.id === bossCharacterId);
  return boss ? getCharacterFamilyId(boss) : null;
}

const TOURNAMENT_ROUND_NAMES = ["16강", "8강", "4강", "결승"];

function tournamentName(id: string | null) {
  return availableCharacters.find((character) => character.id === id)?.name ?? "대기";
}

function renderTournamentBracket() {
  if (!tournamentState) return "";
  return `<div class="tournament-bracket">${tournamentState.rounds.map((round, roundIndex) => `<div class="tournament-round"><strong>${TOURNAMENT_ROUND_NAMES[roundIndex]}</strong>${round.map((match, matchIndex) => `<div class="tournament-match ${match.winnerId ? "complete" : ""}"><span>${matchIndex + 1}. ${tournamentName(match.players[0])}</span><span>${tournamentName(match.players[1])}</span><b>${match.winnerId ? `→ ${tournamentName(match.winnerId)}` : ""}</b></div>`).join("")}</div>`).join("")}</div>`;
}

function updateTournamentHeader() {
  if (!tournamentHeader || !tournamentStatus || !tournamentState) return;
  const match = findNextTournamentMatch();
  tournamentHeader.classList.remove("hidden");
  tournamentStatus.textContent = match
    ? `🏆 ${TOURNAMENT_ROUND_NAMES[match.roundIndex]} · ${match.matchIndex + 1}경기  |  ${tournamentName(match.match.players[0])} VS ${tournamentName(match.match.players[1])}`
    : `🏆 토너먼트 우승: ${tournamentName(tournamentState.championId ?? null)}`;
}

function findNextTournamentMatch() {
  if (!tournamentState) return null;
  while (tournamentState.currentRound < tournamentState.rounds.length) {
    const round = tournamentState.rounds[tournamentState.currentRound];
    const matchIndex = round.findIndex((match) => match.players[0] && match.players[1] && !match.winnerId);
    if (matchIndex >= 0) return { match: round[matchIndex], roundIndex: tournamentState.currentRound, matchIndex };
    tournamentState.currentRound += 1;
  }
  return null;
}

function startTournament() {
  if (selectedIds.size !== 16) return;
  const entrants = [...selectedIds];
  for (let index = entrants.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [entrants[index], entrants[randomIndex]] = [entrants[randomIndex], entrants[index]];
  }
  const firstRound: TournamentMatch[] = Array.from({ length: 8 }, (_, index) => ({ players: [entrants[index * 2], entrants[index * 2 + 1]] }));
  tournamentState = {
    rounds: [firstRound, Array.from({ length: 4 }, () => ({ players: [null, null] })), Array.from({ length: 2 }, () => ({ players: [null, null] })), [{ players: [null, null] }]],
    currentRound: 0,
    awaitingNext: false,
  };
  launchNextTournamentMatch();
}

function launchNextTournamentMatch() {
  const next = findNextTournamentMatch();
  if (!next) return;
  selectedIds.clear();
  next.match.players.forEach((id) => id && selectedIds.add(id));
  updateTournamentHeader();
  startGame();
}

function updateTeamGameTypeVisibility() {
  // 팀전 규칙은 공통 게임 방식 버튼에서만 선택한다.
  teamGameTypeSetting.classList.add("hidden");
}

// 아바타 HTML 렌더러 (이모지 대체)
function getAvatarHTML(
  name: string,
  image?: string,
  customClass: string = "",
): string {
  if (image) {
    return `<img class="avatar-img ${customClass}" src="${image}" alt="${name}" />`;
  }
  return `
    <div class="avatar-text ${customClass}">
      <span>${name}</span>
    </div>
  `;
}

// 실시간 티어 트래커 로직 (LocalStorage 연동)
interface CharacterStats {
  wins: number;
  games: number;
  damageDealt: number;
  damageTaken: number;
  rankSum?: number;
  mvpCount?: number;
}

interface GlobalCharacterStats extends CharacterStats {
  characterId: string;
}

interface GlobalCounterStats {
  victimId: string;
  killerId: string;
  mode: string;
  count: number;
}

interface DamageRankingEntry {
  characterId: string;
  games: number;
  avgDamageDealt: number;
}

interface BossDifficultyEntry {
  bossId: string;
  games: number;
  clears: number;
  clearRate: number;
}

const DEFAULT_TIERS: Record<string, "S" | "A" | "B" | "C" | "D" | "E" | "F"> = {
  chanhwi: "S",
  juju: "S",
  seyeon: "A",
  eunsu: "A",
  jiho: "A",
  chanik: "B",
  dongjun: "B",
  myeongseok: "C",
  puman: "C",
  unhee: "D",
  nayuta: "D",
  doyun: "E",
  su: "F",
};

// 키구조: { [mode]: { [charId]: CharacterStats } }
let statsUnsubscribe: (() => void) | null = null;
let countersUnsubscribe: (() => void) | null = null;
let damageRankingUnsubscribe: (() => void) | null = null;
let bossDifficultyUnsubscribe: (() => void) | null = null;

let currentGlobalStats: GlobalCharacterStats[] = [];
let currentGlobalCounters: GlobalCounterStats[] = [];
let currentGlobalDamageRanking: DamageRankingEntry[] = [];
let currentBossDifficulty: BossDifficultyEntry[] = [];

function getCurrentStatsMode() {
  if (currentMode === "team") return `team:${teamGameType}`;
  if (currentMode === "boss") return "boss";
  if (currentMode === "tournament") return "2";
  return selectedIds.size.toString();
}

function getStoredStats(): Record<string, Record<string, CharacterStats>> {
  const record: Record<string, Record<string, CharacterStats>> = {};
  const mode = selectedStatsMode;
  record[mode] = {};

  currentGlobalStats.forEach((item) => {
    record[mode][item.characterId] = {
      wins: item.wins,
      games: item.games,
      damageDealt: item.damageDealt,
      damageTaken: item.damageTaken,
      rankSum: item.rankSum,
      mvpCount: item.mvpCount,
    };
  });
  return record;
}

function calculateDynamicTiers() {
  const statsAll = getStoredStats();
  const mode = selectedStatsMode;
  const stats = statsAll[mode] || {};

  const totalGames = Object.values(stats)
    .map((stat) => stat.games)
    .reduce((max, games) => Math.max(max, games), 0);
  lobbyTotalGames = totalGames;

  if (totalSimGamesEl) {
    totalSimGamesEl.textContent = `${totalGames}판`;
  }

  // 플레이어 요구에 맞추어 판수 제한 잠금 완전히 제거
  if (tierListNotice && tierRowsWrapper) {
    tierListNotice.classList.add("hidden");
    tierRowsWrapper.classList.remove("hidden");
  }

  const charScores = availableCharacters.map((char) => {
    const s = stats[char.id] || {
      wins: 0,
      games: 0,
      damageDealt: 0,
      damageTaken: 0,
    };

    let kills = 0;
    let deaths = 0;
    currentGlobalCounters.forEach((item) => {
      if (item.mode === mode) {
        if (item.killerId === char.id) kills += item.count;
        if (item.victimId === char.id) deaths += item.count;
      }
    });

    const winRate = s.games > 0 ? (s.wins / s.games) * 100 : 0;
    const avgDmgDealt = s.games > 0 ? s.damageDealt / s.games : 0;
    const avgDmgTaken = s.games > 0 ? s.damageTaken / s.games : 0;

    // 팀전 전용 기여도 공식
    const contribution =
      winRate * 2.5 + avgDmgDealt * 0.15 + kills * 8 - avgDmgTaken * 0.05;

    return {
      id: char.id,
      winRate,
      contribution,
      wins: s.wins,
      games: s.games,
      kills,
      deaths,
    };
  });

  // 정렬 규칙 분기
  charScores.sort((a, b) => {
    if (mode === "team") {
      return b.contribution - a.contribution;
    } else if (mode === "boss") {
      return b.winRate - a.winRate;
    } else {
      if (a.winRate !== b.winRate) {
        return b.winRate - a.winRate;
      }
      const tierOrder = { S: 7, A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 };
      const tierA = DEFAULT_TIERS[a.id] || "F";
      const tierB = DEFAULT_TIERS[b.id] || "F";
      if (tierOrder[tierA] !== tierOrder[tierB]) {
        return tierOrder[tierB] - tierOrder[tierA];
      }
      return a.id.localeCompare(b.id);
    }
  });

  // 13개 캐릭터 분배: 1위 S, 2~3위 A, 4~5위 B, 6~7위 C, 8~9위 D, 10~11위 E, 12~13위 F
  charScores.forEach((item, index) => {
    let tier: "S" | "A" | "B" | "C" | "D" | "E" | "F" = "F";
    if (index === 0) tier = "S";
    else if (index <= 2) tier = "A";
    else if (index <= 4) tier = "B";
    else if (index <= 6) tier = "C";
    else if (index <= 8) tier = "D";
    else if (index <= 10) tier = "E";
    else tier = "F";

    const charConfig = availableCharacters.find((c) => c.id === item.id);
    if (charConfig) {
      charConfig.tier = tier;
    }
  });
}

async function recordGameStart(participantIds: string[], mode: string) {
  if (isPracticeMode) return;
  try {
    await convexClient.mutation(api.stats.recordGameStart, {
      participantIds,
      mode,
    });
  } catch (err) {}
}

async function recordGameEnd(
  winnerId: string,
  allChars: CharacterState[],
  mode: string,
) {
  if (isPracticeMode || currentMode === "pve") return;
  const finalWinnerId = winnerId.includes("clone") ? "eunsu" : winnerId;
  const realChars = allChars.filter((char) => !char.id.includes("clone"));

  try {
    await convexClient.mutation(api.stats.recordGameEnd, {
      winnerId: finalWinnerId,
      mode,
      allChars: realChars.map((char) => ({
        characterId: char.id,
        damageDealt: char.totalDamageDealt || 0,
        damageTaken: char.totalDamageTaken || 0,
        rank: char.rank || 1,
        isMvp: char.isMvp,
        teamId: char.teamId,
      })),
    });
  } catch (err) {}
}

// 카운터 킬/데스 기록용 로직
function getStoredCounters(): Record<
  string,
  Record<string, Record<string, number>>
> {
  const record: Record<string, Record<string, Record<string, number>>> = {};
  const mode = selectedStatsMode;
  record[mode] = {};

  currentGlobalCounters.forEach((item) => {
    if (!record[mode][item.victimId]) {
      record[mode][item.victimId] = {};
    }
    record[mode][item.victimId][item.killerId] = item.count;
  });
  return record;
}

async function recordCharacterDeath(
  victimId: string,
  killerId: string,
  playerCount: number,
) {
  if (isPracticeMode || currentMode === "pve") return;
  if (victimId.includes("clone") || killerId.includes("clone")) return;
  try {
    await convexClient.mutation(api.stats.recordCharacterDeath, {
      victimId,
      killerId,
      mode: currentMode === "solo" ? playerCount.toString() : getCurrentStatsMode(),
    });
  } catch (err) {}
}

function renderTierList() {
  if (selectedStatsMode === "boss") {
    renderBossDifficultyList();
    return;
  }
  const statsAll = getStoredStats();
  const mode = selectedStatsMode;
  const stats = statsAll[mode] || {};

  const tiers = ["s", "a", "b", "c", "d", "e", "f"] as const;
  tiers.forEach((t) => {
    const container = document.getElementById(`tier-chars-${t}`);
    if (container) {
      container.innerHTML = "";
      const tierChars = availableCharacters.filter(
        (c) => (c.tier || "F").toLowerCase() === t,
      );

      // 내부 정렬 규칙
      const sortedTierChars = [...tierChars].sort((a, b) => {
        const sA = stats[a.id] || {
          wins: 0,
          games: 0,
          damageDealt: 0,
          damageTaken: 0,
        };
        const sB = stats[b.id] || {
          wins: 0,
          games: 0,
          damageDealt: 0,
          damageTaken: 0,
        };

        const wrA = sA.games > 0 ? sA.wins / sA.games : -1;
        const wrB = sB.games > 0 ? sB.wins / sB.games : -1;

        if (mode === "team") {
          // 팀전: 기여도 기반
          let kA = 0,
            kB = 0,
            dA = 0,
            dB = 0;
          currentGlobalCounters.forEach((item) => {
            if (item.mode === "team") {
              if (item.killerId === a.id) kA += item.count;
              if (item.killerId === b.id) kB += item.count;
              if (item.victimId === a.id) dA += item.count;
              if (item.victimId === b.id) dB += item.count;
            }
          });
          const avgDmgA = sA.games > 0 ? sA.damageDealt / sA.games : 0;
          const avgDmgB = sB.games > 0 ? sB.damageDealt / sB.games : 0;
          const avgDmgTakenA = sA.games > 0 ? sA.damageTaken / sA.games : 0;
          const avgDmgTakenB = sB.games > 0 ? sB.damageTaken / sB.games : 0;

          const scoreA =
            wrA * 250 + avgDmgA * 0.15 + kA * 8 - avgDmgTakenA * 0.05;
          const scoreB =
            wrB * 250 + avgDmgB * 0.15 + kB * 8 - avgDmgTakenB * 0.05;
          return scoreB - scoreA;
        } else {
          return wrB - wrA;
        }
      });

      sortedTierChars.forEach((char) => {
        const s = stats[char.id] || {
          wins: 0,
          games: 0,
          damageDealt: 0,
          damageTaken: 0,
        };
        const winRate = s.games > 0 ? (s.wins / s.games) * 100 : 0;

        let subText = "";
        if (mode === "team") {
          // KDA 및 기여도 노출
          let kills = 0;
          let deaths = 0;
          currentGlobalCounters.forEach((item) => {
            if (item.mode === "team") {
              if (item.killerId === char.id) kills += item.count;
              if (item.victimId === char.id) deaths += item.count;
            }
          });
          const assists = Math.floor(s.damageDealt / 250);
          subText = `<span style="color: var(--neon-cyan);">${kills}K / ${deaths}D / ${assists}A</span> <span style="font-size: 0.65rem; opacity: 0.5;">(${s.games}판)</span>`;
        } else if (mode === "boss") {
          // 보스 난이도 노출
          subText = `<span style="color: var(--neon-yellow);">보스승률 ${winRate.toFixed(0)}%</span> <span style="font-size: 0.65rem; opacity: 0.5;">(${s.games}판)</span>`;
        } else {
          subText = `<span>승률 ${winRate.toFixed(0)}%</span> <span style="font-size: 0.65rem; opacity: 0.5;">(${s.games}판)</span>`;
        }

        const chip = document.createElement("div");
        chip.className = `tier-char-chip-premium tier-chip-${t}`;
        chip.style.border = `1px solid ${char.color}40`;
        chip.style.boxShadow = `0 0 6px ${char.color}15`;
        chip.innerHTML = `
          <div class="tier-char-avatar">
            ${getAvatarHTML(char.name, char.image, "tier-avatar-img")}
          </div>
          <div class="tier-char-info">
            <span class="tier-char-name" style="color: ${char.color};">${char.name}</span>
            <span class="tier-char-winrate" style="font-size: 0.72rem;">${subText}</span>
          </div>
        `;
        container.appendChild(chip);
      });
    }
  });
}

function bossTier(clearRate: number): "S" | "A" | "B" | "C" | "D" {
  if (clearRate < 15) return "S";
  if (clearRate < 30) return "A";
  if (clearRate < 50) return "B";
  if (clearRate < 70) return "C";
  return "D";
}

function renderBossDifficultyList() {
  const tiers = ["s", "a", "b", "c", "d", "e", "f"] as const;
  tiers.forEach((tier) => {
    const container = document.getElementById(`tier-chars-${tier}`);
    if (container) container.innerHTML = "";
  });
  currentBossDifficulty.forEach((entry) => {
    const boss = availableBossCharacters.find((character) => character.id === entry.bossId);
    if (!boss) return;
    const tier = bossTier(entry.clearRate).toLowerCase();
    const container = document.getElementById(`tier-chars-${tier}`);
    if (!container) return;
    const chip = document.createElement("div");
    chip.className = `tier-char-chip-premium tier-chip-${tier}`;
    chip.innerHTML = `<div class="tier-char-avatar">${getAvatarHTML(boss.name, boss.image, "tier-avatar-img")}</div><div class="tier-char-info"><span class="tier-char-name" style="color: ${boss.color};">${boss.name}</span><span class="tier-char-winrate" style="font-size: 0.72rem;">처치율 ${entry.clearRate.toFixed(0)}% · ${entry.clears}/${entry.games}회 클리어</span></div>`;
    container.appendChild(chip);
  });
}

// Initialize Lobby character list
function initLobby(preserveSelections = false) {
  calculateDynamicTiers(); // 로비 갱신 시 실시간 계산
  characterListContainer.innerHTML = "";
  if (!preserveSelections) {
    selectedIds.clear();
  }
  updateStartButtonState();

  // 티어표 채우기
  renderTierList();

  // 역할군 필터 적용
  const lobbyCharacters =
    currentMode === "boss"
      ? [...availableBossCharacters, ...availableCharacters]
      : availableCharacters;
  const filteredChars = lobbyCharacters.filter(
    (char) => currentRoleFilter === "all" || char.role === currentRoleFilter,
  );

  // 공석 안내 처리
  if (filteredChars.length === 0) {
    if (emptyRoleNotice) {
      emptyRoleNotice.classList.remove("hidden");
      emptyRoleNotice.style.display = "flex";
    }
  } else {
    if (emptyRoleNotice) {
      emptyRoleNotice.classList.add("hidden");
      emptyRoleNotice.style.display = "none";
    }
  }

  if (currentMode === "solo" || currentMode === "team" || currentMode === "tournament") {
    const randomCard = document.createElement("button");
    randomCard.type = "button";
    randomCard.className = "character-row random-character-row";
    randomCard.innerHTML = `<div class="row-identity"><div class="avatar-text">?</div><div><div class="char-name">무작위 캐릭터</div><div class="row-skill-name">클릭하면 비어 있는 편성 칸을 무작위로 채웁니다.</div></div></div><div class="row-winrate"><strong class="text-neon-yellow">RANDOM</strong></div>`;
    randomCard.addEventListener("click", () => {
      const candidates = availableCharacters.filter((character) => !selectedIds.has(character.id));
      const random = candidates[Math.floor(Math.random() * candidates.length)];
      if (!random) return;
      selectedIds.add(random.id);
      if (currentMode === "team") (selectedRedIds.size < 3 ? selectedRedIds : selectedBlueIds).add(random.id);
      initLobby(true);
    });
    characterListContainer.appendChild(randomCard);
  }

  filteredChars.forEach((char) => {
    const isBossCharacter = availableBossCharacters.some(
      (boss) => boss.id === char.id,
    );
    const statsAll = getStoredStats();
    const mode = selectedStatsMode;
    const stats = statsAll[mode] || {};
    const s = stats[char.id] || {
      wins: 0,
      games: 0,
      damageDealt: 0,
      damageTaken: 0,
      rankSum: 0,
      mvpCount: 0,
    };
    const winRate = s.games > 0 ? (s.wins / s.games) * 100 : 0;
    const winRateStr = `${winRate.toFixed(1)}%`;
    const games = s.games;
    const wins = s.wins;
    const dmgDealt = s.damageDealt;
    const dmgTaken = s.damageTaken;
    const rankSum = s.rankSum || 0;
    const mvpCount = s.mvpCount || 0;
    const avgRank = games > 0 ? (rankSum / games).toFixed(1) : "-";

    // 카운터 데이터 가공 (현재 선택된 모드 기준)
    const countersAll = getStoredCounters();
    const modeCounters = countersAll[mode] || {};

    // 1. 천적 (나를 가장 많이 죽인 적)
    const myDeathRecords = modeCounters[char.id] || {};
    let worstKillerId = "";
    let worstKillerCount = 0;
    for (const [kId, count] of Object.entries(myDeathRecords)) {
      if (count > worstKillerCount) {
        worstKillerCount = count;
        worstKillerId = kId;
      }
    }
    const worstKillerName = worstKillerId
      ? availableCharacters.find((c) => c.id === worstKillerId)?.name || "없음"
      : "없음";
    const worstKillerStr = worstKillerId
      ? `${worstKillerName} (${worstKillerCount}데스)`
      : "없음";

    // 2. 먹잇감 (내가 가장 많이 죽인 적)
    let bestVictimId = "";
    let bestVictimCount = 0;
    for (const [victimId, killerRecords] of Object.entries(modeCounters)) {
      const killedByMe = killerRecords[char.id] || 0;
      if (killedByMe > bestVictimCount) {
        bestVictimCount = killedByMe;
        bestVictimId = victimId;
      }
    }
    const bestVictimName = bestVictimId
      ? availableCharacters.find((c) => c.id === bestVictimId)?.name || "없음"
      : "없음";
    const bestVictimStr = bestVictimId
      ? `${bestVictimName} (${bestVictimCount}킬)`
      : "없음";

    const card = document.createElement("div");
    card.className = "character-row";

    // 모드별 카드 테두리 및 선택 스타일 적용
    if (currentMode === "solo" || currentMode === "tournament") {
      if (selectedIds.has(char.id)) {
        card.classList.add("selected");
      }
    } else if (currentMode === "team") {
      if (selectedRedIds.has(char.id)) {
        card.classList.add("selected");
        card.classList.add("team-indicator-1"); // RED 테두리
      } else if (selectedBlueIds.has(char.id)) {
        card.classList.add("selected");
        card.classList.add("team-indicator-2"); // BLUE 테두리
      }
    } else if (currentMode === "boss") {
      if (bossCharacterId === char.id) {
        card.classList.add("selected");
        card.classList.add("boss-selected"); // BOSS 황금 테두리
      } else if (selectedRedIds.has(char.id)) {
        card.classList.add("selected");
        card.classList.add("team-indicator-1"); // 도전자 RED 테두리
      }
    }
    card.dataset.id = char.id;

    let modeBadgeHTML = "";
    if (currentMode === "team") {
      if (selectedRedIds.has(char.id)) {
        modeBadgeHTML = `<span class="mode-row-badge red">RED</span>`;
      } else if (selectedBlueIds.has(char.id)) {
        modeBadgeHTML = `<span class="mode-row-badge blue">BLUE</span>`;
      }
    } else if (currentMode === "boss") {
      if (bossCharacterId === char.id) {
        modeBadgeHTML = `<span class="mode-row-badge boss">BOSS</span>`;
      } else if (selectedRedIds.has(char.id)) {
        modeBadgeHTML = `<span class="mode-row-badge red">도전자</span>`;
      }
    }

    // 카드 하단 모드별 팀 지정기 UI 추가
    let teamSelectorHTML = "";
    if (currentMode === "team") {
      const isRed = selectedRedIds.has(char.id);
      const isBlue = selectedBlueIds.has(char.id);
      teamSelectorHTML = `
        <div class="row-team-selector">
          <button class="red-team-btn" style="flex: 1; padding: 5px 0; font-size: 0.72rem; border-radius: 6px; border: 1px solid ${isRed ? "#ff3b30" : "rgba(255,255,255,0.1)"}; background: ${isRed ? "#ff3b30" : "rgba(0,0,0,0.2)"}; color: ${isRed ? "#fff" : "#888"}; font-weight: bold; cursor: pointer; transition: all 0.2s; font-family: 'Orbit', sans-serif;">🔴 RED</button>
          <button class="blue-team-btn" style="flex: 1; padding: 5px 0; font-size: 0.72rem; border-radius: 6px; border: 1px solid ${isBlue ? "#007aff" : "rgba(255,255,255,0.1)"}; background: ${isBlue ? "#007aff" : "rgba(0,0,0,0.2)"}; color: ${isBlue ? "#fff" : "#888"}; font-weight: bold; cursor: pointer; transition: all 0.2s; font-family: 'Orbit', sans-serif;">🔵 BLUE</button>
        </div>
      `;
    } else if (currentMode === "boss") {
      const isBoss = isBossCharacter && bossCharacterId === char.id;
      const isChallenger = selectedRedIds.has(char.id);
      teamSelectorHTML = `
        <div class="row-team-selector">
          ${
            isBossCharacter
              ? `<button class="boss-team-btn" style="width: 100%; padding: 5px 0; font-size: 0.72rem; border-radius: 6px; border: 1px solid ${isBoss ? "#ffd700" : "rgba(255,255,255,0.1)"}; background: ${isBoss ? "#ffd700" : "rgba(0,0,0,0.2)"}; color: ${isBoss ? "#000" : "#888"}; font-weight: bold; cursor: pointer; transition: all 0.2s; font-family: 'Orbit', sans-serif;">👑 보스 버전</button>`
              : `<button class="challenger-team-btn" style="width: 100%; padding: 5px 0; font-size: 0.72rem; border-radius: 6px; border: 1px solid ${isChallenger ? "#ff3b30" : "rgba(255,255,255,0.1)"}; background: ${isChallenger ? "#ff3b30" : "rgba(0,0,0,0.2)"}; color: ${isChallenger ? "#fff" : "#888"}; font-weight: bold; cursor: pointer; transition: all 0.2s; font-family: 'Orbit', sans-serif;">👤 플레이어 버전</button>`
          }
        </div>
      `;
    }

    const currentTier = char.tier || "C";
    card.innerHTML = `
      ${modeBadgeHTML}
      <span class="tier-card-badge tier-badge-${currentTier.toLowerCase()}">${currentTier}</span>
      <div class="row-identity">${getAvatarHTML(char.name, char.image)}<div><div class="char-name">${char.name}</div><div class="row-skill-name">${char.skillName}</div></div></div>
      <div class="char-stats row-stats"><span>HP <b>${char.maxHp}</b></span><span>SPD <b>${char.speed.toFixed(1)}x</b></span><span>ATK <b>${char.attackPower}</b></span></div>
      <div class="row-winrate">승률 <strong class="text-neon-yellow">${winRateStr}</strong><small>${wins}승/${games}판</small></div>
      <button class="char-detail-trigger-btn" data-id="${char.id}" title="상세 설명 보기">정보</button>
      <div class="char-history">
        <span class="avg-rank-val">${avgRank}위</span><span class="mvp-count-val">${mvpCount}회</span><span class="text-neon-green">${dmgDealt}</span><span class="text-neon-red">${dmgTaken}</span><span class="text-neon-red">${worstKillerStr}</span><span class="text-neon-green">${bestVictimStr}</span>
      </div>
      ${teamSelectorHTML}
    `;

    // 상세 정보 버튼 이벤트 리스너 바인딩
    const detailBtn = card.querySelector(".char-detail-trigger-btn");
    if (detailBtn) {
      detailBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // 카드 선택 차단
        openCharacterDetail(char.id);
      });
    }

    // 모드별 수동 지정 버튼 이벤트 바인딩
    if (currentMode === "team") {
      const redBtn = card.querySelector(".red-team-btn");
      const blueBtn = card.querySelector(".blue-team-btn");

      redBtn?.addEventListener("click", (e) => {
        e.stopPropagation(); // 카드 자체 클릭 차단
        if (selectedRedIds.has(char.id)) {
          selectedRedIds.delete(char.id);
          selectedIds.delete(char.id);
        } else {
          // 인원 체크: 레드팀 3명 제한
          if (selectedRedIds.size >= 3) {
            alert("🔴 레드팀은 최대 3명까지만 선택할 수 있습니다!");
            return;
          }
          selectedRedIds.add(char.id);
          selectedBlueIds.delete(char.id); // 타 팀 해제
          selectedIds.add(char.id);
        }
        initLobby(true); // UI 실시간 업데이트
      });

      blueBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (selectedBlueIds.has(char.id)) {
          selectedBlueIds.delete(char.id);
          selectedIds.delete(char.id);
        } else {
          // 인원 체크: 블루팀 3명 제한
          if (selectedBlueIds.size >= 3) {
            alert("🔵 블루팀은 최대 3명까지만 선택할 수 있습니다!");
            return;
          }
          selectedBlueIds.add(char.id);
          selectedRedIds.delete(char.id); // 타 팀 해제
          selectedIds.add(char.id);
        }
        initLobby(true);
      });
    } else if (currentMode === "boss") {
      const bossBtn = card.querySelector(".boss-team-btn");
      const challengerBtn = card.querySelector(".challenger-team-btn");

      bossBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (bossCharacterId === char.id) {
          bossCharacterId = null;
          selectedIds.delete(char.id);
        } else {
          // 보스는 1명 제한
          const prevBossId = bossCharacterId;
          if (prevBossId) {
            selectedIds.delete(prevBossId);
          }
          bossCharacterId = char.id;
          const bossFamilyId = getCharacterFamilyId(char);
          selectedRedIds.forEach((selectedId) => {
            const selectedCharacter = availableCharacters.find((character) => character.id === selectedId);
            if (selectedCharacter && getCharacterFamilyId(selectedCharacter) === bossFamilyId) {
              selectedRedIds.delete(selectedId);
              selectedIds.delete(selectedId);
            }
          });
          selectedRedIds.delete(char.id); // 도전자 해제
          selectedIds.add(char.id);
        }
        initLobby(true);
      });

      challengerBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (selectedRedIds.has(char.id)) {
          selectedRedIds.delete(char.id);
          selectedIds.delete(char.id);
        } else {
          if (getSelectedBossFamilyId() === getCharacterFamilyId(char)) {
            alert("같은 캐릭터의 보스 버전과 플레이어 버전은 함께 편성할 수 없습니다.");
            return;
          }
          // 도전자 4명 제한
          if (selectedRedIds.size >= BOSS_CHALLENGER_COUNT) {
            alert(`⚔️ 도전자는 최대 ${BOSS_CHALLENGER_COUNT}명까지만 선택할 수 있습니다!`);
            return;
          }
          if (bossCharacterId === char.id) {
            bossCharacterId = null;
          }
          selectedRedIds.add(char.id);
          selectedIds.add(char.id);
        }
        initLobby(true);
      });
    }

    card.addEventListener("click", () => {
      if (currentMode !== "solo" && currentMode !== "tournament") return; // 팀/보스전은 하단 전용 버튼으로만 지정

      if (selectedIds.has(char.id)) {
        selectedIds.delete(char.id);
        card.classList.remove("selected");
      } else {
        selectedIds.add(char.id);
        card.classList.add("selected");
      }
      updateStartButtonState();
    });

    characterListContainer.appendChild(card);
  });
}

function updateStartButtonState() {
  let canStart = false;

  if (currentMode === "tournament") {
    canStart = selectedIds.size === 16;
  } else if (currentMode === "boss") {
    // 보스전 (1vs4): 보스 1명 및 도전자 4명일 때 활성화
    canStart = bossCharacterId !== null && selectedRedIds.size === BOSS_CHALLENGER_COUNT;
  } else if (currentMode === "team") {
    // 팀전 (3vs3): 레드 3명 & 블루 3명 합쳐서 6명일 때 활성화
    canStart = selectedRedIds.size === 3 && selectedBlueIds.size === 3;
  } else {
    // 개인전: 최소 2명 이상 선택 시 시작 가능
    canStart = selectedIds.size >= 2;
  }

  if (canStart) {
    startBtn.disabled = false;
    startBtn.classList.add("active");
  } else {
    startBtn.disabled = true;
    startBtn.classList.remove("active");
  }

  // 게임 시작 버튼 문구에 가이드 메시지 실시간 노출
  let startBtnText = "게임 시작하기";
  if (currentMode === "tournament") {
    startBtnText = `토너먼트 시작 (16강 ${selectedIds.size}/16명 선택됨)`;
  } else if (currentMode === "team") {
    startBtnText = `게임 시작 (팀전 RED ${selectedRedIds.size}/3 | BLUE ${selectedBlueIds.size}/3)`;
  } else if (currentMode === "boss") {
    startBtnText = `게임 시작 (보스전 BOSS ${bossCharacterId ? 1 : 0}/1 | 도전자 ${selectedRedIds.size}/${BOSS_CHALLENGER_COUNT})`;
  } else {
    startBtnText = `게임 시작 (개인전 ${selectedIds.size}명 선택됨)`;
  }
  startBtn.textContent = startBtnText;

  const selectionSummary = document.getElementById("selection-summary");
  if (selectionSummary) {
    if (currentMode === "team") {
      selectionSummary.textContent = `레드 ${selectedRedIds.size}/3 · 블루 ${selectedBlueIds.size}/3 편성`;
    } else if (currentMode === "boss") {
      selectionSummary.textContent = `보스 ${bossCharacterId ? 1 : 0}/1 · 도전자 ${selectedRedIds.size}/${BOSS_CHALLENGER_COUNT} 편성`;
    } else if (currentMode === "tournament") {
      selectionSummary.textContent = `16강 참가자 ${selectedIds.size}/16명 선택`;
    } else {
      selectionSummary.textContent = `개인전 참가자 ${selectedIds.size}명 · 최소 2명 필요`;
    }
  }

  // 연습모드 버튼 활성화 (최소 1개 이상 선택 필요, 연습은 모드 무관)
  const practiceStartBtn = document.getElementById(
    "practice-start-btn",
  ) as HTMLButtonElement;
  if (practiceStartBtn) {
    if (selectedIds.size >= 1) {
      practiceStartBtn.disabled = false;
      practiceStartBtn.classList.add("active");
    } else {
      practiceStartBtn.disabled = true;
      practiceStartBtn.classList.remove("active");
    }
  }
}

// Start Simulator
function startGame() {
  gameModeModal.classList.add("hidden");
  if (currentMode === "pve") {
    startPveDungeon();
    return;
  }
  if (currentMode === "tournament" && !tournamentState) {
    startTournament();
    return;
  }
  if (selectedIds.size < 2) return;
  if (currentMode === "boss" && !bossCharacterId) return;

  isPracticeMode = false; // 표준 대전 모드로 보정

  const selectedConfigs = (
    currentMode === "boss"
      ? [...availableBossCharacters, ...availableCharacters]
      : availableCharacters
  ).filter((char) => selectedIds.has(char.id));
  applyArenaToCanvas(
    getArenaForMatch(currentMode === "tournament" ? "solo" : currentMode, selectedConfigs.length, teamGameType),
  );

  lobbyView.classList.add("hidden");
  gameView.classList.remove("hidden");
  gameView.dataset.mode = currentMode;
  setHudCollapsed(true);

  // 보스전과 팀전 전용 헤더 UI 토글
  const bossHeader = document.getElementById("boss-battle-header");
  const teamHeader = document.getElementById("team-battle-header");
  if (bossHeader) {
    if (currentMode === "boss") bossHeader.classList.remove("hidden");
    else bossHeader.classList.add("hidden");
  }
  if (teamHeader) {
    if (currentMode === "team") teamHeader.classList.remove("hidden");
    else teamHeader.classList.add("hidden");
  }
  if (tournamentHeader) {
    if (currentMode === "tournament") updateTournamentHeader();
    else tournamentHeader.classList.add("hidden");
  }

  const total = selectedConfigs.length;
  const isLargeSoloMatch = currentMode === "solo" && total >= 4;

  const initialStates = selectedConfigs.map((config, index) => {
    const state = createCharacterState(
      config,
      index,
      total,
      gameCanvas.width,
      gameCanvas.height,
    );
    if (isLargeSoloMatch) state.radius = LARGE_SOLO_CHARACTER_RADIUS;
    applyCharacterLevel(state);
    applyEquippedCosmetic(state);

    // 모드별 스탯 및 팀 세팅
    if (currentMode === "boss") {
      if (state.id === bossCharacterId) {
        state.isBoss = true;
        state.teamId = 2; // 보스는 2팀 (블루)
      } else {
        state.isBoss = false;
        state.teamId = 1; // 도전자들은 1팀 (레드)
        state.cooldownMultiplier = 1.0;
        state.damageMultiplier = 1.0;
      }
    } else if (currentMode === "team") {
      // 수동 지정된 팀 배정 (1: 레드, 2: 블루)
      state.teamId = selectedRedIds.has(state.id) ? 1 : 2;
      state.isBoss = false;
      state.cooldownMultiplier = 1.0;
      state.damageMultiplier = 1.0;
    } else {
      // 개인전: 모든 팀 ID 미정의
      state.teamId = undefined;
      state.isBoss = false;
      state.cooldownMultiplier = 1.0;
      state.damageMultiplier = 1.0;
    }
    
    if (!state.isBoss) {
      const characterItems = characterPlayerItems.get(state.id) ?? [];
      const effects = resolvePersistentItemEffects(characterItems);
      applyPersistentItemStats(state, effects);
    }

    return state;
  });

  if (currentMode === "team") {
    const redTeam = initialStates.filter((state) => state.teamId === 1);
    const blueTeam = initialStates.filter((state) => state.teamId === 2);
    redTeam.forEach((state, index) => {
      state.x = state.radius * 3;
      state.y = ((index + 1) / (redTeam.length + 1)) * gameCanvas.height;
    });
    blueTeam.forEach((state, index) => {
      state.x = gameCanvas.width - state.radius * 3;
      state.y = ((index + 1) / (blueTeam.length + 1)) * gameCanvas.height;
    });
  }

  totalCountEl.textContent = total.toString();
  aliveCountEl.textContent = total.toString();

  // 게임 시작 기록 (참여 판수 증가)
  const gameModeStr = getCurrentStatsMode();
  recordGameStart(
    selectedConfigs.map((c) => c.id),
    gameModeStr,
  );

  const speedMultiplier = gameSpeedMultiplier;

  if (!gameLounge) {
    gameLounge = new GameLounge(
      gameCanvas,
      updateHUD,
      showWinner,
      updateCountdown,
      recordCharacterDeath,
    );
  }

  gameLounge.init(
    initialStates,
    speedMultiplier,
    currentMode === "team" ? teamGameType : "deathmatch",
  );
}

// Start Practice Game (Practice Mode)
function startPracticeGame() {
  if (selectedIds.size < 1) return;

  isPracticeMode = true;
  applyArenaToCanvas();

  lobbyView.classList.add("hidden");
  gameView.classList.remove("hidden");

  const selectedConfigs = availableCharacters.filter((char) =>
    selectedIds.has(char.id),
  );

  // 더미볼 설정 정의
  const dummyConfig = {
    id: "dummy",
    name: "더미볼",
    maxHp: 999999,
    speed: 0.8, // 기본 이속 부여
    attackPower: 0,
    baseAttackRange: 0,
    skillName: "움직이는 표적",
    skillDescription:
      "대미지 측정용 무한 체력 샌드백입니다. 맵을 둥둥 떠다닙니다.",
    color: "#7f8c8d",
    skillChargeRate: 0,
    role: "Supporter" as const,
    detailedDescription:
      "대미지 측정용 무한 체력 샌드백입니다. 맵을 둥둥 떠다닙니다.",
    onUpdate(char: CharacterState) {
      char.hp = char.maxHp;
      // 속도가 일정 이하로 느려지면 지속해서 표류하도록 속도 보충
      const speed = Math.hypot(char.vx, char.vy);
      if (speed < 1.2) {
        const angle = Math.random() * Math.PI * 2;
        char.vx = Math.cos(angle) * 2.2;
        char.vy = Math.sin(angle) * 2.2;
      }
    },
  };

  const allConfigs = [...selectedConfigs, dummyConfig];
  const total = allConfigs.length;
  const initialStates = allConfigs.map((config, index) => {
    const state = applyEquippedCosmetic(applyCharacterLevel(createCharacterState(
      config,
      index,
      total,
      gameCanvas.width,
      gameCanvas.height,
    )));
    if (state.id !== "dummy") {
      const characterItems = characterPlayerItems.get(state.id) ?? [];
      const effects = resolvePersistentItemEffects(characterItems);
      applyPersistentItemStats(state, effects);
    }
    return state;
  });

  totalCountEl.textContent = total.toString();
  aliveCountEl.textContent = total.toString();

  const speedMultiplier = gameSpeedMultiplier;

  if (!gameLounge) {
    gameLounge = new GameLounge(
      gameCanvas,
      updateHUD,
      showWinner,
      updateCountdown,
      recordCharacterDeath,
    );
  }

  gameLounge.init(initialStates, speedMultiplier);
}

function formatHp(hp: number): string {
  return Math.max(0, Math.round(hp)).toString();
}

// Update HUD lists
function updateHUD(characters: CharacterState[]) {
  renderPveRunModifiers();
  // 분신(eunsu_clone)은 플레이어가 아니므로 생존자 수 카운트에서 제외
  const aliveCount = characters.filter(
    (c) => !c.isDead && !c.id.includes("eunsu_clone"),
  ).length;
  aliveCountEl.textContent = aliveCount.toString();

  // === 모드별 헤더 UI 실시간 업데이트 ===
  if (currentMode === "boss") {
    const boss = characters.find(
      (c) => c.isBoss && !c.id.includes("eunsu_clone"),
    );
    const bossHpFill = document.getElementById("boss-hp-fill");
    const bossHpRatio = document.getElementById("boss-hp-ratio");
    const bossNameLabel = document.getElementById("boss-name-label");

    if (boss) {
      const hpRatio = boss.hp / boss.maxHp;
      const hpPercent = Math.max(0, Math.min(100, hpRatio * 100));
      if (bossHpFill) bossHpFill.style.width = `${hpPercent}%`;
      if (bossHpRatio)
        bossHpRatio.textContent = `${hpPercent.toFixed(1)}% (${formatHp(boss.hp)}/${formatHp(boss.maxHp)})`;
      if (bossNameLabel) bossNameLabel.textContent = `👑 BOSS (${boss.name})`;
    } else {
      if (bossHpFill) bossHpFill.style.width = "0%";
      if (bossHpRatio) bossHpRatio.textContent = "0% (처치됨)";
    }
  } else if (currentMode === "team") {
    const redTeam = characters.filter(
      (c) => c.teamId === 1 && !c.id.includes("eunsu_clone"),
    );
    const blueTeam = characters.filter(
      (c) => c.teamId === 2 && !c.id.includes("eunsu_clone"),
    );

    const redAlive = redTeam.filter((c) => !c.isDead).length;
    const blueAlive = blueTeam.filter((c) => !c.isDead).length;

    const redCurrentHp = redTeam.reduce(
      (sum, c) => sum + (c.isDead ? 0 : c.hp),
      0,
    );
    const blueCurrentHp = blueTeam.reduce(
      (sum, c) => sum + (c.isDead ? 0 : c.hp),
      0,
    );

    const totalCurrentHp = redCurrentHp + blueCurrentHp;
    let redBarWidth = 50;
    let blueBarWidth = 50;
    if (totalCurrentHp > 0) {
      redBarWidth = (redCurrentHp / totalCurrentHp) * 100;
      blueBarWidth = 100 - redBarWidth;
    } else {
      redBarWidth = 0;
      blueBarWidth = 0;
    }

    const redFill = document.getElementById("team-hp-fill-1");
    const blueFill = document.getElementById("team-hp-fill-2");
    const redAliveEl = document.getElementById("team-alive-1");
    const blueAliveEl = document.getElementById("team-alive-2");

    if (redFill) redFill.style.width = `${redBarWidth}%`;
    if (blueFill) blueFill.style.width = `${blueBarWidth}%`;
    if (redAliveEl) redAliveEl.textContent = redAlive.toString();
    if (blueAliveEl) blueAliveEl.textContent = blueAlive.toString();

    const objectiveText = document.getElementById("team-objective-text");
    const objective = gameLounge?.getTeamObjectiveState();
    if (objectiveText && objective) {
      if (objective.type === "control") {
        objectiveText.textContent = `점령전 · 🔴 ${Math.floor(objective.redScore)} / ${objective.scoreToWin}  |  🔵 ${Math.floor(objective.blueScore)} / ${objective.scoreToWin}`;
      } else if (objective.type === "relic") {
        const countdown = objective.relicWinningTeam
          ? ` · ${objective.relicWinningTeam === 1 ? "🔴" : "🔵"} 승리까지 ${Math.max(0, objective.relicWinCountdown).toFixed(1)}초`
          : "";
        const phase = objective.relicDeathmatchPhase ? " · ⚔️ 데스매치 단계 (부활 없음)" : "";
        objectiveText.textContent = `보석 쟁탈전 · 🔴 ${objective.redRelics}/${objective.relicGoal}  |  🔵 ${objective.blueRelics}/${objective.relicGoal}${countdown}${phase}`;
      } else {
        objectiveText.textContent = "데스매치 · 전원 섬멸";
      }
    }
  }

  // 분신(eunsu_clone)은 HUD 목록에서도 제외
  const sorted = [...characters]
    .filter((c) => !c.id.includes("eunsu_clone"))
    .sort((a, b) => {
      if (a.isDead && !b.isDead) return 1;
      if (!a.isDead && b.isDead) return -1;
      if (!a.isDead && !b.isDead) {
        return b.hp / b.maxHp - a.hp / a.maxHp;
      }
      return 0;
    });

  hudList.innerHTML = "";
  sorted.forEach((char) => {
    const hpPercent = (char.hp / char.maxHp) * 100;
    const skillPercent = char.skillGauge;
    const defenseShield = Math.max(0, Math.round(char.defenseShield ?? 0));
    const maxDefenseShield = Math.max(0, Math.round(char.maxDefenseShield ?? char.defense ?? 0));
    const defenseBarPercent = maxDefenseShield > 0 ? Math.min(100, (defenseShield / maxDefenseShield) * 100) : 0;
    const shieldPercent = Math.min(100, ((char.runShield ?? 0) / char.maxHp) * 100);
    const isSkillReady = char.skillGauge >= 100;
    const statusEffects = char.isDead ? [] : getCharacterStatusEffects(char);
    const statusBadges = statusEffects.map((effect) => `
      <span class="hud-status-chip" style="--status-color: ${effect.color}">
        <span class="hud-status-icon">${effect.icon}</span>
        <span>${effect.label}</span>
        <strong>${Math.max(0, effect.timeLeft).toFixed(1)}s</strong>
      </span>
    `).join("");

    const item = document.createElement("div");
    item.className = `hud-item ${char.isDead ? "dead" : ""}`;

    if (char.skillActive && !char.isDead) {
      item.style.borderColor = char.color;
      item.style.boxShadow = `0 0 10px ${char.color}`;
    }

    // 팀 식별 비주얼 오프셋
    let teamIndicatorClass = "";
    if (currentMode === "team") {
      teamIndicatorClass =
        char.teamId === 1 ? "team-indicator-1" : "team-indicator-2";
    } else if (currentMode === "boss") {
      teamIndicatorClass = char.isBoss
        ? "team-indicator-2"
        : "team-indicator-1";
    }

    item.innerHTML = `
      <div class="hud-avatar">
        ${getAvatarHTML(char.name, char.image, teamIndicatorClass)}
      </div>
      <div class="hud-info">
        <div class="hud-name-row">
          <span style="color: ${char.color}">${char.name}${char.isBoss ? " (👑)" : ""}</span>
          <span class="hud-hp-text">${char.isDead ? "탈락" : `${formatHp(char.hp)}/${formatHp(char.maxHp)}`}</span>
        </div>
        <!-- Permanent defense shield / HP -->
        ${maxDefenseShield > 0 ? `<div class="hud-defense-row"><span>DEF ${defenseShield}/${maxDefenseShield}</span><div class="bar-container hud-defense-bar"><div class="bar bar-defense" style="width:${char.isDead ? 0 : defenseBarPercent}%;"></div></div></div>` : ""}
        <div class="bar-container" style="margin-bottom: 4px;">
          <div class="bar bar-hp" style="width: ${hpPercent}%; background: ${char.isDead ? "#333" : ""};"></div>
        </div>
        ${shieldPercent > 0 && !char.isDead ? `<div class="hud-defense-row hud-shield-row"><span>🛡 ${Math.round(char.runShield ?? 0)}</span><div class="bar-container hud-shield-bar"><div class="bar bar-shield" style="width:${shieldPercent}%;"></div></div></div>` : ""}
        <!-- Skill Bar -->
        <div class="bar-container">
          <div class="bar bar-skill" style="width: ${skillPercent}%; background: ${char.isDead ? "#333" : isSkillReady ? "#ffd700" : ""};"></div>
        </div>
        ${statusBadges ? `<div class="hud-status-list">${statusBadges}</div>` : ""}
      </div>
      ${isSkillReady && !char.isDead ? '<div class="skill-indicator">READY</div>' : ""}
      ${char.skillActive && !char.isDead ? '<div class="skill-indicator" style="color: #ff3366;">ACTIVE</div>' : ""}
    `;

    hudList.appendChild(item);
  });
}

function renderPveRunModifiers() {
  if (currentMode !== "pve" || !pveRun) {
    pveRunModifiersPanel.classList.add("hidden");
    pveRunModifiersPanel.innerHTML = "";
    return;
  }
  const modifiers = getAllRunModifiers(pveRun.modifiers);
  pveRunModifiersPanel.classList.remove("hidden");
  pveRunModifiersPanel.innerHTML = `<div class="pve-run-modifiers-head"><span>이번 런 빌드</span><strong>런 증강 ${pveRun.modifiers.augments.length} · 런 보상 아이템 ${pveRun.modifiers.items.length}</strong></div>${modifiers.length > 0 ? `<div class="pve-run-modifier-list">${modifiers.map((modifier) => `<span class="pve-run-modifier ${modifier.kind} rarity-${modifier.rarity}" title="${modifier.description}">${modifier.icon} ${modifier.name}${modifier.stacks > 1 ? ` ×${modifier.stacks}` : ""}</span>`).join("")}</div>` : `<small>다음 단계부터 런 증강과 런 보상 아이템 선택이 이곳에 기록됩니다.</small>`}`;
}

function getPveRunSummaryMarkup(run: PveRun): string {
  const modifiers = getAllRunModifiers(run.modifiers);
  if (modifiers.length === 0) return `<p class="win-desc">이번 런에서는 아직 런 증강과 런 보상 아이템을 선택하지 않았습니다.</p>`;
  return `<div class="pve-run-summary"><strong>이번 런 빌드 (런 증강 및 런 보상 아이템)</strong>${modifiers.map((modifier) => `<span>${modifier.icon} ${modifier.name}</span>`).join("")}</div>`;
}

function getPveRunMaximumHp(run: PveRun): number {
  const character = availableCharacters.find((entry) => entry.id === run.characterId);
  if (!character) return run.maxHp;
  const progress = getPveProgress(character.id);
  return Math.round(getAllRunModifiers(run.modifiers).reduce(
    (maxHp, modifier) => maxHp * (modifier.effects?.maxHpMultiplier ?? 1),
    getLeveledHp(character.maxHp, progress),
  ));
}

function getPveAugmentContext(run: PveRun) {
  const character = availableCharacters.find((entry) => entry.id === run.characterId);
  return {
    characterId: run.characterId,
    equippedSkillNames: character ? [character.skillName] : [],
    dungeonId: run.dungeonId,
    stage: run.stage,
  };
}

function applyPveRunSelectionEffect(run: PveRun, effects: { maxHpMultiplier?: number; instantHealPercent?: number; shieldPercent?: number } | undefined) {
  if (!effects) return;
  const maxHp = getPveRunMaximumHp(run);
  if (effects.maxHpMultiplier) run.currentHp = maxHp;
  if (effects.instantHealPercent) run.currentHp = Math.min(maxHp, run.currentHp + maxHp * effects.instantHealPercent);
  if (effects.shieldPercent) run.currentShield += Math.round(maxHp * effects.shieldPercent);
}

function getPveAugmentRarityForClearedStage(stageNumber: number): Extract<RunModifierRarity, "silver" | "gold" | "platinum"> | null {
  if (stageNumber === 0) return "silver";
  if (stageNumber === 1) return "silver";
  if (stageNumber === 3) return "gold";
  if (stageNumber === 4) return "platinum";
  return null;
}

function showAugmentChoice(run: PveRun, clearedStageNumber: number, onChoose: () => void) {
  const rarity = getPveAugmentRarityForClearedStage(clearedStageNumber);
  if (!rarity) { onChoose(); return; }
  const choices = rollPveAugmentChoices(rarity, run.modifiers.augments.map((augment) => augment.id), clearedStageNumber, getPveAugmentContext(run));
  if (choices.length === 0) { onChoose(); return; }
  const labels: Record<Extract<RunModifierRarity, "silver" | "gold" | "platinum">, { tier: string; title: string; subtitle: string }> = {
    silver: { tier: clearedStageNumber === 0 ? "INITIAL AUGMENT" : "SILVER AUGMENT · 1/3", title: clearedStageNumber === 0 ? "첫 증강을 선택하세요" : "전투 방식을 선택하세요", subtitle: clearedStageNumber === 0 ? "첫 전투를 시작하기 전, 이번 런의 방향을 정하세요." : "선택한 증강은 이번 던전 런이 끝날 때까지 유지됩니다." },
    gold: { tier: "GOLD AUGMENT · 2/3", title: "빌드를 강화하세요", subtitle: "강력한 효과 하나를 골라 다음 전투를 준비하세요." },
    platinum: { tier: "PLATINUM AUGMENT · 3/3", title: "최종 증강을 선택하세요", subtitle: "5스테이지 진입 전에 마지막 빌드 완성을 선택하세요." },
  };
  const label = labels[rarity];
  augmentChoiceTier.textContent = label.tier;
  augmentChoiceTier.className = `augment-choice-tier rarity-${rarity}`;
  augmentChoiceTitle.textContent = label.title;
  augmentChoiceSubtitle.textContent = label.subtitle;
  augmentChoiceCards.innerHTML = "";
  choices.forEach((augment) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `augment-choice-card rarity-${augment.rarity}`;
    const source = augment.requirements?.equippedSkillName
      ? `장착 스킬 · ${augment.requirements.equippedSkillName}`
      : "공용 증강";
    card.innerHTML = `<span class="augment-choice-icon">${augment.icon}</span><b class="augment-choice-source">${source}</b><strong>${augment.name}</strong><small>${augment.description}</small><em>선택하기</em>`;
    card.addEventListener("click", () => {
      addPveRunAugment(run.modifiers, augment);
      applyPveRunSelectionEffect(run, augment.effects);
      augmentChoiceModal.classList.add("hidden");
      renderPveRunModifiers();
      onChoose();
    }, { once: true });
    augmentChoiceCards.appendChild(card);
  });
  augmentChoiceModal.classList.remove("hidden");
}

function showItemChoice(run: PveRun, clearedStageNumber: number, onChoose: () => void) {
  const rarity: Extract<RunModifierRarity, "common" | "rare"> | null = clearedStageNumber === 2 ? "common" : clearedStageNumber === 4 ? "rare" : null;
  if (!rarity || run.modifiers.items.length >= 3) { onChoose(); return; }
  const choices = rollPveItemChoices(rarity, run.modifiers.items.map((item) => item.id), clearedStageNumber);
  if (choices.length === 0) { onChoose(); return; }
  const label = rarity === "common"
    ? { tier: "COMMON ITEM · 1/2", title: "보급품을 선택하세요", subtitle: "아이템은 이번 던전 런이 끝날 때까지 유지됩니다." }
    : { tier: "RARE ITEM · 2/2", title: "희귀 보급품을 선택하세요", subtitle: "마지막 전투를 위한 아이템 하나를 고르세요." };
  augmentChoiceTier.textContent = label.tier;
  augmentChoiceTier.className = `augment-choice-tier rarity-${rarity}`;
  augmentChoiceTitle.textContent = label.title;
  augmentChoiceSubtitle.textContent = label.subtitle;
  augmentChoiceCards.innerHTML = "";
  choices.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `augment-choice-card rarity-${item.rarity}`;
    card.innerHTML = `<span class="augment-choice-icon">${item.icon}</span><b class="augment-choice-source">런 전용 아이템</b><strong>${item.name}</strong><small>${item.description}</small><em>획득하기</em>`;
    card.addEventListener("click", () => {
      addPveRunItem(run.modifiers, item);
      applyPveRunSelectionEffect(run, item.effects);
      augmentChoiceModal.classList.add("hidden");
      renderPveRunModifiers();
      onChoose();
    }, { once: true });
    augmentChoiceCards.appendChild(card);
  });
  augmentChoiceModal.classList.remove("hidden");
}

// Countdown handler
function updateCountdown(seconds: number) {
  if (seconds > 0) {
    countdownOverlay.classList.remove("hidden");
    countdownNumber.textContent = seconds.toString();
    gameStatusText.textContent = "전투 준비 중...";
  } else {
    countdownOverlay.classList.add("hidden");
    gameStatusText.textContent = "BATTLE!";
  }
}

function recordPveStageExperience(run: PveRun, stageNumber: number) {
  return convexClient.mutation(api.progression.recordDungeonStageClear, {
    characterId: run.characterId,
    dungeonId: run.dungeonId,
    stageNumber,
  });
}

// Game End & Show Winner
function showWinner(winner: CharacterState | null, allChars: CharacterState[]) {
  gameStatusText.textContent = "게임 종료";
  Object.values(SPECIAL_EVENT_RENDERERS).forEach((renderer) => winnerModal.classList.remove(renderer.modalClass));
  const winnerTitle = winnerModal.querySelector(".winner-title") as HTMLElement | null;

  if (currentMode === "pve" && pveRun) {
    const run = pveRun;
    const dungeon = getPveDungeon(run.dungeonId);
    const player = allChars.find((character) => character.id === run.characterId);
    const clearedStage = winner?.teamId === 1 && player && !player.isDead;
    if (!clearedStage || !player) {
      clearPveRunModifiers(run.modifiers);
      pveRun = null;
      renderPveRunModifiers();
      pveAdvancePending = false;
      if (winnerTitle) winnerTitle.textContent = "DUNGEON FAILED";
      winnerInfo.innerHTML = `<div class="winner-trophy">💀</div><div class="win-name" style="color:#ff5e5e">던전 실패</div><div class="win-desc">이번 스테이지 보상은 획득하지 못했습니다. 이전에 클리어한 스테이지의 XP는 유지됩니다.</div>`;
      modalCloseBtn.textContent = "던전 선택으로";
      winnerModal.classList.remove("hidden");
      return;
    }

    run.currentHp = Math.min(player.maxHp, player.hp + player.maxHp * 0.25);
    run.currentDefenseShield = player.defenseShield ?? 0;
    run.currentShield = player.runShield ?? 0;
    if (run.stage < getPveDungeon(run.dungeonId).stageCount) {
      const clearedStageNumber = run.stage;
      run.stage += 1;
      pveAdvancePending = true;
      gameStatusText.textContent = `던전 ${dungeon.number}-${clearedStageNumber} 클리어 · 다음 스테이지 대기 중`;
      void recordPveStageExperience(run, clearedStageNumber).then((result) => {
        
        const showStageClearResult = () => {
          if (winnerTitle) winnerTitle.textContent = "STAGE CLEARED";
          winnerInfo.innerHTML = `<div class="winner-trophy">⚔️</div><div class="win-name" style="color:${player.color}">던전 ${dungeon.number}-${clearedStageNumber} 클리어!</div><div class="win-desc">HP 25%를 회복했습니다.</div><div class="char-stats" style="margin-top:1.2rem"><div class="stat-row"><span>스테이지 획득 경험치</span><strong class="text-neon-yellow">+${result.experienceGranted} XP</strong></div><div class="stat-row"><span>현재 레벨</span><strong>Lv.${result.level}</strong></div><div class="stat-row"><span>다음 전투</span><strong>던전 ${dungeon.number}-${run.stage}</strong></div></div><p class="win-desc" style="margin-top:0.9rem">가챠 진행도는 던전 ${dungeon.number}-1부터 ${dungeon.number}-${dungeon.stageCount}까지 완주할 때만 증가합니다.</p>`;
          modalCloseBtn.textContent = "다음 스테이지";
          winnerModal.classList.remove("hidden");
        };
        showItemChoice(run, clearedStageNumber, () => showAugmentChoice(run, clearedStageNumber, showStageClearResult));
      }).catch(() => {
        pveAdvancePending = false;
        if (winnerTitle) winnerTitle.textContent = "STAGE SAVE FAILED";
        winnerInfo.innerHTML = `<div class="winner-trophy">⚠️</div><div class="win-name">스테이지 보상 저장에 실패했습니다</div><div class="win-desc">네트워크를 확인한 뒤 다시 도전해 주세요.</div>`;
        modalCloseBtn.textContent = "던전 선택으로";
        winnerModal.classList.remove("hidden");
      });
      return;
    }

    const runSummary = getPveRunSummaryMarkup(run);
    clearPveRunModifiers(run.modifiers);
    pveRun = null;
    renderPveRunModifiers();
    pveAdvancePending = false;
    const clearTimeMs = Date.now() - run.startedAt;
    gameStatusText.textContent = "던전 클리어";
    void recordPveStageExperience(run, run.stage).then((stageResult) => {
      
      if (!run.rewardEligible) {
        if (winnerTitle) winnerTitle.textContent = "STAGE CLEARED";
        winnerInfo.innerHTML = `<div class="winner-trophy">🧪</div><div class="win-name" style="color:${player.color}">던전 ${dungeon.number}-${run.stage} 클리어!</div><div class="win-desc">스테이지 보상만 획득했습니다.</div><div class="char-stats" style="margin-top:1.2rem"><div class="stat-row"><span>스테이지 획득 경험치</span><strong class="text-neon-yellow">+${stageResult.experienceGranted} XP</strong></div><div class="stat-row"><span>현재 레벨</span><strong>Lv.${stageResult.level}</strong></div></div>`;
        modalCloseBtn.textContent = "던전 선택으로";
        winnerModal.classList.remove("hidden");
        return;
      }
      return convexClient.mutation(api.progression.recordDungeonClear, {
        characterId: run.characterId,
        dungeonId: run.dungeonId,
        clearTimeMs,
      }).then((result) => {
        if (winnerTitle) winnerTitle.textContent = "DUNGEON CLEARED";
        winnerInfo.innerHTML = `<div class="winner-trophy">🧪</div><div class="win-name" style="color:${player.color}">${player.name} · ${dungeon.name} 클리어</div><div class="win-desc">${Math.ceil(clearTimeMs / 1000)}초 · 스테이지 ${dungeon.number}-1부터 ${dungeon.number}-${dungeon.stageCount}까지 적 전멸 성공</div><div class="char-stats" style="margin-top:1.2rem"><div class="stat-row"><span>마지막 스테이지 경험치</span><strong class="text-neon-yellow">+${stageResult.experienceGranted} XP</strong></div><div class="stat-row"><span>던전 클리어 횟수</span><strong>${result.totalDungeonClears}회 클리어</strong></div><div class="stat-row"><span>현재 레벨</span><strong>Lv.${result.level}</strong></div></div>${runSummary}`;
        modalCloseBtn.textContent = "던전 선택으로";
        winnerModal.classList.remove("hidden");
      });
    }).catch(() => {
      if (winnerTitle) winnerTitle.textContent = "STAGE SAVE FAILED";
      winnerInfo.innerHTML = `<div class="winner-trophy">⚠️</div><div class="win-name">스테이지 보상 저장에 실패했습니다</div><div class="win-desc">네트워크를 확인한 뒤 다시 시도해 주세요.</div>`;
      modalCloseBtn.textContent = "던전 선택으로";
      winnerModal.classList.remove("hidden");
    });
    return;
  }

  if (currentMode === "tournament" && tournamentState) {
    const finalists = allChars.filter((char) => !char.id.includes("clone") && char.id !== "dummy");
    const resolvedWinner = winner ?? [...finalists].sort((a, b) => (b.totalDamageDealt || 0) - (a.totalDamageDealt || 0))[0] ?? null;
    const next = findNextTournamentMatch();
    if (!next || !resolvedWinner) return;
    next.match.winnerId = resolvedWinner.id;
    recordGameEnd(resolvedWinner.id, allChars, "tournament");

    if (next.roundIndex === tournamentState.rounds.length - 1) {
      tournamentState.championId = resolvedWinner.id;
      tournamentState.awaitingNext = false;
      winnerInfo.innerHTML = `<div class="winner-trophy">🏆</div><h2 class="winner-title">TOURNAMENT CHAMPION</h2><div class="win-name" style="color:${resolvedWinner.color}">${resolvedWinner.name}</div>${renderTournamentBracket()}`;
      modalCloseBtn.textContent = "토너먼트 종료 · 로비로";
    } else {
      const followingRound = tournamentState.rounds[next.roundIndex + 1];
      const followingMatch = followingRound[Math.floor(next.matchIndex / 2)];
      followingMatch.players[next.matchIndex % 2] = resolvedWinner.id;
      tournamentState.awaitingNext = true;
      winnerInfo.innerHTML = `<div class="winner-trophy">🏆</div><h2 class="winner-title">${TOURNAMENT_ROUND_NAMES[next.roundIndex]} 결과</h2><div class="win-name" style="color:${resolvedWinner.color}">${resolvedWinner.name} 승리</div><p class="win-desc">다음 1대1 경기를 진행하세요.</p>${renderTournamentBracket()}`;
      modalCloseBtn.textContent = "다음 경기";
    }
    winnerModal.classList.remove("hidden");
    return;
  }

  // 승리 정보 기록 (승리 판수 증가 및 티어 갱신)
  const gameModeStr = currentMode === "solo" ? allChars.length.toString() : getCurrentStatsMode();
  recordGameEnd(winner ? winner.id : "draw", allChars, gameModeStr);
  if (currentMode === "boss") {
    const boss = allChars.find((character) => character.isBoss);
    if (boss) {
      void convexClient.mutation(api.stats.recordBossResult, {
        bossId: boss.id,
        cleared: winner !== null && !winner.isBoss,
      });
    }
  }

  if (isPracticeMode) {
    const player = allChars.find(
      (c) => c.id !== "dummy" && !c.id.includes("clone"),
    );
    if (player) {
      winnerInfo.innerHTML = `
        <div class="win-avatar">
          ${getAvatarHTML(player.name, player.image)}
        </div>
        <div class="win-name" style="color: ${player.color}">${player.name}</div>
        <div class="win-desc">연습 시뮬레이션이 종료되었습니다.</div>
        <div class="char-stats" style="margin-top: 1.5rem; width: 100%;">
          <div class="stat-row">
            <span>가한 총 대미지</span>
            <span class="stat-val" style="color: var(--neon-cyan);">${player.totalDamageDealt || 0}</span>
          </div>
        </div>
      `;
    }
    winnerModal.classList.remove("hidden");
    return;
  }

  const realChars = allChars.filter(
    (char) => !char.id.includes("clone") && char.id !== "dummy",
  );
  const mvp = realChars.find((c) => c.isMvp) || winner || realChars[0];
  const sorted = [...realChars].sort(
    (a, b) => (a.rank || 99) - (b.rank || 99),
  );
  const firstPlace = sorted[0] ?? winner ?? mvp;
  const equippedVictoryAction = victoryActionCatalog.find((action) => action.actionId === equippedVictoryActionId);
  const equippedVictoryBackground = victoryBackgroundCatalog.find((background) => background.backgroundId === equippedVictoryBackgroundId);
  const activeVictoryAction = equippedVictoryAction && (!equippedVictoryAction.characterId || equippedVictoryAction.characterId === firstPlace.id)
    ? equippedVictoryAction
    : undefined;
  const activeVictoryBackground = equippedVictoryBackground && (!equippedVictoryBackground.characterId || equippedVictoryBackground.characterId === firstPlace.id)
    ? equippedVictoryBackground
    : undefined;
  const equippedVictorySpecialEvent = victorySpecialEventCatalog.find((event) => event.specialEventId === equippedVictorySpecialEventId);
  const activeVictorySpecialEvent = equippedVictorySpecialEvent && (!equippedVictorySpecialEvent.characterId || equippedVictorySpecialEvent.characterId === firstPlace.id)
    ? equippedVictorySpecialEvent
    : undefined;
  const specialEventRenderer = getSpecialEventRenderer(activeVictorySpecialEvent);
  const hasVictoryCeremony = Boolean(activeVictoryAction || activeVictoryBackground);
  const ceremonyAnimation = activeVictoryBackground?.animation ?? activeVictoryAction?.animation ?? "";
  if (specialEventRenderer) winnerModal.classList.add(specialEventRenderer.modalClass);

  // 모드별 팀 승리 배너 정의
  let modeWinnerBanner = "";
  if (currentMode === "team") {
    const winningTeam = winner?.teamId;
    const ruleName = teamGameType === "control" ? "점령전" : teamGameType === "relic" ? "보석 쟁탈전" : "데스매치";
    if (winnerTitle) winnerTitle.textContent = "TEAM RESULT";

    if (winningTeam === 1) {
      modeWinnerBanner = `
        <div style="background: rgba(255,59,48,0.15); border: 2.5px solid #ff3b30; color: #ff3b30; font-size: 1.3rem; font-weight: 800; text-align: center; padding: 0.75rem; border-radius: 10px; margin-bottom: 1.2rem; font-family: 'Orbit', sans-serif; text-shadow: 0 0 8px rgba(255,59,48,0.4); box-shadow: 0 0 20px rgba(255,59,48,0.15);">
          🔴 RED TEAM WIN! · ${ruleName}
        </div>
      `;
    } else if (winningTeam === 2) {
      modeWinnerBanner = `
        <div style="background: rgba(0,122,255,0.15); border: 2.5px solid #007aff; color: #007aff; font-size: 1.3rem; font-weight: 800; text-align: center; padding: 0.75rem; border-radius: 10px; margin-bottom: 1.2rem; font-family: 'Orbit', sans-serif; text-shadow: 0 0 8px rgba(0,122,255,0.4); box-shadow: 0 0 20px rgba(0,122,255,0.15);">
          🔵 BLUE TEAM WIN! · ${ruleName}
        </div>
      `;
    } else {
      modeWinnerBanner = `
        <div style="background: rgba(255,255,255,0.06); border: 2.5px solid rgba(255,255,255,0.15); color: #fff; font-size: 1.3rem; font-weight: 800; text-align: center; padding: 0.75rem; border-radius: 10px; margin-bottom: 1.2rem; font-family: 'Orbit', sans-serif;">
          🤝 무승부 (DRAW)
        </div>
      `;
    }
  } else if (currentMode === "boss") {
    const boss = realChars.find((c) => c.isBoss);
    const bossDead = boss ? boss.isDead : true;

    if (bossDead) {
      if (winnerTitle) winnerTitle.textContent = "BOSS CLEARED";
      modeWinnerBanner = `
        <div style="background: rgba(255,59,48,0.15); border: 2.5px solid #ff3b30; color: #ff3b30; font-size: 1.3rem; font-weight: 800; text-align: center; padding: 0.75rem; border-radius: 10px; margin-bottom: 1.2rem; font-family: 'Orbit', sans-serif; text-shadow: 0 0 8px rgba(255,59,48,0.4); box-shadow: 0 0 20px rgba(255,59,48,0.15);">
          ⚔️ 토벌 성공! (보스 처치 완료)
        </div>
      `;
    } else {
      if (winnerTitle) winnerTitle.textContent = "RAID FAILED";
      modeWinnerBanner = `
        <div style="background: rgba(255,215,0,0.15); border: 2.5px solid #ffd700; color: #ffd700; font-size: 1.3rem; font-weight: 800; text-align: center; padding: 0.75rem; border-radius: 10px; margin-bottom: 1.2rem; font-family: 'Orbit', sans-serif; text-shadow: 0 0 8px rgba(255,215,0,0.4); box-shadow: 0 0 20px rgba(255,215,0,0.15);">
          👑 토벌 실패! (도전자단 전멸)
        </div>
      `;
    }
  } else if (winnerTitle) {
    winnerTitle.textContent = "VICTORY!";
  }

  // 실제 장착한 세레모니가 있을 때만 1위 캐릭터의 무대 연출을 보여준다.
  const firstPlaceScore = firstPlace.mvpScore
    ? Math.round(firstPlace.mvpScore)
    : 0;
  const firstPlaceKills = firstPlace.kills;
  const firstPlaceDmg = firstPlace.totalDamageDealt || 0;
  const topDamage = [...realChars].sort((a, b) => (b.totalDamageDealt || 0) - (a.totalDamageDealt || 0))[0];
  const topTaken = [...realChars].sort((a, b) => (b.totalDamageTaken || 0) - (a.totalDamageTaken || 0))[0];
  const topCc = [...realChars].sort((a, b) => (b.totalCcDuration || 0) - (a.totalCcDuration || 0))[0];
  const topReflect = [...realChars].sort((a, b) => (b.reflectedDamage || 0) - (a.reflectedDamage || 0))[0];
  const topObjective = [...realChars].sort((a, b) => (b.objectiveContribution || 0) - (a.objectiveContribution || 0))[0];
  const topBossSurvival = [...realChars].filter((char) => !char.isBoss).sort((a, b) => (b.bossSurvivalTime || 0) - (a.bossSurvivalTime || 0))[0];
  const objectiveMetric = teamGameType === 'control' ? '점령' : '보석';
  const highlights = [
    topDamage && `🔥 최다 피해 <b>${topDamage.name}</b> ${Math.round(topDamage.totalDamageDealt || 0)}`,
    topTaken && `🛡 최다 피격 <b>${topTaken.name}</b> ${Math.round(topTaken.totalDamageTaken || 0)}`,
    topCc && (topCc.totalCcDuration || 0) > 0 ? `💫 CC 기여 <b>${topCc.name}</b> ${(topCc.totalCcDuration || 0).toFixed(1)}초` : null,
    topReflect && (topReflect.reflectedDamage || 0) > 0 ? `🪞 반사 피해 <b>${topReflect.name}</b> ${Math.round(topReflect.reflectedDamage || 0)}` : null,
    currentMode === 'team' && topObjective ? `🎯 ${objectiveMetric} 기여 <b>${topObjective.name}</b> ${teamGameType === 'control' ? `${(topObjective.objectiveContribution || 0).toFixed(1)}초` : `${topObjective.objectiveContribution || 0}개`}` : null,
    currentMode === 'boss' && topBossSurvival ? `⏱ 생존 <b>${topBossSurvival.name}</b> ${(topBossSurvival.bossSurvivalTime || 0).toFixed(1)}초` : null,
  ].filter(Boolean).map((item) => `<div class="battle-highlight">${item}</div>`).join('');

  let html = `
    ${specialEventRenderer?.getOverlayMarkup(getVictoryPlayerMarkup(firstPlace)) ?? ""}
    ${modeWinnerBanner}
    <!-- First-place result / equipped victory background -->
    <div class="winner-ceremony-card ${hasVictoryCeremony ? `has-ceremony ceremony-${ceremonyAnimation}` : "no-ceremony"}" style="width: 100%; border: 1px solid ${firstPlace.color}40; box-shadow: 0 0 15px ${firstPlace.color}20;">
      <div class="winner-ceremony-rank">🥇 1위 ${hasVictoryCeremony ? "· VICTORY CEREMONY" : "결과"}</div>
      <div class="winner-ceremony-main">
        ${hasVictoryCeremony
          ? getCeremonySceneMarkup(activeVictoryBackground?.animation ?? null, activeVictoryAction?.animation ?? null, "preview", getVictoryPlayerMarkup(firstPlace))
          : `<div class="winner-ceremony-stage">${getAvatarHTML(firstPlace.name, firstPlace.image, "mvp-avatar")}</div>`}
        <div class="winner-ceremony-identity"><strong style="color: ${firstPlace.color}">${firstPlace.name}</strong>${hasVictoryCeremony ? `<span>${[activeVictoryAction?.name, activeVictoryBackground?.name].filter(Boolean).join(" · ")}</span>` : ""}</div>
      </div>
      <div class="mvp-stats-grid">
        <div class="mvp-stat-box">
          <div class="mvp-stat-label">⚔️ 처치</div>
          <div class="mvp-stat-val">${firstPlaceKills}</div>
        </div>
        <div class="mvp-stat-box">
          <div class="mvp-stat-label">🔥 가한 대미지</div>
          <div class="mvp-stat-val">${firstPlaceDmg}</div>
        </div>
        <div class="mvp-stat-box">
          <div class="mvp-stat-label">⭐ 전투 점수</div>
          <div class="mvp-stat-val" style="color: var(--neon-yellow);">${firstPlaceScore}</div>
        </div>
      </div>
    </div>

    <div class="battle-highlights">
      <div class="standings-header">📊 전투 하이라이트</div>
      <div class="battle-highlight-grid">${highlights}</div>
    </div>

    <!-- Rankings Section -->
    <div class="standings-container">
      <div class="standings-header">🏆 최종 순위 결과</div>
      <div class="standings-list">
        ${sorted
          .map((char, index) => {
            const rank = char.rank || index + 1;
            const isWinner = rank === 1;
            const rankBadgeClass =
              rank === 1
                ? "rank-gold"
                : rank === 2
                  ? "rank-silver"
                  : rank === 3
                    ? "rank-bronze"
                    : "rank-normal";
            const kills = char.kills;
            const damage = char.totalDamageDealt || 0;
            const taken = char.totalDamageTaken || 0;
            const cc = char.totalCcDuration || 0;
            const reflect = char.reflectedDamage || 0;
            const objective = char.objectiveContribution || 0;
            const survival = char.bossSurvivalTime || 0;
            const hpStatus = char.isDead
              ? '<span style="color: #ff3366;">탈락</span>'
              : `<span style="color: #39ff14;">${formatHp(char.hp)} HP</span>`;

            return `
            <div class="standing-item ${isWinner ? "winner-item" : ""}">
              <div class="standing-rank-badge ${rankBadgeClass}">${rank}</div>
              <div class="standing-avatar">
                ${getAvatarHTML(char.name, char.image, "standing-avatar-img")}
              </div>
              <div class="standing-name-col">
                <span class="standing-name" style="color: ${char.color}">${char.name}</span>
                <span class="standing-hp-status">${hpStatus}</span>
              </div>
              <div class="standing-stat-col">
                <span class="standing-stat-label">K/D</span>
                <span class="standing-stat-val">${kills}킬 / ${damage}딜</span>
              </div>
              <div class="standing-detail-stats">
                <span>🛡 ${taken}</span>
                <span>💫 ${cc.toFixed(1)}s</span>
                ${reflect > 0 ? `<span>🪞 ${reflect}</span>` : ''}
                ${currentMode === 'team' ? `<span>🎯 ${teamGameType === 'control' ? `${objective.toFixed(1)}s` : `${objective}개`}</span>` : ''}
                ${currentMode === 'boss' && !char.isBoss ? `<span>⏱ ${survival.toFixed(1)}s</span>` : ''}
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    </div>
  `;

  winnerInfo.innerHTML = html;
  winnerModal.classList.remove("hidden");
}

// Close Winner Modal and go to Lobby
function closeWinnerModal() {
  winnerModal.classList.add("hidden");
  if (currentMode === "pve" && pveAdvancePending && pveRun) {
    pveAdvancePending = false;
    startPveStage();
    return;
  }
  if (currentMode === "tournament" && tournamentState?.awaitingNext) {
    tournamentState.awaitingNext = false;
    launchNextTournamentMatch();
    return;
  }
  goBackToLobby();
}

function goBackToLobby() {
  if (gameView.classList.contains("is-focus-mode")) void setFocusMode(false);
  augmentChoiceModal.classList.add("hidden");
  isPracticeMode = false;
  if (pveRun) clearPveRunModifiers(pveRun.modifiers);
  pveRun = null;
  renderPveRunModifiers();
  pveAdvancePending = false;
  tournamentState = null;
  if (tournamentHeader) tournamentHeader.classList.add("hidden");
  if (gameLounge) {
    gameLounge.stop();
  }
  gameView.classList.add("hidden");
  delete gameView.dataset.mode;
  lobbyView.classList.remove("hidden");
  initLobby();
}

function startQuickPlay() {
  if (!currentCharacterId) {
    alert("먼저 로그인해 주세요.");
    return;
  }
  
  // Set game mode to team deathmatch
  currentMode = "team";
  teamGameType = "deathmatch";
  
  // Clear selections
  selectedIds.clear();
  selectedRedIds.clear();
  selectedBlueIds.clear();
  bossCharacterId = null;
  
  // Player is on Red Team
  selectedIds.add(currentCharacterId);
  selectedRedIds.add(currentCharacterId);
  
  // Find other characters (excluding current character's family)
  const playerChar = availableCharacters.find((c) => c.id === currentCharacterId);
  const playerFamilyId = playerChar ? getCharacterFamilyId(playerChar) : "";
  const candidates = availableCharacters.filter((c) => getCharacterFamilyId(c) !== playerFamilyId);
  
  // Shuffle candidates
  const shuffled = [...candidates];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  
  // Red Team: 1 more member (total 2)
  if (shuffled[0]) {
    selectedIds.add(shuffled[0].id);
    selectedRedIds.add(shuffled[0].id);
  }
  
  // Blue Team: 2 members (total 2)
  if (shuffled[1]) {
    selectedIds.add(shuffled[1].id);
    selectedBlueIds.add(shuffled[1].id);
  }
  if (shuffled[2]) {
    selectedIds.add(shuffled[2].id);
    selectedBlueIds.add(shuffled[2].id);
  }
  
  // Start the game!
  startGame();
}

function startRandomGame() {
  const shuffled = [...availableCharacters];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  selectedIds.clear();
  selectedRedIds.clear();
  selectedBlueIds.clear();
  bossCharacterId = null;

  if (currentMode === "team") {
    shuffled.slice(0, 6).forEach((character, index) => {
      selectedIds.add(character.id);
      (index < 3 ? selectedRedIds : selectedBlueIds).add(character.id);
    });
  } else if (currentMode === "boss") {
    const boss = availableBossCharacters[Math.floor(Math.random() * availableBossCharacters.length)];
    if (!boss) {
      alert("등록된 보스 캐릭터가 없습니다.");
      return;
    }
    bossCharacterId = boss.id;
    selectedIds.add(boss.id);
    shuffled
      .filter((character) => getCharacterFamilyId(character) !== getCharacterFamilyId(boss))
      .slice(0, BOSS_CHALLENGER_COUNT)
      .forEach((character) => {
        selectedIds.add(character.id);
        selectedRedIds.add(character.id);
      });
  } else if (currentMode === "tournament") {
    shuffled.slice(0, 16).forEach((character) => selectedIds.add(character.id));
  } else {
    const count = /^[2-6]$/.test(selectedStatsMode)
      ? Number(selectedStatsMode)
      : 2;
    shuffled.slice(0, count).forEach((character) => selectedIds.add(character.id));
  }

  initLobby(true);
  updateStartButtonState();
  if (currentMode === "tournament") startTournament();
  else startGame();
}

// Listeners
startBtn.addEventListener("click", startGame);
backToLobbyBtn.addEventListener("click", goBackToLobby);
modalCloseBtn.addEventListener("click", closeWinnerModal);
if (randomStartBtn) {
  randomStartBtn.addEventListener("click", startRandomGame);
}

const practiceStartBtn = document.getElementById("practice-start-btn");
if (practiceStartBtn) {
  practiceStartBtn.addEventListener("click", startPracticeGame);
}

if (openStatsBtn && statsCenterModal) {
  openStatsBtn.addEventListener("click", () => {
    statsCenterModal.classList.remove("hidden");
    renderTierList();
  });
}

if (closeStatsBtn && statsCenterModal) {
  closeStatsBtn.addEventListener("click", () => {
    statsCenterModal.classList.add("hidden");
  });
}

if (resetStatsBtn) {
  resetStatsBtn.addEventListener("click", async () => {
    const confirmed = window.confirm(
      "모든 전적, 피해량, 상성, 1대1 티어 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.",
    );
    if (!confirmed) return;

    const originalLabel = resetStatsBtn.textContent;
    resetStatsBtn.disabled = true;
    resetStatsBtn.textContent = "전적 초기화 중…";

    try {
      const result = await convexClient.mutation(api.stats.resetMatchHistory, {
        confirmation: "RESET_MATCH_HISTORY",
      });
      alert(
        result.scheduled
          ? "전적 DB 정리를 시작했습니다. 데이터 양에 따라 잠시 후 모두 비워집니다."
          : "전적 DB를 초기화했습니다.",
      );
    } catch (error) {
      console.error("Failed to reset match history", error);
      alert("전적 초기화에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      resetStatsBtn.disabled = false;
      resetStatsBtn.textContent = originalLabel;
    }
  });
}

function subscribeToGlobalData() {
  if (statsUnsubscribe) statsUnsubscribe();
  if (countersUnsubscribe) countersUnsubscribe();
  if (damageRankingUnsubscribe) damageRankingUnsubscribe();
  if (bossDifficultyUnsubscribe) bossDifficultyUnsubscribe();

  const mode = selectedStatsMode;

  statsUnsubscribe = convexClient.onUpdate(
    api.stats.getStats,
    { mode },
    (statsList) => {
      currentGlobalStats = statsList;
      updateLobbyUI();
    },
  );

  countersUnsubscribe = convexClient.onUpdate(
    api.stats.getCounters,
    { mode },
    (countersList) => {
      currentGlobalCounters = countersList;
      updateLobbyUI();
    },
  );

  damageRankingUnsubscribe = convexClient.onUpdate(
    api.stats.getDamageRanking,
    { mode },
    (rankingList) => {
      currentGlobalDamageRanking = rankingList;
      updateLobbyUI();
    },
  );

  if (mode === "boss") {
    bossDifficultyUnsubscribe = convexClient.onUpdate(
      api.stats.getBossDifficulty,
      {},
      (bosses) => {
        currentBossDifficulty = bosses;
        updateLobbyUI();
      },
    );
  } else {
    currentBossDifficulty = [];
  }
}

function updateLobbyUI() {
  calculateDynamicTiers();

  // 티어표 채우기
  renderTierList();

  // 평균 가한 피해량 랭킹 채우기 (Convex 서버에서 계산 및 정렬 완료된 데이터를 직접 렌더링)
  if (damageRankingWrapper) {
    damageRankingWrapper.innerHTML = "";

    // 최대 평균 피해량을 계산해 바 비례 너비 산출
    const maxAvgDmg = currentGlobalDamageRanking.reduce(
      (max, item) => Math.max(max, item.avgDamageDealt),
      1,
    );

    currentGlobalDamageRanking.forEach((item, index) => {
      const char = availableCharacters.find((c) => c.id === item.characterId);
      if (!char) return;

      const rank = index + 1;
      const rankClass =
        rank === 1
          ? "first"
          : rank === 2
            ? "second"
            : rank === 3
              ? "third"
              : "";
      const percent = (item.avgDamageDealt / maxAvgDmg) * 100;

      const rankItem = document.createElement("div");
      rankItem.className = "dmg-rank-item";
      rankItem.innerHTML = `
        <span class="dmg-rank-num ${rankClass}">${rank}</span>
        <span class="dmg-rank-name" style="color: ${char.color};">${char.name}</span>
        <div class="dmg-rank-bar-container">
          <div class="dmg-rank-bar" style="width: ${percent}%; background: linear-gradient(90deg, ${char.color} 0%, rgba(255,255,255,0.1) 100%);"></div>
        </div>
        <span class="dmg-rank-val">${item.avgDamageDealt.toFixed(1)} <span style="font-size: 0.65rem; opacity: 0.6;">(${item.games}판)</span></span>
      `;
      damageRankingWrapper.appendChild(rankItem);
    });
  }

  // 티어표 가시성 토글
  if (lobbyTotalGames < 10) {
    if (tierListNotice) tierListNotice.classList.remove("hidden");
    if (tierRowsWrapper) tierRowsWrapper.classList.add("hidden");
  } else {
    if (tierListNotice) tierListNotice.classList.add("hidden");
    if (tierRowsWrapper) tierRowsWrapper.classList.remove("hidden");
  }

  // 캐릭터 카드들 내용 실시간 갱신 (승률, 전적 수치 등)
  const cards = Array.from(characterListContainer.children) as HTMLElement[];
  cards.forEach((card) => {
    const charId = card.dataset.id;
    if (!charId) return;
    const char = availableCharacters.find((c) => c.id === charId);
    if (!char) return;

    // 티어 뱃지 갱신
    const currentTier = char.tier || "C";
    const badge = card.querySelector(".tier-card-badge") as HTMLElement;
    if (badge) {
      badge.className = `tier-card-badge tier-badge-${currentTier.toLowerCase()}`;
      badge.textContent = currentTier;
    }

    const statsRecord = getStoredStats();
    const mode = selectedStatsMode;
    const stats = statsRecord[mode] || {};
    const s = stats[char.id] || {
      wins: 0,
      games: 0,
      damageDealt: 0,
      damageTaken: 0,
      rankSum: 0,
      mvpCount: 0,
    };
    const winRate = s.games > 0 ? (s.wins / s.games) * 100 : 0;

    // 승률 및 전적 판수 갱신
    const winRateVal = card.querySelector(".text-neon-yellow") as HTMLElement;
    if (winRateVal) {
      winRateVal.textContent = `${winRate.toFixed(1)}% (${s.wins}승/${s.games}판)`;
    }

    const rankSum = s.rankSum || 0;
    const mvpCount = s.mvpCount || 0;
    const avgRank = s.games > 0 ? (rankSum / s.games).toFixed(1) : "-";

    const avgRankVal = card.querySelector(".avg-rank-val") as HTMLElement;
    if (avgRankVal) {
      avgRankVal.textContent = `${avgRank}위`;
    }
    const mvpCountVal = card.querySelector(".mvp-count-val") as HTMLElement;
    if (mvpCountVal) {
      mvpCountVal.textContent = `${mvpCount}회`;
    }

    // 대미지 및 카운터 정보 갱신
    const countersAll = getStoredCounters();
    const modeCounters = countersAll[mode] || {};

    const myDeathRecords = modeCounters[char.id] || {};
    let worstKillerId = "";
    let worstKillerCount = 0;
    for (const [kId, count] of Object.entries(myDeathRecords)) {
      if (count > worstKillerCount) {
        worstKillerCount = count;
        worstKillerId = kId;
      }
    }
    const worstKillerName = worstKillerId
      ? availableCharacters.find((c) => c.id === worstKillerId)?.name || "없음"
      : "없음";
    const worstKillerStr = worstKillerId
      ? `${worstKillerName} (${worstKillerCount}데스)`
      : "없음";

    let bestVictimId = "";
    let bestVictimCount = 0;
    for (const [victimId, killerRecords] of Object.entries(modeCounters)) {
      const killedByMe = killerRecords[char.id] || 0;
      if (killedByMe > bestVictimCount) {
        bestVictimCount = killedByMe;
        bestVictimId = victimId;
      }
    }
    const bestVictimName = bestVictimId
      ? availableCharacters.find((c) => c.id === bestVictimId)?.name || "없음"
      : "없음";
    const bestVictimStr = bestVictimId
      ? `${bestVictimName} (${bestVictimCount}킬)`
      : "없음";

    const greenEls = card.querySelectorAll(".char-history .text-neon-green");
    const redEls = card.querySelectorAll(".char-history .text-neon-red");

    // 1. Damage Dealt (1st green)
    if (greenEls[0]) greenEls[0].textContent = s.damageDealt.toString();
    // 2. Best Victim (2nd green)
    if (greenEls[1]) greenEls[1].textContent = bestVictimStr;

    // 3. Damage Taken (1st red)
    if (redEls[0]) redEls[0].textContent = s.damageTaken.toString();
    // 4. Worst Killer (2nd red)
    if (redEls[1]) redEls[1].textContent = worstKillerStr;
  });
}

// ==========================================
// 캐릭터 상세 모달 및 역할군 필터 이벤트 핸들링
// ==========================================
const detailCloseBtn = document.getElementById("detail-close-btn");
const charDetailModal = document.getElementById("char-detail-modal");

if (detailCloseBtn && charDetailModal) {
  detailCloseBtn.addEventListener("click", () => {
    charDetailModal.classList.add("hidden");
  });

  // 모달 영역 외 바깥 클릭 시 닫기
  charDetailModal.addEventListener("click", (e) => {
    if (e.target === charDetailModal) {
      charDetailModal.classList.add("hidden");
    }
  });
}

// 역할군 필터 탭 바인딩
const roleTabs = document.querySelectorAll(".role-tab");
roleTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    roleTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentRoleFilter = tab.getAttribute("data-role") || "all";
    initLobby(true); // 선택 상태 보존
  });
});

function openCharacterDetail(charId: string) {
  const char = availableCharacters.find((c) => c.id === charId);
  if (!char) return;

  if (!charDetailModal) return;

  // 이름 주입
  const nameEl = document.getElementById("detail-char-name");
  if (nameEl) nameEl.textContent = char.name;

  // 역할군 배지 주입
  const roleEl = document.getElementById("detail-char-role-badge");
  if (roleEl) {
    const roleMap: Record<string, { label: string; color: string }> = {
      Nuker: { label: "🔥 누커", color: "#ff3366" },
      Sniper: { label: "🎯 저격수", color: "#ff2d55" },
      Speedster: { label: "⚡ 기동형", color: "#ffd700" },
      Guardian: { label: "🛡️ 수호형", color: "#33cc66" },
      Juggernaut: { label: "🦖 돌격형", color: "#ff8c00" },
      Disabler: { label: "🌀 제어형", color: "#00bfff" },
      Summoner: { label: "🌪️ 소환형", color: "#ff007f" },
      Specialist: { label: "🎰 변수형", color: "#9933ff" },
      Supporter: { label: "🧪 지원형", color: "#888888" },
    };
    const roleInfo = roleMap[char.role] || {
      label: char.role,
      color: "#888888",
    };
    roleEl.textContent = roleInfo.label;
    roleEl.style.backgroundColor = `${roleInfo.color}25`;
    roleEl.style.border = `1px solid ${roleInfo.color}80`;
    roleEl.style.color = roleInfo.color;
  }

  // 아바타 렌더링
  const avatarContainer = document.getElementById(
    "detail-char-avatar-container",
  );
  if (avatarContainer) {
    avatarContainer.innerHTML = getAvatarHTML(
      char.name,
      char.image,
      "detail-avatar-img",
    );
    const avatarEl = avatarContainer.firstElementChild as HTMLElement;
    if (avatarEl) {
      avatarEl.style.width = "70px";
      avatarEl.style.height = "70px";
      avatarEl.style.border = `2px solid ${char.color}`;
      avatarEl.style.boxShadow = `0 0 12px ${char.color}50`;
      if (avatarEl.classList.contains("avatar-text")) {
        avatarEl.style.background = `radial-gradient(circle, ${char.color}35 0%, rgba(0,0,0,0.6) 100%)`;
      }
    }
  }

  // 상세 설명 주입
  const descEl = document.getElementById("detail-char-desc");
  if (descEl) descEl.textContent = char.detailedDescription;

  // 스탯 게이지 채우기
  const hpPercent = Math.min(100, (char.maxHp / 200) * 100);
  const hpBar = document.getElementById("detail-stat-bar-hp");
  if (hpBar) hpBar.style.width = `${hpPercent}%`;
  const hpVal = document.getElementById("detail-stat-val-hp");
  if (hpVal) hpVal.textContent = char.maxHp.toString();

  const atkPercent = Math.min(100, (char.attackPower / 30) * 100);
  const atkBar = document.getElementById("detail-stat-bar-atk");
  if (atkBar) atkBar.style.width = `${atkPercent}%`;
  const atkVal = document.getElementById("detail-stat-val-atk");
  if (atkVal) atkVal.textContent = char.attackPower.toString();

  const speedPercent = Math.min(100, (char.speed / 2.0) * 100);
  const speedBar = document.getElementById("detail-stat-bar-speed");
  if (speedBar) speedBar.style.width = `${speedPercent}%`;
  const speedVal = document.getElementById("detail-stat-val-speed");
  if (speedVal) speedVal.textContent = `${char.speed.toFixed(1)}x`;

  // 스킬 정보
  const skillNameEl = document.getElementById("detail-skill-name");
  if (skillNameEl) {
    skillNameEl.textContent = char.skillName;
    skillNameEl.style.color = char.color;
  }
  const skillDescEl = document.getElementById("detail-skill-desc");
  if (skillDescEl) skillDescEl.textContent = char.skillDescription;

  charDetailModal.classList.remove("hidden");
}

function getPveProgress(characterId: string): PveProgress {
  return pveProgressByCharacter.get(characterId) ?? { level: 1, experience: 0, experienceInCurrentLevel: 0, experienceToNextLevel: 100, isMaxLevel: false, healthMultiplier: 1, attackMultiplier: 1, defenseShieldBonus: 0, totalDungeonClears: 0 };
}

function updatePveSelectionUI() {
  const selected = availableCharacters.find((character) => character.id === selectedPveCharacterId);
  if (!selected) {
    if (pveCharacterSelectAvatar) pveCharacterSelectAvatar.textContent = "?";
    if (pveCharacterSelectName) pveCharacterSelectName.textContent = "캐릭터 선택";
    if (pveCharacterSelectStats) pveCharacterSelectStats.textContent = "선택 후 레벨과 능력치를 확인합니다.";
    pveStartBtn.disabled = true;
    return;
  }
  const progress = getPveProgress(selected.id);
  if (pveCharacterSelectAvatar) {
    pveCharacterSelectAvatar.textContent = selected.name.slice(0, 1);
    pveCharacterSelectAvatar.style.color = selected.color;
  }
  if (pveCharacterSelectName) {
    pveCharacterSelectName.textContent = `${selected.name} · Lv.${progress.level}`;
  }
  if (pveCharacterSelectStats) {
    const nextSkillUnlock = getNextSkillUnlockLevel(progress.level);
    pveCharacterSelectStats.textContent = `DEF ${getLeveledDefenseShield(selected, progress)} · HP ${getLeveledHp(selected.maxHp, progress)} · ATK ${getLeveledAttack(selected.attackPower, progress)} · ${nextSkillUnlock ? `다음 스킬 Lv.${nextSkillUnlock}` : "스킬 해금 완료"} · EXP ${getExperienceLabel(progress)} · 던전 ${progress.totalDungeonClears}회 클리어`;
  }
  pveStartBtn.disabled = false;
}

function renderPveCharacterList() {
  if (!pveCharacterList) return;
  pveCharacterList.innerHTML = "";
  const randomButton = document.createElement("button");
  randomButton.type = "button";
  randomButton.className = "character-row";
  randomButton.innerHTML = `<div class="row-identity"><div class="avatar-text">?</div><div><div class="char-name">무작위 캐릭터</div><div class="row-skill-name">입장할 때 무작위로 선택합니다.</div></div></div><div class="row-winrate"><strong class="text-neon-yellow">RANDOM</strong><small>던전 도전</small></div>`;
  randomButton.addEventListener("click", () => {
    const random = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
    if (!random) return;
    selectedPveCharacterId = random.id;
    pveCharacterModal?.classList.add("hidden");
    updatePveSelectionUI();
  });
  pveCharacterList.appendChild(randomButton);
  availableCharacters.forEach((character) => {
    const progress = getPveProgress(character.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `character-row ${selectedPveCharacterId === character.id ? "selected" : ""}`;
    const nextSkillUnlock = getNextSkillUnlockLevel(progress.level);
    button.innerHTML = `<div class="row-identity">${getAvatarHTML(character.name, character.image)}<div><div class="char-name">${character.name}</div><div class="row-skill-name">Lv.${progress.level} · ${character.role}</div></div></div><div class="char-stats row-stats"><span>DEF <b>${getLeveledDefenseShield(character, progress)}</b></span><span>HP <b>${getLeveledHp(character.maxHp, progress)}</b></span><span>ATK <b>${getLeveledAttack(character.attackPower, progress)}</b></span></div><div class="row-winrate">EXP <strong class="text-neon-yellow">${getExperienceLabel(progress)}</strong><small>${nextSkillUnlock ? `다음 스킬 해금 Lv.${nextSkillUnlock}` : "스킬 해금 완료 · 숙련 강화 준비"} · 던전 ${progress.totalDungeonClears}회 클리어</small></div>`;
    button.addEventListener("click", () => {
      selectedPveCharacterId = character.id;
      pveCharacterModal?.classList.add("hidden");
      updatePveSelectionUI();
    });
    pveCharacterList.appendChild(button);
  });
}

function initPveProgressSubscription() {
  void convexClient.mutation(api.progression.ensureInitialState, {});
  pveProgressUnsubscribe?.();
  if (currentCharacterId) {
    pveProgressUnsubscribe = convexClient.onUpdate(
      api.progression.getOverview,
      { characterId: currentCharacterId },
      (overview) => {
        if (!overview) return;
        pveProgressByCharacter = new Map([
          [overview.character.characterId, {
            ...overview.character,
            unlockedDungeonIds: overview.isLaboratoryUnlocked
              ? [SLIME_MEADOW_DUNGEON_ID, LABORATORY_DUNGEON_ID]
              : [SLIME_MEADOW_DUNGEON_ID],
          }]
        ]);
        pveDungeonRewards = new Map((overview.dungeons as PveDungeonReward[]).map((dungeon) => [dungeon.dungeonId, dungeon]));
        updatePveSelectionUI();
        if (pveCharacterModal && !pveCharacterModal.classList.contains("hidden")) renderPveCharacterList();
      }
    );
  }
}

function openPveCharacterModal() {
  isPickingPveCharacter = true;
  previewMatchCharacterId = selectedPveCharacterId;
  renderMatchCharacterPicker();
  matchCharacterPickerModal.classList.remove("hidden");
}

function startPveDungeon() {
  if (!selectedPveCharacterId) return;
  const character = availableCharacters.find((entry) => entry.id === selectedPveCharacterId);
  if (!character) return;
  const progress = getPveProgress(character.id);
  pveCharacterModal?.classList.add("hidden");
  gameModeModal.classList.add("hidden");
  const stage = 1;
  const dungeonId = pveDungeonSelect.value;
  if (dungeonId === LABORATORY_DUNGEON_ID && !progress.unlockedDungeonIds?.includes(LABORATORY_DUNGEON_ID)) {
    return;
  }

  const characterItems = characterPlayerItems.get(character.id) ?? [];
  const effects = resolvePersistentItemEffects(characterItems);
  
  let baseMaxHp = getLeveledHp(character.maxHp, progress);
  let baseMaxDefenseShield = getLeveledDefenseShield(character, progress);

  if (effects.maxHpMultiplier) {
    baseMaxHp = Math.round(baseMaxHp * effects.maxHpMultiplier);
  }
  if (effects.defenseShieldBonus) {
    baseMaxDefenseShield += effects.defenseShieldBonus;
  }

  pveRun = { characterId: character.id, dungeonId, stage, startedAt: Date.now(), maxHp: baseMaxHp, currentHp: baseMaxHp, currentDefenseShield: baseMaxDefenseShield, currentShield: 0, rewardEligible: true, modifiers: createPveRunModifiers() };
  showAugmentChoice(pveRun, 0, startPveStage);
}

function startPveStage() {
  if (!pveRun) return;
  const character = availableCharacters.find((entry) => entry.id === pveRun?.characterId);
  if (!character) return;
  const progress = getPveProgress(character.id);
  const dungeon = getPveDungeon(pveRun.dungeonId);
  const enemies = dungeon.createStage(pveRun.stage);
  applyArenaToCanvas(getArenaForMatch("team", 2, "deathmatch"));
  lobbyView.classList.add("hidden");
  gameView.classList.remove("hidden");
  gameView.dataset.mode = "pve";
  setHudCollapsed(true);
  document.getElementById("boss-battle-header")?.classList.add("hidden");
  document.getElementById("team-battle-header")?.classList.add("hidden");
  const player = createCharacterState(character, 0, enemies.length + 1, gameCanvas.width, gameCanvas.height);
  applyEquippedCosmetic(player);
  player.maxHp = getLeveledHp(character.maxHp, progress);
  player.attackPower = getLeveledAttack(character.attackPower, progress);
  player.maxDefenseShield = getLeveledDefenseShield(character, progress);

  // Apply persistent items to player state
  const stageItems = characterPlayerItems.get(character.id) ?? [];
  const stageEffects = resolvePersistentItemEffects(stageItems);
  applyPersistentItemStats(player, stageEffects);

  applyPveRunModifierStats(player, pveRun.modifiers);
  player.hp = Math.min(player.maxHp, pveRun.currentHp);
  player.defenseShield = Math.min(player.maxDefenseShield, pveRun.currentDefenseShield);
  player.runShield = pveRun.currentShield;
  player.teamId = 1;
  player.x = player.radius * 2.5;
  player.y = gameCanvas.height / 2;
  const enemyStates = enemies.map((enemy, index) => {
    const state = createCharacterState(enemy, index + 1, enemies.length + 1, gameCanvas.width, gameCanvas.height);
    state.teamId = 2;
    state.x = gameCanvas.width - state.radius * 2.5 - (index % 2) * 85;
    state.y = ((index + 1) / (enemies.length + 1)) * gameCanvas.height;
    return state;
  });
  totalCountEl.textContent = String(enemyStates.length + 1);
  aliveCountEl.textContent = String(enemyStates.length + 1);
  gameStatusText.textContent = `${dungeon.name} · ${pveRun.stage}/${dungeon.stageCount} 스테이지`;
  if (!gameLounge) gameLounge = new GameLounge(gameCanvas, updateHUD, showWinner, updateCountdown, recordCharacterDeath);
  gameLounge.init([player, ...enemyStates], gameSpeedMultiplier, "deathmatch", true);
}

// Initialize Game Mode Tab Selection
function selectGameplayMode(selectedMode: Exclude<GameMode, "boss">) {
  const modeDesc = document.getElementById("mode-desc");
  const modeDescriptions: Record<string, string> = {
    pve: "🧪 PvE 던전: 캐릭터 하나를 골라 초원의 슬라임 소굴 5스테이지에 도전합니다.",
    solo: "⚔️ 개인전: 최후의 1인이 승리하는 배틀로얄 방식입니다. (최소 2명 선택 필요)",
    team: "🔴🔵 팀전: 레드팀과 블루팀으로 나뉘어 전면전을 펼칩니다. 아군 킬(Friendly Fire)은 면역입니다.",
    boss: "👑 보스전: 전용 보스 캐릭터(1명) vs 도전자들의 비대칭 대결입니다. 보스의 능력치와 스킬은 전용 파일에서 정의됩니다.",
    tournament: "🏆 토너먼트: 정확히 16명을 선택하세요. 무작위 16강 대진부터 결승까지 모두 1대1로 진행합니다.",
  };
  currentMode = selectedMode;
  const isPve = selectedMode === "pve";
  pveCommandPanel.classList.toggle("hidden", !isPve);
  pvpSetupPanel.classList.toggle("hidden", isPve);
  // gameModeSetupHost.replaceChildren(modeSettingsRow, isPve ? pveCommandPanel : pvpSetupPanel);
  updateTeamGameTypeVisibility();
  updateStatsModeControls(selectedMode);
  if (modeDesc) modeDesc.textContent = modeDescriptions[selectedMode];
  const heading = document.getElementById("gameplay-heading");
  if (heading) heading.textContent = "게임플레이";
  selectedIds.clear(); selectedRedIds.clear(); selectedBlueIds.clear(); bossCharacterId = null;
  matchSlotIds = Array.from({ length: selectedMode === "team" ? 6 : selectedMode === "tournament" ? 16 : 2 }, () => null);
  randomMatchSlotIndexes.clear();
  renderMatchSlots();
  initLobby(true);
}

function renderMatchSlots() {
  if (currentMode === "pve") return;
  matchSelectionSlots.innerHTML = "";
  matchSlotIds.forEach((id, index) => {
    const character = availableCharacters.find((entry) => entry.id === id);
    const slot = document.createElement("button"); slot.type = "button";
    slot.className = `match-character-slot ${character ? "filled" : ""} ${currentMode === "team" ? index < 3 ? "red" : "blue" : ""}`;
    const slotLabel = currentMode === "team" ? index < 3 ? "RED" : "BLUE" : "선택됨";
    slot.innerHTML = character ? `<strong style="color:${character.color}">${character.name}</strong><small>${slotLabel}${randomMatchSlotIndexes.has(index) ? " · 랜덤" : ""}</small>` : `<b>?</b><small>${currentMode === "team" ? index < 3 ? "RED 슬롯" : "BLUE 슬롯" : `참가자 ${index + 1}`}</small>`;
    slot.addEventListener("click", () => { isPickingPveCharacter = false; activeMatchSlot = index; renderMatchCharacterPicker(); matchCharacterPickerModal.classList.remove("hidden"); });
    matchSelectionSlots.appendChild(slot);
  });
}

function fillMatchSlotsRandomly() {
  const slotsToRandomize = matchSlotIds
    .map((characterId, index) => characterId === null || randomMatchSlotIndexes.has(index) ? index : null)
    .filter((index): index is number => index !== null);
  const preservedCharacterIds = new Set(matchSlotIds
    .filter((id, index): id is string => id !== null && !slotsToRandomize.includes(index)));
  const candidates = availableCharacters.filter((character) => !preservedCharacterIds.has(character.id));
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
  }

  slotsToRandomize.forEach((slotIndex, candidateIndex) => {
    matchSlotIds[slotIndex] = candidates[candidateIndex]?.id ?? null;
    randomMatchSlotIndexes.add(slotIndex);
  });
  selectedIds.clear(); selectedRedIds.clear(); selectedBlueIds.clear();
  matchSlotIds.forEach((characterId, index) => {
    if (!characterId) return;
    selectedIds.add(characterId);
    if (currentMode === "team") (index < 3 ? selectedRedIds : selectedBlueIds).add(characterId);
  });
  renderMatchSlots();
  updateStartButtonState();
}

function renderMatchCharacterPicker() {
  matchCharacterPickerList.innerHTML = "";
  const candidates = isPickingPveCharacter
    ? availableCharacters
    : availableCharacters.filter((character) => !matchSlotIds.includes(character.id) || matchSlotIds[activeMatchSlot] === character.id);
  if (!previewMatchCharacterId || !candidates.some((character) => character.id === previewMatchCharacterId)) previewMatchCharacterId = candidates[0]?.id ?? null;
  const randomButton = document.createElement("button");
  randomButton.type = "button";
  randomButton.className = "picker-character picker-random";
  randomButton.innerHTML = `<span class="picker-icon-frame"><b>?</b></span><strong>무작위</strong><small>중복 없이 자동 선택</small>`;
  randomButton.addEventListener("click", () => {
    const usedByOtherSlots = isPickingPveCharacter ? new Set<string>() : new Set(matchSlotIds.filter((id, index) => index !== activeMatchSlot && id));
    const eligible = availableCharacters.filter((character) => !usedByOtherSlots.has(character.id));
    const picked = eligible[Math.floor(Math.random() * eligible.length)];
    if (picked) chooseMatchCharacter(picked.id, true);
  });
  matchCharacterPickerList.appendChild(randomButton);
  candidates.forEach((character) => {
    const button = document.createElement("button"); button.type = "button"; button.className = `picker-character ${previewMatchCharacterId === character.id ? "active" : ""}`;
    const progress = getPveProgress(character.id);
    button.innerHTML = `<span class="picker-icon-frame" style="--picker-color:${character.color}">${getAvatarHTML(character.name, character.image, "picker-avatar")}</span><strong>${character.name}</strong><small>Lv.${progress.level} · ${character.role}</small>`;
    button.addEventListener("click", () => { previewMatchCharacterId = character.id; renderMatchCharacterPicker(); }); matchCharacterPickerList.appendChild(button);
  });
  renderMatchCharacterPreview();
}

function renderMatchCharacterPreview() {
  const character = availableCharacters.find((entry) => entry.id === previewMatchCharacterId);
  if (!character) { matchCharacterPickerDetail.textContent = "선택 가능한 캐릭터가 없습니다."; return; }
  const progress = getPveProgress(character.id); const cosmetic = cosmeticCatalog.find((entry) => entry.cosmeticId === cosmeticLoadouts.get(character.id));
  const skinEffect = cosmetic
    ? `${cosmetic.rarity.toUpperCase()} · ${cosmetic.style.borderAnimation === "none" ? "기본 테두리" : `${cosmetic.style.borderAnimation} 테두리`} · ${cosmetic.style.trail === "none" ? "이동 흔적 없음" : `${cosmetic.style.trail} 이동 흔적`}`
    : "기본 외형 · 캐릭터 고유 색상과 테두리를 사용합니다.";
  matchCharacterPickerDetail.innerHTML = `<div class="picker-detail-head"><div class="picker-preview-avatar">${getAvatarHTML(character.name, character.image, "picker-preview-image")}</div><div><span class="eyebrow">${character.role}</span><h3 style="color:${character.color}">${character.name} <small>Lv.${progress.level}</small></h3></div></div><div class="picker-stat-grid"><span>DEF <b>${getLeveledDefenseShield(character, progress)}</b></span><span>HP <b>${getLeveledHp(character.maxHp, progress)}</b></span><span>ATK <b>${getLeveledAttack(character.attackPower, progress)}</b></span><span>SPD <b>${character.speed.toFixed(1)}x</b></span></div><section class="picker-info-block"><em>PASSIVE · 장착됨</em><strong>기존 고유 패시브</strong><p>캐릭터 고유 전투 로직이 현재 전투에 유지됩니다.</p></section><section class="picker-info-block"><em>ACTIVE · 장착됨</em><strong>${character.skillName}</strong><p>${character.skillDescription}</p></section><section class="picker-info-block skin-info"><em>SKIN · 현재 착용</em><strong>${cosmetic?.name ?? "기본 외형"}</strong><p>${skinEffect}</p></section><button id="confirm-match-character-btn" class="btn btn-primary" type="button">${character.name} 선택하기</button>`;
  document.getElementById("confirm-match-character-btn")?.addEventListener("click", () => chooseMatchCharacter(character.id));
}

function chooseMatchCharacter(characterId: string, selectedRandomly = false) {
  if (isPickingPveCharacter) {
    selectedPveCharacterId = characterId;
    updatePveSelectionUI();
    matchCharacterPickerModal.classList.add("hidden");
    isPickingPveCharacter = false;
    return;
  }
  matchSlotIds[activeMatchSlot] = characterId;
  if (selectedRandomly) randomMatchSlotIndexes.add(activeMatchSlot);
  else randomMatchSlotIndexes.delete(activeMatchSlot);
  selectedIds.clear(); selectedRedIds.clear(); selectedBlueIds.clear();
  matchSlotIds.forEach((id, index) => { if (!id) return; selectedIds.add(id); if (currentMode === "team") (index < 3 ? selectedRedIds : selectedBlueIds).add(id); });
  matchCharacterPickerModal.classList.add("hidden"); renderMatchSlots(); updateStartButtonState();
}


function updateCoinsDisplay(coins: number) {
  const storeLabel = document.getElementById("store-coins-label");
  if (storeLabel) storeLabel.textContent = coins.toLocaleString();
  const playLabel = document.getElementById("play-profile-coins");
  if (playLabel) playLabel.textContent = coins.toLocaleString();
}

function mapNicknameToCharacterId(nickname: string): string | null {
  const lower = nickname.trim().toLowerCase();
  const matched = availableCharacters.find((char) => {
    return char.id.toLowerCase() === lower || char.name.toLowerCase() === lower;
  });
  return matched ? matched.id : null;
}

function initLogin() {
  const loginOverlay = document.getElementById("login-overlay") as HTMLElement;
  const nicknameInput = document.getElementById("login-nickname-input") as HTMLInputElement;
  const loginBtn = document.getElementById("login-btn") as HTMLButtonElement;
  const loginErrorMsg = document.getElementById("login-error-msg") as HTMLElement;

  const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem("dambae-v4-character-id");
      currentCharacterId = null;
      currentCharacterProgress = null;
      progressUnsubscribe?.();
      progressUnsubscribe = null;
      skillsUnsubscribe?.();
      skillsUnsubscribe = null;
      loginOverlay.classList.remove("hidden");
    };
  }

  if (currentCharacterId) {
    loginOverlay.classList.add("hidden");
    startUserSession();
  } else {
    loginOverlay.classList.remove("hidden");
  }

  const handleLoginSubmit = async () => {
    const inputVal = nicknameInput.value.trim();
    if (!inputVal) return;
    const charId = mapNicknameToCharacterId(inputVal);
    if (!charId) {
      loginErrorMsg.textContent = "현재 해당 캐릭터가 없으니 운영자에게 문의 하세요";
      loginErrorMsg.classList.remove("hidden");
      return;
    }

    try {
      const progress = await convexClient.query(api.progression.getCharacterProgress, { characterId: charId });
      if (!progress) {
        loginErrorMsg.textContent = "현재 해당 캐릭터가 없으니 운영자에게 문의 하세요";
        loginErrorMsg.classList.remove("hidden");
        return;
      }
      
      localStorage.setItem("dambae-v4-character-id", charId);
      currentCharacterId = charId;
      loginOverlay.classList.add("hidden");
      startUserSession();
    } catch (err) {
      loginErrorMsg.textContent = err instanceof Error ? err.message : "로그인에 실패했습니다.";
      loginErrorMsg.classList.remove("hidden");
    }
  };

  loginBtn.onclick = () => { void handleLoginSubmit(); };
  nicknameInput.onkeydown = (e) => {
    if (e.key === "Enter") void handleLoginSubmit();
  };
}

function startUserSession() {
  if (!currentCharacterId) return;

  initCosmetics();
  initPersistentItems();
  initPveProgressSubscription();

  selectedPveCharacterId = currentCharacterId;

  progressUnsubscribe?.();
  progressUnsubscribe = convexClient.onUpdate(
    api.progression.getCharacterProgress,
    { characterId: currentCharacterId },
    (progress) => {
      currentCharacterProgress = progress;
      if (progress) {
        updateCoinsDisplay(progress.coins);
      }
      renderPlayTab();
      renderBookTab();
    }
  );

  skillsUnsubscribe?.();
  skillsUnsubscribe = convexClient.onUpdate(
    api.progression.getCharacterSkills,
    { characterId: currentCharacterId },
    (skills) => {
      characterSkillsInvested.clear();
      (skills as any[]).forEach((skill) => {
        characterSkillsInvested.set(skill.skillId, skill.level);
      });
      renderGrowthTab();
      renderBookTab();
    }
  );

  selectHubTab("play");
}

function selectHubTab(hub: string) {
  document.querySelectorAll<HTMLElement>(".hub-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== `${hub}-hub-panel`);
  });
  document.querySelectorAll<HTMLButtonElement>(".hub-tab").forEach((tab) => {
    const isMatched = tab.getAttribute("data-hub") === hub;
    tab.classList.toggle("active", isMatched);
    tab.setAttribute("aria-selected", String(isMatched));
  });

  if (hub === "store") renderStoreTab();
  else if (hub === "skin") renderSkinTab();
  else if (hub === "growth") renderGrowthTab();
  else if (hub === "book") renderBookTab();
  else if (hub === "play") renderPlayTab();
}

function renderPlayTab() {
  if (!currentCharacterId || !currentCharacterProgress) return;
  const character = availableCharacters.find((c) => c.id === currentCharacterId);
  if (!character) return;

  const progress = currentCharacterProgress;

  const avatar = document.getElementById("play-profile-avatar");
  if (avatar) {
    const equippedSkinId = cosmeticLoadouts.get(currentCharacterId) ?? "";
    const activeSkin = cosmeticCatalog.find((c) => c.cosmeticId === equippedSkinId);
    if (activeSkin) {
      avatar.style.borderColor = activeSkin.style.borderColor;
      avatar.style.background = activeSkin.style.fillColor;
      avatar.style.color = activeSkin.style.textColor;
      avatar.style.boxShadow = `0 0 15px ${activeSkin.style.glowColor ?? activeSkin.style.borderColor}`;
      avatar.innerHTML = `<span class="skin-visual skin-visual-management" aria-hidden="true" style="font-size: 1.8rem;"><b>${character.name.slice(0, 1)}</b></span>`;
    } else {
      avatar.style.borderColor = character.color;
      avatar.style.background = "rgba(0,242,254,0.1)";
      avatar.style.color = "#00f2fe";
      avatar.style.boxShadow = `0 0 15px rgba(0,242,254,0.25)`;
      avatar.innerHTML = `<span class="skin-visual skin-visual-management" aria-hidden="true" style="font-size: 1.8rem;"><b>${character.name.slice(0, 1)}</b></span>`;
    }
  }

  const nameEl = document.getElementById("play-profile-nickname");
  if (nameEl) nameEl.textContent = `${character.name} (${currentCharacterId})`;

  const levelEl = document.getElementById("play-profile-level");
  if (levelEl) levelEl.textContent = `LV ${progress.level}`;

  const coinsEl = document.getElementById("play-profile-coins");
  if (coinsEl) coinsEl.textContent = progress.coins.toLocaleString();

  const nextLevelXp = progress.level * 100;
  const xpPct = Math.min(100, (progress.experience / nextLevelXp) * 100);
  const expText = document.getElementById("play-profile-exp-text");
  if (expText) expText.textContent = `${progress.experience} / ${nextLevelXp}`;
  const expFill = document.getElementById("play-profile-exp-fill");
  if (expFill) expFill.style.width = `${xpPct}%`;

  const pvpStat = document.getElementById("play-pvp-stat");
  if (pvpStat) pvpStat.textContent = `${progress.pvpWins ?? 0}승 ${progress.pvpLosses ?? 0}패`;
  const pveStat = document.getElementById("play-pve-stat");
  if (pveStat) pveStat.textContent = `${progress.dungeonClears ?? 0}회 클리어`;
}

function renderStoreTab() {
  if (!currentCharacterId || !currentCharacterProgress) return;
  const coinsEl = document.getElementById("store-coins-label");
  if (coinsEl) coinsEl.textContent = currentCharacterProgress.coins.toLocaleString();

  const items = characterPlayerItems.get(currentCharacterId) ?? [];
  const spaceEl = document.getElementById("store-bag-space");
  if (spaceEl) spaceEl.textContent = `${items.length} / 20`;
}

function renderSkinTab() {
  if (!currentCharacterId) return;
  const character = availableCharacters.find((c) => c.id === currentCharacterId);
  if (!character) return;

  const previewBox = document.getElementById("skin-equipped-avatar-box");
  const previewName = document.getElementById("skin-equipped-name");
  const previewDetails = document.getElementById("skin-equipped-details");

  const equippedSkinId = cosmeticLoadouts.get(currentCharacterId) ?? "";
  const activeSkin = cosmeticCatalog.find((c) => c.cosmeticId === equippedSkinId);

  if (previewBox) {
    if (activeSkin) {
      previewBox.style.borderColor = activeSkin.style.borderColor;
      previewBox.style.background = activeSkin.style.fillColor;
      previewBox.style.color = activeSkin.style.textColor;
      previewBox.style.boxShadow = `0 0 20px ${activeSkin.style.glowColor ?? activeSkin.style.borderColor}`;
      previewBox.innerHTML = `<b>${character.name.slice(0, 1)}</b>`;
    } else {
      previewBox.style.borderColor = character.color;
      previewBox.style.background = "rgba(0,0,0,0.4)";
      previewBox.style.color = "#fff";
      previewBox.style.boxShadow = "none";
      previewBox.innerHTML = `<b>${character.name.slice(0, 1)}</b>`;
    }
  }

  if (previewName) previewName.textContent = character.name;

  if (previewDetails) {
    const actionName = victoryActionCatalog.find((a) => a.actionId === equippedVictoryActionId)?.name ?? "기본 행동";
    const bgName = victoryBackgroundCatalog.find((b) => b.backgroundId === equippedVictoryBackgroundId)?.name ?? "기본 배경";
    const specialName = victorySpecialEventCatalog.find((s) => s.specialEventId === equippedVictorySpecialEventId)?.name ?? "선택 안 함";
    previewDetails.innerHTML = `
      스킨: <strong>${activeSkin?.name ?? "기본 외형"}</strong><br>
      세레모니: <strong>${actionName}</strong><br>
      무대 배경: <strong>${bgName}</strong><br>
      특수 이벤트: <strong>${specialName}</strong>
    `;
  }

  const grid = document.getElementById("skin-items-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (activeSkinTabType === "skin") {
    const basicSkin = document.createElement("button");
    basicSkin.type = "button";
    basicSkin.className = `gacha-skin-icon ${!equippedSkinId ? "active" : ""}`;
    basicSkin.style.setProperty("--skin-border", character.color);
    basicSkin.style.setProperty("--skin-fill", "rgba(0,0,0,0.4)");
    basicSkin.style.setProperty("--skin-text", "#fff");
    basicSkin.style.setProperty("--skin-glow", character.color);
    basicSkin.innerHTML = `<span class="skin-visual skin-visual-management" aria-hidden="true"><b>${character.name.slice(0, 1)}</b></span><small>기본 외형</small>`;
    basicSkin.onclick = () => { void clearCosmetic(character.id); };
    grid.appendChild(basicSkin);

    cosmeticCatalog.forEach((skin) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `gacha-skin-icon ${skin.isUnlocked ? "unlocked" : "locked"} ${equippedSkinId === skin.cosmeticId ? "active" : ""}`;
      card.style.setProperty("--skin-border", skin.style.borderColor);
      card.style.setProperty("--skin-fill", skin.style.fillColor);
      card.style.setProperty("--skin-text", skin.style.textColor);
      card.style.setProperty("--skin-glow", skin.style.glowColor ?? skin.style.borderColor);
      card.innerHTML = `${getSkinVisualMarkup(skin.style, skin.isUnlocked ? "SKIN" : "?", "icon")}<small class="rarity-${skin.rarity}">${skin.name}</small>`;
      if (skin.isUnlocked) {
        card.onclick = () => { void equipCosmetic(character.id, skin.cosmeticId); };
      }
      grid.appendChild(card);
    });
  } else if (activeSkinTabType === "action") {
    const basicAction = document.createElement("button");
    basicAction.type = "button";
    basicAction.className = `gacha-skin-icon ceremony-catalog-icon unlocked ${!equippedVictoryActionId ? "active" : ""}`;
    basicAction.innerHTML = `<div class="ceremony-action-preview" aria-hidden="true"><span>기본</span></div><small>기본 행동</small>`;
    basicAction.onclick = () => { void clearVictoryPart("action"); };
    grid.appendChild(basicAction);

    victoryActionCatalog.forEach((action) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `gacha-skin-icon ceremony-catalog-icon ${action.isUnlocked ? "unlocked" : "locked"} ${equippedVictoryActionId === action.actionId ? "active" : ""}`;
      card.innerHTML = `${getCeremonyActionPreviewMarkup(action.animation)}<small class="rarity-${action.rarity}">${action.name}</small>`;
      if (action.isUnlocked) {
        card.onclick = () => { void equipVictoryPart("action", action); };
      }
      grid.appendChild(card);
    });
  } else if (activeSkinTabType === "background") {
    const basicBg = document.createElement("button");
    basicBg.type = "button";
    basicBg.className = `gacha-skin-icon ceremony-catalog-icon unlocked ${!equippedVictoryBackgroundId ? "active" : ""}`;
    basicBg.innerHTML = `<div class="ceremony-background-preview" aria-hidden="true"><span>기본</span></div><small>기본 배경</small>`;
    basicBg.onclick = () => { void clearVictoryPart("background"); };
    grid.appendChild(basicBg);

    victoryBackgroundCatalog.forEach((bg) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `gacha-skin-icon ceremony-catalog-icon ${bg.isUnlocked ? "unlocked" : "locked"} ${equippedVictoryBackgroundId === bg.backgroundId ? "active" : ""}`;
      card.innerHTML = `${getCeremonyBackgroundPreviewMarkup(bg.animation)}<small class="rarity-${bg.rarity}">${bg.name}</small>`;
      if (bg.isUnlocked) {
        card.onclick = () => { void equipVictoryPart("background", bg); };
      }
      grid.appendChild(card);
    });
  } else if (activeSkinTabType === "specialEvent") {
    const basicEvent = document.createElement("button");
    basicEvent.type = "button";
    basicEvent.className = `gacha-skin-icon ceremony-catalog-icon unlocked ${!equippedVictorySpecialEventId ? "active" : ""}`;
    basicEvent.innerHTML = `<div class="special-event-catalog-thumb" aria-hidden="true"><span>없음</span></div><small>기본 설정</small>`;
    basicEvent.onclick = () => { void clearVictorySpecialEvent(character.id); };
    grid.appendChild(basicEvent);

    victorySpecialEventCatalog.forEach((event) => {
      const renderer = getSpecialEventRenderer(event);
      if (!renderer) return;
      const card = document.createElement("button");
      card.type = "button";
      card.className = `gacha-skin-icon ceremony-catalog-icon ${event.isUnlocked ? "unlocked" : "locked"} ${equippedVictorySpecialEventId === event.specialEventId ? "active" : ""}`;
      card.innerHTML = `${renderer.getCatalogMarkup()}<small class="rarity-${event.rarity}">${event.name}</small>`;
      if (event.isUnlocked) {
        card.onclick = () => { void equipVictorySpecialEvent(character.id, event); };
      }
      grid.appendChild(card);
    });
  }
}

function renderGrowthTab() {
  if (!currentCharacterId) return;

  const eqPanel = document.getElementById("growth-equipment-panel") as HTMLElement;
  const skPanel = document.getElementById("growth-skills-panel") as HTMLElement;
  if (eqPanel && skPanel) {
    eqPanel.classList.toggle("hidden", selectedGrowthSubTab !== "equipment");
    skPanel.classList.toggle("hidden", selectedGrowthSubTab !== "skills");
  }

  document.querySelectorAll<HTMLButtonElement>(".growth-tab-btn").forEach((btn) => {
    const isMatched = btn.dataset.growthSub === selectedGrowthSubTab;
    btn.classList.toggle("active", isMatched);
  });

  if (selectedGrowthSubTab === "equipment") {
    renderEquipmentSubTab();
  } else {
    renderSkillsSubTab();
  }
}

function renderEquipmentSubTab() {
  if (!currentCharacterId) return;
  const items = characterPlayerItems.get(currentCharacterId) ?? [];

  const bagCountLabel = document.getElementById("bag-count-label");
  if (bagCountLabel) bagCountLabel.textContent = `${items.length} / 20`;

  const slots = [1,2,3,4,5,6,7,8];
  slots.forEach((slotNum) => {
    const slotEl = document.querySelector(`.eq-slot[data-eq-slot="${slotNum}"]`) as HTMLElement;
    if (!slotEl) return;
    const equipped = items.find((item) => item.equippedSlot === slotNum);
    if (equipped) {
      const catalogItem = persistentItemCatalog.find((c) => c.itemId === equipped.itemCatalogId);
      slotEl.className = `eq-slot rarity-${catalogItem?.rarity ?? "common"} equipped ${selectedItemId === equipped.itemId ? "selected" : ""}`;
      slotEl.innerHTML = `<span>Lv.${equipped.level} ${catalogItem?.name ?? "아이템"}</span><small style="font-size:0.65rem; color:#fff;">Slot ${slotNum}</small>`;
      slotEl.onclick = () => {
        selectedItemId = equipped.itemId;
        selectedFeedMaterialIds.clear();
        renderEquipmentSubTab();
      };
    } else {
      slotEl.className = `eq-slot empty ${selectedItemId === `slot-${slotNum}` ? "selected" : ""}`;
      slotEl.innerHTML = `<span>Slot ${slotNum}</span><small style="font-size:0.65rem; color:var(--text-secondary); margin-top:4px;">비어있음</small>`;
      slotEl.onclick = () => {
        const selectedItem = items.find((item) => item.itemId === selectedItemId);
        if (selectedItem && selectedItem.equippedSlot <= 0) {
          void equipPersistentItemAction(selectedItem.itemId, slotNum);
        } else {
          selectedItemId = null;
          renderEquipmentSubTab();
        }
      };
    }
  });

  const bagGrid = document.getElementById("equipment-bag-grid");
  if (!bagGrid) return;
  bagGrid.innerHTML = "";

  const bagItems = items.filter((item) => item.equippedSlot <= 0);
  if (bagItems.length === 0) {
    bagGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem 0;">가방이 비어 있습니다.</p>`;
  } else {
    bagItems.forEach((item) => {
      const catalogItem = persistentItemCatalog.find((c) => c.itemId === item.itemCatalogId);
      const card = document.createElement("button");
      card.type = "button";
      
      const isInspected = selectedItemId === item.itemId;
      const isMaterial = selectedFeedMaterialIds.has(item.itemId);
      
      card.className = `bag-item-card rarity-${catalogItem?.rarity ?? "common"} ${isInspected ? "inspected" : ""} ${isMaterial ? "material-selected" : ""}`;
      card.innerHTML = `
        <strong>Lv.${item.level} ${catalogItem?.name ?? "기어"}</strong>
        <small>${catalogItem?.rarity.toUpperCase()}</small>
      `;
      card.onclick = () => {
        if (selectedItemId && selectedItemId !== item.itemId) {
          if (selectedFeedMaterialIds.has(item.itemId)) {
            selectedFeedMaterialIds.delete(item.itemId);
          } else {
            selectedFeedMaterialIds.add(item.itemId);
          }
        } else {
          selectedItemId = item.itemId;
          selectedFeedMaterialIds.clear();
        }
        renderEquipmentSubTab();
      };
      bagGrid.appendChild(card);
    });
  }

  renderInspectorPanel();
}

function renderInspectorPanel() {
  const inspector = document.getElementById("equipment-inspector-panel");
  if (!inspector) return;

  const items = characterPlayerItems.get(currentCharacterId!) ?? [];
  const selectedItem = items.find((item) => item.itemId === selectedItemId);

  const placeholder = document.getElementById("inspector-placeholder");
  const detailPanel = document.getElementById("inspector-detail-panel");

  if (!selectedItem) {
    if (placeholder) placeholder.style.display = "flex";
    if (detailPanel) detailPanel.style.display = "none";
    return;
  }

  if (placeholder) placeholder.style.display = "none";
  if (detailPanel) detailPanel.style.display = "flex";

  const catalogItem = persistentItemCatalog.find((c) => c.itemId === selectedItem.itemCatalogId);
  
  const nameEl = document.getElementById("inspector-item-name");
  if (nameEl) {
    nameEl.textContent = `Lv.${selectedItem.level} ${catalogItem?.name ?? "전투 기어"}`;
    nameEl.className = `rarity-${catalogItem?.rarity ?? "common"}`;
  }
  const descEl = document.getElementById("inspector-item-desc");
  if (descEl) descEl.textContent = catalogItem?.description ?? "";
  
  const effectsEl = document.getElementById("inspector-item-effects");
  if (effectsEl) {
    const lvl = selectedItem.level;
    const baseMult = catalogItem?.effects?.maxHpMultiplier ? `체력 배율: +${Math.round((catalogItem.effects.maxHpMultiplier ** lvl - 1.0)*100)}%` : "";
    const baseDef = catalogItem?.effects?.defenseShieldBonus ? `보호막 증가: +${catalogItem.effects.defenseShieldBonus * lvl}` : "";
    effectsEl.innerHTML = [baseMult, baseDef].filter(Boolean).join("<br>");
  }

  const expLabel = document.getElementById("inspector-item-exp");
  const expFill = document.getElementById("inspector-item-exp-fill");
  
  const nextLvlExp = selectedItem.level * 100;
  if (expLabel) expLabel.textContent = `${selectedItem.experience} / ${nextLvlExp}`;
  if (expFill) expFill.style.width = `${Math.min(100, (selectedItem.experience / nextLvlExp) * 100)}%`;

  const feedArea = document.getElementById("feed-composite-area") as HTMLElement;
  const feedSummary = document.getElementById("feed-materials-summary");
  const feedBtn = document.getElementById("btn-execute-feed") as HTMLButtonElement;

  if (feedArea) {
    if (selectedItem.equippedSlot > 0) {
      feedArea.style.display = "none";
    } else {
      feedArea.style.display = "flex";
      if (feedSummary) {
        feedSummary.textContent = selectedFeedMaterialIds.size > 0 
          ? `선택된 제물: ${selectedFeedMaterialIds.size}개`
          : "선택된 제물: 없음";
      }
      if (feedBtn) {
        feedBtn.disabled = selectedFeedMaterialIds.size === 0;
        feedBtn.onclick = () => { void executeFeedAction(selectedItem.itemId); };
      }
    }
  }

  const equipBtn = document.getElementById("btn-inspector-equip") as HTMLButtonElement;
  const unequipBtn = document.getElementById("btn-inspector-unequip") as HTMLButtonElement;
  const sellBtn = document.getElementById("btn-inspector-sell") as HTMLButtonElement;

  if (selectedItem.equippedSlot > 0) {
    if (equipBtn) equipBtn.style.display = "none";
    if (unequipBtn) {
      unequipBtn.style.display = "block";
      unequipBtn.onclick = () => { void unequipPersistentItemAction(selectedItem.itemId); };
    }
  } else {
    if (unequipBtn) unequipBtn.style.display = "none";
    if (equipBtn) {
      equipBtn.style.display = "block";
      equipBtn.onclick = () => {
        const usedSlots = new Set(items.filter((item) => item.equippedSlot > 0).map((item) => item.equippedSlot));
        const emptySlot = [1,2,3,4,5,6,7,8].find((slot) => !usedSlots.has(slot));
        if (emptySlot) {
          void equipPersistentItemAction(selectedItem.itemId, emptySlot);
        } else {
          alert("장착할 빈 슬롯이 없습니다! 기존 장비를 해제하세요.");
        }
      };
    }
  }

  if (sellBtn) {
    sellBtn.disabled = selectedItem.equippedSlot > 0;
    sellBtn.onclick = () => { void sellPersistentItemAction(selectedItem.itemId); };
  }
}

async function equipPersistentItemAction(itemId: string, slotNum: number) {
  if (!currentCharacterId) return;
  try {
    const items = characterPlayerItems.get(currentCharacterId) ?? [];
    const targetItem = items.find((item) => item.itemId === itemId);
    if (!targetItem) return;

    const hasDuplicate = items.some((item) => item.equippedSlot > 0 && item.itemCatalogId === targetItem.itemCatalogId);
    if (hasDuplicate) {
      alert("동일한 종류 of 아이템은 중복 장착할 수 없습니다!");
      return;
    }

    await convexClient.mutation(api.persistentItems.equipPersistentItem, {
      characterId: currentCharacterId,
      itemId: itemId as any,
      slot: slotNum,
    });
    selectedItemId = null;
    selectedFeedMaterialIds.clear();
    renderGrowthTab();
  } catch (err) {
    alert(err instanceof Error ? err.message : "장착에 실패했습니다.");
  }
}

async function unequipPersistentItemAction(itemId: string) {
  if (!currentCharacterId) return;
  try {
    await convexClient.mutation(api.persistentItems.equipPersistentItem, {
      characterId: currentCharacterId,
      itemId: itemId as any,
      slot: 0,
    });
    selectedItemId = null;
    selectedFeedMaterialIds.clear();
    renderGrowthTab();
  } catch (err) {
    alert(err instanceof Error ? err.message : "해제에 실패했습니다.");
  }
}

async function sellPersistentItemAction(itemId: string) {
  if (!currentCharacterId) return;
  if (!confirm("정말 이 아이템을 판매하여 코인을 환급받으시겠습니까?")) return;
  try {
    await convexClient.mutation(api.persistentItems.sellItem, {
      characterId: currentCharacterId,
      itemId: itemId as any,
    });
    selectedItemId = null;
    selectedFeedMaterialIds.clear();
    renderGrowthTab();
  } catch (err) {
    alert(err instanceof Error ? err.message : "판매에 실패했습니다.");
  }
}

async function executeFeedAction(itemId: string) {
  if (!currentCharacterId) return;
  try {
    await convexClient.mutation(api.persistentItems.feedItem, {
      characterId: currentCharacterId,
      targetItemId: itemId as any,
      materialItemIds: Array.from(selectedFeedMaterialIds) as any,
    });
    selectedFeedMaterialIds.clear();
    renderGrowthTab();
  } catch (err) {
    alert(err instanceof Error ? err.message : "제물 합성에 실패했습니다.");
  }
}

function renderSkillsSubTab() {
  if (!currentCharacterId || !currentCharacterProgress) return;
  const progress = currentCharacterProgress;

  let spent = 0;
  characterSkillsInvested.forEach((lvl) => {
    spent += lvl;
  });

  const avail = Math.max(0, progress.level - 1 - spent);
  const availEl = document.getElementById("skill-points-avail");
  if (availEl) availEl.textContent = avail.toString();

  const atkLvl = characterSkillsInvested.get("atk") ?? 0;
  const hpLvl = characterSkillsInvested.get("hp") ?? 0;
  const cdLvl = characterSkillsInvested.get("cd") ?? 0;

  const atkLabel = document.getElementById("skill-lv-atk");
  if (atkLabel) atkLabel.textContent = `${atkLvl} / 20`;
  const atkAddBtn = document.getElementById("skill-add-atk") as HTMLButtonElement;
  if (atkAddBtn) {
    atkAddBtn.disabled = avail <= 0 || atkLvl >= 20;
    atkAddBtn.onclick = () => { void investSkillPointAction("atk"); };
  }

  const hpLabel = document.getElementById("skill-lv-hp");
  if (hpLabel) hpLabel.textContent = `${hpLvl} / 20`;
  const hpAddBtn = document.getElementById("skill-add-hp") as HTMLButtonElement;
  if (hpAddBtn) {
    hpAddBtn.disabled = avail <= 0 || hpLvl >= 20;
    hpAddBtn.onclick = () => { void investSkillPointAction("hp"); };
  }

  const cdLabel = document.getElementById("skill-lv-cd");
  if (cdLabel) cdLabel.textContent = `${cdLvl} / 20`;
  const cdAddBtn = document.getElementById("skill-add-cd") as HTMLButtonElement;
  if (cdAddBtn) {
    cdAddBtn.disabled = avail <= 0 || cdLvl >= 20;
    cdAddBtn.onclick = () => { void investSkillPointAction("cd"); };
  }

  const resetBtn = document.getElementById("skill-reset-btn") as HTMLButtonElement;
  if (resetBtn) {
    resetBtn.disabled = progress.coins < 100 || spent === 0;
    resetBtn.onclick = () => { void resetSkillsAction(); };
  }
}

async function investSkillPointAction(skillId: "atk" | "hp" | "cd") {
  if (!currentCharacterId) return;
  try {
    await convexClient.mutation(api.progression.investSkillPoint, {
      characterId: currentCharacterId,
      skillId,
    });
  } catch (err) {
    alert(err instanceof Error ? err.message : "스킬 투자에 실패했습니다.");
  }
}

async function resetSkillsAction() {
  if (!currentCharacterId) return;
  if (!confirm("100 코인을 소모하여 스킬 특성을 초기화하시겠습니까?")) return;
  try {
    await convexClient.mutation(api.progression.resetSkills, {
      characterId: currentCharacterId,
    });
  } catch (err) {
    alert(err instanceof Error ? err.message : "스킬 초기화에 실패했습니다.");
  }
}

function renderBookTab() {
  if (!currentCharacterId || !currentCharacterProgress) return;
  const character = availableCharacters.find((c) => c.id === currentCharacterId);
  if (!character) return;

  const progress = currentCharacterProgress;
  const items = characterPlayerItems.get(currentCharacterId) ?? [];
  const effects = resolvePersistentItemEffects(items);

  const atkLvl = characterSkillsInvested.get("atk") ?? 0;
  const hpLvl = characterSkillsInvested.get("hp") ?? 0;
  const cdLvl = characterSkillsInvested.get("cd") ?? 0;

  let finalHp = getLeveledHp(character.maxHp, progress.level);
  finalHp = Math.round(finalHp * (1.0 + hpLvl * 0.08));
  if (effects.maxHpMultiplier) {
    finalHp = Math.round(finalHp * effects.maxHpMultiplier);
  }
  const hpEl = document.getElementById("stat-final-hp");
  if (hpEl) hpEl.textContent = finalHp.toLocaleString();

  let finalAtk = getLeveledAttack(character.attackPower, progress.level);
  finalAtk = Math.round(finalAtk * (1.0 + atkLvl * 0.07));
  const atkEl = document.getElementById("stat-final-atk");
  if (atkEl) atkEl.textContent = finalAtk.toLocaleString();

  let finalSpd = character.speed;
  const spdEl = document.getElementById("stat-final-spd");
  if (spdEl) spdEl.textContent = finalSpd.toFixed(1);

  let finalDef = getLeveledDefenseShield(character, progress.level);
  if (effects.defenseShieldBonus) {
    finalDef += effects.defenseShieldBonus;
  }
  const defEl = document.getElementById("stat-final-def");
  if (defEl) defEl.textContent = finalDef.toLocaleString();

  const finalRange = character.radius;
  const rangeEl = document.getElementById("stat-final-range");
  if (rangeEl) rangeEl.textContent = `${finalRange}px`;

  const cdBonus = cdLvl * 0.10;
  const cdEl = document.getElementById("stat-final-cd");
  if (cdEl) cdEl.textContent = `+${Math.round(cdBonus * 100)}%`;

  const listEl = document.getElementById("book-character-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  availableCharacters.forEach((char) => {
    const card = document.createElement("button");
    card.type = "button";
    
    const isMain = char.id === currentCharacterId;
    card.className = `roster-character-card ${isMain ? "main-character" : ""}`;
    card.style.borderColor = char.color;
    
    card.innerHTML = `
      <div style="background:${char.color}; width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:6px;"></div>
      <strong style="color:${isMain ? "#00f2fe" : "#fff"};">${char.name}</strong>
    `;
    card.onclick = () => { void openCharacterDetail(char.id); };
    listEl.appendChild(card);
  });
}

function initHubNavigation() {
  document.querySelectorAll<HTMLButtonElement>(".hub-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const hub = tab.getAttribute("data-hub");
      if (hub) selectHubTab(hub);
    });
  });

  // Skin category tabs
  document.querySelectorAll<HTMLButtonElement>("[data-skin-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeSkinTabType = tab.dataset.skinTab as any;
      document.querySelectorAll<HTMLButtonElement>("[data-skin-tab]").forEach((candidate) => {
        candidate.classList.toggle("active", candidate === tab);
      });
      renderSkinTab();
    });
  });

  // Growth sub tabs
  document.querySelectorAll<HTMLButtonElement>("[data-growth-sub]").forEach((tab) => {
    tab.addEventListener("click", () => {
      selectedGrowthSubTab = tab.dataset.growthSub as any;
      renderGrowthTab();
    });
  });

  // Store gacha buttons
  const storeSkinBtn = document.getElementById("store-gacha-skin-btn");
  if (storeSkinBtn) {
    storeSkinBtn.onclick = () => { void drawGacha(); };
  }
  const storeItem1Btn = document.getElementById("store-gacha-item-1-btn");
  if (storeItem1Btn) {
    storeItem1Btn.onclick = () => { void drawPersistentItemsAction(1); };
  }
  const storeItem5Btn = document.getElementById("store-gacha-item-5-btn");
  if (storeItem5Btn) {
    storeItem5Btn.onclick = () => { void drawPersistentItemsAction(5); };
  }

  // Rate table button
  const rateTableBtn = document.getElementById("btn-show-rate-table");
  if (rateTableBtn) {
    rateTableBtn.onclick = () => {
      if (currentCharacterId) openPersistentItemRateModal(currentCharacterId);
    };
  }

  // Quick Play Button
  const quickPlayBtn = document.getElementById("quick-play-btn");
  if (quickPlayBtn) {
    quickPlayBtn.onclick = () => { startQuickPlay(); };
  }

  // Game Finder Modal Buttons
  if (openGameModeBtn) {
    openGameModeBtn.onclick = () => {
      gameModeModal.classList.remove("hidden");
    };
  }
  if (gameModeModalClose) {
    gameModeModalClose.onclick = () => {
      gameModeModal.classList.add("hidden");
    };
  }

  const finderBtnPve = document.getElementById("finder-btn-pve");
  if (finderBtnPve) {
    finderBtnPve.onclick = () => {
      gameModeModal.classList.add("hidden");
      pveSetupOverlay.classList.remove("hidden");
    };
  }

  const finderBtnSolo = document.getElementById("finder-btn-solo");
  if (finderBtnSolo) {
    finderBtnSolo.onclick = () => {
      gameModeModal.classList.add("hidden");
      currentMode = "solo";
      selectGameplayMode("solo");
      pvpSetupOverlay.classList.remove("hidden");
    };
  }

  const finderBtnTeam = document.getElementById("finder-btn-team");
  if (finderBtnTeam) {
    finderBtnTeam.onclick = () => {
      gameModeModal.classList.add("hidden");
      currentMode = "team";
      selectGameplayMode("team");
      pvpSetupOverlay.classList.remove("hidden");
    };
  }

  const finderBtnTournament = document.getElementById("finder-btn-tournament");
  if (finderBtnTournament) {
    finderBtnTournament.onclick = () => {
      gameModeModal.classList.add("hidden");
      currentMode = "tournament";
      selectGameplayMode("tournament");
      pvpSetupOverlay.classList.remove("hidden");
    };
  }

  // Setup Overlay Close Buttons
  if (pveSetupCloseBtn) {
    pveSetupCloseBtn.onclick = () => {
      pveSetupOverlay.classList.add("hidden");
    };
  }
  if (pvpSetupCloseBtn) {
    pvpSetupCloseBtn.onclick = () => {
      pvpSetupOverlay.classList.add("hidden");
    };
  }

  document.querySelectorAll<HTMLButtonElement>("[data-game-mode]").forEach((button) => button.addEventListener("click", () => { selectGameplayMode(button.dataset.gameMode as Exclude<GameMode, "boss">); document.querySelectorAll<HTMLButtonElement>(".game-mode-tab").forEach((tab) => tab.classList.toggle("active", tab === button)); }));
  document.querySelectorAll<HTMLButtonElement>("[data-ranking-mode]").forEach((button) => button.addEventListener("click", () => {
    activeRankingMode = button.dataset.rankingMode as "solo" | "team" | "tournament";
    document.querySelectorAll<HTMLButtonElement>("[data-ranking-mode]").forEach((candidate) => candidate.classList.toggle("active", candidate === button));
    subscribeSeasonRanking();
  }));
}
function initCombatSettings() {
  const speedButtons = document.querySelectorAll<HTMLButtonElement>("[data-game-speed]");
  speedButtons.forEach((button) => {
    button.addEventListener("click", () => {
      gameSpeedMultiplier = Number(button.dataset.gameSpeed);
      speedButtons.forEach((candidate) => {
        const isSelected = candidate === button;
        candidate.classList.toggle("active", isSelected);
        candidate.setAttribute("aria-pressed", String(isSelected));
      });
    });
  });

  const statsButtons = document.querySelectorAll<HTMLButtonElement>("[data-stats-mode]");
  statsButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedStatsMode = button.dataset.statsMode ?? "solo";
      if (currentMode === "solo" && /^[2-6]$/.test(selectedStatsMode)) {
        matchSlotIds = Array.from({ length: Number(selectedStatsMode) }, () => null);
        selectedIds.clear();
        renderMatchSlots();
        updateStartButtonState();
      }
      if (currentMode === "team" && selectedStatsMode.startsWith("team:")) {
        teamGameType = selectedStatsMode.replace("team:", "") as TeamGameType;
        teamGameTypeSelect.value = teamGameType;
        updateStartButtonState();
      }
      statsButtons.forEach((candidate) => {
        const isSelected = candidate === button;
        candidate.classList.toggle("active", isSelected);
        candidate.setAttribute("aria-pressed", String(isSelected));
      });
      updateRandomMatchButtonLabel();
      subscribeToGlobalData();
    });
  });
}

function updateStatsModeControls(mode: GameMode) {
  const statsContextLabel = document.getElementById("stats-context-label");
  const statsButtons = document.getElementById("stats-mode-buttons");
  const context: Record<GameMode, { label: string; statsMode: string; buttonContext: string | null }> = {
    pve: { label: "PvE 성장", statsMode: "solo", buttonContext: null },
    solo: { label: "개인전 인원", statsMode: ["2", "3", "4", "5", "6"].includes(selectedStatsMode) ? selectedStatsMode : "2", buttonContext: "solo" },
    team: { label: "팀전 규칙", statsMode: `team:${teamGameType}`, buttonContext: "team" },
    boss: { label: "보스 난이도", statsMode: "boss", buttonContext: null },
    tournament: { label: "토너먼트 전적", statsMode: "2", buttonContext: null },
  };
  const next = context[mode];
  selectedStatsMode = next.statsMode;
  if (statsContextLabel) statsContextLabel.textContent = next.label;
  if (statsButtons) statsButtons.setAttribute("aria-label", next.label);
  document.querySelectorAll<HTMLButtonElement>("[data-stats-mode]").forEach((button) => {
    button.classList.toggle("hidden", button.dataset.statsContext !== next.buttonContext);
    const isSelected = button.dataset.statsMode === selectedStatsMode;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
  subscribeToGlobalData();
  updateRandomMatchButtonLabel();
}

function updateRandomMatchButtonLabel() {
  if (!randomStartBtn) return;
  if (currentMode === "solo") {
    const count = /^[2-6]$/.test(selectedStatsMode) ? selectedStatsMode : "2";
    randomStartBtn.textContent = `🎲 ${count}인 랜덤전 시작`;
    return;
  }
  const teamRuleLabels: Record<TeamGameType, string> = {
    deathmatch: "데스매치",
    control: "점령전",
    relic: "보석 쟁탈전",
  };
  const labels: Record<Exclude<GameMode, "solo">, string> = {
    pve: "🧪 슬라임 던전 시작",
    team: `🎲 ${teamRuleLabels[teamGameType]} 랜덤 팀전 시작`,
    boss: "🎲 보스 1 vs 도전자 4 랜덤전 시작",
    tournament: "🎲 토너먼트 랜덤전 시작",
  };
  randomStartBtn.textContent = labels[currentMode];
}

teamGameTypeSelect.addEventListener("change", () => {
  teamGameType = teamGameTypeSelect.value as TeamGameType;
  updateStartButtonState();
  updateRandomMatchButtonLabel();
});

// Start APP
initHubNavigation();
initCombatSettings();
updateStatsModeControls(currentMode);
updateTeamGameTypeVisibility();
initLobby();
subscribeToGlobalData();
initPatchNotesSubscription();
if (pveCharacterSelectBtn) {
  pveCharacterSelectBtn.addEventListener("click", openPveCharacterModal);
}
if (pveCharacterModalClose) {
  pveCharacterModalClose.addEventListener("click", () => pveCharacterModal?.classList.add("hidden"));
}
pveStartBtn.addEventListener("click", startPveDungeon);
pveDungeonSelect.addEventListener("change", updatePveDungeonUI);
fillRandomSlotsBtn.addEventListener("click", fillMatchSlotsRandomly);
matchCharacterPickerClose.addEventListener("click", () => matchCharacterPickerModal.classList.add("hidden"));
selectGameplayMode("pve");
initLogin();
