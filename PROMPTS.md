# 개발 프롬프트 기록 (PROMPTS.md)

본 문서는 **INU 벽돌깨기** 프로젝트 개발 과정에서 AI와 상호작용한 프롬프트 및 시스템 처리 내역을 시간순으로 기록한 문서입니다.

---

## 1. 초기 언어 설정

- **일시**: 2026-10-22 14:29:59
- **사용자 입력**:
  ```text
  한글로 출력
  ```
- **응답 및 조치**: 한국어로 응답을 진행하도록 설정하고 다음 작업을 대기함.

---

## 2. Next.js 프로젝트 생성

- **일시**: 2026-10-22 14:30:55
- **사용자 입력**:
  ```bash
  npx create-next-app@latest .
  ```
- **응답 및 조치**:
  - PowerShell의 스크립트 실행 권한 정책(`PSSecurityException`) 오류를 감지하고, `cmd /c`를 통해 TypeScript, Tailwind CSS, App Router, `@/*` import alias 설정을 반영한 Next.js 애플리케이션 초기화 완료.

---

## 3. UI 라이브러리(shadcn) 초기화

- **일시**: 2026-10-22 14:41:07
- **사용자 입력**:
  ```bash
  npx shadcn@latest init
  ```
- **응답 및 조치**:
  - `cmd /c "npx shadcn@latest init -y -d"` 실행을 통해 `components.json`, `src/lib/utils.ts`, `globals.css` 테마 설정 및 `Button` 컴포넌트 환경 구축 완료.

---

## 4. INU 벽돌깨기 핵심 기능 및 요구사항 전체 구현

- **일시**: 2026-10-22 14:46:18
- **사용자 입력**:
  ```markdown
  # Next.js 기반 INU 벽돌깨기 게임 제작
  - 메인 페이지 구성: 타이틀 'INU 벽돌깨기', 사용자 이름 입력, 시작 버튼, 제작자 정보, 가이드, Top 3 기록
  - 5행 8열 벽돌 (총 40개), 6가지 파스텔 색상, 연한 빨강 12개 고정 + 28개 랜덤
  - PC 방향키(←, →), 모바일 스와이프 제어 (터치 스크롤 방지)
  - 준비 카운트다운(3, 2, 1), 생명 3개 시스템
  - 성공 조건: 연한 빨강 벽돌 3개 제거 시 즉시 성공 및 Confetti 폭죽 효과
  - MM:SS 시간 측정 및 실패 시 미기록
  - 일시정지, 다시 시작, 게임 종료 제어
  - Mascot.jpg 및 Hyper_Speed_Run.mp3 활용, Web Audio API 효과음
  - Google Sheets 연동 (GAS 웹앱 API 지원 및 폴백 안전 처리)
  - README.md 및 PROMPTS.md 작성
  ```
- **응답 및 조치**:
  1. 프로젝트 루트의 `Mascot.jpg`와 `Hyper_Speed_Run.mp3` 파일을 확인하고 `public/` 정적 서빙 폴더로 복사.
  2. 폭죽 효과(`canvas-confetti`) 및 아이콘 팩(`lucide-react`) 설치.
  3. `src/types/game.ts` 타입 정의 작성.
  4. Web Audio API 기반 오디오 매니저(`src/lib/sound.ts`) 구현 (벽돌/패들/벽 충돌, 승리 팡파레, 실패음).
  5. HTML5 2D Canvas 게임 엔진(`src/components/GameCanvas.tsx`) 구현:
     - 5x8 그리드 파스텔 벽돌 무작위 생성 (빨강 12개 고정)
     - AABB 반사 물리 및 패들 충돌 각도 조절 로직
     - 3-2-1 카운트다운, 생명 시스템, MM:SS 타이머
     - PC 방향키 및 모바일 터치 스와이프 핸들러
  6. 메인 페이지(`src/app/page.tsx`) 구축:
     - 마스코트 이미지 연동, 이름 입력 폼, Top 3 명예의 전당, 제작자 정보, 게임 가이드
  7. Google Sheets 연동 API(`src/app/api/records/route.ts`), GAS 배포 가이드(`google-apps-script.js`), 환경변수 템플릿(`.env.local.example`) 생성.
  8. `npm run build` 검증 수행: TypeScript 타입 오류 및 빌드 경고 없이 100% 정상 통과 확인.
  9. 프로젝트 문서 `README.md` 및 상호작용 내역 `PROMPTS.md` 작성 완료.

---

## 5. UI 버튼 간소화 요청

- **일시**: 2026-10-22 14:54:50
- **사용자 입력**:
  ```text
  종료하기 버튼은 없어도 될거 같아
  ```
- **응답 및 조치**:
  - `src/components/GameCanvas.tsx` 하단 컨트롤 바에서 '게임 종료' 버튼을 제거하고, `일시정지/재개` 및 `다시 시작` 2개 버튼 구성으로 깔끔하게 조정.
  - 관련 문서(`README.md`) 반영 완료.

---

## 6. 구글 시트 연동 및 CRUD 지원 Apps Script 생성

- **일시**: 2026-10-22 14:56:39
- **사용자 입력**:
  ```text
  - 구글 시트 공유 링크
  https://docs.google.com/spreadsheets/d/1MANR_JZPZBBLlFYqXt9qANNu9dl4NethJx8aa5XbfUk/edit?usp=sharing
  - 해당 구글 시트의 'timestamp','name','finishtime'에 대해 CRUD하는 구글 앱스 스크립트 생성
  ```
- **응답 및 조치**:
  - 사용자 지정 스프레드시트 ID(`1MANR_JZPZBBLlFYqXt9qANNu9dl4NethJx8aa5XbfUk`)와 헤더 필드(`timestamp`, `name`, `finishtime`)에 맞추어 `google-apps-script.js` 생성 완료.
  - Create(행 추가), Read(시간순 정렬 조회), Update(수정), Delete(삭제) 지원.
  - Next.js 서버 측 API 라우트(`src/app/api/records/route.ts`)를 해당 3개 컬럼 스키마와 완벽히 호환되도록 업데이트.
  - `README.md` 가이드 문서 갱신 완료.

---

## 7. NEXT_PUBLIC_GOOGLE_SCRIPT_URL 기반 CRUD 및 종료시간 오름차순 Top 3 랭킹 구현

- **일시**: 2026-10-22 15:05:25
- **사용자 입력**:
  ```text
  - .env.local 파일에 있는 NEXT_PUBLIC_GOOGLE_SCRIPT_URL 키 값을 이용하여 CRUD를 수행하는 기능 구현
  - 게임을 성공하여 사용자 데이터를 기록 후, 구글 시트에 저장된 데이터 중 종료시간이 가장 빠른 3명을 순위를 매겨 화면에 출력 수행
  - 순위는 종료시간에 따른 오름차순을 적용하여 계산
  - 이 기능에 대한 구글 앱스 스크립트와 웹 서비스 기능 구현
  ```
- **응답 및 조치**:
  1. `.env.local` 및 `.env.local.example`에 `NEXT_PUBLIC_GOOGLE_SCRIPT_URL=""` 키 환경 변수 구성.
  2. `google-apps-script.js`에 종료시간 오름차순 정렬 및 순위(rank 1~3)를 매겨 반환하는 API 로직 구현.
  3. `src/app/api/records/route.ts`에서 `NEXT_PUBLIC_GOOGLE_SCRIPT_URL`을 우선 참조하여 구글 시트 데이터(timestamp, name, finishtime)를 가져와 초 단위 오름차순 정렬 후 최상위 3명(Top 3)을 선별하도록 구현.
  4. 메인 페이지(`src/app/page.tsx`)에서 게임 미션 성공 시 `POST`로 데이터를 저장하고 즉시 최신 Top 3 랭킹을 불러와 화면에 실시간 갱신하도록 연동.
  5. `npm run build` 검증 및 README.md / PROMPTS.md 업데이트 완료.
