import type { CharacterState } from '../characters/character.interface';

const PHYSICS_TUNING = {
  WALL_DEFLECTION_RADIANS: 0.14,
  CHARACTER_TANGENT_DEFLECTION_RATIO: 0.12,
  MAX_KNOCKBACK_SPEED_MULTIPLIER: 4,
  INERTIA_VELOCITY_PRESERVATION: 0.88,
};

const PHYSICS_DEBUG_LOGGING = true;

function getVelocityDebug(char: CharacterState) {
  const speed = Math.hypot(char.vx, char.vy);
  const angle = (Math.atan2(char.vy, char.vx) * 180) / Math.PI;
  return { speed: speed.toFixed(2), angle: angle.toFixed(1) };
}

function rotateVelocity(char: CharacterState, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const vx = char.vx;
  const vy = char.vy;
  char.vx = vx * cos - vy * sin;
  char.vy = vx * sin + vy * cos;
}

/**
 * 캐릭터가 벽에 충돌했는지 감지하고 튕겨 나가도록 처리합니다.
 */
export function checkWallCollision(
  char: CharacterState,
  width: number,
  height: number,
  restitution: number = 1.0
): boolean {
  let collided = false;
  const beforeCollision = getVelocityDebug(char);

  // 좌우 벽 충돌
  if (char.x - char.radius < 0) {
    char.x = char.radius;
    char.vx = -char.vx * restitution;
    collided = true;
  } else if (char.x + char.radius > width) {
    char.x = width - char.radius;
    char.vx = -char.vx * restitution;
    collided = true;
  }

  // 상하 벽 충돌
  if (char.y - char.radius < 0) {
    char.y = char.radius;
    char.vy = -char.vy * restitution;
    collided = true;
  } else if (char.y + char.radius > height) {
    char.y = height - char.radius;
    char.vy = -char.vy * restitution;
    collided = true;
  }

  // 완전 축 반사만 반복되면 궤적이 지나치게 직선적이므로, 벽 충돌마다 미세한 편향을 준다.
  if (collided) {
    const deflection = (Math.random() - 0.5) * 2 * PHYSICS_TUNING.WALL_DEFLECTION_RADIANS;
    rotateVelocity(char, deflection);
    if (PHYSICS_DEBUG_LOGGING) {
      const afterCollision = getVelocityDebug(char);
      console.log(`🧱 [벽 반사] ${char.name} | 속도 ${beforeCollision.speed} → ${afterCollision.speed} | 각도 ${beforeCollision.angle}° → ${afterCollision.angle}°`);
    }
  }

  return collided;
}

/**
 * 두 캐릭터 간 탄성 충돌을 계산하고 속도와 위치를 업데이트합니다.
 * 충돌 시 true를 반환하고, 기본 물리 충돌 이벤트 콜백을 실행할 수 있습니다.
 */
export function resolveCollision(
  c1: CharacterState,
  c2: CharacterState,
  restitution: number = 1.0
): boolean {
  if (c1.isDead || c2.isDead) return false;

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = c1.radius + c2.radius;

  if (distance >= minDistance) {
    return false; // 충돌하지 않음
  }
  const c1Before = getVelocityDebug(c1);
  const c2Before = getVelocityDebug(c2);
  const c1VelocityBefore = { vx: c1.vx, vy: c1.vy };
  const c2VelocityBefore = { vx: c2.vx, vy: c2.vy };
  const c1HasInertia = (c1.knockbackInertiaLeft ?? 0) > 0;
  const c2HasInertia = (c2.knockbackInertiaLeft ?? 0) > 0;

  // 1. 중첩 해결 (Overlap resolution)
  // 캐릭터들이 서로 겹쳐서 끼는 현상을 방지합니다.
  const overlap = minDistance - distance;
  // 각 캐릭터를 서로 반대 방향으로 절반씩 밀어냄
  const nx = dx / distance;
  const ny = dy / distance;

  c1.x -= nx * (overlap / 2);
  c1.y -= ny * (overlap / 2);
  c2.x += nx * (overlap / 2);
  c2.y += ny * (overlap / 2);

  // 2. 탄성 충돌 물리 계산 (Elastic Collision)
  // 상대 속도 구하기
  const kx = c1.vx - c2.vx;
  const ky = c1.vy - c2.vy;

  // 충돌 벡터의 내적 구하기 (접선 성분 분리)
  const vn = kx * nx + ky * ny;

  // 두 캐릭터가 서로 다가오고 있는 경우에만 속도를 갱신 (이미 멀어지는 중이면 패스)
  if (vn > 0) {
    // 질량이 동일하다고 가정 (m1 = m2)
    // 충격량 impulse = (1 + restitution) * vn / (1/m1 + 1/m2) = (1 + restitution) * vn / 2
    const impulse = ((1 + restitution) * vn) / 2;

    c1.vx -= impulse * nx;
    c1.vy -= impulse * ny;
    c2.vx += impulse * nx;
    c2.vy += impulse * ny;

    // 접선 방향의 미세한 충격을 더해 공처럼 자연스러운 비스듬한 반사 궤적을 만든다.
    const tangentX = -ny;
    const tangentY = nx;
    const tangentImpulse = Math.abs(vn) * PHYSICS_TUNING.CHARACTER_TANGENT_DEFLECTION_RATIO * (Math.random() < 0.5 ? -1 : 1);
    c1.vx += tangentX * tangentImpulse;
    c1.vy += tangentY * tangentImpulse;
    c2.vx -= tangentX * tangentImpulse;
    c2.vy -= tangentY * tangentImpulse;

    if (c1HasInertia && !c2HasInertia) {
      c1.vx = c1VelocityBefore.vx * PHYSICS_TUNING.INERTIA_VELOCITY_PRESERVATION + c1.vx * (1 - PHYSICS_TUNING.INERTIA_VELOCITY_PRESERVATION);
      c1.vy = c1VelocityBefore.vy * PHYSICS_TUNING.INERTIA_VELOCITY_PRESERVATION + c1.vy * (1 - PHYSICS_TUNING.INERTIA_VELOCITY_PRESERVATION);
    } else if (c2HasInertia && !c1HasInertia) {
      c2.vx = c2VelocityBefore.vx * PHYSICS_TUNING.INERTIA_VELOCITY_PRESERVATION + c2.vx * (1 - PHYSICS_TUNING.INERTIA_VELOCITY_PRESERVATION);
      c2.vy = c2VelocityBefore.vy * PHYSICS_TUNING.INERTIA_VELOCITY_PRESERVATION + c2.vy * (1 - PHYSICS_TUNING.INERTIA_VELOCITY_PRESERVATION);
    }

    // 속도가 지나치게 떨어지는 것을 방지 (볼게임의 흥미 유지를 위해 최소 속도 보정)
    if (!c1HasInertia) limitMinSpeed(c1);
    if (!c2HasInertia) limitMinSpeed(c2);

    if (PHYSICS_DEBUG_LOGGING) {
      const c1After = getVelocityDebug(c1);
      const c2After = getVelocityDebug(c2);
      console.log(`💥 [캐릭터 충돌] ${c1.name} | 속도 ${c1Before.speed} → ${c1After.speed}, 각도 ${c1Before.angle}° → ${c1After.angle}° | ${c2.name} | 속도 ${c2Before.speed} → ${c2After.speed}, 각도 ${c2Before.angle}° → ${c2After.angle}°`);
    }

    return true;
  }

  return false;
}

/**
 * 캐릭터의 속도가 너무 빠르거나 너무 느려지지 않도록 속도 제한을 둡니다.
 */
export function limitMinSpeed(char: CharacterState) {
  const currentSpeed = Math.hypot(char.vx, char.vy);
  // 속도 가중치는 캐릭터 속도 스탯(2.2, 1.1 등)에 비례
  const baseDesiredSpeed = 3.5 * char.speed; 
  const minLimit = baseDesiredSpeed * 0.8;
  const maxLimit = baseDesiredSpeed * PHYSICS_TUNING.MAX_KNOCKBACK_SPEED_MULTIPLIER;

  if (currentSpeed < minLimit) {
    // 최소 속도 보장
    const ratio = minLimit / (currentSpeed || 1);
    char.vx *= ratio;
    char.vy *= ratio;
  } else if (currentSpeed > maxLimit) {
    // 최대 속도 제어
    const ratio = maxLimit / currentSpeed;
    char.vx *= ratio;
    char.vy *= ratio;
  }
}
