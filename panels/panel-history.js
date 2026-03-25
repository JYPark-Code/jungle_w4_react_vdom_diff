// panels/panel-history.js — 패널 4: History 뷰어
// "Ctrl+Z가 어떻게 동작하는가" — 히스토리 스택을 타임라인으로 시각화
// 패널 3(Diff & Patch)의 히스토리를 연동해서 보여줘요

import { onPanelMount } from '../shared/router.js'
import AppState from '../shared/app-state.js'
import { StateHistory } from '../mini-react/src/history.js'
import { renderDOM } from '../mini-react/src/vdom.js'

let initialized = false

// 데모용 독립 히스토리 (패널 3과 별개로 직접 조작 가능)
let demoHistory = null
let startTime = 0

export function initPanelHistory() {
  const panel = document.getElementById('panel-history')
  panel.innerHTML = `
    <div class="panel-header">
      <h2>⏪ State History</h2>
      <p class="panel-desc">Ctrl+Z가 어떻게 동작하는가 — 히스토리 스택 시각화</p>
    </div>

    <div class="history-demo">
      <div class="history-actions">
        <h3 class="history-section-title">상태 변경 시뮬레이션</h3>
        <div class="controls">
          <button id="hist-like">❤️ 좋아요 토글</button>
          <button id="hist-comment">💬 댓글 추가</button>
          <button id="hist-edit">✏️ 캡션 수정</button>
          <button id="hist-reset" class="diff-btn--secondary">🔄 초기화</button>
        </div>
      </div>

      <div class="two-col history-layout">
        <div>
          <h3 class="history-section-title">📋 타임라인</h3>
          <div class="history-timeline" id="history-timeline"></div>
          <div class="history-nav">
            <button id="hist-undo" disabled>← 뒤로가기</button>
            <span class="history-position" id="hist-position">0 / 0</span>
            <button id="hist-redo" disabled>앞으로가기 →</button>
          </div>
        </div>
        <div>
          <h3 class="history-section-title">👁️ 현재 상태 미리보기</h3>
          <div class="history-preview" id="history-preview">
            <span class="tree-empty">히스토리가 비어있습니다</span>
          </div>
        </div>
      </div>
    </div>
  `

  document.getElementById('hist-like').addEventListener('click', simLike)
  document.getElementById('hist-comment').addEventListener('click', simComment)
  document.getElementById('hist-edit').addEventListener('click', simEdit)
  document.getElementById('hist-reset').addEventListener('click', simReset)
  document.getElementById('hist-undo').addEventListener('click', simUndo)
  document.getElementById('hist-redo').addEventListener('click', simRedo)

  onPanelMount('history', () => {
    if (!initialized) {
      simReset()
      initialized = true
    }
  })
}

// --- 시뮬레이션 상태 ---
let simState = { likes: 127, liked: false, caption: '오늘의 일상 ☀️', comments: ['멋지다! 👍', '나도 가고 싶다 ✈️'] }

function stateToVNode() {
  // 간단한 VNode 구조 (시각화용)
  return {
    type: 'div', props: { class: 'post-card' }, text: null,
    children: [
      { type: 'div', props: { class: 'likes-row' }, text: null, children: [
        { type: 'span', props: { class: 'heart' }, text: null, children: [
          { type: '#text', props: {}, children: [], text: simState.liked ? '❤️' : '🤍' }
        ]},
        { type: 'span', props: { class: 'count' }, text: null, children: [
          { type: '#text', props: {}, children: [], text: String(simState.likes) }
        ]},
      ]},
      { type: 'p', props: { class: 'caption' }, text: null, children: [
        { type: '#text', props: {}, children: [], text: simState.caption }
      ]},
      { type: 'div', props: { class: 'comments' }, text: null, children:
        simState.comments.map(c => ({
          type: 'div', props: { class: 'comment' }, text: null, children: [
            { type: '#text', props: {}, children: [], text: c }
          ]
        }))
      },
    ]
  }
}

function simLike() {
  simState = { ...simState }
  simState.liked = !simState.liked
  simState.likes += simState.liked ? 1 : -1
  const label = `좋아요: ${simState.likes}`
  demoHistory.push(stateToVNode(), label)
  updateUI()
}

function simComment() {
  simState = { ...simState }
  const idx = demoHistory.length
  simState.comments = [...simState.comments, `댓글 #${idx} 테스트`]
  demoHistory.push(stateToVNode(), '댓글 추가')
  updateUI()
}

function simEdit() {
  simState = { ...simState }
  const captions = ['오늘의 일상 ☀️', '주말 나들이 🌿', '맛있는 거 먹었다 😋', '힐링 중 🧘']
  const current = captions.indexOf(simState.caption)
  simState.caption = captions[(current + 1) % captions.length]
  demoHistory.push(stateToVNode(), '캡션 수정')
  updateUI()
}

function simReset() {
  simState = { likes: 127, liked: false, caption: '오늘의 일상 ☀️', comments: ['멋지다! 👍', '나도 가고 싶다 ✈️'] }
  demoHistory = new StateHistory()
  startTime = Date.now()
  demoHistory.push(stateToVNode(), '초기 상태')
  updateUI()
}

function simUndo() {
  const vnode = demoHistory.undo()
  if (vnode) {
    // vnode에서 simState 복원
    restoreFromVNode(vnode)
    updateUI()
  }
}

function simRedo() {
  const vnode = demoHistory.redo()
  if (vnode) {
    restoreFromVNode(vnode)
    updateUI()
  }
}

function restoreFromVNode(vnode) {
  try {
    const likesRow = vnode.children[0]
    const heart = likesRow.children[0].children[0].text
    const count = likesRow.children[1].children[0].text
    const caption = vnode.children[1].children[0].text
    const comments = vnode.children[2].children.map(c => c.children[0].text)
    simState = {
      liked: heart === '❤️',
      likes: parseInt(count),
      caption,
      comments,
    }
  } catch (e) { /* 구조 불일치 시 무시 */ }
}

function updateUI() {
  // 타임라인
  const timeline = document.getElementById('history-timeline')
  timeline.innerHTML = ''

  for (let i = demoHistory.snapshots.length - 1; i >= 0; i--) {
    const item = document.createElement('div')
    const isCurrent = i === demoHistory.currentIndex
    item.className = `history-item${isCurrent ? ' history-item--current' : ''}`

    const elapsed = ((demoHistory.timestamps[i] - startTime) / 1000).toFixed(1)
    const marker = isCurrent ? '●' : '○'
    const label = demoHistory.labels[i] || `상태 ${i}`
    const currentTag = isCurrent ? ' ← current' : ''

    item.innerHTML = `
      <span class="history-marker">${marker}</span>
      <span class="history-label">${label}</span>
      <span class="history-time">[${elapsed}s]</span>
      <span class="history-current-tag">${currentTag}</span>
    `

    // 클릭으로 해당 상태로 이동
    const idx = i
    item.addEventListener('click', () => {
      const vnode = demoHistory.goTo(idx)
      if (vnode) {
        restoreFromVNode(vnode)
        updateUI()
      }
    })

    timeline.appendChild(item)
  }

  // 위치 표시
  document.getElementById('hist-position').textContent =
    `${demoHistory.currentIndex + 1} / ${demoHistory.length}`

  // 버튼 상태
  document.getElementById('hist-undo').disabled = !demoHistory.canUndo()
  document.getElementById('hist-redo').disabled = !demoHistory.canRedo()

  // 미리보기
  const preview = document.getElementById('history-preview')
  preview.innerHTML = `
    <div class="preview-card">
      <div class="preview-row">${simState.liked ? '❤️' : '🤍'} 좋아요 ${simState.likes}개</div>
      <div class="preview-row preview-caption">${simState.caption}</div>
      <div class="preview-comments">
        ${simState.comments.map(c => `<div class="preview-comment">${c}</div>`).join('')}
      </div>
    </div>
  `
}
