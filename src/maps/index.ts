import { trainingGroundArena } from './trainingGround';
import { soloLargeArena } from './soloLargeArena';
import { teamControlArena, teamDeathmatchArena, teamSiegeArena } from './teamArenas';
import { jujuSingularityArena } from './jujuSingularityArena';
import type { ArenaConfig, TeamGameType } from './arena.interface';

export const availableArenas = [trainingGroundArena, soloLargeArena, teamDeathmatchArena, teamControlArena, teamSiegeArena, jujuSingularityArena];
export const defaultArena = trainingGroundArena;

export function getArenaForMatch(mode: 'solo' | 'team' | 'boss', playerCount: number, teamGameType: TeamGameType): ArenaConfig {
  if (mode === 'solo') return playerCount >= 4 ? soloLargeArena : trainingGroundArena;
  if (mode === 'team') {
    if (teamGameType === 'control') return teamControlArena;
    if (teamGameType === 'siege') return teamSiegeArena;
    return teamDeathmatchArena;
  }
  return jujuSingularityArena;
}

export type { ArenaConfig, TeamGameType } from './arena.interface';
