import type { CharacterConfig, CharacterState } from './character.interface';

interface DongjunState extends CharacterState {
  currentRank?: number; // 0: 훈련병, 1: 이병, 2: 일병, 3: 상병, 4: 병장, 5: 전역
  promotionTimer?: number;
  dongjunSkillSpeedApplied?: boolean;
}

const RANK_NAMES = ['훈련병', '이병', '일병', '상병', '병장', '전역'];

function getRankStats(rank: number) {
  switch (rank) {
    case 0: // 훈련병
      return { maxHp: 100, attackPower: 6, speed: 0.8 };
    case 1: // 이병
      return { maxHp: 120, attackPower: 8, speed: 1.0 };
    case 2: // 일병
      return { maxHp: 140, attackPower: 10, speed: 1.2 };
    case 3: // 상병
      return { maxHp: 170, attackPower: 15, speed: 1.4 };
    case 4: // 병장
    default:
      return { maxHp: 200, attackPower: 20, speed: 1.6 };
  }
}

// 진급 수행 함수
function promoteDongjun(char: DongjunState, ctx: any) {
  if (char.isDead) return;

  if (char.currentRank === undefined) {
    char.currentRank = 0;
  }

  // 3% 확률로 즉시 전역 승리 판정
  if (Math.random() < 0.03) {
    char.currentRank = 5; // 전역
    char.skillActive = false;
    char.skillDurationLeft = 0;
    
    ctx.addFloatingText(char.x, char.y - 75, '🎖️ 만기 전역! 즉시 승리! 🎉', '#00ff00', 3.0);
    ctx.createExplosion(char.x, char.y, '#00ff00', 40);
    ctx.createExplosion(char.x, char.y, '#ffea00', 30);
    
    ctx.logMessage?.(`🎖️ [만기 전역] 동준 ➡️ 대한민국 육군 만기 전역 승리! (모든 적에게 치명적 피해)`, 'skill');

    // 맵의 모든 적에게 즉시 처단 대미지 적용
    ctx.characters.forEach((other: CharacterState) => {
      if (!other.isDead && other.id !== char.id) {
        ctx.dealDamage(char, other, 9999, '🎖️ 전역 신고');
        ctx.createExplosion(other.x, other.y, '#ff0000', 10);
      }
    });
    return;
  }

  // 일반 진급 (병장 미만인 경우만)
  if (char.currentRank < 4) {
    char.currentRank += 1;
    const rankName = RANK_NAMES[char.currentRank];
    const stats = getRankStats(char.currentRank);

    // 스탯 적용
    const oldMaxHp = char.maxHp;
    char.maxHp = stats.maxHp;
    // 체력 증가분 만큼 회복 및 최대체력 갱신
    const hpDiff = char.maxHp - oldMaxHp;
    char.hp = Math.min(char.maxHp, char.hp + hpDiff);
    char.attackPower = stats.attackPower;
    
    // 만약 스킬 버프가 이미 적용 중이라면 기본 스피드만 올려주고 보정은 유지
    if (char.dongjunSkillSpeedApplied) {
      char.speed = stats.speed * 1.3;
    } else {
      char.speed = stats.speed;
    }

    ctx.addFloatingText(char.x, char.y - 50, `🎖️ [진급] ${rankName}!`, '#4d5d3b', 1.8);
    ctx.createExplosion(char.x, char.y, '#4d5d3b', 12);
    ctx.logMessage?.(`🎖️ [진급] 동준 ➡️ ${rankName} 진급! (최대체력: ${char.maxHp}, 공격력: ${char.attackPower})`, 'skill');
  } else {
    // 이미 병장인데 전역을 실패한 경우
    ctx.addFloatingText(char.x, char.y - 50, '🪖 전역 대기 중...', '#aaaaaa', 1.0);
  }
}

export const dongjunConfig: CharacterConfig = {
  id: 'dongjun',
  name: '동준',
  maxHp: 100, // 훈련병 시작 체력
  speed: 0.8, // 훈련병 시작 속도
  attackPower: 6, // 훈련병 시작 공격력
  baseAttackRange: 45,
  skillName: '군기 충전 및 진급',
  skillDescription: '5초마다 훈련병 ➡️ 이병 ➡️ 일병 ➡️ 상병 ➡️ 병장 계급으로 자동 진급합니다. 진급 시 3% 확률로 즉시 [전역]하여 매치를 즉시 승리합니다! 액티브 발동 시 즉시 1단계 진급(3% 전역 판정 포함) 및 3초간 이동 속도가 30% 증가합니다.',
  color: '#4d5d3b', // 밀리터리 카키그린
  skillChargeRate: 20, // 5초 쿨타임
  tier: 'B',

  onSkillTrigger(char: CharacterState, ctx) {
    const dj = char as DongjunState;
    dj.skillActive = true;
    dj.skillDurationLeft = 3.0; // 3초 버프
    dj.dongjunSkillSpeedApplied = true;

    // 즉시 진급 롤링
    promoteDongjun(dj, ctx);

    // 3초간 추가 스피드업 보정 (+30%)
    dj.speed = dj.speed * 1.3;
    ctx.addFloatingText(dj.x, dj.y - 65, '🔥 전투 훈련 돌입! (이속 +30%)', '#ffd700', 1.5);
  },

  onUpdate(char: CharacterState, dt: number, ctx) {
    const dj = char as DongjunState;

    // 초기 상태 초기화
    if (dj.currentRank === undefined) {
      dj.currentRank = 0; // 훈련병 시작
      dj.promotionTimer = 5.0;
    }

    // 5초마다 자동 진급 쿨타임 차감
    if (dj.promotionTimer !== undefined) {
      dj.promotionTimer -= dt;
      if (dj.promotionTimer <= 0) {
        dj.promotionTimer = 5.0; // 타이머 리셋
        promoteDongjun(dj, ctx);
      }
    }

    // 액티브 버프 시간 차감
    if (dj.skillActive) {
      dj.skillDurationLeft -= dt;
      if (dj.skillDurationLeft <= 0) {
        dj.skillActive = false;
        dj.dongjunSkillSpeedApplied = false;
        // 원래 계급 스피드로 복귀
        const baseStats = getRankStats(dj.currentRank || 0);
        dj.speed = baseStats.speed;
        ctx.addFloatingText(dj.x, dj.y - 45, '💨 훈련 속도 종료', '#888888', 1.0);
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
      canvasCtx.strokeStyle = '#ffea00';
      canvasCtx.lineWidth = 3;
      canvasCtx.shadowBlur = 10;
      canvasCtx.shadowColor = '#ffea00';
      canvasCtx.beginPath();
      canvasCtx.arc(dj.x, dj.y, currentRadius + 3, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
    }
  }
};
