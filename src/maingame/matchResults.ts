import type { CharacterState } from "../characters/character.interface";

export interface MatchResultSummary {
  rankedCharacters: CharacterState[];
  mvp: CharacterState | null;
}

/**
 * Computes match-wide results independently from rendering and the game loop.
 * Clones and practice dummies never appear in rankings or persistent results.
 */
export function finalizeMatchResults(
  characters: CharacterState[],
  eliminationOrder: readonly string[],
): MatchResultSummary {
  const realCharacters = characters.filter(
    (character) => !character.id.includes("eunsu_clone") && character.id !== "dummy",
  );
  const eliminatedLastFirst = [...eliminationOrder].reverse();
  const alive = realCharacters
    .filter((character) => !character.isDead)
    .sort((a, b) => b.hp - a.hp || (b.totalDamageDealt ?? 0) - (a.totalDamageDealt ?? 0));
  const dead = realCharacters
    .filter((character) => character.isDead)
    .sort((a, b) => {
      const aIndex = eliminatedLastFirst.indexOf(a.id);
      const bIndex = eliminatedLastFirst.indexOf(b.id);
      return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
        (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
    });
  const rankedCharacters = [...alive, ...dead];

  rankedCharacters.forEach((character, index) => {
    character.rank = index + 1;
    character.mvpScore = (character.totalDamageDealt ?? 0) + character.kills * 150 + (character.isDead ? 0 : 100);
  });

  const mvp = rankedCharacters.reduce<CharacterState | null>(
    (currentMvp, character) => !currentMvp || character.mvpScore > currentMvp.mvpScore ? character : currentMvp,
    null,
  );
  rankedCharacters.forEach((character) => {
    character.isMvp = character.id === mvp?.id;
  });
  return { rankedCharacters, mvp };
}
