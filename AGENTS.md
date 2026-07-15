<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Harness Engineering Guidelines (Token Saving)

## Code Reading Rules
1. Before modifying any character, **MUST read `docs/CHARACTERS.md` first** to find the specific region offset maps.
2. Do NOT use `view_file` on the entire character file. Always request specific line ranges via `#region` references to save context tokens.
3. If you only need to adjust balance values, read ONLY the `#region CONSTANTS` lines.

## Code Writing Rules
1. All character-specific mechanics must reside in their respective file inside `src/characters/`.
2. Do NOT add hardcoded character checks (like `if (char.id === 'name')`) to `gameLounge.ts`. Always define and call appropriate hooks in `CharacterConfig` interface.
3. Every character file must be structured with `#region` / `#endregion` comment boundaries exactly mapping to:
   - `TYPES`
   - `CONSTANTS`
   - `HELPERS`
   - `CONFIG`
   - `SKILL_TRIGGER`
   - `UPDATE`
   - `BASIC_ATTACK` (if any)
   - `COLLISION` (if any)
   - `DAMAGE` (if any)
   - `DEATH` (if any)
   - `RENDER`
4. All balance parameters and skill tuning magic numbers must be grouped under `SKILL_CONSTANTS` in `#region CONSTANTS`. Do NOT use inline magic numbers.
5. 테스트 및 밸런스 패치 완료 후 패치노트 추가 시, 로컬 마크다운 문서(`PATCH_NOTES.md`)에 상세 내역을 기록해야 하며, 추가로 Git 버전 관리 반영 및 Convex DB 백엔드 연동/배포(`npx convex dev` 또는 `deploy` 등을 통한 스키마 및 실시간 데이터 갱신) 프로세스를 수행하여 변경 사항이 데이터베이스 및 백엔드 서비스와 실시간 동기화되도록 조치해야 합니다.
6. When working on Season 4 (v4.0.0) upgrade tasks, always read `docs/SEASON_4_UPGRADE_GUIDE.md` first to understand current status, sequence, and specific rules. Update the guide's status checklists as you progress through each task.
