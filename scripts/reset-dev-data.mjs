import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEV_DEPLOYMENT = "curious-perch-72";
const TEST_CLIENT_ID = "dev-virtual-client";
const SEASON_EPOCH_MS = Date.parse("2026-07-13T00:00:00+09:00");
const SEASON_DURATION_MS = 56 * 24 * 60 * 60 * 1000;

if (!process.argv.includes("--confirm-dev-reset")) {
  throw new Error("Refusing to reset data. Run: npm run dev:reset-data -- --confirm-dev-reset");
}

const envLocal = readFileSync(".env.local", "utf8");
if (!envLocal.includes(`CONVEX_DEPLOYMENT=dev:${DEV_DEPLOYMENT}`)) {
  throw new Error(`.env.local must explicitly target dev:${DEV_DEPLOYMENT}.`);
}

function kstDate(timestamp) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(timestamp);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function experienceAtLevelStart(level) {
  let total = 0;
  for (let current = 1; current < level; current += 1) total += 100 + (current - 1) * 25;
  return total;
}

function currentSeason(now) {
  const index = Math.max(0, Math.floor((now - SEASON_EPOCH_MS) / SEASON_DURATION_MS));
  const startedAt = SEASON_EPOCH_MS + index * SEASON_DURATION_MS;
  return { seasonId: `v3-s${index + 1}`, startedAt, endsAt: startedAt + SEASON_DURATION_MS };
}

function writeJsonLines(root, table, records) {
  if (records.length === 0) return;
  const tableDirectory = join(root, table);
  mkdirSync(tableDirectory, { recursive: true });
  writeFileSync(join(tableDirectory, "documents.jsonl"), `${records.map((record) => JSON.stringify(record)).join("\n")}\n`);
}

const now = Date.now();
const season = currentSeason(now);
const clientId = TEST_CLIENT_ID;
const characterLevels = { doyun: 20, jiho: 5, es: 10, juju: 30 };
const characterIds = ["doyun", "jiho", "su", "chanik", "chanhwi", "nayuta", "unhee", "dongjun", "seyeon", "puman", "eunsu", "myeongseok", "juju", "juyeon", "sungjae", "mongshil", "seojun", "jiwoo", "junseok", "es"];
const itemCatalog = [
  { itemId: "inertial_bearing", name: "관성 베어링", description: "이동 속도 +8%", rarity: "common", isActive: true, createdAt: now, effects: { speedMultiplier: 1.08 } },
  { itemId: "reinforced_shell", name: "강화 외피", description: "최대 DEF 보호막 +12", rarity: "common", isActive: true, createdAt: now, effects: { defenseShieldBonus: 12 } },
  { itemId: "impact_lens", name: "충격 렌즈", description: "기본 공격 사거리 +18px", rarity: "common", isActive: true, createdAt: now, effects: { baseAttackRangeBonus: 18 } },
  { itemId: "bio_buffer", name: "생체 완충재", description: "최대 체력 +8%", rarity: "common", isActive: true, createdAt: now, effects: { maxHpMultiplier: 1.08 } },
];

const root = mkdtempSync(join(tmpdir(), "dambae-dev-seed-"));
const snapshotPath = `${root}.zip`;

try {
  writeJsonLines(root, "patchNotes", [{ version: "v3.2.3-dev", title: "개발용 가상 데이터", isImportant: false, createdAt: now, general: ["Dev 전용 가상 데이터입니다. 운영 데이터와 무관합니다."] }]);
  writeJsonLines(root, "characterProgress", characterIds.map((characterId) => {
    const level = characterLevels[characterId] ?? 1;
    return { characterId, level, experience: experienceAtLevelStart(level), totalDungeonClears: characterId === "doyun" ? 8 : characterId === "juju" ? 3 : 0, updatedAt: now };
  }));
  writeJsonLines(root, "dungeonProgress", [{ dungeonId: "slime-meadow", isUnlocked: true, clearCount: 12, lastClearedAt: now }, { dungeonId: "collapsed-laboratory", isUnlocked: true, clearCount: 5, lastClearedAt: now }]);
  writeJsonLines(root, "dungeonCharacterRecords", [{ dungeonId: "slime-meadow", characterId: "doyun", clearCount: 8, fastestClearMs: 72500, updatedAt: now }, { dungeonId: "collapsed-laboratory", characterId: "juju", clearCount: 3, fastestClearMs: 91300, updatedAt: now }]);
  writeJsonLines(root, "dungeonStageRecords", [1, 2, 3, 4, 5].map((stageNumber) => ({ dungeonId: "slime-meadow", characterId: "doyun", stageNumber, clearCount: 2, updatedAt: now })));
  writeJsonLines(root, "v3SeasonStates", [{ key: "global", seasonId: season.seasonId, updatedAt: now }]);
  writeJsonLines(root, "pvpSeasons", [{ ...season, status: "active" }]);
  writeJsonLines(root, "pvpCharacterRankings", [
    { seasonId: season.seasonId, mode: "solo", characterId: "doyun", score: 1125, wins: 6, games: 8, draws: 0, updatedAt: now },
    { seasonId: season.seasonId, mode: "solo", characterId: "juju", score: 1080, wins: 4, games: 6, draws: 0, updatedAt: now },
    { seasonId: season.seasonId, mode: "team", characterId: "es", score: 1050, wins: 3, games: 5, draws: 0, updatedAt: now },
    { seasonId: season.seasonId, mode: "tournament", characterId: "jiho", score: 1035, wins: 2, games: 3, draws: 0, updatedAt: now },
  ]);
  writeJsonLines(root, "persistentItemCatalog", itemCatalog);
  writeJsonLines(root, "persistentItemUnlocks", [...itemCatalog.map((item) => ({ clientId, characterId: "doyun", itemId: item.itemId, unlockedAt: now })), { clientId, characterId: "es", itemId: "impact_lens", unlockedAt: now }, { clientId, characterId: "juju", itemId: "bio_buffer", unlockedAt: now }]);
  writeJsonLines(root, "characterItemLoadouts", [{ clientId, characterId: "doyun", slot1ItemId: "reinforced_shell", slot2ItemId: "impact_lens", slot3ItemId: "bio_buffer", updatedAt: now }, { clientId, characterId: "es", slot1ItemId: "impact_lens", updatedAt: now }, { clientId, characterId: "juju", slot1ItemId: "bio_buffer", updatedAt: now }]);
  writeJsonLines(root, "itemTicketBalances", [{ clientId, characterId: "doyun", availableTickets: 0, updatedAt: now }, { clientId, characterId: "jiho", availableTickets: 1, updatedAt: now }, { clientId, characterId: "es", availableTickets: 1, updatedAt: now }, { clientId, characterId: "juju", availableTickets: 2, updatedAt: now }]);
  writeJsonLines(root, "itemTicketClaims", [5, 10, 15, 20].map((milestoneLevel) => ({ clientId, characterId: "doyun", milestoneLevel, claimedAt: now })).concat([
    { clientId, characterId: "jiho", milestoneLevel: 5, claimedAt: now }, { clientId, characterId: "es", milestoneLevel: 5, claimedAt: now }, { clientId, characterId: "es", milestoneLevel: 10, claimedAt: now },
    { clientId, characterId: "juju", milestoneLevel: 5, claimedAt: now }, { clientId, characterId: "juju", milestoneLevel: 10, claimedAt: now }, { clientId, characterId: "juju", milestoneLevel: 15, claimedAt: now }, { clientId, characterId: "juju", milestoneLevel: 20, claimedAt: now }, { clientId, characterId: "juju", milestoneLevel: 25, claimedAt: now }, { clientId, characterId: "juju", milestoneLevel: 30, claimedAt: now },
  ]));
  writeJsonLines(root, "itemDrawHistory", itemCatalog.map((item, index) => ({ clientId, characterId: "doyun", itemId: item.itemId, result: "unlocked", ticketConsumed: 1, createdAt: now + index })));
  writeJsonLines(root, "anonymousGachaStates", [{ clientId, dailyResetDate: kstDate(now), dailyDrawsUsed: 2, completedPlayCount: 8, bonusDrawsUsed: 1, experiencePoints: 0, updatedAt: now }]);
  writeJsonLines(root, "experiencePointItems", [{ clientId, amount: 250, rarity: "epic", createdAt: now }]);

  execFileSync("zip", ["-qr", snapshotPath, "."], { cwd: root, stdio: "inherit" });
  execFileSync("npx", ["convex", "import", snapshotPath, "--replace-all", "--yes", "--deployment", DEV_DEPLOYMENT], { stdio: "inherit" });
  console.log(`\nDev reset complete. In the browser console run:\nlocalStorage.setItem("dambae-ballgame-anonymous-client-id", "${TEST_CLIENT_ID}")\nThen refresh the app.`);
} finally {
  rmSync(root, { recursive: true, force: true });
  rmSync(snapshotPath, { force: true });
}
