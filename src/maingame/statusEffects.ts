import type { CharacterState, CharacterStatusEffect } from '../characters/character.interface';

function timed(
  icon: string,
  label: string,
  timeLeft: number | undefined,
  color: string,
): CharacterStatusEffect {
  return {
    icon,
    label,
    timeLeft: Math.max(0, timeLeft ?? 0),
    duration: Math.max(1, timeLeft ?? 1),
    color,
  };
}

/** 전장 캔버스와 우측 HUD가 같은 순서·정보로 표시하는 현재 상태 목록. */
export function getCharacterStatusEffects(char: CharacterState): CharacterStatusEffect[] {
  return [
    ...(char.isStunned ? [timed('💫', '기절', char.stunTimeLeft, '#facc15')] : []),
    ...(char.isConfused ? [timed('🌀', '혼란', char.confusedTimeLeft, '#fb7185')] : []),
    ...(char.nayutaControlled ? [timed('⛓', '지배', char.nayutaControlTimeLeft, '#ef4444')] : []),
    ...(char.isPoisoned ? [timed('☠', '독', char.poisonTimeLeft, '#84cc16')] : []),
    ...(char.isImmune || char.isSuInvisible ? [timed('🛡', '무적', char.immuneTimeLeft, '#67e8f9')] : []),
    ...(char.statusIndicators ?? []),
    ...(char.getStatusEffects?.(char) ?? []),
  ].slice(0, 3);
}
