// [왜] Patch
// Diff가 "뭐가 달라졌는지" 목록을 만들었으면
// Patch는 그 목록을 보고 진짜 DOM을 고쳐요
// 바뀐 부분만 건드리니까 브라우저가 최소한만 다시 그려요

import { renderDOM } from './vdom.js'
import { PATCH_TYPES } from './diff.js'

/**
 * 패치 목록을 받아서 실제 DOM에 적용해요
 * @param {HTMLElement} rootDOM - 루트 DOM 요소 (VNode 트리의 루트에 대응)
 * @param {Array} patches - diff()가 만든 변경 목록
 *
 * path 해석:
 *   path = []     → rootDOM 자체
 *   path = [0]    → rootDOM의 0번째 자식
 *   path = [0, 2] → rootDOM의 0번째 자식의 2번째 자식
 */
export function patch(rootDOM, patches) {
  // EC-02: 변경 없는 Patch — patches가 비어있으면 DOM을 건드리지 않아요
  if (!patches || patches.length === 0) return

  // 삭제 패치를 뒤에서부터 적용해요 (인덱스가 밀리는 걸 방지)
  // CREATE도 뒤에서부터 해야 insertBefore가 정확해요
  const sorted = [...patches].sort((a, b) => {
    const aLast = a.path.length > 0 ? a.path[a.path.length - 1] : -1
    const bLast = b.path.length > 0 ? b.path[b.path.length - 1] : -1
    return bLast - aLast
  })

  for (const p of sorted) {
    applyPatch(rootDOM, p)
  }
}

/**
 * 개별 패치 하나를 적용해요
 */
function applyPatch(rootDOM, p) {
  const { path } = p

  // path가 비어있으면 루트 노드 자체에 대한 변경
  if (path.length === 0) {
    applyToNode(rootDOM, rootDOM.parentNode, p)
    return
  }

  // path를 따라가서 대상 노드와 부모를 찾아요
  const parentDOM = navigateTo(rootDOM, path.slice(0, -1))
  const targetIndex = path[path.length - 1]
  const targetDOM = parentDOM ? getMeaningfulChild(parentDOM, targetIndex) : null

  if (!parentDOM) return

  switch (p.type) {
    case PATCH_TYPES.CREATE: {
      const newDOM = renderDOM(p.newNode)
      if (newDOM) {
        const refChild = getMeaningfulChild(parentDOM, targetIndex)
        if (refChild) {
          parentDOM.insertBefore(newDOM, refChild)
        } else {
          parentDOM.appendChild(newDOM)
        }
      }
      break
    }

    case PATCH_TYPES.REMOVE: {
      if (targetDOM) {
        parentDOM.removeChild(targetDOM)
      }
      break
    }

    case PATCH_TYPES.REPLACE: {
      const newDOM = renderDOM(p.newNode)
      if (targetDOM && newDOM) {
        parentDOM.replaceChild(newDOM, targetDOM)
      }
      break
    }

    case PATCH_TYPES.TEXT: {
      if (targetDOM) {
        targetDOM.textContent = p.newText
      }
      break
    }

    case PATCH_TYPES.PROPS: {
      if (targetDOM) {
        applyPropPatches(targetDOM, p.propPatches)
      }
      break
    }
  }
}

/**
 * 루트 노드 자체에 패치를 적용해요
 */
function applyToNode(targetDOM, parentDOM, p) {
  switch (p.type) {
    case PATCH_TYPES.TEXT:
      targetDOM.textContent = p.newText
      break
    case PATCH_TYPES.PROPS:
      applyPropPatches(targetDOM, p.propPatches)
      break
    case PATCH_TYPES.REPLACE:
      if (parentDOM) {
        const newDOM = renderDOM(p.newNode)
        if (newDOM) parentDOM.replaceChild(newDOM, targetDOM)
      }
      break
  }
}

/**
 * 속성 패치를 적용해요
 */
function applyPropPatches(dom, propPatches) {
  for (const pp of propPatches) {
    if (pp.action === 'SET') {
      dom.setAttribute(pp.key, pp.value)
    } else if (pp.action === 'REMOVE') {
      // EC-03: 속성 완전 제거
      dom.removeAttribute(pp.key)
    }
  }
}

/**
 * path 배열을 따라가서 DOM 노드를 찾아요
 * path = [0, 2] → rootDOM의 의미있는 자식[0]의 의미있는 자식[2]
 *
 * 주의: DOM에는 공백 텍스트 노드가 있지만 VNode에서는 제거해요
 * 그래서 childNodes[idx]가 아니라, 의미있는 노드만 세서 idx번째를 찾아야 해요
 */
function navigateTo(rootDOM, path) {
  let current = rootDOM
  for (const idx of path) {
    if (!current || !current.childNodes) return null
    current = getMeaningfulChild(current, idx)
  }
  return current || null
}

/**
 * 공백만 있는 텍스트 노드를 건너뛰고 idx번째 의미있는 자식을 찾아요
 * domToVNode()과 같은 기준: 빈 공백 텍스트는 무시
 */
function getMeaningfulChild(parent, idx) {
  let count = 0
  for (const child of parent.childNodes) {
    // 공백만 있는 텍스트 노드는 건너뛰기 (domToVNode과 동일 기준)
    if (child.nodeType === 3 && child.textContent.trim() === '') continue
    if (count === idx) return child
    count++
  }
  return null
}
