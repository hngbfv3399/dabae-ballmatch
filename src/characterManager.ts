import type { CharacterConfig, CharacterState } from './characters/character.interface';
import { doyunConfig } from './characters/doyun/normal';
import { jihoConfig } from './characters/jiho/normal';
import { suConfig } from './characters/su/normal';
import { chanikConfig } from './characters/chanik/normal';
import { chanhwiConfig } from './characters/chanhwi/normal';
import { nayutaConfig } from './characters/nayuta/normal';
import { unheeConfig } from './characters/unhee/normal';
import { dongjunConfig } from './characters/dongjun/normal';
import { seyeonConfig } from './characters/seyeon/normal';
import { pumanConfig } from './characters/puman/normal';
import { eunsuConfig } from './characters/eunsu/normal';
import { myeongseokConfig } from './characters/myeongseok/normal';
import { jujuConfig } from './characters/juju/normal';
import { juyeonConfig } from './characters/juyeon/normal';
import { sungjaeConfig } from './characters/sungjae/normal';
import { mongshilConfig } from './characters/mongshil/normal';
import { seojunConfig } from './characters/seojun/normal';
import { jiwooConfig } from './characters/jiwoo/normal';
import { junseokConfig } from './characters/junseok/normal';
import { esConfig } from './characters/es/normal';
import { jujuSingularityBossConfig } from './characters/juju/boss';

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
  jujuConfig,
  juyeonConfig,
  sungjaeConfig,
  mongshilConfig,
  seojunConfig,
  jiwooConfig,
  junseokConfig,
  esConfig
];

/**
 * Bosses are independently authored characters. Never derive one by changing
 * a normal character's runtime stats; register `characters/<name>/boss.ts`
 * here once its mechanics are implemented.
 */
export const availableBossCharacters: CharacterConfig[] = [jujuSingularityBossConfig];

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
  const radius = config.radius ?? 35; // 캐릭터 구체 반지름

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
    defenseShield: Math.max(0, Math.round(config.defense ?? 0)),
    maxDefenseShield: Math.max(0, Math.round(config.defense ?? 0)),
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
    totalDamageTaken: 0,
    totalCcDuration: 0,
    reflectedDamage: 0,
    objectiveContribution: 0,
    bossSurvivalTime: 0,
    kills: 0,
    rank: 0,
    isMvp: false,
    mvpScore: 0,
    deathAnimationTime: 0,
  };
}
