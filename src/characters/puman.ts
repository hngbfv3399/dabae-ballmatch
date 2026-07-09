import type { CharacterConfig, CharacterState } from './character.interface';

interface VenomProjectile {
  x: number;
  y: number;
  target: CharacterState;
  speed: number;
  isHit: boolean;
}

interface PlantEntity {
  x: number;
  y: number;
  radius: number;
  lifeTime: number; // 일정 시간 안 먹으면 소멸
}

interface PumanState extends CharacterState {
  pumanStacks?: number;
  resetTimer?: number;
  projectiles?: VenomProjectile[];
  pumanPlants?: PlantEntity[];
  plantSpawnTimer?: number;
}

export const pumanConfig: CharacterConfig = {
  id: 'puman',
  name: '푸만',
  maxHp: 145,
  speed: 1.25,
  attackPower: 15,
  baseAttackRange: 45,
  skillName: '독사의 맹독액',
  skillDescription: '4초 쿨타임. 뱀 액티브 스킬로 맹독액을 발사해 맞은 상대에게 3초간 매초 2의 지속 독 대미지를 입힙니다. 패시브: 화면에 랜덤 생성되는 식물(🌱)을 직접 가서 섭취하면 스탯(공격력)이 쌓이고, 타격 시 스탯만큼 추가 대미지 및 체력 회복을 얻습니다. 5초간 식물 미섭취 및 적 미타격 시 스탯이 초기화됩니다.',
  color: '#008000', // 포레스트 그린
  skillChargeRate: 25.0, // 4초 쿨타임
  tier: 'B',
  role: 'Juggernaut',
  detailedDescription: '푸만은 필드에 자라나는 식물(🌱) 자원을 자가 섭취하며 무한하게 몸집을 불리는 성장형 돌격형 전사 캐릭터입니다. 뱀의 맹독 투사체를 날려 적에게 지속 독 대미지를 유발함과 동시에, 식물 섭취 시마다 중첩되는 물리적 스펙 보너스를 적 타격 시 추가 공격력 및 흡혈 회복 효과로 변환하여 끈질긴 장기 소모전에서 극강의 저력을 발휘합니다.',

  onSkillTrigger(char: CharacterState, ctx) {
    // 액티브 사용 즉시 스킬 쿨타임 재충전 시작하도록 제어
    char.skillActive = false;
    char.skillDurationLeft = 0;

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
      
      ctx.addFloatingText(pm.x, pm.y - 65, `💚 +${healAmt} HEAL (식물 효과)`, '#39ff14', 1.5);
      ctx.createParticle(pm.x, pm.y, '#39ff14', 4, 10);
    }

    // 공격 성공 시 5초 타이머 갱신
    pm.resetTimer = 5.0;
  },

  onUpdate(char: CharacterState, dt: number, ctx) {
    const pm = char as PumanState;

    // 변수 초기화
    if (pm.pumanStacks === undefined) pm.pumanStacks = 0;
    if (pm.resetTimer === undefined) pm.resetTimer = 5.0;
    if (pm.projectiles === undefined) pm.projectiles = [];
    if (pm.pumanPlants === undefined) pm.pumanPlants = [];
    if (pm.plantSpawnTimer === undefined) pm.plantSpawnTimer = 2.5; // 2.5초마다 생성 시도

    // 1. 실시간 게임 화면 식물 🌱 스포너 생성
    pm.plantSpawnTimer -= dt;
    if (pm.plantSpawnTimer <= 0) {
      pm.plantSpawnTimer = 2.5;
      if (pm.pumanPlants.length < 6) {
        pm.pumanPlants.push({
          x: 40 + Math.random() * 720,
          y: 40 + Math.random() * 520,
          radius: 10,
          lifeTime: 12.0 // 12초간 안 먹으면 소멸
        });
      }
    }

    // 식물 소멸 타이머 차감
    pm.pumanPlants.forEach((plant) => {
      plant.lifeTime -= dt;
    });
    pm.pumanPlants = pm.pumanPlants.filter((p) => p.lifeTime > 0);

    // 2. 식물 충돌 섭취 판정
    pm.pumanPlants.forEach((plant, idx) => {
      const dist = Math.hypot(pm.x - plant.x, pm.y - plant.y);
      if (dist < pm.radius + plant.radius) {
        // 섭취 완료!
        pm.pumanPlants!.splice(idx, 1);
        
        if (pm.pumanStacks! < 15) {
          pm.pumanStacks! += 1;
          pm.attackPower = 15 + pm.pumanStacks!;
          ctx.addFloatingText(pm.x, pm.y - 50, `🌱 식물 섭취! (+${pm.pumanStacks})`, '#00ff00', 0.9);
          ctx.createParticle(plant.x, plant.y, '#39ff14', 3, 12);
        } else {
          ctx.addFloatingText(pm.x, pm.y - 50, '🌱 스탯 최대 충전!', '#39ff14', 0.9);
        }

        // 식물 섭취 시 5초 타이머 갱신
        pm.resetTimer = 5.0;
      }
    });

    // 3. 5초 식물 미섭취 & 미타격 시 스탯 초기화
    if (pm.pumanStacks > 0) {
      pm.resetTimer -= dt;
      if (pm.resetTimer <= 0) {
        pm.pumanStacks = 0;
        pm.attackPower = 15; // 원래 수치로 원복
        pm.resetTimer = 5.0;
        ctx.addFloatingText(pm.x, pm.y - 55, '💨 스탯 초기화', '#888888', 1.0);
        ctx.createExplosion(pm.x, pm.y, '#888888', 8);
      }
    }

    // 4. 독액 투사체 이동 및 피격 처리
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

        if (Math.random() < 0.4) {
          ctx.createParticle(proj.x, proj.y, '#00ff00', 2, 8);
        }
      }
    });

    pm.projectiles = pm.projectiles.filter((p) => !p.isHit);

    // 5. 전장 독성 상태 틱 대미지 업데이트
    ctx.characters.forEach((enemy) => {
      const target = enemy as any;
      if (target.isDead || !target.isPoisoned || target.poisonTimeLeft === undefined) return;

      target.poisonTimeLeft -= dt;
      target.poisonDamageTimer -= dt;

      if (target.poisonDamageTimer <= 0) {
        target.poisonDamageTimer = 1.0;
        ctx.dealDamage(char, enemy, 2, '🤢 POISON');
        ctx.createExplosion(enemy.x, enemy.y, '#22aa22', 5);
      }

      if (target.poisonTimeLeft <= 0) {
        target.isPoisoned = false;
        ctx.addFloatingText(enemy.x, enemy.y - 45, '🧼 독 해독 완료', '#00ffcc', 1.0);
      }
    });
  },

  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const pm = char as PumanState;
    const projectiles = pm.projectiles || [];
    const plants = pm.pumanPlants || [];

    // 1. 화면의 식물 🌱 그리기
    plants.forEach((plant) => {
      canvasCtx.save();
      // 약간 깜빡이는 이펙트
      const scale = 1.0 + Math.sin(Date.now() / 150) * 0.1;
      canvasCtx.font = `${Math.round(15 * scale)}px sans-serif`;
      canvasCtx.textAlign = 'center';
      canvasCtx.textBaseline = 'middle';
      canvasCtx.fillText('🌱', plant.x, plant.y);
      canvasCtx.restore();
    });

    // 2. 독액 투사체 그리기
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

    // 3. 식물 스택 상태 표시 및 시간 게이지 바
    if (pm.pumanStacks && pm.pumanStacks > 0) {
      canvasCtx.save();
      canvasCtx.fillStyle = '#39ff14';
      canvasCtx.font = 'bold 9px Outfit, sans-serif';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText(`🌱 x${pm.pumanStacks}`, char.x, char.y - currentRadius - 14);

      // 5초 타이머 게이지 시각화
      const timerWidth = currentRadius * 1.5;
      const ratio = Math.max(0, pm.resetTimer || 0) / 5.0;
      canvasCtx.fillStyle = 'rgba(255,255,255,0.2)';
      canvasCtx.fillRect(char.x - timerWidth / 2, char.y - currentRadius - 8, timerWidth, 2.5);
      
      canvasCtx.fillStyle = '#00ff00';
      canvasCtx.fillRect(char.x - timerWidth / 2, char.y - currentRadius - 8, timerWidth * ratio, 2.5);

      canvasCtx.restore();
    }
  }
};
