import { api } from "../convex/_generated/api";
import { convexClient } from "./convexClient";
import { availableCharacters } from "./characterManager";
import { globalState, getSkinVisualMarkup } from "./globals";
import {
  getCeremonyActionPreviewMarkup,
  getCeremonyBackgroundPreviewMarkup,
  getSpecialEventRenderer
} from "./gachaManager";
import type { VictoryAction, VictoryBackground, VictorySpecialEvent } from "./globals";

export async function equipCosmetic(characterId: string, cosmeticId: string) {
  try {
    await convexClient.mutation(api.cosmetics.equipForCharacter, { characterId, cosmeticId });
    const gachaResult = document.getElementById("gacha-result");
    if (gachaResult)
      gachaResult.textContent = `${availableCharacters.find((character) => character.id === characterId)?.name ?? "캐릭터"}에게 스킨을 장착했습니다. 모든 클라이언트에 반영됩니다.`;
    renderSkinTab();
  } catch {
    const gachaResult = document.getElementById("gacha-result");
    if (gachaResult) gachaResult.textContent = "스킨 장착에 실패했습니다. 잠시 후 다시 시도해주세요.";
  }
}

export async function clearCosmetic(characterId: string) {
  try {
    await convexClient.mutation(api.cosmetics.clearForCharacter, { characterId });
    const gachaResult = document.getElementById("gacha-result");
    if (gachaResult)
      gachaResult.textContent = `${availableCharacters.find((character) => character.id === characterId)?.name ?? "캐릭터"}의 기본 외형을 장착했습니다. 모든 클라이언트에 반영됩니다.`;
    renderSkinTab();
  } catch {
    const gachaResult = document.getElementById("gacha-result");
    if (gachaResult) gachaResult.textContent = "기본 외형 장착에 실패했습니다. 잠시 후 다시 시도해주세요.";
  }
}

export async function equipVictoryPart(itemType: "action" | "background", item: VictoryAction | VictoryBackground) {
  try {
    if (itemType === "action") {
      await convexClient.mutation(api.cosmetics.equipVictoryAction, {
        characterId: globalState.currentCharacterId!,
        actionId: (item as VictoryAction).actionId,
      });
    } else {
      await convexClient.mutation(api.cosmetics.equipVictoryBackground, {
        characterId: globalState.currentCharacterId!,
        backgroundId: (item as VictoryBackground).backgroundId,
      });
    }
    const gachaResult = document.getElementById("gacha-result");
    if (gachaResult) gachaResult.textContent = `${item.name} ${itemType === "action" ? "행동" : "배경"}을 장착했습니다. 다음 게임 결과에 적용됩니다.`;
    const result = document.getElementById("collection-victory-ceremony-result");
    if (result) result.textContent = `${item.name} ${itemType === "action" ? "행동" : "배경"}을 장착했습니다.`;
    renderSkinTab();
  } catch (error) {
    const gachaResult = document.getElementById("gacha-result");
    if (gachaResult) gachaResult.textContent = error instanceof Error ? error.message : "승리 항목 장착에 실패했습니다.";
    const result = document.getElementById("collection-victory-ceremony-result");
    if (result) result.textContent = error instanceof Error ? error.message : "승리 항목 장착에 실패했습니다.";
  }
}

export async function equipVictorySpecialEvent(characterId: string, specialEvent: VictorySpecialEvent) {
  try {
    await convexClient.mutation(api.cosmetics.equipVictorySpecialEvent, {
      characterId,
      specialEventId: specialEvent.specialEventId,
    });
    const result = document.getElementById("collection-victory-special-event-result");
    if (result) result.textContent = `${specialEvent.name} 특수 이벤트를 장착했습니다.`;
    renderSkinTab();
  } catch (error) {
    const result = document.getElementById("collection-victory-special-event-result");
    if (result) result.textContent = error instanceof Error ? error.message : "특수 이벤트 장착에 실패했습니다.";
  }
}

export async function clearVictoryPart(itemType: "action" | "background") {
  try {
    if (itemType === "action") await convexClient.mutation(api.cosmetics.clearVictoryAction, { characterId: globalState.currentCharacterId! });
    else await convexClient.mutation(api.cosmetics.clearVictoryBackground, { characterId: globalState.currentCharacterId! });
    const result = document.getElementById("collection-victory-ceremony-result");
    if (result) result.textContent = `${itemType === "action" ? "플레이어 행동" : "배경 효과"}을 선택 안 함으로 변경했습니다.`;
    renderSkinTab();
  } catch (error) {
    const result = document.getElementById("collection-victory-ceremony-result");
    if (result) result.textContent = error instanceof Error ? error.message : "선택 해제에 실패했습니다.";
  }
}

export async function clearVictorySpecialEvent(characterId: string) {
  try {
    await convexClient.mutation(api.cosmetics.clearVictorySpecialEvent, { characterId });
    const result = document.getElementById("collection-victory-special-event-result");
    if (result) result.textContent = "특수 이벤트를 선택 안 함으로 변경했습니다.";
    renderSkinTab();
  } catch (error) {
    const result = document.getElementById("collection-victory-special-event-result");
    if (result) result.textContent = error instanceof Error ? error.message : "선택 해제에 실패했습니다.";
  }
}

export function renderSkinTab() {
  if (!globalState.currentCharacterId) return;
  const character = availableCharacters.find((c) => c.id === globalState.currentCharacterId);
  if (!character) return;

  const previewBox = document.getElementById("skin-equipped-avatar-box");
  const previewName = document.getElementById("skin-equipped-name");
  const previewDetails = document.getElementById("skin-equipped-details");

  const equippedSkinId = globalState.cosmeticLoadouts.get(globalState.currentCharacterId) ?? "";
  const activeSkin = globalState.cosmeticCatalog.find((c) => c.cosmeticId === equippedSkinId);

  if (previewBox) {
    if (activeSkin) {
      previewBox.style.borderColor = activeSkin.style.borderColor;
      previewBox.style.background = activeSkin.style.fillColor;
      previewBox.style.color = activeSkin.style.textColor;
      previewBox.style.boxShadow = `0 0 20px ${activeSkin.style.glowColor ?? activeSkin.style.borderColor}`;
      previewBox.innerHTML = `<b>${character.name.slice(0, 1)}</b>`;
    } else {
      previewBox.style.borderColor = character.color;
      previewBox.style.background = "rgba(0,0,0,0.4)";
      previewBox.style.color = "#fff";
      previewBox.style.boxShadow = "none";
      previewBox.innerHTML = `<b>${character.name.slice(0, 1)}</b>`;
    }
  }

  if (previewName) previewName.textContent = character.name;

  if (previewDetails) {
    const actionName = globalState.victoryActionCatalog.find((a) => a.actionId === globalState.equippedVictoryActionId)?.name ?? "기본 행동";
    const bgName = globalState.victoryBackgroundCatalog.find((b) => b.backgroundId === globalState.equippedVictoryBackgroundId)?.name ?? "기본 배경";
    const specialName = globalState.victorySpecialEventCatalog.find((s) => s.specialEventId === globalState.equippedVictorySpecialEventId)?.name ?? "선택 안 함";
    previewDetails.innerHTML = `
      스킨: <strong>${activeSkin?.name ?? "기본 외형"}</strong><br>
      세레모니: <strong>${actionName}</strong><br>
      무대 배경: <strong>${bgName}</strong><br>
      특수 이벤트: <strong>${specialName}</strong>
    `;
  }

  const grid = document.getElementById("skin-items-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (globalState.activeSkinTabType === "skin") {
    const basicSkin = document.createElement("button");
    basicSkin.type = "button";
    basicSkin.className = `gacha-skin-icon ${!equippedSkinId ? "active" : ""}`;
    basicSkin.style.setProperty("--skin-border", character.color);
    basicSkin.style.setProperty("--skin-fill", "rgba(0,0,0,0.4)");
    basicSkin.style.setProperty("--skin-text", "#fff");
    basicSkin.style.setProperty("--skin-glow", character.color);
    basicSkin.innerHTML = `<span class="skin-visual skin-visual-management" aria-hidden="true"><b>${character.name.slice(0, 1)}</b></span><small>기본 외형</small>`;
    basicSkin.onclick = () => { void clearCosmetic(character.id); };
    grid.appendChild(basicSkin);

    globalState.cosmeticCatalog.forEach((skin) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `gacha-skin-icon ${skin.isUnlocked ? "unlocked" : "locked"} ${equippedSkinId === skin.cosmeticId ? "active" : ""}`;
      card.style.setProperty("--skin-border", skin.style.borderColor);
      card.style.setProperty("--skin-fill", skin.style.fillColor);
      card.style.setProperty("--skin-text", skin.style.textColor);
      card.style.setProperty("--skin-glow", skin.style.glowColor ?? skin.style.borderColor);
      card.innerHTML = `${getSkinVisualMarkup(skin.style, skin.isUnlocked ? "SKIN" : "?", "icon")}<small class="rarity-${skin.rarity}">${skin.name}</small>`;
      if (skin.isUnlocked) {
        card.onclick = () => { void equipCosmetic(character.id, skin.cosmeticId); };
      }
      grid.appendChild(card);
    });
  } else if (globalState.activeSkinTabType === "action") {
    const basicAction = document.createElement("button");
    basicAction.type = "button";
    basicAction.className = `gacha-skin-icon ceremony-catalog-icon unlocked ${!globalState.equippedVictoryActionId ? "active" : ""}`;
    basicAction.innerHTML = `<div class="ceremony-action-preview" aria-hidden="true"><span>기본</span></div><small>기본 행동</small>`;
    basicAction.onclick = () => { void clearVictoryPart("action"); };
    grid.appendChild(basicAction);

    globalState.victoryActionCatalog.forEach((action) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `gacha-skin-icon ceremony-catalog-icon ${action.isUnlocked ? "unlocked" : "locked"} ${globalState.equippedVictoryActionId === action.actionId ? "active" : ""}`;
      card.innerHTML = `${getCeremonyActionPreviewMarkup(action.animation)}<small class="rarity-${action.rarity}">${action.name}</small>`;
      if (action.isUnlocked) {
        card.onclick = () => { void equipVictoryPart("action", action); };
      }
      grid.appendChild(card);
    });
  } else if (globalState.activeSkinTabType === "background") {
    const basicBg = document.createElement("button");
    basicBg.type = "button";
    basicBg.className = `gacha-skin-icon ceremony-catalog-icon unlocked ${!globalState.equippedVictoryBackgroundId ? "active" : ""}`;
    basicBg.innerHTML = `<div class="ceremony-background-preview" aria-hidden="true"><span>기본</span></div><small>기본 배경</small>`;
    basicBg.onclick = () => { void clearVictoryPart("background"); };
    grid.appendChild(basicBg);

    globalState.victoryBackgroundCatalog.forEach((bg) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `gacha-skin-icon ceremony-catalog-icon ${bg.isUnlocked ? "unlocked" : "locked"} ${globalState.equippedVictoryBackgroundId === bg.backgroundId ? "active" : ""}`;
      card.innerHTML = `${getCeremonyBackgroundPreviewMarkup(bg.animation)}<small class="rarity-${bg.rarity}">${bg.name}</small>`;
      if (bg.isUnlocked) {
        card.onclick = () => { void equipVictoryPart("background", bg); };
      }
      grid.appendChild(card);
    });
  } else if (globalState.activeSkinTabType === "specialEvent") {
    const basicEvent = document.createElement("button");
    basicEvent.type = "button";
    basicEvent.className = `gacha-skin-icon ceremony-catalog-icon unlocked ${!globalState.equippedVictorySpecialEventId ? "active" : ""}`;
    basicEvent.innerHTML = `<div class="special-event-catalog-thumb" aria-hidden="true"><span>없음</span></div><small>기본 설정</small>`;
    basicEvent.onclick = () => { void clearVictorySpecialEvent(character.id); };
    grid.appendChild(basicEvent);

    globalState.victorySpecialEventCatalog.forEach((event) => {
      const renderer = getSpecialEventRenderer(event);
      if (!renderer) return;
      const card = document.createElement("button");
      card.type = "button";
      card.className = `gacha-skin-icon ceremony-catalog-icon ${event.isUnlocked ? "unlocked" : "locked"} ${globalState.equippedVictorySpecialEventId === event.specialEventId ? "active" : ""}`;
      card.innerHTML = `${renderer.getCatalogMarkup()}<small class="rarity-${event.rarity}">${event.name}</small>`;
      if (event.isUnlocked) {
        card.onclick = () => { void equipVictorySpecialEvent(character.id, event); };
      }
      grid.appendChild(card);
    });
  }
}
