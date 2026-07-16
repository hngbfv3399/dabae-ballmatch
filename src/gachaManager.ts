import { api } from "../convex/_generated/api";
import { convexClient } from "./convexClient";
import {
  globalState,
  gachaCatalog,
  gachaPreview,
  gachaTitle,
  gachaTypeHelp,
  gachaRevealModal,
  gachaRevealContent,
  gachaResult,
  persistentItemRateModal,
  persistentItemRateContent,
  getSkinVisualMarkup,
  updateCoinsDisplay
} from "./globals";
import type {
  Cosmetic,
  VictoryAction,
  VictoryBackground,
  VictorySpecialEvent,
  VictoryAnimation
} from "./globals";
import type { CatalogItem, PlayerItem } from "./maingame/persistentItemEffects";

export type GachaRevealCosmetic = Omit<Cosmetic, "isUnlocked">;

export type UnifiedGachaDrawResult = {
  itemType: "skin" | "action" | "background" | "specialEvent";
  item: any;
  result: "unlocked" | "duplicate";
  coinRefund: number;
  coins: number;
};

export const SPECIAL_EVENT_RENDERERS: Record<
  VictorySpecialEvent["effect"],
  {
    modalClass: string;
    getOverlayMarkup: (playerMarkup?: string) => string;
    getCatalogMarkup: () => string;
    getPreviewMarkup: () => string;
  }
> = {
  sniper: {
    modalClass: "victory-special-sniper-active",
    getOverlayMarkup: (playerMarkup = "<b>SU</b>") =>
      `<div class="victory-special-overlay victory-special-overlay-sniper" aria-hidden="true"><span class="special-sniper-afterimage"></span><span class="special-sniper-shooter">${playerMarkup}</span><span class="special-sniper-rifle"><i></i></span><span class="special-sniper-muzzle"></span><b>+</b></div>`,
    getCatalogMarkup: () =>
      `<div class="special-event-catalog-thumb special-event-catalog-thumb-sniper" aria-hidden="true"><b>+</b><span>SU</span><i></i></div>`,
    getPreviewMarkup: () =>
      `<div class="special-event-preview special-event-preview-sniper" aria-hidden="true"><div class="special-preview-gunman"><b>SU</b><i></i></div><strong>+</strong><small>등장 · 조준 · 반동 · 잔상 소멸</small></div>`,
  },
};

export function getSpecialEventRenderer(event: VictorySpecialEvent | null | undefined) {
  return event ? SPECIAL_EVENT_RENDERERS[event.effect] : undefined;
}

export function getCeremonySceneMarkup(
  background: VictoryAnimation | null,
  action: VictoryAnimation | null,
  size: "catalog" | "preview" | "reveal",
  playerMarkup = "<b>PLAYER</b>"
): string {
  return `<div class="ceremony-scene ceremony-scene-${size}${background ? ` ceremony-scene-${background}` : ""}" aria-hidden="true"><i></i><i></i><i></i><span class="ceremony-scene-ball${action ? ` ceremony-action-${action}` : ""}">${playerMarkup}</span></div>`;
}

export function getCeremonyActionPreviewMarkup(animation: VictoryAnimation): string {
  return `<div class="ceremony-action-preview" aria-hidden="true"><span class="ceremony-scene-ball ceremony-action-${animation}"><b>PLAYER</b></span></div>`;
}

export function getCeremonyBackgroundPreviewMarkup(animation: VictoryAnimation): string {
  return `<div class="ceremony-background-preview ceremony-scene ceremony-scene-${animation}" aria-hidden="true"><i></i><i></i><i></i></div>`;
}

export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function closeGachaReveal() {
  gachaRevealModal.classList.add("hidden");
}

export function showGachaRevealRolling() {
  gachaRevealContent.innerHTML = `<div class="gacha-reveal rolling"><span class="eyebrow">UNIFIED GACHA SIGNAL</span><div class="gacha-reveal-orb"><i></i><i></i><i></i><b>?</b></div><h2>보상을 해석하는 중…</h2><p>스킨과 승리 세레모니 전체 풀에서 결과를 불러옵니다.</p></div>`;
  gachaRevealModal.classList.remove("hidden");
}

export function showGachaRevealResult(result: { result: string; item: GachaRevealCosmetic; coinRefund: number }) {
  const cosmetic = result.item;
  const glowColor = cosmetic.style.glowColor ?? cosmetic.style.borderColor;
  const rarityLabel: Record<Cosmetic["rarity"], string> = {
    common: "일반",
    rare: "희귀",
    epic: "에픽",
    legendary: "레전드",
    unique: "유니크"
  };
  const isDuplicate = result.result === "duplicate";
  const effect = `${cosmetic.style.borderAnimation === "none" ? "기본 테두리" : `${cosmetic.style.borderAnimation} 테두리`} · ${cosmetic.style.trail === "none" ? "이동 흔적 없음" : `${cosmetic.style.trail} 이동 흔적`}`;
  const specialClass = cosmetic.rarity === "legendary" || cosmetic.rarity === "unique" ? "is-special" : "";
  gachaRevealContent.innerHTML = `<div class="gacha-reveal revealed ${specialClass}" style="--skin-border:${cosmetic.style.borderColor};--skin-fill:${cosmetic.style.fillColor};--skin-text:${cosmetic.style.textColor};--skin-glow:${glowColor}"><span class="eyebrow rarity-${cosmetic.rarity}">${rarityLabel[cosmetic.rarity].toUpperCase()} SKIN</span>${getSkinVisualMarkup({ ...cosmetic.style, glowColor }, "SKIN", "reveal")}<h2>${cosmetic.name}</h2><p>${isDuplicate ? `중복 스킨 · +${result.coinRefund} 코인 환급` : "새 공통 스킨을 획득했습니다!"}</p><div class="gacha-reveal-effect">${effect}</div><button id="gacha-reveal-close" class="btn btn-primary" type="button">확인</button></div>`;
  document.getElementById("gacha-reveal-close")?.addEventListener("click", closeGachaReveal);
}

export function showVictoryPartRevealResult(
  itemType: "action" | "background",
  item: Omit<VictoryAction, "isUnlocked"> | Omit<VictoryBackground, "isUnlocked">,
  result: { result: string; coinRefund: number }
) {
  const isDuplicate = result.result === "duplicate";
  const specialClass = item.rarity === "legendary" || item.rarity === "unique" ? "is-special" : "";
  const label = itemType === "action" ? "VICTORY ACTION" : "VICTORY BACKGROUND";
  const preview = itemType === "action" ? getCeremonyActionPreviewMarkup(item.animation) : getCeremonyBackgroundPreviewMarkup(item.animation);
  gachaRevealContent.innerHTML = `<div class="gacha-reveal revealed ceremony-reveal ${specialClass}"><span class="eyebrow rarity-${item.rarity}">${label}</span>${preview}<h2>${item.name}</h2><p>${isDuplicate ? `중복 ${itemType === "action" ? "승리 행동" : "승리 배경"} · +${result.coinRefund} 코인 환급` : `새 ${itemType === "action" ? "승리 행동" : "승리 배경"}을 획득했습니다!`}</p><div class="gacha-reveal-effect">${itemType === "action" ? "실제 1위 플레이어 공에 적용되는 행동입니다." : "실제 1위 플레이어 공 뒤에 표시되는 배경입니다."}</div><button id="gacha-reveal-close" class="btn btn-primary" type="button">확인</button></div>`;
  document.getElementById("gacha-reveal-close")?.addEventListener("click", closeGachaReveal);
}

export function showVictorySpecialEventRevealResult(
  specialEvent: Omit<VictorySpecialEvent, "isUnlocked">,
  result: { result: string; coinRefund: number }
) {
  const renderer = getSpecialEventRenderer(specialEvent as VictorySpecialEvent);
  if (!renderer) return;
  const isDuplicate = result.result === "duplicate";
  gachaRevealContent.innerHTML = `<div class="gacha-reveal revealed ceremony-reveal is-special"><span class="eyebrow rarity-${specialEvent.rarity}">SPECIAL EVENT</span>${renderer.getPreviewMarkup()}<h2>${specialEvent.name}</h2><p>${isDuplicate ? `중복 특수 이벤트 · +${result.coinRefund} 코인 환급` : "새 특수 이벤트를 획득했습니다!"}</p><div class="gacha-reveal-effect">승리 모달 전체에 적용되는 연출입니다. 장착은 스킨 탭에서 할 수 있습니다.</div><button id="gacha-reveal-close" class="btn btn-primary" type="button">확인</button></div>`;
  document.getElementById("gacha-reveal-close")?.addEventListener("click", closeGachaReveal);
}

// Lazy-loaded UI update reference to break circular imports
let updateSkinTabRef: () => void;
let updateGrowthTabRef: () => void;

export function registerGachaUIUpdates(callbacks: { updateSkinTab: () => void; updateGrowthTab: () => void }) {
  updateSkinTabRef = callbacks.updateSkinTab;
  updateGrowthTabRef = callbacks.updateGrowthTab;
}

export function renderGachaCatalog() {
  if (!gachaCatalog) return;
  const catalog = gachaCatalog;
  catalog.innerHTML = "";
  if (globalState.activeGachaType === "action") {
    [...globalState.victoryActionCatalog]
      .sort((a, b) => Number(Boolean(b.characterId)) - Number(Boolean(a.characterId)))
      .forEach((action) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = `gacha-skin-icon ceremony-catalog-icon ${action.isUnlocked ? "unlocked" : "locked"} ${globalState.previewVictoryActionId === action.actionId ? "active" : ""}`;
        card.dataset.ceremonyAnimation = action.animation;
        card.innerHTML = `${getCeremonyActionPreviewMarkup(action.animation)}<small class="rarity-${action.rarity}">${action.characterId === "su" ? "NEW · " : ""}${action.name}${action.characterId === "su" ? " · 수 전용" : ""}</small>`;
        card.addEventListener("click", () => {
          globalState.previewVictoryActionId = action.actionId;
          renderGachaCatalog();
        });
        catalog.appendChild(card);
      });
    renderGachaPreview();
    return;
  }
  if (globalState.activeGachaType === "background") {
    [...globalState.victoryBackgroundCatalog]
      .sort((a, b) => Number(Boolean(b.characterId)) - Number(Boolean(a.characterId)))
      .forEach((background) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = `gacha-skin-icon ceremony-catalog-icon ${background.isUnlocked ? "unlocked" : "locked"} ${globalState.previewVictoryBackgroundId === background.backgroundId ? "active" : ""}`;
        card.dataset.ceremonyAnimation = background.animation;
        card.innerHTML = `${getCeremonyBackgroundPreviewMarkup(background.animation)}<small class="rarity-${background.rarity}">${background.characterId === "su" ? "NEW · " : ""}${background.name}${background.characterId === "su" ? " · 수 전용" : ""}</small>`;
        card.addEventListener("click", () => {
          globalState.previewVictoryBackgroundId = background.backgroundId;
          renderGachaCatalog();
        });
        catalog.appendChild(card);
      });
    renderGachaPreview();
    return;
  }
  if (globalState.activeGachaType === "specialEvent") {
    globalState.victorySpecialEventCatalog.forEach((specialEvent) => {
      const renderer = getSpecialEventRenderer(specialEvent);
      if (!renderer) return;
      const card = document.createElement("button");
      card.type = "button";
      card.className = `gacha-skin-icon ceremony-catalog-icon ${specialEvent.isUnlocked ? "unlocked" : "locked"} ${globalState.previewVictorySpecialEventId === specialEvent.specialEventId ? "active" : ""}`;
      card.innerHTML = `${renderer.getCatalogMarkup()}<small class="rarity-${specialEvent.rarity}">${specialEvent.name}${specialEvent.characterId ? " · 수 전용" : ""}</small>`;
      card.addEventListener("click", () => {
        globalState.previewVictorySpecialEventId = specialEvent.specialEventId;
        renderGachaCatalog();
      });
      catalog.appendChild(card);
    });
    renderGachaPreview();
    return;
  }
  globalState.cosmeticCatalog.forEach((cosmetic) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `gacha-skin-icon ${cosmetic.isUnlocked ? "unlocked" : "locked"} ${globalState.previewGachaCosmeticId === cosmetic.cosmeticId ? "active" : ""}`;
    card.style.setProperty("--skin-border", cosmetic.style.borderColor);
    card.style.setProperty("--skin-fill", cosmetic.style.fillColor);
    card.style.setProperty("--skin-text", cosmetic.style.textColor);
    card.style.setProperty("--skin-glow", cosmetic.style.glowColor);
    card.innerHTML = `${getSkinVisualMarkup(cosmetic.style, cosmetic.isUnlocked ? "SKIN" : "?", "icon")}<small class="rarity-${cosmetic.rarity}">${cosmetic.name}</small>`;
    card.addEventListener("click", () => {
      globalState.previewGachaCosmeticId = cosmetic.cosmeticId;
      renderGachaCatalog();
    });
    catalog.appendChild(card);
  });
  renderGachaPreview();
}

export function renderGachaPreview() {
  if (!gachaPreview) return;
  if (globalState.activeGachaType === "specialEvent") {
    const specialEvent =
      globalState.victorySpecialEventCatalog.find((entry) => entry.specialEventId === globalState.previewVictorySpecialEventId) ??
      globalState.victorySpecialEventCatalog[0];
    const renderer = getSpecialEventRenderer(specialEvent);
    if (!specialEvent || !renderer) {
      gachaPreview.textContent = "특수 이벤트를 불러오는 중입니다.";
      return;
    }
    gachaPreview.innerHTML = `${renderer.getPreviewMarkup()}<span class="eyebrow">${specialEvent.isUnlocked ? "획득" : "미획득"} · ${specialEvent.rarity.toUpperCase()}</span><h3>${specialEvent.name}</h3><p>${specialEvent.characterId === "su" ? "수 전용 · 수가 1위일 때만 발동합니다." : "승리 모달 전체에 적용되는 특수 연출입니다."}</p><p class="gacha-preview-note">특수 이벤트는 행동·배경과 별개 아이템입니다. 장착은 <b>도감 탭</b>에서 할 수 있습니다.</p>`;
    return;
  }
  if (globalState.activeGachaType === "action") {
    const action =
      globalState.victoryActionCatalog.find((entry) => entry.actionId === globalState.previewVictoryActionId) ??
      globalState.victoryActionCatalog[0];
    if (!action) {
      gachaPreview.textContent = "승리 행동을 불러오는 중입니다.";
      return;
    }
    gachaPreview.innerHTML = `${getCeremonyActionPreviewMarkup(action.animation)}<span class="eyebrow">${action.isUnlocked ? "획득" : "미획득"} · ${action.rarity.toUpperCase()}</span><h3>${action.name}</h3><p>${action.characterId === "su" ? "수 전용 · 수가 1위일 때만 발동합니다." : "게임 종료 시 실제 1위 플레이어 공에 적용되는 행동입니다."}</p><p class="gacha-preview-note">행동은 배경과 별개의 가챠·장착 항목입니다. 장착은 <b>도감 탭</b>에서 할 수 있습니다.</p>`;
    return;
  }
  if (globalState.activeGachaType === "background") {
    const background =
      globalState.victoryBackgroundCatalog.find((entry) => entry.backgroundId === globalState.previewVictoryBackgroundId) ??
      globalState.victoryBackgroundCatalog[0];
    if (!background) {
      gachaPreview.textContent = "승리 배경을 불러오는 중입니다.";
      return;
    }
    gachaPreview.innerHTML = `${getCeremonyBackgroundPreviewMarkup(background.animation)}<span class="eyebrow">${background.isUnlocked ? "획득" : "미획득"} · ${background.rarity.toUpperCase()}</span><h3>${background.name}</h3><p>${background.characterId === "su" ? "수 전용 · 수가 1위일 때만 발동합니다." : "게임 종료 시 1위 플레이어 공 뒤에 표시되는 승리 무대입니다."}</p><p class="gacha-preview-note">배경은 행동과 별개의 가챠·장착 항목입니다. 장착은 <b>도감 탭</b>에서 할 수 있습니다.</p>`;
    return;
  }
  const cosmetic =
    globalState.cosmeticCatalog.find((entry) => entry.cosmeticId === globalState.previewGachaCosmeticId) ??
    globalState.cosmeticCatalog[0];
  if (!cosmetic) {
    gachaPreview.textContent = "스킨을 불러오는 중입니다.";
    return;
  }
  const effect = `${cosmetic.style.borderAnimation === "none" ? "기본 테두리" : `${cosmetic.style.borderAnimation} 테두리`} · ${cosmetic.style.trail === "none" ? "이동 흔적 없음" : `${cosmetic.style.trail} 이동 흔적`}`;
  gachaPreview.innerHTML = `<div class="skin-preview-stage" style="--skin-border:${cosmetic.style.borderColor};--skin-fill:${cosmetic.style.fillColor};--skin-text:${cosmetic.style.textColor};--skin-glow:${cosmetic.style.glowColor}">${getSkinVisualMarkup(cosmetic.style, "SKIN", "preview")}</div><span class="eyebrow">${cosmetic.isUnlocked ? "획득" : "미획득"} · ${cosmetic.rarity.toUpperCase()}</span><h3>${cosmetic.name}</h3><p>공통 스킨</p><div class="skill-slot"><b>외형 효과 미리보기</b><br>${effect}</div><p class="gacha-preview-note">아이콘·미리보기·전투에 같은 색상, 테두리 효과, 이동 흔적 설정이 적용됩니다. 가챠 탭에서는 장착할 수 없으며, 장착은 캐릭터 관리에서만 가능합니다.</p>`;
}

export function updateGachaUI() {
  const catalogReady =
    globalState.cosmeticCatalog.length +
      globalState.victoryActionCatalog.length +
      globalState.victoryBackgroundCatalog.length +
      globalState.victorySpecialEventCatalog.length >
    0;
  if (gachaTitle) {
    gachaTitle.textContent = "통합 가챠";
  }
  if (gachaTypeHelp) {
    gachaTypeHelp.innerHTML =
      globalState.activeGachaType === "specialEvent"
        ? `현재 탭은 <b>특수 이벤트</b> 도감 필터입니다. 특수 이벤트는 승리 모달 전체에 적용되며, 뽑기는 모든 카테고리 <b>전체 풀</b>에서 진행됩니다.`
        : globalState.activeGachaType === "action"
        ? `현재 탭은 <b>플레이어 행동</b> 도감 필터입니다. 행동과 배경은 별도 아이템이며, 뽑기는 스킨·행동·배경 <b>전체 풀</b>에서 진행됩니다.`
        : globalState.activeGachaType === "background"
        ? `현재 탭은 <b>배경 효과</b> 도감 필터입니다. 행동과 배경은 별도 아이템이며, 뽑기는 스킨·행동·배경 <b>전체 풀</b>에서 진행됩니다.`
        : `현재 탭은 스킨 도감 필터입니다. 뽑기는 스킨·승리 행동·승리 배경 <b>전체 풀</b>에서 진행됩니다. 중복 획득 시 코인이 환급됩니다.`;
  }

  const gachaDrawStatus = document.getElementById("gacha-draw-status");
  if (gachaDrawStatus) {
    gachaDrawStatus.textContent = `코인을 사용해 스킨·행동·배경·특수 이벤트 전체 풀에서 뽑습니다.`;
  }

  const storeSkinBtn = document.getElementById("store-gacha-skin-btn") as HTMLButtonElement;
  if (storeSkinBtn) {
    storeSkinBtn.disabled = !catalogReady;
  }

  renderGachaCatalog();
}

export async function drawGacha() {
  const btn = document.getElementById("store-gacha-skin-btn") as HTMLButtonElement;
  if (btn) btn.disabled = true;
  showGachaRevealRolling();
  try {
    await convexClient.mutation(api.cosmetics.ensureInitialCatalog, {});
    await convexClient.mutation(api.cosmetics.ensureInitialVictoryCeremonyCatalog, {});
    const result = (await convexClient.mutation(api.cosmetics.drawUnified, {
      characterId: globalState.currentCharacterId!,
    })) as UnifiedGachaDrawResult;
    await delay(900);

    // Update coins
    updateCoinsDisplay(result.coins);
    if (globalState.currentCharacterProgress) {
      globalState.currentCharacterProgress.coins = result.coins;
    }

    if (result.itemType === "action" || result.itemType === "background") {
      const item = result.item;
      showVictoryPartRevealResult(result.itemType, item, result);
      if (gachaResult)
        gachaResult.textContent =
          result.result === "unlocked"
            ? `획득! ${item.name} (${item.rarity.toUpperCase()}) — ${result.itemType === "action" ? "1위 플레이어 공 행동" : "승리 배경"}으로 스킨 탭에서 장착할 수 있습니다.`
            : `중복! ${item.name} · 코인 ${result.coinRefund}개를 환급받았습니다.`;
    } else if (result.itemType === "specialEvent") {
      showVictorySpecialEventRevealResult(result.item, result);
      if (gachaResult)
        gachaResult.textContent =
          result.result === "unlocked"
            ? `획득! ${result.item.name} (${result.item.rarity.toUpperCase()}) — 스킨 탭에서 특수 이벤트로 장착할 수 있습니다.`
            : `중복! ${result.item.name} · 코인 ${result.coinRefund}개를 환급받았습니다.`;
    } else {
      showGachaRevealResult(result);
      if (gachaResult)
        gachaResult.textContent =
          result.result === "unlocked"
            ? `획득! ${result.item.name} (${result.item.rarity.toUpperCase()}) — 전 캐릭터에 장착할 수 있습니다.`
            : `중복! ${result.item.name} · 코인 ${result.coinRefund}개를 환급받았습니다.`;
    }
  } catch (error) {
    closeGachaReveal();
    if (gachaResult) gachaResult.textContent = error instanceof Error ? error.message : "뽑기에 실패했습니다.";
  } finally {
    if (btn) btn.disabled = false;
  }
}

export async function drawPersistentItemsAction(count: number) {
  if (!globalState.currentCharacterId) return;
  const item1Btn = document.getElementById("store-gacha-item-1-btn") as HTMLButtonElement;
  const item5Btn = document.getElementById("store-gacha-item-5-btn") as HTMLButtonElement;
  if (item1Btn) item1Btn.disabled = true;
  if (item5Btn) item5Btn.disabled = true;

  gachaRevealModal.classList.remove("hidden");
  gachaRevealContent.innerHTML = `
    <div class="gacha-reveal rolling">
      <span class="eyebrow">EQUIPMENT DRAW</span>
      <div class="gacha-roll-visual">
        <i></i><i></i><i></i><b>?</b>
      </div>
      <h2>아이템 기어를 소환하는 중…</h2>
      <p>보관 중인 영구 전투 아이템 카탈로그에서 해석하고 있습니다.</p>
    </div>
  `;

  try {
    const result = await convexClient.mutation(api.persistentItems.drawPersistentItems, {
      characterId: globalState.currentCharacterId,
      drawCount: count,
    });

    // update coins
    updateCoinsDisplay(result.coins);
    if (globalState.currentCharacterProgress) {
      globalState.currentCharacterProgress.coins = result.coins;
    }

    // show reveal result
    const items = result.drawnItems;
    const itemsListMarkup = items
      .map((item: any) => {
        return `<div style="margin: 0.5rem 0; padding: 0.6rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
        <strong class="rarity-${item.rarity}">${item.name}</strong>
        <span class="rarity-${item.rarity}" style="font-size: 0.72rem; text-transform: uppercase;">${item.rarity}</span>
      </div>`;
      })
      .join("");

    gachaRevealContent.innerHTML = `
      <div class="gacha-reveal revealed" style="--skin-border:var(--neon-cyan);--skin-fill:#121225;--skin-text:#fff;--skin-glow:var(--neon-cyan)">
        <span class="eyebrow rarity-epic">PLAYER ITEM DRAW</span>
        <div style="font-size:3rem; margin:1rem 0;">⚙️</div>
        <h2>소환 결과 (${items.length}개)</h2>
        <div style="max-height: 200px; overflow-y: auto; width: 100%; margin: 1rem 0;">
          ${itemsListMarkup}
        </div>
        <button id="gacha-reveal-close" class="btn btn-primary" type="button" style="margin-top:1.5rem;">확인</button>
      </div>
    `;

    document.getElementById("gacha-reveal-close")?.addEventListener("click", () => {
      closeGachaReveal();
      updateGrowthTabRef?.();
    });
  } catch (err) {
    closeGachaReveal();
    if (gachaResult) gachaResult.textContent = err instanceof Error ? err.message : "아이템 소환에 실패했습니다.";
    alert(err instanceof Error ? err.message : "아이템 소환에 실패했습니다.");
  } finally {
    if (item1Btn) item1Btn.disabled = false;
    if (item5Btn) item5Btn.disabled = false;
  }
}

export const PERSISTENT_ITEM_RARITY_INFO: Array<{ rarity: CatalogItem["rarity"]; label: string; chance: number }> = [
  { rarity: "common", label: "일반", chance: 50 },
  { rarity: "rare", label: "레어", chance: 30 },
  { rarity: "epic", label: "에픽", chance: 14 },
  { rarity: "legendary", label: "레전더리", chance: 5 },
  { rarity: "unique", label: "유니크", chance: 1 },
];

export function getEquippedPersistentItemIds(characterId: string): string[] {
  const items = globalState.characterPlayerItems.get(characterId) ?? [];
  return items.filter((item) => item.equippedSlot >= 1 && item.equippedSlot <= 8).map((item) => item.itemCatalogId);
}

export function openPersistentItemRateModal(characterId: string) {
  const equippedIds = new Set(getEquippedPersistentItemIds(characterId));
  persistentItemRateContent.innerHTML = PERSISTENT_ITEM_RARITY_INFO.map(({ rarity, label, chance }) => {
    const items = globalState.persistentItemCatalog.filter((item) => item.rarity === rarity);
    const cards =
      items
        .map((item) => {
          const isOwned = globalState.persistentItemUnlocks.has(`${characterId}:${item.itemId}`);
          const isEquipped = equippedIds.has(item.itemId);
          const status = isEquipped ? "장착 중" : isOwned ? "보유" : "미보유";
          return `<article class="persistent-item-rate-card rarity-${rarity} ${isOwned ? "owned" : "locked"}">
        <div><strong>${item.name}</strong><span>${status}</span></div>
        <p>${item.description}</p>
      </article>`;
        })
        .join("") || `<p class="persistent-item-rate-empty">해당 등급 아이템을 불러오는 중입니다.</p>`;
    return `<section class="persistent-item-rate-tier rarity-${rarity}">
      <header><strong>${label}</strong><b>${chance}%</b><small>${items.length}종</small></header>
      <div class="persistent-item-rate-grid">${cards}</div>
    </section>`;
  }).join("");
  persistentItemRateModal.classList.remove("hidden");
}

export function initCosmetics() {
  void convexClient.mutation(api.cosmetics.ensureInitialCatalog, {});
  void convexClient.mutation(api.cosmetics.ensureInitialVictoryCeremonyCatalog, {});
  globalState.cosmeticCatalogUnsubscribe?.();
  globalState.cosmeticLoadoutUnsubscribe?.();
  globalState.victoryActionCatalogUnsubscribe?.();
  globalState.victoryBackgroundCatalogUnsubscribe?.();
  globalState.victorySpecialEventCatalogUnsubscribe?.();

  if (globalState.currentCharacterId) {
    globalState.cosmeticCatalogUnsubscribe = convexClient.onUpdate(
      api.cosmetics.listCatalog,
      { characterId: globalState.currentCharacterId },
      (catalog) => {
        globalState.cosmeticCatalog = catalog as Cosmetic[];
        updateGachaUI();
        updateSkinTabRef?.();
      }
    );

    globalState.victoryActionCatalogUnsubscribe = convexClient.onUpdate(
      api.cosmetics.listVictoryActionCatalog,
      { characterId: globalState.currentCharacterId },
      (catalog) => {
        globalState.victoryActionCatalog = catalog as VictoryAction[];
        updateGachaUI();
        updateSkinTabRef?.();
      }
    );

    globalState.victoryBackgroundCatalogUnsubscribe = convexClient.onUpdate(
      api.cosmetics.listVictoryBackgroundCatalog,
      { characterId: globalState.currentCharacterId },
      (catalog) => {
        globalState.victoryBackgroundCatalog = catalog as VictoryBackground[];
        updateGachaUI();
        updateSkinTabRef?.();
      }
    );

    globalState.victorySpecialEventCatalogUnsubscribe = convexClient.onUpdate(
      api.cosmetics.listVictorySpecialEventCatalog,
      { characterId: globalState.currentCharacterId },
      (catalog) => {
        globalState.victorySpecialEventCatalog = catalog as VictorySpecialEvent[];
        updateGachaUI();
        updateSkinTabRef?.();
      }
    );

    globalState.cosmeticLoadoutUnsubscribe = convexClient.onUpdate(
      api.cosmetics.getCharacterLoadout,
      { characterId: globalState.currentCharacterId },
      (loadout) => {
        if (loadout) {
          globalState.cosmeticLoadouts.set(globalState.currentCharacterId!, loadout.equippedCosmeticId ?? "");
          globalState.equippedVictoryActionId = loadout.equippedActionId ?? null;
          globalState.equippedVictoryBackgroundId = loadout.equippedBackgroundId ?? null;
          globalState.equippedVictorySpecialEventId = loadout.equippedSpecialEventId ?? null;
        }
        updateGachaUI();
        updateSkinTabRef?.();
      }
    );
  }
}

export function initPersistentItems() {
  void convexClient.mutation(api.persistentItems.ensureInitialPersistentItemCatalog, {});
  globalState.persistentItemCatalogUnsubscribe?.();
  globalState.persistentItemCatalogUnsubscribe = convexClient.onUpdate(
    api.persistentItems.listCatalog,
    {},
    (catalog) => {
      globalState.persistentItemCatalog = catalog as CatalogItem[];
      updateGrowthTabRef?.();
    }
  );

  globalState.playerItemsUnsubscribe?.();
  if (globalState.currentCharacterId) {
    globalState.playerItemsUnsubscribe = convexClient.onUpdate(
      api.persistentItems.getCharacterItems,
      { characterId: globalState.currentCharacterId },
      (items) => {
        globalState.characterPlayerItems.set(globalState.currentCharacterId!, items as PlayerItem[]);

        // Populate unlocks
        globalState.persistentItemUnlocks.clear();
        (items as PlayerItem[]).forEach((item) => {
          globalState.persistentItemUnlocks.add(`${globalState.currentCharacterId}:${item.itemCatalogId}`);
        });

        updateGrowthTabRef?.();
      }
    );
  }
}

export function renderStoreTab() {
  if (!globalState.currentCharacterId || !globalState.currentCharacterProgress) return;
  const coinsEl = document.getElementById("store-coins-label");
  if (coinsEl) coinsEl.textContent = globalState.currentCharacterProgress.coins.toLocaleString();

  const items = globalState.characterPlayerItems.get(globalState.currentCharacterId) ?? [];
  const spaceEl = document.getElementById("store-bag-space");
  if (spaceEl) spaceEl.textContent = `${items.length} / 20`;
}
