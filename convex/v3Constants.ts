export const V3_CHARACTER_IDS = [
  "doyun",
  "jiho",
  "su",
  "chanik",
  "chanhwi",
  "nayuta",
  "unhee",
  "dongjun",
  "seyeon",
  "puman",
  "eunsu",
  "myeongseok",
  "juju",
  "juyeon",
  "sungjae",
  "mongshil",
  "seojun",
  "jiwoo",
  "junseok",
  "es",
] as const;

export const FIRST_DUNGEON_ID = "slime-meadow";
export const LABORATORY_DUNGEON_ID = "collapsed-laboratory";
export const DUNGEON_IDS = [FIRST_DUNGEON_ID, LABORATORY_DUNGEON_ID] as const;
export const MAX_CHARACTER_LEVEL = 30;
export const FIRST_DUNGEON_FIRST_CLEAR_EXPERIENCE = 450;
export const FIRST_DUNGEON_REPEAT_CLEAR_EXPERIENCE = 200;
export const LABORATORY_FIRST_CLEAR_EXPERIENCE = 600;
export const LABORATORY_REPEAT_CLEAR_EXPERIENCE = 300;

export type DungeonRewardConfig = {
  firstClearExperience: number;
  repeatClearExperience: number;
};

const DUNGEON_REWARD_CONFIGS: Record<(typeof DUNGEON_IDS)[number], DungeonRewardConfig> = {
  [FIRST_DUNGEON_ID]: {
    firstClearExperience: FIRST_DUNGEON_FIRST_CLEAR_EXPERIENCE,
    repeatClearExperience: FIRST_DUNGEON_REPEAT_CLEAR_EXPERIENCE,
  },
  [LABORATORY_DUNGEON_ID]: {
    firstClearExperience: LABORATORY_FIRST_CLEAR_EXPERIENCE,
    repeatClearExperience: LABORATORY_REPEAT_CLEAR_EXPERIENCE,
  },
};

export function getDungeonRewardConfig(dungeonId: (typeof DUNGEON_IDS)[number]): DungeonRewardConfig {
  return DUNGEON_REWARD_CONFIGS[dungeonId];
}

export function isDungeonId(dungeonId: string): dungeonId is (typeof DUNGEON_IDS)[number] {
  return (DUNGEON_IDS as readonly string[]).includes(dungeonId);
}

export function isV3CharacterId(characterId: string): boolean {
  return (V3_CHARACTER_IDS as readonly string[]).includes(characterId);
}

export function experienceRequiredForLevel(level: number): number {
  return 100 + (level - 1) * 25;
}

export function levelForExperience(experience: number): number {
  let level = 1;
  let consumedExperience = 0;

  while (level < MAX_CHARACTER_LEVEL) {
    const requiredExperience = experienceRequiredForLevel(level);
    if (experience < consumedExperience + requiredExperience) break;
    consumedExperience += requiredExperience;
    level += 1;
  }

  return level;
}

export function kstDate(timestamp: number): string {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestamp);
  const part = (type: string) => values.find((value) => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
