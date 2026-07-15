# 영구 플레이어 아이템 시스템 업데이트 설계서

## 1. 개요
본 문서는 캐릭터 성장, 도감, 가챠, PvE, PvP를 연결하는 “영구 플레이어 아이템 시스템”의 설계 및 구현 계획을 정리합니다. 본 시스템은 플레이어에게 영구 수집형 아이템을 제공하고, 게임 내 다양한 모드에서 캐릭터에게 보정을 부여하여 성장 체감을 강화하는 것을 목표로 합니다.

---

## 2. 세가지 시스템의 명확한 경계 및 생명주기

1. **영구 플레이어 아이템 (Permanent Player Items)**
   - **설명**: 뽑기권으로 획득하여 영구 보관하는 수집형 장비 아이템.
   - **장착**: 캐릭터별 장착 슬롯(기본 2개, Lv.20 도달 시 3번째 해금)에 장착.
   - **생명주기**: 영구 보존. 시즌 초기화(8주)에서 제외.
   - **효과 적용 모드**: PvE(슬라임 소굴, 붕괴한 연구소), PvP(개인전, 팀전, 토너먼트), 보스전의 일반 도전자 캐릭터.
   - **미적용 대상**: PvE 적/보스/전용 보스 캐릭터, 연습용 더미, 소환물/분신.

2. **런 증강 (Run Augments)**
   - **설명**: PvE 던전 진행 중 스테이지 선택 단계에서 획득하는 임시 강화 효과.
   - **생명주기**: 던전 종료/실패/로비 복귀 시 반드시 삭제.
   - **출현 제어**: 공용 증강 풀을 공유하되 던전 ID, 최소 스테이지, 캐릭터 ID 조건으로 출현 확률 및 등장 여부를 필터링.

3. **런 보상 아이템 (Run Reward Items)**
   - **설명**: PvE 2·4스테이지에서 획득하는 소모성/전투 칩 형태의 임시 버프 아이템.
   - **생명주기**: 던전 종료 시 삭제 (최대 3개 보유 규칙 유지).
   - **구분**: 영구 아이템과 혼동을 줄이기 위해 UI 및 변수명을 명확히 분리 (`PveRunModifiers.items` 유지).

---

## 3. 데이터 모델 (Convex DB Schema)

### 3-1. `persistentItemCatalog` (아이템 메타데이터 정의)
- `itemId: string` (Primary Key 역할)
- `name: string`
- `description: string`
- `rarity: "common" | "rare" | "epic" | "legendary" | "unique"`
- `characterId?: string`
- `isActive: boolean`
- `createdAt: number`
- `effects`:
  - `maxHpMultiplier?: number`
  - `speedMultiplier?: number`
  - `baseAttackRangeBonus?: number`
  - `defenseShieldBonus?: number`
- **Index**: `by_itemId`

### 3-2. `persistentItemUnlocks` (clientId별 해금 상태)
- `clientId: string`
- `itemId: string`
- `unlockedAt: number`
- **Index**: `by_clientId_and_itemId`, `by_clientId`

### 3-3. `characterItemLoadouts` (캐릭터별 장착 상태)
- `clientId: string`
- `characterId: string`
- `slot1ItemId?: string`
- `slot2ItemId?: string`
- `slot3ItemId?: string`
- `updatedAt: number`
- **Index**: `by_clientId_and_characterId`

### 3-4. `itemTicketBalances` (뽑기 티켓 잔액)
- `clientId: string`
- `availableTickets: number`
- `updatedAt: number`
- **Index**: `by_clientId`

### 3-5. `itemTicketClaims` (밀스톤 보상 수령 이력 - 중복 방지용)
- `clientId: string`
- `characterId: string`
- `milestoneLevel: number`
- `claimedAt: number`
- **Index**: `by_clientId_and_characterId_and_milestoneLevel`, `by_clientId_and_characterId`

### 3-6. `itemDrawHistory` (가챠 기록)
- `clientId: string`
- `itemId: string`
- `result: "unlocked"`
- `ticketConsumed: number`
- `createdAt: number`
- **Index**: `by_clientId_and_createdAt`

---

## 4. 적용 모드 및 효과 계산 순서

### 4-1. 효과 적용 모드
- **적용**: PvE(슬라임 소굴, 붕괴한 연구소), 개인전, 팀전, 토너먼트, 보스전 일반 도전자.
- **제외**: PvE 몬스터, PvE 보스, 전용 보스 캐릭터(예: 보스전의 보스 주주), 은수 분신 등 소환수, 연습용 더미.

### 4-2. 효과 계산 순서
1. **기본 캐릭터 스탯** (Config에 명시된 기본값)
2. **공용 캐릭터 레벨 성장** (`getPveProgress`에 의한 레벨 비례 보정)
3. **영구 플레이어 아이템** (장착된 슬롯 아이템의 수치 가산/곱산)
4. **PvE 런 증강** (인게임 증강 효과)
5. **PvE 런 보상 아이템** (인게임 보상 아이템 효과)
6. **전투 중 일시 버프 및 캐릭터 고유 스킬**

---

## 5. 첫 출시 아이템 4종

1. **관성 베어링** (`inertial_bearing`)
   - 이동 속도 +8%
   - 모든 모드 공용, 중첩 불가
2. **강화 외피** (`reinforced_shell`)
   - 최대 DEF 보호막 +12
   - 모든 모드 공용, 중첩 불가
3. **충격 렌즈** (`impact_lens`)
   - 기본 공격 사거리 +18px
   - 모든 모드 공용, 중첩 불가
4. **생체 완충재** (`bio_buffer`)
   - 최대 체력 +8%
   - 모든 모드 공용, 중첩 불가

---

## 6. 테스트 및 검증 시나리오
- **단위 테스트**: `convex/persistentItems` 스키마 및 가챠/장착 API 기능 검증.
  - 마일스톤 레벨 달성 시 티켓 멱등적 지급 검증.
  - 티켓이 없는 경우 뽑기 불가능 검증.
  - 이미 모든 아이템을 소유한 경우 가챠를 돌려도 티켓 미소모 처리 검증.
  - 캐릭터 레벨 20 미만 시 슬롯 3 장착 실패 검증.
  - 미보유 아이템 장착 시도 시 예외 처리 검증.
- **통합 검증**: `npm run build` 및 `npm run test:balance` 실행 확인.
- **배포 검증**: Convex Production/Local 배포 후 실시간 Sync 검증.
