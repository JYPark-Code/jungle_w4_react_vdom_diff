// M1~M4 데모 — 브라우저에서 Mini React 엔진을 직접 체험해요
import { createElement, createTextNode, domToVNode, renderDOM } from './mini-react/src/vdom.js'
import { diff, PATCH_TYPES } from './mini-react/src/diff.js'
import { patch } from './mini-react/src/patch.js'
import { highlightPatches } from './mini-react/src/highlight.js'
import { StateHistory } from './mini-react/src/history.js'
import { keyDiff, KEY_PATCH_TYPES } from './mini-react/src/key-diff.js'

// ============================================================
// 1. VDom → Diff → Patch 데모
// ============================================================

const history = new StateHistory()

// 초기 샘플 HTML
const sampleHTML = `<div class="post-card">
  <h3>user_01</h3>
  <p class="caption">오늘의 일상 ☀️</p>
  <div class="likes-row">
    <span class="count">127</span>
    <span>명이 좋아합니다</span>
  </div>
</div>`

const realArea = document.getElementById('real-area')
const editArea = document.getElementById('edit-area')
const patchOutput = document.getElementById('patch-output')
const historyOutput = document.getElementById('history-output')

// 초기 렌더링
realArea.innerHTML = sampleHTML
editArea.innerHTML = sampleHTML

// 초기 VNode 저장
const initialVNode = domToVNode(realArea.firstElementChild)
history.push(initialVNode, '초기 상태')
let previousVNode = initialVNode

updateHistoryDisplay()

// --- Patch 버튼 ---
document.getElementById('btn-patch').addEventListener('click', () => {
  // 1. 수정 영역의 현재 DOM → VNode
  const editContent = editArea.firstElementChild
  if (!editContent) {
    patchOutput.textContent = '⚠️ 수정 영역이 비어있어요!'
    return
  }
  const newVNode = domToVNode(editContent)

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
  displayPatches(patches)
  updateHistoryDisplay()
})

// --- 뒤로가기 ---
document.getElementById('btn-undo').addEventListener('click', () => {
  const vnode = history.undo()
  if (!vnode) return
  previousVNode = vnode
  realArea.innerHTML = ''
  realArea.appendChild(renderDOM(vnode))
  editArea.innerHTML = ''
  editArea.appendChild(renderDOM(vnode))
  updateHistoryDisplay()
  patchOutput.textContent = '⏪ 뒤로가기'
})

// --- 앞으로가기 ---
document.getElementById('btn-redo').addEventListener('click', () => {
  const vnode = history.redo()
  if (!vnode) return
  previousVNode = vnode
  realArea.innerHTML = ''
  realArea.appendChild(renderDOM(vnode))
  editArea.innerHTML = ''
  editArea.appendChild(renderDOM(vnode))
  updateHistoryDisplay()
  patchOutput.textContent = '⏩ 앞으로가기'
})

function displayPatches(patches) {
  if (patches.length === 0) {
    patchOutput.textContent = '✅ 변경 없음 — DOM 수정 0회'
    return
  }
  const lines = patches.map(p => {
    const pathStr = `path=[${p.path.join(',')}]`
    switch (p.type) {
      case PATCH_TYPES.CREATE:  return `🟢 [CREATE]  ${pathStr}`
      case PATCH_TYPES.REMOVE:  return `🔴 [REMOVE]  ${pathStr}`
      case PATCH_TYPES.REPLACE: return `🟡 [REPLACE] ${pathStr}`
      case PATCH_TYPES.TEXT:    return `🟡 [TEXT]    ${pathStr}  "${p.oldText}" → "${p.newText}"`
      case PATCH_TYPES.PROPS:   return `🟡 [PROPS]   ${pathStr}  ${p.propPatches.map(pp => pp.action === 'SET' ? `${pp.key}="${pp.value}"` : `${pp.key} 제거`).join(', ')}`
      default: return `[${p.type}] ${pathStr}`
    }
  })
  patchOutput.textContent = `${patches.length}개 변경 감지 → DOM ${patches.length}회 업데이트\n\n${lines.join('\n')}`
}

function updateHistoryDisplay() {
  const lines = history.snapshots.map((_, i) => {
    const marker = i === history.currentIndex ? '──●──' : '──○──'
    const label = history.labels[i] || `상태 ${i}`
    const time = new Date(history.timestamps[i]).toLocaleTimeString()
    const current = i === history.currentIndex ? ' ← current' : ''
    return `  ${marker} ${label}  [${time}]${current}`
  })
  historyOutput.textContent = `State History  ${history.currentIndex + 1} / ${history.length}\n\n${lines.join('\n')}`

  document.getElementById('btn-undo').disabled = !history.canUndo()
  document.getElementById('btn-redo').disabled = !history.canRedo()
}

// ============================================================
// 2. useState 카운터 데모
// ============================================================

let count = 0
const counterDisplay = document.getElementById('counter-display')

document.getElementById('btn-increment').addEventListener('click', () => {
  count++
  counterDisplay.textContent = `count: ${count}`
})
document.getElementById('btn-decrement').addEventListener('click', () => {
  count--
  counterDisplay.textContent = `count: ${count}`
})

// ============================================================
// 3. key-diff 데모
// ============================================================

const keydiffOutput = document.getElementById('keydiff-output')

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const items = ['🍎 사과', '🍊 오렌지', '🍋 레몬', '🍇 포도', '🍉 수박']

document.getElementById('btn-shuffle-key').addEventListener('click', () => {
  const oldChildren = items.map((item, i) =>
    createElement('li', { key: String(i) }, item)
  )
  const shuffled = shuffle(items)
  const newChildren = shuffled.map((item) => {
    const origIdx = items.indexOf(item)
    return createElement('li', { key: String(origIdx) }, item)
  })

  const patches = keyDiff(oldChildren, newChildren)
  const moves = patches.filter(p => p.type === KEY_PATCH_TYPES.MOVE)
  const creates = patches.filter(p => p.type === KEY_PATCH_TYPES.CREATE)
  const removes = patches.filter(p => p.type === KEY_PATCH_TYPES.REMOVE)

  keydiffOutput.textContent = `🔑 key 있는 리스트 셔플 결과:\n\n`
    + `원래: ${items.join(', ')}\n`
    + `셔플: ${shuffled.join(', ')}\n\n`
    + `MOVE: ${moves.length}개  CREATE: ${creates.length}개  REMOVE: ${removes.length}개\n`
    + `→ DOM 재생성 없이 이동만으로 처리! ✅`
})

document.getElementById('btn-shuffle-nokey').addEventListener('click', () => {
  const oldChildren = items.map((item) =>
    createElement('li', {}, item)
  )
  const shuffled = shuffle(items)
  const newChildren = shuffled.map((item) =>
    createElement('li', {}, item)
  )

  const patches = keyDiff(oldChildren, newChildren)
  const textChanges = patches.filter(p => p.type === PATCH_TYPES.TEXT)

  keydiffOutput.textContent = `❌ key 없는 리스트 셔플 결과:\n\n`
    + `원래: ${items.join(', ')}\n`
    + `셔플: ${shuffled.join(', ')}\n\n`
    + `TEXT 변경: ${textChanges.length}개\n`
    + `→ 내용이 바뀐 것처럼 보여서 텍스트를 다시 써야 해요 🔴`
})
