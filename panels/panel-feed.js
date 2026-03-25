// panels/panel-feed.js — 패널 1: 피드 비교
// 세 버전(Vanilla, Mini React, Real React)을 나란히 보여줘요
// M6에서 본격 구현 예정

import { onPanelMount } from '../shared/router.js'

export function initPanelFeed() {
  const panel = document.getElementById('panel-feed')
  panel.innerHTML = `
    <div class="panel-header">
      <h2>📱 피드 비교</h2>
      <p class="panel-desc">같은 화면, 다른 방식 — Vanilla vs Mini React vs Real React</p>
    </div>
    <div class="panel-body">
      <p class="placeholder">M6에서 구현 예정: 3버전 동시 실행 + 공통 컨트롤</p>
    </div>
  `

  onPanelMount('feed', () => {
    // 패널 활성화 시 실행할 로직
  })
}
