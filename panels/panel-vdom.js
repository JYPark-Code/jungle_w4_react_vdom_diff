// panels/panel-vdom.js — 패널 2: VDom Inspector
// 인터랙션 → VNode 트리 시각화
// M7에서 본격 구현 예정

import { onPanelMount } from '../shared/router.js'

export function initPanelVdom() {
  const panel = document.getElementById('panel-vdom')
  panel.innerHTML = `
    <div class="panel-header">
      <h2>🌳 VDom Inspector</h2>
      <p class="panel-desc">클릭 하나에 내부에서 무슨 일이 일어나는가</p>
    </div>
    <div class="panel-body">
      <p class="placeholder">M7에서 구현 예정: VNode 트리 시각화 + 변경 강조</p>
    </div>
  `

  onPanelMount('vdom', () => {
    // 패널 활성화 시 실행할 로직
  })
}
