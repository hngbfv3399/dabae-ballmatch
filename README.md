# 🏆 BALL BATTLE (담빵 볼게임 시뮬레이터)

**BALL BATTLE**은 개성 넘치는 캐릭터들의 고유 능력과 시뮬레이션 물리 충돌 판정을 통해 승자를 가리는 실시간 **캐릭터 볼게임 시뮬레이터**입니다. 
백엔드로 **Convex**를 연동하여 실시간 패치노트를 자동으로 내려받고 감지하는 모달 기능이 내장되어 있습니다.

---

## ✨ 주요 기능 (Key Features)

1. **캐릭터 선택 및 시뮬레이션**:
   - 최소 2인 이상 다양한 스킬과 능력치를 가진 캐릭터를 조합하여 물리 캔버스 상에서 실시간 전투 시뮬레이션을 수행합니다.
   - 1.0x, 1.5x, 2.0x 시뮬레이션 배속 설정 기능 및 3초 카운트다운 오버레이.
   
2. **실시간 전투 로그 & HUD**:
   - 우측 HUD 패널에서 각 캐릭터의 체력(HP) 상태, 스킬 시전 알림 및 생존 현황을 실시간으로 중계합니다.
   
3. **실시간 패치 내역 모달 (Convex 연동)**:
   - Convex BaaS 백엔드와의 실시간 웹소켓(WebSocket) 동기화를 적용했습니다.
   - 새로운 패치가 퍼블리싱되면 클라이언트 새로고침 없이 즉시 로비의 버전 텍스트가 갱신되고, 변경 항목들이 **[버프 / 너프 / 스킬 조정 / 전체 수정]**의 카테고리별 네온 뱃지와 함께 스크롤 카드로 누적(중첩) 노출됩니다.
   - 로컬 스토리지를 활용하여 동일한 패치는 최초 1회만 자동 팝업되며, 로비 우측 상단 `📋 패치노트` 버튼을 눌러 언제든지 수동으로 확인할 수 있습니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **프론트엔드 (Frontend)**:
  - Vanilla HTML5 Canvas & Vanilla TypeScript
  - Styling: Vanilla CSS (Glassmorphism & Neon Glow Aesthetics)
  - Build Tool: Vite
- **백엔드 (Backend)**:
  - Convex (Real-time BaaS)

---

## ⚙️ 시작하기 (Getting Started)

로컬 환경에서 프로젝트를 실행하는 방법입니다.

### 1. 패키지 설치
```bash
npm install
```

### 2. Convex 백엔드 로컬 개발 서버 구동
Convex 백엔드와의 실시간 동기화를 활성화하기 위해 새로운 터미널에서 다음 명령을 실행합니다:
```bash
npx convex dev
```
> 최초 실행 시 Convex 계정 로그인창이 팝업되며, 연동 완료 시 프로젝트 루트 디렉토리에 `.env.local` 파일이 자동으로 생성되어 백엔드 주소가 연동됩니다.

### 3. 프론트엔드 Vite 개발 서버 구동
```bash
npm run dev
```
기본적으로 `http://localhost:5173` 주소에서 웹 사이트를 실행합니다.

---

## 💾 환경 변수 설정 (Environment Variables)

프로젝트 루트의 `.env.local` 파일에 아래 환경 변수가 정의되어 있어야 합니다 (Convex 초기화 시 자동 생성됨):

```env
# Convex 프로젝트 고유 백엔드 API 엔드포인트 URL
VITE_CONVEX_URL=https://your-convex-app-subdomain.convex.cloud
```

---

## 🚀 배포 (Deployment)

### 1. Convex 백엔드 운영 배포
```bash
npx convex deploy
```
운영계 배포 완료 후 터미널에 생성되는 **Production Convex URL**을 복사해 둡니다.

### 2. Vercel 프론트엔드 배포
Vercel에 GitHub 레포지토리를 연동하여 배포할 때, 환경 변수(Environment Variables) 탭에 다음 설정을 반드시 추가해 줍니다:
- **Key**: `VITE_CONVEX_URL`
- **Value**: `npx convex deploy`에서 획득한 운영계 Convex API 주소
