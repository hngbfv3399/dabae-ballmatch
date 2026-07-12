import { availableCharacters } from "../src/characterManager.ts";
import { runBaselineBalanceTest } from "../src/balance/simulator.ts";

const report = runBaselineBalanceTest(availableCharacters, { seed: 20260713, roundsPerPair: 25 });
if (report.results.some((result) => result.games !== (availableCharacters.length - 1) * report.roundsPerPair)) {
  throw new Error("Every character must play every configured opponent.");
}
const repeated = runBaselineBalanceTest(availableCharacters, { seed: report.seed, roundsPerPair: report.roundsPerPair });
if (JSON.stringify(report) !== JSON.stringify(repeated)) throw new Error("Balance reports must be deterministic for a seed.");
console.table(report.results.map((result) => ({ ...result, winRate: `${(result.winRate * 100).toFixed(1)}%` })));
