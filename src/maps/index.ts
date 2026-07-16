import { trainingGroundArena } from './trainingGround';
import { soloLargeArena } from './soloLargeArena';
import { teamControlArena, teamDeathmatchArena, teamRelicArena } from './teamArenas';
import { jujuSingularityArena } from './jujuSingularityArena';
import type { ArenaConfig, TeamGameType } from './arena.interface';

export const availableArenas = [trainingGroundArena, soloLargeArena, teamDeathmatchArena, teamControlArena, teamRelicArena, jujuSingularityArena];
export const defaultArena = trainingGroundArena;
const remoteArenaOverrides = new Map<string, Pick<ArenaConfig, 'width' | 'height' | 'backgroundColor'>>();

export function applyRemoteArenaCatalog(entries: Array<{ arenaId: string; width: number; height: number; backgroundColor: string }>) {
  remoteArenaOverrides.clear();
  entries.forEach((entry) => remoteArenaOverrides.set(entry.arenaId, entry));
}

function resolveArena(arena: ArenaConfig): ArenaConfig {
  const override = remoteArenaOverrides.get(arena.id);
  return override ? { ...arena, ...override } : arena;
}

export function getArenaForMatch(mode: 'solo' | 'team' | 'boss', playerCount: number, teamGameType: TeamGameType): ArenaConfig {
  if (mode === 'solo') return resolveArena(playerCount >= 4 ? soloLargeArena : trainingGroundArena);
  if (mode === 'team') {
    if (teamGameType === 'control') return resolveArena(teamControlArena);
    if (teamGameType === 'relic') return resolveArena(teamRelicArena);
    return resolveArena(teamDeathmatchArena);
  }
  return resolveArena(jujuSingularityArena);
}

export type { ArenaConfig, TeamGameType } from './arena.interface';
