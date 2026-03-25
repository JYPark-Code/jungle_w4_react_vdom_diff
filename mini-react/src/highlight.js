// [왜] Highlight (변경 시각화)
// Diff가 찾아낸 변경 사항을 눈으로 확인할 수 있게
// 변경된 DOM 노드에 색깔 배경을 입혀요
// 추가 = 초록, 수정 = 노랑, 삭제 = 빨강
// 1.5초 후 자동으로 사라져요 — DevTools 느낌!

import { PATCH_TYPES } from './diff.js'

/**
 * 하이라이트 색상 매핑
 * CSS 변수(design-tokens.css)와 일치시켜요
 */
const HIGHLIGHT_COLORS = {
  [PATCH_TYPES.CREATE]:  'rgba(40, 167, 69, 0.25)',   // 초록 — 추가
  [PATCH_TYPES.REMOVE]:  'rgba(220, 53, 69, 0.25)',   // 빨강 — 삭제
  [PATCH_TYPES.REPLACE]: 'rgba(255, 193, 7, 0.25)',   // 노랑 — 교체
  [PATCH_TYPES.TEXT]:    'rgba(255, 193, 7, 0.25)',   // 노랑 — 텍스트 변경
  [PATCH_TYPES.PROPS]:   'rgba(255, 193, 7, 0.25)',   // 노랑 — 속성 변경
}

/**
 * 하이라이트 지속 시간 (밀리초)
 */
const HIGHLIGHT_DURATION = 1500

/**
 * 패치가 적용된 DOM 노드들에 하이라이트를 입혀요
 * @param {HTMLElement} rootDOM - 패치가 적용된 루트 DOM
 * @param {Array} patches - diff()가 만든 패치 목록
 * @returns {Array} 하이라이트된 DOM 노드 목록 (테스트용)
 */
export function highlightPatches(rootDOM, patches) {
  if (!patches || patches.length === 0) return []

  const highlighted = []

  for (const p of patches) {
    const targetDOM = findDOMByPath(rootDOM, p.path)
    if (!targetDOM) continue

    // 텍스트 노드는 하이라이트할 수 없으니 부모에 입혀요
    const highlightTarget = targetDOM.nodeType === 3
      ? targetDOM.parentNode
      : targetDOM

    if (!highlightTarget || !highlightTarget.style) continue

    // 이전 타이머가 있으면 취소 (빠르게 연속 클릭 시 충돌 방지)
    if (highlightTarget._highlightTimer) {
      clearTimeout(highlightTarget._highlightTimer)
    }

    // 하이라이트 적용
    const color = HIGHLIGHT_COLORS[p.type] || HIGHLIGHT_COLORS[PATCH_TYPES.PROPS]
    highlightTarget.style.backgroundColor = color
    highlightTarget.style.outline = `2px solid ${color.replace('0.25', '0.6')}`
    highlightTarget.style.transition = 'background-color 0.5s, outline 0.5s'

    highlighted.push(highlightTarget)

    // 1.5초 후 자동 제거 — 항상 빈 값으로 초기화
    highlightTarget._highlightTimer = setTimeout(() => {
      highlightTarget.style.backgroundColor = ''
      highlightTarget.style.outline = ''
      highlightTarget.style.transition = ''
      highlightTarget._highlightTimer = null
    }, HIGHLIGHT_DURATION)
  }

  return highlighted
}

/**
 * path 배열을 따라가서 DOM 노드를 찾아요
 * 공백 텍스트 노드를 건너뛰어서 VNode 인덱스와 맞춰요
 */
function findDOMByPath(rootDOM, path) {
  if (!path || path.length === 0) return rootDOM

  let current = rootDOM
  for (const idx of path) {
    if (!current || !current.childNodes) return null
    current = getMeaningfulChild(current, idx)
  }
  return current || null
}

function getMeaningfulChild(parent, idx) {
  let count = 0
  for (const child of parent.childNodes) {
    if (child.nodeType === 3 && child.textContent.trim() === '') continue
    if (count === idx) return child
    count++
  }
  return null
}
