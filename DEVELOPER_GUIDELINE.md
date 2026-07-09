# 🎮 담빵 볼게임 - AI 및 개발자 가이드라인 (Developer Guideline)

이 문서에는 프로젝트에 **신규 캐릭터 추가**, **게임 시스템 확장**, **캐릭터 밸런스 패치 및 리메이크** 등을 요청받았을 때 AI 또는 개발자가 따라야 하는 시스템적 순서와 규칙이 정리되어 있습니다.

---

## 1. 신규 캐릭터 추가 (Adding New Characters)

새로운 캐릭터를 추가할 때는 다음 4단계를 순서대로 밟아야 합니다.

### 1단계: 캐릭터 인터페이스 및 역할군 점검
* 대상 파일: [character.interface.ts](file:///Users/kimjiho/Desktop/담빵/dambae-ballgame/src/characters/character.interface.ts)
* 캐릭터가 가질 9대 세부 역할군(`role`) 중 하나를 매핑해야 합니다.
  * `Nuker` (누커), `Sniper` (저격수), `Speedster` (기동형), `Guardian` (수호형), `Juggernaut` (돌격형), `Disabler` (제어형), `Summoner` (소환형), `Specialist` (변수형), `Supporter` (지원형)

### 2단계: 신규 캐릭터 파일 생성
* 대상 파일: `src/characters/[id].ts` (예: `jiho.ts`, `doyun.ts` 참고)
* **필수 준수 사항**:
  1. **상수화**: 파일 최상단에 `SKILL_CONSTANTS` 객체를 정의하여 쿨타임, 대미지 배율, 디버프 확률, 지속시간 등의 수치를 전부 격리합니다.
  2. **설명문 동기화**: `skillDescription` 및 `detailedDescription`을 작성할 때 반드시 `SKILL_CONSTANTS`를 템플릿 리터럴(예: `${SKILL_CONSTANTS.COOLDOWN}`)로 결합하여 설명과 실제 동작 수치가 100% 동기화되게 합니다.
  3. **인터페이스 구현**: `CharacterConfig` 구조체 형식에 맞춰 기본 스탯(`maxHp`, `speed`, `attackPower`)과 훅 함수들(`onBasicAttack`, `onSkillTrigger`, `onUpdate`, `onRenderExtra`)을 정의합니다.

### 3단계: 캐릭터 매니저 등록
* 대상 파일: [characterManager.ts](file:///Users/kimjiho/Desktop/담빵/dambae-ballgame/src/characterManager.ts)
* 신규 생성한 캐릭터의 Config 객체를 `import`하고 `availableCharacters` 배열에 추가합니다. 이 작업을 누락하면 로비와 시뮬레이터에 캐릭터가 등장하지 않습니다.

### 4단계: 빌드 및 연습 모드 호환성 검증
* 대상 파일: [main.ts](file:///Users/kimjiho/Desktop/담빵/dambae-ballgame/src/main.ts)
* 연습 모드의 `dummyConfig` 인터페이스 등에 타입 깨짐이 없는지 확인한 후 `npm run build`를 실행하여 컴파일 에러 유무를 최종 점검합니다.

---

## 2. 게임 시스템 추가 (Adding Game Systems)

시뮬레이션 환경 또는 시스템적인 동작을 개선할 때의 규칙입니다.

### 1단계: 물리 및 충돌 처리
* 대상 파일: [gameLounge.ts](file:///Users/kimjiho/Desktop/담빵/dambae-ballgame/src/maingame/gameLounge.ts)
* `GameLounge` 클래스 내부의 `update` 루프 및 충돌 함수(`handleWallCollisions`, `handleCharacterCollisions`)가 메인 물리 시뮬레이션을 담당합니다.
* 새로운 상태이상(예: 침묵, 속박)이 필요한 경우 `CharacterState` 인터페이스를 먼저 수정하고 `gameLounge.ts` 내 프레임 업데이트 단에서 디버프 시간 감소 및 제어 불능 처리를 수행합니다.

### 2단계: HUD 및 데이터 연동
* 대상 파일: [main.ts](file:///Users/kimjiho/Desktop/담빵/dambae-ballgame/src/main.ts)
* 시뮬레이터 런타임 우측의 HUD 갱신(`updateHUD`) 및 라운드 카운트다운(`updateCountdown`) 흐름이 깨지지 않도록 해야 합니다.

### 3단계: UI 테마 스타일 유지
* 대상 파일: [style.css](file:///Users/kimjiho/Desktop/담빵/dambae-ballgame/src/style.css)
* 어두운 배경(Dark mode), 글래스모피즘(Backdrop filter), 은은한 네온 광원(Neon glow shadow) 스타일의 미래지향적 테마를 그대로 유지하여 디자인 일관성을 지킵니다.

---

## 3. 캐릭터 수정 (Buffs, Nerfs, Remakes)

밸런스 조정 및 기술 리메이크 요청이 왔을 때 조치 요령입니다.

### 밸런스 조정 (Buff & Nerf)
* **전투 수치 데이터 소스**: 
  * 전체 전투 및 매치 결과와 관련된 수치 데이터는 **Convex 데이터베이스**를 기준으로 통계 및 기록이 관리되고 있으며, 개별 캐릭터와 직접 관련된 스탯/스킬 밸런스 데이터는 각 캐릭터 파일 최상단의 `SKILL_CONSTANTS` 객체로 상수화하여 격리하고 있습니다.
* **절대 금지**: 액티브 코드(`onUpdate`, `onBasicAttack` 등) 내부나 UI 마크업 렌더러에 직접 수치(예: `1.5`, `3초`, `20`)를 기입하는 **하드코딩은 절대 금지**합니다. 밸런스 수정 시 반드시 Convex 데이터와 캐릭터별 `SKILL_CONSTANTS`만을 경유하여 조치해야 합니다.
* **조치 방법**: 해당 캐릭터 파일 상단의 `SKILL_CONSTANTS` 객체 필드 수치를 조정합니다. 텍스트 설명문은 템플릿 리터럴로 바인딩되어 있으므로 상수만 바꾸면 기획 내용이 카드 설명 및 모달에도 즉시 자동 갱신됩니다.

### 리메이크 (Remake)
* 스킬의 방식 자체가 바뀐다면 `onSkillTrigger`, `onUpdate` 내의 알고리즘을 개편하되, `SKILL_CONSTANTS` 역시 신규 동작에 알맞게 필드를 추가/제거 및 정리합니다.

---

## 4. 패치 완료 및 릴리즈 (Patch Completion & Release)

모든 작업과 로컬 빌드 테스트가 성공적으로 완료되었다면, 버전 업데이트 및 배포를 위해 다음 사항을 반드시 처리해야 합니다.

### 패치노트 최신화 및 배포
1. **GitHub/코드 베이스 패치노트 최적화**:
   * 로컬의 `PATCH_NOTES.md` 파일에 신규 패치 버전(예: `1.5.1`)과 해당 패치로 조정한 캐릭터의 버프/너프/리메이크 등 변경 내용을 양식에 맞춰 추가 작성한 후 푸시합니다.
2. **Convex 데이터베이스 패치노트 추가**:
   * 인게임 패치 모달에 노출되는 패치 내역 연동을 위해, 테스트 완료 후 **Convex 서버 데이터베이스**에도 해당 버전 패치노트 레코드를 업데이트/적재해야 합니다.
