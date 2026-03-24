// [왜] key
// key 없이 리스트 순서가 바뀌면 다 지우고 다시 만들어요
// key 있으면 "이 아이 저기로 옮기면 되네"로 끝나요
//
// 예를 들어 [A, B, C] → [C, A, B] 가 되면
// key 없으면: A→C 교체, B→A 교체, C→B 교체 (3번 수정)
// key 있으면: C를 맨 앞으로 이동 (1번 이동)

import { PATCH_TYPES } from './diff.js'
import { diff } from './diff.js'

/**
 * key-diff 패치 타입
 * 기존 5케이스에 MOVE(이동)를 추가해요
 */
export const KEY_PATCH_TYPES = {
  ...PATCH_TYPES,
  MOVE: 'MOVE',  // 노드가 다른 위치로 이동했어요
}

/**
 * key 기반 자식 노드 비교
 * key가 있는 자식들은 key로 매칭해서 이동/추가/삭제를 최소화해요
 * key가 없는 자식들은 기본 diff로 처리해요
 *
 * @param {Array} oldChildren - 이전 자식 VNode 배열
 * @param {Array} newChildren - 새 자식 VNode 배열
 * @param {Array} parentPath - 부모까지의 경로
 * @returns {Array} patches
 */
export function keyDiff(oldChildren = [], newChildren = [], parentPath = []) {
  // key가 하나라도 있는지 확인
  const hasKeys = newChildren.some(c => c && c.props && c.props.key != null)
    || oldChildren.some(c => c && c.props && c.props.key != null)

  // key가 없으면 기존 인덱스 기반 diff로 처리
  if (!hasKeys) {
    return indexBasedDiff(oldChildren, newChildren, parentPath)
  }

  return keyBasedDiff(oldChildren, newChildren, parentPath)
}

/**
 * key 기반 비교 알고리즘
 */
function keyBasedDiff(oldChildren, newChildren, parentPath) {
  const patches = []

  // 이전 자식들을 key → { vnode, index } 맵으로 만들어요
  const oldKeyMap = new Map()
  oldChildren.forEach((child, i) => {
    const key = child && child.props && child.props.key
    if (key != null) {
      oldKeyMap.set(String(key), { vnode: child, index: i })
    }
  })

  // 새 자식들을 key → { vnode, index } 맵으로 만들어요
  const newKeyMap = new Map()
  newChildren.forEach((child, i) => {
    const key = child && child.props && child.props.key
    if (key != null) {
      newKeyMap.set(String(key), { vnode: child, index: i })
    }
  })

  // 1. 삭제된 노드 찾기 — 이전에 있었는데 새 목록에 없는 것
  for (const [key, { index }] of oldKeyMap) {
    if (!newKeyMap.has(key)) {
      patches.push({
        type: KEY_PATCH_TYPES.REMOVE,
        path: [...parentPath, index],
        key,
      })
    }
  }

  // 2. 추가 & 이동 & 업데이트 — 새 목록 기준으로 처리
  for (const [key, { vnode: newChild, index: newIndex }] of newKeyMap) {
    if (!oldKeyMap.has(key)) {
      // 새로 추가된 노드
      patches.push({
        type: KEY_PATCH_TYPES.CREATE,
        path: [...parentPath, newIndex],
        newNode: newChild,
        key,
      })
    } else {
      const { vnode: oldChild, index: oldIndex } = oldKeyMap.get(key)

      // 위치가 바뀌었으면 이동
      if (oldIndex !== newIndex) {
        patches.push({
          type: KEY_PATCH_TYPES.MOVE,
          path: [...parentPath, newIndex],
          oldIndex,
          newIndex,
          key,
        })
      }

      // 같은 key인데 내용이 바뀌었으면 업데이트
      const childPatches = diff(oldChild, newChild, [...parentPath, newIndex])
      patches.push(...childPatches)
    }
  }

  return patches
}

/**
 * 인덱스 기반 비교 (key 없는 경우 — 기존 diff와 동일)
 */
function indexBasedDiff(oldChildren, newChildren, parentPath) {
  const patches = []
  const maxLen = Math.max(oldChildren.length, newChildren.length)

  for (let i = 0; i < maxLen; i++) {
    const childPatches = diff(
      oldChildren[i] || null,
      newChildren[i] || null,
      [...parentPath, i]
    )
    patches.push(...childPatches)
  }

  return patches
}
