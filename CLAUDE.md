# CLAUDE.md — Mini React & 인스타그램 비교 프로젝트 (최종)

> Claude Code CLI 시작 시 자동으로 읽는 컨텍스트 파일입니다.
> 프로젝트 루트에 `CLAUDE.md`로 저장하세요.

---

## 🎯 프로젝트 목표

**"React가 왜 필요한가"를 세 버전을 나란히 보여주며 실시간으로 비교·증명한다.**

- **교육용** — 모든 코드는 내가 직접 이해하고 설명할 수 있어야 함
- **단독 개발** — 혼자 스피드 있게, 마일스톤 단위로 진행
- **SPA 구조** — 하나의 `index.html`, 5개 패널 전환
- **Instagram은 배경, VDom·Diff·Patch가 주인공**
- **세 버전 동시 실행** — 공통 컨트롤로 같은 동작, 실시간 비교
- **README.md = 발표 자료**

---

## 👤 개발 환경

- **개발자**: 1인 단독
- **IDE**: VS Code (ESLint + Prettier 필수)
- **툴**: Claude Code CLI
- **총 시간**: 13~14시간
- **기술 스택**: Vanilla JS / Mini React(직접 구현) / React + Vite

---

## 🖥️ 앱 구조 — SPA, 5개 패널

```
index.html (단일 파일)
│
├── 네비게이션: [피드·비교] [VDom] [Diff·Patch] [History] [Benchmark]
│
├── 패널 1: 피드 비교          ← 세 버전 나란히 + 공통 컨트롤
├── 패널 2: VDom Inspector     ← 인터랙션 → VNode 트리 시각화
├── 패널 3: Diff & Patch 뷰어  ← 과제 핵심 요구사항
├── 패널 4: History 뷰어       ← StateHistory 시각화
└── 패널 5: Benchmark          ← 성능 비교 + 구현 대응표
```

패널 1의 인터랙션 → AppState 업데이트 → 패널 2~4 자동 반영

---

## 🗂️ 파일 구조

```
project/
├── CLAUDE.md
├── index.html                   # SPA 진입점
├── style.css                    # 전체 레이아웃
│
├── shared/
│   ├── data.js                  # 3버전 공통 더미 데이터
│   ├── design-tokens.css        # 공통 디자인 토큰
│   ├── app-state.js             # 패널 간 공유 상태 (옵저버 패턴)
│   └── router.js                # 패널 전환
│
├── mini-react/src/              # Mini React 엔진
│   ├── vdom.js
│   ├── diff.js
│   ├── patch.js
│   ├── highlight.js
│   ├── history.js
│   ├── key-diff.js
│   ├── component.js
│   ├── fiber.js
│   ├── hooks.js
│   └── main.js
│
├── vanilla/src/                 # 버전 A
│   ├── feed.js
│   ├── story.js
│   └── infinite.js
│
├── real-react/                  # 버전 C (Vite, 별도 서버)
│   └── src/
│       ├── components/
│       │   ├── Feed.jsx
│       │   ├── Post.jsx
│       │   ├── Story.jsx
│       │   └── InfiniteScroll.jsx
│       └── App.jsx
│
├── panels/
│   ├── panel-feed.js            # 패널 1
│   ├── panel-vdom.js            # 패널 2
│   ├── panel-diff.js            # 패널 3
│   ├── panel-history.js         # 패널 4
│   └── panel-benchmark.js       # 패널 5
│
└── test/
    ├── vdom.test.js
    ├── diff.test.js
    ├── patch.test.js
    └── history.test.js
```

---

## 📐 고정 데이터 구조

### VNode (전 버전 공통)
```js
{
  type: 'div',       // 태그명(소문자), '#text', 또는 함수(컴포넌트)
  props: {
    id: 'app',
    class: 'post-card',
    key: '1',        // v3 이후
  },
  children: [],
  text: null         // type === '#text'일 때만
}
```

### Fiber 노드 (M4)
```js
{
  vnode: VNode,
  dom: HTMLElement,
  parent: Fiber,
  child: Fiber,
  sibling: Fiber,
  alternate: Fiber,       // 이전 렌더 사이클
  effectTag: string,      // 'PLACEMENT' | 'UPDATE' | 'DELETION'
  hooks: [],              // useState 상태 배열
}
```

### AppState (패널 간 공유)
```js
// shared/app-state.js — 옵저버 패턴
const AppState = {
  currentVNode: null,
  previousVNode: null,
  lastPatches: [],
  stateHistory: new StateHistory(),
  renderCounts: { vanilla: 0, miniReact: 0, realReact: 0 },
  benchmarkResults: [],
  listeners: [],

  update(partial) {
    Object.assign(this, partial)
    this.listeners.forEach(fn => fn(this))
  },

  subscribe(fn) { this.listeners.push(fn) }
}
```

### 공통 더미 데이터 (`shared/data.js`)
```js
export const createPost = (id) => ({
  id: String(id),
  user: {
    name: `user_${String(id).padStart(2, '0')}`,
    avatar: ['🧑','👩','🧔','👧'][id % 4],
  },
  image: `https://picsum.photos/seed/${id}/600/600`,
  likes: Math.floor(Math.random() * 500) + 10,
  liked: false,
  comments: [
    { id: `c${id}_1`, user: 'friend_01', text: '멋지다! 👍' },
    { id: `c${id}_2`, user: 'friend_02', text: '나도 가고 싶다 ✈️' },
  ],
  caption: ['오늘의 일상 ☀️','주말 나들이 🌿','맛있는 거 먹었다 😋','힐링 중 🧘'][id % 4],
})

export const createStory = (id) => ({
  id: String(id),
  user: { name: `user_${String(id).padStart(2, '0')}`, avatar: ['🧑','👩','🧔','👧'][id % 4] },
  seen: false,
})

export const INITIAL_POSTS   = Array.from({ length: 10 }, (_, i) => createPost(i + 1))
export const INITIAL_STORIES = Array.from({ length: 8  }, (_, i) => createStory(i + 1))
export let postIdCounter = 11
```

---

## 🖼️ 패널별 상세 구조

---

### 패널 1 — 피드 비교
> "같은 화면, 다른 방식 — 동시에 비교한다"

```
┌──────────────────────────────────────────────────────────────────┐
│  A. Vanilla          B. Mini React        C. Real React          │
│  DOM 직접 조작        Virtual DOM          실제 라이브러리         │
├───────────────────┬───────────────────┬──────────────────────────┤
│                   │                   │                          │
│  스토리 바         │  스토리 바         │  스토리 바               │
│  ─────────────    │  ─────────────    │  ─────────────           │
│  피드 카드         │  피드 카드         │  피드 카드               │
│  ❤️ 좋아요         │  ❤️ 좋아요         │  ❤️ 좋아요               │
│  💬 댓글           │  💬 댓글           │  💬 댓글                 │
│  (인피니티 스크롤) │  (인피니티 스크롤) │  (인피니티 스크롤)        │
│                   │                   │                          │
├───────────────────┴───────────────────┴──────────────────────────┤
│  🎮 공통 컨트롤 (버튼 하나 → 세 버전 동시 실행)                  │
│  [좋아요 1000회]  [포스트 +10개]  [댓글 50개]  [setState 3회]    │
│                                                                  │
│  렌더링 횟수:  A: 1,000 🔴    B: 47 ✅    C: 45 ✅              │
│  소요 시간:    A: 234ms 🔴    B: 18ms ✅  C: 15ms ✅            │
└──────────────────────────────────────────────────────────────────┘
```

**구현 기능 (3버전 동일)**
- 스토리 바 (가로 스크롤, 읽음 처리)
- 피드 카드 (좋아요 토글, 댓글 추가/삭제)
- 인피니티 스크롤 (Intersection Observer)

**공통 컨트롤 동작**
- 버튼 클릭 → 세 버전 동시 실행
- 렌더링 횟수 카운터 실시간 업데이트
- 소요 시간 `performance.now()`로 측정

---

### 패널 2 — VDom Inspector
> "클릭 하나에 내부에서 무슨 일이 일어나는가"

```
┌──────────────────────────┬──────────────────────────┐
│   이전 VNode 트리         │   현재 VNode 트리         │
│                          │                          │
│   div.post-card          │   div.post-card          │
│   └─ div.likes-row       │   └─ div.likes-row       │
│      └─ span.count       │      └─ span.count       │
│         └─ "127"         │         └─ "128" 🟡      │  ← 변경 강조
└──────────────────────────┴──────────────────────────┘
│  총 24개 노드 중 1개 변경됨                          │
└──────────────────────────────────────────────────────┘

색상 구분: 추가 🟢 / 수정 🟡 / 삭제 🔴
```

패널 1 인터랙션 → AppState.currentVNode 갱신 → 자동 업데이트

---

### 패널 3 — Diff & Patch 뷰어
> 과제 핵심 요구사항을 직접 보여주는 패널

```
┌─────────────────────┬─────────────────────┐
│   실제 영역          │   테스트 영역         │
│   (patch 반영됨)     │   (자유롭게 수정)     │
└──────────┬──────────┴──────────────────────┘
           │  [Patch]  [← 뒤로]  [앞으로 →]
           ↓
┌──────────────────────────────────────────────┐
│  Diff 결과 (patches 배열)                    │
│                                              │
│  [TEXT]  span.count  "127" → "128"           │
│                                              │
│  "1개 변경 감지 → DOM 1회 업데이트"           │
└──────────────────────────────────────────────┘
```

**페이지 로드 시 초기화 흐름 (반드시 이 순서대로)**
```
1. 실제 영역에 샘플 HTML 렌더링
2. 실제 영역 DOM → domToVNode() → initialVNode 생성
3. initialVNode로 테스트 영역 렌더링
4. StateHistory.push(initialVNode) — 초기 상태 저장
5. 이후 사용자가 테스트 영역 자유 수정 가능
```

**Patch 버튼 동작 흐름**
```
1. 테스트 영역 현재 DOM → domToVNode() → newVNode
2. diff(previousVNode, newVNode) → patches 배열 생성
3. patch(실제영역, patches) → 변경된 부분만 실제 영역 반영
4. StateHistory.push(newVNode) → 히스토리 저장
5. patches 배열 하단에 실시간 표시
```

**뒤로가기 / 앞으로가기 동작 흐름**
```
1. StateHistory.undo() 또는 redo() → targetVNode
2. 실제 영역: targetVNode로 전체 재렌더링
3. 테스트 영역: targetVNode로 함께 동기화 (★ 요구사항)
```

**기능 목록**
- 테스트 영역 HTML 자유 수정
- Patch: diff() → patch() → 실제 영역 반영 → History 저장
- 뒤로가기 / 앞으로가기: 실제 영역 + 테스트 영역 모두 변경
- patches 배열 실시간 표시 (Diff 5케이스 레이블)

---

### 패널 4 — History 뷰어
> "Ctrl+Z가 어떻게 동작하는가"

```
┌──────────────────────────────────────────────┐
│  State History                    3 / 5      │
│                                              │
│  ──●── 좋아요: 128   [00:01:23]  ← current  │
│  ──○── 댓글 추가     [00:01:19]              │
│  ──○── 좋아요: 127   [00:01:15]              │
│  ──○── 초기 상태     [00:01:10]              │
│                                              │
│  [← 뒤로가기]              [앞으로가기 →]    │
└──────────────────────────────────────────────┘
```

**기능**
- 히스토리 스택 타임라인 시각화
- 항목 클릭 → 해당 상태로 바로 이동
- 패널 1 실제 영역 + 테스트 영역 동기화

---

### 패널 5 — Benchmark
> "숫자로 증명하고, 원리로 연결한다"

**1부 — 성능 비교 (테스트 하나씩 순서대로)**

```
┌──────────────────────────────────────────────────┐
│  좋아요 1000회 연속                               │
│  "가장 흔한 인터랙션에서의 차이"                  │
│                                                  │
│  Vanilla     ████████████████████  234ms  🔴     │
│  Mini React  ████                   18ms  ✅     │
│  Real React  ███                    15ms  ✅     │
│                               → 13배 차이        │
│                                                  │
│              [다음 테스트 →]                     │
└──────────────────────────────────────────────────┘
```

측정 항목:
```
1. 좋아요 1000회 연속              (가장 흔한 인터랙션)
2. 포스트 100개 최초 렌더링         (초기 로딩)
3. 인피니티 스크롤 +10개            (스크롤 중 추가)
4. 렌더링 중 UI 블로킹 여부         (Fiber 핵심 지표)
5. setState 3회 동시 호출 렌더링 횟수 (Batching)
   Vanilla:    3회  Mini React: 1회  Real React: 1회
```

**2부 — 구현 대응표**

```
우리 구현                    Real React 대응
─────────────────────────────────────────────────
domToVNode()           →    React.createElement()
diff() 5케이스          →    Reconciler (ReactFiber.js)
patch()                →    react-dom commitWork()
key-diff               →    key prop 최적화
Fiber 스케줄러          →    scheduler 패키지 workLoop
useState               →    ReactHooks.js
Batch (큐 기반)         →    React 18 automatic batching
```

→ "우리가 구현한 것이 React의 핵심입니다"
→ README에 각 항목별 React 소스코드 링크 포함

---

## 🎨 디자인 가이드

> "인스타그램임을 한눈에 알 수 있는 수준" — 픽셀 단위 클론이 아님
> 패널별로 다른 분위기: 피드는 Instagram, 원리 패널은 DevTools 느낌

```css
/* shared/design-tokens.css */
:root {
  /* 색상 */
  --bg-primary:     #000000;
  --bg-secondary:   #121212;
  --bg-card:        #1c1c1c;
  --bg-panel:       #0a0a0a;
  --border:         #262626;
  --text-primary:   #f5f5f5;
  --text-secondary: #a8a8a8;
  --accent:         #0095f6;
  --like-active:    #ff3040;

  /* Diff 하이라이트 */
  --hl-add:    rgba(40, 167, 69,  0.25);
  --hl-update: rgba(255, 193, 7,  0.25);
  --hl-delete: rgba(220, 53,  69, 0.25);

  /* 타이포그래피 */
  --font-main: 'Pretendard', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* 간격 */
  --radius-md:  8px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}
```

**패널별 분위기**
| 패널 | 분위기 | 폰트 |
|------|--------|------|
| 1 피드 | Instagram 다크 — 콘텐츠 중심 | `--font-main` |
| 2~4 원리 | DevTools 느낌 — 코드 블록 | `--font-mono` |
| 5 벤치마크 | 발표 자료 — 큰 숫자, 명확한 차트 | `--font-main` |

---

## 🪜 마일스톤

| M | 목표 | 완료 기준 |
|---|------|-----------|
| **M1** | VDom + Diff + Patch + History | TC-01~07 통과 |
| **M2** | Highlight 시각화 | TC-08 통과 |
| **M3** | key-diff + component | TC-09 통과 |
| **M4** | Fiber + useState | TC-10~11 통과 |
| **M5** | SPA 뼈대 + AppState + 라우터 | 패널 전환 동작 |
| **M6** | 패널 1 — 피드 비교 (3버전 + 공통 컨트롤) | TC-12~16 통과 |
| **M7** | 패널 2 — VDom Inspector | 인터랙션 → 자동 업데이트 |
| **M8** | 패널 3 — Diff & Patch 뷰어 | Patch/뒤로/앞으로 동작 |
| **M9** | 패널 4 — History 뷰어 | 히스토리 시각화 |
| **M10** | 패널 5 — Benchmark (1부+2부) | 5개 측정 항목 + 대응표 |
| **M11** | README + 발표 리허설 | — |

> **M4까지 = 과제 핵심 요구사항 100% 충족**
> **M5~M10 = 발표 임팩트 확장**
> 각 M은 그 자체로 동작하는 완성본 — 중간에 멈춰도 이전 M은 발표 가능

---

## ⏱️ 타임라인

```
M1~M4   Mini React 엔진          3시간 30분
M5      SPA 뼈대 + AppState       45분
M6      패널 1 피드 (3버전)        3시간
M7      패널 2 VDom Inspector      1시간
M8      패널 3 Diff & Patch        1시간
M9      패널 4 History             45분
M10     패널 5 Benchmark           1시간
        엣지케이스 + 테스트        1시간
M11     README + 리허설            1시간
────────────────────────────────────────
총                                13시간
```

---

## 💡 교육 포인트 — 구현 전 주석으로 반드시 포함

```js
// [왜] Virtual DOM
// 브라우저는 DOM이 바뀌면 화면을 처음부터 다시 계산해요 (Reflow)
// 그리고 다시 그려요 (Repaint)
// Virtual DOM은 진짜로 바뀐 부분만 찾아서 한 번만 건드려요

// [왜] Diff 5케이스
// 두 나무를 완전히 비교하면 너무 오래 걸려요 (O(n³))
// 5가지 규칙으로 한 번에 훑으면 충분해요 (O(n))
// 1.추가 2.삭제 3.타입교체 4.텍스트변경 5.속성변경

// [왜] key
// key 없이 리스트 순서가 바뀌면 다 지우고 다시 만들어요
// key 있으면 "이 아이 저기로 옮기면 되네"로 끝나요

// [왜] Fiber
// Diff를 한 번에 다 하면 브라우저가 그 동안 멈춰요
// Fiber는 조금 하고 → 브라우저한테 양보 → 조금 하고를 반복해요
// requestIdleCallback: "브라우저야, 한가할 때 이거 해줘"

// [왜] useState
// 함수는 실행될 때마다 변수가 사라져요
// useState는 Fiber의 hooks[] 배열에 저장해서 기억해요
// 순서로 구분하기 때문에 조건문 안에 쓰면 안 돼요

// [왜] Batch
// setState를 3번 호출하면 렌더링이 3번 일어날까요?
// 아니에요 — Fiber 큐에 모아서 한 번에 처리해요
// 이게 React 18의 automatic batching과 같은 원리예요
```

---

## ⚠️ 엣지케이스

```
EC-01  빈 children 배열          children 항상 [] 초기화
EC-02  변경 없는 Patch           patches 빈 배열이면 DOM 수정 안 함
EC-03  속성 완전 제거             removeAttribute 처리
EC-04  연속 빠른 스크롤           isLoading 플래그로 중복 요청 방지
EC-05  더미 데이터 소진           hasMore 플래그 → "모두 불러왔어요"
EC-06  빈 댓글 입력               trim() 후 빈 문자열 차단
EC-07  XSS 입력                  textContent 사용 (발표 포인트)
EC-08  Fiber 무한 렌더링          업데이트 큐 재진입 방지 플래그
EC-09  requestIdleCallback 미지원  typeof 체크 → setTimeout(fn, 0) 폴백
EC-10  useState 조건부 호출        경고 출력 → QnA 포인트로 활용
```

---

## 🧪 테스트케이스

```
[Mini React 엔진]
TC-01  텍스트 변경          <p>안녕</p> → <p>반갑</p>
TC-02  속성 변경            class="red" → class="blue"
TC-03  노드 추가            li 1개 → li 2개
TC-04  노드 삭제            li 2개 → li 1개
TC-05  타입 교체            <p> → <span>
TC-06  히스토리 이동        Patch 3회 → 뒤로가기 2회
TC-07  중첩 구조 변경       span→strong + 텍스트 변경
TC-08  하이라이트           변경 노드 색상 + 1.5초 자동 제거
TC-09  key 최적화           순서 변경 → DOM 재생성 없음
TC-10  useState Counter     버튼 클릭 → count 증가
TC-11  Fiber 블로킹 없음    1000개 렌더링 중 버튼 클릭 가능

[패널 1 — 3버전 공통]
TC-12  좋아요 토글          3버전 동시 실행 → 숫자 +1/-1
TC-13  댓글 추가            3버전 동시 실행 → 목록 추가
TC-14  댓글 삭제            3버전 동시 실행 → 목록 제거
TC-15  스토리 읽음          클릭 시 흐리게 처리
TC-16  인피니티 스크롤      바닥 도달 → 3버전 모두 +10개

[엣지케이스]
TC-17  EC-01 빈 children
TC-18  EC-04 연속 스크롤 중복 방지
TC-19  EC-06 빈 댓글 차단
TC-20  EC-07 XSS 방지
TC-21  EC-10 useState 조건부 경고
```

---

## 🚨 코드 작성 규칙

1. **이해 우선** — 구현 전 "왜 필요한가" 주석 먼저
2. **주석은 어린 아이도 이해할 수 있게** — 전문 용어 없이 쉬운 말로
3. **마일스톤 단위 동작 보장** — 이전 M은 항상 완성 상태 유지
4. **AppState 단일 소스** — 패널 간 직접 통신 금지
5. **3버전 동일 기능** — 공통 컨트롤 기준으로 생략 없이 동일 구현
6. **EC-01~10 반드시 처리**
7. **파일 단위 분리** — 인라인 `<script>` 금지
8. **외부 라이브러리 금지** — 차트는 CSS width로 구현
9. **XSS 방지** — 사용자 입력은 항상 textContent
10. **v4 폴백 필수** — requestIdleCallback 미지원 시 setTimeout(fn, 0)

---

## ✅ 기능 완성 후 워크플로우

**구현 → EC 확인 → 유닛 테스트 → 커밋**

```js
// test/{모듈명}.test.js
function test(desc, fn) {
  try { fn(); console.log(`✅ ${desc}`) }
  catch(e) { console.error(`❌ ${desc}\n   → ${e.message}`) }
}
function assert(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${msg}\n기대: ${JSON.stringify(expected)}\n실제: ${JSON.stringify(actual)}`)
}
```

### Angular 커밋 컨벤션 (한국어)

| 타입 | 상황 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `test` | 테스트 추가 |
| `refactor` | 코드 개선 |
| `docs` | 문서·주석 |
| `chore` | 설정 |

```bash
feat(vdom): M1 domToVNode 함수 구현
test(vdom): domToVNode 유닛 테스트 추가
feat(diff): M1 Diff 5케이스 구현
fix(diff): EC-01 빈 children 배열 처리 수정
feat(fiber): M4 Fiber 스케줄러 구현
feat(app-state): M5 패널 간 공유 상태 구현
feat(panel-feed): M6 피드 비교 패널 + 공통 컨트롤 구현
feat(panel-benchmark): M10 벤치마크 1부 성능 비교 구현
feat(panel-benchmark): M10 벤치마크 2부 구현 대응표 추가
docs(readme): M11 발표 자료 작성
```

---

## 📝 README.md = 발표 자료

```markdown
# Mini React — Instagram으로 배우는 Virtual DOM

## 왜 만들었나요?
  "인스타그램 좋아요 버튼은 어떻게 이렇게 빠를까요?"

## 앱 구조 (5개 패널)
  패널별 역할 + 스크린샷

## Virtual DOM이 필요한 이유
  Reflow/Repaint → Virtual DOM → 성능 차이

## Diff 알고리즘 5케이스
  코드 스니펫 + 케이스별 설명

## key 최적화
  순서 변경 시나리오 비교

## Fiber — 브라우저가 멈추지 않는 이유
  requestIdleCallback 흐름

## useState — 상태를 기억하는 방법
  hooks[] 배열 구조

## Batch — setState를 모아서 한 번에
  3회 호출 → 1회 렌더링

## 벤치마크 결과 (1부: 성능 비교)
  측정 항목별 결과 + 핵심 인사이트

## 구현 대응표 (2부: React와 연결)
  우리 구현 → Real React 소스코드 링크

## 엣지케이스 처리 (EC-01~10)

## 테스트 결과 (TC-01~21)

## 배운 점
```

---

## 🎤 발표 시연 순서 (4분)

```
[0:00~0:30] 패널 1 열기
  "인스타그램에서 좋아요를 누르면 내부에서 어떤 일이 일어날까요?"
  공통 컨트롤 [좋아요 1000회] 클릭
  → A: 234ms 🔴  B: 18ms ✅  C: 15ms ✅ 실시간 비교

[0:30~1:10] 패널 2로 전환
  "VNode 트리에서 딱 이 노드 하나만 바뀌었습니다"
  → 변경 노드 하이라이트

[1:10~1:50] 패널 3으로 전환
  "Diff가 찾아낸 것은 이것뿐입니다"
  → patches 배열 보여주기
  → 테스트 영역 수정 → Patch → 실제 영역 반영

[1:50~2:20] 패널 4로 전환
  "뒤로가기로 되돌릴 수 있습니다"
  → 히스토리 스택 시각화

[2:20~3:30] 패널 5로 전환
  1부: 테스트 순서대로 진행 → "13배 차이"
  2부: 구현 대응표 → "우리가 만든 것이 React의 이 부분입니다"

[3:30~4:00] 마무리
  "Vanilla → Mini React → Real React
   이 흐름을 오늘 직접 만들었습니다"
```

### 예상 QnA

```
Q: Vanilla가 느린 정확한 이유?
A: 변경 여부와 무관하게 Reflow/Repaint가 전체 발생합니다.
   렌더링 횟수 카운터로 직접 보여드릴 수 있습니다.

Q: Mini React와 Real React 성능이 비슷한 이유?
A: 구현 대응표에서 보시듯 핵심 원리가 동일하기 때문입니다.
   차이는 엣지케이스 처리 수준에 있습니다.

Q: useState 순서가 바뀌면?
A: EC-10에서 직접 테스트했습니다.
   hooks[] 인덱스가 틀려져서 상태가 엉킵니다.
   React가 훅을 조건문 안에 쓰면 안 되는 이유입니다.

Q: XSS는 어떻게 막았나요?
A: innerHTML 대신 textContent를 사용했습니다.
   이게 Virtual DOM의 부수적 보안 이점 중 하나입니다.
```
