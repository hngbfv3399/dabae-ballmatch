import './style.css';
import { availableCharacters, createCharacterState } from './characterManager';
import type { CharacterState } from './characters/character.interface';
import { GameLounge } from './maingame/gameLounge';
import { initPatchNotesSubscription, convexClient } from './convexClient';
import { api } from '../convex/_generated/api';

// DOM Elements
const lobbyView = document.getElementById('lobby-view') as HTMLElement;
const gameView = document.getElementById('game-view') as HTMLElement;
const characterListContainer = document.getElementById('character-list') as HTMLElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const gameSpeedSelect = document.getElementById('game-speed') as HTMLSelectElement;
const backToLobbyBtn = document.getElementById('back-to-lobby-btn') as HTMLButtonElement;
const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const countdownOverlay = document.getElementById('countdown-overlay') as HTMLElement;
const countdownNumber = document.getElementById('countdown-number') as HTMLElement;
const gameStatusText = document.getElementById('game-status-text') as HTMLElement;
const aliveCountEl = document.getElementById('alive-count') as HTMLElement;
const totalCountEl = document.getElementById('total-count') as HTMLElement;
const hudList = document.getElementById('hud-list') as HTMLElement;
const randomStartBtn = document.getElementById('random-start-btn') as HTMLButtonElement;
const randomPlayerCountSelect = document.getElementById('random-player-count') as HTMLSelectElement;
const statsModeSelect = document.getElementById('stats-mode-select') as HTMLSelectElement;
const tierListNotice = document.getElementById('tier-list-notice') as HTMLElement;
const tierRowsWrapper = document.getElementById('tier-rows-wrapper') as HTMLElement;
const totalSimGamesEl = document.getElementById('total-sim-games') as HTMLElement;
const battleLogList = document.getElementById('battle-log-list') as HTMLElement;
const logSimSpeed = document.getElementById('log-sim-speed') as HTMLElement;

const openStatsBtn = document.getElementById('open-stats-btn') as HTMLButtonElement;
const closeStatsBtn = document.getElementById('close-stats-btn') as HTMLButtonElement;
const statsCenterModal = document.getElementById('stats-center-modal') as HTMLElement;
const damageRankingWrapper = document.getElementById('damage-ranking-wrapper') as HTMLElement;
const emptyRoleNotice = document.getElementById('empty-role-notice') as HTMLElement;
let lobbyTotalGames = 0;
let currentRoleFilter = 'all';

// Winner Modal Elements
const winnerModal = document.getElementById('winner-modal') as HTMLElement;
const winnerInfo = document.getElementById('winner-info') as HTMLElement;
const modalCloseBtn = document.getElementById('modal-close-btn') as HTMLButtonElement;

// Selected characters state
const selectedIds: Set<string> = new Set();
let gameLounge: GameLounge | null = null;
let isPracticeMode = false;

// 아바타 HTML 렌더러 (이모지 대체)
function getAvatarHTML(name: string, image?: string, customClass: string = ''): string {
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

const DEFAULT_TIERS: Record<string, 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'> = {
  chanhwi: 'S',
  juju: 'S',
  seyeon: 'A',
  eunsu: 'A',
  jiho: 'A',
  chanik: 'B',
  dongjun: 'B',
  myeongseok: 'C',
  puman: 'C',
  unhee: 'D',
  nayuta: 'D',
  doyun: 'E',
  su: 'F'
};

// 키구조: { [mode]: { [charId]: CharacterStats } }
let statsUnsubscribe: (() => void) | null = null;
let countersUnsubscribe: (() => void) | null = null;
let damageRankingUnsubscribe: (() => void) | null = null;

let currentGlobalStats: any[] = [];
let currentGlobalCounters: any[] = [];
let currentGlobalDamageRanking: any[] = [];

function getStoredStats(): Record<string, Record<string, CharacterStats>> {
  const record: Record<string, Record<string, CharacterStats>> = {};
  const mode = statsModeSelect ? statsModeSelect.value : 'all';
  record[mode] = {};

  currentGlobalStats.forEach(item => {
    record[mode][item.characterId] = {
      wins: item.wins,
      games: item.games,
      damageDealt: item.damageDealt,
      damageTaken: item.damageTaken,
      rankSum: item.rankSum,
      mvpCount: item.mvpCount
    };
  });
  return record;
}

function calculateDynamicTiers() {
  const statsAll = getStoredStats();
  const mode = statsModeSelect ? statsModeSelect.value : 'all';
  const stats = statsAll[mode] || {};
  
  let totalGames = (stats as any).totalGames || 0;
  // 기존 데이터 소급 적용 (totalGames가 0이지만 캐릭터별 판수가 존재할 경우 최대값을 복원)
  if (totalGames === 0) {
    const maxCharGames = Object.values(stats)
      .map((s: any) => typeof s === 'object' && s !== null ? (s.games || 0) : 0)
      .reduce((max, g) => Math.max(max, g), 0);
    totalGames = maxCharGames;
  }
  lobbyTotalGames = totalGames;

  if (totalSimGamesEl) {
    totalSimGamesEl.textContent = `${totalGames}판`;
  }

  const modeText = mode === 'all' ? '전체 매치' : `${mode}인전`;

  if (totalGames < 10) {
    // 10판 미만인 경우: 기본 티어로 복귀 및 안내 노출
    availableCharacters.forEach(char => {
      char.tier = DEFAULT_TIERS[char.id] || 'F';
    });

    if (tierListNotice && tierRowsWrapper) {
      tierListNotice.classList.remove('hidden');
      tierRowsWrapper.classList.add('hidden');
      tierListNotice.innerHTML = `⚠️ <strong>${modeText}</strong>의 전적이 부족하여 기본 티어가 표시됩니다.<br><span style="font-size: 0.8rem; opacity: 0.8;">(실시간 티어 측정에는 최소 10판이 필요합니다. 현재: ${totalGames}/10판)</span>`;
    }
    return;
  }

  // 10판 이상인 경우: 동적 티어 계산 활성화
  if (tierListNotice && tierRowsWrapper) {
    tierListNotice.classList.add('hidden');
    tierRowsWrapper.classList.remove('hidden');
  }

  const charWinRates = availableCharacters.map(char => {
    const s = stats[char.id] || { wins: 0, games: 0, damageDealt: 0, damageTaken: 0 };
    const winRate = s.games > 0 ? (s.wins / s.games) * 100 : -1;
    return { id: char.id, winRate, wins: s.wins, games: s.games };
  });

  // 승률 높은 순 정렬 (미플레이 대상은 기본 티어로 순서 매김)
  charWinRates.sort((a, b) => {
    if (a.winRate !== b.winRate) {
      return b.winRate - a.winRate;
    }
    const tierOrder = { S: 7, A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 };
    const tierA = DEFAULT_TIERS[a.id] || 'F';
    const tierB = DEFAULT_TIERS[b.id] || 'F';
    if (tierOrder[tierA] !== tierOrder[tierB]) {
      return tierOrder[tierB] - tierOrder[tierA];
    }
    return a.id.localeCompare(b.id);
  });

  // 13개 캐릭터 분포: 1위 S, 2~3위 A, 4~5위 B, 6~7위 C, 8~9위 D, 10~11위 E, 12~13위 F
  charWinRates.forEach((item, index) => {
    let tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' = 'F';
    if (index === 0) tier = 'S';
    else if (index <= 2) tier = 'A';
    else if (index <= 4) tier = 'B';
    else if (index <= 6) tier = 'C';
    else if (index <= 8) tier = 'D';
    else if (index <= 10) tier = 'E';
    else tier = 'F';

    const charConfig = availableCharacters.find(c => c.id === item.id);
    if (charConfig) {
      charConfig.tier = tier;
    }
  });
}

async function recordGameStart(participantIds: string[], playerCount: number) {
  if (isPracticeMode) return;
  try {
    await convexClient.mutation(api.stats.recordGameStart, {
      participantIds,
      mode: playerCount.toString()
    });
  } catch (err) {}
}

async function recordGameEnd(winnerId: string, allChars: CharacterState[], playerCount: number) {
  if (isPracticeMode) return;
  const finalWinnerId = winnerId.includes('clone') ? 'eunsu' : winnerId;
  const realChars = allChars.filter(char => !char.id.includes('clone'));

  try {
    await convexClient.mutation(api.stats.recordGameEnd, {
      winnerId: finalWinnerId,
      mode: playerCount.toString(),
      allChars: realChars.map(char => ({
        characterId: char.id,
        damageDealt: char.totalDamageDealt || 0,
        damageTaken: char.totalDamageTaken || 0,
        rank: (char as any).rank || 1,
        isMvp: !!(char as any).isMvp
      }))
    });
  } catch (err) {}
}

// 카운터 킬/데스 기록용 로직
function getStoredCounters(): Record<string, Record<string, Record<string, number>>> {
  const record: Record<string, Record<string, Record<string, number>>> = {};
  const mode = statsModeSelect ? statsModeSelect.value : 'all';
  record[mode] = {};

  currentGlobalCounters.forEach(item => {
    if (!record[mode][item.victimId]) {
      record[mode][item.victimId] = {};
    }
    record[mode][item.victimId][item.killerId] = item.count;
  });
  return record;
}

async function recordCharacterDeath(victimId: string, killerId: string, playerCount: number) {
  if (isPracticeMode) return;
  if (victimId.includes('clone') || killerId.includes('clone')) return;
  try {
    await convexClient.mutation(api.stats.recordCharacterDeath, {
      victimId,
      killerId,
      mode: playerCount.toString()
    });
  } catch (err) {}
}

async function resetTierStats() {
  try {
    await convexClient.mutation(api.stats.resetStats, {});
  } catch (err) {}
}

function renderTierList() {
  const statsAll = getStoredStats();
  const mode = statsModeSelect ? statsModeSelect.value : 'all';
  const stats = statsAll[mode] || {};

  const tiers = ['s', 'a', 'b', 'c', 'd', 'e', 'f'] as const;
  tiers.forEach((t) => {
    const container = document.getElementById(`tier-chars-${t}`);
    if (container) {
      container.innerHTML = '';
      const tierChars = availableCharacters.filter(c => (c.tier || 'F').toLowerCase() === t);
      
      // Sort inside the tier: win rate descending
      const sortedTierChars = [...tierChars].sort((a, b) => {
        const sA = stats[a.id] || { wins: 0, games: 0 };
        const sB = stats[b.id] || { wins: 0, games: 0 };
        const wrA = sA.games > 0 ? sA.wins / sA.games : -1;
        const wrB = sB.games > 0 ? sB.wins / sB.games : -1;
        return wrB - wrA;
      });

      sortedTierChars.forEach(char => {
        const s = stats[char.id] || { wins: 0, games: 0 };
        const winRate = s.games > 0 ? (s.wins / s.games) * 100 : 0;
        const winRateText = s.games > 0 ? `${winRate.toFixed(0)}%` : '0%';
        
        const chip = document.createElement('div');
        chip.className = `tier-char-chip-premium tier-chip-${t}`;
        chip.style.border = `1px solid ${char.color}40`;
        chip.style.boxShadow = `0 0 6px ${char.color}15`;
        chip.innerHTML = `
          <div class="tier-char-avatar">
            ${getAvatarHTML(char.name, char.image, 'tier-avatar-img')}
          </div>
          <div class="tier-char-info">
            <span class="tier-char-name" style="color: ${char.color};">${char.name}</span>
            <span class="tier-char-winrate">${winRateText} <span style="font-size: 0.65rem; opacity: 0.65;">(${s.games}판)</span></span>
          </div>
        `;
        container.appendChild(chip);
      });
    }
  });
}

// Initialize Lobby character list
function initLobby(preserveSelections = false) {
  calculateDynamicTiers(); // 로비 갱신 시 실시간 계산
  characterListContainer.innerHTML = '';
  if (!preserveSelections) {
    selectedIds.clear();
  }
  updateStartButtonState();

  // 티어표 채우기
  renderTierList();

  // 역할군 필터 적용
  const filteredChars = availableCharacters.filter(
    (char) => currentRoleFilter === 'all' || char.role === currentRoleFilter
  );

  // 공석 안내 처리
  if (filteredChars.length === 0) {
    if (emptyRoleNotice) {
      emptyRoleNotice.classList.remove('hidden');
      emptyRoleNotice.style.display = 'flex';
    }
  } else {
    if (emptyRoleNotice) {
      emptyRoleNotice.classList.add('hidden');
      emptyRoleNotice.style.display = 'none';
    }
  }

  filteredChars.forEach((char) => {
    const statsAll = getStoredStats();
    const mode = statsModeSelect ? statsModeSelect.value : 'all';
    const stats = statsAll[mode] || {};
    const s = stats[char.id] || { wins: 0, games: 0, damageDealt: 0, damageTaken: 0, rankSum: 0, mvpCount: 0 };
    const winRate = s.games > 0 ? (s.wins / s.games) * 100 : 0;
    const winRateStr = `${winRate.toFixed(1)}%`;
    const games = s.games;
    const wins = s.wins;
    const dmgDealt = s.damageDealt;
    const dmgTaken = s.damageTaken;
    const rankSum = s.rankSum || 0;
    const mvpCount = s.mvpCount || 0;
    const avgRank = games > 0 ? (rankSum / games).toFixed(1) : '-';

    // 카운터 데이터 가공 (현재 선택된 모드 기준)
    const countersAll = getStoredCounters();
    const modeCounters = countersAll[mode] || {};

    // 1. 천적 (나를 가장 많이 죽인 적)
    const myDeathRecords = modeCounters[char.id] || {};
    let worstKillerId = '';
    let worstKillerCount = 0;
    for (const [kId, count] of Object.entries(myDeathRecords)) {
      if (count > worstKillerCount) {
        worstKillerCount = count;
        worstKillerId = kId;
      }
    }
    const worstKillerName = worstKillerId ? (availableCharacters.find(c => c.id === worstKillerId)?.name || '없음') : '없음';
    const worstKillerStr = worstKillerId ? `${worstKillerName} (${worstKillerCount}데스)` : '없음';

    // 2. 먹잇감 (내가 가장 많이 죽인 적)
    let bestVictimId = '';
    let bestVictimCount = 0;
    for (const [victimId, killerRecords] of Object.entries(modeCounters)) {
      const killedByMe = killerRecords[char.id] || 0;
      if (killedByMe > bestVictimCount) {
        bestVictimCount = killedByMe;
        bestVictimId = victimId;
      }
    }
    const bestVictimName = bestVictimId ? (availableCharacters.find(c => c.id === bestVictimId)?.name || '없음') : '없음';
    const bestVictimStr = bestVictimId ? `${bestVictimName} (${bestVictimCount}킬)` : '없음';

    const card = document.createElement('div');
    card.className = 'character-card card';
    if (selectedIds.has(char.id)) {
      card.classList.add('selected');
    }
    card.dataset.id = char.id;

    const currentTier = char.tier || 'C';
    card.innerHTML = `
      <div class="tier-card-badge tier-badge-${currentTier.toLowerCase()}">${currentTier}</div>
      <button class="char-detail-trigger-btn" data-id="${char.id}" title="상세 설명 보기" style="position: absolute; top: 12px; left: 12px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); backdrop-filter: blur(6px); color: rgba(255, 255, 255, 0.85); font-size: 0.72rem; padding: 3px 8px; border-radius: 12px; cursor: pointer; z-index: 10; font-family: 'Orbit', sans-serif; transition: all 0.2s;">ℹ️ 정보</button>
      ${getAvatarHTML(char.name, char.image)}
      <div class="char-name">${char.name}</div>
      <div class="char-stats">
        <div class="stat-row">
          <span>체력 (HP)</span>
          <span class="stat-val">${char.maxHp}</span>
        </div>
        <div class="stat-row">
          <span>이동 속도</span>
          <span class="stat-val">${char.speed.toFixed(1)}x</span>
        </div>
        <div class="stat-row">
          <span>기본 공격력</span>
          <span class="stat-val">${char.attackPower}</span>
        </div>
      </div>
      <div class="char-history">
        <div class="history-title">📊 전적 기록 (${mode === 'all' ? '전체' : `${mode}인전`})</div>
        <div class="stat-row">
          <span>승률</span>
          <span class="stat-val text-neon-yellow">${winRateStr} (${wins}승/${games}판)</span>
        </div>
        <div class="stat-row">
          <span>평균 등수 / MVP 횟수</span>
          <span class="stat-val"><span class="text-neon-cyan avg-rank-val">${avgRank}위</span> / <span class="text-neon-yellow mvp-count-val">${mvpCount}회</span></span>
        </div>
        <div class="stat-row">
          <span>준 피해 / 받은 피해</span>
          <span class="stat-val"><span class="text-neon-green">${dmgDealt}</span> / <span class="text-neon-red">${dmgTaken}</span></span>
        </div>
        <div class="stat-row" style="margin-top: 0.3rem; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 0.3rem;">
          <span>🎯 천적 (약함)</span>
          <span class="stat-val text-neon-red" style="font-weight: 700;">${worstKillerStr}</span>
        </div>
        <div class="stat-row">
          <span>⚔️ 먹잇감 (강함)</span>
          <span class="stat-val text-neon-green" style="font-weight: 700;">${bestVictimStr}</span>
        </div>
      </div>
    `;

    // 상세 정보 버튼 이벤트 리스너 바인딩
    const detailBtn = card.querySelector('.char-detail-trigger-btn');
    if (detailBtn) {
      detailBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 카드 선택 차단
        openCharacterDetail(char.id);
      });
    }

    card.addEventListener('click', () => {
      if (selectedIds.has(char.id)) {
        selectedIds.delete(char.id);
        card.classList.remove('selected');
      } else {
        selectedIds.add(char.id);
        card.classList.add('selected');
      }
      updateStartButtonState();
    });

    characterListContainer.appendChild(card);
  });
}

function updateStartButtonState() {
  // 최소 2개 이상 선택되어야 시작 가능 (도윤, 지호, 수, 찬익, 찬휘 중에서 2개 선택 가능)
  if (selectedIds.size >= 2) {
    startBtn.disabled = false;
    startBtn.classList.add('active');
  } else {
    startBtn.disabled = true;
    startBtn.classList.remove('active');
  }

  // 연습모드 버튼 활성화 (최소 1개 이상 선택 필요)
  const practiceStartBtn = document.getElementById('practice-start-btn') as HTMLButtonElement;
  if (practiceStartBtn) {
    if (selectedIds.size >= 1) {
      practiceStartBtn.disabled = false;
      practiceStartBtn.classList.add('active');
    } else {
      practiceStartBtn.disabled = true;
      practiceStartBtn.classList.remove('active');
    }
  }
}

// Start Simulator
function startGame() {
  if (selectedIds.size < 2) return;

  lobbyView.classList.add('hidden');
  gameView.classList.remove('hidden');

  const selectedConfigs = availableCharacters.filter((char) => selectedIds.has(char.id));
  const total = selectedConfigs.length;
  const initialStates = selectedConfigs.map((config, index) => 
    createCharacterState(config, index, total, gameCanvas.width, gameCanvas.height)
  );

  totalCountEl.textContent = total.toString();
  aliveCountEl.textContent = total.toString();

  // 게임 시작 기록 (참여 판수 증가)
  recordGameStart(selectedConfigs.map((c) => c.id), total);

  // 배틀 로그 초기화
  if (battleLogList) {
    battleLogList.innerHTML = '<div style="color: #888888;">⚔️ 시뮬레이션 시작!</div>';
  }
  const speedMultiplier = parseFloat(gameSpeedSelect.value);
  if (logSimSpeed) {
    logSimSpeed.textContent = `${speedMultiplier.toFixed(1)}x 배속`;
  }

  if (!gameLounge) {
    gameLounge = new GameLounge(
      gameCanvas,
      updateHUD,
      showWinner,
      updateCountdown,
      recordCharacterDeath,
      appendBattleLog
    );
  }

  gameLounge.init(initialStates, speedMultiplier);
}

// Start Practice Game (Practice Mode)
function startPracticeGame() {
  if (selectedIds.size < 1) return;

  isPracticeMode = true;

  lobbyView.classList.add('hidden');
  gameView.classList.remove('hidden');

  const selectedConfigs = availableCharacters.filter((char) => selectedIds.has(char.id));
  
  // 더미볼 설정 정의
  const dummyConfig = {
    id: 'dummy',
    name: '더미볼',
    maxHp: 999999,
    speed: 0.8, // 기본 이속 부여
    attackPower: 0,
    baseAttackRange: 0,
    skillName: '움직이는 표적',
    skillDescription: '대미지 측정용 무한 체력 샌드백입니다. 맵을 둥둥 떠다닙니다.',
    color: '#7f8c8d',
    skillChargeRate: 0,
    role: 'Supporter' as const,
    detailedDescription: '대미지 측정용 무한 체력 샌드백입니다. 맵을 둥둥 떠다닙니다.',
    onUpdate(char: CharacterState) {
      char.hp = char.maxHp;
      // 속도가 일정 이하로 느려지면 지속해서 표류하도록 속도 보충
      const speed = Math.hypot(char.vx, char.vy);
      if (speed < 1.2) {
        const angle = Math.random() * Math.PI * 2;
        char.vx = Math.cos(angle) * 2.2;
        char.vy = Math.sin(angle) * 2.2;
      }
    }
  };

  const allConfigs = [...selectedConfigs, dummyConfig];
  const total = allConfigs.length;
  const initialStates = allConfigs.map((config, index) => 
    createCharacterState(config, index, total, gameCanvas.width, gameCanvas.height)
  );

  totalCountEl.textContent = total.toString();
  aliveCountEl.textContent = total.toString();

  // 배틀 로그 초기화
  if (battleLogList) {
    battleLogList.innerHTML = '<div style="color: #00ddff;">🏋️ 연습모드 시작! (더미볼 소환됨)</div>';
  }
  const speedMultiplier = parseFloat(gameSpeedSelect.value);
  if (logSimSpeed) {
    logSimSpeed.textContent = `${speedMultiplier.toFixed(1)}x 배속 (연습)`;
  }

  if (!gameLounge) {
    gameLounge = new GameLounge(
      gameCanvas,
      updateHUD,
      showWinner,
      updateCountdown,
      recordCharacterDeath,
      appendBattleLog
    );
  }

  gameLounge.init(initialStates, speedMultiplier);
}



// Update HUD lists
function updateHUD(characters: CharacterState[]) {
  // 분신(eunsu_clone)은 플레이어가 아니므로 생존자 수 카운트에서 제외
  const aliveCount = characters.filter((c) => !c.isDead && !c.id.includes('eunsu_clone')).length;
  aliveCountEl.textContent = aliveCount.toString();

  // 분신(eunsu_clone)은 HUD 목록에서도 제외
  const sorted = [...characters].filter((c) => !c.id.includes('eunsu_clone')).sort((a, b) => {
    if (a.isDead && !b.isDead) return 1;
    if (!a.isDead && b.isDead) return -1;
    if (!a.isDead && !b.isDead) {
      return (b.hp / b.maxHp) - (a.hp / a.maxHp);
    }
    return 0;
  });

  hudList.innerHTML = '';
  sorted.forEach((char) => {
    const hpPercent = (char.hp / char.maxHp) * 100;
    const skillPercent = char.skillGauge;
    const isSkillReady = char.skillGauge >= 100;

    const item = document.createElement('div');
    item.className = `hud-item ${char.isDead ? 'dead' : ''}`;
    
    if (char.skillActive && !char.isDead) {
      item.style.borderColor = char.color;
      item.style.boxShadow = `0 0 10px ${char.color}`;
    }

    item.innerHTML = `
      <div class="hud-avatar">
        ${getAvatarHTML(char.name, char.image)}
      </div>
      <div class="hud-info">
        <div class="hud-name-row">
          <span style="color: ${char.color}">${char.name}</span>
          <span class="hud-hp-text">${char.isDead ? '탈락' : `${char.hp}/${char.maxHp}`}</span>
        </div>
        <!-- HP Bar -->
        <div class="bar-container" style="margin-bottom: 4px;">
          <div class="bar bar-hp" style="width: ${hpPercent}%; background: ${char.isDead ? '#333' : ''};"></div>
        </div>
        <!-- Skill Bar -->
        <div class="bar-container">
          <div class="bar bar-skill" style="width: ${skillPercent}%; background: ${char.isDead ? '#333' : isSkillReady ? '#ffd700' : ''};"></div>
        </div>
      </div>
      ${isSkillReady && !char.isDead ? '<div class="skill-indicator">READY</div>' : ''}
      ${char.skillActive && !char.isDead ? '<div class="skill-indicator" style="color: #ff3366;">ACTIVE</div>' : ''}
    `;

    hudList.appendChild(item);
  });
}

// Countdown handler
function updateCountdown(seconds: number) {
  if (seconds > 0) {
    countdownOverlay.classList.remove('hidden');
    countdownNumber.textContent = seconds.toString();
    gameStatusText.textContent = '전투 준비 중...';
  } else {
    countdownOverlay.classList.add('hidden');
    gameStatusText.textContent = 'BATTLE!';
  }
}

function appendBattleLog(msg: string, type: string) {
  if (!battleLogList) return;

  const logRow = document.createElement('div');
  logRow.style.margin = '2px 0';
  logRow.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
  logRow.style.paddingBottom = '2px';
  
  switch (type) {
    case 'damage':
      logRow.style.color = '#ffa233'; // 오렌지색
      break;
    case 'death':
      logRow.style.color = '#ff4444'; // 붉은색
      logRow.style.fontWeight = '700';
      break;
    case 'skill':
      logRow.style.color = '#4dff4d'; // 초록색
      logRow.style.fontWeight = '700';
      break;
    default:
      logRow.style.color = '#d0d0d0';
  }

  logRow.textContent = msg;
  battleLogList.appendChild(logRow);
  battleLogList.scrollTop = battleLogList.scrollHeight;
}

// Game End & Show Winner
function showWinner(winner: CharacterState | null, allChars: CharacterState[]) {
  gameStatusText.textContent = '게임 종료';
  
  // 승리 정보 기록 (승리 판수 증가 및 티어 갱신)
  recordGameEnd(winner ? winner.id : "draw", allChars, allChars.length);



  if (isPracticeMode) {
    const player = allChars.find(c => c.id !== 'dummy' && !c.id.includes('clone'));
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
    winnerModal.classList.remove('hidden');
    return;
  }

  const realChars = allChars.filter(char => !char.id.includes('clone') && char.id !== 'dummy');
  const mvp = realChars.find(c => (c as any).isMvp) || winner || realChars[0];
  const sorted = [...realChars].sort((a, b) => ((a as any).rank || 99) - ((b as any).rank || 99));

  // Build MVP card HTML
  const mvpScore = (mvp as any).mvpScore ? Math.round((mvp as any).mvpScore) : 0;
  const mvpKills = (mvp as any).kills || 0;
  const mvpDmg = mvp.totalDamageDealt || 0;
  
  let html = `
    <!-- MVP Spotlight Section -->
    <div class="mvp-spotlight-card" style="width: 100%; border: 1px solid ${mvp.color}40; box-shadow: 0 0 15px ${mvp.color}20;">
      <div class="mvp-badge" style="background: ${mvp.color}; color: #000; box-shadow: 0 0 10px ${mvp.color}80;">🎖️ MATCH MVP</div>
      <div class="mvp-avatar-container">
        ${getAvatarHTML(mvp.name, mvp.image, 'mvp-avatar')}
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

    <!-- Rankings Section -->
    <div class="standings-container">
      <div class="standings-header">🏆 최종 순위 결과</div>
      <div class="standings-list">
        ${sorted.map((char, index) => {
          const rank = (char as any).rank || (index + 1);
          const isWinner = rank === 1;
          const rankBadgeClass = rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : rank === 3 ? 'rank-bronze' : 'rank-normal';
          const kills = (char as any).kills || 0;
          const damage = char.totalDamageDealt || 0;
          const hpStatus = char.isDead ? '<span style="color: #ff3366;">탈락</span>' : `<span style="color: #39ff14;">${char.hp} HP</span>`;

          return `
            <div class="standing-item ${isWinner ? 'winner-item' : ''}">
              <div class="standing-rank-badge ${rankBadgeClass}">${rank}</div>
              <div class="standing-avatar">
                ${getAvatarHTML(char.name, char.image, 'standing-avatar-img')}
              </div>
              <div class="standing-name-col">
                <span class="standing-name" style="color: ${char.color}">${char.name}</span>
                <span class="standing-hp-status">${hpStatus}</span>
              </div>
              <div class="standing-stat-col">
                <span class="standing-stat-label">K/D</span>
                <span class="standing-stat-val">${kills}킬 / ${damage}딜</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  winnerInfo.innerHTML = html;
  winnerModal.classList.remove('hidden');
}

// Close Winner Modal and go to Lobby
function closeWinnerModal() {
  winnerModal.classList.add('hidden');
  goBackToLobby();
}

function goBackToLobby() {
  isPracticeMode = false;
  if (gameLounge) {
    gameLounge.stop();
  }
  gameView.classList.add('hidden');
  lobbyView.classList.remove('hidden');
  initLobby();
}

function startRandomGame() {
  const count = parseInt(randomPlayerCountSelect.value, 10);
  if (isNaN(count) || count < 1 || count > 6) return;

  // 피셔-예이츠 셔플 알고리즘을 사용해 완전한 무작위 보장
  const shuffled = [...availableCharacters];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = shuffled.slice(0, count);

  // 로비 선택 상태 및 카드 동기화
  selectedIds.clear();
  selected.forEach(c => selectedIds.add(c.id));

  const cards = Array.from(characterListContainer.children) as HTMLElement[];
  cards.forEach(card => {
    const id = card.dataset.id;
    if (id && selectedIds.has(id)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  updateStartButtonState();
  startGame();
}

// Listeners
startBtn.addEventListener('click', startGame);
backToLobbyBtn.addEventListener('click', goBackToLobby);
modalCloseBtn.addEventListener('click', closeWinnerModal);
randomStartBtn.addEventListener('click', startRandomGame);

const practiceStartBtn = document.getElementById('practice-start-btn');
if (practiceStartBtn) {
  practiceStartBtn.addEventListener('click', startPracticeGame);
}



statsModeSelect.addEventListener('change', () => {
  subscribeToGlobalData();
});

const resetTiersBtn = document.getElementById('reset-tiers-btn');
if (resetTiersBtn) {
  resetTiersBtn.addEventListener('click', resetTierStats);
}

if (openStatsBtn && statsCenterModal) {
  openStatsBtn.addEventListener('click', () => {
    statsCenterModal.classList.remove('hidden');
    renderTierList();
  });
}

if (closeStatsBtn && statsCenterModal) {
  closeStatsBtn.addEventListener('click', () => {
    statsCenterModal.classList.add('hidden');
  });
}

function subscribeToGlobalData() {
  if (statsUnsubscribe) statsUnsubscribe();
  if (countersUnsubscribe) countersUnsubscribe();
  if (damageRankingUnsubscribe) damageRankingUnsubscribe();

  const mode = statsModeSelect ? statsModeSelect.value : 'all';

  statsUnsubscribe = convexClient.onUpdate(api.stats.getStats, { mode }, (statsList) => {
    currentGlobalStats = statsList;
    updateLobbyUI();
  });

  countersUnsubscribe = convexClient.onUpdate(api.stats.getCounters, { mode }, (countersList) => {
    currentGlobalCounters = countersList;
    updateLobbyUI();
  });

  damageRankingUnsubscribe = convexClient.onUpdate(api.stats.getDamageRanking, { mode }, (rankingList) => {
    currentGlobalDamageRanking = rankingList;
    updateLobbyUI();
  });
}

function updateLobbyUI() {
  calculateDynamicTiers();
  
  // 티어표 채우기
  renderTierList();

  // 평균 가한 피해량 랭킹 채우기 (Convex 서버에서 계산 및 정렬 완료된 데이터를 직접 렌더링)
  if (damageRankingWrapper) {
    damageRankingWrapper.innerHTML = '';
    
    // 최대 평균 피해량을 계산해 바 비례 너비 산출
    const maxAvgDmg = currentGlobalDamageRanking.reduce((max, item) => Math.max(max, item.avgDamageDealt), 1);
    
    currentGlobalDamageRanking.forEach((item, index) => {
      const char = availableCharacters.find(c => c.id === item.characterId);
      if (!char) return;

      const rank = index + 1;
      const rankClass = rank === 1 ? 'first' : rank === 2 ? 'second' : rank === 3 ? 'third' : '';
      const percent = (item.avgDamageDealt / maxAvgDmg) * 100;
      
      const rankItem = document.createElement('div');
      rankItem.className = 'dmg-rank-item';
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
    if (tierListNotice) tierListNotice.classList.remove('hidden');
    if (tierRowsWrapper) tierRowsWrapper.classList.add('hidden');
  } else {
    if (tierListNotice) tierListNotice.classList.add('hidden');
    if (tierRowsWrapper) tierRowsWrapper.classList.remove('hidden');
  }

  // 캐릭터 카드들 내용 실시간 갱신 (승률, 전적 수치 등)
  const cards = Array.from(characterListContainer.children) as HTMLElement[];
  cards.forEach(card => {
    const charId = card.dataset.id;
    if (!charId) return;
    const char = availableCharacters.find(c => c.id === charId);
    if (!char) return;

    // 티어 뱃지 갱신
    const currentTier = char.tier || 'C';
    const badge = card.querySelector('.tier-card-badge') as HTMLElement;
    if (badge) {
      badge.className = `tier-card-badge tier-badge-${currentTier.toLowerCase()}`;
      badge.textContent = currentTier;
    }

    const statsRecord = getStoredStats();
    const mode = statsModeSelect ? statsModeSelect.value : 'all';
    const stats = statsRecord[mode] || {};
    const s = stats[char.id] || { wins: 0, games: 0, damageDealt: 0, damageTaken: 0, rankSum: 0, mvpCount: 0 };
    const winRate = s.games > 0 ? (s.wins / s.games) * 100 : 0;
    
    // 승률 및 전적 판수 갱신
    const winRateVal = card.querySelector('.text-neon-yellow') as HTMLElement;
    if (winRateVal) {
      winRateVal.textContent = `${winRate.toFixed(1)}% (${s.wins}승/${s.games}판)`;
    }

    const rankSum = s.rankSum || 0;
    const mvpCount = s.mvpCount || 0;
    const avgRank = s.games > 0 ? (rankSum / s.games).toFixed(1) : '-';

    const avgRankVal = card.querySelector('.avg-rank-val') as HTMLElement;
    if (avgRankVal) {
      avgRankVal.textContent = `${avgRank}위`;
    }
    const mvpCountVal = card.querySelector('.mvp-count-val') as HTMLElement;
    if (mvpCountVal) {
      mvpCountVal.textContent = `${mvpCount}회`;
    }

    // 대미지 및 카운터 정보 갱신
    const countersAll = getStoredCounters();
    const modeCounters = countersAll[mode] || {};

    const myDeathRecords = modeCounters[char.id] || {};
    let worstKillerId = '';
    let worstKillerCount = 0;
    for (const [kId, count] of Object.entries(myDeathRecords)) {
      if (count > worstKillerCount) {
        worstKillerCount = count;
        worstKillerId = kId;
      }
    }
    const worstKillerName = worstKillerId ? (availableCharacters.find(c => c.id === worstKillerId)?.name || '없음') : '없음';
    const worstKillerStr = worstKillerId ? `${worstKillerName} (${worstKillerCount}데스)` : '없음';

    let bestVictimId = '';
    let bestVictimCount = 0;
    for (const [victimId, killerRecords] of Object.entries(modeCounters)) {
      const killedByMe = killerRecords[char.id] || 0;
      if (killedByMe > bestVictimCount) {
        bestVictimCount = killedByMe;
        bestVictimId = victimId;
      }
    }
    const bestVictimName = bestVictimId ? (availableCharacters.find(c => c.id === bestVictimId)?.name || '없음') : '없음';
    const bestVictimStr = bestVictimId ? `${bestVictimName} (${bestVictimCount}킬)` : '없음';

    const greenEls = card.querySelectorAll('.char-history .text-neon-green');
    const redEls = card.querySelectorAll('.char-history .text-neon-red');

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
const detailCloseBtn = document.getElementById('detail-close-btn');
const charDetailModal = document.getElementById('char-detail-modal');

if (detailCloseBtn && charDetailModal) {
  detailCloseBtn.addEventListener('click', () => {
    charDetailModal.classList.add('hidden');
  });

  // 모달 영역 외 바깥 클릭 시 닫기
  charDetailModal.addEventListener('click', (e) => {
    if (e.target === charDetailModal) {
      charDetailModal.classList.add('hidden');
    }
  });
}

// 역할군 필터 탭 바인딩
const roleTabs = document.querySelectorAll('.role-tab');
roleTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    roleTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentRoleFilter = tab.getAttribute('data-role') || 'all';
    initLobby(true); // 선택 상태 보존
  });
});

function openCharacterDetail(charId: string) {
  const char = availableCharacters.find((c) => c.id === charId);
  if (!char) return;

  if (!charDetailModal) return;

  // 이름 주입
  const nameEl = document.getElementById('detail-char-name');
  if (nameEl) nameEl.textContent = char.name;

  // 역할군 배지 주입
  const roleEl = document.getElementById('detail-char-role-badge');
  if (roleEl) {
    const roleMap: Record<string, { label: string; color: string }> = {
      Nuker: { label: '🔥 누커', color: '#ff3366' },
      Sniper: { label: '🎯 저격수', color: '#ff2d55' },
      Speedster: { label: '⚡ 기동형', color: '#ffd700' },
      Guardian: { label: '🛡️ 수호형', color: '#33cc66' },
      Juggernaut: { label: '🦖 돌격형', color: '#ff8c00' },
      Disabler: { label: '🌀 제어형', color: '#00bfff' },
      Summoner: { label: '🌪️ 소환형', color: '#ff007f' },
      Specialist: { label: '🎰 변수형', color: '#9933ff' },
      Supporter: { label: '🧪 지원형', color: '#888888' },
    };
    const roleInfo = roleMap[char.role] || { label: char.role, color: '#888888' };
    roleEl.textContent = roleInfo.label;
    roleEl.style.backgroundColor = `${roleInfo.color}25`;
    roleEl.style.border = `1px solid ${roleInfo.color}80`;
    roleEl.style.color = roleInfo.color;
  }

  // 아바타 렌더링
  const avatarContainer = document.getElementById('detail-char-avatar-container');
  if (avatarContainer) {
    avatarContainer.innerHTML = getAvatarHTML(char.name, char.image, 'detail-avatar-img');
    const avatarEl = avatarContainer.firstElementChild as HTMLElement;
    if (avatarEl) {
      avatarEl.style.width = '70px';
      avatarEl.style.height = '70px';
      avatarEl.style.border = `2px solid ${char.color}`;
      avatarEl.style.boxShadow = `0 0 12px ${char.color}50`;
      if (avatarEl.classList.contains('avatar-text')) {
        avatarEl.style.background = `radial-gradient(circle, ${char.color}35 0%, rgba(0,0,0,0.6) 100%)`;
      }
    }
  }

  // 상세 설명 주입
  const descEl = document.getElementById('detail-char-desc');
  if (descEl) descEl.textContent = char.detailedDescription;

  // 스탯 게이지 채우기
  const hpPercent = Math.min(100, (char.maxHp / 200) * 100);
  const hpBar = document.getElementById('detail-stat-bar-hp');
  if (hpBar) hpBar.style.width = `${hpPercent}%`;
  const hpVal = document.getElementById('detail-stat-val-hp');
  if (hpVal) hpVal.textContent = char.maxHp.toString();

  const atkPercent = Math.min(100, (char.attackPower / 30) * 100);
  const atkBar = document.getElementById('detail-stat-bar-atk');
  if (atkBar) atkBar.style.width = `${atkPercent}%`;
  const atkVal = document.getElementById('detail-stat-val-atk');
  if (atkVal) atkVal.textContent = char.attackPower.toString();

  const speedPercent = Math.min(100, (char.speed / 2.0) * 100);
  const speedBar = document.getElementById('detail-stat-bar-speed');
  if (speedBar) speedBar.style.width = `${speedPercent}%`;
  const speedVal = document.getElementById('detail-stat-val-speed');
  if (speedVal) speedVal.textContent = `${char.speed.toFixed(1)}x`;

  // 스킬 정보
  const skillNameEl = document.getElementById('detail-skill-name');
  if (skillNameEl) {
    skillNameEl.textContent = char.skillName;
    skillNameEl.style.color = char.color;
  }
  const skillDescEl = document.getElementById('detail-skill-desc');
  if (skillDescEl) skillDescEl.textContent = char.skillDescription;

  charDetailModal.classList.remove('hidden');
}

// Start APP
initLobby();
subscribeToGlobalData();
initPatchNotesSubscription();
