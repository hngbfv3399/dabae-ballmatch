import "./style.css";
import {
  availableBossCharacters,
  availableCharacters,
  createCharacterState,
} from "./characterManager";
import type { CharacterState } from "./characters/character.interface";
import {
  defaultArena,
  getArenaForMatch,
  type ArenaConfig,
  type TeamGameType,
} from "./maps";
import { GameLounge } from "./maingame/gameLounge";
import { initPatchNotesSubscription, convexClient } from "./convexClient";
import { api } from "../convex/_generated/api";

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
type GameMode = "solo" | "team" | "boss" | "tournament";
type TournamentMatch = { players: [string | null, string | null]; winnerId?: string };
type TournamentState = { rounds: TournamentMatch[][]; currentRound: number; championId?: string; awaitingNext: boolean };

let currentMode: GameMode = "solo";
let teamGameType: TeamGameType = "deathmatch";
let bossCharacterId: string | null = null;
const LARGE_SOLO_CHARACTER_RADIUS = 53;
const BOSS_CHALLENGER_COUNT = 4;
let tournamentState: TournamentState | null = null;

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
  teamGameTypeSetting.classList.toggle("hidden", currentMode !== "team");
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
  if (isPracticeMode) return;
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
  if (isPracticeMode) return;
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
    createCharacterState(
      config,
      index,
      total,
      gameCanvas.width,
      gameCanvas.height,
    ),
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

  if (currentMode === "tournament" && tournamentState) {
    const finalists = allChars.filter((char) => !char.id.includes("clone") && char.id !== "dummy");
    const resolvedWinner = winner ?? [...finalists].sort((a, b) => (b.totalDamageDealt || 0) - (a.totalDamageDealt || 0))[0] ?? null;
    const next = findNextTournamentMatch();
    if (!next || !resolvedWinner) return;
    next.match.winnerId = resolvedWinner.id;
    recordGameEnd(resolvedWinner.id, allChars, "2");

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
    const count = 2 + Math.floor(Math.random() * 5);
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

// Initialize Game Mode Tab Selection
function initModeSelection() {
  const modeTabs = document.querySelectorAll(".mode-tab");
  const modeDesc = document.getElementById("mode-desc");

  const modeDescriptions: Record<string, string> = {
    solo: "⚔️ 개인전: 최후의 1인이 승리하는 배틀로얄 방식입니다. (최소 2명 선택 필요)",
    team: "🔴🔵 팀전: 레드팀과 블루팀으로 나뉘어 전면전을 펼칩니다. 아군 킬(Friendly Fire)은 면역입니다.",
    boss: "👑 보스전: 전용 보스 캐릭터(1명) vs 도전자들의 비대칭 대결입니다. 보스의 능력치와 스킬은 전용 파일에서 정의됩니다.",
    tournament: "🏆 토너먼트: 정확히 16명을 선택하세요. 무작위 16강 대진부터 결승까지 모두 1대1로 진행합니다.",
  };

  modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // 액티브 탭 클래스 토글
      modeTabs.forEach((t) => {
        t.classList.remove("active");
        (t as HTMLElement).style.background = "transparent";
        (t as HTMLElement).style.color = "#888";
      });
      tab.classList.add("active");
      (tab as HTMLElement).style.background = "rgba(255, 255, 255, 0.1)";
      (tab as HTMLElement).style.color = "#fff";

      const selectedMode = tab.getAttribute("data-mode") as GameMode;
      currentMode = selectedMode;
      updateTeamGameTypeVisibility();
      updateStatsModeControls(selectedMode);

      if (modeDesc) {
        modeDesc.textContent = modeDescriptions[selectedMode] || "";
      }

      // 모드 변경 시 선택 정보 초기화
      selectedIds.clear();
      selectedRedIds.clear();
      selectedBlueIds.clear();
      bossCharacterId = null;

      // 로비 재렌더링하여 모드별 특화 UI 동기화
      initLobby(false);
    });
  });
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
      statsButtons.forEach((candidate) => {
        const isSelected = candidate === button;
        candidate.classList.toggle("active", isSelected);
        candidate.setAttribute("aria-pressed", String(isSelected));
      });
      subscribeToGlobalData();
    });
  });
}

function updateStatsModeControls(mode: GameMode) {
  const statsContextLabel = document.getElementById("stats-context-label");
  const statsButtons = document.getElementById("stats-mode-buttons");
  const context: Record<GameMode, { label: string; statsMode: string; buttonContext: string | null }> = {
    solo: { label: "개인전 전적", statsMode: ["solo", "2", "3", "4", "5", "6"].includes(selectedStatsMode) ? selectedStatsMode : "solo", buttonContext: "solo" },
    team: { label: "팀전 전적", statsMode: "team", buttonContext: "team" },
    boss: { label: "보스 난이도", statsMode: "boss", buttonContext: null },
    tournament: { label: "토너먼트 전적", statsMode: "2", buttonContext: null },
  };
  const next = context[mode];
  selectedStatsMode = next.statsMode;
  if (statsContextLabel) statsContextLabel.textContent = next.label;
  if (statsButtons) statsButtons.setAttribute("aria-label", `${next.label} 기준`);
  document.querySelectorAll<HTMLButtonElement>("[data-stats-mode]").forEach((button) => {
    button.classList.toggle("hidden", button.dataset.statsContext !== next.buttonContext);
    const isSelected = button.dataset.statsMode === selectedStatsMode;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
  subscribeToGlobalData();
}

teamGameTypeSelect.addEventListener("change", () => {
  teamGameType = teamGameTypeSelect.value as TeamGameType;
  updateStartButtonState();
});

// Start APP
initModeSelection();
initCombatSettings();
updateStatsModeControls(currentMode);
updateTeamGameTypeVisibility();
initLobby();
subscribeToGlobalData();
initPatchNotesSubscription();
