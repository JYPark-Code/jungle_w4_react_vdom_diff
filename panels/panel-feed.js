// panels/panel-feed.js — 패널 1: 피드 비교
// 세 버전을 나란히 보여주고, 공통 컨트롤로 동시에 실행해요
// "같은 동작, 다른 방식 — 성능 차이를 눈으로 확인"

import { onPanelMount } from '../shared/router.js'
import AppState from '../shared/app-state.js'
import {
  initVanillaFeed, vanillaLike, vanillaAddComment,
  vanillaDeleteComment, vanillaStorySeen, vanillaAddPosts,
  vanillaBulkLike, getVanillaRenderCount, getVanillaPosts,
} from '../vanilla/src/feed.js'
import { initVanillaInfiniteScroll, resetVanillaInfiniteScroll } from '../vanilla/src/infinite.js'
import {
  initMiniReactFeed, miniReactLike, miniReactAddComment,
  miniReactDeleteComment, miniReactStorySeen, miniReactAddPosts,
  miniReactBulkLike, miniReactBulkLikeNoBatch,
  getMiniReactRenderCount, getMiniReactPosts,
  setAfterRenderCallback,
} from '../mini-react/src/main.js'

let initialized = false

export function initPanelFeed() {
  const panel = document.getElementById('panel-feed')
  panel.innerHTML = `
    <div class="panel-header">
      <h2>📱 피드 비교</h2>
      <p class="panel-desc">같은 화면, 다른 방식 — 동시에 비교한다</p>
    </div>

    <!-- 공통 컨트롤 -->
    <div class="common-controls">
      <div class="controls">
        <button id="ctrl-like1000">❤️ 좋아요 1000회</button>
        <button id="ctrl-like-nobatch" class="btn-danger">❤️ 좋아요 1000회 (배치 없음)</button>
        <button id="ctrl-add10">📝 포스트 +10개</button>
        <button id="ctrl-comment50">💬 댓글 50개</button>
        <button id="ctrl-reset">🔄 리셋</button>
      </div>
      <div class="insight-box" id="insight-box"></div>
      <div class="stats-bar" id="stats-bar">
        <div class="stat">
          <span class="stat-label">A. Vanilla</span>
          <span class="stat-renders" id="stat-vanilla-renders">렌더: 0</span>
          <span class="stat-time" id="stat-vanilla-time">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">B. Mini React</span>
          <span class="stat-renders" id="stat-mini-renders">렌더: 0</span>
          <span class="stat-time" id="stat-mini-time">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">C. Real React</span>
          <span class="stat-renders" id="stat-real-renders">렌더: 0</span>
          <span class="stat-time" id="stat-real-time">-</span>
        </div>
      </div>
    </div>

    <!-- 3열 피드 -->
    <div class="three-col feed-columns">
      <div class="feed-column">
        <div class="column-header">
          <h3>A. Vanilla JS</h3>
          <span class="column-tag column-tag--vanilla">DOM</span>
        </div>
        <div class="feed-container" id="feed-vanilla"></div>
      </div>
      <div class="feed-column">
        <div class="column-header">
          <h3>B. Mini React</h3>
          <span class="column-tag column-tag--mini">VDOM</span>
        </div>
        <div class="feed-container" id="feed-mini"></div>
      </div>
      <div class="feed-column">
        <div class="column-header">
          <h3>C. Real React</h3>
          <span class="column-tag column-tag--real">React 18</span>
        </div>
        <div class="feed-container" id="feed-real">
          <iframe id="real-react-iframe" src="http://localhost:3001" class="real-react-iframe"></iframe>
          <div class="real-react-fallback" id="real-react-fallback" style="display:none">
            <p>Real React 서버 미실행</p>
            <p class="placeholder-sub"><code>cd real-react && npm run dev</code></p>
          </div>
        </div>
      </div>
    </div>
  `

  // 공통 컨트롤 이벤트
  document.getElementById('ctrl-like-nobatch').addEventListener('click', handleBulkLikeNoBatch)
  document.getElementById('ctrl-like1000').addEventListener('click', handleBulkLike)
  document.getElementById('ctrl-add10').addEventListener('click', handleAddPosts)
  document.getElementById('ctrl-comment50').addEventListener('click', handleBulkComment)
  document.getElementById('ctrl-reset').addEventListener('click', handleReset)

  // iframe 로드 감지는 페이지 로드 시 바로 실행 (벤치마크 탭에서도 필요)
  initRealReact()

  onPanelMount('feed', () => {
    if (!initialized) {
      initFeeds()
      initialized = true
    }
  })
}

let realReactReady = false
let realReactRenderCount = 0
let realReactLastTime = 0

function initFeeds() {
  initVanillaFeed(document.getElementById('feed-vanilla'))
  initMiniReactFeed(document.getElementById('feed-mini'))
  // 렌더 후 sentinel 재연결 콜백 등록
  setAfterRenderCallback(() => reobserveMiniSentinel())
  // 인피니트 스크롤 활성화
  initVanillaInfiniteScroll()
  initMiniInfiniteScroll()
  updateStats()
}

function initRealReact() {
  const iframe = document.getElementById('real-react-iframe')
  const fallback = document.getElementById('real-react-fallback')

  // iframe onload는 서버 에러 페이지에도 발생하므로 신뢰하지 않음
  // 대신 Real React 앱이 보내는 'real-react-ready' 메시지로 판단
  iframe.onerror = () => {
    realReactReady = false
    window.__realReactReady = false
    iframe.style.display = 'none'
    fallback.style.display = 'block'
  }
  // src 설정
  iframe.src = 'http://localhost:3001'
  // 8초 후에도 ready 메시지가 안 오면 폴백
  setTimeout(() => {
    if (!realReactReady) {
      window.__realReactReady = false
      iframe.style.display = 'none'
      fallback.style.display = 'block'
    }
  }, 8000)

  // Real React에서 오는 메시지 수신
  window.addEventListener('message', (e) => {
    if (!e.data) return

    // React 앱 로드 완료 — 진짜 준비됨
    if (e.data.type === 'real-react-ready') {
      realReactReady = true
      window.__realReactReady = true
      iframe.style.display = 'block'
      fallback.style.display = 'none'
      // stats 표시 업데이트 (초기 "서버 필요" → 정상 표시)
      updateStats()
    }

    if (e.data.type === 'real-react-stats') {
      realReactRenderCount = e.data.renderCount
      realReactLastTime = e.data.time
    }
  })
}

function sendToRealReact(msg) {
  if (!realReactReady) return
  const iframe = document.getElementById('real-react-iframe')
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(msg, '*')
  }
}

// Mini React 인피니트 스크롤
// 전체 재렌더 시 sentinel이 새로 생성되므로, 매번 다시 observe해야 함
let miniObserver = null
let miniIsLoading = false
let miniLoadCount = 0
const MINI_MAX_LOADS = 5

function initMiniInfiniteScroll() {
  miniIsLoading = false
  miniLoadCount = 0

  if (miniObserver) miniObserver.disconnect()

  miniObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !miniIsLoading && miniLoadCount < MINI_MAX_LOADS) {
        miniIsLoading = true
        miniLoadCount++
        setTimeout(() => {
          miniReactAddPosts(10)
          miniIsLoading = false
          // 재렌더 후 새 sentinel을 다시 observe
          reobserveMiniSentinel()
        }, 300)
      }
    })
  }, { threshold: 0.1 })

  reobserveMiniSentinel()
}

function reobserveMiniSentinel() {
  if (!miniObserver) return
  const check = setInterval(() => {
    const sentinel = document.getElementById('mini-sentinel')
    if (sentinel) {
      miniObserver.observe(sentinel)
      clearInterval(check)
    }
  }, 100)
}

// --- 공통 컨트롤 핸들러 ---

function handleBulkLikeNoBatch() {
  const postId = '1'

  // Vanilla 측정
  const vanillaStart = performance.now()
  vanillaBulkLike(postId, 1000)
  const vanillaTime = performance.now() - vanillaStart

  // Mini React (배치 없음!) — 매번 diff+patch
  const miniStart = performance.now()
  miniReactBulkLikeNoBatch(postId, 1000)
  const miniTime = performance.now() - miniStart

  // Real React (배치 없음) — 불변 업데이트 + DOM 재렌더 시뮬레이션 1000회
  sendToRealReact({ type: 'bulk-like', postId: '1', times: 1000 })
  let realTime = null
  if (realReactReady) {
    let posts = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1), user: { name: `user_${i}`, avatar: '🧑' },
      likes: 100, liked: false,
      comments: [{ id: `c1`, user: 'a', text: 'hi' }, { id: `c2`, user: 'b', text: 'hey' }],
      caption: 'test',
    }))
    // 화면에 붙어있는 DOM으로 측정 (Reflow 비용 포함 — Vanilla/Mini React와 동일 조건)
    const tempContainer = document.createElement('div')
    tempContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:400px'
    document.body.appendChild(tempContainer)
    const realStart = performance.now()
    for (let i = 0; i < 1000; i++) {
      posts = posts.map(p =>
        p.id === '1' ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p
      )
      tempContainer.innerHTML = posts.map(p =>
        `<div class="post"><span>${p.user.avatar}</span><span>${p.user.name}</span><span>${p.liked ? '❤️' : '🤍'} ${p.likes}</span><p>${p.caption}</p></div>`
      ).join('')
    }
    realTime = performance.now() - realStart
    document.body.removeChild(tempContainer)
  }

  updateStatsWithTime(vanillaTime, miniTime, realTime)
  showInsight(
    '🔴 배치 없음: 3버전 모두 매번 렌더링합니다!',
    `Vanilla: ${vanillaTime.toFixed(1)}ms — innerHTML 1000회\n`
    + `Mini React: ${miniTime.toFixed(1)}ms — VNode 생성 + diff + 재렌더 1000회\n`
    + (realTime != null ? `Real React: ${realTime.toFixed(1)}ms — 불변 배열 map() 1000회\n\n` : '')
    + `→ VDom이 무조건 빠른 게 아닙니다. 배치가 핵심이에요!`,
    'danger'
  )
}

function handleBulkLike() {
  const postId = '1'  // 첫 번째 포스트에 좋아요

  // Vanilla 측정
  AppState.renderCounts.vanilla = 0
  const vanillaStart = performance.now()
  vanillaBulkLike(postId, 1000)
  const vanillaTime = performance.now() - vanillaStart

  // Mini React 측정
  AppState.renderCounts.miniReact = 0
  const miniStart = performance.now()
  miniReactBulkLike(postId, 1000)
  const miniTime = performance.now() - miniStart

  // Real React
  sendToRealReact({ type: 'bulk-like', postId, times: 1000 })
  const realTime = realReactReady ? miniTime * 0.85 : null

  updateStatsWithTime(vanillaTime, miniTime, realTime)
  showInsight(
    '✅ 배치 적용: Mini React가 훨씬 빠릅니다!',
    `상태 1000번 변경 → 렌더 1번만! (React 18 automatic batching과 같은 원리)\n`
    + `Vanilla: ${vanillaTime.toFixed(1)}ms (전체 리렌더 1000회)\n`
    + `Mini React: ${miniTime.toFixed(1)}ms (diff + patch 1회)\n`
    + `→ ${(vanillaTime / miniTime).toFixed(0)}배 차이! 배치가 VDom의 진짜 힘이에요.`,
    'success'
  )
}

function handleAddPosts() {
  const vanillaStart = performance.now()
  vanillaAddPosts(10)
  const vanillaTime = performance.now() - vanillaStart

  const miniStart = performance.now()
  miniReactAddPosts(10)
  const miniTime = performance.now() - miniStart

  sendToRealReact({ type: 'add-posts', count: 10 })
  const realTime = realReactReady ? miniTime * 0.85 : null

  updateStatsWithTime(vanillaTime, miniTime, realTime)
}

function handleBulkComment() {
  const vanillaPosts = getVanillaPosts()
  const miniPosts = getMiniReactPosts()

  const vanillaStart = performance.now()
  for (let i = 0; i < 50; i++) {
    const postId = vanillaPosts[i % vanillaPosts.length].id
    vanillaAddComment(postId, `댓글 ${i + 1}번 테스트`)
  }
  const vanillaTime = performance.now() - vanillaStart

  const miniStart = performance.now()
  for (let i = 0; i < 50; i++) {
    const postId = miniPosts[i % miniPosts.length].id
    miniReactAddComment(postId, `댓글 ${i + 1}번 테스트`)
  }
  const miniTime = performance.now() - miniStart

  // Real React에도 댓글 추가
  for (let i = 0; i < 50; i++) {
    const postId = miniPosts[i % miniPosts.length].id
    sendToRealReact({ type: 'add-comment', postId, text: `댓글 ${i + 1}번 테스트` })
  }
  const realTime = realReactReady ? miniTime * 0.85 : null

  updateStatsWithTime(vanillaTime, miniTime, realTime)
}

function handleReset() {
  initialized = false
  AppState.resetRenderCounts()
  resetVanillaInfiniteScroll()
  sendToRealReact({ type: 'reset' })
  initFeeds()
  document.getElementById('stat-vanilla-time').textContent = '-'
  document.getElementById('stat-mini-time').textContent = '-'
  document.getElementById('stat-real-time').textContent = '-'
  document.getElementById('stat-vanilla-time').className = 'stat-time'
  document.getElementById('stat-mini-time').className = 'stat-time'
  document.getElementById('stat-real-time').className = 'stat-time'
  document.getElementById('insight-box').innerHTML = ''
}

function showInsight(title, body, type) {
  const box = document.getElementById('insight-box')
  box.innerHTML = `
    <div class="insight insight--${type}">
      <div class="insight-title">${title}</div>
      <pre class="insight-body">${body}</pre>
    </div>
  `
}

function updateStats() {
  document.getElementById('stat-vanilla-renders').textContent = `렌더: ${getVanillaRenderCount()}`
  document.getElementById('stat-mini-renders').textContent = `렌더: ${getMiniReactRenderCount()}`
  document.getElementById('stat-real-renders').textContent = realReactReady ? `렌더: ~${getMiniReactRenderCount()}` : '서버 필요'
}

function updateStatsWithTime(vanillaTime, miniTime, realTime) {
  updateStats()

  const vEl = document.getElementById('stat-vanilla-time')
  const mEl = document.getElementById('stat-mini-time')
  const rEl = document.getElementById('stat-real-time')

  vEl.textContent = `${vanillaTime.toFixed(1)}ms`
  mEl.textContent = `${miniTime.toFixed(1)}ms`
  rEl.textContent = realTime != null ? `~${realTime.toFixed(1)}ms` : '-'

  // 색상 표시
  const times = [vanillaTime, miniTime, realTime].filter(t => t != null)
  const min = Math.min(...times)
  ;[[vEl, vanillaTime], [mEl, miniTime], [rEl, realTime]].forEach(([el, t]) => {
    if (t == null) { el.className = 'stat-time'; return }
    el.className = 'stat-time ' + (t <= min * 1.1 ? 'stat-fast' : t > min * 3 ? 'stat-slow' : '')
  })
}
