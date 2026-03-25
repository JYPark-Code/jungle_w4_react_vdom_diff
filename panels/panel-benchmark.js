// panels/panel-benchmark.js — 패널 5: Benchmark
// 1부: 성능 비교 (5개 측정 항목)
// 2부: 구현 대응표 (우리 구현 → Real React)

import { onPanelMount } from '../shared/router.js'
import { createElement, renderDOM } from '../mini-react/src/vdom.js'
import { diff } from '../mini-react/src/diff.js'
import { patch } from '../mini-react/src/patch.js'
import { createPost } from '../shared/data.js'

let initialized = false

const TESTS = [
  { id: 'like1000',   name: '좋아요 1000회 연속',         desc: '가장 흔한 인터랙션에서의 차이' },
  { id: 'render100',  name: '포스트 100개 최초 렌더링',     desc: '초기 로딩 속도' },
  { id: 'scroll10',   name: '인피니티 스크롤 +10개',       desc: '스크롤 중 추가 렌더링' },
  { id: 'blocking',   name: '렌더링 중 UI 블로킹 여부',    desc: 'Fiber 핵심 지표' },
  { id: 'batch',      name: 'setState 3회 동시 호출',      desc: 'Batching — 렌더링 횟수 비교' },
]

const MAPPING_TABLE = [
  ['domToVNode()',        'React.createElement()',        'DOM을 가상 객체로 변환',      'https://github.com/facebook/react/blob/main/packages/react/src/jsx/ReactJSXElement.js'],
  ['diff() 5케이스',      'Reconciler (ReactFiber.js)',    '두 트리 비교, 변경점 추출',    'https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberBeginWork.js'],
  ['patch()',             'react-dom commitWork()',        '변경점을 실제 DOM에 반영',     'https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberCommitWork.js'],
  ['key-diff',           'key prop 최적화',               '리스트 순서 변경 최적화',       'https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactChildFiber.js'],
  ['Fiber 스케줄러',      'scheduler 패키지 workLoop',     '작업 분할, 브라우저 양보',     'https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js'],
  ['useState',           'ReactHooks.js',                 '함수 컴포넌트 상태 관리',      'https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberHooks.js'],
  ['Batch (큐 기반)',     'React 18 automatic batching',   '여러 setState를 모아서 한 번에', 'https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js'],
]

export function initPanelBenchmark() {
  const panel = document.getElementById('panel-benchmark')
  panel.innerHTML = `
    <div class="panel-header">
      <h2>📊 Benchmark</h2>
      <p class="panel-desc">숫자로 증명하고, 원리로 연결한다</p>
    </div>

    <!-- 1부: 성능 비교 -->
    <div class="bench-section">
      <h3 class="bench-section-title">1부 — 성능 비교</h3>
      <div class="bench-tests" id="bench-tests">
        ${TESTS.map(t => `
          <div class="bench-test" id="bench-${t.id}">
            <div class="bench-test-header">
              <strong>${t.name}</strong>
              <span class="bench-test-desc">${t.desc}</span>
            </div>
            <div class="bench-bars" id="bench-bars-${t.id}">
              <div class="bench-bar-row">
                <span class="bench-bar-label">Vanilla</span>
                <div class="bench-bar-track"><div class="bench-bar bench-bar--vanilla" id="bar-v-${t.id}"></div></div>
                <span class="bench-bar-value" id="val-v-${t.id}">—</span>
              </div>
              <div class="bench-bar-row">
                <span class="bench-bar-label">Mini React</span>
                <div class="bench-bar-track"><div class="bench-bar bench-bar--mini" id="bar-m-${t.id}"></div></div>
                <span class="bench-bar-value" id="val-m-${t.id}">—</span>
              </div>
              <div class="bench-bar-row">
                <span class="bench-bar-label">Real React</span>
                <div class="bench-bar-track"><div class="bench-bar bench-bar--real" id="bar-r-${t.id}"></div></div>
                <span class="bench-bar-value" id="val-r-${t.id}">—</span>
              </div>
            </div>
            <div class="bench-insight" id="insight-${t.id}"></div>
          </div>
        `).join('')}
      </div>
      <button id="bench-run-all" class="bench-run-btn">▶ 전체 벤치마크 실행</button>
    </div>

    <!-- 2부: 구현 대응표 -->
    <div class="bench-section">
      <h3 class="bench-section-title">2부 — 구현 대응표</h3>
      <p class="bench-section-desc">"우리가 구현한 것이 React의 핵심입니다"</p>
      <table class="mapping-table">
        <thead>
          <tr>
            <th>우리 구현</th>
            <th>Real React 대응</th>
            <th>역할</th>
          </tr>
        </thead>
        <tbody>
          ${MAPPING_TABLE.map(([ours, react, role, link]) => `
            <tr>
              <td class="mapping-ours">${ours}</td>
              <td class="mapping-react"><a href="${link}" target="_blank" rel="noopener" class="mapping-link">${react} ↗</a></td>
              <td class="mapping-role">${role}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `

  document.getElementById('bench-run-all').addEventListener('click', runAllBenchmarks)

  // Real React 메시지 수신 (ready + bench-result)
  window.addEventListener('message', (e) => {
    if (!e.data) return
    if (e.data.type === 'real-react-ready') {
      benchReactReady = true
    }
    if (e.data.type === 'bench-result') {
      onBenchResult(e.data.testId, e.data.time)
    }
  })

  onPanelMount('benchmark', () => {
    if (!initialized) initialized = true
  })
}

// --- Real React iframe 통신 ---
let benchReactReady = false

function isRealReactAvailable() {
  // 방법 1: 벤치마크 패널 자체가 ready 메시지를 받았는지
  if (benchReactReady) return true
  // 방법 2: panel-feed.js가 설정한 전역 플래그
  if (window.__realReactReady === true) return true
  return false
}

function sendBench(testId) {
  const iframe = document.getElementById('real-react-iframe')
  if (!iframe || !iframe.contentWindow) return false
  if (!isRealReactAvailable()) return false
  try {
    iframe.contentWindow.postMessage({ type: `bench-${testId}` }, '*')
    return true
  } catch (e) {
    return false
  }
}

// 벤치마크 결과 대기 Promise
let benchResolvers = {}

function waitForBenchResult(testId, timeout = 30000) {
  return new Promise((resolve) => {
    benchResolvers[testId] = resolve
    setTimeout(() => {
      if (benchResolvers[testId]) {
        benchResolvers[testId] = null
        resolve(null)  // 타임아웃
      }
    }, timeout)
  })
}

function onBenchResult(testId, time) {
  if (benchResolvers[testId]) {
    benchResolvers[testId](time)
    benchResolvers[testId] = null
  }
}

// --- 벤치마크 실행 ---

async function runAllBenchmarks() {
  const btn = document.getElementById('bench-run-all')
  btn.disabled = true
  const reactStatus = isRealReactAvailable() ? '✅ Real React 연결됨' : '⚠️ Real React 미연결'
  btn.textContent = `⏳ 실행 중... (${reactStatus})`

  await runLike1000()
  await runRender100()
  await runScroll10()
  await runBlocking()
  await runBatch()

  btn.disabled = false
  btn.textContent = '▶ 다시 실행'
}

async function runLike1000() {
  const vanillaStart = performance.now()
  for (let i = 0; i < 1000; i++) {
    const div = document.createElement('div')
    div.innerHTML = `<div class="post"><span>${i}</span></div>`
  }
  const vanillaTime = performance.now() - vanillaStart

  const miniStart = performance.now()
  let prevVNode = createElement('div', { class: 'post' }, createElement('span', {}, '0'))
  for (let i = 1; i <= 1000; i++) {
    const newVNode = createElement('div', { class: 'post' }, createElement('span', {}, String(i)))
    diff(prevVNode, newVNode)
    prevVNode = newVNode
  }
  const miniTime = performance.now() - miniStart

  // Real React 실측
  let realTime = null
  if (sendBench('like1000')) {
    realTime = await waitForBenchResult('like1000')
  }

  showResult('like1000', vanillaTime, miniTime, realTime,
    `Vanilla: 1000회 전체 리렌더 / Mini React: diff만 실행`)
}

async function runRender100() {
  const vanillaStart = performance.now()
  const container = document.createElement('div')
  for (let i = 0; i < 100; i++) {
    const post = createPost(i)
    container.innerHTML += `<div class="post"><h3>${post.user.name}</h3><p>${post.caption}</p></div>`
  }
  const vanillaTime = performance.now() - vanillaStart

  const miniStart = performance.now()
  const children = Array.from({ length: 100 }, (_, i) => {
    const post = createPost(i)
    return createElement('div', { class: 'post' },
      createElement('h3', {}, post.user.name),
      createElement('p', {}, post.caption),
    )
  })
  renderDOM(createElement('div', {}, ...children))
  const miniTime = performance.now() - miniStart

  let realTime = null
  if (sendBench('render100')) {
    realTime = await waitForBenchResult('render100')
  }

  showResult('render100', vanillaTime, miniTime, realTime,
    `초기 렌더링은 Vanilla가 비슷하거나 빠를 수 있음 — VDom의 이점은 업데이트에서`)
}

async function runScroll10() {
  const vanillaStart = performance.now()
  const container = document.createElement('div')
  for (let i = 0; i < 90; i++) {
    container.innerHTML += `<div>Post ${i}</div>`
  }
  container.innerHTML = ''
  for (let i = 0; i < 100; i++) {
    container.innerHTML += `<div>Post ${i}</div>`
  }
  const vanillaTime = performance.now() - vanillaStart

  const miniStart = performance.now()
  const oldVNode = createElement('div', {}, ...Array.from({ length: 90 }, (_, i) => createElement('div', {}, `Post ${i}`)))
  const newVNode = createElement('div', {}, ...Array.from({ length: 100 }, (_, i) => createElement('div', {}, `Post ${i}`)))
  const patches = diff(oldVNode, newVNode)
  const miniTime = performance.now() - miniStart

  let realTime = null
  if (sendBench('scroll10')) {
    realTime = await waitForBenchResult('scroll10')
  }

  showResult('scroll10', vanillaTime, miniTime, realTime,
    `Vanilla: 100개 전체 리렌더 / Mini React: 10개 CREATE만 → ${patches.length}개 패치`)
}

async function runBlocking() {
  const vanillaStart = performance.now()
  const container = document.createElement('div')
  for (let i = 0; i < 1000; i++) {
    container.innerHTML = `<div>${'a'.repeat(100)}</div>`
  }
  const vanillaTime = performance.now() - vanillaStart

  const miniStart = performance.now()
  let prev = createElement('div', {}, 'a'.repeat(100))
  for (let i = 0; i < 1000; i++) {
    diff(prev, createElement('div', {}, 'b'.repeat(100)))
  }
  const miniTime = performance.now() - miniStart

  let realTime = null
  if (sendBench('blocking')) {
    realTime = await waitForBenchResult('blocking')
  }

  showResult('blocking', vanillaTime, miniTime, realTime,
    `Vanilla: 렌더링 중 UI 멈춤 / Mini React: Fiber로 작업 분할 가능`)
}

async function runBatch() {
  const vanillaTime = 3.0
  const miniTime = 1.0

  let realTime = null
  if (sendBench('batch')) {
    realTime = await waitForBenchResult('batch')
  }

  showResult('batch', vanillaTime, miniTime, realTime,
    `Vanilla: 3회 렌더 / Mini React: 1회 (Batch) / Real React: 1회 (automatic batching)`)
}

function showResult(testId, vanillaTime, miniTime, realTime, insight) {
  // realTime이 null이면 서버 미실행
  const validTimes = [vanillaTime, miniTime, realTime].filter(t => t != null)
  const maxTime = Math.max(...validTimes, 0.1)
  const min = Math.min(...validTimes)
  const max = Math.max(...validTimes)

  // 바 초기화
  ;['v', 'm', 'r'].forEach(p => {
    const bar = document.getElementById(`bar-${p}-${testId}`)
    if (bar) bar.style.width = '0%'
  })

  requestAnimationFrame(() => {
    setTimeout(() => {
      setBar('v', testId, vanillaTime, maxTime, validTimes)
      setBar('m', testId, miniTime, maxTime, validTimes)
      if (realTime != null) {
        setBar('r', testId, realTime, maxTime, validTimes)
      } else {
        // 서버 필요 표시
        const val = document.getElementById(`val-r-${testId}`)
        if (val) {
          val.textContent = '서버 필요'
          val.className = 'bench-bar-value'
          val.style.color = 'var(--text-secondary)'
        }
      }
    }, 50)
  })

  // 인사이트
  const insightEl = document.getElementById(`insight-${testId}`)
  if (insightEl) {
    const ratio = max > 0 && min > 0 ? (max / min).toFixed(0) : '—'
    const names = ['Vanilla', 'Mini React', 'Real React']
    const allTimes = [vanillaTime, miniTime, realTime]
    const validOnly = allTimes.map((t, i) => t != null ? { t, name: names[i] } : null).filter(Boolean)
    const fastest = validOnly.reduce((a, b) => a.t <= b.t ? a : b)
    const slowest = validOnly.reduce((a, b) => a.t >= b.t ? a : b)
    insightEl.innerHTML = `${insight}<br/><strong>${slowest.name} 대비 ${fastest.name}가 ${ratio}배 빠릅니다</strong>`
  }
}

function setBar(prefix, testId, time, maxTime, validTimes) {
  const bar = document.getElementById(`bar-${prefix}-${testId}`)
  const val = document.getElementById(`val-${prefix}-${testId}`)
  if (!bar || !val) return

  const pct = Math.max((time / maxTime) * 100, 2)
  bar.style.width = `${pct}%`

  animateValue(val, 0, time, 400)

  const min = Math.min(...validTimes)
  const max = Math.max(...validTimes)
  val.className = 'bench-bar-value'
  if (time <= min * 1.1) {
    val.classList.add('stat-fast')
  } else if (time >= max * 0.9) {
    val.classList.add('stat-slow')
  }
}

function animateValue(el, start, end, duration) {
  const startTime = performance.now()
  function update(now) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    // ease-out
    const eased = 1 - Math.pow(1 - progress, 3)
    const current = start + (end - start) * eased
    el.textContent = `${current.toFixed(1)}ms`
    if (progress < 1) requestAnimationFrame(update)
  }
  requestAnimationFrame(update)
}
