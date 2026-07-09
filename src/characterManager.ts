import type { CharacterConfig, CharacterState } from './characters/character.interface';
import { doyunConfig } from './characters/doyun';
import { jihoConfig } from './characters/jiho';
import { suConfig } from './characters/su';
import { chanikConfig } from './characters/chanik';
import { chanhwiConfig } from './characters/chanhwi';
import { nayutaConfig } from './characters/nayuta';
import { unheeConfig } from './characters/unhee';
import { dongjunConfig } from './characters/dongjun';
import { seyeonConfig } from './characters/seyeon';
import { pumanConfig } from './characters/puman';
import { eunsuConfig } from './characters/eunsu';
import { myeongseokConfig } from './characters/myeongseok';
import { jujuConfig } from './characters/juju';

// 이용 가능한 캐릭터 목록
export const availableCharacters: CharacterConfig[] = [
  doyunConfig,
  jihoConfig,
  suConfig,
  chanikConfig,
  chanhwiConfig,
  nayutaConfig,
  unheeConfig,
  dongjunConfig,
  seyeonConfig,
  pumanConfig,
  eunsuConfig,
  myeongseokConfig,
  jujuConfig
];

/**
 * 캐릭터 설정을 게임 런타임 상태 객체로 변환합니다.
 */
export function createCharacterState(
  config: CharacterConfig,
  index: number,
  total: number,
  canvasWidth: number,
  canvasHeight: number
): CharacterState {
  const radius = 30; // 캐릭터 구체 반지름

  // 겹치지 않게 원형 배치
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const spawnRadius = Math.min(canvasWidth, canvasHeight) * 0.35;
  const angle = (index / total) * Math.PI * 2;

  const x = centerX + Math.cos(angle) * spawnRadius;
  const y = centerY + Math.sin(angle) * spawnRadius;

  return {
    ...config,
    x,
    y,
    vx: 0,
    vy: 0,
    radius,
    hp: config.maxHp,
    skillGauge: 0,
    isDead: false,
    baseAttackCooldown: 0,
    skillCooldown: 0,
    skillActive: false,
    skillDurationLeft: 0,
    opacity: 1,
    damageTakenQueue: [],
    isTyping: false,
    typingTimeLeft: 0,
    isStunned: false,
    stunTimeLeft: 0,
    scaleMultiplier: 1,
    totalDamageDealt: 0,
    totalDamageTaken: 0
  };
}
