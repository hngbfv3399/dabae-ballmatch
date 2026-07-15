# Game Development & Contribution Guidelines (AI Harness Document)

This guide defines the engineering workflows for modifying balance, creating new characters, or adding new gameplay systems to the `dambae-ballgame` repository. Following these rules prevents token waste and maintains decoupled code design.

---

## 1. Character Balance Patch Workflow

When an agent needs to adjust variables (damage, speed, range, cooldowns):
1. **Rule of Single Region**: Read ONLY the `#region CONSTANTS` block of the target character file.
2. **No Inline Magic Numbers**: Never hardcode values directly inside logic or rendering functions. All variables must reside in the `SKILL_CONSTANTS` object.
3. **Update Documentation**: If a constant changes, update its value in the character's summary description block within `#region CONFIG` as well as in `docs/CHARACTERS.md`.

---

## 2. New Character Creation Workflow

To add a new playable character to the game, follow these four steps:

### Step 2.1: Implement the Character File
Create a new file under `src/characters/[character_id]/normal.ts`. Boss-only characters use `src/characters/[character_id]/boss.ts`; do not derive them by scaling a normal character at runtime. You MUST use the exact skeleton template below, maintaining the `#region` structures.

```typescript
import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from './character.interface';

// ═══════════════════════════════════════════
// #region TYPES — local state types
// ═══════════════════════════════════════════
interface CustomCharacterState extends CharacterState {
  customVariable?: number;
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS — balance tuning values
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  COOLDOWN: 6,
  SKILL_DURATION: 3.0,
  BASE_ATK: 12,
  SPEED_BUFF_PCT: 20,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region CONFIG — character configuration & stats
// ═══════════════════════════════════════════
export const customCharConfig: CharacterConfig = {
  id: 'custom_id',
  name: 'Character Name',
  maxHp: 140,
  speed: 1.3,
  attackPower: SKILL_CONSTANTS.BASE_ATK,
  baseAttackRange: 45,
  skillName: 'Skill Name',
  skillDescription: 'Describe the active skill mechanics and stats.',
  color: '#ff0000', // Hex color representation
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN,
  tier: 'B',
  role: 'Nuker',
  detailedDescription: 'Provide gameplay instructions and tactical recommendations.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — skill activation hook
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx: CharacterBehaviorContext) {
    char.skillActive = true;
    char.skillDurationLeft = SKILL_CONSTANTS.SKILL_DURATION;
    ctx.addFloatingText(char.x, char.y - 50, '🔥 Skill Active!', char.color, 1.5);
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — frame tick updates (60fps)
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx: CharacterBehaviorContext) {
    if (char.skillActive) {
      char.skillDurationLeft -= dt;
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
      }
    }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DAMAGE — damage manipulation hooks
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, _attacker: CharacterState, damage: number, _ctx: CharacterBehaviorContext) {
    // Return modified damage. Set blocked to true to negate damage.
    return { finalDamage: damage, blocked: false };
  },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region RENDER — graphics rendering hooks
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    // Custom drawings above/under the character circle
  }
  // #endregion RENDER
};
```

### Step 2.2: Register in Character Manager
Open `src/characterManager.ts` and perform two modifications:
1. Import the newly created configuration:
   ```typescript
   import { customCharConfig } from './characters/custom_id';
   ```
2. Add it to the appropriate export array:
   ```typescript
   export const availableCharacters: CharacterConfig[] = [
     // ...
     customCharConfig // normal character
   ];
   ```

### Step 2.3: Update Harness Documentation
Append the character details to [docs/CHARACTERS.md](file:///Users/kimjiho/Desktop/담빵/dambae-ballgame/docs/CHARACTERS.md) so future AI agents can locate the regions instantly without parsing the new code.

---

## 3. New Content & Feature Creation Guidelines

When introducing new mechanics (e.g., custom arenas, items, simulation speed toggles, environmental traps):

1. **No Coupling in gameLounge.ts**: Do not add hardcoded conditions checking specific character names or custom modes inside the core loops.
2. **Engine Expansion via Context**: If a new feature requires talking to characters, expose a new callback inside `CharacterBehaviorContext` (`src/characters/character.interface.ts`) and implement it in `gameLounge.ts`.
3. **Decoupled Entities**: Store new gameplay items or traps as separate classes/interfaces and process them generically in `GameLounge` update loop.

---

## 4. Coding Rules & Best Practices

All code modifications and contributions must strictly follow these coding guidelines to maintain type safety and avoid runtime crashes:

### 4.1. Strict Type Safety & Castings
- **Avoid Unstructured `any`**: Try not to declare variables as `any` unless restoring state during deep-copy functions. 
- **Explicit Casting**: When accessing dynamically injected state variables (e.g., `swapPortals`, `doyunShield`), cast the character object using the correct extended interface (e.g., `const js = char as JujuState;`).
- **No Unused Variables**: Ensure all imported types or function arguments are read, or prefixed with an underscore (e.g., `_attacker`) to prevent TypeScript compilation failures (`noUnusedLocals` / `noUnusedParameters`).

### 4.2. State Management Rules
- **No File-Scope State**: Never store dynamic game states as global variables inside the character files (e.g., `let activeShieldTime = 3`). Global states will bleed across matches and multiplayer instances.
- **Store in State Object**: Always attach dynamic values to the `CharacterState` object itself (extend the interface in `#region TYPES` if necessary).

### 4.3. Sound & Web Audio API
- **Auto-play Prevention**: Browsers block audio nodes until a user interaction occurs.
- **Safe Wrapping**: Always wrap oscillator or audio buffer generation inside `try-catch` blocks and execute only under the `window` environment to prevent server-side rendering or initialization crashes:
  ```typescript
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const audio = new AudioCtx();
      // Oscillator logic...
    }
  } catch (e) {
    console.warn('Audio contextual block:', e);
  }
  ```

### 4.4. Rendering Optimizations
- **Save and Restore Context**: When modifying canvas contexts (`ctx.globalAlpha`, `ctx.fillStyle`, `ctx.translate`, etc.), always wrap the drawings between `canvasCtx.save()` and `canvasCtx.restore()`. This isolates draw state pollution from other characters.
- **No Blocking Drawings**: Do not trigger long loops or synchronous image loads inside `onRenderExtra` or `onRenderOverlay`. All images must be preloaded in `GameLounge.preloadedImages`.

---

## 5. Post-Development Workflows (Git, Convex & Patch Notes)

Once the new feature/character is verified and TypeScript compilation succeeds, the agent must perform the following post-development steps:

### 5.1. Update Patch Notes
- **Document Changes**: Add a brief entry in the repository-root [`PATCH_NOTES.md`](../PATCH_NOTES.md) outlining the changes (e.g., version, date, and description of the new character or balance numbers).
- **Format**: Use standard bullet points describing the balance ratios, skill adjustments, or bugs squashed.

### 5.1.1. Balance Regression Check
- **Baseline Test**: Before and after a numeric balance change, run `npm run test:balance`.
- **Interpretation**: The test is deterministic and covers base stats only; it is a regression signal, not a replacement for skill-inclusive manual playtesting. See [`docs/BALANCE_TESTING.md`](BALANCE_TESTING.md).

### 5.2. Git Version Control & Commits
- **Precise Commit Scope**: Stage only relevant modified modules using `git add`.
- **Meaningful Message**: Use clear prefix rules:
  - `feat: add character juyeon`
  - `balance: adjust chanhwi skill timers`
  - `fix: resolve doyun shield collision overlap`
  - `docs: update development guidelines`

### 5.3. Convex Backend Integration & Sync
- **Backend Schema Sync**: If character parameters, databases, or game states are backed by Convex, ensure that any changes are immediately synced.
- **Commands**: Proactively run `npx convex dev` to push changes to the local development sandbox, or `npx convex deploy` to sync remote server functions.
- **Verification**: Ensure no backend deployment warnings or database constraints fail after the frontend logic updates.

### 5.4. Dev Database Virtual Data Reset
- **Command**: `npm run dev:reset-data -- --confirm-dev-reset`
- **Safety**: The script always targets only `curious-perch-72` and refuses to run unless `.env.local` explicitly names `dev:curious-perch-72`. It accepts no production override.
- **Seed Profile**: The reset imports deterministic virtual levels, dungeon records, rankings, item tickets, permanent-item unlocks, and loadouts. All other Dev data is removed with Convex `--replace-all`.
- **Browser Fixture**: After resetting, run `localStorage.setItem("dambae-ballgame-anonymous-client-id", "dev-virtual-client")` in the browser console and refresh to use the seeded item inventory.
