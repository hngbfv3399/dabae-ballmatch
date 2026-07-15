import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
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
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS — balance tuning values
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  WARNING_DURATION: 1.5,
  BOMBARDMENT_DURATION: 4.8,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const chanikConfig: CharacterConfig = {
  id: 'chanik',
  name: '찬익',
  maxHp: 170,
  speed: 1.3,
  attackPower: 14,
  defense: 10,
  baseAttackRange: 45,
  skillName: '포격 지원 요청 (Artillery Strike)',
  skillDescription: '8초 쿨타임. 맵 전체에 공습경보를 내리고 무차별 전탄 폭격을 요청합니다. 스킬이 유지되는 동안 맵 전체의 모든 적은 이동 속도가 20% 감소하며, 1.5초 뒤 맵 전체 영역에 4.8초 동안 포탄들이 무차별 연속 낙하하여 폭발당 반경 135px 범위에 10의 피해와 강한 넉백을 입힙니다.',
  color: '#4b5320', // 군용 국방색
  skillChargeRate: 12.5, // 8초 쿨타임 (100 / 8 = 12.5)
  tier: 'A',
  role: 'Nuker',
  detailedDescription: '찬익은 광역 전탄 포격을 요청하여 맵 전체에 무차별 폭격을 쏟아붓는 포격형 누커 캐릭터입니다. 스킬이 켜지면 공습경보와 함께 전장에 있는 모든 적의 이동 속도를 감소시키며, 연속으로 무차별 낙하하는 포탄을 투하해 대량의 넉백과 누적 대미지를 가해 전장 전체를 초토화시킵니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — request artillery strike
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    // Keep the skill active for the complete warning and bombardment sequence.
    // The common engine only starts filling the gauge after this becomes false.
    char.skillActive = true;

    ctx.addFloatingText(char.x, char.y - 45, '🚨 공습경보 발령!', '#ff3300', 1.5);
    console.log(`📻 [포격 요청] 찬익 -> 맵 전체 무차별 전탄 융단폭격 지원 요청! (공습경보 가동)`);
    ctx.logMessage?.(`📻 [포격 요청] 찬익 ➡️ 맵 전체 무차별 융단폭격 개시!`, 'skill');

    const activeStrikes = (char as any).activeStrikes || [];
    activeStrikes.push({
      targetX: ctx.arenaWidth / 2,
      targetY: ctx.arenaHeight / 2,
      radius: Math.hypot(ctx.arenaWidth, ctx.arenaHeight),
      delayLeft: SKILL_CONSTANTS.WARNING_DURATION,
      durationLeft: SKILL_CONSTANTS.BOMBARDMENT_DURATION,
      shellTimer: 0
    });
    (char as any).activeStrikes = activeStrikes;
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — projectile flight & blast logic, target debuff updates
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    const activeStrikes = ((char as any).activeStrikes || []) as ArtilleryStrike[];
    const projectiles = ((char as any).projectiles || []) as Projectile[];
    const chars = ctx.characters;

    // Apply speed reduction debuff to enemies inside alert zone
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
          enemy.speed = enemy.speed * 0.8; // 20% slow
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

    // 1. Strike timer and spawn projectiles
    activeStrikes.forEach((strike) => {
      if (strike.delayLeft > 0) {
        strike.delayLeft -= dt;
        if (Math.random() < 0.3) {
          ctx.createParticle(Math.random() * ctx.arenaWidth, Math.random() * ctx.arenaHeight, '#ff3300', 2, 5);
        }
      } else if (strike.durationLeft > 0) {
        strike.durationLeft -= dt;
        strike.shellTimer -= dt;
        if (strike.shellTimer <= 0) {
          strike.shellTimer = 0.15; // Shoot every 0.15s
          
          const bombX = Math.random() * ctx.arenaWidth;
          const bombY = Math.random() * ctx.arenaHeight;

          projectiles.push({
            startX: bombX - 100,
            startY: bombY - 400,
            targetX: bombX,
            targetY: bombY,
            progress: 0,
            damageDealt: false
          });
        }
      }
    });

    // Clean up finished strikes and start the cooldown only after the last
    // projectile from this cast has resolved.
    (char as any).activeStrikes = activeStrikes.filter((s) => s.delayLeft > 0 || s.durationLeft > 0);

    // 2. Missile flight and explosions
    projectiles.forEach((proj) => {
      proj.progress += dt * 4.0; // Reach target in 0.25 seconds
      
      const curX = proj.startX + (proj.targetX - proj.startX) * proj.progress;
      const curY = proj.startY + (proj.targetY - proj.startY) * proj.progress;

      if (proj.progress < 1.0 && Math.random() < 0.3) {
        ctx.createParticle(curX, curY, '#ff6600', 3, 5);
      }

      if (proj.progress >= 1.0 && !proj.damageDealt) {
        proj.progress = 1.0;
        proj.damageDealt = true;

        console.log(`💥 [포탄 폭발] 찬익의 포격 명중! 위치: (${Math.round(proj.targetX)}, ${Math.round(proj.targetY)})`);

        ctx.createExplosion(proj.targetX, proj.targetY, '#ffaa00', 25);
        ctx.createExplosion(proj.targetX, proj.targetY, '#ff3300', 18);
        ctx.addFloatingText(proj.targetX, proj.targetY - 20, '💥 BOMB!', '#ff3300', 1.0);

        // Apply 10 damage within 135px radius
        const targetRadius = 135;
        ctx.characters.forEach((enemy) => {
          if (enemy.isDead || enemy.id === char.id) return;
          const dist = Math.hypot(enemy.x - proj.targetX, enemy.y - proj.targetY);
          if (dist <= targetRadius) {
            ctx.dealDamage(char, enemy, 10, '💥 BOMBARD!');
            
            // Strong explosion knockback
            const kAngle = Math.atan2(enemy.y - proj.targetY, enemy.x - proj.targetX);
            enemy.vx += Math.cos(kAngle) * 8;
            enemy.vy += Math.sin(kAngle) * 8;
          }
        });
      }
    });

    (char as any).projectiles = projectiles.filter((p) => p.progress < 1.0);

    if (char.skillActive && (char as any).activeStrikes.length === 0 && (char as any).projectiles.length === 0) {
      char.skillActive = false;
      ctx.addFloatingText(char.x, char.y - 25, '📻 포격 종료 · 재충전 시작', '#00ffcc', 1.0);
    }

    // Stun logic
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
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DEATH — remove slow debuff on death
  // ═══════════════════════════════════════════
  onDeath(_char: CharacterState, _killer: CharacterState, ctx: CharacterBehaviorContext) {
    // If Chanik dies, restore speeds of all slowed characters
    ctx.characters.forEach((enemy) => {
      const opp = enemy as any;
      if (opp.chanikSlowApplied && opp.chanikOriginalSpeed !== undefined) {
        enemy.speed = opp.chanikOriginalSpeed;
        opp.chanikSlowApplied = false;
        ctx.addFloatingText(enemy.x, enemy.y - 25, '🚨 포격 취소 (이속 복구)', '#00ffcc', 1.0);
        console.log(`🚨 [전술 감속 해제] 찬익 사망으로 인해 ${enemy.name}의 감속이 해제되고 속도가 복구되었습니다.`);
      }
    });
  },
  // #endregion DEATH

  // ═══════════════════════════════════════════
  // #region RENDER — alert area siren, falling missiles, stun stars
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const activeStrikes = ((char as any).activeStrikes || []) as ArtilleryStrike[];
    const projectiles = ((char as any).projectiles || []) as Projectile[];

    // 1. Siren warnings and alert zone dashed lines
    canvasCtx.save();
    activeStrikes.forEach((strike) => {
      if (strike.radius >= Math.hypot(canvasCtx.canvas.width, canvasCtx.canvas.height)) {
        // Siren border lines
        canvasCtx.strokeStyle = 'rgba(255, 0, 0, 0.45)';
        canvasCtx.lineWidth = 10;
        canvasCtx.strokeRect(0, 0, canvasCtx.canvas.width, canvasCtx.canvas.height);

        // Slow flashing red overlay screen
        const pulse = Math.abs(Math.sin(Date.now() / 150)) * 0.08;
        canvasCtx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
        canvasCtx.fillRect(0, 0, canvasCtx.canvas.width, canvasCtx.canvas.height);

        // Big alert text during warning delay
        if (strike.delayLeft > 0) {
          canvasCtx.save();
          canvasCtx.fillStyle = '#ff3300';
          canvasCtx.strokeStyle = '#000000';
          canvasCtx.lineWidth = 5.0;
          
          const textPulse = Math.abs(Math.sin(Date.now() / 80));
          canvasCtx.globalAlpha = 0.3 + textPulse * 0.7;
          
          canvasCtx.font = 'bold 52px "Noto Sans KR", Arial, sans-serif';
          canvasCtx.textAlign = 'center';
          canvasCtx.textBaseline = 'middle';
          
          canvasCtx.strokeText('🚨 공습경보!! 🚨', canvasCtx.canvas.width / 2, canvasCtx.canvas.height / 2 - 30);
          canvasCtx.fillText('🚨 공습경보!! 🚨', canvasCtx.canvas.width / 2, canvasCtx.canvas.height / 2 - 30);
          
          canvasCtx.font = 'bold 18px "Noto Sans KR", Arial, sans-serif';
          canvasCtx.fillStyle = '#ffffff';
          canvasCtx.strokeText('대공 포격 지원이 즉시 실시됩니다!', canvasCtx.canvas.width / 2, canvasCtx.canvas.height / 2 + 30);
          canvasCtx.fillText('대공 포격 지원이 즉시 실시됩니다!', canvasCtx.canvas.width / 2, canvasCtx.canvas.height / 2 + 30);
          
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

    // 2. Falling missiles
    canvasCtx.save();
    projectiles.forEach((proj) => {
      const curX = proj.startX + (proj.targetX - proj.startX) * proj.progress;
      const curY = proj.startY + (proj.targetY - proj.startY) * proj.progress;

      // Rocket tail lines
      canvasCtx.beginPath();
      canvasCtx.moveTo(curX, curY);
      const angle = Math.atan2(proj.targetY - proj.startY, proj.targetX - proj.startX);
      const fireX = curX - Math.cos(angle) * 15;
      const fireY = curY - Math.sin(angle) * 15;
      canvasCtx.lineTo(fireX, fireY);
      canvasCtx.strokeStyle = '#ff9900';
      canvasCtx.lineWidth = 4;
      canvasCtx.stroke();

      // Missile head
      canvasCtx.beginPath();
      canvasCtx.arc(curX, curY, 6, 0, Math.PI * 2);
      canvasCtx.fillStyle = '#4b5320';
      canvasCtx.strokeStyle = '#ff3300';
      canvasCtx.lineWidth = 1.5;
      canvasCtx.fill();
      canvasCtx.stroke();
    });
    canvasCtx.restore();

    // Stun stars
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
  // #endregion RENDER
};
