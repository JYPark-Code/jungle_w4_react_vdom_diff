// shared/router.js — 패널 전환
// SPA(Single Page Application)에서 페이지를 새로고침 없이 바꿔요
// URL의 해시(#)를 사용해서 현재 패널을 구분해요
// 예: #feed → 패널 1, #vdom → 패널 2

const PANELS = {
  feed:      { id: 'panel-feed',      label: '피드·비교',     icon: '📱' },
  vdom:      { id: 'panel-vdom',      label: 'VDom',          icon: '🌳' },
  diff:      { id: 'panel-diff',      label: 'Diff·Patch',   icon: '🔍' },
  history:   { id: 'panel-history',   label: 'History',       icon: '⏪' },
  benchmark: { id: 'panel-benchmark', label: 'Benchmark',     icon: '📊' },
}

const DEFAULT_PANEL = 'feed'

/**
 * 라우터를 초기화해요
 * 네비게이션 바를 만들고, 해시 변경을 감지해요
 */
export function initRouter() {
  // 네비게이션 바 생성
  const nav = document.getElementById('nav')
  if (nav) {
    nav.innerHTML = Object.entries(PANELS).map(([key, panel]) =>
      `<a href="#${key}" class="nav-link" data-panel="${key}">${panel.icon} ${panel.label}</a>`
    ).join('')
  }

  // 해시 변경 감지
  window.addEventListener('hashchange', () => {
    navigateTo(getCurrentPanel())
  })

  // 초기 패널 표시
  navigateTo(getCurrentPanel())
}

/**
 * 현재 URL 해시에서 패널 이름을 가져와요
 */
function getCurrentPanel() {
  const hash = window.location.hash.slice(1) // '#feed' → 'feed'
  return PANELS[hash] ? hash : DEFAULT_PANEL
}

/**
 * 지정된 패널로 전환해요
 */
function navigateTo(panelName) {
  // 모든 패널 숨기기
  document.querySelectorAll('.panel').forEach(el => {
    el.classList.remove('panel--active')
  })

  // 해당 패널 보이기
  const targetId = PANELS[panelName]?.id
  const targetEl = document.getElementById(targetId)
  if (targetEl) {
    targetEl.classList.add('panel--active')
  }

  // 네비게이션 활성 표시
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('nav-link--active', link.dataset.panel === panelName)
  })

  // 패널 초기화 콜백 실행
  if (panelCallbacks[panelName]) {
    panelCallbacks[panelName]()
  }
}

// 패널별 초기화 콜백 저장소
const panelCallbacks = {}

/**
 * 패널이 처음 보여질 때 실행할 콜백을 등록해요
 */
export function onPanelMount(panelName, callback) {
  panelCallbacks[panelName] = callback
}

export { PANELS, DEFAULT_PANEL }
