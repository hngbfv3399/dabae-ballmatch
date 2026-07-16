import { mutation, query } from "./_generated/server";

type Archetype = "contact" | "projectile" | "hybrid" | "control" | "summoner";
type AttackType = "contact" | "projectile" | "hybrid";
type Seed = {
  characterId: string; archetype: Archetype; basicAttackType: AttackType;
  maxHp: number; attackPower: number; speed: number; defense: number; luck: number;
  attackInterval: number; attackRangeRatio: number; projectileSpeed?: number;
  traits: Array<{ label: string; value: string }>; isActive: boolean;
};

const traits = (combat: string, core: string, utility: string) => [
  { label: "전투 방식", value: combat }, { label: "핵심 능력", value: core }, { label: "특성", value: utility },
];

// 캐릭터 파일의 고유 행동 훅과 분리된, 서버 기준 밸런스 원본이다.
const CHARACTER_PROFILES: Seed[] = [
  { characterId: "doyun", archetype: "contact", basicAttackType: "contact", maxHp: 150, attackPower: 13, speed: 1.2, defense: 6, luck: 10, attackInterval: 1.0, attackRangeRatio: .035, traits: traits("돌진 충돌", "착지 폭발", "보호막 흡수"), isActive: true },
  { characterId: "jiho", archetype: "contact", basicAttackType: "contact", maxHp: 160, attackPower: 10, speed: 1.4, defense: 8, luck: 12, attackInterval: .8, attackRangeRatio: .05, traits: traits("근접 기술 타격", "컴파일 강화", "버그·기절"), isActive: true },
  { characterId: "su", archetype: "projectile", basicAttackType: "projectile", maxHp: 140, attackPower: 20, speed: 1.5, defense: 3, luck: 35, attackInterval: 1.8, attackRangeRatio: .36, projectileSpeed: 620, traits: traits("장거리 저격", "헤드샷", "은신"), isActive: true },
  { characterId: "chanik", archetype: "control", basicAttackType: "contact", maxHp: 170, attackPower: 14, speed: 1.3, defense: 10, luck: 15, attackInterval: 1.2, attackRangeRatio: .09, traits: traits("중거리 포격", "전장 폭격", "광역 감속"), isActive: true },
  { characterId: "chanhwi", archetype: "control", basicAttackType: "contact", maxHp: 70, attackPower: 25, speed: 1.6, defense: 2, luck: 14, attackInterval: 1.0, attackRangeRatio: .10, traits: traits("중거리 충격파", "광역 폭발", "낮은 체력"), isActive: true },
  { characterId: "nayuta", archetype: "control", basicAttackType: "contact", maxHp: 140, attackPower: 11, speed: 1.5, defense: 5, luck: 20, attackInterval: 1.15, attackRangeRatio: .055, traits: traits("근접 제어", "지배", "고속 추격"), isActive: true },
  { characterId: "unhee", archetype: "contact", basicAttackType: "contact", maxHp: 150, attackPower: 16, speed: 1.0, defense: 9, luck: 8, attackInterval: .9, attackRangeRatio: .035, traits: traits("근접 탱커", "벌크업", "피해 감소"), isActive: true },
  { characterId: "dongjun", archetype: "contact", basicAttackType: "contact", maxHp: 150, attackPower: 12, speed: 1.0, defense: 7, luck: 18, attackInterval: 1.1, attackRangeRatio: .05, traits: traits("근접 성장", "계급 승급", "공격·기동 증가"), isActive: true },
  { characterId: "seyeon", archetype: "control", basicAttackType: "contact", maxHp: 130, attackPower: 14, speed: 1.3, defense: 7, luck: 22, attackInterval: 1.3, attackRangeRatio: .07, traits: traits("근접 오라", "유혹·끌어당김", "피해 면역"), isActive: true },
  { characterId: "puman", archetype: "projectile", basicAttackType: "projectile", maxHp: 145, attackPower: 15, speed: 1.25, defense: 5, luck: 16, attackInterval: 1.1, attackRangeRatio: .20, projectileSpeed: 430, traits: traits("독성 중거리", "맹독 중첩", "중첩 소비 회복"), isActive: true },
  { characterId: "eunsu", archetype: "summoner", basicAttackType: "contact", maxHp: 130, attackPower: 16, speed: 1.3, defense: 5, luck: 25, attackInterval: 1.3, attackRangeRatio: .055, traits: traits("근접·소환", "도플갱어", "이중 타격·기절"), isActive: true },
  { characterId: "myeongseok", archetype: "hybrid", basicAttackType: "hybrid", maxHp: 145, attackPower: 14, speed: 1.2, defense: 6, luck: 9, attackInterval: 1.0, attackRangeRatio: .14, projectileSpeed: 480, traits: traits("볼링공 혼합", "벽 반사", "다단 타격"), isActive: true },
  { characterId: "juju", archetype: "control", basicAttackType: "contact", maxHp: 135, attackPower: 14, speed: 1.25, defense: 6, luck: 28, attackInterval: 1.4, attackRangeRatio: .11, traits: traits("중거리 제어", "블랙홀", "흡입·기절"), isActive: true },
  { characterId: "juyeon", archetype: "projectile", basicAttackType: "projectile", maxHp: 135, attackPower: 12, speed: 1.3, defense: 5, luck: 20, attackInterval: 1.25, attackRangeRatio: .24, projectileSpeed: 470, traits: traits("지원 투사체", "앰플", "회복·감속"), isActive: true },
  { characterId: "sungjae", archetype: "hybrid", basicAttackType: "hybrid", maxHp: 240, attackPower: 0, speed: 1.15, defense: 10, luck: 12, attackInterval: .9, attackRangeRatio: .18, projectileSpeed: 560, traits: traits("메카·파일럿 전환", "레일건", "빔 세이버·권총"), isActive: true },
  { characterId: "mongshil", archetype: "projectile", basicAttackType: "projectile", maxHp: 145, attackPower: 13, speed: 1.35, defense: 5, luck: 18, attackInterval: 1.2, attackRangeRatio: .26, projectileSpeed: 440, traits: traits("독병 투척", "독성 잔향", "지속 장판"), isActive: true },
  { characterId: "seojun", archetype: "contact", basicAttackType: "contact", maxHp: 150, attackPower: 15, speed: 1.55, defense: 5, luck: 22, attackInterval: .85, attackRangeRatio: .035, traits: traits("근접 기동", "시공간 역행", "회피·되감기"), isActive: true },
  { characterId: "jiwoo", archetype: "control", basicAttackType: "contact", maxHp: 130, attackPower: 12, speed: 1.4, defense: 7, luck: 15, attackInterval: 1.15, attackRangeRatio: .06, traits: traits("근접 기만", "현실 균열", "환영·반사"), isActive: true },
  { characterId: "junseok", archetype: "control", basicAttackType: "contact", maxHp: 150, attackPower: 14, speed: 1.25, defense: 7, luck: 17, attackInterval: 1.0, attackRangeRatio: .12, traits: traits("중거리 전술", "예측 폭발", "넉백·감속"), isActive: true },
  { characterId: "es", archetype: "projectile", basicAttackType: "projectile", maxHp: 125, attackPower: 18, speed: 1.45, defense: 4, luck: 30, attackInterval: 1.35, attackRangeRatio: .28, projectileSpeed: 410, traits: traits("폭발 투척", "부착 수류탄", "폭탄 악마"), isActive: true },
];

const ARENAS = [
  { arenaId: "training-ground", width: 800, height: 600, backgroundColor: "#0b1020", isActive: true },
  { arenaId: "solo-large-arena", width: 1200, height: 800, backgroundColor: "#0b1020", isActive: true },
  { arenaId: "team-deathmatch", width: 1100, height: 700, backgroundColor: "#101225", isActive: true },
  { arenaId: "team-control", width: 1100, height: 700, backgroundColor: "#151029", isActive: true },
  { arenaId: "team-relic-rift", width: 1200, height: 700, backgroundColor: "#161126", isActive: true },
  { arenaId: "juju-singularity", width: 1200, height: 800, backgroundColor: "#02030b", isActive: true },
];

export const ensureInitialCombatCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now(); let profilesSeeded = 0; let arenasSeeded = 0;
    for (const profile of CHARACTER_PROFILES) {
      const existing = await ctx.db.query("characterCombatCatalog").withIndex("by_characterId", (q) => q.eq("characterId", profile.characterId)).unique();
      if (existing) await ctx.db.patch(existing._id, { ...profile, updatedAt: now });
      else { await ctx.db.insert("characterCombatCatalog", { ...profile, updatedAt: now }); profilesSeeded += 1; }
    }
    for (const arena of ARENAS) {
      const existing = await ctx.db.query("arenaCombatCatalog").withIndex("by_arenaId", (q) => q.eq("arenaId", arena.arenaId)).unique();
      if (existing) await ctx.db.patch(existing._id, { ...arena, updatedAt: now });
      else { await ctx.db.insert("arenaCombatCatalog", { ...arena, updatedAt: now }); arenasSeeded += 1; }
    }
    return { profilesSeeded, arenasSeeded };
  },
});

export const listActiveCharacterCombatProfiles = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("characterCombatCatalog").withIndex("by_characterId").collect(),
});

export const listActiveArenaCombatCatalog = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("arenaCombatCatalog").withIndex("by_arenaId").collect(),
});
