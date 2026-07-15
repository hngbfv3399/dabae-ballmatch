import type { CharacterConfig, CharacterState } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface LaserBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  isPlasma?: boolean; // Distinguish heavy railgun plasma ball from handgun bullet
}

interface SungjaeState extends CharacterState {
  mechaHp?: number;
  pilotHp?: number;
  isMechaDestroyed?: boolean;
  
  // Mecha basic attack rotating angle
  mechaAtkAngle?: number;

  // Railgun state
  railgunActive?: boolean;
  railgunAngle?: number;
  railgunTimer?: number;
  railgunRotationDirection?: number; // 1 for clockwise, -1 for counter-clockwise
  
  // Barrage firing state
  railgunFiringActive?: boolean;
  railgunFireTimer?: number;
  railgunFireInterval?: number;
  railgunFireAngle?: number;
  
  // Pilot weapon state
  bullets?: LaserBullet[];
  pilotFastFireActive?: boolean;
  pilotFastFireTimer?: number;
  pilotFastFireInterval?: number;
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  COOLDOWN: 7,               // 7 seconds
  MECHA_MAX_HP: 150,         // Set to 150 as requested
  PILOT_MAX_HP: 40,          // Reduced from 60
  
  // Mecha parameters
  MECHA_RADIUS: 42,
  MECHA_ATK: 12,             // Reduced from 18
  MECHA_RANGE: 100,          // Increased from 70 to 100
  MECHA_SWEEP_ANGLE: 180,    // Increased from 160 to 180 (Full half-circle)
  MECHA_ATK_ROTATION_SPEED: 7.2, // ~412 degrees per second, makes it spin nicely
  
  // Pilot parameters
  PILOT_RADIUS: 26,
  PILOT_ATK: 5,              // Reduced from 6
  PILOT_RANGE: 280,
  BULLET_SPEED: 12,
  
  // Railgun Warning phase
  RAILGUN_ROTATION_SPEED: 4.8, // rad per second
  RAILGUN_CHARGE_TIME: 1.2,   // 1.2s warning before firing
  
  // Railgun Barrage firing phase
  RAILGUN_FIRE_DURATION: 2.5,  // fire for 2.5s
  RAILGUN_FIRE_INTERVAL: 0.12, // shoot every 0.12s
  RAILGUN_FIRE_DMG: 6,         // Reduced from 9
  PLASMABALL_SPEED: 14.5,
  RAILGUN_WIDTH: 24,
  
  // Mecha Eject explosion
  EJECT_EXPLOSION_RADIUS: 180,
  EJECT_EXPLOSION_DAMAGE: 15,  // Reduced from 20
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region HELPERS
// ═══════════════════════════════════════════
function isSameTeam(source: CharacterState, target: CharacterState): boolean {
  return source.teamId !== undefined && source.teamId === target.teamId;
}
// #endregion HELPERS

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const sungjaeConfig: CharacterConfig = {
  id: 'sungjae',
  name: '성재',
  maxHp: SKILL_CONSTANTS.MECHA_MAX_HP + SKILL_CONSTANTS.PILOT_MAX_HP, // Visual representation
  speed: 1.15,
  attackPower: 0, // Set to 0 to prevent engine-level automatic contact damage!
  defense: 20,
  baseAttackRange: SKILL_CONSTANTS.MECHA_RANGE,
  skillName: '회전식 전술 레일건 (Rotating Railgun)',
  skillDescription: `${SKILL_CONSTANTS.COOLDOWN}초 쿨타임. 1단계 건담 탑승 중에는 주위에 전술 조준선을 1.2초간 회전시키다 궤적 방향으로 2.5초간 매 0.12초마다 플라즈마 탄환(각 ${SKILL_CONSTANTS.RAILGUN_FIRE_DMG} 대미지)을 연사합니다. 연사 중에는 자유롭게 무빙이 가능합니다. 패시브: 메카 탑승 중에는 근거리 칼날 베기 공격을 가하며 넉백을 덜 받습니다. 메카 HP가 0이 되면 대폭발을 유발하며 성재 본체(이속 상승, 극도로 취약한 넉백 저항)가 사출되며, 이 상태에서는 원거리 딱총 연사 평타로 전환됩니다.`,
  color: '#4169e1', // 로열 블루 (건담 도색색)
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN,
  tier: 'S',
  role: 'Juggernaut',
  detailedDescription: '성재는 강력한 2페이즈 전투 방식을 보유한 건담 탑승 파이터형 캐릭터입니다. 메카 상태의 우월한 피격 면역과 강력한 광역 레일건 폭발을 통해 진영을 무너뜨리며, 메카가 파괴되더라도 주위에 최후의 자폭 폭발을 먹이고 파일럿 성재가 튀어나와 원거리에서 기만적인 연사를 날려 최후의 역전을 만들어냅니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — activate rotating railgun charge or dodge roll
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    const ss = char as SungjaeState;

    if (!ss.isMechaDestroyed) {
      // Mecha active: Trigger rotating railgun charge
      ss.railgunActive = true;
      ss.railgunTimer = SKILL_CONSTANTS.RAILGUN_CHARGE_TIME;
      
      // Choose random rotation direction (clockwise/counter-clockwise)
      ss.railgunRotationDirection = Math.random() < 0.5 ? 1 : -1;

      // Determine dynamic start angle (Target closest enemy, fall back to velocity angle or random)
      let initialAngle = Math.random() * Math.PI * 2;
      
      // Try movement direction
      if (Math.hypot(ss.vx, ss.vy) > 0.1) {
        initialAngle = Math.atan2(ss.vy, ss.vx);
      }

      // Try closest enemy direction
      let closestEnemy: CharacterState | null = null;
      let minDistance = Infinity;
      for (const enemy of ctx.characters) {
        if (enemy.isDead || enemy.id === ss.id) continue;
        const dist = Math.hypot(enemy.x - ss.x, enemy.y - ss.y);
        if (dist < minDistance) {
          minDistance = dist;
          closestEnemy = enemy;
        }
      }

      if (closestEnemy) {
        initialAngle = Math.atan2(closestEnemy.y - ss.y, closestEnemy.x - ss.x);
      }

      ss.railgunAngle = initialAngle;
      
      // Stop moving while charging (rotating laser setup)
      ss.vx = 0;
      ss.vy = 0;

      ctx.addFloatingText(char.x, char.y - 60, '🔋 레일건 에너지 충전!', '#4169e1', 1.5);
      console.log(`🤖 [레일건 충전] 성재 -> 조준선 가동 시작 (초기각도: ${Math.round(initialAngle * (180 / Math.PI))}도, 방향: ${ss.railgunRotationDirection > 0 ? '시계' : '반시계'})`);
    } else {
      // Pilot active: Fast Handgun Firing (No charge warning, instant lock-on spray)
      ss.pilotFastFireActive = true;
      ss.pilotFastFireTimer = 1.8; // Duration: 1.8 seconds
      ss.pilotFastFireInterval = 0; // Trigger first shot immediately

      ctx.addFloatingText(char.x, char.y - 45, '🔥 고속 권총 난사!', '#ffd700', 1.5);
      console.log(`🏃‍♂️ [파일럿 스킬] 성재 -> 대기 시간 없이 즉시 1.8초간 권총 고속 난사 시작!`);
      
      char.skillActive = false;
      char.skillDurationLeft = 0;
    }
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — railgun rotations, bullet ticks, health initialization
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    const ss = char as SungjaeState;

    // Initialize custom HP values on spawn
    if (ss.mechaHp === undefined) {
      ss.mechaHp = SKILL_CONSTANTS.MECHA_MAX_HP;
      ss.pilotHp = SKILL_CONSTANTS.PILOT_MAX_HP;
      ss.isMechaDestroyed = false;
      ss.bullets = [];
      ss.radius = SKILL_CONSTANTS.MECHA_RADIUS;
      ss.hp = SKILL_CONSTANTS.MECHA_MAX_HP + SKILL_CONSTANTS.PILOT_MAX_HP;
      char.attackPower = 0; // Force 0 attackPower to prevent contact damage from engine!
      char.baseAttackRange = SKILL_CONSTANTS.MECHA_RANGE; // Reset to mecha range
    }

    // 1. Process Rotating Railgun charge
    if (ss.railgunActive && ss.railgunTimer !== undefined && ss.railgunAngle !== undefined) {
      ss.railgunTimer -= dt;
      ss.vx = 0; // Lock positions during charge
      ss.vy = 0;

      // Rotate targeting line (apply randomized direction clockwise or counter-clockwise)
      const rotDir = ss.railgunRotationDirection ?? 1;
      ss.railgunAngle += rotDir * SKILL_CONSTANTS.RAILGUN_ROTATION_SPEED * dt * 60 * (Math.PI / 180);

      // Flash charging particles
      if (Math.random() < 0.4) {
        ctx.createParticle(ss.x, ss.y, '#00ffff', 2, 6);
      }

      if (ss.railgunTimer <= 0) {
        ss.railgunActive = false;
        ss.railgunTimer = 0;

        // Start Barrage Firing (2.5 seconds energy plasma burst)
        ss.railgunFiringActive = true;
        ss.railgunFireTimer = SKILL_CONSTANTS.RAILGUN_FIRE_DURATION;
        ss.railgunFireInterval = 0; // Fire first shot immediately
        ss.railgunFireAngle = ss.railgunAngle; // Lock fire direction

        console.log(`💥 [레일건 조준 완료] 성재 -> 각도 ${Math.round(ss.railgunFireAngle * (180 / Math.PI))}도 방향으로 플라즈마 에너지 연사 개시!`);
        ctx.addFloatingText(ss.x, ss.y - 65, '⚡ BARRAGE FIRE!', '#00ffff', 1.8);
        ctx.createExplosion(ss.x, ss.y, '#00bfff', 18);

        // Turn off general skill active flag (allow cooldown to start running)
        char.skillActive = false;
        char.skillDurationLeft = 0;

        // Restore player movement immediately (can move freely while firing)
        const kickAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * ss.speed;
        ss.vx = Math.cos(kickAngle) * baseSpeed;
        ss.vy = Math.sin(kickAngle) * baseSpeed;
      }
    }

    // 1-2. Process Barrage Firing (2.5s duration)
    if (ss.railgunFiringActive && ss.railgunFireTimer !== undefined && ss.railgunFireAngle !== undefined) {
      ss.railgunFireTimer -= dt;
      
      if (ss.railgunFireInterval === undefined) ss.railgunFireInterval = 0;
      ss.railgunFireInterval -= dt;
      
      if (ss.railgunFireInterval <= 0) {
        ss.railgunFireInterval = SKILL_CONSTANTS.RAILGUN_FIRE_INTERVAL; // 0.12초 간격
        
        const cos = Math.cos(ss.railgunFireAngle);
        const sin = Math.sin(ss.railgunFireAngle);
        
        // Spawn plasma bullet at the edge of Mecha radius
        const currentRadius = ss.radius || SKILL_CONSTANTS.MECHA_RADIUS;
        const spawnX = ss.x + cos * currentRadius;
        const spawnY = ss.y + sin * currentRadius;
        
        if (ss.bullets === undefined) ss.bullets = [];
        ss.bullets.push({
          x: spawnX,
          y: spawnY,
          vx: cos * SKILL_CONSTANTS.PLASMABALL_SPEED,
          vy: sin * SKILL_CONSTANTS.PLASMABALL_SPEED,
          life: 1.5,
          isPlasma: true
        });
        
        // Tiny recoil visual explosion
        ctx.createExplosion(spawnX, spawnY, '#00ffff', 4);
      }
      
      if (ss.railgunFireTimer <= 0) {
        ss.railgunFiringActive = false;
        ss.railgunFireTimer = 0;
        console.log(`🤖 [레일건 연사 종료] 성재 -> 2.5초 연사 완료`);
      }
    }

    // 1-3. Process Pilot Fast Handgun Firing (1.8s duration, target nearest enemy)
    if (ss.pilotFastFireActive && ss.pilotFastFireTimer !== undefined) {
      ss.pilotFastFireTimer -= dt;

      if (ss.pilotFastFireInterval === undefined) ss.pilotFastFireInterval = 0;
      ss.pilotFastFireInterval -= dt;

      if (ss.pilotFastFireInterval <= 0) {
        ss.pilotFastFireInterval = 0.08; // High-speed spray (every 0.08s)

        // Find closest enemy to aim at in real-time
        let closestEnemy: CharacterState | null = null;
        let minDistance = Infinity;
        for (const enemy of ctx.characters) {
          if (enemy.isDead || enemy.id === ss.id || isSameTeam(ss, enemy)) continue;
          const dist = Math.hypot(enemy.x - ss.x, enemy.y - ss.y);
          if (dist < minDistance) {
            minDistance = dist;
            closestEnemy = enemy;
          }
        }

        let fireAngle = Math.random() * Math.PI * 2;
        if (closestEnemy) {
          fireAngle = Math.atan2(closestEnemy.y - ss.y, closestEnemy.x - ss.x);
        }

        const cos = Math.cos(fireAngle);
        const sin = Math.sin(fireAngle);
        const currentRadius = ss.radius || SKILL_CONSTANTS.PILOT_RADIUS;
        const spawnX = ss.x + cos * (currentRadius + 10);
        const spawnY = ss.y + sin * (currentRadius + 10);

        if (ss.bullets === undefined) ss.bullets = [];
        ss.bullets.push({
          x: spawnX,
          y: spawnY,
          vx: cos * SKILL_CONSTANTS.BULLET_SPEED,
          vy: sin * SKILL_CONSTANTS.BULLET_SPEED,
          life: 1.5,
          isPlasma: false
        });

        ctx.createExplosion(spawnX, spawnY, '#ffff00', 3);
      }

      if (ss.pilotFastFireTimer <= 0) {
        ss.pilotFastFireActive = false;
        ss.pilotFastFireTimer = 0;
        console.log(`🏃‍♂️ [파일럿 스킬 종료] 성재 -> 권총 속사 완료`);
      }
    }

    // 2. Gun Bullet & Plasma Bullet Ticks
    if (ss.bullets === undefined) ss.bullets = [];
    ss.bullets.forEach((bullet) => {
      bullet.x += bullet.vx * dt * 60;
      bullet.y += bullet.vy * dt * 60;
      bullet.life -= dt;

      // Bullet trail particles
      if (Math.random() < 0.3) {
        const particleColor = bullet.isPlasma ? '#00ffff' : '#ffff00';
        ctx.createParticle(bullet.x, bullet.y, particleColor, bullet.isPlasma ? 2.5 : 1.5, 4);
      }

      // Check collision with other targets
      ctx.characters.forEach((enemy) => {
        if (enemy.isDead || enemy.id === ss.id || isSameTeam(ss, enemy)) return;
        const dist = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
        const collisionRadius = bullet.isPlasma ? enemy.radius + 12 : enemy.radius + 5;
        
        if (dist <= collisionRadius) {
          bullet.life = 0; // Kill bullet
          
          if (bullet.isPlasma) {
            // Plasma heavy bullet hit
            ctx.dealDamage(ss, enemy, SKILL_CONSTANTS.RAILGUN_FIRE_DMG, '⚡ PLASMA BALL');
            ctx.createExplosion(enemy.x, enemy.y, '#00bfff', 10);
            
            // Heavy pushback
            const kAngle = Math.atan2(enemy.y - bullet.y, enemy.x - bullet.x);
            enemy.vx += Math.cos(kAngle) * 8;
            enemy.vy += Math.sin(kAngle) * 8;
          } else {
            // Handgun basic hit
            ctx.dealDamage(ss, enemy, SKILL_CONSTANTS.PILOT_ATK, '🔫 PILOT HANDGUN');
            ctx.createExplosion(enemy.x, enemy.y, '#ffff00', 6);
            
            // Tiny pushback
            const kAngle = Math.atan2(enemy.y - bullet.y, enemy.x - bullet.x);
            enemy.vx += Math.cos(kAngle) * 1.5;
            enemy.vy += Math.sin(kAngle) * 1.5;
          }
        }
      });
    });

    ss.bullets = ss.bullets.filter((b) => b.life > 0);

    // 3. Update Mecha basic attack rotating cone angle
    if (!ss.isMechaDestroyed) {
      if (ss.mechaAtkAngle === undefined) ss.mechaAtkAngle = 0;
      ss.mechaAtkAngle += SKILL_CONSTANTS.MECHA_ATK_ROTATION_SPEED * dt;
      ss.mechaAtkAngle = ss.mechaAtkAngle % (Math.PI * 2);
    }

  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region BASIC_ATTACK — beam saber slice or pilot handgun bullet spawn
  // ═══════════════════════════════════════════
  onBasicAttack(char: CharacterState, opponent: CharacterState, ctx) {
    const ss = char as SungjaeState;

    if (!ss.isMechaDestroyed) {
      // Mecha Close-Range Slice (Beam Saber)
      const dist = Math.hypot(opponent.x - char.x, opponent.y - char.y);
      if (dist <= SKILL_CONSTANTS.MECHA_RANGE + opponent.radius) {
        let canAttack = false;

        // Check if opponent is inside the spinning 120 degree basic attack cone
        const currentAtkAngle = ss.mechaAtkAngle ?? 0;
        const opponentAngle = Math.atan2(opponent.y - ss.y, opponent.x - ss.x);
        
        let diffAngle = opponentAngle - currentAtkAngle;
        while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
        while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
        
        const halfConeAngle = (SKILL_CONSTANTS.MECHA_SWEEP_ANGLE / 2) * (Math.PI / 180);
        canAttack = Math.abs(diffAngle) <= halfConeAngle;

        if (canAttack) {
          ctx.dealDamage(char, opponent, SKILL_CONSTANTS.MECHA_ATK, '⚔️ BEAM SABER');
          
          // Strong slash knockback (increased to 15)
          const kAngle = Math.atan2(opponent.y - char.y, opponent.x - char.x);
          opponent.vx += Math.cos(kAngle) * 15;
          opponent.vy += Math.sin(kAngle) * 15;

          ctx.createExplosion(opponent.x, opponent.y, '#4169e1', 14);
          ctx.addFloatingText(opponent.x, opponent.y - 50, '⚔️ SLICE!', '#4169e1', 1.0);
        }
      }
    } else {
      // Pilot Long-Range Handgun fire
      const dx = opponent.x - char.x;
      const dy = opponent.y - char.y;
      const angle = Math.atan2(dy, dx);

      // Force pilot attack cooldown to 0.6s
      char.baseAttackCooldown = 0.6;

      if (ss.bullets === undefined) ss.bullets = [];

      ss.bullets.push({
        x: char.x + Math.cos(angle) * (char.radius + 10),
        y: char.y + Math.sin(angle) * (char.radius + 10),
        vx: Math.cos(angle) * SKILL_CONSTANTS.BULLET_SPEED,
        vy: Math.sin(angle) * SKILL_CONSTANTS.BULLET_SPEED,
        life: 1.5 // Bullet duration
      });

      console.log(`🔫 [파일럿 사격] 성재 -> 적 ${opponent.name}을 향해 권총 탄환 발사! (0.6초 대기)`);
      ctx.createExplosion(char.x + Math.cos(angle) * (char.radius + 10), char.y + Math.sin(angle) * (char.radius + 10), '#ffff00', 5);
    }
  },
  // #endregion BASIC_ATTACK

  // ═══════════════════════════════════════════
  // #region DAMAGE — double HP protection and ejection blast trigger
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, attacker: CharacterState, damage: number, ctx) {
    const ss = target as SungjaeState;
    if (ss.mechaHp === undefined) ss.mechaHp = SKILL_CONSTANTS.MECHA_MAX_HP;
    if (ss.pilotHp === undefined) ss.pilotHp = SKILL_CONSTANTS.PILOT_MAX_HP;
    if (ss.isMechaDestroyed === undefined) ss.isMechaDestroyed = false;

    // 1. Mecha damage absorption
    if (!ss.isMechaDestroyed) {
      ss.mechaHp -= damage;
      console.log(`🤖 [메카 피해] 성재 건담 메카 HP 잔량: ${ss.mechaHp}/${SKILL_CONSTANTS.MECHA_MAX_HP}`);

      // Sync visual total HP
      target.hp = Math.max(0, ss.mechaHp) + ss.pilotHp;

      if (ss.mechaHp <= 0) {
        ss.isMechaDestroyed = true;
        ss.mechaHp = 0;
        
        // Eject Pilot! Change sizes and speed
        target.radius = SKILL_CONSTANTS.PILOT_RADIUS;
        target.speed = target.speed * 1.05; // Increase pilot speed by 5% (reduced from 25% to slow down pilot)
        target.hp = ss.pilotHp;
        target.attackPower = 0; // Maintain 0 attack power to prevent pilot contact damage
        target.baseAttackRange = SKILL_CONSTANTS.PILOT_RANGE; // Change range stat to pilot handgun range!

        console.log(`💥 [건담 대파] 성재의 메카가 폭발했습니다! 성재 본체가 사출됩니다.`);
        ctx.logMessage?.(`💥 [건담 대파] 성재의 메카 대파 ➡️ 성재 본체 긴급 사출 및 메카 자폭 넉백 유발!`, 'skill');

        // Trigger eject nuclear explosion 
        ctx.createExplosion(target.x, target.y, '#ff4500', 60);
        ctx.createExplosion(target.x, target.y, '#ffff00', 45);
        ctx.addFloatingText(target.x, target.y - 70, '💥 건담 자폭 대폭발! 사출!', '#ff4500', 2.5);

        // Blast nearby enemies away
        ctx.characters.forEach((enemy) => {
          if (enemy.isDead || enemy.id === target.id) return;
          const dist = Math.hypot(enemy.x - target.x, enemy.y - target.y);
          if (dist <= SKILL_CONSTANTS.EJECT_EXPLOSION_RADIUS) {
            ctx.dealDamage(target, enemy, SKILL_CONSTANTS.EJECT_EXPLOSION_DAMAGE, '💥 MECHA DESTRUCTION BURST!');
            
            // Extreme eject blast knockback
            const kAngle = Math.atan2(enemy.y - target.y, enemy.x - target.x);
            enemy.vx += Math.cos(kAngle) * 16;
            enemy.vy += Math.sin(kAngle) * 16;
          }
        });

        // Grant momentary eject invincibility to allow pilot to flee
        target.isImmune = true;
        target.immuneTimeLeft = 1.0;
      }

      return { finalDamage: 0, blocked: true }; // MechaHP took it already
    } else {
      // 2. Pilot damage absorption
      ss.pilotHp -= damage;
      console.log(`🏃‍♂️ [성재 피해] 파일럿 성재 본체 HP 잔량: ${ss.pilotHp}/${SKILL_CONSTANTS.PILOT_MAX_HP}`);

      target.hp = Math.max(0, ss.pilotHp);

      // Weak pilot: takes 1.4x knockback
      const kAngle = Math.atan2(target.y - attacker.y, target.x - attacker.x);
      target.vx += Math.cos(kAngle) * 4;
      target.vy += Math.sin(kAngle) * 4;

      return { finalDamage: damage, blocked: false };
    }
  },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region RENDER — draw lasers, mecha shields, and target lines
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const ss = char as SungjaeState;

    // 1. Draw handgun bullets and Plasma balls
    const bullets = ss.bullets || [];
    bullets.forEach((b) => {
      canvasCtx.save();
      if (b.isPlasma) {
        // Render Plasma Heavy Ball
        canvasCtx.fillStyle = '#00ffff';
        canvasCtx.shadowBlur = 12;
        canvasCtx.shadowColor = '#00ffff';
        canvasCtx.beginPath();
        canvasCtx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        canvasCtx.fill();

        // Inner core
        canvasCtx.fillStyle = '#ffffff';
        canvasCtx.beginPath();
        canvasCtx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        canvasCtx.fill();
      } else {
        // Render Handgun bullet
        canvasCtx.fillStyle = '#ffff00';
        canvasCtx.shadowBlur = 8;
        canvasCtx.shadowColor = '#ffff00';
        canvasCtx.beginPath();
        canvasCtx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        canvasCtx.fill();
      }
      canvasCtx.restore();
    });

    // 2. Draw Railgun targeting reticle line
    if (ss.railgunActive && ss.railgunAngle !== undefined) {
      canvasCtx.save();
      
      const fireAngle = ss.railgunAngle;
      const cos = Math.cos(fireAngle);
      const sin = Math.sin(fireAngle);
      
      canvasCtx.strokeStyle = 'rgba(255, 0, 0, 0.65)';
      canvasCtx.lineWidth = 2.5;
      canvasCtx.setLineDash([8, 4]);

      canvasCtx.beginPath();
      canvasCtx.moveTo(ss.x, ss.y);
      canvasCtx.lineTo(ss.x + cos * 700, ss.y + sin * 700);
      canvasCtx.stroke();
      canvasCtx.restore();

      // Draw red targeting cone boundary
      canvasCtx.save();
      canvasCtx.strokeStyle = 'rgba(255, 0, 0, 0.25)';
      canvasCtx.lineWidth = 1.0;
      canvasCtx.beginPath();
      
      const perpAngle1 = fireAngle + Math.PI / 2;
      const perpAngle2 = fireAngle - Math.PI / 2;
      const halfW = SKILL_CONSTANTS.RAILGUN_WIDTH / 2;
      
      const startX1 = ss.x + Math.cos(perpAngle1) * halfW;
      const startY1 = ss.y + Math.sin(perpAngle1) * halfW;
      const startX2 = ss.x + Math.cos(perpAngle2) * halfW;
      const startY2 = ss.y + Math.sin(perpAngle2) * halfW;
      
      canvasCtx.moveTo(startX1, startY1);
      canvasCtx.lineTo(startX1 + cos * 700, startY1 + sin * 700);
      canvasCtx.moveTo(startX2, startY2);
      canvasCtx.lineTo(startX2 + cos * 700, startY2 + sin * 700);
      canvasCtx.stroke();
      canvasCtx.restore();
    }

    // 2-2. Draw Plasma Barrage firing effect (direction indicator line)
    if (ss.railgunFiringActive && ss.railgunFireAngle !== undefined) {
      canvasCtx.save();
      const fireAngle = ss.railgunFireAngle;
      const cos = Math.cos(fireAngle);
      const sin = Math.sin(fireAngle);
      
      // Draw bright cyan short line pointing in the fire direction
      canvasCtx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
      canvasCtx.lineWidth = 4;
      canvasCtx.beginPath();
      canvasCtx.moveTo(ss.x, ss.y);
      canvasCtx.lineTo(ss.x + cos * 150, ss.y + sin * 150);
      canvasCtx.stroke();
      canvasCtx.restore();
    }

    // 2-3. Draw Pilot Fast Fire directional indicator (Golden Ring)
    if (ss.pilotFastFireActive) {
      canvasCtx.save();
      canvasCtx.strokeStyle = 'rgba(255, 215, 0, 0.55)';
      canvasCtx.lineWidth = 2.5;
      canvasCtx.shadowBlur = 10;
      canvasCtx.shadowColor = '#ffd700';
      canvasCtx.beginPath();
      canvasCtx.arc(ss.x, ss.y, currentRadius + 5, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
    }

    // 3. Cosmetic Visuals for Mecha vs Pilot (Ring, visor, aura)
    if (!ss.isMechaDestroyed) {
      // 3a. Draw Royal Blue Outer Ring (두께 6px) & Glow
      canvasCtx.save();
      canvasCtx.strokeStyle = '#4169e1'; // 로열 블루
      canvasCtx.lineWidth = 6;
      canvasCtx.shadowBlur = 15;
      canvasCtx.shadowColor = '#00bfff'; // 푸른색 글로우 아우라
      
      canvasCtx.beginPath();
      canvasCtx.arc(char.x, char.y, currentRadius + 2, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();

      // 3b. Draw Robot mechanical red visor
      canvasCtx.save();
      canvasCtx.fillStyle = '#ff0000'; // Visor color
      canvasCtx.shadowBlur = 10;
      canvasCtx.shadowColor = '#ff0000';
      canvasCtx.fillRect(char.x - 18, char.y - 12, 36, 6);
      canvasCtx.restore();

      // 3c. Draw Rotating Basic Attack Cone Area (기본공격 회전 부채꼴 시각화)
      if (ss.mechaAtkAngle !== undefined) {
        canvasCtx.save();
        const atkAngle = ss.mechaAtkAngle;
        const halfConeAngle = (SKILL_CONSTANTS.MECHA_SWEEP_ANGLE / 2) * (Math.PI / 180);
        const renderRange = currentRadius + SKILL_CONSTANTS.MECHA_RANGE;

        // Draw semi-transparent cyan cone representing the damage sector
        canvasCtx.fillStyle = 'rgba(0, 191, 255, 0.08)'; // Very faint blue fill
        canvasCtx.strokeStyle = 'rgba(0, 191, 255, 0.25)'; // Light blue edge
        canvasCtx.lineWidth = 1.5;

        canvasCtx.beginPath();
        canvasCtx.moveTo(ss.x, ss.y);
        canvasCtx.arc(
          ss.x,
          ss.y,
          renderRange,
          atkAngle - halfConeAngle,
          atkAngle + halfConeAngle
        );
        canvasCtx.closePath();
        canvasCtx.fill();
        canvasCtx.stroke();
        canvasCtx.restore();
      }
    } else {
      // Pilot helmet white outline
      canvasCtx.save();
      canvasCtx.strokeStyle = '#ffffff';
      canvasCtx.lineWidth = 1.5;
      canvasCtx.beginPath();
      canvasCtx.arc(char.x, char.y, currentRadius + 3, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
    }

    // 4. Double Health Bar Drawing (2중 HP 바)
    canvasCtx.save();
    const barWidth = 60;
    const barHeight = 6;
    const startX = char.x - barWidth / 2;
    let currentY = char.y - currentRadius - 22; // Start above head

    if (!ss.isMechaDestroyed) {
      // Draw Mecha HP (Royal Blue Bar)
      const mechaHpVal = ss.mechaHp ?? SKILL_CONSTANTS.MECHA_MAX_HP;
      const mechaRatio = Math.max(0, mechaHpVal / SKILL_CONSTANTS.MECHA_MAX_HP);
      
      // Background
      canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      canvasCtx.fillRect(startX, currentY, barWidth, barHeight);
      
      // Fill
      canvasCtx.fillStyle = '#1e90ff'; // Dodger Blue
      canvasCtx.fillRect(startX, currentY, barWidth * mechaRatio, barHeight);
      
      // Label
      canvasCtx.fillStyle = '#ffffff';
      canvasCtx.font = 'bold 8px Inter, Arial';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText(`MECHA: ${Math.round(mechaHpVal)}`, char.x, currentY - 2);

      currentY += 12; // Move down for the Pilot HP bar
    }

    // Draw Pilot HP (Pink Bar)
    const pilotHpVal = ss.pilotHp ?? SKILL_CONSTANTS.PILOT_MAX_HP;
    const pilotRatio = Math.max(0, pilotHpVal / SKILL_CONSTANTS.PILOT_MAX_HP);
    
    // Background
    canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    canvasCtx.fillRect(startX, currentY, barWidth, barHeight);
    
    // Fill
    canvasCtx.fillStyle = '#ff69b4'; // Hot Pink
    canvasCtx.fillRect(startX, currentY, barWidth * pilotRatio, barHeight);
    
    // Label
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 8px Inter, Arial';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(`PILOT: ${Math.round(pilotHpVal)}`, char.x, currentY - 2);

    canvasCtx.restore();

    // 5. Stun stars
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
        const starY = char.y - currentRadius - 32 + Math.sin(starAngle) * 4; // Shift up because of HP bars
        canvasCtx.fillText('💫', starX, starY);
      }
      canvasCtx.restore();
    }
  }
  // #endregion RENDER
};
