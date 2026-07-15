import type { CharacterConfig, CharacterState } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface AmpouleProjectile {
  x: number;
  y: number;
  target: CharacterState;
  speed: number;
  isHit: boolean;
}

interface JuyeonState extends CharacterState {
  juyeonProjectiles?: AmpouleProjectile[];
  stolenSpeedMultiplier?: number;
  speedStealTimer?: number;
  speedStealStacks?: number;
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  COOLDOWN: 7,
  AMPOULE_SPEED: 9.5,
  HEAL_AMOUNT: 15,
  SPEED_BUFF_PCT: 50,
  SPEED_BUFF_DURATION: 3.0,
  STUN_DURATION: 1.5,
  EXPLOSION_DAMAGE: 25,
  STEAL_CHANCE: 0.30,       // 30% chance on collision
  STEAL_SPEED_PCT: 15,      // steal 15% speed
  STEAL_MAX_STACKS: 3,
  STEAL_DURATION: 4.0,
  SHIELD_POP_DAMAGE: 15,
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
export const juyeonConfig: CharacterConfig = {
  id: 'juyeon',
  name: '주연',
  maxHp: 135,
  speed: 1.3,
  attackPower: 12,
  defense: 7,
  baseAttackRange: 45,
  skillName: '프리미엄 모델링 앰플 팩',
  skillDescription: `${SKILL_CONSTANTS.COOLDOWN}초 쿨타임. 스킬 시전 시 즉시 자가 치유로 체력을 ${SKILL_CONSTANTS.HEAL_AMOUNT} 회복하고 ${SKILL_CONSTANTS.SPEED_BUFF_DURATION}초간 이동속도가 ${SKILL_CONSTANTS.SPEED_BUFF_PCT}% 증가합니다. 동시에 가장 가까운 적에게 앰플 팩을 발사해 적중 즉시 ${SKILL_CONSTANTS.STUN_DURATION}초간 기절시키며, 1초 뒤 굳은 팩이 깨질 때 ${SKILL_CONSTANTS.EXPLOSION_DAMAGE}의 피해를 입힙니다. 패시브: 적과 충돌 시 ${SKILL_CONSTANTS.STEAL_CHANCE * 100}% 확률로 이속 ${SKILL_CONSTANTS.STEAL_SPEED_PCT}%를 강탈해 중첩(최대 ${SKILL_CONSTANTS.STEAL_MAX_STACKS}중첩, ${SKILL_CONSTANTS.STEAL_DURATION}초)하며, 적의 보호막 실드를 즉시 파괴하고 ${SKILL_CONSTANTS.SHIELD_POP_DAMAGE}의 추가 피해를 입힙니다.`,
  color: '#ffb6c1', // 베이비 핑크
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN,
  tier: 'A',
  role: 'Specialist',
  detailedDescription: '주연은 자가 유틸리티 충전(치유/이속 증가)과 광역 적 속박 제어를 넘나드는 1대1 특화 피부미용사 캐릭터입니다. 적의 속도를 빼앗는 경락 마사지와 보호막을 즉시 떼어내는 압출 패시브를 통해 주도적인 플레이가 가능하며, 특수 모델링 마스크 팩을 날려 적을 돌처럼 굳혀 넉백 위기에서 전장을 통제하는 다재다능한 스페셜리스트입니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — self-care & fire mask pack projectile
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    // 1. Self Care: Heal HP and grant 3s speed buff
    char.hp = Math.min(char.maxHp, char.hp + SKILL_CONSTANTS.HEAL_AMOUNT);
    const wasBuffed = char.skillActive;
    char.skillActive = true;
    char.skillDurationLeft = SKILL_CONSTANTS.SPEED_BUFF_DURATION;
    if (!wasBuffed) {
      char.speed = char.speed * (1 + SKILL_CONSTANTS.SPEED_BUFF_PCT / 100);
    }
    ctx.addFloatingText(char.x, char.y - 65, `🧴 자가 앰플 케어 (+${SKILL_CONSTANTS.HEAL_AMOUNT} HP)`, '#39ff14', 1.5);
    ctx.createExplosion(char.x, char.y, '#39ff14', 12);
    ctx.logMessage?.(`🧴 [자가 케어] 주연 ➡️ 자가 앰플 팩 도포! HP ${SKILL_CONSTANTS.HEAL_AMOUNT} 회복 및 ${SKILL_CONSTANTS.SPEED_BUFF_DURATION}초간 이속 +${SKILL_CONSTANTS.SPEED_BUFF_PCT}%`, 'skill');

    // 2. Target closest enemy and shoot mask pack projectile
    let closestEnemy: CharacterState | null = null;
    let minDist = Infinity;

    ctx.characters.forEach((other) => {
      if (other.isDead || other.id === char.id || isSameTeam(char, other)) return;
      const dist = Math.hypot(other.x - char.x, other.y - char.y);
      if (dist < minDist) {
        minDist = dist;
        closestEnemy = other;
      }
    });

    if (closestEnemy) {
      const js = char as JuyeonState;
      if (js.juyeonProjectiles === undefined) js.juyeonProjectiles = [];

      js.juyeonProjectiles.push({
        x: char.x,
        y: char.y,
        target: closestEnemy,
        speed: SKILL_CONSTANTS.AMPOULE_SPEED,
        isHit: false
      });

      ctx.addFloatingText(char.x, char.y - 45, '🧴 마스크 팩 발사!', '#ffb6c1', 1.2);
    }
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — projectile flight, hit resolutions, speed steal decay
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    const js = char as JuyeonState;
    if (js.juyeonProjectiles === undefined) js.juyeonProjectiles = [];
    if (js.speedStealStacks === undefined) js.speedStealStacks = 0;
    if (js.speedStealTimer === undefined) js.speedStealTimer = 0;

    // 1. Decay stolen speed stacks
    if (js.speedStealStacks > 0) {
      js.speedStealTimer -= dt;
      if (js.speedStealTimer <= 0) {
        console.log(`💆‍♀️ [경락 만료] 주연의 경락 마사지 강탈 속도가 반환되었습니다.`);
        ctx.addFloatingText(js.x, js.y - 45, '💆‍♀️ 경락 효과 만료', '#888888', 1.0);
        
        // Restore speed
        const speedRefund = 1 + (js.speedStealStacks * SKILL_CONSTANTS.STEAL_SPEED_PCT) / 100;
        js.speed = js.speed / speedRefund;

        js.speedStealStacks = 0;
        js.speedStealTimer = 0;
      }
    }

    // 2. Projectile movement and collision
    js.juyeonProjectiles.forEach((proj) => {
      if (proj.target.isDead || isSameTeam(char, proj.target)) {
        proj.isHit = true;
        return;
      }

      const dx = proj.target.x - proj.x;
      const dy = proj.target.y - proj.y;
      const dist = Math.hypot(dx, dy);

      // Hit detection
      if (dist < proj.target.radius + 8) {
        proj.isHit = true;
        const target = proj.target;

        // Target (Enemy): 1.0s delay modeling mask pack
        console.log(`🧴 [앰플 도포] 주연 -> 적 ${target.name}에게 고무 팩 도포 (1초 후 굳음)`);
        ctx.addFloatingText(target.x, target.y - 65, '🧴 고무 팩 도포! (1초 대기)', '#ffb6c1', 1.5);
        ctx.createExplosion(target.x, target.y, '#ffb6c1', 10);

        (target as any).juyeonMaskTimer = 1.0;
        (target as any).juyeonMaskAppliedBy = js.id;
        const stunned = ctx.applyStun(char, target, SKILL_CONSTANTS.STUN_DURATION);
        if (stunned) ctx.addFloatingText(target.x, target.y - 42, `🗿 즉시 기절 ${SKILL_CONSTANTS.STUN_DURATION}초`, '#a8a8a8', 1.2);
      } else {
        const angle = Math.atan2(dy, dx);
        proj.x += Math.cos(angle) * proj.speed * dt * 60;
        proj.y += Math.sin(angle) * proj.speed * dt * 60;

        // Pink trail particles
        if (Math.random() < 0.4) {
          ctx.createParticle(proj.x, proj.y, '#ffb6c1', 2.5, 6);
        }
      }
    });

    js.juyeonProjectiles = js.juyeonProjectiles.filter((p) => !p.isHit);

    // 3. Enemy model mask timer & stun burst
    ctx.characters.forEach((enemy) => {
      const target = enemy as any;
      if (target.isDead || target.juyeonMaskTimer === undefined || target.juyeonMaskAppliedBy !== js.id) return;
      if (isSameTeam(char, enemy)) {
        delete target.juyeonMaskTimer;
        delete target.juyeonMaskAppliedBy;
        return;
      }

      if (target.juyeonMaskTimer > 0) {
        target.juyeonMaskTimer -= dt;
        
        // Drip effect particles
        if (Math.random() < 0.3) {
          ctx.createParticle(enemy.x, enemy.y - 10, '#e8c4c8', 2.0, 8);
        }

        if (target.juyeonMaskTimer <= 0) {
          delete target.juyeonMaskTimer;

          // Damage triggers after the immediate-hit stun has held the target in place.
          ctx.dealDamage(char, enemy, SKILL_CONSTANTS.EXPLOSION_DAMAGE, '🗿 팩 석고화!');
          ctx.createExplosion(enemy.x, enemy.y, '#e8c4c8', 22);
          ctx.addFloatingText(enemy.x, enemy.y - 55, `🗿 마스크 응고! (기절 L${SKILL_CONSTANTS.STUN_DURATION}s)`, '#a8a8a8', 1.8);
          ctx.logMessage?.(`🗿 [팩 석고화] 주연 ➡️ 적 ${enemy.name} | ${SKILL_CONSTANTS.EXPLOSION_DAMAGE} 폭발 피해 및 ${SKILL_CONSTANTS.STUN_DURATION}초간 기절 속박`, 'skill');
        }
      }
    });

    // 4. Clean up speed buff on self when expired
    ctx.characters.forEach((other) => {
      if (!other.isDead && other.skillActive && other.skillDurationLeft > 0) {
        // Only target Juyeon itself for speed buff decay
        const isJuyeonBuffed = other.id === js.id;
        if (isJuyeonBuffed) {
          other.skillDurationLeft -= dt;
          if (other.skillDurationLeft <= 0) {
            other.skillActive = false;
            // Revert speed buff
            other.speed = other.speed / (1 + SKILL_CONSTANTS.SPEED_BUFF_PCT / 100);
            ctx.addFloatingText(other.x, other.y - 25, '🧴 앰플 흡수 종료', '#888888', 1.0);
          }
        }
      }
    });

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
  // #region COLLISION — passive speed steal & shield pop
  // ═══════════════════════════════════════════
  onCollisionWithTarget(char: CharacterState, opponent: CharacterState, ctx) {
    if (opponent.isDead || opponent.id.includes('clone') || opponent.id === char.id) return;

    // Passive 1: Shield Extractor (Pops shields immediately)
    if (opponent.doyunShield && opponent.doyunShield > 0) {
      console.log(`💆‍♀️ [압출 핀셋] 주연 -> ${opponent.name}의 실드를 강제 압출 파괴했습니다!`);
      ctx.logMessage?.(`💆‍♀️ [압출 핀셋] 주연 ➡️ ${opponent.name}의 보호막 실드를 즉시 파괴하고 ${SKILL_CONSTANTS.SHIELD_POP_DAMAGE} 고정 피해 유발`, 'damage');
      
      opponent.doyunShield = 0;
      opponent.doyunShieldTimeLeft = 0;

      ctx.dealDamage(char, opponent, SKILL_CONSTANTS.SHIELD_POP_DAMAGE, '💆‍♀️ BLACKHEAD POP!');
      ctx.createExplosion(opponent.x, opponent.y, '#ffffff', 18);
      ctx.addFloatingText(opponent.x, opponent.y - 65, '💆‍♀️ 실드 압출 파괴!', '#ff3366', 1.8);
    }

    // Passive 2: Meridian Massage (Relaxing speed steal 30% chance)
    const js = char as JuyeonState;
    if (js.speedStealStacks === undefined) js.speedStealStacks = 0;

    if (js.speedStealStacks < SKILL_CONSTANTS.STEAL_MAX_STACKS) {
      if (Math.random() < SKILL_CONSTANTS.STEAL_CHANCE) {
        js.speedStealStacks += 1;
        js.speedStealTimer = SKILL_CONSTANTS.STEAL_DURATION;

        // Apply speed buff multiplier
        const oldMult = 1 + ((js.speedStealStacks - 1) * SKILL_CONSTANTS.STEAL_SPEED_PCT) / 100;
        const newMult = 1 + (js.speedStealStacks * SKILL_CONSTANTS.STEAL_SPEED_PCT) / 100;
        
        // Revert old & apply new speed multiplier
        js.speed = (js.speed / oldMult) * newMult;

        ctx.addFloatingText(char.x, char.y - 50, `💆‍♀️ 경락 흡수 (+${js.speedStealStacks}스택)`, '#ffb6c1', 1.3);
        ctx.addFloatingText(opponent.x, opponent.y - 50, `💆‍♀️ 이속 빼앗김 (-${SKILL_CONSTANTS.STEAL_SPEED_PCT}%)`, '#888888', 1.0);
        ctx.createParticle(opponent.x, opponent.y, '#ffb6c1', 3, 10);
        
        console.log(`💆‍♀️ [경락 마사지] 주연 -> ${opponent.name}의 속도 강탈 (스택: ${js.speedStealStacks}, 속도: ${js.speed})`);
        ctx.logMessage?.(`💆‍♀️ [경락 마사지] 주연 ➡️ ${opponent.name} 속도 강탈 (+${js.speedStealStacks}스택, 이속 상승)`, 'damage');
      }
    }
  },
  // #endregion COLLISION

  // ═══════════════════════════════════════════
  // #region RENDER — draw ampoule, masks, and stack counter
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const js = char as JuyeonState;
    const projectiles = js.juyeonProjectiles || [];

    // 1. Draw ampoule syringe projectiles
    projectiles.forEach((proj) => {
      canvasCtx.save();
      canvasCtx.fillStyle = '#ffb6c1';
      canvasCtx.shadowBlur = 8;
      canvasCtx.shadowColor = '#ffb6c1';
      canvasCtx.beginPath();
      canvasCtx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
      canvasCtx.fill();
      canvasCtx.restore();
    });

    // 2. Draw meridian massage stack counter
    if (js.speedStealStacks && js.speedStealStacks > 0) {
      canvasCtx.save();
      canvasCtx.fillStyle = '#ffb6c1';
      canvasCtx.font = 'bold 9px Outfit, sans-serif';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText(`💆‍♀️ x${js.speedStealStacks}`, char.x, char.y - currentRadius - 14);
      canvasCtx.restore();
    }

    // 3. Stun stars
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
