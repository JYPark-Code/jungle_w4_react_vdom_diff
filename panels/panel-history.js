// panels/panel-history.js — 패널 4: History 뷰어
// Ctrl+Z가 어떻게 동작하는가
// M9에서 본격 구현 예정

import { onPanelMount } from '../shared/router.js'

export function initPanelHistory() {
  const panel = document.getElementById('panel-history')
  panel.innerHTML = `
    <div class="panel-header">
      <h2>⏪ State History</h2>
      <p class="panel-desc">Ctrl+Z가 어떻게 동작하는가 — 히스토리 스택 시각화</p>
    </div>
    <div class="panel-body">
      <p class="placeholder">M9에서 구현 예정: 히스토리 타임라인 + 항목 클릭 이동</p>
    </div>
  `

  onPanelMount('history', () => {
    // 패널 활성화 시 실행할 로직
  })
}
