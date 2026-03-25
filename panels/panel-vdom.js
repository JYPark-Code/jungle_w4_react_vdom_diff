// panels/panel-vdom.js — 패널 2: VDom Inspector
// 인터랙션 → VNode 트리를 시각화해서 "내부에서 무슨 일이 일어나는가"를 보여줘요
// 이전 트리와 현재 트리를 나란히 보여주고, 변경된 노드를 색으로 강조해요

import { onPanelMount } from '../shared/router.js'
import AppState from '../shared/app-state.js'
import { diff, PATCH_TYPES } from '../mini-react/src/diff.js'

let initialized = false

export function initPanelVdom() {
  const panel = document.getElementById('panel-vdom')
  panel.innerHTML = `
    <div class="panel-header">
      <h2>🌳 VDom Inspector</h2>
      <p class="panel-desc">클릭 하나에 내부에서 무슨 일이 일어나는가 — 피드에서 인터랙션하면 자동 업데이트</p>
    </div>
    <div class="vdom-summary" id="vdom-summary">
      피드 패널에서 좋아요/댓글 등 인터랙션을 하면 여기에 VNode 트리가 표시됩니다.
    </div>
    <div class="two-col vdom-trees">
      <div>
        <h3 class="tree-title">📋 이전 VNode 트리</h3>
        <div class="tree-container" id="vdom-old">
          <span class="tree-empty">아직 데이터 없음</span>
        </div>
      </div>
      <div>
        <h3 class="tree-title">📋 현재 VNode 트리</h3>
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
      // AppState 변경을 구독해서 자동 업데이트
      AppState.subscribe(onStateChange)
      initialized = true
    }
    // 현재 상태로 한 번 그리기
    onStateChange(AppState)
  })
}

function onStateChange(state) {
  if (!state.currentVNode) return

  const oldTreeEl = document.getElementById('vdom-old')
  const newTreeEl = document.getElementById('vdom-new')
  const patchesEl = document.getElementById('vdom-patches')
  const summaryEl = document.getElementById('vdom-summary')

  if (!oldTreeEl) return  // 패널이 아직 DOM에 없으면 무시

  // 변경된 path 목록 수집
  const changedPaths = new Set()
  if (state.lastPatches) {
    state.lastPatches.forEach(p => {
      changedPaths.add(p.path.join(','))
    })
  }

  // 이전 트리
  if (state.previousVNode) {
    oldTreeEl.innerHTML = ''
    oldTreeEl.appendChild(renderTree(state.previousVNode, [], changedPaths, 'old'))
  } else {
    oldTreeEl.innerHTML = '<span class="tree-empty">초기 상태 (이전 없음)</span>'
  }

  // 현재 트리
  newTreeEl.innerHTML = ''
  newTreeEl.appendChild(renderTree(state.currentVNode, [], changedPaths, 'new'))

  // 노드 통계
  const totalNodes = countNodes(state.currentVNode)
  const changedCount = state.lastPatches ? state.lastPatches.length : 0
  summaryEl.innerHTML = `총 <strong>${totalNodes}</strong>개 노드 중 <strong>${changedCount}</strong>개 변경됨`

  // 패치 목록
  if (state.lastPatches && state.lastPatches.length > 0) {
    patchesEl.innerHTML = ''
    state.lastPatches.forEach(p => {
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
 * VNode 트리를 DOM으로 시각화해요
 * 들여쓰기로 깊이를 표현하고, 변경된 노드는 색으로 강조해요
 */
function renderTree(vnode, path, changedPaths, side) {
  if (!vnode) return document.createTextNode('')

  const wrapper = document.createElement('div')
  wrapper.className = 'tree-node'

  const pathKey = path.join(',')
  const isChanged = changedPaths.has(pathKey)

  // 노드 라벨
  const label = document.createElement('span')
  label.className = 'tree-label'
  if (isChanged) {
    label.classList.add(side === 'new' ? 'tree-label--changed' : 'tree-label--old-changed')
  }

  if (vnode.type === '#text') {
    label.textContent = `"${truncate(vnode.text, 30)}"`
    label.classList.add('tree-label--text')
  } else {
    // 태그 + 주요 속성
    let tag = vnode.type
    if (vnode.props.class) tag += `.${vnode.props.class.split(' ')[0]}`
    if (vnode.props.id) tag += `#${vnode.props.id}`
    label.textContent = tag
  }

  wrapper.appendChild(label)

  // 자식 노드
  if (vnode.children && vnode.children.length > 0) {
    const childrenEl = document.createElement('div')
    childrenEl.className = 'tree-children'

    // 자식이 많으면 접기
    const maxShow = 20
    const children = vnode.children.slice(0, maxShow)
    children.forEach((child, i) => {
      childrenEl.appendChild(renderTree(child, [...path, i], changedPaths, side))
    })

    if (vnode.children.length > maxShow) {
      const more = document.createElement('span')
      more.className = 'tree-more'
      more.textContent = `... +${vnode.children.length - maxShow}개 더`
      childrenEl.appendChild(more)
    }

    wrapper.appendChild(childrenEl)
  }

  return wrapper
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
