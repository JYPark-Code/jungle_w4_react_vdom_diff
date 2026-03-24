// [왜] Diff 5케이스
// 두 나무를 완전히 비교하면 너무 오래 걸려요 (O(n³))
// 5가지 규칙으로 한 번에 훑으면 충분해요 (O(n))
// 1.추가 2.삭제 3.타입교체 4.텍스트변경 5.속성변경
//
// 이전 VNode 트리와 새 VNode 트리를 비교해서
// "뭐가 달라졌는지" 목록(patches)을 만들어요
// 이 목록만 있으면 진짜 DOM을 최소한으로 고칠 수 있어요

/**
 * 패치 타입 상수
 * 어떤 종류의 변경인지 구분하는 이름표예요
 */
export const PATCH_TYPES = {
  CREATE:  'CREATE',   // 새 노드가 추가됐어요
  REMOVE:  'REMOVE',   // 기존 노드가 삭제됐어요
  REPLACE: 'REPLACE',  // 노드 타입이 바뀌었어요 (예: p → span)
  TEXT:    'TEXT',      // 텍스트 내용이 바뀌었어요
  PROPS:   'PROPS',    // 속성만 바뀌었어요 (예: class="red" → "blue")
}

/**
 * 두 VNode 트리를 비교해서 패치 목록을 만들어요
 * @param {object|null} oldNode - 이전 VNode
 * @param {object|null} newNode - 새 VNode
 * @param {Array} parentPath - 현재 노드까지의 경로 (부모에서부터 자식 인덱스를 쌓아요)
 * @returns {Array} patches - 변경 목록
 *
 * path의 의미:
 *   [] = 루트 노드 자체
 *   [0] = 루트의 0번째 자식
 *   [0, 2] = 루트의 0번째 자식의 2번째 자식
 * patch()에서 이 경로를 따라가서 DOM에서 정확한 위치를 찾아요
 */
export function diff(oldNode, newNode, parentPath = []) {
  const patches = []

  // 케이스 1: 추가 — 이전에 없던 노드가 새로 생겼어요
  if (oldNode == null && newNode != null) {
    patches.push({
      type: PATCH_TYPES.CREATE,
      path: parentPath,
      newNode,
    })
    return patches
  }

  // 케이스 2: 삭제 — 있던 노드가 사라졌어요
  if (oldNode != null && newNode == null) {
    patches.push({
      type: PATCH_TYPES.REMOVE,
      path: parentPath,
    })
    return patches
  }

  // 둘 다 없으면 변경 없음
  if (oldNode == null && newNode == null) {
    return patches
  }

  // 케이스 3: 타입 교체 — 태그 자체가 바뀌었으면 통째로 교체해요
  if (oldNode.type !== newNode.type) {
    patches.push({
      type: PATCH_TYPES.REPLACE,
      path: parentPath,
      newNode,
    })
    return patches
  }

  // 케이스 4: 텍스트 변경 — 글자만 달라진 경우
  if (oldNode.type === '#text') {
    if (oldNode.text !== newNode.text) {
      patches.push({
        type: PATCH_TYPES.TEXT,
        path: parentPath,
        oldText: oldNode.text,
        newText: newNode.text,
      })
    }
    return patches
  }

  // 케이스 5: 속성 변경 — 같은 태그인데 속성이 달라진 경우
  const propPatches = diffProps(oldNode.props, newNode.props)
  if (propPatches.length > 0) {
    patches.push({
      type: PATCH_TYPES.PROPS,
      path: parentPath,
      propPatches,
    })
  }

  // 자식 노드들도 재귀적으로 비교해요
  const oldChildren = oldNode.children || []
  const newChildren = newNode.children || []
  const maxLen = Math.max(oldChildren.length, newChildren.length)

  for (let i = 0; i < maxLen; i++) {
    const childPatches = diff(
      oldChildren[i] || null,
      newChildren[i] || null,
      [...parentPath, i]  // 경로에 자식 인덱스를 추가해요
    )
    patches.push(...childPatches)
  }

  return patches
}

/**
 * 속성(props)만 따로 비교해요
 * 추가된 속성, 바뀐 속성, 삭제된 속성을 모두 찾아요
 */
function diffProps(oldProps = {}, newProps = {}) {
  const patches = []

  // 새 속성에서: 추가되었거나 값이 바뀐 것을 찾아요
  for (const [key, value] of Object.entries(newProps)) {
    if (oldProps[key] !== value) {
      patches.push({ key, value, action: 'SET' })
    }
  }

  // 이전 속성에서: 삭제된 것을 찾아요 (EC-03: 속성 완전 제거)
  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps)) {
      patches.push({ key, action: 'REMOVE' })
    }
  }

  return patches
}
