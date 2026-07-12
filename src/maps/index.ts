import { trainingGroundArena } from './trainingGround';
import { soloLargeArena } from './soloLargeArena';
import { teamControlArena, teamDeathmatchArena, teamRelicArena } from './teamArenas';
import { jujuSingularityArena } from './jujuSingularityArena';
import type { ArenaConfig, TeamGameType } from './arena.interface';

export const availableArenas = [trainingGroundArena, soloLargeArena, teamDeathmatchArena, teamControlArena, teamRelicArena, jujuSingularityArena];
export const defaultArena = trainingGroundArena;

export function getArenaForMatch(mode: 'solo' | 'team' | 'boss', playerCount: number, teamGameType: TeamGameType): ArenaConfig {
  if (mode === 'solo') return playerCount >= 4 ? soloLargeArena : trainingGroundArena;
  if (mode === 'team') {
    if (teamGameType === 'control') return teamControlArena;
    if (teamGameType === 'relic') return teamRelicArena;
    return teamDeathmatchArena;
  }
  return jujuSingularityArena;
}

export type { ArenaConfig, TeamGameType } from './arena.interface';
