# Mini React — Instagram으로 배우는 Virtual DOM

> "인스타그램 좋아요 버튼은 어떻게 이렇게 빠를까요?"

React가 왜 필요한가를 **세 가지 버전**(Vanilla JS / Mini React / Real React)을 나란히 비교하며 증명하는 교육용 프로젝트입니다.

## 프로젝트 구조

```
project/
├── index.html                   # SPA 진입점
├── style.css                    # 전체 레이아웃
├── shared/                      # 3버전 공통 데이터·상태·라우터
├── mini-react/src/              # Mini React 엔진 (직접 구현)
├── vanilla/src/                 # 버전 A — DOM 직접 조작
├── real-react/src/              # 버전 C — React + Vite
├── panels/                      # SPA 5개 패널
└── test/                        # 유닛 테스트
```

## 앱 구조 — SPA, 5개 패널

| 패널 | 역할 |
|------|------|
| 1. 피드 비교 | 세 버전 나란히 + 공통 컨트롤로 실시간 비교 |
| 2. VDom Inspector | 인터랙션 → VNode 트리 시각화 |
| 3. Diff & Patch 뷰어 | diff() → patch() 과정을 직접 확인 |
| 4. History 뷰어 | 상태 히스토리 타임라인 시각화 |
| 5. Benchmark | 성능 비교 + 구현 대응표 |

## 기술 스택

- Vanilla JavaScript (외부 라이브러리 없음)
- Mini React (Virtual DOM, Diff, Patch, Fiber, Hooks 직접 구현)
- React + Vite (비교 대상)

## 마일스톤

- **M1~M4**: Mini React 엔진 (VDom, Diff, Patch, History, Fiber, Hooks)
- **M5**: SPA 뼈대 + AppState
- **M6~M10**: 5개 패널 구현
- **M11**: README 완성 + 발표 준비
