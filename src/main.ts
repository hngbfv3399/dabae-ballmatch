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
import { initPatchNotesSubscription, convexClient } from "./convexClient";
import { api } from "../convex/_generated/api";
import { createSlimeMeadowStage, SLIME_MEADOW_DUNGEON_ID, SLIME_MEADOW_STAGE_COUNT } from "./pve/slimeDungeon";

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
const pveCharacterSelectBtn = document.getElementById("pve-character-select-btn") as HTMLButtonElement;
const pveCharacterSelectAvatar = document.getElementById("pve-character-select-avatar") as HTMLElement;
const pveCharacterSelectName = document.getElementById("pve-character-select-name") as HTMLElement;
const pveCharacterSelectStats = document.getElementById("pve-character-select-stats") as HTMLElement;
const pveStartBtn = document.getElementById("pve-start-btn") as HTMLButtonElement;
const pveCharacterModal = document.getElementById("pve-character-modal") as HTMLElement;
const pveCharacterModalClose = document.getElementById("pve-character-modal-close") as HTMLButtonElement;
const pveCharacterList = document.getElementById("pve-character-list") as HTMLElement;
const pveStageSelect = document.getElementById("pve-stage-select") as HTMLSelectElement;
const modeSettingsRow = document.getElementById("mode-settings-row") as HTMLElement;
const matchSelectionSlots = document.getElementById("match-selection-slots") as HTMLElement;
const matchCharacterPickerModal = document.getElementById("match-character-picker-modal") as HTMLElement;
const matchCharacterPickerClose = document.getElementById("match-character-picker-close") as HTMLButtonElement;
const matchCharacterPickerList = document.getElementById("match-character-picker-list") as HTMLElement;
const matchCharacterPickerDetail = document.getElementById("match-character-picker-detail") as HTMLElement;
const gameplayDeck = document.querySelector(".mode-command-deck") as HTMLElement;
const rankingHubPanel = document.getElementById("ranking-hub-panel") as HTMLElement;
const rankingSeasonLabel = document.getElementById("ranking-season-label") as HTMLElement;
const rankingList = document.getElementById("ranking-list") as HTMLElement;
const collectionHubPanel = document.getElementById("collection-hub-panel") as HTMLElement;
const collectionList = document.getElementById("collection-list") as HTMLElement;
const collectionDetail = document.getElementById("collection-detail") as HTMLElement;
const openGameModeBtn = document.getElementById("open-game-mode-btn") as HTMLButtonElement;
const gameModeModal = document.getElementById("game-mode-modal") as HTMLElement;
const gameModeModalClose = document.getElementById("game-mode-modal-close") as HTMLButtonElement;
const gameModeSetupHost = document.getElementById("game-mode-setup-host") as HTMLElement;
const gachaModal = document.getElementById("gacha-modal") as HTMLElement;
const gachaTargetCharacter = document.getElementById("gacha-target-character") as HTMLSelectElement;
const gachaDrawBtn = document.getElementById("gacha-draw-btn") as HTMLButtonElement;
const gachaDrawStatus = document.getElementById("gacha-draw-status") as HTMLElement;
const gachaResult = document.getElementById("gacha-result") as HTMLElement;
const gachaCatalog = document.getElementById("gacha-catalog") as HTMLElement;
const gachaPreview = document.getElementById("gacha-preview") as HTMLElement;

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
const hudToggleBtn = document.getElementById("hud-toggle-btn") as HTMLButtonElement;
const randomStartBtn = document.getElementById(
  "random-start-btn",
) as HTMLButtonElement;
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
  if (!document.fullscreenElement && gameView.classList.contains("is-focus-mode")) {
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
type PveProgress = { level: number; experience: number; healthMultiplier: number; attackMultiplier: number; totalDungeonClears: number };
type PveRun = { characterId: string; stage: number; startedAt: number; currentHp: number; maxHp: number };
let pveRun: PveRun | null = null;
let selectedPveCharacterId: string | null = null;
let pveProgressByCharacter = new Map<string, PveProgress>();
let pveProgressUnsubscribe: (() => void) | null = null;
type Cosmetic = { cosmeticId: string; name: string; rarity: "common" | "rare" | "epic" | "legendary" | "unique"; isUnlocked: boolean; style: CharacterCosmeticStyle };
let cosmeticCatalog: Cosmetic[] = [];
let cosmeticLoadouts = new Map<string, string>();
let gachaProgress = { dailyDrawsRemaining: 0, completedDungeonClears: 0, bonusDrawsAvailable: 0 };
let cosmeticCatalogUnsubscribe: (() => void) | null = null;
let cosmeticLoadoutUnsubscribe: (() => void) | null = null;
let gachaProgressUnsubscribe: (() => void) | null = null;
let managedCharacterId: string | null = null;
let activeMatchSlot = -1;
let matchSlotIds: Array<string | null> = [];
let previewGachaCosmeticId: string | null = null;
let previewMatchCharacterId: string | null = null;
let isPickingPveCharacter = false;
type RankingEntry = { characterId: string; score: number; wins: number; games: number; draws: number; winRate: number };
type RankingSeason = { seasonId: string; startedAt: number; endsAt: number; status: string };
let activeRankingMode: "solo" | "team" | "tournament" = "solo";
let currentRankingEntries: RankingEntry[] = [];
let currentRankingSeason: RankingSeason | null = null;
let rankingUnsubscribe: (() => void) | null = null;

function getAnonymousClientId(): string {
  const storageKey = "dambae-ballgame-anonymous-client-id";
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  const clientId = crypto.randomUUID();
  localStorage.setItem(storageKey, clientId);
  return clientId;
}

const anonymousClientId = getAnonymousClientId();

function applyEquippedCosmetic(state: CharacterState) {
  const cosmeticId = cosmeticLoadouts.get(state.id);
  const cosmetic = cosmeticCatalog.find((entry) => entry.cosmeticId === cosmeticId && entry.isUnlocked);
  if (cosmetic) state.cosmeticStyle = cosmetic.style;
  return state;
}

// 레벨 성장으로 계산되는 실제 전투 스탯은 항상 정수로 확정한다.
// 공격력이 0인 특수 캐릭터도 있으므로 고정 +1이 아닌, 양수 기본 스탯의 올림 보정을 사용한다.
function getLeveledHp(baseHp: number, progress: PveProgress): number {
  return Math.ceil(baseHp * progress.healthMultiplier);
}

function getLeveledAttack(baseAttack: number, progress: PveProgress): number {
  return Math.ceil(baseAttack * progress.attackMultiplier);
}

function applyCharacterLevel(state: CharacterState) {
  const progress = getPveProgress(state.id);
  state.maxHp = getLeveledHp(state.maxHp, progress);
  state.hp = state.maxHp;
  state.attackPower = getLeveledAttack(state.attackPower, progress);
  return state;
}

function renderGachaCatalog() {
  if (!gachaCatalog) return;
  gachaCatalog.innerHTML = "";
  cosmeticCatalog.forEach((cosmetic) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `gacha-skin-icon ${cosmetic.isUnlocked ? "unlocked" : "locked"} ${previewGachaCosmeticId === cosmetic.cosmeticId ? "active" : ""}`;
    card.style.setProperty("--skin-border", cosmetic.style.borderColor);
    card.style.setProperty("--skin-fill", cosmetic.style.fillColor);
    card.style.setProperty("--skin-text", cosmetic.style.textColor);
    card.style.setProperty("--skin-glow", cosmetic.style.glowColor);
    card.innerHTML = `<span class="cosmetic-preview">${cosmetic.isUnlocked ? "SKIN" : "?"}</span><small class="rarity-${cosmetic.rarity}">${cosmetic.name}</small>`;
    card.addEventListener("click", () => { previewGachaCosmeticId = cosmetic.cosmeticId; renderGachaCatalog(); });
    gachaCatalog.appendChild(card);
  });
  renderGachaPreview();
}

function renderGachaPreview() {
  const cosmetic = cosmeticCatalog.find((entry) => entry.cosmeticId === previewGachaCosmeticId) ?? cosmeticCatalog[0];
  if (!cosmetic) { gachaPreview.textContent = "스킨을 불러오는 중입니다."; return; }
  const effect = `${cosmetic.style.borderAnimation === "none" ? "기본 테두리" : `${cosmetic.style.borderAnimation} 테두리`} · ${cosmetic.style.trail === "none" ? "이동 흔적 없음" : `${cosmetic.style.trail} 이동 흔적`}`;
  gachaPreview.innerHTML = `<div class="skin-preview-stage anim-${cosmetic.style.borderAnimation} trail-${cosmetic.style.trail}" style="--skin-border:${cosmetic.style.borderColor};--skin-fill:${cosmetic.style.fillColor};--skin-text:${cosmetic.style.textColor};--skin-glow:${cosmetic.style.glowColor}"><i></i><i></i><i></i><span class="gacha-preview-orb">SKIN</span></div><span class="eyebrow">${cosmetic.isUnlocked ? "획득함" : "미획득"} · ${cosmetic.rarity.toUpperCase()}</span><h3>${cosmetic.name}</h3><p>공통 스킨</p><div class="skill-slot"><b>외형 효과 미리보기</b><br>${effect}</div><p class="gacha-preview-note">위 오브에서 테두리 애니메이션과 이동 흔적을 미리 볼 수 있습니다. 가챠 탭에서는 장착할 수 없으며, 장착은 캐릭터 관리에서만 가능합니다.</p>`;
}

function updateGachaUI() {
  const dungeonClearProgress = gachaProgress.completedDungeonClears % 3;
  gachaDrawStatus.textContent = `오늘 무료 ${gachaProgress.dailyDrawsRemaining}/5회 · 던전 클리어 보상 ${gachaProgress.bonusDrawsAvailable}회 · 던전 3회 클리어마다 1회 (${dungeonClearProgress}/3) · 현재 공통 스킨 풀에서 뽑습니다. 캐릭터 스킨은 같은 뽑기 풀에 추가될 예정입니다.`;
  gachaDrawBtn.disabled = cosmeticCatalog.length === 0 || (gachaProgress.dailyDrawsRemaining + gachaProgress.bonusDrawsAvailable <= 0);
  gachaDrawBtn.textContent = "뽑기";
  renderGachaCatalog();
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
    await convexClient.mutation(api.cosmetics.equipForCharacter, { clientId: anonymousClientId, characterId, cosmeticId });
    gachaResult.textContent = `${availableCharacters.find((character) => character.id === characterId)?.name ?? "캐릭터"}에게 스킨을 장착했습니다. 모든 클라이언트에 반영됩니다.`;
  } catch {
    gachaResult.textContent = "스킨 장착에 실패했습니다. 잠시 후 다시 시도해주세요.";
  }
}

async function drawGacha() {
  const targetCharacterId = gachaTargetCharacter.value;
  if (!targetCharacterId) return;
  gachaDrawBtn.disabled = true;
  try {
    await convexClient.mutation(api.cosmetics.ensureInitialCatalog, {});
    const result = await convexClient.mutation(api.cosmetics.draw, { clientId: anonymousClientId, targetCharacterId });
    gachaResult.textContent = result.result === "unlocked"
      ? `획득! ${result.cosmetic.name} (${result.cosmetic.rarity.toUpperCase()}) — 전 캐릭터에 장착할 수 있습니다.`
      : `중복! ${result.cosmetic.name} · ${availableCharacters.find((character) => character.id === targetCharacterId)?.name ?? "선택 캐릭터"}에게 ${result.experienceGranted} XP를 지급했습니다.`;
  } catch (error) {
    gachaResult.textContent = error instanceof Error ? error.message : "뽑기에 실패했습니다.";
  }
}

function initCosmetics() {
  gachaTargetCharacter.innerHTML = availableCharacters.map((character) => `<option value="${character.id}">${character.name} · 중복 XP 대상</option>`).join("");
  void convexClient.mutation(api.cosmetics.ensureInitialCatalog, {});
  cosmeticCatalogUnsubscribe?.();
  cosmeticLoadoutUnsubscribe?.();
  gachaProgressUnsubscribe?.();
  cosmeticCatalogUnsubscribe = convexClient.onUpdate(api.cosmetics.listCatalog, {}, (catalog) => { cosmeticCatalog = catalog as Cosmetic[]; updateGachaUI(); if (!collectionHubPanel.classList.contains("hidden")) renderCollection(); });
  cosmeticLoadoutUnsubscribe = convexClient.onUpdate(api.cosmetics.getCharacterLoadouts, {}, (loadouts) => { cosmeticLoadouts = new Map(loadouts.map((loadout) => [loadout.characterId, loadout.cosmeticId])); updateGachaUI(); if (!collectionHubPanel.classList.contains("hidden")) renderCollection(); });
  gachaProgressUnsubscribe = convexClient.onUpdate(api.progression.getClientGachaProgress, { clientId: anonymousClientId }, (progress) => { gachaProgress = progress; updateGachaUI(); });
}

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
  const initialStates = allConfigs.map((config, index) =>
    applyEquippedCosmetic(applyCharacterLevel(createCharacterState(
      config,
      index,
      total,
      gameCanvas.width,
      gameCanvas.height,
    ))),
  );

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
        <!-- HP Bar -->
        <div class="bar-container" style="margin-bottom: 4px;">
          <div class="bar bar-hp" style="width: ${hpPercent}%; background: ${char.isDead ? "#333" : ""};"></div>
        </div>
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

// Game End & Show Winner
function showWinner(winner: CharacterState | null, allChars: CharacterState[]) {
  gameStatusText.textContent = "게임 종료";
  const winnerTitle = winnerModal.querySelector(".winner-title") as HTMLElement | null;

  if (currentMode === "pve" && pveRun) {
    const run = pveRun;
    const player = allChars.find((character) => character.id === run.characterId);
    const clearedStage = winner?.teamId === 1 && player && !player.isDead;
    if (!clearedStage || !player) {
      pveRun = null;
      if (winnerTitle) winnerTitle.textContent = "DUNGEON FAILED";
      winnerInfo.innerHTML = `<div class="winner-trophy">💀</div><div class="win-name" style="color:#ff5e5e">던전 실패</div><div class="win-desc">슬라임 소굴을 끝까지 돌파하지 못했습니다. 실패 시 경험치는 지급되지 않습니다.</div>`;
      modalCloseBtn.textContent = "던전 선택으로";
      winnerModal.classList.remove("hidden");
      return;
    }

    run.currentHp = Math.min(player.maxHp, player.hp + player.maxHp * 0.25);
    if (run.stage < SLIME_MEADOW_STAGE_COUNT) {
      run.stage += 1;
      gameStatusText.textContent = `스테이지 ${run.stage - 1} 클리어 · HP 25% 회복`;
      window.setTimeout(() => {
        if (pveRun === run) startPveStage();
      }, 900);
      return;
    }

    pveRun = null;
    const clearTimeMs = Date.now() - run.startedAt;
    gameStatusText.textContent = "던전 클리어";
    void convexClient.mutation(api.progression.recordDungeonClear, {
      clientId: anonymousClientId,
      characterId: run.characterId,
      dungeonId: SLIME_MEADOW_DUNGEON_ID,
      clearTimeMs,
    }).then((result) => {
      if (winnerTitle) winnerTitle.textContent = "DUNGEON CLEARED";
      winnerInfo.innerHTML = `<div class="winner-trophy">🧪</div><div class="win-name" style="color:${player.color}">${player.name} · 슬라임 소굴 클리어</div><div class="win-desc">${Math.ceil(clearTimeMs / 1000)}초 · 스테이지 5까지 적 전멸 성공</div><div class="char-stats" style="margin-top:1.2rem"><div class="stat-row"><span>획득 경험치</span><strong class="text-neon-yellow">+${result.experienceGranted} XP</strong></div><div class="stat-row"><span>현재 레벨</span><strong>Lv.${result.level}</strong></div></div>`;
      modalCloseBtn.textContent = "던전 선택으로";
      winnerModal.classList.remove("hidden");
    }).catch(() => {
      if (winnerTitle) winnerTitle.textContent = "CLEAR SAVING FAILED";
      winnerInfo.innerHTML = `<div class="winner-trophy">⚠️</div><div class="win-name">클리어 기록 저장에 실패했습니다</div><div class="win-desc">네트워크를 확인한 뒤 다시 시도해 주세요.</div>`;
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

  // Build MVP card HTML
  const mvpScore = mvp.mvpScore
    ? Math.round(mvp.mvpScore)
    : 0;
  const mvpKills = mvp.kills;
  const mvpDmg = mvp.totalDamageDealt || 0;
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
    ${modeWinnerBanner}
    <!-- MVP Spotlight Section -->
    <div class="mvp-spotlight-card" style="width: 100%; border: 1px solid ${mvp.color}40; box-shadow: 0 0 15px ${mvp.color}20;">
      <div class="mvp-badge" style="background: ${mvp.color}; color: #000; box-shadow: 0 0 10px ${mvp.color}80;">🎖️ MATCH MVP</div>
      <div class="mvp-avatar-container">
        ${getAvatarHTML(mvp.name, mvp.image, "mvp-avatar")}
      </div>
      <div class="mvp-name" style="color: ${mvp.color}">${mvp.name}</div>
      <div class="mvp-stats-grid">
        <div class="mvp-stat-box">
          <div class="mvp-stat-label">⚔️ 처치</div>
          <div class="mvp-stat-val">${mvpKills}</div>
        </div>
        <div class="mvp-stat-box">
          <div class="mvp-stat-label">🔥 가한 대미지</div>
          <div class="mvp-stat-val">${mvpDmg}</div>
        </div>
        <div class="mvp-stat-box">
          <div class="mvp-stat-label">⭐ MVP 점수</div>
          <div class="mvp-stat-val" style="color: var(--neon-yellow);">${mvpScore}</div>
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
  if (currentMode === "tournament" && tournamentState?.awaitingNext) {
    tournamentState.awaitingNext = false;
    launchNextTournamentMatch();
    return;
  }
  goBackToLobby();
}

function goBackToLobby() {
  if (gameView.classList.contains("is-focus-mode")) void setFocusMode(false);
  isPracticeMode = false;
  pveRun = null;
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
randomStartBtn.addEventListener("click", startRandomGame);

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
  return pveProgressByCharacter.get(characterId) ?? { level: 1, experience: 0, healthMultiplier: 1, attackMultiplier: 1, totalDungeonClears: 0 };
}

function updatePveSelectionUI() {
  const selected = availableCharacters.find((character) => character.id === selectedPveCharacterId);
  if (!selected) {
    pveCharacterSelectAvatar.textContent = "?";
    pveCharacterSelectName.textContent = "캐릭터 선택";
    pveCharacterSelectStats.textContent = "선택 후 레벨과 능력치를 확인합니다.";
    pveStartBtn.disabled = true;
    return;
  }
  const progress = getPveProgress(selected.id);
  pveCharacterSelectAvatar.textContent = selected.name.slice(0, 1);
  pveCharacterSelectAvatar.style.color = selected.color;
  pveCharacterSelectName.textContent = `${selected.name} · Lv.${progress.level}`;
  pveCharacterSelectStats.textContent = `HP ${getLeveledHp(selected.maxHp, progress)} · ATK ${getLeveledAttack(selected.attackPower, progress)} · ${progress.totalDungeonClears}회 클리어`;
  pveStartBtn.disabled = false;
}

function renderPveCharacterList() {
  pveCharacterList.innerHTML = "";
  const randomButton = document.createElement("button");
  randomButton.type = "button";
  randomButton.className = "character-row";
  randomButton.innerHTML = `<div class="row-identity"><div class="avatar-text">?</div><div><div class="char-name">무작위 캐릭터</div><div class="row-skill-name">입장할 때 무작위로 선택합니다.</div></div></div><div class="row-winrate"><strong class="text-neon-yellow">RANDOM</strong><small>던전 도전</small></div>`;
  randomButton.addEventListener("click", () => {
    const random = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
    if (!random) return;
    selectedPveCharacterId = random.id;
    pveCharacterModal.classList.add("hidden");
    updatePveSelectionUI();
  });
  pveCharacterList.appendChild(randomButton);
  availableCharacters.forEach((character) => {
    const progress = getPveProgress(character.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `character-row ${selectedPveCharacterId === character.id ? "selected" : ""}`;
    button.innerHTML = `<div class="row-identity">${getAvatarHTML(character.name, character.image)}<div><div class="char-name">${character.name}</div><div class="row-skill-name">Lv.${progress.level} · ${character.role}</div></div></div><div class="char-stats row-stats"><span>HP <b>${getLeveledHp(character.maxHp, progress)}</b></span><span>ATK <b>${getLeveledAttack(character.attackPower, progress)}</b></span></div><div class="row-winrate">누적 경험치 <strong class="text-neon-yellow">${progress.experience} XP</strong><small>${progress.totalDungeonClears}회 클리어</small></div>`;
    button.addEventListener("click", () => {
      selectedPveCharacterId = character.id;
      pveCharacterModal.classList.add("hidden");
      updatePveSelectionUI();
    });
    pveCharacterList.appendChild(button);
  });
}

function initPveProgressSubscription() {
  void convexClient.mutation(api.progression.ensureInitialState, {});
  pveProgressUnsubscribe?.();
  pveProgressUnsubscribe = convexClient.onUpdate(api.progression.getOverview, {}, (overview) => {
    pveProgressByCharacter = new Map(overview.characters.map((progress) => [progress.characterId, progress]));
    updatePveSelectionUI();
    if (!pveCharacterModal.classList.contains("hidden")) renderPveCharacterList();
    if (!collectionHubPanel.classList.contains("hidden")) renderCollection();
  });
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
  pveCharacterModal.classList.add("hidden");
  gameModeModal.classList.add("hidden");
  pveRun = { characterId: character.id, stage: Number(pveStageSelect.value), startedAt: Date.now(), maxHp: getLeveledHp(character.maxHp, progress), currentHp: getLeveledHp(character.maxHp, progress) };
  startPveStage();
}

function startPveStage() {
  if (!pveRun) return;
  const character = availableCharacters.find((entry) => entry.id === pveRun?.characterId);
  if (!character) return;
  const progress = getPveProgress(character.id);
  const enemies = createSlimeMeadowStage(pveRun.stage);
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
  player.hp = Math.min(player.maxHp, pveRun.currentHp);
  player.attackPower = getLeveledAttack(character.attackPower, progress);
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
  gameStatusText.textContent = `슬라임 소굴 · ${pveRun.stage}/${SLIME_MEADOW_STAGE_COUNT} 스테이지`;
  if (!gameLounge) gameLounge = new GameLounge(gameCanvas, updateHUD, showWinner, updateCountdown, recordCharacterDeath);
  gameLounge.init([player, ...enemyStates], gameSpeedMultiplier, "deathmatch");
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
  gameModeSetupHost.replaceChildren(modeSettingsRow, isPve ? pveCommandPanel : pvpSetupPanel);
  updateTeamGameTypeVisibility();
  updateStatsModeControls(selectedMode);
  if (modeDesc) modeDesc.textContent = modeDescriptions[selectedMode];
  const heading = document.getElementById("gameplay-heading");
  if (heading) heading.textContent = "게임플레이";
  selectedIds.clear(); selectedRedIds.clear(); selectedBlueIds.clear(); bossCharacterId = null;
  matchSlotIds = Array.from({ length: selectedMode === "team" ? 6 : selectedMode === "tournament" ? 16 : 2 }, () => null);
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
    slot.innerHTML = character ? `<strong style="color:${character.color}">${character.name}</strong><small>${currentMode === "team" ? index < 3 ? "RED" : "BLUE" : "선택됨"}</small>` : `<b>?</b><small>${currentMode === "team" ? index < 3 ? "RED 슬롯" : "BLUE 슬롯" : `참가자 ${index + 1}`}</small>`;
    slot.addEventListener("click", () => { isPickingPveCharacter = false; activeMatchSlot = index; renderMatchCharacterPicker(); matchCharacterPickerModal.classList.remove("hidden"); });
    matchSelectionSlots.appendChild(slot);
  });
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
    if (picked) chooseMatchCharacter(picked.id);
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
  matchCharacterPickerDetail.innerHTML = `<div class="picker-detail-head"><div class="picker-preview-avatar">${getAvatarHTML(character.name, character.image, "picker-preview-image")}</div><div><span class="eyebrow">${character.role}</span><h3 style="color:${character.color}">${character.name} <small>Lv.${progress.level}</small></h3></div></div><div class="picker-stat-grid"><span>HP <b>${getLeveledHp(character.maxHp, progress)}</b></span><span>ATK <b>${getLeveledAttack(character.attackPower, progress)}</b></span><span>SPD <b>${character.speed.toFixed(1)}x</b></span></div><section class="picker-info-block"><em>PASSIVE · 장착됨</em><strong>기존 고유 패시브</strong><p>캐릭터 고유 전투 로직이 현재 전투에 유지됩니다.</p></section><section class="picker-info-block"><em>ACTIVE · 장착됨</em><strong>${character.skillName}</strong><p>${character.skillDescription}</p></section><section class="picker-info-block skin-info"><em>SKIN · 현재 착용</em><strong>${cosmetic?.name ?? "기본 외형"}</strong><p>${skinEffect}</p></section><button id="confirm-match-character-btn" class="btn btn-primary" type="button">${character.name} 선택하기</button>`;
  document.getElementById("confirm-match-character-btn")?.addEventListener("click", () => chooseMatchCharacter(character.id));
}

function chooseMatchCharacter(characterId: string) {
  if (isPickingPveCharacter) {
    selectedPveCharacterId = characterId;
    updatePveSelectionUI();
    matchCharacterPickerModal.classList.add("hidden");
    isPickingPveCharacter = false;
    return;
  }
  matchSlotIds[activeMatchSlot] = characterId; selectedIds.clear(); selectedRedIds.clear(); selectedBlueIds.clear();
  matchSlotIds.forEach((id, index) => { if (!id) return; selectedIds.add(id); if (currentMode === "team") (index < 3 ? selectedRedIds : selectedBlueIds).add(id); });
  matchCharacterPickerModal.classList.add("hidden"); renderMatchSlots(); updateStartButtonState();
}

function renderCollection() {
  collectionList.innerHTML = "";
  availableCharacters.forEach((character) => {
    const progress = getPveProgress(character.id);
    const cosmetic = cosmeticCatalog.find((entry) => entry.cosmeticId === cosmeticLoadouts.get(character.id));
    const card = document.createElement("button");
    card.type = "button";
    card.className = `collection-card ${managedCharacterId === character.id ? "active" : ""}`;
    card.innerHTML = `<span class="collection-avatar" style="--avatar-color:${character.color}">${getAvatarHTML(character.name, character.image, "collection-avatar-image")}</span><strong style="color:${character.color}">${character.name}</strong><small>Lv.${progress.level} · ${cosmetic?.name ?? "기본 외형"}</small>`;
    card.addEventListener("click", () => { managedCharacterId = character.id; renderCollection(); });
    collectionList.appendChild(card);
  });
  renderManagedCharacter();
}

function renderManagedCharacter() {
  const character = availableCharacters.find((entry) => entry.id === managedCharacterId);
  if (!character) { collectionDetail.textContent = "왼쪽에서 관리할 캐릭터를 선택하세요."; return; }
  const progress = getPveProgress(character.id);
  const skins = cosmeticCatalog.filter((cosmetic) => cosmetic.isUnlocked);
  collectionDetail.innerHTML = `<div class="management-head"><span class="collection-avatar" style="--avatar-color:${character.color}">${getAvatarHTML(character.name, character.image, "collection-avatar-image")}</span><div><span class="eyebrow">CHARACTER LOADOUT</span><h3 style="color:${character.color}">${character.name} · Lv.${progress.level}</h3></div></div><div class="picker-stat-grid"><span>HP <b>${getLeveledHp(character.maxHp, progress)}</b></span><span>ATK <b>${getLeveledAttack(character.attackPower, progress)}</b></span><span>SPD <b>${character.speed.toFixed(1)}x</b></span></div><h4>스킬 장착</h4><div class="skill-equip-grid"><button class="skill-equip equipped" type="button"><em>PASSIVE · 장착됨</em><strong>기존 고유 패시브</strong><small>캐릭터 고유 전투 로직이 유지됩니다.</small></button><button class="skill-equip equipped" type="button"><em>ACTIVE · 장착됨</em><strong>${character.skillName}</strong><small>${character.skillDescription}</small></button><button class="skill-equip locked" type="button" disabled><em>추가 슬롯</em><strong>업데이트 예정</strong><small>새 스킬 추가 후 장착할 수 있습니다.</small></button></div><h4>스킨 장착</h4><p class="management-help">스킨을 눌러 이 캐릭터에 장착합니다. 현재 장착: <b>${cosmeticCatalog.find((entry) => entry.cosmeticId === cosmeticLoadouts.get(character.id))?.name ?? "기본 외형"}</b></p><div class="management-skin-grid" id="management-skin-grid"></div>`;
  const skinGrid = document.getElementById("management-skin-grid") as HTMLElement;
  skins.forEach((skin) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "management-skin";
    button.style.setProperty("--skin-border", skin.style.borderColor); button.style.setProperty("--skin-fill", skin.style.fillColor); button.style.setProperty("--skin-text", skin.style.textColor);
    button.textContent = cosmeticLoadouts.get(character.id) === skin.cosmeticId ? `${skin.name} ✓` : skin.name;
    button.addEventListener("click", () => void equipCosmetic(character.id, skin.cosmeticId));
    skinGrid.appendChild(button);
  });
}

function setHubTab(hub: "gameplay" | "gacha" | "ranking" | "collection") {
  document.querySelectorAll<HTMLButtonElement>(".hub-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.hub === hub));
  const isGameplay = hub === "gameplay";
  gameplayDeck.classList.toggle("hidden", !isGameplay);
  // 전투 편성 UI는 게임 시작 모달 내부에서만 표시한다.
  rankingHubPanel.classList.toggle("hidden", hub !== "ranking");
  collectionHubPanel.classList.toggle("hidden", hub !== "collection");
  gachaModal.classList.toggle("hidden", hub !== "gacha");
  if (hub === "gacha") { gachaResult.textContent = ""; updateGachaUI(); }
  if (hub === "collection") renderCollection();
  if (hub === "ranking") { subscribeSeasonRanking(); renderSeasonRanking(); }
}

function initHubNavigation() {
  document.querySelectorAll<HTMLButtonElement>(".hub-tab").forEach((tab) => tab.addEventListener("click", () => setHubTab(tab.dataset.hub as "gameplay" | "gacha" | "ranking" | "collection")));
  openGameModeBtn.addEventListener("click", () => { selectGameplayMode(currentMode as Exclude<GameMode, "boss">); gameModeModal.classList.remove("hidden"); });
  gameModeModalClose.addEventListener("click", () => gameModeModal.classList.add("hidden"));
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
  initPveProgressSubscription();
  updatePveSelectionUI();
  pveCharacterSelectBtn.addEventListener("click", openPveCharacterModal);
  pveCharacterModalClose.addEventListener("click", () => pveCharacterModal.classList.add("hidden"));
  pveStartBtn.addEventListener("click", startPveDungeon);
  initCosmetics();
  gachaTargetCharacter.addEventListener("change", renderGachaCatalog);
  gachaDrawBtn.addEventListener("click", () => void drawGacha());
  matchCharacterPickerClose.addEventListener("click", () => matchCharacterPickerModal.classList.add("hidden"));
  selectGameplayMode("pve");
