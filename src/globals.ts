import { GameLounge } from "./maingame/gameLounge";
import { type TeamGameType } from "./maps";
import { type PveRunModifiers } from "./maingame/runModifiers";
import { type CatalogItem, type PlayerItem } from "./maingame/persistentItemEffects";
import { type CharacterCosmeticStyle } from "./characters/character.interface";

// Game Types
export type GameMode = "pve" | "solo" | "team" | "boss" | "tournament";
export type TournamentMatch = { players: [string | null, string | null]; winnerId?: string };
export type TournamentState = { rounds: TournamentMatch[][]; currentRound: number; championId?: string; awaitingNext: boolean };
export type PveProgress = { level: number; experience: number; experienceInCurrentLevel: number; experienceToNextLevel: number; isMaxLevel: boolean; healthMultiplier: number; attackMultiplier: number; defenseShieldBonus: number; unlockedSkillLevels?: number[]; nextSkillUnlockLevel?: number | null; totalDungeonClears: number; unlockedDungeonIds?: string[] };
export type PveDungeonReward = { dungeonId: string; firstClearExperience: number; repeatClearExperience: number };
export type PveRun = { characterId: string; dungeonId: string; stage: number; startedAt: number; currentHp: number; currentDefenseShield: number; currentShield: number; maxHp: number; rewardEligible: boolean; modifiers: PveRunModifiers };
export type Cosmetic = { cosmeticId: string; name: string; rarity: "common" | "rare" | "epic" | "legendary" | "unique"; isUnlocked: boolean; style: CharacterCosmeticStyle };
export type VictoryAnimation = "wave" | "jump" | "clap" | "dance" | "trophy" | "fireworks" | "sniper";
export type VictoryAction = { actionId: string; name: string; characterId?: string; rarity: Cosmetic["rarity"]; animation: VictoryAnimation; isUnlocked: boolean };
export type VictoryBackground = { backgroundId: string; name: string; characterId?: string; rarity: Cosmetic["rarity"]; animation: VictoryAnimation; isUnlocked: boolean };
export type VictorySpecialEvent = { specialEventId: string; name: string; characterId?: string; rarity: Cosmetic["rarity"]; effect: "sniper"; isUnlocked: boolean };
export type GachaType = "skin" | "action" | "background" | "specialEvent";

export const LARGE_SOLO_CHARACTER_RADIUS = 53;
export const BOSS_CHALLENGER_COUNT = 4;

// Central global state object to keep all sub-modules synchronized without circular dependencies.
export const globalState = {
  currentCharacterId: null as string | null,
  currentMode: "pve" as GameMode,
  teamGameType: "deathmatch" as TeamGameType,
  bossCharacterId: null as string | null,
  selectedIds: new Set<string>(),
  selectedRedIds: new Set<string>(),
  selectedBlueIds: new Set<string>(),
  gameLounge: null as GameLounge | null,
  isPracticeMode: false,
  tournamentState: null as TournamentState | null,
  pveRun: null as PveRun | null,
  selectedPveCharacterId: null as string | null,
  pveProgressByCharacter: new Map<string, PveProgress>(),
  pveDungeonRewards: new Map<string, PveDungeonReward>(),
  pveAdvancePending: false,
  cosmeticCatalog: [] as Cosmetic[],
  victoryActionCatalog: [] as VictoryAction[],
  victoryBackgroundCatalog: [] as VictoryBackground[],
  victorySpecialEventCatalog: [] as VictorySpecialEvent[],
  cosmeticLoadouts: new Map<string, string>(),
  equippedVictoryActionId: null as string | null,
  equippedVictoryBackgroundId: null as string | null,
  equippedVictorySpecialEventId: null as string | null,
  characterSkillsInvested: new Map<string, number>(),
  persistentItemCatalog: [] as CatalogItem[],
  characterPlayerItems: new Map<string, PlayerItem[]>(),
  persistentItemUnlocks: new Set<string>(),
  currentCharacterProgress: null as any,
  progressUnsubscribe: null as (() => void) | null,
  pveProgressUnsubscribe: null as (() => void) | null,
  cosmeticCatalogUnsubscribe: null as (() => void) | null,
  cosmeticLoadoutUnsubscribe: null as (() => void) | null,
  victoryActionCatalogUnsubscribe: null as (() => void) | null,
  victoryBackgroundCatalogUnsubscribe: null as (() => void) | null,
  victorySpecialEventCatalogUnsubscribe: null as (() => void) | null,
  skillsUnsubscribe: null as (() => void) | null,
  persistentItemCatalogUnsubscribe: null as (() => void) | null,
  playerItemsUnsubscribe: null as (() => void) | null,
  // Other config/states
  lobbyTotalGames: 0,
  currentRoleFilter: "all",
  gameSpeedMultiplier: 1,
  selectedStatsMode: "solo",
  activeRankingMode: "solo" as "solo" | "team" | "tournament",
  activeSkinTabType: "skin" as "skin" | "action" | "background" | "specialEvent",
  activeGachaType: "skin" as GachaType,
  selectedGrowthSubTab: "equipment" as "equipment" | "skills",
  previewVictorySpecialEventId: null as string | null,
  previewVictoryActionId: null as string | null,
  previewVictoryBackgroundId: null as string | null,
  previewGachaCosmeticId: null as string | null,
  activeMatchSlot: 0,
  matchSlotIds: [] as (string | null)[],
  randomMatchSlotIndexes: new Set<number>(),
  isPickingPveCharacter: false,
  previewMatchCharacterId: null as string | null,
};

// Common DOM Elements
export const lobbyView = document.getElementById("lobby-view") as HTMLElement;
export const gameView = document.getElementById("game-view") as HTMLElement;
export const characterListContainer = document.getElementById("character-list") as HTMLElement;
export const startBtn = document.getElementById("start-btn") as HTMLButtonElement;
export const backToLobbyBtn = document.getElementById("back-to-lobby-btn") as HTMLButtonElement;
export const focusModeBtn = document.getElementById("focus-mode-btn") as HTMLButtonElement;
export const gameCanvas = document.getElementById("game-canvas") as HTMLCanvasElement;
export const pveCommandPanel = document.getElementById("pve-command-panel") as HTMLElement;
export const pvpSetupPanel = document.getElementById("pvp-setup-panel") as HTMLElement;
export const pveCharacterSelectBtn = document.getElementById("pve-character-select-btn") as HTMLButtonElement | null;
export const pveCharacterSelectAvatar = document.getElementById("pve-character-select-avatar") as HTMLElement | null;
export const pveCharacterSelectName = document.getElementById("pve-character-select-name") as HTMLElement | null;
export const pveCharacterSelectStats = document.getElementById("pve-character-select-stats") as HTMLElement | null;
export const pveStartBtn = document.getElementById("pve-start-btn") as HTMLButtonElement;
export const pveCharacterModal = document.getElementById("pve-character-modal") as HTMLElement | null;
export const pveCharacterModalClose = document.getElementById("pve-character-modal-close") as HTMLButtonElement | null;
export const pveCharacterList = document.getElementById("pve-character-list") as HTMLElement | null;
export const pveDungeonSelect = document.getElementById("pve-dungeon-select") as HTMLSelectElement;

export const matchSelectionSlots = document.getElementById("match-selection-slots") as HTMLElement;
export const fillRandomSlotsBtn = document.getElementById("fill-random-slots-btn") as HTMLButtonElement;
export const matchCharacterPickerModal = document.getElementById("match-character-picker-modal") as HTMLElement;
export const matchCharacterPickerClose = document.getElementById("match-character-picker-close") as HTMLButtonElement;
export const matchCharacterPickerList = document.getElementById("match-character-picker-list") as HTMLElement;
export const matchCharacterPickerDetail = document.getElementById("match-character-picker-detail") as HTMLElement;
export const rankingSeasonLabel = document.getElementById("ranking-season-label") as HTMLElement;
export const rankingList = document.getElementById("ranking-list") as HTMLElement;
export const openGameModeBtn = document.getElementById("open-game-finder-btn") as HTMLButtonElement;
export const gameModeModal = document.getElementById("game-finder-modal") as HTMLElement;
export const gameModeModalClose = document.getElementById("game-finder-modal-close") as HTMLButtonElement;
export const pveSetupOverlay = document.getElementById("pve-setup-wrapper-overlay") as HTMLElement;
export const pvpSetupOverlay = document.getElementById("pvp-setup-wrapper-overlay") as HTMLElement;
export const pveSetupCloseBtn = document.getElementById("pve-setup-close") as HTMLButtonElement;
export const pvpSetupCloseBtn = document.getElementById("pvp-setup-close") as HTMLButtonElement;
export const gachaResult = document.getElementById("gacha-result") as HTMLElement | null;
export const gachaTitle = document.getElementById("gacha-title") as HTMLElement | null;
export const gachaTypeHelp = document.getElementById("gacha-type-help") as HTMLElement | null;
export const gachaCatalog = document.getElementById("gacha-catalog") as HTMLElement | null;
export const gachaPreview = document.getElementById("gacha-preview") as HTMLElement | null;
export const gachaRevealModal = document.getElementById("gacha-reveal-modal") as HTMLElement;
export const gachaRevealContent = document.getElementById("gacha-reveal-content") as HTMLElement;
export const persistentItemRateModal = document.getElementById("persistent-item-rate-modal") as HTMLElement;
export const persistentItemRateContent = document.getElementById("persistent-item-rate-content") as HTMLElement;

export const countdownOverlay = document.getElementById("countdown-overlay") as HTMLElement;
export const countdownNumber = document.getElementById("countdown-number") as HTMLElement;
export const gameStatusText = document.getElementById("game-status-text") as HTMLElement;
export const aliveCountEl = document.getElementById("alive-count") as HTMLElement;
export const totalCountEl = document.getElementById("total-count") as HTMLElement;
export const hudSidebar = document.getElementById("hud") as HTMLElement;
export const hudList = document.getElementById("hud-list") as HTMLElement;
export const pveRunModifiersPanel = document.getElementById("pve-run-modifiers") as HTMLElement;
export const augmentChoiceModal = document.getElementById("augment-choice-modal") as HTMLElement;
export const augmentChoiceTier = document.getElementById("augment-choice-tier") as HTMLElement;
export const augmentChoiceTitle = document.getElementById("augment-choice-title") as HTMLElement;
export const augmentChoiceSubtitle = document.getElementById("augment-choice-subtitle") as HTMLElement;
export const augmentChoiceCards = document.getElementById("augment-choice-cards") as HTMLElement;
export const hudToggleBtn = document.getElementById("hud-toggle-btn") as HTMLButtonElement;
export const randomStartBtn = document.getElementById("random-start-btn") as HTMLButtonElement | null;
export const tierListNotice = document.getElementById("tier-list-notice") as HTMLElement;
export const tierRowsWrapper = document.getElementById("tier-rows-wrapper") as HTMLElement;
export const totalSimGamesEl = document.getElementById("total-sim-games") as HTMLElement;
export const teamGameTypeSelect = document.getElementById("team-game-type") as HTMLSelectElement;
export const teamGameTypeSetting = document.getElementById("team-game-type-setting") as HTMLElement;
export const tournamentHeader = document.getElementById("tournament-battle-header") as HTMLElement;
export const tournamentStatus = document.getElementById("tournament-status") as HTMLElement;

export const openStatsBtn = document.getElementById("open-stats-btn") as HTMLButtonElement;
export const closeStatsBtn = document.getElementById("close-stats-btn") as HTMLButtonElement;
export const resetStatsBtn = document.getElementById("reset-stats-btn") as HTMLButtonElement;
export const statsCenterModal = document.getElementById("stats-center-modal") as HTMLElement;
export const damageRankingWrapper = document.getElementById("damage-ranking-wrapper") as HTMLElement;
export const emptyRoleNotice = document.getElementById("empty-role-notice") as HTMLElement;
export const winnerModal = document.getElementById("winner-modal") as HTMLElement;
export const winnerInfo = document.getElementById("winner-info") as HTMLElement;
export const modalCloseBtn = document.getElementById("modal-close-btn") as HTMLButtonElement;

// Common Helpers
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character);
}

export function getAvatarHTML(name: string, image?: string, customClass: string = ""): string {
  if (image) {
    return `<img class="avatar-img ${customClass}" src="${image}" alt="${name}" />`;
  }
  return `
    <div class="avatar-text ${customClass}">
      <span>${name}</span>
    </div>
  `;
}

export function getSkinVisualMarkup(
  style: CharacterCosmeticStyle,
  label: string,
  size: "icon" | "preview" | "management" | "reveal",
): string {
  const contextClass = size === "reveal" ? " gacha-reveal-orb" : size === "preview" ? " gacha-preview-orb" : "";
  return `<span class="skin-visual skin-visual-${size}${contextClass} anim-${style.borderAnimation} trail-${style.trail}" aria-hidden="true"><i></i><i></i><i></i><b>${label}</b></span>`;
}

export function getVictoryPlayerMarkup(player: { id: string; name: string; image?: string }): string {
  const cosmetic = globalState.cosmeticCatalog.find(
    (entry) => entry.cosmeticId === globalState.cosmeticLoadouts.get(player.id) && entry.isUnlocked
  );
  if (!cosmetic) return getAvatarHTML(player.name, player.image, "mvp-avatar");
  const { style } = cosmetic;
  return `<span class="skin-visual skin-visual-victory anim-${style.borderAnimation} trail-${style.trail}" style="--skin-border:${style.borderColor};--skin-fill:${style.fillColor};--skin-text:${style.textColor};--skin-glow:${style.glowColor}" aria-label="${cosmetic.name} 스킨"><i></i><i></i><i></i>${getAvatarHTML(player.name, player.image, "victory-skin-avatar")}</span>`;
}

export function getPveProgress(characterId: string): PveProgress {
  return globalState.pveProgressByCharacter.get(characterId) ?? { level: 1, experience: 0, experienceInCurrentLevel: 0, experienceToNextLevel: 100, isMaxLevel: false, healthMultiplier: 1, attackMultiplier: 1, defenseShieldBonus: 0, totalDungeonClears: 0 };
}

export function updateCoinsDisplay(coins: number) {
  const storeCoins = document.getElementById("store-coins-label");
  if (storeCoins) storeCoins.textContent = coins.toLocaleString();
  const playLabel = document.getElementById("play-coins-label");
  if (playLabel) playLabel.textContent = coins.toLocaleString();
}
