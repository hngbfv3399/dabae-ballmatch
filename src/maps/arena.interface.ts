export type TeamGameType = 'deathmatch' | 'control' | 'relic';

export interface ArenaConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  teamGameType?: TeamGameType;
}
