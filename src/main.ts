import './style.css';
import { availableCharacters, createCharacterState } from './characterManager';
import type { CharacterState } from './characters/character.interface';
import { GameLounge } from './maingame/gameLounge';
import { initPatchNotesSubscription } from './convexClient';

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

// Winner Modal Elements
const winnerModal = document.getElementById('winner-modal') as HTMLElement;
const winnerInfo = document.getElementById('winner-info') as HTMLElement;
const modalCloseBtn = document.getElementById('modal-close-btn') as HTMLButtonElement;

// Selected characters state
const selectedIds: Set<string> = new Set();
let gameLounge: GameLounge | null = null;

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
}

const DEFAULT_TIERS: Record<string, 'S' | 'A' | 'B' | 'C'> = {
  chanhwi: 'S',
  jiho: 'A',
  chanik: 'A',
  nayuta: 'B',
  unhee: 'B',
  doyun: 'C',
  su: 'C'
};

// 키구조: { [mode]: { [charId]: CharacterStats } }
function getStoredStats(): Record<string, Record<string, CharacterStats>> {
  const data = localStorage.getItem('ballgame_stats_v2');
  if (!data) return { all: {} };
  try {
    return JSON.parse(data);
  } catch (e) {
    return { all: {} };
  }
}

function saveStats(stats: Record<string, Record<string, CharacterStats>>) {
  localStorage.setItem('ballgame_stats_v2', JSON.stringify(stats));
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

  if (totalSimGamesEl) {
    totalSimGamesEl.textContent = `${totalGames}판`;
  }

  const modeText = mode === 'all' ? '전체 매치' : `${mode}인전`;

  if (totalGames < 10) {
    // 10판 미만인 경우: 기본 티어로 복귀 및 안내 노출
    availableCharacters.forEach(char => {
      char.tier = DEFAULT_TIERS[char.id] || 'C';
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
    const tierOrder = { S: 4, A: 3, B: 2, C: 1 };
    const tierA = DEFAULT_TIERS[a.id] || 'C';
    const tierB = DEFAULT_TIERS[b.id] || 'C';
    if (tierOrder[tierA] !== tierOrder[tierB]) {
      return tierOrder[tierB] - tierOrder[tierA];
    }
    return a.id.localeCompare(b.id);
  });

  // 1위: S, 2~3위: A, 4위: B, 5~7위: C
  charWinRates.forEach((item, index) => {
    let tier: 'S' | 'A' | 'B' | 'C' = 'C';
    if (index === 0) tier = 'S';
    else if (index === 1 || index === 2) tier = 'A';
    else if (index === 3) tier = 'B';
    else tier = 'C';

    const charConfig = availableCharacters.find(c => c.id === item.id);
    if (charConfig) {
      charConfig.tier = tier;
    }
  });
}

function recordGameStart(participantIds: string[], playerCount: number) {
  const stats = getStoredStats();
  const modes = ['all', playerCount.toString()];

  modes.forEach(mode => {
    if (!stats[mode]) stats[mode] = {};
    participantIds.forEach(id => {
      if (!stats[mode][id]) {
        stats[mode][id] = { wins: 0, games: 0, damageDealt: 0, damageTaken: 0 };
      }
      stats[mode][id].games += 1;
    });
  });
  
  saveStats(stats);
}

function recordGameEnd(winnerId: string, allChars: CharacterState[], playerCount: number) {
  const stats = getStoredStats();
  const modes = ['all', playerCount.toString()];

  modes.forEach(mode => {
    if (!stats[mode]) stats[mode] = {};
    
    if (!stats[mode][winnerId]) {
      stats[mode][winnerId] = { wins: 0, games: 0, damageDealt: 0, damageTaken: 0 };
    }
    stats[mode][winnerId].wins += 1;

    allChars.forEach(char => {
      if (!stats[mode][char.id]) {
        stats[mode][char.id] = { wins: 0, games: 0, damageDealt: 0, damageTaken: 0 };
      }
      stats[mode][char.id].damageDealt += char.totalDamageDealt || 0;
      stats[mode][char.id].damageTaken += char.totalDamageTaken || 0;
    });
  });

  saveStats(stats);
  calculateDynamicTiers();
}

// 카운터 킬/데스 기록용 로직
function getStoredCounters(): Record<string, Record<string, Record<string, number>>> {
  const data = localStorage.getItem('ballgame_counters');
  if (!data) return { all: {} };
  try {
    return JSON.parse(data);
  } catch (e) {
    return { all: {} };
  }
}

function saveCounters(counters: Record<string, Record<string, Record<string, number>>>) {
  localStorage.setItem('ballgame_counters', JSON.stringify(counters));
}

function recordCharacterDeath(victimId: string, killerId: string, playerCount: number) {
  const counters = getStoredCounters();
  const modes = ['all', playerCount.toString()];

  modes.forEach(mode => {
    if (!counters[mode]) counters[mode] = {};
    if (!counters[mode][victimId]) counters[mode][victimId] = {};
    if (!counters[mode][victimId][killerId]) counters[mode][victimId][killerId] = 0;
    
    counters[mode][victimId][killerId] += 1;
  });

  saveCounters(counters);
}

function resetTierStats() {
  localStorage.removeItem('ballgame_stats');
  localStorage.removeItem('ballgame_stats_v2');
  localStorage.removeItem('ballgame_counters');
  calculateDynamicTiers();
  initLobby();
}

// Initialize Lobby character list
function initLobby() {
  calculateDynamicTiers(); // 로비 갱신 시 실시간 계산
  characterListContainer.innerHTML = '';
  selectedIds.clear();
  updateStartButtonState();

  // 티어표 채우기
  const tiers = ['s', 'a', 'b', 'c'] as const;
  tiers.forEach((t) => {
    const container = document.getElementById(`tier-chars-${t}`);
    if (container) {
      container.innerHTML = '';
      const tierChars = availableCharacters.filter(c => (c.tier || 'C').toLowerCase() === t);
      tierChars.forEach(char => {
        const chip = document.createElement('span');
        chip.className = `tier-char-chip tier-chip-${t}`;
        chip.style.border = `1px solid ${char.color}`;
        chip.style.boxShadow = `0 0 6px ${char.color}40`;
        chip.style.color = '#ffffff';
        chip.innerHTML = `${char.name}`;
        container.appendChild(chip);
      });
    }
  });

  availableCharacters.forEach((char) => {
    const statsAll = getStoredStats();
    const mode = statsModeSelect ? statsModeSelect.value : 'all';
    const stats = statsAll[mode] || {};
    const s = stats[char.id] || { wins: 0, games: 0, damageDealt: 0, damageTaken: 0 };
    const winRate = s.games > 0 ? (s.wins / s.games) * 100 : 0;
    const winRateStr = `${winRate.toFixed(1)}%`;
    const games = s.games;
    const wins = s.wins;
    const dmgDealt = s.damageDealt;
    const dmgTaken = s.damageTaken;

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
    card.dataset.id = char.id;

    card.innerHTML = `
      <div class="tier-card-badge tier-badge-${(char.tier || 'C').toLowerCase()}">${char.tier || 'C'}</div>
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
      <div class="char-skill-info">
        <div class="char-skill-title">✨ ${char.skillName}</div>
        <div class="char-skill-desc">${char.skillDescription}</div>
      </div>
    `;

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

// Update HUD lists
function updateHUD(characters: CharacterState[]) {
  const aliveCount = characters.filter((c) => !c.isDead).length;
  aliveCountEl.textContent = aliveCount.toString();

  const sorted = [...characters].sort((a, b) => {
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
function showWinner(winner: CharacterState, allChars: CharacterState[]) {
  gameStatusText.textContent = '게임 종료';
  
  // 승리 정보 기록 (승리 판수 증가 및 티어 갱신)
  recordGameEnd(winner.id, allChars, allChars.length);

  winnerInfo.innerHTML = `
    <div class="win-avatar">
      ${getAvatarHTML(winner.name, winner.image)}
    </div>
    <div class="win-name" style="color: ${winner.color}">${winner.name}</div>
    <div class="win-desc">마지막까지 생존하여 최종 승리하였습니다!</div>
    <div class="char-stats" style="margin-top: 1.5rem; width: 100%;">
      <div class="stat-row">
        <span>남은 체력 (HP)</span>
        <span class="stat-val" style="color: #39ff14;">${winner.hp} / ${winner.maxHp}</span>
      </div>
      <div class="stat-row">
        <span>고유 스킬</span>
        <span class="stat-val" style="color: #ffd700;">${winner.skillName}</span>
      </div>
    </div>
  `;

  winnerModal.classList.remove('hidden');
}

// Close Winner Modal and go to Lobby
function closeWinnerModal() {
  winnerModal.classList.add('hidden');
  goBackToLobby();
}

function goBackToLobby() {
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

statsModeSelect.addEventListener('change', () => {
  initLobby();
});

const resetTiersBtn = document.getElementById('reset-tiers-btn');
if (resetTiersBtn) {
  resetTiersBtn.addEventListener('click', resetTierStats);
}

// Start APP
initLobby();
initPatchNotesSubscription();
