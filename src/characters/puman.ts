import type { CharacterConfig, CharacterState } from './character.interface';

interface VenomProjectile {
  x: number;
  y: number;
  target: CharacterState;
  speed: number;
  isHit: boolean;
}

interface PumanState extends CharacterState {
  pumanStacks?: number;
  plantTimer?: number;
  resetTimer?: number;
  projectiles?: VenomProjectile[];
}

export const pumanConfig: CharacterConfig = {
  id: 'puman',
  name: '푸만',
  maxHp: 145,
  speed: 1.25,
  attackPower: 9,
  baseAttackRange: 45,
  skillName: '독사의 맹독액',
  skillDescription: '4초 쿨타임. 뱀 액티브 스킬로 맹독액을 발사해 맞은 상대에게 3초간 매초 2의 지속 독 대미지를 입힙니다. 패시브: 1.5초마다 식물을 섭취해 스탯(공격력)을 쌓고, 공격 성공 시 스탯만큼 추가 대미지를 입히며 그만큼 자신의 체력을 회복합니다. 3.5초간 타격이 없으면 쌓인 스탯이 완전히 초기화됩니다.',
  color: '#008000', // 포레스트 그린
  skillChargeRate: 25.0, // 4초 쿨타임
  tier: 'B',

  onSkillTrigger(char: CharacterState, ctx) {
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
      const pm = char as PumanState;
      const projectiles = pm.projectiles || [];
      projectiles.push({
        x: char.x,
        y: char.y,
        target: closestEnemy,
        speed: 8.5,
        isHit: false
      });
      pm.projectiles = projectiles;

      ctx.addFloatingText(char.x, char.y - 50, '🐍 쉭! 맹독 분사!', '#00ff00', 1.2);
      ctx.createExplosion(char.x, char.y, '#00ff00', 10);
    }
  },

  onBasicAttack(char: CharacterState, _opponent: CharacterState, ctx) {
    const pm = char as PumanState;
    if (pm.pumanStacks && pm.pumanStacks > 0) {
      // 스탯만큼 추가 회복
      const healAmt = pm.pumanStacks;
      pm.hp = Math.min(pm.maxHp, pm.hp + healAmt);
      
      ctx.addFloatingText(pm.x, pm.y - 65, `💚 +${healAmt} HEAL (식물 섭취)`, '#39ff14', 1.5);
      ctx.createParticle(pm.x, pm.y, '#39ff14', 4, 10);
    }

    // 콤보 리셋 타이머 갱신 (3.5초)
    pm.resetTimer = 3.5;
  },

  onUpdate(char: CharacterState, dt: number, ctx) {
    const pm = char as PumanState;

    // 변수 초기화
    if (pm.pumanStacks === undefined) pm.pumanStacks = 0;
    if (pm.plantTimer === undefined) pm.plantTimer = 1.5;
    if (pm.resetTimer === undefined) pm.resetTimer = 0;
    if (pm.projectiles === undefined) pm.projectiles = [];

    // 1. 패시브: 1.5초마다 식물 성장 및 섭취
    pm.plantTimer -= dt;
    if (pm.plantTimer <= 0) {
      pm.plantTimer = 1.5;
      if (pm.pumanStacks < 15) { // 스택 최대치 제한 (밸런스 조절)
        pm.pumanStacks += 1;
        pm.attackPower = 9 + pm.pumanStacks; // 공격력 증가
        ctx.addFloatingText(pm.x, pm.y - 50, `🌱 스탯 +1 (${pm.pumanStacks})`, '#00ff00', 0.8);
        ctx.createParticle(pm.x, pm.y + 15, '#00ff00', 2, 6);
      }
    }

    // 2. 패시브: 3.5초 미타격 시 스탯 초기화
    if (pm.pumanStacks > 0) {
      pm.resetTimer -= dt;
      if (pm.resetTimer <= 0) {
        pm.pumanStacks = 0;
        pm.attackPower = 9; // 원복
        ctx.addFloatingText(pm.x, pm.y - 50, '💨 스탯 초기화', '#888888', 1.0);
        ctx.createExplosion(pm.x, pm.y, '#888888', 8);
      }
    }

    // 3. 독액 투사체 이동 및 피격 처리
    pm.projectiles.forEach((proj) => {
      if (proj.target.isDead) {
        proj.isHit = true;
        return;
      }

      const dx = proj.target.x - proj.x;
      const dy = proj.target.y - proj.y;
      const dist = Math.hypot(dx, dy);

      if (dist < proj.target.radius + 8) {
        proj.isHit = true;
        
        const target = proj.target;
        (target as any).isPoisoned = true;
        (target as any).poisonTimeLeft = 3.0;
        (target as any).poisonDamageTimer = 1.0;

        ctx.addFloatingText(target.x, target.y - 65, '🤢 맹독 중독!', '#00ff00', 1.8);
        ctx.createExplosion(target.x, target.y, '#00ff00', 15);
        ctx.logMessage?.(`🤢 [독액 피격] 푸만 ➡️ ${target.name} | 3초간 지속 독성 대미지 (매초 2)`, 'skill');
      } else {
        const angle = Math.atan2(dy, dx);
        proj.x += Math.cos(angle) * proj.speed * dt * 60;
        proj.y += Math.sin(angle) * proj.speed * dt * 60;

        // 초록색 맹독 꼬리 파티클
        if (Math.random() < 0.4) {
          ctx.createParticle(proj.x, proj.y, '#00ff00', 2, 8);
        }
      }
    });

    pm.projectiles = pm.projectiles.filter((p) => !p.isHit);

    // 4. 전장 독성 상태 틱 대미지 업데이트
    ctx.characters.forEach((enemy) => {
      const target = enemy as any;
      if (target.isDead || !target.isPoisoned || target.poisonTimeLeft === undefined) return;

      target.poisonTimeLeft -= dt;
      target.poisonDamageTimer -= dt;

      // 1초마다 독 대미지 적용
      if (target.poisonDamageTimer <= 0) {
        target.poisonDamageTimer = 1.0;
        ctx.dealDamage(char, enemy, 2, '🤢 POISON');
        ctx.createExplosion(enemy.x, enemy.y, '#22aa22', 5);
      }

      // 독 해제
      if (target.poisonTimeLeft <= 0) {
        target.isPoisoned = false;
        ctx.addFloatingText(enemy.x, enemy.y - 45, '🧼 독 해독 완료', '#00ffcc', 1.0);
      }
    });
  },

  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const pm = char as PumanState;
    const projectiles = pm.projectiles || [];

    // 독액 비주얼
    projectiles.forEach((proj) => {
      canvasCtx.save();
      canvasCtx.fillStyle = '#00ff00';
      canvasCtx.shadowBlur = 8;
      canvasCtx.shadowColor = '#00ff00';
      canvasCtx.beginPath();
      canvasCtx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
      canvasCtx.fill();
      canvasCtx.restore();
    });

    // 식물 스택 상태 표시 🌱
    if (pm.pumanStacks && pm.pumanStacks > 0) {
      canvasCtx.save();
      canvasCtx.fillStyle = '#39ff14';
      canvasCtx.font = 'bold 9px Outfit, sans-serif';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText(`🌱 x${pm.pumanStacks}`, char.x, char.y - currentRadius - 6);
      canvasCtx.restore();
    }
  }
};
