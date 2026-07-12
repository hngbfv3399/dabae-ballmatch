import type { ArenaConfig } from './arena.interface';

export const teamDeathmatchArena: ArenaConfig = {
  id: 'team-deathmatch', name: '대칭 격전장', width: 1100, height: 700,
  backgroundColor: '#101225', teamGameType: 'deathmatch',
};

export const teamControlArena: ArenaConfig = {
  id: 'team-control', name: '중앙 점령지', width: 1100, height: 700,
  backgroundColor: '#151029', teamGameType: 'control',
};

export const teamRelicArena: ArenaConfig = {
  id: 'team-relic-rift', name: '보석 균열지', width: 1200, height: 700,
  backgroundColor: '#161126', teamGameType: 'relic',
};
