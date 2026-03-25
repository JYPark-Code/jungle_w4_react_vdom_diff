// panels/panel-diff.js — 패널 3: Diff & Patch 뷰어
// 과제 핵심 요구사항을 직접 보여주는 패널
// M8에서 본격 구현 예정

import { onPanelMount } from '../shared/router.js'

export function initPanelDiff() {
  const panel = document.getElementById('panel-diff')
  panel.innerHTML = `
    <div class="panel-header">
      <h2>🔍 Diff & Patch</h2>
      <p class="panel-desc">과제 핵심 — diff()가 찾아낸 변경을 patch()로 적용</p>
    </div>
    <div class="panel-body">
      <p class="placeholder">M8에서 구현 예정: 실제/테스트 영역 + Patch + 뒤로/앞으로</p>
    </div>
  `

  onPanelMount('diff', () => {
    // 패널 활성화 시 실행할 로직
  })
}
