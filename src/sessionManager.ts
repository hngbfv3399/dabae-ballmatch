import { api } from "../convex/_generated/api";
import { convexClient } from "./convexClient";
import { availableCharacters } from "./characterManager";
import { globalState } from "./globals";

// Lazy-loaded dependencies to avoid circular imports during modularization
let initCosmetics: () => void;
let initPersistentItems: () => void;
let initPveProgressSubscription: () => void;
let renderPlayTab: () => void;
let renderBookTab: () => void;
let renderGrowthTab: () => void;
let renderStoreTab: () => void;
let renderSkinTab: () => void;

export function registerSessionCallbacks(callbacks: {
  initCosmetics: () => void;
  initPersistentItems: () => void;
  initPveProgressSubscription: () => void;
  renderPlayTab: () => void;
  renderBookTab: () => void;
  renderGrowthTab: () => void;
  renderStoreTab: () => void;
  renderSkinTab: () => void;
}) {
  initCosmetics = callbacks.initCosmetics;
  initPersistentItems = callbacks.initPersistentItems;
  initPveProgressSubscription = callbacks.initPveProgressSubscription;
  renderPlayTab = callbacks.renderPlayTab;
  renderBookTab = callbacks.renderBookTab;
  renderGrowthTab = callbacks.renderGrowthTab;
  renderStoreTab = callbacks.renderStoreTab;
  renderSkinTab = callbacks.renderSkinTab;
}

export function mapNicknameToCharacterId(nickname: string): string | null {
  const lower = nickname.trim().toLowerCase();
  const matched = availableCharacters.find((char) => {
    return char.id.toLowerCase() === lower || char.name.toLowerCase() === lower;
  });
  return matched ? matched.id : null;
}

export function initLogin() {
  const loginOverlay = document.getElementById("login-overlay") as HTMLElement;
  const nicknameInput = document.getElementById("login-nickname-input") as HTMLInputElement;
  const loginBtn = document.getElementById("login-btn") as HTMLButtonElement;
  const loginErrorMsg = document.getElementById("login-error-msg") as HTMLElement;

  const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem("dambae-v4-character-id");
      globalState.currentCharacterId = null;
      globalState.currentCharacterProgress = null;
      globalState.progressUnsubscribe?.();
      globalState.progressUnsubscribe = null;
      globalState.skillsUnsubscribe?.();
      globalState.skillsUnsubscribe = null;
      loginOverlay.classList.remove("hidden");
    };
  }

  // Auto-login from localStorage if present
  const storedId = localStorage.getItem("dambae-v4-character-id");
  if (storedId) {
    globalState.currentCharacterId = storedId;
  }

  if (globalState.currentCharacterId) {
    loginOverlay.classList.add("hidden");
    startUserSession();
  } else {
    loginOverlay.classList.remove("hidden");
  }

  const handleLoginSubmit = async () => {
    const inputVal = nicknameInput.value.trim();
    if (!inputVal) return;
    const charId = mapNicknameToCharacterId(inputVal);
    if (!charId) {
      loginErrorMsg.textContent = "현재 해당 캐릭터가 없으니 운영자에게 문의 하세요";
      loginErrorMsg.classList.remove("hidden");
      return;
    }

    try {
      const progress = await convexClient.query(api.progression.getCharacterProgress, { characterId: charId });
      if (!progress) {
        loginErrorMsg.textContent = "현재 해당 캐릭터가 없으니 운영자에게 문의 하세요";
        loginErrorMsg.classList.remove("hidden");
        return;
      }
      
      localStorage.setItem("dambae-v4-character-id", charId);
      globalState.currentCharacterId = charId;
      loginOverlay.classList.add("hidden");
      startUserSession();
    } catch (err) {
      loginErrorMsg.textContent = err instanceof Error ? err.message : "로그인에 실패했습니다.";
      loginErrorMsg.classList.remove("hidden");
    }
  };

  loginBtn.onclick = () => { void handleLoginSubmit(); };
  nicknameInput.onkeydown = (e) => {
    if (e.key === "Enter") void handleLoginSubmit();
  };
}

export function startUserSession() {
  if (!globalState.currentCharacterId) return;

  initCosmetics?.();
  initPersistentItems?.();
  initPveProgressSubscription?.();

  globalState.selectedPveCharacterId = globalState.currentCharacterId;

  globalState.progressUnsubscribe?.();
  globalState.progressUnsubscribe = convexClient.onUpdate(
    api.progression.getCharacterProgress,
    { characterId: globalState.currentCharacterId },
    (progress) => {
      globalState.currentCharacterProgress = progress;
      if (progress) {
        updateCoinsDisplay(progress.coins);
      }
      renderPlayTab?.();
      renderBookTab?.();
    }
  );

  globalState.skillsUnsubscribe?.();
  globalState.skillsUnsubscribe = convexClient.onUpdate(
    api.progression.getCharacterSkills,
    { characterId: globalState.currentCharacterId },
    (skills) => {
      globalState.characterSkillsInvested.clear();
      (skills as any[]).forEach((skill) => {
        globalState.characterSkillsInvested.set(skill.skillId, skill.investedPoints);
      });
      renderGrowthTab?.();
      renderBookTab?.();
    }
  );

  selectHubTab("play");
}

export function selectHubTab(hub: string) {
  document.querySelectorAll<HTMLElement>(".hub-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== `${hub}-hub-panel`);
  });
  document.querySelectorAll<HTMLButtonElement>(".hub-tab").forEach((tab) => {
    const isMatched = tab.getAttribute("data-hub") === hub;
    tab.classList.toggle("active", isMatched);
    tab.setAttribute("aria-selected", String(isMatched));
  });

  if (hub === "store") renderStoreTab?.();
  else if (hub === "skin") renderSkinTab?.();
  else if (hub === "growth") renderGrowthTab?.();
  else if (hub === "book") renderBookTab?.();
  else if (hub === "play") renderPlayTab?.();
}

function updateCoinsDisplay(coins: number) {
  // Update coins across various UI elements
  const storeCoins = document.getElementById("store-coins-label");
  if (storeCoins) storeCoins.textContent = coins.toLocaleString();
  const playLabel = document.getElementById("play-coins-label");
  if (playLabel) playLabel.textContent = coins.toLocaleString();
}
