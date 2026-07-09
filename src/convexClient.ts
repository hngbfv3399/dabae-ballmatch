import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

export const convexClient = new ConvexClient(CONVEX_URL || "");

// DOM Elements
const patchModal = document.getElementById("patch-modal") as HTMLElement;
const patchHistoryListEl = document.getElementById("patch-history-list") as HTMLElement;
const patchCloseBtn = document.getElementById("patch-close-btn") as HTMLButtonElement;
const patchNotesTriggerBtn = document.getElementById("patch-notes-trigger-btn") as HTMLButtonElement;
const lobbyVersionBadge = document.getElementById("lobby-version-badge") as HTMLElement;

let latestVersion = "";

// Render all patch notes in a stacked list
function renderPatchHistory(patches: any[]) {
  if (!patchHistoryListEl) return;
  patchHistoryListEl.innerHTML = "";

  patches.forEach((patch) => {
    const patchCard = document.createElement("div");
    patchCard.className = "patch-card";
    patchCard.style.marginBottom = "1rem";

    // Date formatting
    const formattedDate = new Date(patch.createdAt).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Render categorized sections
    let sectionsHTML = "";

    if (patch.buffs && patch.buffs.length > 0) {
      sectionsHTML += `
        <div style="margin-top: 0.8rem;">
          <div style="color: #4dff4d; font-weight: 700; font-size: 0.85rem; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.3rem;">🔥 버프 (Buff)</div>
          <ul class="patch-bullet-list" style="margin: 0; padding: 0;">
            ${patch.buffs.map((item: string) => `<li>${item}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    if (patch.nerfs && patch.nerfs.length > 0) {
      sectionsHTML += `
        <div style="margin-top: 0.8rem;">
          <div style="color: #ff4444; font-weight: 700; font-size: 0.85rem; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.3rem;">❄️ 너프 (Nerf)</div>
          <ul class="patch-bullet-list" style="margin: 0; padding: 0;">
            ${patch.nerfs.map((item: string) => `<li>${item}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    if (patch.adjustments && patch.adjustments.length > 0) {
      sectionsHTML += `
        <div style="margin-top: 0.8rem;">
          <div style="color: #ffd700; font-weight: 700; font-size: 0.85rem; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.3rem;">⚡ 스킬 및 버그 조정 (Adjustment)</div>
          <ul class="patch-bullet-list" style="margin: 0; padding: 0;">
            ${patch.adjustments.map((item: string) => `<li>${item}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    if (patch.general && patch.general.length > 0) {
      sectionsHTML += `
        <div style="margin-top: 0.8rem;">
          <div style="color: #00f2fe; font-weight: 700; font-size: 0.85rem; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.3rem;">📢 전체 수정 내용 (General)</div>
          <ul class="patch-bullet-list" style="margin: 0; padding: 0;">
            ${patch.general.map((item: string) => `<li>${item}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    // Fallback for old content array
    if (!sectionsHTML && patch.content && patch.content.length > 0) {
      sectionsHTML = `
        <ul class="patch-bullet-list" style="margin: 0.5rem 0 0 0; padding: 0;">
          ${patch.content.map((item: string) => `<li>${item}</li>`).join("")}
        </ul>
      `;
    }

    patchCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span style="font-size: 1.2rem; font-weight: 800; color: #fff; font-family: 'Outfit', sans-serif;">${patch.version}</span>
          ${
            patch.isImportant
              ? `<span style="font-size: 0.7rem; color: #fff; background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%); padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700; letter-spacing: 0.5px;">IMPORTANT</span>`
              : ""
          }
        </div>
        <span style="font-size: 0.8rem; color: var(--text-secondary, #888);">${formattedDate}</span>
      </div>
      <h4 style="font-size: 1.05rem; color: var(--neon-yellow, #ffd700); margin: 0 0 0.8rem 0; font-weight: 700; text-align: left;">${patch.title}</h4>
      ${sectionsHTML}
    `;

    patchHistoryListEl.appendChild(patchCard);
  });
}

// Open modal manually or automatically
function openPatchModal() {
  if (patchModal) {
    patchModal.classList.remove("hidden");
  }
}

// Close modal & save last read version
if (patchCloseBtn) {
  patchCloseBtn.addEventListener("click", () => {
    if (latestVersion) {
      localStorage.setItem("last_read_patch_version", latestVersion);
    }
    if (patchModal) {
      patchModal.classList.add("hidden");
    }
  });
}

// Trigger button listener
if (patchNotesTriggerBtn) {
  patchNotesTriggerBtn.addEventListener("click", () => {
    openPatchModal();
  });
}

export function initPatchNotesSubscription() {
  convexClient.onUpdate(api.patchNotes.list, {}, (patches) => {
    if (!patches || patches.length === 0) return;

    // The first item is the latest one
    const latestPatch = patches[0];
    latestVersion = latestPatch.version;

    // Update lobby version badge
    if (lobbyVersionBadge) {
      lobbyVersionBadge.textContent = latestVersion;
    }

    // Render history
    renderPatchHistory(patches);

    // Auto-open logic: check if the latest version is unread
    const lastReadVersion = localStorage.getItem("last_read_patch_version");
    if (lastReadVersion !== latestVersion) {
      openPatchModal();
    }
  });
}
