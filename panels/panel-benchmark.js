// panels/panel-benchmark.js — 패널 5: Benchmark
// 숫자로 증명하고, 원리로 연결한다
// M10에서 본격 구현 예정

import { onPanelMount } from '../shared/router.js'

export function initPanelBenchmark() {
  const panel = document.getElementById('panel-benchmark')
  panel.innerHTML = `
    <div class="panel-header">
      <h2>📊 Benchmark</h2>
      <p class="panel-desc">숫자로 증명하고, 원리로 연결한다</p>
    </div>
    <div class="panel-body">
      <p class="placeholder">M10에서 구현 예정: 성능 비교 + 구현 대응표</p>
    </div>
  `

  onPanelMount('benchmark', () => {
    // 패널 활성화 시 실행할 로직
  })
}
