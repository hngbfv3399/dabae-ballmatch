import type { CharacterConfig, CharacterState } from './character.interface';

interface SeyeonState extends CharacterState {
  charmAuraRadius?: number;
  charmDamageTimer?: number;
}

export const seyeonConfig: CharacterConfig = {
  id: 'seyeon',
  name: '세연',
  maxHp: 130,
  speed: 1.3,
  attackPower: 14,
  baseAttackRange: 45,
  skillName: '치명적인 유혹의 댄스',
  skillDescription: '7초 쿨타임. 4초 동안 매혹의 댄스를 추며 이동 속도가 50% 증가하고 피해 면역 무적 상태가 됩니다. 주변 220px 영역에 매혹 아우라를 전개하여 범위 내 모든 적을 기절(봉쇄)시키고 세연에게로 강렬하게 끌어당깁니다. 아우라 내 적들은 매초 8의 지속 피해를 입고, 받는 모든 피해량이 50% 증폭됩니다.',
  color: '#ff66b2', // 하트 핑크
  skillChargeRate: 14.3, // 7초 쿨타임
  tier: 'S',

  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = 4.0; // 4초 유지

    // 이속 50% 증가 및 무적 부여
    char.speed = 1.3 * 1.5; // 버프 속도 (1.95)
    char.isImmune = true;
    char.immuneTimeLeft = 4.0;

    const sy = char as SeyeonState;
    sy.charmAuraRadius = 220;
    sy.charmDamageTimer = 1.0;

    ctx.addFloatingText(char.x, char.y - 65, '💃 치명적 유혹의 댄스! (무적)', '#ff66b2', 2.0);
    ctx.createExplosion(char.x, char.y, '#ff66b2', 20);
    ctx.logMessage?.(`💃 [유혹의 댄스] 세연 ➡️ 4초간 아우라 전개, 속도 50% 증가 및 피해 무적!`, 'skill');
  },

  onUpdate(char: CharacterState, dt: number, ctx) {
    const sy = char as SeyeonState;

    if (char.skillActive) {
      char.skillDurationLeft -= dt;

      const auraRadius = sy.charmAuraRadius || 220;

      // 1초마다 도트 대미지 틱 관리
      if (sy.charmDamageTimer === undefined) sy.charmDamageTimer = 1.0;
      sy.charmDamageTimer -= dt;
      let dealTick = false;
      if (sy.charmDamageTimer <= 0) {
        sy.charmDamageTimer = 1.0;
        dealTick = true;
      }

      // 범위 내 모든 적 기절, 흡입, 대미지 틱 및 매혹 상태 부여
      ctx.characters.forEach((enemy) => {
        if (enemy.isDead || enemy.id === char.id) return;

        const dx = char.x - enemy.x;
        const dy = char.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= auraRadius) {
          // A. 매혹 및 기절 상태 부여 (움직임 무력화)
          enemy.isCharmed = true;
          enemy.isStunned = true;
          enemy.stunTimeLeft = Math.max(enemy.stunTimeLeft || 0, 0.2);

          // B. 관성 멈춤 및 세연 방향으로 강제 흡입
          enemy.vx = 0;
          enemy.vy = 0;
          if (dist > 15) {
            const pullSpeed = 4.5;
            const angle = Math.atan2(dy, dx);
            enemy.x += Math.cos(angle) * pullSpeed * (dt * 60);
            enemy.y += Math.sin(angle) * pullSpeed * (dt * 60);
          }

          // C. 1초마다 매초 8의 피해 (피해 50% 증폭에 의해 실질 12 적용)
          if (dealTick) {
            ctx.dealDamage(char, enemy, 8, '💖 LOVE TICK');
            ctx.createExplosion(enemy.x, enemy.y, '#ff66b2', 4);
          }

          // 매혹 하트 입자 방출
          if (Math.random() < 0.2) {
            ctx.createParticle(enemy.x, enemy.y, '#ff66b2', 2.5, 12);
          }
        }
      });

      // 세연 주변에 휘몰아치는 하트 소용돌이 파티클 연출
      if (Math.random() < 0.6) {
        const randAngle = Math.random() * Math.PI * 2;
        const dist = Math.random() * auraRadius;
        const px = char.x + Math.cos(randAngle) * dist;
        const py = char.y + Math.sin(randAngle) * dist;
        ctx.createParticle(px, py, '#ff66b2', 2, 15);
      }

      // 스킬 지속 종료 복구
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        char.speed = 1.3; // 일반 이속 복귀
        char.isImmune = false;
        char.immuneTimeLeft = 0;

        // 범위 내 모든 적 매혹 및 스턴 해제
        ctx.characters.forEach((enemy) => {
          if (enemy.id !== char.id) {
            enemy.isCharmed = false;
          }
        });

        ctx.createExplosion(char.x, char.y, '#ff66b2', 15);
        ctx.addFloatingText(char.x, char.y - 45, '💨 댄스 종료', '#888888', 1.2);
        ctx.logMessage?.(`💃 [유혹의 댄스 만료] 세연 ➡️ 일반 상태 복귀 및 주변 매혹 해제`, 'skill');
      }
    }
  },

  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const sy = char as SeyeonState;

    // 1. 매혹의 댄스 아우라 영역 렌더링
    if (char.skillActive) {
      const radius = sy.charmAuraRadius || 220;
      canvasCtx.save();
      
      // 분홍색 그라데이션 영역 표시
      const grad = canvasCtx.createRadialGradient(char.x, char.y, currentRadius, char.x, char.y, radius);
      grad.addColorStop(0, 'rgba(255, 102, 178, 0.25)');
      grad.addColorStop(0.5, 'rgba(255, 102, 178, 0.1)');
      grad.addColorStop(1, 'rgba(255, 102, 178, 0)');
      
      canvasCtx.fillStyle = grad;
      canvasCtx.beginPath();
      canvasCtx.arc(char.x, char.y, radius, 0, Math.PI * 2);
      canvasCtx.fill();

      // 외부 경계선 브러싱
      canvasCtx.strokeStyle = 'rgba(255, 102, 178, 0.45)';
      canvasCtx.lineWidth = 1.5;
      canvasCtx.setLineDash([4, 4]);
      canvasCtx.beginPath();
      canvasCtx.arc(char.x, char.y, radius, 0, Math.PI * 2);
      canvasCtx.stroke();

      canvasCtx.restore();
    }

    // 2. 머리 위 장식 하트 연출 (스킬 켜졌을 땐 큰 춤추는 하트)
    canvasCtx.save();
    canvasCtx.fillStyle = '#ff66b2';
    canvasCtx.shadowBlur = 8;
    canvasCtx.shadowColor = '#ff66b2';
    
    if (char.skillActive) {
      canvasCtx.font = '16px sans-serif';
      const bounce = Math.sin(Date.now() / 80) * 4;
      canvasCtx.fillText('💃💝', char.x - 12, char.y - currentRadius - 12 + bounce);
    } else {
      canvasCtx.font = '10px Outfit, sans-serif';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText('💝', char.x, char.y - currentRadius - 6);
    }
    canvasCtx.restore();
  }
};
