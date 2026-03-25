// panels/panel-vdom.js — 패널 2: VDom Inspector
// git diff 스타일: 빨간(-) 삭제, 초록(+) 추가, 변경 없는 노드는 흐리게
// 변경된 노드만 강조하고 나머지는 접어서 시인성을 높여요

import { onPanelMount } from '../shared/router.js'
import AppState from '../shared/app-state.js'
import { PATCH_TYPES } from '../mini-react/src/diff.js'

let initialized = false

export function initPanelVdom() {
  const panel = document.getElementById('panel-vdom')
  panel.innerHTML = `
    <div class="panel-header">
      <h2>🌳 VDom Inspector</h2>
      <p class="panel-desc">클릭 하나에 내부에서 무슨 일이 일어나는가 — 피드에서 인터랙션하면 자동 업데이트</p>
    </div>
    <div class="vdom-summary" id="vdom-summary">
      피드 패널에서 좋아요/댓글/스토리 등 인터랙션을 하면 여기에 VNode 트리가 표시됩니다.
    </div>
    <div class="two-col vdom-trees">
      <div>
        <h3 class="tree-title">📋 이전 VNode 트리 <span class="tree-tag tree-tag--old">- 삭제/이전</span></h3>
        <div class="tree-container" id="vdom-old">
          <span class="tree-empty">아직 데이터 없음</span>
        </div>
      </div>
      <div>
        <h3 class="tree-title">📋 현재 VNode 트리 <span class="tree-tag tree-tag--new">+ 추가/현재</span></h3>
        <div class="tree-container" id="vdom-new">
          <span class="tree-empty">아직 데이터 없음</span>
        </div>
      </div>
    </div>
    <div class="vdom-patches">
      <h3 class="tree-title">🔍 변경 목록 (Patches)</h3>
      <div class="patches-list" id="vdom-patches">
        <span class="tree-empty">아직 패치 없음</span>
      </div>
    </div>
  `

  onPanelMount('vdom', () => {
    if (!initialized) {
      AppState.subscribe(onStateChange)
      initialized = true
    }
    onStateChange(AppState)
  })
}

function onStateChange(state) {
  if (!state.currentVNode) return

  const oldTreeEl = document.getElementById('vdom-old')
  const newTreeEl = document.getElementById('vdom-new')
  const patchesEl = document.getElementById('vdom-patches')
  const summaryEl = document.getElementById('vdom-summary')

  if (!oldTreeEl) return

  // 패치에서 변경 정보 수집 — path → patch 매핑
  const patchMap = new Map()
  if (state.lastPatches) {
    state.lastPatches.forEach(p => {
      patchMap.set(p.path.join(','), p)
    })
  }

  // 변경된 path와 그 부모 경로 수집 (펼칠 경로)
  const expandPaths = new Set()
  if (state.lastPatches) {
    state.lastPatches.forEach(p => {
      // 변경 노드 자체와 모든 부모 경로를 펼침 대상에 추가
      for (let i = 0; i <= p.path.length; i++) {
        expandPaths.add(p.path.slice(0, i).join(','))
      }
    })
  }

  // 이전 트리
  if (state.previousVNode) {
    oldTreeEl.innerHTML = ''
    oldTreeEl.appendChild(renderTree(state.previousVNode, [], patchMap, expandPaths, 'old'))
  } else {
    oldTreeEl.innerHTML = '<span class="tree-empty">초기 상태 (이전 없음)</span>'
  }

  // 현재 트리
  newTreeEl.innerHTML = ''
  newTreeEl.appendChild(renderTree(state.currentVNode, [], patchMap, expandPaths, 'new'))

  // 상단 요약
  const totalNodes = countNodes(state.currentVNode)
  const patches = state.lastPatches || []
  const typeCounts = {}
  patches.forEach(p => { typeCounts[p.type] = (typeCounts[p.type] || 0) + 1 })
  const typeStr = Object.entries(typeCounts).map(([t, c]) => `${t}: ${c}개`).join('  ')

  summaryEl.innerHTML = patches.length > 0
    ? `총 <strong>${totalNodes}</strong>개 노드 중 <strong>${patches.length}</strong>개 변경  |  ${typeStr}`
    : `총 <strong>${totalNodes}</strong>개 노드 — 변경 없음`

  // 패치 목록
  if (patches.length > 0) {
    patchesEl.innerHTML = ''
    patches.forEach(p => {
      const item = document.createElement('div')
      item.className = `patch-item patch-item--${p.type.toLowerCase()}`
      item.textContent = formatPatch(p)
      patchesEl.appendChild(item)
    })
  } else {
    patchesEl.innerHTML = '<span class="tree-empty">변경 없음</span>'
  }
}

/**
 * VNode 트리를 DOM으로 시각화
 * - 변경된 노드: 밝게 + 배경색 + +/- 접두사 + 값 표시
 * - 변경 없는 노드: 흐리게 (변경 경로 밖이면 접기)
 */
function renderTree(vnode, path, patchMap, expandPaths, side) {
  if (!vnode) return document.createTextNode('')

  const wrapper = document.createElement('div')
  wrapper.className = 'tree-node'

  const pathKey = path.join(',')
  const patch = patchMap.get(pathKey)
  const isOnExpandPath = expandPaths.has(pathKey)
  const isChanged = !!patch

  // 노드 라벨
  const label = document.createElement('div')
  label.className = 'tree-label'

  if (isChanged) {
    // 변경된 노드 — git diff 스타일
    if (side === 'old') {
      label.classList.add('tree-label--removed')
      label.innerHTML = buildChangedLabel(vnode, patch, 'old')
    } else {
      label.classList.add('tree-label--added')
      label.innerHTML = buildChangedLabel(vnode, patch, 'new')
    }
  } else if (!isOnExpandPath && path.length > 0) {
    // 변경 경로 밖 — 흐리게
    label.classList.add('tree-label--dim')
    label.textContent = buildNodeLabel(vnode)
  } else {
    // 변경 경로 위 (부모) — 보통 밝기
    label.textContent = buildNodeLabel(vnode)
  }

  wrapper.appendChild(label)

  // 자식 노드
  if (vnode.children && vnode.children.length > 0) {
    const childrenEl = document.createElement('div')
    childrenEl.className = 'tree-children'

    if (!isOnExpandPath && path.length > 0) {
      // 변경 경로 밖이면 자식 접기
      const collapsed = document.createElement('span')
      collapsed.className = 'tree-collapsed'
      collapsed.textContent = `  ... ${vnode.children.length}개 노드 (변경 없음)`
      childrenEl.appendChild(collapsed)
    } else {
      // 변경 경로 위이면 자식 펼치기
      const maxShow = 30
      const children = vnode.children.slice(0, maxShow)
      children.forEach((child, i) => {
        childrenEl.appendChild(renderTree(child, [...path, i], patchMap, expandPaths, side))
      })
      if (vnode.children.length > maxShow) {
        const more = document.createElement('span')
        more.className = 'tree-collapsed'
        more.textContent = `  ... +${vnode.children.length - maxShow}개 더`
        childrenEl.appendChild(more)
      }
    }

    wrapper.appendChild(childrenEl)
  }

  return wrapper
}

/**
 * 노드 라벨 문자열 생성
 */
function buildNodeLabel(vnode) {
  if (vnode.type === '#text') {
    return `"${truncate(vnode.text, 30)}"`
  }
  let tag = vnode.type
  if (vnode.props.class) tag += `.${vnode.props.class.split(' ')[0]}`
  if (vnode.props.id) tag += `#${vnode.props.id}`
  return tag
}

/**
 * 변경된 노드의 라벨 — +/- 접두사 + 값 변경 인라인 표시
 */
function buildChangedLabel(vnode, patch, side) {
  const prefix = side === 'old' ? '<span class="diff-prefix diff-prefix--old">-</span> ' : '<span class="diff-prefix diff-prefix--new">+</span> '
  const nodeLabel = escapeHtml(buildNodeLabel(vnode))

  let detail = ''
  if (patch) {
    switch (patch.type) {
      case PATCH_TYPES.TEXT:
        detail = side === 'old'
          ? `  <span class="diff-value">"${escapeHtml(truncate(patch.oldText, 20))}"</span>`
          : `  <span class="diff-value">"${escapeHtml(truncate(patch.newText, 20))}"</span>`
        break
      case PATCH_TYPES.PROPS:
        detail = `  <span class="diff-value">${patch.propPatches.map(pp =>
          pp.action === 'SET' ? `${pp.key}="${escapeHtml(truncate(pp.value, 15))}"` : `${pp.key} 제거`
        ).join(', ')}</span>`
        break
      case PATCH_TYPES.CREATE:
        detail = '  <span class="diff-value">(새 노드)</span>'
        break
      case PATCH_TYPES.REMOVE:
        detail = '  <span class="diff-value">(삭제됨)</span>'
        break
      case PATCH_TYPES.REPLACE:
        detail = '  <span class="diff-value">(타입 교체)</span>'
        break
    }
  }

  return `${prefix}<span class="diff-node">${nodeLabel}</span>${detail}`
}

function countNodes(vnode) {
  if (!vnode) return 0
  let count = 1
  if (vnode.children) {
    vnode.children.forEach(c => { count += countNodes(c) })
  }
  return count
}

function formatPatch(p) {
  const pathStr = `[${p.path.join(',')}]`
  switch (p.type) {
    case PATCH_TYPES.CREATE:  return `🟢 CREATE  ${pathStr}`
    case PATCH_TYPES.REMOVE:  return `🔴 REMOVE  ${pathStr}`
    case PATCH_TYPES.REPLACE: return `🟡 REPLACE ${pathStr}`
    case PATCH_TYPES.TEXT:    return `🟡 TEXT    ${pathStr}  "${truncate(p.oldText, 15)}" → "${truncate(p.newText, 15)}"`
    case PATCH_TYPES.PROPS:   return `🟡 PROPS   ${pathStr}  ${p.propPatches.map(pp => pp.action === 'SET' ? `${pp.key}="${truncate(pp.value, 15)}"` : `${pp.key} 제거`).join(', ')}`
    default: return `${p.type} ${pathStr}`
  }
}

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
