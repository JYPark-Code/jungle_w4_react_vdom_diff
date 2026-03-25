// main.js — SPA 진입점
// 라우터를 초기화하고, 각 패널 모듈을 로드해요

import { initRouter } from './shared/router.js'
import { initPanelFeed } from './panels/panel-feed.js'
import { initPanelVdom } from './panels/panel-vdom.js'
import { initPanelDiff } from './panels/panel-diff.js'
import { initPanelHistory } from './panels/panel-history.js'
import { initPanelBenchmark } from './panels/panel-benchmark.js'

// 각 패널 초기화
initPanelFeed()
initPanelVdom()
initPanelDiff()
initPanelHistory()
initPanelBenchmark()

// 라우터 시작 (네비게이션 바 생성 + 해시 감지)
initRouter()
