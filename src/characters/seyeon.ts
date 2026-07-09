import type { CharacterConfig, CharacterState } from './character.interface';

interface HeartProjectile {
  x: number;
  y: number;
  target: CharacterState;
  speed: number;
  isHit: boolean;
}

export const seyeonConfig: CharacterConfig = {
  id: 'seyeon',
  name: '세연',
  maxHp: 130,
  speed: 1.3,
  attackPower: 9,
  baseAttackRange: 45,
  skillName: '매혹의 윙크',
  skillDescription: '3초 쿨타임. 가장 가까운 상대를 향해 매혹의 하트를 날려 명중시킵니다. 하트에 닿은 상대는 6초간 [매혹]되어 스킬이 봉쇄되고 공격 대상에서 세연이를 배제하며, 다른 상대를 조종당하듯 추격합니다. 매혹 기간 동안 상대와 세연이는 서로에게 가하는 피해량이 0이 됩니다.',
  color: '#ff66b2', // 하트 핑크
  skillChargeRate: 33.3, // 3초 쿨타임
  tier: 'A',

  onSkillTrigger(char: CharacterState, ctx) {
    // 가장 가까운 적 조준
    let closestEnemy: CharacterState | null = null;
    let minDist = Infinity;

    ctx.characters.forEach((enemy) => {
      if (enemy.isDead || enemy.id === char.id) return;
      const dist = Math.hypot(enemy.x - char.x, enemy.y - char.y);
      if (dist < minDist) {
        minDist = dist;
        closestEnemy = enemy;
      }
    });

    if (closestEnemy) {
      char.skillActive = true;
      char.skillDurationLeft = 999; // 쿨다운 충전 차단
      const projectiles = ((char as any).projectiles || []) as HeartProjectile[];
      projectiles.push({
        x: char.x,
        y: char.y,
        target: closestEnemy,
        speed: 7.5,
        isHit: false
      });
      (char as any).projectiles = projectiles;

      ctx.addFloatingText(char.x, char.y - 50, '💖 윙크~', '#ff66b2', 1.2);
      ctx.createExplosion(char.x, char.y, '#ff66b2', 10);
    }
  },

  onUpdate(char: CharacterState, dt: number, ctx) {
    const projectiles = ((char as any).projectiles || []) as HeartProjectile[];

    // 1. 하트 투사체 비행 및 피격 판정
    projectiles.forEach((proj) => {
      if (proj.target.isDead) {
        proj.isHit = true; // 타겟 사망 시 소멸
        return;
      }

      const dx = proj.target.x - proj.x;
      const dy = proj.target.y - proj.y;
      const dist = Math.hypot(dx, dy);

      if (dist < proj.target.radius + 8) {
        // 매혹 적중!
        proj.isHit = true;
        
        const target = proj.target;
        target.isCharmed = true;
        target.charmTimeLeft = 6.0;
        target.skillGauge = 0; // 스킬 게이지 초기화
        target.skillActive = false;
        target.skillDurationLeft = 0;

        ctx.addFloatingText(target.x, target.y - 65, '💖 CHARMED!', '#ff66b2', 2.0);
        ctx.createExplosion(target.x, target.y, '#ff66b2', 20);
        ctx.logMessage?.(`💖 [매혹 명중] 세연 ➡️ ${target.name} | 6초간 매혹 (서로 대미지 0, 세연 타겟 해제)`, 'skill');
      } else {
        // 타겟 유도 이동
        const angle = Math.atan2(dy, dx);
        proj.x += Math.cos(angle) * proj.speed * dt * 60;
        proj.y += Math.sin(angle) * proj.speed * dt * 60;

        // 하트 핑크 꼬리 파티클
        if (Math.random() < 0.3) {
          ctx.createParticle(proj.x, proj.y, '#ff66b2', 2.5, 8);
        }
      }
    });

    (char as any).projectiles = projectiles.filter((p) => !p.isHit);

    // 2. 전체 매혹 상태 대상자 조종 및 타이머 업데이트
    ctx.characters.forEach((enemy) => {
      if (enemy.isDead || !enemy.isCharmed || enemy.charmTimeLeft === undefined) return;

      enemy.charmTimeLeft -= dt;
      if (enemy.charmTimeLeft <= 0) {
        enemy.isCharmed = false;
        ctx.addFloatingText(enemy.x, enemy.y - 45, '💔 매혹 해제', '#888888', 1.2);
        ctx.logMessage?.(`💔 [매혹 만료] ${enemy.name}의 매혹 상태가 만료되었습니다.`, 'skill');
      } else {
        // 매혹 하트 파티클
        if (Math.random() < 0.15) {
          ctx.createParticle(enemy.x, enemy.y + (Math.random() - 0.5) * 20, '#ff66b2', 3, 10);
        }

        // 인공지능 조종: 매혹 대상자가 세연(char)을 향해 쫓아오도록 조종 (맹목적 사랑)
        const angle = Math.atan2(char.y - enemy.y, char.x - enemy.x);
        const speedVal = 3.5 * enemy.speed;
        
        // 부드럽게 세연 쪽으로 가속 벡터 병합
        enemy.vx = enemy.vx * 0.92 + Math.cos(angle) * speedVal * 0.08;
        enemy.vy = enemy.vy * 0.92 + Math.sin(angle) * speedVal * 0.08;
      }
    });

    // 3. 세연의 스킬 상태 제어 (매혹이 모두 끝날 때까지 쿨타임 충전 대기)
    const activeHearts = (char as any).projectiles || [];
    const hasCharmedEnemy = ctx.characters.some((enemy) => enemy.isCharmed && !enemy.isDead);

    if (activeHearts.length > 0 || hasCharmedEnemy) {
      char.skillActive = true;
      char.skillDurationLeft = 1.0; // 충전 정지 유지
    } else {
      char.skillActive = false;
      char.skillDurationLeft = 0; // 충전 개재
    }
  },

  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const projectiles = ((char as any).projectiles || []) as HeartProjectile[];

    // 1. 하트 비주얼 그리기
    projectiles.forEach((proj) => {
      canvasCtx.save();
      canvasCtx.fillStyle = '#ff66b2';
      canvasCtx.shadowBlur = 10;
      canvasCtx.shadowColor = '#ff66b2';
      
      // 하트 그리기 폰트 활용
      canvasCtx.font = '18px sans-serif';
      canvasCtx.textAlign = 'center';
      canvasCtx.textBaseline = 'middle';
      canvasCtx.fillText('💖', proj.x, proj.y);
      canvasCtx.restore();
    });

    // 2. 머리 위 하트 장식
    canvasCtx.save();
    canvasCtx.fillStyle = '#ff66b2';
    canvasCtx.font = '10px Outfit, sans-serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText('💝', char.x, char.y - currentRadius - 6);
    canvasCtx.restore();
  }
};
