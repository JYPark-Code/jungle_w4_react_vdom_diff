// panels/panel-diff.js — 패널 3: Diff & Patch 뷰어
// 과제 핵심 요구사항을 직접 보여주는 패널
// 실제 영역에 샘플 HTML → 테스트 영역에서 자유 수정 → Patch로 반영

import { onPanelMount } from '../shared/router.js'
import AppState from '../shared/app-state.js'
import { domToVNode, renderDOM } from '../mini-react/src/vdom.js'
import { diff, PATCH_TYPES } from '../mini-react/src/diff.js'
import { patch } from '../mini-react/src/patch.js'
import { highlightPatches } from '../mini-react/src/highlight.js'
import { StateHistory } from '../mini-react/src/history.js'

let history = null
let previousVNode = null
let initialized = false

const SAMPLE_HTML = `<div class="post-card">
  <div class="post-header">
    <span class="post-avatar">🧑</span>
    <span class="post-username">user_01</span>
  </div>
  <p class="caption">오늘의 일상 ☀️</p>
  <div class="likes-row">
    <span class="heart">🤍</span>
    <span class="count">127</span>
    <span>명이 좋아합니다</span>
  </div>
  <div class="comments">
    <div class="comment"><strong>friend_01</strong> 멋지다! 👍</div>
    <div class="comment"><strong>friend_02</strong> 나도 가고 싶다 ✈️</div>
  </div>
</div>`

export function initPanelDiff() {
  const panel = document.getElementById('panel-diff')
  panel.innerHTML = `
    <div class="panel-header">
      <h2>🔍 Diff & Patch</h2>
      <p class="panel-desc">테스트 영역의 HTML을 수정하고 Patch 버튼으로 실제 영역에 반영합니다</p>
    </div>

    <div class="two-col diff-areas">
      <div>
        <h3 class="diff-area-title">📌 실제 영역 <span class="diff-tag">patch 반영됨</span></h3>
        <div class="diff-render-area" id="diff-real"></div>
      </div>
      <div>
        <h3 class="diff-area-title">✏️ 테스트 영역 <span class="diff-tag diff-tag--edit">자유 수정</span></h3>
        <textarea class="diff-editor" id="diff-editor" spellcheck="false"></textarea>
      </div>
    </div>

    <div class="diff-controls">
      <button id="diff-btn-patch" class="diff-btn diff-btn--primary">⚡ Patch 적용</button>
      <button id="diff-btn-undo" class="diff-btn" disabled>← 뒤로</button>
      <button id="diff-btn-redo" class="diff-btn" disabled>앞으로 →</button>
      <button id="diff-btn-reset" class="diff-btn diff-btn--secondary">🔄 초기화</button>
    </div>

    <div class="diff-result">
      <h3 class="diff-result-title">📋 Diff 결과</h3>
      <div class="diff-patches-list" id="diff-patches">
        <span class="tree-empty">Patch 버튼을 눌러보세요</span>
      </div>
    </div>
  `

  document.getElementById('diff-btn-patch').addEventListener('click', handlePatch)
  document.getElementById('diff-btn-undo').addEventListener('click', handleUndo)
  document.getElementById('diff-btn-redo').addEventListener('click', handleRedo)
  document.getElementById('diff-btn-reset').addEventListener('click', handleReset)

  onPanelMount('diff', () => {
    if (!initialized) {
      initDiffPanel()
      initialized = true
    }
  })
}

function initDiffPanel() {
  history = new StateHistory()
  const realArea = document.getElementById('diff-real')
  const editor = document.getElementById('diff-editor')

  // 1. 실제 영역에 샘플 HTML 렌더링
  realArea.innerHTML = SAMPLE_HTML

  // 2. 실제 영역 DOM → domToVNode() → initialVNode
  const initialVNode = domToVNode(realArea.firstElementChild)

  // 3. 테스트 영역에 HTML 텍스트 표시
  editor.value = SAMPLE_HTML.trim()

  // 4. StateHistory.push(initialVNode) — 초기 상태 저장
  history.push(initialVNode, '초기 상태')
  previousVNode = initialVNode

  updateButtons()
}

/**
 * Patch 버튼 동작 흐름:
 * 1. 테스트 영역 HTML → 임시 DOM → domToVNode() → newVNode
 * 2. diff(previousVNode, newVNode) → patches
 * 3. patch(실제영역, patches) → 변경분만 반영
 * 4. StateHistory.push(newVNode)
 * 5. patches 하단에 표시
 */
function handlePatch() {
  const editor = document.getElementById('diff-editor')
  const realArea = document.getElementById('diff-real')

  // 1. 테스트 영역 HTML → VNode
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = editor.value.trim()
  if (!tempDiv.firstElementChild) {
    showPatches([{ error: '유효한 HTML을 입력해주세요' }])
    return
  }
  const newVNode = domToVNode(tempDiv.firstElementChild)

  // 2. diff
  const patches = diff(previousVNode, newVNode)

  // 3. patch 적용
  if (patches.length > 0) {
    patch(realArea.firstElementChild, patches)
    highlightPatches(realArea.firstElementChild, patches)
  }

  // 4. 히스토리 저장
  history.push(newVNode, `패치 #${history.length}`)
  previousVNode = newVNode

  // 5. 결과 표시
  showPatches(patches)
  updateButtons()

  // AppState에 공유
  AppState.update({
    previousVNode: history.snapshots.length > 1
      ? history.snapshots[history.currentIndex - 1]
      : null,
    currentVNode: newVNode,
    lastPatches: patches,
  })
}

function handleUndo() {
  const vnode = history.undo()
  if (!vnode) return
  previousVNode = vnode
  syncBothAreas(vnode)
  updateButtons()
  showPatches([{ info: '⏪ 뒤로가기' }])
}

function handleRedo() {
  const vnode = history.redo()
  if (!vnode) return
  previousVNode = vnode
  syncBothAreas(vnode)
  updateButtons()
  showPatches([{ info: '⏩ 앞으로가기' }])
}

function handleReset() {
  initialized = false
  initDiffPanel()
  showPatches([{ info: '🔄 초기화됨' }])
}

/**
 * 실제 영역 + 테스트 영역 모두 동기화 (뒤로/앞으로 시)
 */
function syncBothAreas(vnode) {
  const realArea = document.getElementById('diff-real')
  const editor = document.getElementById('diff-editor')

  // 실제 영역: VNode으로 재렌더링
  realArea.innerHTML = ''
  const dom = renderDOM(vnode)
  realArea.appendChild(dom)

  // 테스트 영역: DOM을 HTML 텍스트로
  editor.value = realArea.innerHTML
}

function showPatches(patches) {
  const container = document.getElementById('diff-patches')
  container.innerHTML = ''

  if (patches.length === 0) {
    container.innerHTML = '<div class="diff-patch-item diff-patch-item--ok">✅ 변경 없음 — DOM 수정 0회</div>'
    return
  }

  // 특수 메시지 (info, error)
  if (patches[0].info || patches[0].error) {
    const item = document.createElement('div')
    item.className = 'diff-patch-item'
    item.textContent = patches[0].info || patches[0].error
    container.appendChild(item)
    return
  }

  // 요약
  const summary = document.createElement('div')
  summary.className = 'diff-patch-summary'
  summary.textContent = `${patches.length}개 변경 감지 → DOM ${patches.length}회 업데이트`
  container.appendChild(summary)

  // 각 패치
  patches.forEach(p => {
    const item = document.createElement('div')
    item.className = `diff-patch-item diff-patch-item--${p.type.toLowerCase()}`
    item.textContent = formatPatch(p)
    container.appendChild(item)
  })
}

function formatPatch(p) {
  const pathStr = `path=[${p.path.join(',')}]`
  switch (p.type) {
    case PATCH_TYPES.CREATE:  return `🟢 [CREATE]  ${pathStr}`
    case PATCH_TYPES.REMOVE:  return `🔴 [REMOVE]  ${pathStr}`
    case PATCH_TYPES.REPLACE: return `🟡 [REPLACE] ${pathStr}`
    case PATCH_TYPES.TEXT:    return `🟡 [TEXT]    ${pathStr}  "${p.oldText}" → "${p.newText}"`
    case PATCH_TYPES.PROPS:   return `🟡 [PROPS]   ${pathStr}  ${p.propPatches.map(pp => pp.action === 'SET' ? `${pp.key}="${pp.value}"` : `${pp.key} 제거`).join(', ')}`
    default: return `[${p.type}] ${pathStr}`
  }
}

function updateButtons() {
  document.getElementById('diff-btn-undo').disabled = !history.canUndo()
  document.getElementById('diff-btn-redo').disabled = !history.canRedo()
}
