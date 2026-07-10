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
}

interface PumanState extends CharacterState {
  pumanStacks?: number;
  projectiles?: VenomProjectile[];
  pumanPlants?: PlantEntity[];
  plantSpawnTimer?: number;
}

const SKILL_CONSTANTS = {
  COOLDOWN: 4,
  POISON_DURATION: 3.0,
  POISON_DPS: 4,
  MAX_STACKS: 15,
  BASE_ATK: 15,
  PLANT_SPAWN_INTERVAL: 1.5,
  MAX_PLANTS: 6,
  ATK_PER_STACK: 6,             // 식물 1개당 공격력 상승량 (5~8 사이)
  HEAL_ON_EAT: 6,               // 식물 섭취 시 즉시 회복량 (5~8 사이)
};

export const pumanConfig: CharacterConfig = {
  id: 'puman',
  name: '푸만',
  maxHp: 145,
  speed: 1.25,
  attackPower: SKILL_CONSTANTS.BASE_ATK,
  baseAttackRange: 45,
  skillName: '독사의 맹독액',
  skillDescription: `${SKILL_CONSTANTS.COOLDOWN}초 쿨타임. 뽀 액티브 스킬로 맹독액을 발사해 맞은 상대에게 ${SKILL_CONSTANTS.POISON_DURATION}초간 매초 ${SKILL_CONSTANTS.POISON_DPS}의 지속 독 대미지를 입힙니다. 패시브: 화면에 랜덤 생성되는 식물(🌱)을 직접 가서 섭취하면 공격력 +${SKILL_CONSTANTS.ATK_PER_STACK} 스택(최대 ${SKILL_CONSTANTS.MAX_STACKS}회)과 ${SKILL_CONSTANTS.HEAL_ON_EAT} 만큼의 즉시 체력 회복을 얻습니다. 상대방이 식물과 접촉하면 식물이 소멸하며 푸만의 현재 스택x${SKILL_CONSTANTS.ATK_PER_STACK} 만큼의 피해를 입힙니다. 기본 공격 적중 시 보유한 모든 스택을 소모하여 소모한 스택x${SKILL_CONSTANTS.HEAL_ON_EAT} 만큼 체력을 회복하고 공격력이 기본값으로 초기화됩니다.`,
  color: '#008000', // 포레스트 그린
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN,
  tier: 'B',
  role: 'Juggernaut',
  detailedDescription: `푸만은 필드에 자라나는 식물(🌱) 자원을 자가 섭취하며 스택을 무한히 쌓아올리는 성장형 돌격형 전사 캐릭터입니다. 뽀의 맹독 투사체를 날려 적에게 매초 ${SKILL_CONSTANTS.POISON_DPS}의 지속 독 대미지를 유발함과 동시에, 식물 섭취 시 ${SKILL_CONSTANTS.HEAL_ON_EAT} 회복 및 기본 공격 적중 시 소모한 스택x${SKILL_CONSTANTS.HEAL_ON_EAT} 체력 회복을 통해 초반 라인전 유지력을 보완합니다. 또한 식물이 상대방에게 밟힐 경우 스택x${SKILL_CONSTANTS.ATK_PER_STACK} 만큼의 트랩 피해를 선사합니다.`,

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
      // 보유한 모든 스택 소모 후 소모한 수 * HEAL_ON_EAT 만큼 체력 회복
      const consumedStacks = pm.pumanStacks;
      const healAmt = consumedStacks * SKILL_CONSTANTS.HEAL_ON_EAT;
      pm.hp = Math.min(pm.maxHp, pm.hp + healAmt);
      
      ctx.addFloatingText(pm.x, pm.y - 65, `💚 +${healAmt} HEAL (식물 ${consumedStacks}스택 소모)`, '#39ff14', 1.5);
      ctx.createParticle(pm.x, pm.y, '#39ff14', 4, 10);
      console.log(`🌱 [스택 소모] 푸만 -> ${consumedStacks}스택 소모, ${healAmt} 체력 회복, 공격력 초기화`);
      ctx.logMessage?.(`🌱 [스택 소모] 푸만 ➡️ ${consumedStacks}스택 소모 → ${healAmt} 회복, 공격력 초기화`, 'skill');

      // 스택 초기화 및 공격력 기본값 복구
      pm.pumanStacks = 0;
      pm.attackPower = SKILL_CONSTANTS.BASE_ATK;
    }
  },

  onUpdate(char: CharacterState, dt: number, ctx) {
    const pm = char as PumanState;

    // 변수 초기화
    if (pm.pumanStacks === undefined) pm.pumanStacks = 0;
    if (pm.projectiles === undefined) pm.projectiles = [];
    if (pm.pumanPlants === undefined) pm.pumanPlants = [];
    if (pm.plantSpawnTimer === undefined) pm.plantSpawnTimer = SKILL_CONSTANTS.PLANT_SPAWN_INTERVAL;

    // 1. 실시간 게임 화면 식물 🌱 스포너 생성
    pm.plantSpawnTimer -= dt;
    if (pm.plantSpawnTimer <= 0) {
      pm.plantSpawnTimer = SKILL_CONSTANTS.PLANT_SPAWN_INTERVAL;
      if (pm.pumanPlants.length < SKILL_CONSTANTS.MAX_PLANTS) {
        pm.pumanPlants.push({
          x: 40 + Math.random() * 720,
          y: 40 + Math.random() * 520,
          radius: 10
        });
      }
    }

    // 2. 식물 충돌 판정 (푸만 섭취 혹은 상대방 접촉)
    const plantsToKeep: PlantEntity[] = [];
    pm.pumanPlants.forEach((plant) => {
      // 푸만과의 충돌 검사
      const distToPuman = Math.hypot(pm.x - plant.x, pm.y - plant.y);
      if (distToPuman < pm.radius + plant.radius) {
        // 푸만이 먹은 경우
        if (pm.pumanStacks! < SKILL_CONSTANTS.MAX_STACKS) {
          pm.pumanStacks! += 1;
          pm.attackPower = SKILL_CONSTANTS.BASE_ATK + pm.pumanStacks! * SKILL_CONSTANTS.ATK_PER_STACK;
        }
        
        // 섭취 시 HEAL_ON_EAT만큼 즉시 회복 (초반 체력 관리)
        const healAmt = SKILL_CONSTANTS.HEAL_ON_EAT;
        pm.hp = Math.min(pm.maxHp, pm.hp + healAmt);

        ctx.addFloatingText(pm.x, pm.y - 50, `🌱 섭취 (+1스택, +${healAmt} HP)`, '#00ff00', 0.9);
        ctx.createParticle(plant.x, plant.y, '#39ff14', 3, 12);
        console.log(`🌱 [식물 섭취] 푸만 -> 스택: ${pm.pumanStacks}, 체력 ${healAmt} 회복`);
        return; // 제거됨
      }

      // 상대방들과의 충돌 검사
      let hitEnemy: CharacterState | null = null;
      for (const enemy of ctx.characters) {
        if (enemy.isDead || enemy.id === pm.id) continue;
        const distToEnemy = Math.hypot(enemy.x - plant.x, enemy.y - plant.y);
        if (distToEnemy < enemy.radius + plant.radius) {
          hitEnemy = enemy;
          break;
        }
      }

      if (hitEnemy) {
        // 적이 접촉했을 경우: 사라지며 스택 * ATK_PER_STACK 피해
        const dmg = pm.pumanStacks! * SKILL_CONSTANTS.ATK_PER_STACK;
        if (dmg > 0) {
          ctx.dealDamage(pm, hitEnemy, dmg, '🌱 식물 가시!');
          ctx.createExplosion(plant.x, plant.y, '#22aa22', 8);
          console.log(`💥 [식물 밟음] ${hitEnemy.name} -> 푸만 식물 접촉, ${dmg} 피해 받음`);
          ctx.logMessage?.(`💥 [식물 밟음] ${hitEnemy.name} ➡️ 푸만 식물 접촉, ${dmg} 피해 받음`, 'damage');
        } else {
          ctx.createExplosion(plant.x, plant.y, '#888888', 4);
        }
        ctx.addFloatingText(plant.x, plant.y - 20, '💥 식물 밟음!', '#ff3300', 1.0);
        return; // 제거됨
      }

      plantsToKeep.push(plant);
    });
    pm.pumanPlants = plantsToKeep;


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
        ctx.logMessage?.(`🤢 [독액 피격] 푸만 ➡️ ${target.name} | ${SKILL_CONSTANTS.POISON_DURATION}초간 지속 독성 대미지 (매초 ${SKILL_CONSTANTS.POISON_DPS})`, 'skill');
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
        ctx.dealDamage(char, enemy, SKILL_CONSTANTS.POISON_DPS, '🤢 POISON');
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

    // 3. 식물 스택 상태 표시
    if (pm.pumanStacks && pm.pumanStacks > 0) {
      canvasCtx.save();
      canvasCtx.fillStyle = '#39ff14';
      canvasCtx.font = 'bold 9px Outfit, sans-serif';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText(`🌱 x${pm.pumanStacks}`, char.x, char.y - currentRadius - 14);
      canvasCtx.restore();
    }
  }
};
