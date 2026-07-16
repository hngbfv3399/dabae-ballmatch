import { api } from "../convex/_generated/api";
import { convexClient } from "./convexClient";
import { availableCharacters } from "./characterManager";
import { globalState, getAvatarHTML } from "./globals";
import { resolvePersistentItemEffects } from "./maingame/persistentItemEffects";
import type { CharacterState } from "./characters/character.interface";
import type { PveProgress } from "./globals";

export type RankingEntry = {
  characterId: string;
  score: number;
  wins: number;
  games: number;
  draws: number;
  winRate: number;
};

export type RankingSeason = {
  seasonId: string;
  startedAt: number;
  endsAt: number;
  status: string;
};

export let currentRankingEntries: RankingEntry[] = [];
export let currentRankingSeason: RankingSeason | null = null;
export let rankingUnsubscribe: (() => void) | null = null;

export function applyEquippedCosmetic(state: CharacterState) {
  const cosmeticId = globalState.cosmeticLoadouts.get(state.id);
  const cosmetic = globalState.cosmeticCatalog.find((entry) => entry.cosmeticId === cosmeticId && entry.isUnlocked);
  if (cosmetic) state.cosmeticStyle = cosmetic.style;
  return state;
}

// 레벨 성장으로 계산되는 실제 전투 스탯은 항상 정수로 확정한다.
// 공격력이 0인 특수 캐릭터도 있으므로 고정 +1이 아닌, 양수 기본 스탯의 올림 보정을 사용한다.
export function getLevelStatGrowthSteps(level: number): number {
  return Math.max(0, level - 1 - Math.floor(level / 5));
}

export function getLeveledHp(baseHp: number, level: number): number {
  return Math.ceil(baseHp * (1 + 0.02 * getLevelStatGrowthSteps(level)));
}

export function getLeveledAttack(baseAttack: number, level: number): number {
  return Math.ceil(baseAttack * (1 + 0.0125 * getLevelStatGrowthSteps(level)));
}

export function getLeveledDefenseShield(character: { defense?: number }, level: number): number {
  return Math.max(0, Math.round((character.defense ?? 0) + getLevelStatGrowthSteps(level)));
}

export function getNextSkillUnlockLevel(level: number): number | null {
  if (level >= 30) return null;
  return Math.min(30, (Math.floor(level / 5) + 1) * 5);
}

export function getExperienceLabel(progress: PveProgress): string {
  return progress.isMaxLevel ? "MAX" : `${progress.experienceInCurrentLevel} / ${progress.experienceToNextLevel} XP`;
}

export function applyCharacterLevel(state: CharacterState) {
  // Uses helper from globals.ts
  const progress = globalState.pveProgressByCharacter.get(state.id) ?? { level: 1 };
  state.maxHp = getLeveledHp(state.maxHp, progress.level);
  state.hp = state.maxHp;
  state.attackPower = getLeveledAttack(state.attackPower, progress.level);
  state.maxDefenseShield = getLeveledDefenseShield(state, progress.level);
  state.defenseShield = state.maxDefenseShield;
  return state;
}

export function renderBookTab() {
  if (!globalState.currentCharacterId || !globalState.currentCharacterProgress) return;
  const character = availableCharacters.find((c) => c.id === globalState.currentCharacterId);
  if (!character) return;

  const progress = globalState.currentCharacterProgress;
  const items = globalState.characterPlayerItems.get(globalState.currentCharacterId) ?? [];
  const effects = resolvePersistentItemEffects(items);

  const atkLvl = globalState.characterSkillsInvested.get("atk") ?? 0;
  const hpLvl = globalState.characterSkillsInvested.get("hp") ?? 0;
  const cdLvl = globalState.characterSkillsInvested.get("cd") ?? 0;
  const pwrLvl = globalState.characterSkillsInvested.get("pwr") ?? 0;
  const luckyLvl = globalState.characterSkillsInvested.get("lucky") ?? 0;

  // 1) 체력
  let finalHp = getLeveledHp(character.maxHp, progress.level);
  finalHp = Math.round(finalHp * (1.0 + hpLvl * 0.08));
  if (effects.maxHpMultiplier) {
    finalHp = Math.round(finalHp * effects.maxHpMultiplier);
  }
  const hpEl = document.getElementById("stat-final-hp");
  if (hpEl) hpEl.textContent = finalHp.toLocaleString();

  // 2) 공격력
  let finalAtk = getLeveledAttack(character.attackPower, progress.level);
  finalAtk = Math.round(finalAtk * (1.0 + atkLvl * 0.07 + pwrLvl * 0.05));
  const atkEl = document.getElementById("stat-final-atk");
  if (atkEl) atkEl.textContent = finalAtk.toLocaleString();

  // 3) 이동속도
  let finalSpd = character.speed;
  const spdEl = document.getElementById("stat-final-spd");
  if (spdEl) spdEl.textContent = finalSpd.toFixed(1);

  // 4) 최대 보호막
  let finalDef = getLeveledDefenseShield(character, progress.level);
  if (effects.defenseShieldBonus) {
    finalDef += effects.defenseShieldBonus;
  }
  const defEl = document.getElementById("stat-final-def");
  if (defEl) defEl.textContent = finalDef.toLocaleString();

  // 5) 기본 사거리
  const finalRange = character.baseAttackRange;
  const rangeEl = document.getElementById("stat-final-range");
  if (rangeEl) rangeEl.textContent = `${finalRange}px`;

  // 6) 스킬 쿨다운 속도
  const cdBonus = cdLvl * 0.10;
  const cdEl = document.getElementById("stat-final-cd");
  if (cdEl) cdEl.textContent = `+${Math.round(cdBonus * 100)}%`;

  // 7) 운 (Luck)
  const baseLuck = character.luck ?? 10;
  const finalLuck = baseLuck + luckyLvl * 10;
  const luckEl = document.getElementById("stat-final-luck");
  if (luckEl) luckEl.textContent = `${finalLuck} (크리티컬 +${(finalLuck * 0.5).toFixed(1)}%)`;

  // 8) 공격속도 (AtkSpd)
  const baseAtkSpd = character.attackSpeed ?? 1.0;
  const finalAtkSpd = baseAtkSpd * Math.max(0.5, 1 - luckyLvl * 0.06);
  const atkSpdEl = document.getElementById("stat-final-atk-spd");
  if (atkSpdEl) atkSpdEl.textContent = `${finalAtkSpd.toFixed(2)}초 / 회`;

  const listEl = document.getElementById("book-character-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  availableCharacters.forEach((char) => {
    const card = document.createElement("button");
    card.type = "button";

    const isMain = char.id === globalState.currentCharacterId;
    card.className = `roster-character-card ${isMain ? "main-character" : ""}`;
    card.style.borderColor = char.color;

    card.innerHTML = `
      <div style="background:${char.color}; width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:6px;"></div>
      <strong style="color:${isMain ? "#00f2fe" : "#fff"};">${char.name}</strong>
    `;
    card.onclick = () => {
      void openCharacterDetail(char.id);
    };
    listEl.appendChild(card);
  });
}

export function openCharacterDetail(characterId: string) {
  const modal = document.getElementById("character-detail-modal") as HTMLElement;
  const title = document.getElementById("detail-title") as HTMLElement;
  const badge = document.getElementById("detail-badge") as HTMLElement;
  const desc = document.getElementById("detail-desc") as HTMLElement;
  const stats = document.getElementById("detail-stats") as HTMLElement;
  const skillName = document.getElementById("detail-skill-name") as HTMLElement;
  const skillDesc = document.getElementById("detail-skill-desc") as HTMLElement;
  const avatarFrame = document.getElementById("detail-avatar-frame") as HTMLElement;

  const char = availableCharacters.find((c) => c.id === characterId);
  if (!char) return;

  if (avatarFrame) {
    avatarFrame.style.borderColor = char.color;
    avatarFrame.style.boxShadow = `0 0 15px ${char.color}`;
    avatarFrame.innerHTML = getAvatarHTML(char.name, char.image, "detail-profile-image");
  }

  if (title) title.textContent = char.name;
  if (badge) {
    badge.textContent = char.tier ?? "C";
    badge.style.color = char.color;
  }
  if (desc) desc.textContent = char.detailedDescription;
  if (stats) {
    stats.innerHTML = `
      <div><strong>MAX HP</strong><b>${char.maxHp}</b></div>
      <div><strong>SPEED</strong><b>${char.speed.toFixed(1)}</b></div>
      <div><strong>ATTACK</strong><b>${char.attackPower}</b></div>
      <div><strong>DEFENSE</strong><b>${char.defense ?? 0}</b></div>
      <div><strong>RANGE</strong><b>${char.baseAttackRange}px</b></div>
      <div><strong>LUCK</strong><b>${char.luck ?? 10}</b></div>
      <div><strong>ATK SPD</strong><b>${(char.attackSpeed ?? 1.0).toFixed(2)}초</b></div>
    `;
  }
  if (skillName) skillName.textContent = char.skillName;
  if (skillDesc) skillDesc.textContent = char.skillDescription;

  modal.classList.remove("hidden");
}

export function formatSeasonDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(timestamp);
}

export function renderSeasonRanking() {
  const rankingSeasonLabel = document.getElementById("ranking-season-label");
  const rankingList = document.getElementById("ranking-list");
  if (!rankingSeasonLabel || !rankingList) return;

  if (!currentRankingSeason) {
    rankingSeasonLabel.textContent = "시즌 정보를 불러오는 중입니다.";
    rankingList.textContent = "랭킹을 불러오는 중입니다.";
    return;
  }
  rankingSeasonLabel.textContent = `${currentRankingSeason.seasonId.toUpperCase()} · ${formatSeasonDate(currentRankingSeason.startedAt)} ~ ${formatSeasonDate(currentRankingSeason.endsAt)}`;
  if (currentRankingEntries.length === 0) {
    rankingList.innerHTML = `<div class="ranking-empty">아직 기록된 ${globalState.activeRankingMode === "solo" ? "개인전" : globalState.activeRankingMode === "team" ? "팀전" : "토너먼트"}이 없습니다.<br><small>첫 전투를 완료하면 캐릭터별 시즌 점수가 기록됩니다.</small></div>`;
    return;
  }
  rankingList.innerHTML = currentRankingEntries
    .map((entry, index) => {
      const character = availableCharacters.find((candidate) => candidate.id === entry.characterId);
      if (!character) return "";
      return `<article class="ranking-row"><b class="ranking-place">${index + 1}</b>${getAvatarHTML(character.name, character.image, "ranking-avatar")}<div class="ranking-identity"><strong style="color:${character.color}">${character.name}</strong><small>${entry.wins}승 ${entry.games - entry.wins - entry.draws}패 ${entry.draws}무 · 승률 ${entry.winRate.toFixed(1)}%</small></div><strong class="ranking-score">${entry.score.toLocaleString()}<small>RP</small></strong></article>`;
    })
    .join("");
}

export function subscribeSeasonRanking() {
  rankingUnsubscribe?.();
  rankingUnsubscribe = convexClient.onUpdate(
    api.stats.getRankingOverview,
    { mode: globalState.activeRankingMode },
    (overview) => {
      currentRankingSeason = overview.season as any;
      currentRankingEntries = overview.rankings as any;
      renderSeasonRanking();
    }
  );
}
