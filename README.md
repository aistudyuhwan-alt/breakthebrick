# INU 벽돌깨기 (Break the Brick)

인천대학교 웹/앱 개발 과제 프로젝트로 제작된 **HTML5 Canvas & Next.js 기반 아케이드 벽돌깨기 웹 게임**입니다.  
PC 및 모바일 반응형 조작을 완벽히 지원하며, 게임 성공 기록을 Google Sheets 및 자체 API와 연동하여 실시간 명예의 전당(Top 3)으로 관리합니다.

---

## 1. 프로젝트 목적 및 개요

- **제작 목적**: Next.js App Router, TypeScript, HTML5 Canvas 및 React Hooks를 종합적으로 활용한 고품질 웹 아케이드 게임 구현.
- **게임 규칙**: 
  - 총 40개(5행 × 8열)의 파스텔 톤 벽돌 중 **정확히 12개의 연한 빨강 벽돌**이 랜덤 배치됩니다.
  - 도전자 미션: **연한 빨강 벽돌 3개를 격파하면 즉시 미션 성공!**
  - 생명은 3개 제공되며, 3번 모두 공을 놓치면 미션 실패로 처리됩니다.
  - 성공 시 소요된 시간(MM:SS)을 측정하여 Google Sheets에 자동 집계하고 Top 3 랭킹에 반영합니다.

---

## 2. 개발 환경 및 사용 기술

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, Lucide React (아이콘)
- **Game Engine**: HTML5 2D Canvas, `requestAnimationFrame`, Web Audio API (합성 효과음)
- **Audio & Assets**:
  - 배경음악: `Hyper_Speed_Run.mp3`
  - 마스코트: `Mascot.jpg` (인천대 마스코트)
  - 효과음: Web Audio API 기반 오실레이터 합성음 (벽돌 충돌, 패들 충돌, 성공 환호, 실패)
- **Visual Effects**: `canvas-confetti` (성공 시 축하 폭죽 효과)
- **Database / Storage**: Google Sheets (Google Apps Script Web App API 연동) + Fallback 인메모리 저장소

---

## 3. 프로젝트 폴더 구조

```text
breakthebrick/
├── public/
│   ├── Hyper_Speed_Run.mp3     # 게임 배경음악
│   └── Mascot.jpg              # 메인 및 게임 화면 마스코트 이미지
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── records/
│   │   │       └── route.ts    # Google Sheets 연동 및 랭킹 조회/저장 API
│   │   ├── globals.css         # 전역 Tailwind 및 테마 스타일
│   │   ├── layout.tsx          # 루트 레이아웃 (웹 타이틀: 'INU 벽돌깨기')
│   │   └── page.tsx            # 메인 홈 화면 (이름 입력, 제작자 정보, 명예의 전당 Top 3)
│   ├── components/
│   │   └── GameCanvas.tsx      # HTML5 Canvas 기반 벽돌깨기 게임 엔진 컴포넌트
│   ├── lib/
│   │   ├── sound.ts            # Web Audio API 효과음 생성 매니저
│   │   └── utils.ts            # shadcn 클래스 병합 유틸
│   └── types/
│       └── game.ts             # 기록 및 제작자 정보 타입 정의
├── google-apps-script.js       # Google Sheets Apps Script 배포용 소스코드 안내
├── .env.local.example          # 환경변수 템플릿
├── README.md                   # 프로젝트 종합 개발 문서
└── PROMPTS.md                  # AI 프롬프트 및 상호작용 기록
```

---

## 4. 주요 기능 및 구현 방식

1. **메인 화면 및 사용자 입력**:
   - 도전자 이름을 입력받아 게임 세션과 기록을 연결합니다.
   - 제작자 정보(학과, 학번, 이름)를 상단 및 하단에 명시하며 쉽게 수정 가능하도록 구조화되어 있습니다.
   - 명예의 전당 Top 3를 최단 시간 순으로 표시하며 실시간 새로고침 버튼을 제공합니다.
2. **5×8 벽돌 그리드 및 난수 배치**:
   - 총 40개 중 연한 빨강 12개, 나머지 5가지 파스텔(주황, 노랑, 파랑, 초록, 보라) 28개를 Fisher-Yates 알고리즘으로 무작위 셔플합니다.
3. **물리 엔진 및 충돌 처리**:
   - `requestAnimationFrame`을 이용한 60fps 부드러운 애니메이션.
   - 공이 패들의 중심에서 얼마나 먼 곳에 맞았는지에 따라 튕겨 나가는 각도(최대 약 75도)를 유동적으로 계산.
   - AABB 충돌 알고리즘 및 겹침 깊이(penetration depth) 계산으로 벽돌 끼임 현상과 단일 프레임 중복 충돌을 방지.
4. **생명 시스템 및 타이머**:
   - 생명 3개(하트 아이콘 표시), 바닥 추락 시 1개씩 감소.
   - 최초 3 → 2 → 1 준비 카운트다운 후 공이 발사되며 타이머가 작동.
   - 시간은 `MM:SS` 포맷으로 실시간 출력되며, 일시정지 시 타이머가 정지합니다.
   - 실패 시에는 기록을 저장하지 않고 종료됩니다.
   - 컨트롤 버튼: `일시정지/재개`, `다시 시작` (메인 화면 이동) 구성.
5. **사운드 & 미디어 제어**:
   - 사용자 인터랙션(시작 버튼 클릭) 후 BGM이 재생되도록 브라우저 자동 재생 정책을 완벽 준수.
   - BGM 음소거 버튼과 충돌 효과음(Web Audio API) 음소거 버튼을 개별적으로 제공.

---

## 5. PC 및 모바일 조작 방법

| 플랫폼 | 조작 방법 | 설명 |
| :--- | :--- | :--- |
| **PC** | **방향키 (`←`, `→`)** | 패들을 좌우로 자연스럽게 이동합니다. 게임 영역 밖으로 나가지 않습니다. |
| **PC** | **스페이스바 (`Space`)** | 게임 일시정지 및 재개를 빠르게 토글합니다. |
| **모바일** | **화면 터치 스와이프** | 게임 캔버스를 터치한 채 좌우로 드래그하여 패들을 이동합니다. (스크롤 방지 `touch-action: none` 적용) |

---

## 6. Google Sheets 연동 가이드

- **연동 대상 시트**: [Google Sheets 공유 링크](https://docs.google.com/spreadsheets/d/1MANR_JZPZBBLlFYqXt9qANNu9dl4NethJx8aa5XbfUk/edit?usp=sharing)
- **시트 컬럼 헤더 (1행)**: `timestamp`, `name`, `finishtime`
- **구현 기능**: 
  - `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` 환경 변수를 활용한 구글 앱스 스크립트 웹 앱 연동
  - CRUD(Create, Read, Update, Delete) 완벽 지원
  - 미션 성공 시 자동 기록 생성 및 **종료시간(`finishtime`) 오름차순 기준 가장 빠른 Top 3 순위 계산** 및 화면 렌더링

### 설정 및 배포 순서:
1. 연동 대상 구글 시트에 접속합니다.
2. 1행에 헤더를 작성합니다:
   - `A1: timestamp` | `B1: name` | `C1: finishtime`
3. 상단 메뉴에서 `확장 프로그램` > `Apps Script`를 클릭합니다.
4. 프로젝트 루트에 있는 [`google-apps-script.js`](file:///c:/Users/seolr/Desktop/2-2/AI코딩을활용한창의적앱개발/breakthebrick/google-apps-script.js) 파일의 코드를 복사하여 붙여넣고 저장합니다.
5. 우측 상단 `배포` > `새 배포`를 클릭합니다.
   - 유형: **웹 앱(Web app)**
   - 다음 사용자 권한으로 실행: **나(Me)**
   - 액세스 권한: **모든 사용자(Anyone)** (로그인 없이 누구나 접근 가능)
6. 발급된 Web App URL(`https://script.google.com/macros/s/.../exec`)을 복사합니다.
7. 프로젝트 루트의 `.env.local` 파일에 다음과 같이 입력합니다:
   ```env
   NEXT_PUBLIC_GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/AKfycb.../exec"
   ```
8. 이후 게임 미션 성공 시 `timestamp`, `name`, `finishtime` 데이터가 구글 시트에 즉시 등록(Create)되며, 저장된 전체 데이터 중 종료시간이 가장 빠른 3명을 오름차순으로 정렬하여 메인 화면에 1, 2, 3위로 실시간 출력합니다.

---

## 7. 실행 및 로컬 테스트 방법

```bash
# 1. 의존성 설치 (필요시)
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저에서 접속
# http://localhost:3000
```

---

## 8. 개발 중 발생한 문제와 해결 방법

1. **PowerShell 스크립트 실행 권한 문제 (`PSSecurityException`)**:
   - `npx` 명령 실행 시 Windows PowerShell의 `ExecutionPolicy` 제약으로 인해 스크립트 실행이 차단되는 문제 발생.
   - `cmd /c` 래퍼를 통해 명령을 전달하여 의존성 및 shadcn 환경을 정상적으로 초기화했습니다.
2. **벽돌 충돌 시 볼 끼임 및 다중 파괴 현상**:
   - 공이 프레임당 빠른 속도로 이동할 때 벽돌 내부로 깊숙이 진입하여 한 프레임에 여러 벽돌이 파괴되거나 반사 벡터가 꼬이는 문제.
   - 공과 벽돌의 겹침 영역(x축, y축 중첩 길이)을 비교하여 더 얕은 축을 기준으로 반사면을 결정하고, 1프레임당 최대 1개의 벽돌만 파괴하도록 충돌 즉시 `break` 처리했습니다.
3. **브라우저 AudioContext 자동 재생 정책(Autoplay Policy) 차단**:
   - 사용자의 클릭 동작 없이 소리를 재생하려 할 경우 오디오 컨텍스트가 `suspended` 상태로 멈추는 브라우저 정책.
   - '게임 시작' 버튼을 누르는 명시적인 유저 인터랙션 시점에 AudioContext를 resume하고, BGM 재생을 시작하도록 라이프사이클을 설계했습니다.
4. **Google Sheets 미연동 시 서비스 중단 위험 방지**:
   - 환경변수가 입력되지 않았거나 Google Apps Script 서버가 응답하지 않을 때 프론트엔드가 오류로 멈추는 것을 방지하기 위해, `/api/records` 엔드포인트 내에 인메모리 폴백(In-memory fallback) 캐시를 구현하여 오프라인 환경에서도 순위와 게임 플레이가 완벽히 동작하도록 처리했습니다.
