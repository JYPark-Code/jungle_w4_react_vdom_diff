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
    <span class="avatar">🧑</span>
    <span class="username">user_01</span>
  </div>
  <div class="post-image"><img src="https://picsum.photos/seed/1/600/600" alt="post" /></div>
  <div class="post-actions">
    <span class="likes">❤️ 127개</span>
    <span class="comments-count">💬 2개</span>
  </div>
  <div class="post-caption">오늘의 일상 ☀️</div>
  <ul class="comments-list">
    <li>friend_01: 멋지다! 👍</li>
    <li>friend_02: 나도 가고 싶다 ✈️</li>
  </ul>
</div>`

// 프리셋: 각 Diff 케이스를 자동으로 테스트 영역에 반영
const PRESETS = {
  update: {
    label: '🟡 UPDATE',
    html: `<div class="post-card">
  <div class="post-header">
    <span class="avatar">🧑</span>
    <span class="username">user_01</span>
  </div>
  <div class="post-image"><img src="https://picsum.photos/seed/1/600/600" alt="post" /></div>
  <div class="post-actions">
    <span class="likes">❤️ 128개</span>
    <span class="comments-count">💬 2개</span>
  </div>
  <div class="post-caption">오늘의 일상 ☀️</div>
  <ul class="comments-list">
    <li>friend_01: 멋지다! 👍</li>
    <li>friend_02: 나도 가고 싶다 ✈️</li>
  </ul>
</div>`,
  },
  add: {
    label: '🟢 ADD',
    html: `<div class="post-card">
  <div class="post-header">
    <span class="avatar">🧑</span>
    <span class="username">user_01</span>
  </div>
  <div class="post-image"><img src="https://picsum.photos/seed/1/600/600" alt="post" /></div>
  <div class="post-actions">
    <span class="likes">❤️ 127개</span>
    <span class="comments-count">💬 3개</span>
  </div>
  <div class="post-caption">오늘의 일상 ☀️</div>
  <ul class="comments-list">
    <li>friend_01: 멋지다! 👍</li>
    <li>friend_02: 나도 가고 싶다 ✈️</li>
    <li>friend_03: 언제 갔어? 🤔</li>
  </ul>
</div>`,
  },
  delete: {
    label: '🔴 DELETE',
    html: `<div class="post-card">
  <div class="post-header">
    <span class="avatar">🧑</span>
    <span class="username">user_01</span>
  </div>
  <div class="post-image"><img src="https://picsum.photos/seed/1/600/600" alt="post" /></div>
  <div class="post-actions">
    <span class="likes">❤️ 127개</span>
    <span class="comments-count">💬 1개</span>
  </div>
  <div class="post-caption">오늘의 일상 ☀️</div>
  <ul class="comments-list">
    <li>friend_01: 멋지다! 👍</li>
  </ul>
</div>`,
  },
  props: {
    label: '🔵 PROPS',
    html: `<div class="post-card highlighted">
  <div class="post-header">
    <span class="avatar">🧑</span>
    <span class="username">user_01</span>
  </div>
  <div class="post-image"><img src="https://picsum.photos/seed/1/600/600" alt="post" /></div>
  <div class="post-actions">
    <span class="likes">❤️ 127개</span>
    <span class="comments-count">💬 2개</span>
  </div>
  <div class="post-caption">오늘의 일상 ☀️</div>
  <ul class="comments-list">
    <li>friend_01: 멋지다! 👍</li>
    <li>friend_02: 나도 가고 싶다 ✈️</li>
  </ul>
</div>`,
  },
}

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
      <button id="diff-preset-update" class="diff-btn diff-btn--preset">🟡 UPDATE</button>
      <button id="diff-preset-add" class="diff-btn diff-btn--preset">🟢 ADD</button>
      <button id="diff-preset-delete" class="diff-btn diff-btn--preset">🔴 DELETE</button>
      <button id="diff-preset-props" class="diff-btn diff-btn--preset">🔵 PROPS</button>
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

  // 프리셋 버튼: 테스트 영역에 코드 자동 입력 + Patch 자동 실행
  Object.keys(PRESETS).forEach(key => {
    document.getElementById(`diff-preset-${key}`).addEventListener('click', () => {
      document.getElementById('diff-editor').value = PRESETS[key].html.trim()
      handlePatch()
    })
  })

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

  // 테스트 영역: VNode → 포맷팅된 HTML 텍스트 (인댄트 유지)
  editor.value = vnodeToHtml(vnode, 0)
}

/**
 * VNode를 인댄트가 있는 HTML 문자열로 변환해요
 * innerHTML 대신 이걸 쓰면 줄바꿈과 들여쓰기가 유지돼요
 */
function vnodeToHtml(vnode, depth) {
  if (!vnode) return ''
  const indent = '  '.repeat(depth)

  if (vnode.type === '#text') {
    return `${indent}${vnode.text}`
  }

  // 속성 문자열
  const attrs = Object.entries(vnode.props || {})
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('')

  // self-closing 태그
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link']
  if (selfClosing.includes(vnode.type)) {
    return `${indent}<${vnode.type}${attrs} />`
  }

  // 자식이 텍스트 하나뿐이면 한 줄로
  if (vnode.children.length === 1 && vnode.children[0].type === '#text') {
    return `${indent}<${vnode.type}${attrs}>${vnode.children[0].text}</${vnode.type}>`
  }

  // 자식이 없으면 한 줄로
  if (vnode.children.length === 0) {
    return `${indent}<${vnode.type}${attrs}></${vnode.type}>`
  }

  // 자식이 여러 개면 줄바꿈
  const childrenHtml = vnode.children
    .map(child => vnodeToHtml(child, depth + 1))
    .join('\n')

  return `${indent}<${vnode.type}${attrs}>\n${childrenHtml}\n${indent}</${vnode.type}>`
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

  // 각 패치 — 카드 형태
  patches.forEach(p => {
    const card = document.createElement('div')
    card.className = `diff-patch-card diff-patch-card--${p.type.toLowerCase()}`

    const icon = { CREATE: '🟢', REMOVE: '🔴', REPLACE: '🟡', TEXT: '🟡', PROPS: '🔵' }[p.type] || '⚪'
    const label = { CREATE: 'ADD', REMOVE: 'DELETE', REPLACE: 'REPLACE', TEXT: 'UPDATE', PROPS: 'PROPS' }[p.type] || p.type
    const nodeName = getNodeNameFromPatch(p)

    // 헤더: 아이콘 + 라벨 + 노드 이름
    card.innerHTML = `<div class="diff-patch-header">
      <span class="diff-patch-icon">${icon}</span>
      <span class="diff-patch-label">${label}</span>
      <span class="diff-patch-node">${escapeHtml(nodeName)}</span>
    </div>`

    // 값 변경 표시
    const body = document.createElement('div')
    body.className = 'diff-patch-body'

    switch (p.type) {
      case PATCH_TYPES.TEXT:
        body.innerHTML = `<div class="diff-line diff-line--del"><span class="diff-line-prefix">-</span> "${escapeHtml(p.oldText)}"</div>`
          + `<div class="diff-line diff-line--add"><span class="diff-line-prefix">+</span> "${escapeHtml(p.newText)}"</div>`
        break
      case PATCH_TYPES.PROPS:
        p.propPatches.forEach(pp => {
          if (pp.action === 'SET') {
            body.innerHTML += `<div class="diff-line diff-line--del"><span class="diff-line-prefix">-</span> ${pp.key}="${escapeHtml(pp.oldValue || '(없음)')}"</div>`
              + `<div class="diff-line diff-line--add"><span class="diff-line-prefix">+</span> ${pp.key}="${escapeHtml(pp.value)}"</div>`
          } else {
            body.innerHTML += `<div class="diff-line diff-line--del"><span class="diff-line-prefix">-</span> ${pp.key} (제거됨)</div>`
          }
        })
        break
      case PATCH_TYPES.CREATE:
        body.innerHTML = `<div class="diff-line diff-line--add"><span class="diff-line-prefix">+</span> &lt;${escapeHtml(p.newNode.type)}&gt; 새 노드 추가</div>`
        break
      case PATCH_TYPES.REMOVE:
        body.innerHTML = `<div class="diff-line diff-line--del"><span class="diff-line-prefix">-</span> 노드 삭제됨</div>`
        break
      case PATCH_TYPES.REPLACE:
        body.innerHTML = `<div class="diff-line diff-line--del"><span class="diff-line-prefix">-</span> 이전 노드</div>`
          + `<div class="diff-line diff-line--add"><span class="diff-line-prefix">+</span> &lt;${escapeHtml(p.newNode.type)}&gt; 타입 교체</div>`
        break
    }
    card.appendChild(body)
    container.appendChild(card)
  })

  // 하단 요약
  const summary = document.createElement('div')
  summary.className = 'diff-patch-summary'
  const addCount = patches.filter(p => p.type === PATCH_TYPES.CREATE).length
  const delCount = patches.filter(p => p.type === PATCH_TYPES.REMOVE).length
  const modCount = patches.length - addCount - delCount
  summary.innerHTML = `총 <strong>${patches.length}</strong>개 변경 감지 → DOM <strong>${patches.length}</strong>회 업데이트`
    + (addCount ? ` | <span style="color:#51cf66">+${addCount} 추가</span>` : '')
    + (delCount ? ` | <span style="color:#ff6b6b">-${delCount} 삭제</span>` : '')
    + (modCount ? ` | <span style="color:#ffd43b">${modCount} 수정</span>` : '')
  container.appendChild(summary)
}

function getNodeNameFromPatch(p) {
  // previousVNode에서 path를 따라가서 노드 이름 추출
  let node = previousVNode
  if (node && p.path) {
    for (const idx of p.path) {
      if (node && node.children && node.children[idx]) {
        node = node.children[idx]
      } else {
        node = null
        break
      }
    }
  }
  if (node) {
    if (node.type === '#text') return `"${node.text?.slice(0, 20) || ''}"`
    let tag = node.type
    if (node.props?.class) tag += `.${node.props.class.split(' ')[0]}`
    return tag
  }
  if (p.newNode) {
    let tag = p.newNode.type
    if (p.newNode.props?.class) tag += `.${p.newNode.props.class.split(' ')[0]}`
    return tag
  }
  return `path=[${p.path.join(',')}]`
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function updateButtons() {
  document.getElementById('diff-btn-undo').disabled = !history.canUndo()
  document.getElementById('diff-btn-redo').disabled = !history.canRedo()
}
