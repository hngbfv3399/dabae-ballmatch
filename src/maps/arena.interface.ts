export type TeamGameType = 'deathmatch' | 'control' | 'siege';

export interface ArenaConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  teamGameType?: TeamGameType;
}
