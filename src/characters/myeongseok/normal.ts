import type { CharacterConfig, CharacterState } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface BowlingBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  timeLeft: number;
  lastHitTargetId: string; // Used to manage hit cooldowns for the same target
  hitCooldown: number;
}

interface MyeongseokState extends CharacterState {
  bowlingBalls?: BowlingBall[];
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  COOLDOWN: 6,
  BALL_DURATION: 3.0,          // reduced from 5s to 3s (nerf)
  BALL_START_DMG: 18,
  WALL_DMG_INCREMENT: 4,
  CHAR_DMG_INCREMENT: 6,
  BALL_SPEED: 11.5,
  BALL_RADIUS: 15,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const myeongseokConfig: CharacterConfig = {
  id: 'myeongseok',
  name: '명석',
  maxHp: 145,
  speed: 1.2,
  attackPower: 14,
  baseAttackRange: 45,
  skillName: '퍼펙트 스트라이크',
  skillDescription: `${SKILL_CONSTANTS.COOLDOWN}초 쿨타임. 무겁고 빠른 볼링공을 던집니다. 볼링공은 ${SKILL_CONSTANTS.BALL_DURATION}초 동안 벽과 캐릭터 사이를 바운싱하며, 벽에 충돌 시 +${SKILL_CONSTANTS.WALL_DMG_INCREMENT} 대미지, 캐릭터 충돌 시 +${SKILL_CONSTANTS.CHAR_DMG_INCREMENT} 대미지가 영구적으로 중첩됩니다.`,
  color: '#4a154b', // Heavy eggplant / purple
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN, // 6s cooldown
  tier: 'B',
  role: 'Juggernaut',
  detailedDescription: `명석은 벽과 적을 튕길 때마다 무한히 파괴력이 증가하는 볼링공을 던지는 돌격형 전사 캐릭터입니다. 스킬 발동 시 필드에 무겁고 빠른 볼링공을 투척하며, 이 볼링공은 벽에 부딪힐 때마다 공격력 +${SKILL_CONSTANTS.WALL_DMG_INCREMENT}, 캐릭터에 부딪힐 때마다 공격력 +${SKILL_CONSTANTS.CHAR_DMG_INCREMENT}씩 누적으로 가산되어 난전이 길어질수록 피해량이 걷잡을 수 없이 치솟는 스택형 딜링 능력을 보유하고 있습니다.`,
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — shoot bowling ball
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    // Cooldown starts immediately
    char.skillActive = false;
    char.skillDurationLeft = 0;

    let closestEnemy: any = null;
    let minDist = Infinity;

    ctx.characters.forEach((enemy) => {
      if (enemy.isDead || enemy.id === char.id) return;
      const dist = Math.hypot(enemy.x - char.x, enemy.y - char.y);
      if (dist < minDist) {
        minDist = dist;
        closestEnemy = enemy;
      }
    });

    // Determine launch angle (random if no enemies)
    const angle = closestEnemy 
      ? Math.atan2(closestEnemy.y - char.y, closestEnemy.x - char.x)
      : Math.random() * Math.PI * 2;

    const ms = char as MyeongseokState;
    const bowlingBalls = ms.bowlingBalls || [];
    
    // Launch bowling ball at high velocity
    bowlingBalls.push({
      x: char.x,
      y: char.y,
      vx: Math.cos(angle) * SKILL_CONSTANTS.BALL_SPEED,
      vy: Math.sin(angle) * SKILL_CONSTANTS.BALL_SPEED,
      damage: SKILL_CONSTANTS.BALL_START_DMG,
      radius: SKILL_CONSTANTS.BALL_RADIUS,
      timeLeft: SKILL_CONSTANTS.BALL_DURATION,
      lastHitTargetId: '',
      hitCooldown: 0
    });
    ms.bowlingBalls = bowlingBalls;

    ctx.addFloatingText(char.x, char.y - 50, '🎳 퍼펙트 스트라이크!', '#4a154b', 1.5);
    ctx.createExplosion(char.x, char.y, '#4a154b', 15);
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — ball movement, wall bounces, enemy hit resolutions
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    const ms = char as MyeongseokState;
    if (ms.bowlingBalls === undefined) ms.bowlingBalls = [];

    ms.bowlingBalls.forEach((ball) => {
      ball.timeLeft -= dt;

      // 1. Physical translation
      ball.x += ball.vx * dt * 60;
      ball.y += ball.vy * dt * 60;

      // Decrement hit cooldowns
      if (ball.hitCooldown > 0) {
        ball.hitCooldown -= dt;
      }

      // 2. Wall bounce handling (gain damage +4)
      let wallHit = false;
      const restitution = 1.0;
      
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx * restitution;
        wallHit = true;
      } else if (ball.x + ball.radius > 800) {
        ball.x = 800 - ball.radius;
        ball.vx = -ball.vx * restitution;
        wallHit = true;
      }

      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy * restitution;
        wallHit = true;
      } else if (ball.y + ball.radius > 600) {
        ball.y = 600 - ball.radius;
        ball.vy = -ball.vy * restitution;
        wallHit = true;
      }

      if (wallHit) {
        ball.damage += SKILL_CONSTANTS.WALL_DMG_INCREMENT;
        ball.lastHitTargetId = ''; // Reset hit lock on wall bounce
        ctx.addFloatingText(ball.x, ball.y - 12, `🎳 +${SKILL_CONSTANTS.WALL_DMG_INCREMENT} 대미지 (벽)`, '#ffc107', 0.8);
        ctx.createExplosion(ball.x, ball.y, '#ffffff', 4);
      }

      // 3. Enemy collision handling (bounce & damage increase +6, apply damage)
      ctx.characters.forEach((enemy) => {
        if (enemy.isDead || enemy.id === char.id) return;
        
        // Cooldown check
        if (ball.lastHitTargetId === enemy.id && ball.hitCooldown > 0) return;

        const dist = Math.hypot(enemy.x - ball.x, enemy.y - ball.y);
        const minDist = enemy.radius + ball.radius;

        if (dist < minDist) {
          // Bounce mathematics
          const dx = enemy.x - ball.x;
          const dy = enemy.y - ball.y;
          const nx = dx / dist;
          const ny = dy / dist;

          // Push out of overlapping circles
          ball.x -= nx * ((minDist - dist) / 2);
          ball.y -= ny * ((minDist - dist) / 2);

          const kx = ball.vx - enemy.vx;
          const ky = ball.vy - enemy.vy;
          const vn = kx * nx + ky * ny;

          if (vn > 0) {
            // Speed reflection
            ball.vx -= vn * nx * 2;
            ball.vy -= vn * ny * 2;
          }

          // Damage application & knockback
          ctx.dealDamage(char, enemy, ball.damage, '🎳 STRIKE!');
          
          enemy.vx += nx * 4.5;
          enemy.vy += ny * 4.5;
          
          ball.damage += SKILL_CONSTANTS.CHAR_DMG_INCREMENT;
          ball.lastHitTargetId = enemy.id;
          ball.hitCooldown = 0.5; // 0.5s hit immunity for same target

          ctx.addFloatingText(enemy.x, enemy.y - 45, `🎳 +${SKILL_CONSTANTS.CHAR_DMG_INCREMENT} 대미지 (명중)`, '#ff5722', 1.2);
          ctx.createExplosion(ball.x, ball.y, '#ff5722', 12);
          ctx.logMessage?.(`🎳 [스트라이크] 명석 ➡️ ${enemy.name} | ${ball.damage - SKILL_CONSTANTS.CHAR_DMG_INCREMENT} 피해 (스탯 증가 후: ${ball.damage})`, 'skill');
        }
      });
    });

    // Filter out expired balls
    ms.bowlingBalls = ms.bowlingBalls.filter((b) => b.timeLeft > 0);
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region RENDER — draw bowling balls and holes, damage indicators
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, _currentRadius: number) {
    const ms = char as MyeongseokState;
    const bowlingBalls = ms.bowlingBalls || [];

    // Render bowling balls
    bowlingBalls.forEach((ball) => {
      canvasCtx.save();
      canvasCtx.fillStyle = '#1c0d24'; // Dark purple/black
      canvasCtx.shadowBlur = 8;
      canvasCtx.shadowColor = '#4a154b';
      
      // Main body
      canvasCtx.beginPath();
      canvasCtx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      canvasCtx.fill();

      // 3 finger holes (with rotation effects)
      const rot = (Date.now() / 100) % (Math.PI * 2);
      canvasCtx.fillStyle = '#ffffff';
      
      const offsets = [
        { r: 5, a: 0 },
        { r: 5, a: Math.PI * 0.7 },
        { r: 5, a: Math.PI * 1.3 }
      ];

      offsets.forEach((off) => {
        const hx = ball.x + Math.cos(rot + off.a) * off.r;
        const hy = ball.y + Math.sin(rot + off.a) * off.r;
        canvasCtx.beginPath();
        canvasCtx.arc(hx, hy, 2.2, 0, Math.PI * 2);
        canvasCtx.fill();
      });

      // Damage indicator text
      canvasCtx.fillStyle = '#ffc107';
      canvasCtx.font = 'bold 9px Outfit, sans-serif';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText(ball.damage.toString(), ball.x, ball.y - ball.radius - 4);

      canvasCtx.restore();
    });
  }
  // #endregion RENDER
};
