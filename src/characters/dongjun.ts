import type { CharacterConfig, CharacterState } from './character.interface';

interface DongjunState extends CharacterState {
  currentRank?: number; // 0: 훈련병, 1: 이병, 2: 일병, 3: 상병, 4: 병장, 5: 전역
  promotionTimer?: number;
  dongjunSkillSpeedApplied?: boolean;
}

const RANK_NAMES = ['훈련병', '이병', '일병', '상병', '병장', '전역'];

const SKILL_CONSTANTS = {
  PROMOTION_COOLDOWN: 5,        // 5초마다 자동 진급
  DISCHARGE_CHANCE: 0.03,       // 3% 확률로 전역
  DISCHARGE_BUFF_DURATION: 8.0, // 전역 버프 8초 지속
  DISCHARGE_SPEED: 2.2,         // 전역 시 이동 속도
  DISCHARGE_ATK: 45,            // 전역 시 공격력
  DISCHARGE_AOE_RADIUS: 250,    // 전역 시 광역 폭발 반경
  DISCHARGE_AOE_DMG: 60,        // 전역 시 광역 폭발 피해량
  ACTIVE_SPEED_BUFF_PCT: 30,    // 액티브 발동 시 이속 30% 증가
  ACTIVE_SPEED_DURATION: 3.0,   // 액티브 이속 버프 3초
  RANK_4_HEAL: 30,              // 병장 진급 시 30 회복
};

function getRankStats(rank: number) {
  switch (rank) {
    case 0: // 훈련병
      return { attackPower: 12, speed: 1.0 };
    case 1: // 이병
      return { attackPower: 14, speed: 1.1 };
    case 2: // 일병
      return { attackPower: 17, speed: 1.3 };
    case 3: // 상병
      return { attackPower: 21, speed: 1.5 };
    case 4: // 병장
    default:
      return { attackPower: 26, speed: 1.7 };
  }
}

// 계급 배정 함수 (랜덤)
function promoteDongjun(char: DongjunState, ctx: any) {
  if (char.isDead) return;

  if (char.currentRank === undefined) {
    char.currentRank = 0;
  }

  // 3% 확률로 즉시 전역 판정 (광역딜 + 폭발적인 이속/공격력 8초 버프)
  if (Math.random() < SKILL_CONSTANTS.DISCHARGE_CHANCE) {
    char.currentRank = 5; // 전역
    char.skillActive = true;
    char.skillDurationLeft = SKILL_CONSTANTS.DISCHARGE_BUFF_DURATION;
    
    // 전역 스탯 버프 적용
    char.attackPower = SKILL_CONSTANTS.DISCHARGE_ATK;
    char.speed = SKILL_CONSTANTS.DISCHARGE_SPEED;
    
    ctx.addFloatingText(char.x, char.y - 75, '🎖️ 만기 전역! 예비역 병장 탄생! 🎉', '#00ff00', 3.0);
    ctx.createExplosion(char.x, char.y, '#00ff00', 40);
    ctx.createExplosion(char.x, char.y, '#ffea00', 30);
    
    ctx.logMessage?.(`🎖️ [만기 전역] 동준 ➡️ 대한민국 육군 만기 전역! (${SKILL_CONSTANTS.DISCHARGE_BUFF_DURATION}초간 공격력 ${SKILL_CONSTANTS.DISCHARGE_ATK}, 이속 ${SKILL_CONSTANTS.DISCHARGE_SPEED}x 버프 및 광역 폭발 피해)`, 'skill');

    // 동준을 제외한 주변 적에게 전역 축하포 광역 폭발 피해 및 넉백
    ctx.characters.forEach((other: CharacterState) => {
      if (!other.isDead && other.id !== char.id) {
        const dist = Math.hypot(other.x - char.x, other.y - char.y);
        if (dist <= SKILL_CONSTANTS.DISCHARGE_AOE_RADIUS) {
          ctx.dealDamage(char, other, SKILL_CONSTANTS.DISCHARGE_AOE_DMG, '🎖️ 전역 축하포');
          ctx.createExplosion(other.x, other.y, '#ffea00', 12);
          
          // 강한 넉백
          const angle = Math.atan2(other.y - char.y, other.x - char.x);
          other.vx += Math.cos(angle) * 8;
          other.vy += Math.sin(angle) * 8;
        }
      }
    });
    return;
  }

  // 랜덤 계급 배정 (0: 훈련병 ~ 4: 병장)
  const newRank = Math.floor(Math.random() * 5); // 0~4 랜덤
  const prevRank = char.currentRank;
  char.currentRank = newRank;
  const rankName = RANK_NAMES[newRank];
  const stats = getRankStats(newRank);

  // 스탯 적용
  char.attackPower = stats.attackPower;

  // 스킬 이속 버프 중이라면 보정 유지
  if (char.dongjunSkillSpeedApplied) {
    char.speed = stats.speed * (1 + SKILL_CONSTANTS.ACTIVE_SPEED_BUFF_PCT / 100);
  } else {
    char.speed = stats.speed;
  }

  // 병장(Rank 4)인 경우에만 체력 회복 (다른 계급은 회복 없음)
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

export const dongjunConfig: CharacterConfig = {
  id: 'dongjun',
  name: '동준',
  maxHp: 150, // 고정 최대 체력
  speed: 1.0, // 훈련병 시작 속도
  attackPower: 12, // 훈련병 시작 공격력
  baseAttackRange: 45,
  skillName: '군기 충전 및 계급 추첨',
  skillDescription: `${SKILL_CONSTANTS.PROMOTION_COOLDOWN}초마다 랜덤 계급(훈련병~병장)을 새로 뽑습니다. 계급 변동 시 ${SKILL_CONSTANTS.DISCHARGE_CHANCE * 100}% 확률로 즉시 [전역]하여 주변 ${SKILL_CONSTANTS.DISCHARGE_AOE_RADIUS}px 적들에게 ${SKILL_CONSTANTS.DISCHARGE_AOE_DMG} 광역 피해와 넉백을 주고, ${SKILL_CONSTANTS.DISCHARGE_BUFF_DURATION}초간 [만기전역] 버프(이속 ${SKILL_CONSTANTS.DISCHARGE_SPEED}x, 공격력 ${SKILL_CONSTANTS.DISCHARGE_ATK})를 얻습니다. 액티브 발동 시 즉시 계급 추첨 및 ${SKILL_CONSTANTS.ACTIVE_SPEED_DURATION}초간 이동 속도가 ${SKILL_CONSTANTS.ACTIVE_SPEED_BUFF_PCT}% 증가합니다. (병장 진급 시 체력 ${SKILL_CONSTANTS.RANK_4_HEAL} 회복)`,
  color: '#4d5d3b', // 밀리터리 카키그린
  skillChargeRate: 100 / SKILL_CONSTANTS.PROMOTION_COOLDOWN, // 5초 쿨타임
  tier: 'B',
  role: 'Specialist',
  detailedDescription: `동준은 무작위 군대 계급 변동과 [만기 전역]이라는 역전 기믹을 가진 변수형 캐릭터입니다. 매 ${SKILL_CONSTANTS.PROMOTION_COOLDOWN}초(혹은 스킬 발동)마다 계급이 무작위 추첨되어 스탯이 실시간 변동하며, 전역할 시 강력한 광역 피해(${SKILL_CONSTANTS.DISCHARGE_AOE_DMG})를 주변에 방출하고 ${SKILL_CONSTANTS.DISCHARGE_BUFF_DURATION}초 동안 이속과 공격력이 극대화되어 시뮬레이션을 장악합니다.`,

  onSkillTrigger(char: CharacterState, ctx) {
    const dj = char as DongjunState;
    
    // 만약 이미 전역 버프 상태라면 스킬 트리거로 인한 계급 리롤을 방지하여 버프를 지킴
    if (dj.currentRank === 5) {
      ctx.addFloatingText(dj.x, dj.y - 65, '🎖️ 이미 전역한 몸이다!', '#ffd700', 1.5);
      return;
    }

    dj.skillActive = true;
    dj.skillDurationLeft = SKILL_CONSTANTS.ACTIVE_SPEED_DURATION; // 3초 버프
    dj.dongjunSkillSpeedApplied = true;

    // 즉시 진급 롤링
    promoteDongjun(dj, ctx);

    // 3초간 추가 이속 스피드업 보정 (+30%)
    dj.speed = dj.speed * (1 + SKILL_CONSTANTS.ACTIVE_SPEED_BUFF_PCT / 100);
    ctx.addFloatingText(dj.x, dj.y - 65, `🔥 전투 훈련 돌입! (이속 +${SKILL_CONSTANTS.ACTIVE_SPEED_BUFF_PCT}%)`, '#ffd700', 1.5);
  },

  onUpdate(char: CharacterState, dt: number, ctx) {
    const dj = char as DongjunState;

    // 초기 상태 초기화
    if (dj.currentRank === undefined) {
      dj.currentRank = 0; // 훈련병 시작
      dj.promotionTimer = SKILL_CONSTANTS.PROMOTION_COOLDOWN;
    }

    // 전역 상태가 아닐 때만 5초 자동 진급 타이머가 차감됨
    if (dj.currentRank !== 5) {
      if (dj.promotionTimer !== undefined) {
        dj.promotionTimer -= dt;
        if (dj.promotionTimer <= 0) {
          dj.promotionTimer = SKILL_CONSTANTS.PROMOTION_COOLDOWN; // 타이머 리셋
          promoteDongjun(dj, ctx);
        }
      }
    }

    // 버프 시간 차감
    if (dj.skillActive) {
      dj.skillDurationLeft -= dt;
      if (dj.skillDurationLeft <= 0) {
        dj.skillActive = false;
        dj.dongjunSkillSpeedApplied = false;
        
        // 전역 상태의 버프였던 경우, 원래의 훈련병(0) 신분으로 돌려보냄
        if (dj.currentRank === 5) {
          dj.currentRank = 0;
          dj.promotionTimer = SKILL_CONSTANTS.PROMOTION_COOLDOWN;
        }

        // 원래 계급 스탯으로 복귀
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

    // 군인 대사 띄우기 패시브
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

  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const dj = char as DongjunState;
    const rank = dj.currentRank || 0;
    const rankName = RANK_NAMES[rank];

    // 계급장 그리기
    canvasCtx.save();
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 10px Outfit, sans-serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(rankName, dj.x, dj.y - currentRadius - 6);
    canvasCtx.restore();

    // 병장/전역 상태일 때 금빛 오라 연출
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
};
