import type { CharacterState } from '../characters/character.interface';

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

    // 속도가 지나치게 떨어지는 것을 방지 (볼게임의 흥미 유지를 위해 최소 속도 보정)
    limitMinSpeed(c1);
    limitMinSpeed(c2);

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
  const maxLimit = baseDesiredSpeed * 1.5;

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
