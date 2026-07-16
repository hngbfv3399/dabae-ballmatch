import { api } from "../convex/_generated/api";
import { convexClient } from "./convexClient";
import { globalState } from "./globals";

export const SKILL_TREE_DEF = [
  {
    tier: 1,
    label: "Tier 1 — 기초 특성",
    skills: [
      { id: "atk",  icon: "⚔️", name: "공격 강화",    desc: "공격력 +7% / 레벨",                              requires: [] as string[] },
      { id: "hp",   icon: "❤️", name: "체력 강화",    desc: "최대 체력 +8% / 레벨",                           requires: [] as string[] },
      { id: "cd",   icon: "⚡", name: "쿨다운 감소",  desc: "스킬 쿨다운 -10% / 레벨",                        requires: [] as string[] },
    ],
  },
  {
    tier: 2,
    label: "Tier 2 — 심화 특성 (T1 전체 마스터 필요)",
    skills: [
      { id: "pwr",  icon: "💥", name: "파워 마스터리", desc: "공격·스킬 피해 +5% / 레벨",   requires: ["atk","hp","cd"] },
      { id: "tank", icon: "🛡️", name: "강인함",        desc: "피해 감소 +4% / 레벨",         requires: ["atk","hp","cd"] },
    ],
  },
  {
    tier: 3,
    label: "Tier 3 — 최상위 특성 (T2 전체 마스터 필요)",
    skills: [
      { id: "lucky", icon: "🍀", name: "행운의 손길", desc: "크리티컬 +5% / 공격 간격 -6% / 레벨", requires: ["pwr","tank"] },
    ],
  },
];
export const SKILL_MAX_LV = 3;

// State local to growth panel
export let selectedItemId: string | null = null;
export const selectedFeedMaterialIds = new Set<string>();

export function renderGrowthTab() {
  if (!globalState.currentCharacterId) return;

  const eqPanel = document.getElementById("growth-equipment-panel") as HTMLElement;
  const skPanel = document.getElementById("growth-skills-panel") as HTMLElement;
  if (eqPanel && skPanel) {
    eqPanel.classList.toggle("hidden", globalState.selectedGrowthSubTab !== "equipment");
    skPanel.classList.toggle("hidden", globalState.selectedGrowthSubTab !== "skills");
  }

  document.querySelectorAll<HTMLButtonElement>(".growth-tab-btn").forEach((btn) => {
    const isMatched = btn.dataset.growthSub === globalState.selectedGrowthSubTab;
    btn.classList.toggle("active", isMatched);
  });

  if (globalState.selectedGrowthSubTab === "equipment") {
    renderEquipmentSubTab();
  } else {
    renderSkillsSubTab();
  }
}

export function renderEquipmentSubTab() {
  if (!globalState.currentCharacterId) return;
  const items = globalState.characterPlayerItems.get(globalState.currentCharacterId) ?? [];

  const bagCountLabel = document.getElementById("bag-count-label");
  if (bagCountLabel) bagCountLabel.textContent = `${items.length} / 20`;

  const slots = [1, 2, 3, 4, 5, 6, 7, 8];
  slots.forEach((slotNum) => {
    const slotEl = document.querySelector(`.eq-slot[data-eq-slot="${slotNum}"]`) as HTMLElement;
    if (!slotEl) return;
    const equipped = items.find((item) => item.equippedSlot === slotNum);
    if (equipped) {
      const catalogItem = globalState.persistentItemCatalog.find((c) => c.itemId === equipped.itemCatalogId);
      slotEl.className = `eq-slot rarity-${catalogItem?.rarity ?? "common"} equipped ${selectedItemId === equipped.itemId ? "selected" : ""}`;
      slotEl.innerHTML = `<span>Lv.${equipped.level} ${catalogItem?.name ?? "아이템"}</span><small style="font-size:0.65rem; color:#fff;">Slot ${slotNum}</small>`;
      slotEl.onclick = () => {
        selectedItemId = equipped.itemId;
        selectedFeedMaterialIds.clear();
        renderEquipmentSubTab();
      };
    } else {
      slotEl.className = `eq-slot empty ${selectedItemId === `slot-${slotNum}` ? "selected" : ""}`;
      slotEl.innerHTML = `<span>Slot ${slotNum}</span><small style="font-size:0.65rem; color:var(--text-secondary); margin-top:4px;">비어있음</small>`;
      slotEl.onclick = () => {
        const selectedItem = items.find((item) => item.itemId === selectedItemId);
        if (selectedItem && selectedItem.equippedSlot <= 0) {
          void equipPersistentItemAction(selectedItem.itemId, slotNum);
        } else {
          selectedItemId = null;
          renderEquipmentSubTab();
        }
      };
    }
  });

  const bagGrid = document.getElementById("equipment-bag-grid");
  if (!bagGrid) return;
  bagGrid.innerHTML = "";

  const bagItems = items.filter((item) => item.equippedSlot <= 0);
  if (bagItems.length === 0) {
    bagGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem 0;">가방이 비어 있습니다.</p>`;
  } else {
    bagItems.forEach((item) => {
      const catalogItem = globalState.persistentItemCatalog.find((c) => c.itemId === item.itemCatalogId);
      const card = document.createElement("button");
      card.type = "button";

      const isInspected = selectedItemId === item.itemId;
      const isMaterial = selectedFeedMaterialIds.has(item.itemId);

      card.className = `bag-item-card rarity-${catalogItem?.rarity ?? "common"} ${isInspected ? "inspected" : ""} ${isMaterial ? "material-selected" : ""}`;
      card.innerHTML = `
        <strong>Lv.${item.level} ${catalogItem?.name ?? "기어"}</strong>
        <small>${catalogItem?.rarity.toUpperCase()}</small>
      `;
      card.onclick = () => {
        if (selectedItemId && selectedItemId !== item.itemId) {
          if (selectedFeedMaterialIds.has(item.itemId)) {
            selectedFeedMaterialIds.delete(item.itemId);
          } else {
            selectedFeedMaterialIds.add(item.itemId);
          }
        } else {
          selectedItemId = item.itemId;
          selectedFeedMaterialIds.clear();
        }
        renderEquipmentSubTab();
      };
      bagGrid.appendChild(card);
    });
  }

  renderInspectorPanel();
}

export function renderInspectorPanel() {
  const inspector = document.getElementById("equipment-inspector-panel");
  if (!inspector) return;

  const items = globalState.characterPlayerItems.get(globalState.currentCharacterId!) ?? [];
  const selectedItem = items.find((item) => item.itemId === selectedItemId);

  const placeholder = document.getElementById("inspector-placeholder");
  const detailPanel = document.getElementById("inspector-detail-panel");

  if (!selectedItem) {
    if (placeholder) placeholder.style.display = "flex";
    if (detailPanel) detailPanel.style.display = "none";
    return;
  }

  if (placeholder) placeholder.style.display = "none";
  if (detailPanel) detailPanel.style.display = "flex";

  const catalogItem = globalState.persistentItemCatalog.find((c) => c.itemId === selectedItem.itemCatalogId);

  const nameEl = document.getElementById("inspector-item-name");
  if (nameEl) {
    nameEl.textContent = `Lv.${selectedItem.level} ${catalogItem?.name ?? "전투 기어"}`;
    nameEl.className = `rarity-${catalogItem?.rarity ?? "common"}`;
  }
  const descEl = document.getElementById("inspector-item-desc");
  if (descEl) descEl.textContent = catalogItem?.description ?? "";

  const effectsEl = document.getElementById("inspector-item-effects");
  if (effectsEl) {
    const lvl = selectedItem.level;
    const baseMult = catalogItem?.effects?.maxHpMultiplier ? `체력 배율: +${Math.round((catalogItem.effects.maxHpMultiplier ** lvl - 1.0) * 100)}%` : "";
    const baseDef = catalogItem?.effects?.defenseShieldBonus ? `보호막 증가: +${catalogItem.effects.defenseShieldBonus * lvl}` : "";
    effectsEl.innerHTML = [baseMult, baseDef].filter(Boolean).join("<br>");
  }

  const expLabel = document.getElementById("inspector-item-exp");
  const expFill = document.getElementById("inspector-item-exp-fill");

  const nextLvlExp = selectedItem.level * 100;
  if (expLabel) expLabel.textContent = `${selectedItem.experience} / ${nextLvlExp}`;
  if (expFill) expFill.style.width = `${Math.min(100, (selectedItem.experience / nextLvlExp) * 100)}%`;

  const feedArea = document.getElementById("feed-composite-area") as HTMLElement;
  const feedSummary = document.getElementById("feed-materials-summary");
  const feedBtn = document.getElementById("btn-execute-feed") as HTMLButtonElement;

  if (feedArea) {
    if (selectedItem.equippedSlot > 0) {
      feedArea.style.display = "none";
    } else {
      feedArea.style.display = "flex";
      if (feedSummary) {
        feedSummary.textContent =
          selectedFeedMaterialIds.size > 0 ? `선택된 제물: ${selectedFeedMaterialIds.size}개` : "선택된 제물: 없음";
      }
      if (feedBtn) {
        feedBtn.disabled = selectedFeedMaterialIds.size === 0;
        feedBtn.onclick = () => {
          void executeFeedAction(selectedItem.itemId);
        };
      }
    }
  }

  const equipBtn = document.getElementById("btn-inspector-equip") as HTMLButtonElement;
  const unequipBtn = document.getElementById("btn-inspector-unequip") as HTMLButtonElement;
  const sellBtn = document.getElementById("btn-inspector-sell") as HTMLButtonElement;

  if (selectedItem.equippedSlot > 0) {
    if (equipBtn) equipBtn.style.display = "none";
    if (unequipBtn) {
      unequipBtn.style.display = "block";
      unequipBtn.onclick = () => {
        void unequipPersistentItemAction(selectedItem.itemId);
      };
    }
  } else {
    if (unequipBtn) unequipBtn.style.display = "none";
    if (equipBtn) {
      equipBtn.style.display = "block";
      equipBtn.onclick = () => {
        const usedSlots = new Set(items.filter((item) => item.equippedSlot > 0).map((item) => item.equippedSlot));
        const emptySlot = [1, 2, 3, 4, 5, 6, 7, 8].find((slot) => !usedSlots.has(slot));
        if (emptySlot) {
          void equipPersistentItemAction(selectedItem.itemId, emptySlot);
        } else {
          alert("장착할 빈 슬롯이 없습니다! 기존 장비를 해제하세요.");
        }
      };
    }
  }

  if (sellBtn) {
    sellBtn.disabled = selectedItem.equippedSlot > 0;
    sellBtn.onclick = () => {
      void sellPersistentItemAction(selectedItem.itemId);
    };
  }
}

export async function equipPersistentItemAction(itemId: string, slotNum: number) {
  if (!globalState.currentCharacterId) return;
  try {
    const items = globalState.characterPlayerItems.get(globalState.currentCharacterId) ?? [];
    const targetItem = items.find((item) => item.itemId === itemId);
    if (!targetItem) return;

    const hasDuplicate = items.some((item) => item.equippedSlot > 0 && item.itemCatalogId === targetItem.itemCatalogId);
    if (hasDuplicate) {
      alert("동일한 종류의 아이템은 중복 장착할 수 없습니다!");
      return;
    }

    await convexClient.mutation(api.persistentItems.equipPersistentItem, {
      characterId: globalState.currentCharacterId,
      itemId: itemId as any,
      slot: slotNum,
    });
    selectedItemId = null;
    selectedFeedMaterialIds.clear();
    renderGrowthTab();
  } catch (err) {
    alert(err instanceof Error ? err.message : "장착에 실패했습니다.");
  }
}

export async function unequipPersistentItemAction(itemId: string) {
  if (!globalState.currentCharacterId) return;
  try {
    const item = (globalState.characterPlayerItems.get(globalState.currentCharacterId) ?? [])
      .find((entry) => entry.itemId === itemId);
    if (!item || item.equippedSlot < 1) return;
    await convexClient.mutation(api.persistentItems.clearPersistentItemSlot, {
      characterId: globalState.currentCharacterId,
      slot: item.equippedSlot,
    });
    selectedItemId = null;
    selectedFeedMaterialIds.clear();
    renderGrowthTab();
  } catch (err) {
    alert(err instanceof Error ? err.message : "해제에 실패했습니다.");
  }
}

export async function sellPersistentItemAction(itemId: string) {
  if (!globalState.currentCharacterId) return;
  if (!confirm("정말 이 아이템을 판매하여 코인을 환급받으시겠습니까?")) return;
  try {
    await convexClient.mutation(api.persistentItems.sellItem, {
      characterId: globalState.currentCharacterId,
      itemId: itemId as any,
    });
    selectedItemId = null;
    selectedFeedMaterialIds.clear();
    renderGrowthTab();
  } catch (err) {
    alert(err instanceof Error ? err.message : "판매에 실패했습니다.");
  }
}

export async function executeFeedAction(itemId: string) {
  if (!globalState.currentCharacterId) return;
  try {
    await convexClient.mutation(api.persistentItems.feedItem, {
      characterId: globalState.currentCharacterId,
      targetItemId: itemId as any,
      materialItemIds: Array.from(selectedFeedMaterialIds) as any,
    });
    selectedFeedMaterialIds.clear();
    renderGrowthTab();
  } catch (err) {
    alert(err instanceof Error ? err.message : "제물 합성에 실패했습니다.");
  }
}

export function renderSkillsSubTab() {
  if (!globalState.currentCharacterId || !globalState.currentCharacterProgress) return;
  const progress = globalState.currentCharacterProgress;

  let spent = 0;
  globalState.characterSkillsInvested.forEach((lvl) => {
    spent += lvl;
  });

  const avail = Math.max(0, progress.skillPoints ?? 0);
  const availEl = document.getElementById("skill-points-avail");
  if (availEl) availEl.textContent = avail.toString();

  const container = document.getElementById("skill-tree-container");
  if (!container) return;
  container.innerHTML = "";

  SKILL_TREE_DEF.forEach((tierDef, tierIdx) => {
    // Connector arrow between tiers
    if (tierIdx > 0) {
      const connector = document.createElement("div");
      connector.className = "skill-tier-connector";
      connector.innerHTML = `<span>↓</span>`;
      container.appendChild(connector);
    }

    const tierDiv = document.createElement("div");
    tierDiv.className = "skill-tier";

    const tierLabel = document.createElement("p");
    tierLabel.className = "skill-tier-label";
    tierLabel.textContent = tierDef.label;
    tierDiv.appendChild(tierLabel);

    const row = document.createElement("div");
    row.className = "skill-tier-row";

    tierDef.skills.forEach((skillDef) => {
      const invested = globalState.characterSkillsInvested.get(skillDef.id) ?? 0;
      const isMastered = invested >= SKILL_MAX_LV;
      const prereqsMet = skillDef.requires.every(
        (reqId) => (globalState.characterSkillsInvested.get(reqId) ?? 0) >= SKILL_MAX_LV
      );

      const card = document.createElement("div");
      card.className = [
        "skill-chain-card",
        isMastered ? "mastered" : "",
        !prereqsMet ? "locked" : "",
        invested > 0 && !isMastered ? "in-progress" : "",
      ].filter(Boolean).join(" ");

      const pips = Array.from({ length: SKILL_MAX_LV }, (_, i) =>
        `<span class="skill-pip${i < invested ? " filled" : ""}"></span>`
      ).join("");

      card.innerHTML = `
        <div class="skill-chain-icon">${prereqsMet ? skillDef.icon : "🔒"}</div>
        <div class="skill-chain-info">
          <strong>${skillDef.name}</strong>
          <small>${skillDef.desc}</small>
          <div class="skill-pip-row">${pips}</div>
          <span class="skill-lv-badge">${isMastered ? "✅ MASTERED" : `Lv ${invested} / ${SKILL_MAX_LV}`}</span>
        </div>
        <button
          class="skill-chain-add-btn"
          ${!prereqsMet || avail <= 0 || isMastered ? "disabled" : ""}
          data-skill-id="${skillDef.id}"
        >+</button>
      `;

      const addBtn = card.querySelector<HTMLButtonElement>(".skill-chain-add-btn");
      if (addBtn && prereqsMet && avail > 0 && !isMastered) {
        addBtn.onclick = () => {
          void investSkillPointAction(skillDef.id as any);
        };
      }

      row.appendChild(card);
    });

    tierDiv.appendChild(row);
    container.appendChild(tierDiv);
  });

  const resetBtn = document.getElementById("skill-reset-btn") as HTMLButtonElement;
  if (resetBtn) {
    resetBtn.disabled = progress.coins < 100 || spent === 0;
    resetBtn.onclick = () => {
      void resetSkillsAction();
    };
  }
}

export async function investSkillPointAction(skillId: "atk" | "hp" | "cd" | "pwr" | "tank" | "lucky") {
  if (!globalState.currentCharacterId) return;
  try {
    await convexClient.mutation(api.progression.investSkillPoint, {
      characterId: globalState.currentCharacterId,
      skillId,
    });
  } catch (err) {
    alert(err instanceof Error ? err.message : "스킬 투자에 실패했습니다.");
  }
}

export async function resetSkillsAction() {
  if (!globalState.currentCharacterId) return;
  if (!confirm("100 코인을 소모하여 스킬 특성을 초기화하시겠습니까?")) return;
  try {
    await convexClient.mutation(api.progression.resetSkills, {
      characterId: globalState.currentCharacterId,
    });
  } catch (err) {
    alert(err instanceof Error ? err.message : "스킬 초기화에 실패했습니다.");
  }
}
