import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from '../character.interface';

// ═══════════════════════════════════════════
// #region CONSTANTS — balance tuning values
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  CONTROL_CHANCE: 0.4,
  CONTROL_DURATION: 10,
  CONTACT_PARTICLE_SIZE: 4,
  CONTACT_PARTICLE_LIFE: 15,
  CONTACT_TEXT_LIFE: 1.2,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region HELPERS
// ═══════════════════════════════════════════
function isSameTeam(source: CharacterState, target: CharacterState): boolean {
  return source.teamId !== undefined && source.teamId === target.teamId;
}

function isControlledBy(char: CharacterState, target: CharacterState): boolean {
  return target.nayutaControlled === true && target.nayutaControllerId === char.id;
}

function releaseDomination(target: CharacterState): void {
  target.nayutaControlled = false;
  target.nayutaControlTimeLeft = 0;
  target.nayutaControllerId = undefined;
}
// #endregion HELPERS

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const nayutaConfig: CharacterConfig = {
  id: 'nayuta',
  name: '나유타',
  maxHp: 140,
  speed: 1.5,
  attackPower: 11,
  baseAttackRange: 45,
  skillName: '지배 (Domination)',
  skillDescription: '스킬 지속 5초. 적과 접촉 시 40% 확률로 10초간 적을 "지배"합니다. 지배된 적은 스킬 게이지가 충전되지 않습니다. 스킬 사용 시 5초간 지배 대상에게 지속 대미지와 디버프를 주고, 스킬을 무효화합니다.',
  color: '#e52b50', // 체리 핑크
  skillChargeRate: 50, // 2초 쿨타임 (100 / 2 = 50)
  tier: 'B',
  role: 'Speedster',
  detailedDescription: '나유타는 텔레포트와 스킬 충전 봉쇄를 통해 특정 타겟을 집중 견제하고 마킹하는 기동형 공격수 캐릭터입니다. 적 타격 시 일정 확률로 대상을 지배하여 10초간 적의 스킬 게이지 충전을 완벽하게 틀어막고, 순간적인 텔레포트로 지배 대상을 추적해 차원 도약 피해와 디버프를 퍼부으며 상대 핵심 전력을 사전에 격살합니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — initiate domination on controlled targets
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = 5.0; // 5 seconds domination active duration

    ctx.addFloatingText(char.x, char.y - 60, '👁️ 지배!', '#e52b50', 1.5);
    console.log(`👁️ [스킬 발동] 나유타 -> 지배 가동! (5초간 대상 지속 대미지/디버프 및 스킬 봉인)`);
    ctx.logMessage?.(`👁️ [스킬 발동] 나유타 ➡️ 지배 개시! 지배 대상들 5초간 디버프 및 조종 가동`, 'skill');

    // Instantly cancel active skills and reset gauges of dominated targets
    const chars = ctx.characters;
    chars.forEach((enemy) => {
      if (enemy.isDead || enemy.id === char.id) return;
      if (isSameTeam(char, enemy)) {
        // Defensive cleanup for any legacy ally-domination state.
        releaseDomination(enemy);
        return;
      }
      if (isControlledBy(char, enemy)) {
        if (enemy.skillActive) {
          enemy.skillActive = false;
          enemy.skillDurationLeft = 0;
          console.log(`🚫 [스킬 강제 소멸] 나유타 -> ${enemy.name}의 활성화된 스킬을 강제 차단했습니다.`);
          ctx.logMessage?.(`🚫 [스킬 강제 차단] 나유타 ➡️ ${enemy.name}의 활성화된 스킬 차단 및 게이지 리셋`, 'skill');
        }
        enemy.skillGauge = 0; // reset gauge
        ctx.createExplosion(enemy.x, enemy.y, '#ff0033', 8);
        ctx.addFloatingText(enemy.x, enemy.y - 45, '🚫 SKILL CANCEL!', '#ff0033', 1.5);
      }
    });
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region COLLISION — apply domination on contact
  // ═══════════════════════════════════════════
  onCollisionWithTarget(char: CharacterState, target: CharacterState, ctx: CharacterBehaviorContext) {
    if (target.id === char.id || target.isDead || target.nayutaControlled) return;
    // Free-for-all characters have no team. In team and boss modes, allies
    // must never be selected for domination.
    if (isSameTeam(char, target)) return;
    if (Math.random() >= SKILL_CONSTANTS.CONTROL_CHANCE) return;

    if (!ctx.applyDomination(char, target, SKILL_CONSTANTS.CONTROL_DURATION)) return;
    ctx.createParticle(target.x, target.y, char.color, SKILL_CONSTANTS.CONTACT_PARTICLE_SIZE, SKILL_CONSTANTS.CONTACT_PARTICLE_LIFE);
    ctx.addFloatingText(target.x, target.y - 45, '👁️ 지배당함!', char.color, SKILL_CONSTANTS.CONTACT_TEXT_LIFE);

    if (target.skillActive) {
      target.skillActive = false;
      target.skillDurationLeft = 0;
      console.log(`🚫 [지배 스킬 취소] ${target.name}의 스킬이 지배로 인해 즉시 취소되었습니다.`);
      ctx.logMessage?.(`🚫 [지배 스킬 취소] ${target.name}의 스킬이 즉시 캔슬되었습니다.`, 'skill');
    }
    target.skillGauge = 0;
    console.log(`👁️ [지배 수립] 나유타 -> ${target.name} | ${SKILL_CONSTANTS.CONTROL_DURATION}초 지배 개시`);
    ctx.logMessage?.(`👁️ [지배 수립] 나유타 ➡️ ${target.name} | ${SKILL_CONSTANTS.CONTROL_DURATION}초간 스킬 게이지 충전 불가 및 조종`, 'skill');
  },
  // #endregion COLLISION

  // ═══════════════════════════════════════════
  // #region UPDATE — control dominated enemies, deal DOT, handle timers
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    const chars = ctx.characters;
    (char as any)._charactersRef = chars; // save reference for renderer

    // A. Update domination duration timer on enemies
    chars.forEach((enemy) => {
      if (enemy.isDead || enemy.id === char.id) return;
      if (isSameTeam(char, enemy)) {
        releaseDomination(enemy);
        return;
      }
      if (isControlledBy(char, enemy)) {
        if (enemy.nayutaControlTimeLeft !== undefined) {
          enemy.nayutaControlTimeLeft -= dt;
          if (enemy.nayutaControlTimeLeft <= 0) {
            releaseDomination(enemy);
            ctx.addFloatingText(enemy.x, enemy.y - 25, '해제', '#00ffcc', 1.0);
            console.log(`👁️ [지배 자연해제] ${enemy.name}의 지배 상태가 10초 경과되어 자연 해제되었습니다.`);
          }
        }
      }
    });

    // B. Domination skill active phase
    if (char.skillActive) {
      char.skillDurationLeft -= dt;

      // Dominated enemies control logic
      chars.forEach((enemy) => {
        if (enemy.isDead || enemy.id === char.id) return;
        if (isSameTeam(char, enemy)) {
          // 지배 상태가 남아 있어도 같은 팀에는 디버프·조종을 적용하지 않는다.
          releaseDomination(enemy);
          return;
        }
        if (isControlledBy(char, enemy)) {
          // 1. Maintain skill cancellation
          if (enemy.skillActive) {
            enemy.skillActive = false;
            enemy.skillDurationLeft = 0;
          }
          enemy.skillGauge = 0; // force gauge to 0

          // 2. DOT Damage (8 damage every 0.5 seconds)
          if (!(enemy as any)._lastDominationTick) (enemy as any)._lastDominationTick = 0;
          const tickNow = Date.now();
          if (tickNow - (enemy as any)._lastDominationTick > 500) {
            (enemy as any)._lastDominationTick = tickNow;
            ctx.dealDamage(char, enemy, 8, '👁️ 지배');
            console.log(`👁️ [지배 데미지] 나유타 -> ${enemy.name} | 8 데미지`);
          }

          // 3. Control movement: pursue closest non-dominated enemy
          let closestTarget: CharacterState | null = null;
          let minDist = Infinity;

          chars.forEach((other) => {
            if (other.isDead || other.id === char.id || other.id === enemy.id || other.nayutaControlled) return;
            // A dominated enemy must never target Nayuta or Nayuta's allies.
            // It is forced to turn on its original side instead.
            if (isSameTeam(char, other)) return;
            const dist = Math.hypot(other.x - enemy.x, other.y - enemy.y);
            if (dist < minDist) {
              minDist = dist;
              closestTarget = other;
            }
          });

          // Move towards target at high speed (7.5px/frame)
          if (closestTarget) {
            const kAngle = Math.atan2((closestTarget as CharacterState).y - enemy.y, (closestTarget as CharacterState).x - enemy.x);
            enemy.vx = Math.cos(kAngle) * 7.5;
            enemy.vy = Math.sin(kAngle) * 7.5;

            // Contact explosion damage
            const currentMinDist = enemy.radius + (closestTarget as CharacterState).radius + 6;
            if (minDist <= currentMinDist) {
              const now = Date.now();
              const lastDmg = enemy.lastContactDmgTime || 0;
              if (now - lastDmg > 800) {
                enemy.lastContactDmgTime = now;
                // Deal damage as Nayuta so team-damage protection does not cancel
                // a controlled enemy's attack against its original allies.
                ctx.dealDamage(char, closestTarget, 25, '👁️ 지배 돌진!');
                ctx.createExplosion(enemy.x, enemy.y, '#e52b50', 16);
                console.log(`👁️ [지배 돌격] ${enemy.name} -> ${(closestTarget as CharacterState).name} 충돌! 대미지: 25`);
                ctx.logMessage?.(`👁️ [지배 돌격] 조종된 ${enemy.name} ➡️ ${(closestTarget as CharacterState).name} 충돌 (25 피해)`, 'skill');
              }
            }
          }
        }
      });

      // Complete skill duration
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        
        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed;
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;
      }
    } else {
      // Stun handling
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
    }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DEATH — release all controlled enemies on death
  // ═══════════════════════════════════════════
  onDeath(char: CharacterState, _killer: CharacterState, ctx: CharacterBehaviorContext) {
    // Release all targets dominated by Nayuta
    ctx.characters.forEach((enemy) => {
      if (isControlledBy(char, enemy)) {
        releaseDomination(enemy);
        ctx.addFloatingText(enemy.x, enemy.y - 25, '해제 (나유타 사망)', '#00ffcc', 1.0);
        console.log(`👁️ [지배 해제] 나유타 사망으로 인해 ${enemy.name}의 지배가 해제되었습니다.`);
      }
    });
  },
  // #endregion DEATH

  // ═══════════════════════════════════════════
  // #region RENDER — collar effects on targets, stun stars
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const chars = (char as any)._charactersRef as CharacterState[] || [];

    chars.forEach((enemy) => {
       if (enemy.isDead || enemy.id === char.id) return;

       // Red pulsing collar rings around controlled targets
       if (isControlledBy(char, enemy)) {
          canvasCtx.save();
          canvasCtx.strokeStyle = 'rgba(229, 43, 80, 0.75)';
          canvasCtx.lineWidth = 3.0;
          const collarPulse = enemy.radius + 6 + Math.abs(Math.sin(Date.now() / 120)) * 4;
          canvasCtx.beginPath();
          canvasCtx.arc(enemy.x, enemy.y, collarPulse, 0, Math.PI * 2);
          canvasCtx.stroke();
          canvasCtx.restore();
       }
    });

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
