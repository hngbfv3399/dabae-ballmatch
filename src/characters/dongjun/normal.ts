import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface DongjunState extends CharacterState {
  currentRank?: number; // 0: Recruit, 1: Private, 2: Private First Class, 3: Corporal, 4: Sergeant, 5: Discharged
  promotionTimer?: number;
  dongjunSkillSpeedApplied?: boolean;
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const RANK_NAMES = ['훈련병', '이병', '일병', '상병', '병장', '전역'];

const SKILL_CONSTANTS = {
  PROMOTION_COOLDOWN: 5,        // Auto promotion roll every 5s
  DISCHARGE_CHANCE: 0.03,       // 3% chance to get discharged
  DISCHARGE_BUFF_DURATION: 8.0, // Discharged buff lasts 8 seconds
  DISCHARGE_SPEED: 2.2,         // Speed during discharge
  DISCHARGE_ATK: 45,            // Atk during discharge
  DISCHARGE_AOE_RADIUS: 250,    // Explosion radius on discharge
  DISCHARGE_AOE_DMG: 60,        // Explosion damage
  ACTIVE_SPEED_BUFF_PCT: 30,    // Speed buff +30% when active triggers
  ACTIVE_SPEED_DURATION: 3.0,   // Active speed buff lasts 3 seconds
  RANK_4_HEAL: 30,              // Heal 30 HP when Sergant rank rolls
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const dongjunConfig: CharacterConfig = {
  id: 'dongjun',
  name: '동준',
  maxHp: 150, // Fixed max HP
  speed: 1.0, // Recruit base speed
  attackPower: 12, // Recruit base attack power
  baseAttackRange: 45,
  skillName: '군기 충전 및 계급 추첨',
  skillDescription: `${SKILL_CONSTANTS.PROMOTION_COOLDOWN}초마다 랜덤 계급(훈련병~병장)을 새로 뽑습니다. 계급 변동 시 ${SKILL_CONSTANTS.DISCHARGE_CHANCE * 100}% 확률로 즉시 [전역]하여 주변 ${SKILL_CONSTANTS.DISCHARGE_AOE_RADIUS}px 적들에게 ${SKILL_CONSTANTS.DISCHARGE_AOE_DMG} 광역 피해와 넉백을 주고, ${SKILL_CONSTANTS.DISCHARGE_BUFF_DURATION}초간 [만기전역] 버프(이속 ${SKILL_CONSTANTS.DISCHARGE_SPEED}x, 공격력 ${SKILL_CONSTANTS.DISCHARGE_ATK})를 얻습니다. 액티브 발동 시 즉시 계급 추첨 및 ${SKILL_CONSTANTS.ACTIVE_SPEED_DURATION}초간 이동 속도가 ${SKILL_CONSTANTS.ACTIVE_SPEED_BUFF_PCT}% 증가합니다. (병장 진급 시 체력 ${SKILL_CONSTANTS.RANK_4_HEAL} 회복)`,
  color: '#4d5d3b', // Military Khaki Green
  skillChargeRate: 100 / SKILL_CONSTANTS.PROMOTION_COOLDOWN, // 5s cooldown
  tier: 'B',
  role: 'Specialist',
  detailedDescription: `동준은 무작위 군대 계급 변동과 [만기 전역]이라는 역전 기믹을 가진 변수형 캐릭터입니다. 매 ${SKILL_CONSTANTS.PROMOTION_COOLDOWN}초(혹은 스킬 발동)마다 계급이 무작위 추첨되어 스탯이 실시간 변동하며, 전역할 시 강력한 광역 피해(${SKILL_CONSTANTS.DISCHARGE_AOE_DMG})를 주변에 방출하고 ${SKILL_CONSTANTS.DISCHARGE_BUFF_DURATION}초 동안 이속과 공격력이 극대화되어 시뮬레이션을 장악합니다.`,
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — active speed buff & roll promotion
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    const dj = char as DongjunState;
    
    // If already discharged, prevent rerolling rank to preserve the buff
    if (dj.currentRank === 5) {
      ctx.addFloatingText(dj.x, dj.y - 65, '🎖️ 이미 전역한 몸이다!', '#ffd700', 1.5);
      return;
    }

    dj.skillActive = true;
    dj.skillDurationLeft = SKILL_CONSTANTS.ACTIVE_SPEED_DURATION; // 3 seconds duration
    dj.dongjunSkillSpeedApplied = true;

    // Trigger promotion roll
    promoteDongjun(dj, ctx);

    // Apply speed buff (+30%)
    dj.speed = dj.speed * (1 + SKILL_CONSTANTS.ACTIVE_SPEED_BUFF_PCT / 100);
    ctx.addFloatingText(dj.x, dj.y - 65, `🔥 전투 훈련 돌입! (이속 +${SKILL_CONSTANTS.ACTIVE_SPEED_BUFF_PCT}%)`, '#ffd700', 1.5);
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — promotion cooldown & active buff decay
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    const dj = char as DongjunState;

    // Initialization
    if (dj.currentRank === undefined) {
      dj.currentRank = 0; // Starts as Recruit
      dj.promotionTimer = SKILL_CONSTANTS.PROMOTION_COOLDOWN;
    }

    // Cooldown ticks down only when not discharged
    if (dj.currentRank !== 5) {
      if (dj.promotionTimer !== undefined) {
        dj.promotionTimer -= dt;
        if (dj.promotionTimer <= 0) {
          dj.promotionTimer = SKILL_CONSTANTS.PROMOTION_COOLDOWN; // reset timer
          promoteDongjun(dj, ctx);
        }
      }
    }

    // Buff duration decrement
    if (dj.skillActive) {
      dj.skillDurationLeft -= dt;
      if (dj.skillDurationLeft <= 0) {
        dj.skillActive = false;
        dj.dongjunSkillSpeedApplied = false;
        
        // If discharged buff expired, return status to Recruit
        if (dj.currentRank === 5) {
          dj.currentRank = 0;
          dj.promotionTimer = SKILL_CONSTANTS.PROMOTION_COOLDOWN;
        }

        // Restore base rank stats
        const baseStats = getRankStats(dj.currentRank || 0);
        dj.attackPower = baseStats.attackPower;
        dj.speed = baseStats.speed;
        
        if (dj.currentRank === 0) {
          ctx.addFloatingText(dj.x, dj.y - 45, '💨 전역 효과 종료 (훈련병 복귀)', '#888888', 1.0);
        } else {
          ctx.addFloatingText(dj.x, dj.y - 45, '💨 훈련 속도 종료', '#888888', 1.0);
        }
      }
    }

    // Soldier floating quotes passive
    const quoteTimer = (dj as any).quoteTimer || 0;
    if (Date.now() - quoteTimer > 4000) {
      (dj as any).quoteTimer = Date.now();
      const quotes = ['🪖 충성!', '🪖 전역 언제하냐...', '🪖 훈련병은 서럽다', '🪖 야외 훈련 완료!'];
      const randQuote = quotes[Math.floor(Math.random() * quotes.length)];
      if (dj.currentRank === 4) {
        ctx.addFloatingText(dj.x, dj.y - 45, '🔥 전역 보이지 말입니다!', '#ffea00', 1.0);
      } else if (dj.currentRank === 5) {
        ctx.addFloatingText(dj.x, dj.y - 45, '🎉 나 이제 집 간다!!', '#00ff00', 1.2);
      } else {
        ctx.addFloatingText(dj.x, dj.y - 45, randQuote, '#4d5d3b', 1.0);
      }
    }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region RENDER — draw rank badge name, golden aura on sergeant/discharge
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const dj = char as DongjunState;
    const rank = dj.currentRank || 0;
    const rankName = RANK_NAMES[rank];

    // Draw rank badge name above head
    canvasCtx.save();
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 10px Outfit, sans-serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(rankName, dj.x, dj.y - currentRadius - 6);
    canvasCtx.restore();

    // Golden aura on Sergeant (4) or Cyan on Discharged (5)
    if (rank >= 4) {
      canvasCtx.save();
      canvasCtx.strokeStyle = rank === 5 ? '#00ffcc' : '#ffea00';
      canvasCtx.lineWidth = rank === 5 ? 4 : 3;
      canvasCtx.shadowBlur = 10;
      canvasCtx.shadowColor = rank === 5 ? '#00ffcc' : '#ffea00';
      canvasCtx.beginPath();
      canvasCtx.arc(dj.x, dj.y, currentRadius + 3, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
    }
  }
  // #endregion RENDER
};

// ═══════════════════════════════════════════
// #region HELPERS — promotion rollers & stats lookup
// ═══════════════════════════════════════════
function getRankStats(rank: number) {
  switch (rank) {
    case 0: // Recruit
      return { attackPower: 12, speed: 1.0 };
    case 1: // Private
      return { attackPower: 14, speed: 1.1 };
    case 2: // Private First Class
      return { attackPower: 17, speed: 1.3 };
    case 3: // Corporal
      return { attackPower: 21, speed: 1.5 };
    case 4: // Sergeant
    default:
      return { attackPower: 26, speed: 1.7 };
  }
}

function promoteDongjun(char: DongjunState, ctx: CharacterBehaviorContext) {
  if (char.isDead) return;

  if (char.currentRank === undefined) {
    char.currentRank = 0;
  }

  // 3% chance of instant discharge (aoe burst + massive speed/atk buff)
  if (Math.random() < SKILL_CONSTANTS.DISCHARGE_CHANCE) {
    char.currentRank = 5; // Discharged
    char.skillActive = true;
    char.skillDurationLeft = SKILL_CONSTANTS.DISCHARGE_BUFF_DURATION;
    
    char.attackPower = SKILL_CONSTANTS.DISCHARGE_ATK;
    char.speed = SKILL_CONSTANTS.DISCHARGE_SPEED;
    
    ctx.addFloatingText(char.x, char.y - 75, '🎖️ 만기 전역! 예비역 병장 탄생! 🎉', '#00ff00', 3.0);
    ctx.createExplosion(char.x, char.y, '#00ff00', 40);
    ctx.createExplosion(char.x, char.y, '#ffea00', 30);
    
    ctx.logMessage?.(`🎖️ [만기 전역] 동준 ➡️ 대한민국 육군 만기 전역! (${SKILL_CONSTANTS.DISCHARGE_BUFF_DURATION}초간 공격력 ${SKILL_CONSTANTS.DISCHARGE_ATK}, 이속 ${SKILL_CONSTANTS.DISCHARGE_SPEED}x 버프 및 광역 폭발 피해)`, 'skill');

    // Aoe blast and knockback to enemies within 250px
    ctx.characters.forEach((other: CharacterState) => {
      if (!other.isDead && other.id !== char.id) {
        const dist = Math.hypot(other.x - char.x, other.y - char.y);
        if (dist <= SKILL_CONSTANTS.DISCHARGE_AOE_RADIUS) {
          ctx.dealDamage(char, other, SKILL_CONSTANTS.DISCHARGE_AOE_DMG, '🎖️ 전역 축하포');
          ctx.createExplosion(other.x, other.y, '#ffea00', 12);
          
          const angle = Math.atan2(other.y - char.y, other.x - char.x);
          other.vx += Math.cos(angle) * 8;
          other.vy += Math.sin(angle) * 8;
        }
      }
    });
    return;
  }

  // Reroll rank (0 Recruit ~ 4 Sergeant)
  const newRank = Math.floor(Math.random() * 5);
  const prevRank = char.currentRank;
  char.currentRank = newRank;
  const rankName = RANK_NAMES[newRank];
  const stats = getRankStats(newRank);

  char.attackPower = stats.attackPower;

  if (char.dongjunSkillSpeedApplied) {
    char.speed = stats.speed * (1 + SKILL_CONSTANTS.ACTIVE_SPEED_BUFF_PCT / 100);
  } else {
    char.speed = stats.speed;
  }

  // Recover HP if Sgt
  let healAmount = 0;
  if (newRank === 4) {
    healAmount = SKILL_CONSTANTS.RANK_4_HEAL;
    char.hp = Math.min(char.maxHp, char.hp + healAmount);
  }

  const changeEmoji = newRank > prevRank ? '⬆️' : newRank < prevRank ? '⬇️' : '↔️';
  const healText = healAmount > 0 ? ` (+${healAmount} HP)` : '';
  ctx.addFloatingText(char.x, char.y - 50, `🎲 ${changeEmoji} ${rankName}!${healText}`, '#4d5d3b', 1.8);
  ctx.createExplosion(char.x, char.y, '#4d5d3b', 12);
  
  if (healAmount > 0) {
    ctx.logMessage?.(`🎲 [계급 변동] 동준 ➡️ ${rankName}! (체력 ${healAmount} 회복, 공격력: ${char.attackPower})`, 'skill');
  } else {
    ctx.logMessage?.(`🎲 [계급 변동] 동준 ➡️ ${rankName}! (공격력: ${char.attackPower})`, 'skill');
  }
}
// #endregion HELPERS
