import type { CharacterConfig, CharacterState } from './character.interface';

interface Projectile {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  damageDealt: boolean;
}

interface ArtilleryStrike {
  targetX: number;
  targetY: number;
  radius: number;
  delayLeft: number;
  durationLeft: number;
  shellTimer: number;
}

export const chanikConfig: CharacterConfig = {
  id: 'chanik',
  name: '찬익',
  maxHp: 170,
  speed: 1.3,
  attackPower: 14,
  baseAttackRange: 45,
  skillName: '포격 지원 요청 (Artillery Strike)',
  skillDescription: '8초 쿨타임. 맵 전체에 공습경보를 내리고 무차별 전탄 폭격을 요청합니다. 스킬이 유지되는 동안 맵 전체의 모든 적은 이동 속도가 20% 감소하며, 1.5초 뒤 맵 전체 영역에 4.8초 동안 포탄들이 무차별 연속 낙하하여 폭발당 반경 135px 범위에 10의 피해와 강한 넉백을 입힙니다.',
  color: '#4b5320', // 군용 국방색
  skillChargeRate: 12.5, // 8초 쿨타임 (100 / 8 = 12.5)
  tier: 'A',

  // [1] 스킬 최초 시동 시 훅
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = false; // 포격 호출 직후 스킬 상태 종료하여 다시 쿨타임 돌기

    ctx.addFloatingText(char.x, char.y - 45, '🚨 공습경보 발령!', '#ff3300', 1.5);
    console.log(`📻 [포격 요청] 찬익 -> 맵 전체 무차별 전탄 융단폭격 지원 요청! (공습경보 가동)`);
    ctx.logMessage?.(`📻 [포격 요청] 찬익 ➡️ 맵 전체 무차별 융단폭격 개시!`, 'skill');

    const activeStrikes = (char as any).activeStrikes || [];
    activeStrikes.push({
      targetX: 400, // 맵 중앙
      targetY: 300, // 맵 중앙
      radius: 1000, // 전 화면 커버
      delayLeft: 1.5, // 1.5초 폭격 대기 및 공습경보 노출 시간
      durationLeft: 4.8, // 4.8초 포격 지속 시간 (1초 상향)
      shellTimer: 0
    });
    (char as any).activeStrikes = activeStrikes;
  },

  // [2] 매 프레임 업데이트 훅
  onUpdate(char: CharacterState, dt: number, ctx) {
    const activeStrikes = ((char as any).activeStrikes || []) as ArtilleryStrike[];
    const projectiles = ((char as any).projectiles || []) as Projectile[];
    const chars = (ctx as any).characters as CharacterState[];

    // 포격 조준 범위 내 적 감속 디버프 부여
    chars.forEach((enemy) => {
      if (enemy.isDead || enemy.id === char.id) return;
      const opp = enemy as any;
      let isInsideZone = false;

      activeStrikes.forEach((strike) => {
        const dist = Math.hypot(enemy.x - strike.targetX, enemy.y - strike.targetY);
        if (dist <= strike.radius) {
          isInsideZone = true;
        }
      });

      if (isInsideZone) {
        if (!opp.chanikSlowApplied) {
          opp.chanikSlowApplied = true;
          opp.chanikOriginalSpeed = enemy.speed;
          enemy.speed = enemy.speed * 0.8; // 20% 감속 (기존 40%)
          ctx.addFloatingText(enemy.x, enemy.y - 25, '🚨 공습경보 (이속 -20%)', '#ff3300', 1.0);
          console.log(`🚨 [전술 감속] 찬익의 전탄 융단폭격 공습경보 작동 -> ${enemy.name} 이동 속도 20% 감소`);
        }
      } else {
        if (opp.chanikSlowApplied) {
          opp.chanikSlowApplied = false;
          if (opp.chanikOriginalSpeed !== undefined) {
            enemy.speed = opp.chanikOriginalSpeed;
          }
          ctx.addFloatingText(enemy.x, enemy.y - 25, '🚨 상황 해제', '#00ffcc', 1.0);
          console.log(`🚨 [전술 감속 해제] ${enemy.name}의 공습 경보 감속이 종료되어 이동 속도 복구`);
        }
      }
    });

    // 1. 포격 타이머 및 폭포탄 소환
    activeStrikes.forEach((strike) => {
      if (strike.delayLeft > 0) {
        strike.delayLeft -= dt;
        // 조준 영역에 임의의 붉은 위험 신호 파티클 방출 (맵 전체 범위 무작위)
        if (Math.random() < 0.3) {
          ctx.createParticle(
            Math.random() * 800,
            Math.random() * 600,
            '#ff3300',
            2,
            5
          );
        }
      } else if (strike.durationLeft > 0) {
        strike.durationLeft -= dt;
        strike.shellTimer -= dt;
        if (strike.shellTimer <= 0) {
          strike.shellTimer = 0.15; // 0.15초 간격으로 신속 포격 투하
          
          // 맵 전체 범위 내 무작위 낙하 좌표 계산
          const bombX = Math.random() * 800;
          const bombY = Math.random() * 600;

          // 공중 투하 포탄 오브젝트 추가
          projectiles.push({
            startX: bombX - 100, // 빗겨 떨어지는 포탄 궤적
            startY: bombY - 400,
            targetX: bombX,
            targetY: bombY,
            progress: 0,
            damageDealt: false
          });
        }
      }
    });

    // 완료된 폭격 요청 정제
    (char as any).activeStrikes = activeStrikes.filter((s) => s.delayLeft > 0 || s.durationLeft > 0);

    // 2. 포탄 비행 투하 업데이트
    projectiles.forEach((proj) => {
      proj.progress += dt * 4.0; // 0.25초 만에 폭발점에 도달
      
      const curX = proj.startX + (proj.targetX - proj.startX) * proj.progress;
      const curY = proj.startY + (proj.targetY - proj.startY) * proj.progress;

      // 비행 꼬리 파티클 방출
      if (proj.progress < 1.0 && Math.random() < 0.3) {
        ctx.createParticle(curX, curY, '#ff6600', 3, 5);
      }

      // 폭발 시점 감지
      if (proj.progress >= 1.0 && !proj.damageDealt) {
        proj.progress = 1.0;
        proj.damageDealt = true;

        console.log(`💥 [포탄 폭발] 찬익의 포격 명중! 위치: (${Math.round(proj.targetX)}, ${Math.round(proj.targetY)})`);

        ctx.createExplosion(proj.targetX, proj.targetY, '#ffaa00', 25);
        ctx.createExplosion(proj.targetX, proj.targetY, '#ff3300', 18);
        ctx.addFloatingText(proj.targetX, proj.targetY - 20, '💥 BOMB!', '#ff3300', 1.0);

        // 폭격 범위 내의 적(반경 135px)에게 피해 적용
        const chars = (ctx as any).characters as CharacterState[];
        chars.forEach((enemy) => {
          if (enemy.isDead || enemy.id === char.id) return;
          const dist = Math.hypot(enemy.x - proj.targetX, enemy.y - proj.targetY);
          if (dist <= 135) {
            ctx.dealDamage(char, enemy, 10, '💥 BOMBARD!');
            
            // 강력한 폭발 넉백 벡터 적용
            const kAngle = Math.atan2(enemy.y - proj.targetY, enemy.x - proj.targetX);
            enemy.vx += Math.cos(kAngle) * 8;
            enemy.vy += Math.sin(kAngle) * 8;
          }
        });
      }
    });

    // 만료된 포탄 오브젝트 정제
    (char as any).projectiles = projectiles.filter((p) => p.progress < 1.0);

    // 기절 수동 제어
    if (char.isStunned) {
      char.stunTimeLeft -= dt;
      char.vx = 0;
      char.vy = 0;
      if (char.stunTimeLeft <= 0) {
        char.isStunned = false;
        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed;
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;
      }
    }
  },

  // [3] 캐릭터 고유 렌더링 확장 훅
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const activeStrikes = ((char as any).activeStrikes || []) as ArtilleryStrike[];
    const projectiles = ((char as any).projectiles || []) as Projectile[];

    // 1. 붉은 조준 영역 경고 및 오버레이 점멸 그리기
    canvasCtx.save();
    activeStrikes.forEach((strike) => {
      if (strike.radius >= 1000) {
        // 화면 가장자리 빨간색 사이렌 라인 그리기
        canvasCtx.strokeStyle = 'rgba(255, 0, 0, 0.45)';
        canvasCtx.lineWidth = 10;
        canvasCtx.strokeRect(0, 0, 800, 600);

        // 화면 전체에 은은한 붉은색 오버레이 점멸 이펙트
        const pulse = Math.abs(Math.sin(Date.now() / 150)) * 0.08;
        canvasCtx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
        canvasCtx.fillRect(0, 0, 800, 600);

        // 🚨 공습경보!! 대형 자막 출력 (폭탄 낙하 대기 1.5초 동안 중앙에 표출)
        if (strike.delayLeft > 0) {
          canvasCtx.save();
          canvasCtx.fillStyle = '#ff3300';
          canvasCtx.strokeStyle = '#000000';
          canvasCtx.lineWidth = 5.0;
          
          // 긴박한 고속 점멸 계수 (80ms 주기)
          const textPulse = Math.abs(Math.sin(Date.now() / 80));
          canvasCtx.globalAlpha = 0.3 + textPulse * 0.7; // 0.3 ~ 1.0 점멸
          
          canvasCtx.font = 'bold 52px "Noto Sans KR", Arial, sans-serif';
          canvasCtx.textAlign = 'center';
          canvasCtx.textBaseline = 'middle';
          
          canvasCtx.strokeText('🚨 공습경보!! 🚨', 400, 270);
          canvasCtx.fillText('🚨 공습경보!! 🚨', 400, 270);
          
          canvasCtx.font = 'bold 18px "Noto Sans KR", Arial, sans-serif';
          canvasCtx.fillStyle = '#ffffff';
          canvasCtx.strokeText('대공 포격 지원이 즉시 실시됩니다!', 400, 330);
          canvasCtx.fillText('대공 포격 지원이 즉시 실시됩니다!', 400, 330);
          
          canvasCtx.restore();
        }
      } else {
        canvasCtx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
        canvasCtx.lineWidth = 2.5;
        canvasCtx.setLineDash([5, 3]);
        
        canvasCtx.beginPath();
        canvasCtx.arc(strike.targetX, strike.targetY, strike.radius, 0, Math.PI * 2);
        canvasCtx.stroke();
        canvasCtx.setLineDash([]);

        canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.05)';
        canvasCtx.beginPath();
        canvasCtx.arc(strike.targetX, strike.targetY, strike.radius, 0, Math.PI * 2);
        canvasCtx.fill();
      }
    });
    canvasCtx.restore();

    // 2. 공중에서 낙하하는 미사일 포탄 그리기
    canvasCtx.save();
    projectiles.forEach((proj) => {
      const curX = proj.startX + (proj.targetX - proj.startX) * proj.progress;
      const curY = proj.startY + (proj.targetY - proj.startY) * proj.progress;

      // 미사일 연소 화염 꼬리선
      canvasCtx.beginPath();
      canvasCtx.moveTo(curX, curY);
      const angle = Math.atan2(proj.targetY - proj.startY, proj.targetX - proj.startX);
      const fireX = curX - Math.cos(angle) * 15;
      const fireY = curY - Math.sin(angle) * 15;
      canvasCtx.lineTo(fireX, fireY);
      canvasCtx.strokeStyle = '#ff9900';
      canvasCtx.lineWidth = 4;
      canvasCtx.stroke();

      // 포탄 몸체 구체 그리기
      canvasCtx.beginPath();
      canvasCtx.arc(curX, curY, 6, 0, Math.PI * 2);
      canvasCtx.fillStyle = '#4b5320'; // 올리브 국방색
      canvasCtx.strokeStyle = '#ff3300';
      canvasCtx.lineWidth = 1.5;
      canvasCtx.fill();
      canvasCtx.stroke();
    });
    canvasCtx.restore();

    // 기절 이펙트 그리기
    if (char.isStunned) {
      canvasCtx.save();
      const numStars = 3;
      const timeFactor = Date.now() / 150;
      canvasCtx.fillStyle = '#ffd700';
      canvasCtx.font = '12px Arial';
      canvasCtx.textAlign = 'center';
      canvasCtx.textBaseline = 'middle';
      for (let idx = 0; idx < numStars; idx++) {
        const starAngle = timeFactor + (idx * Math.PI * 2) / numStars;
        const starX = char.x + Math.cos(starAngle) * (currentRadius + 6);
        const starY = char.y - currentRadius - 10 + Math.sin(starAngle) * 4;
        canvasCtx.fillText('💫', starX, starY);
      }
      canvasCtx.restore();
    }
  }
};
