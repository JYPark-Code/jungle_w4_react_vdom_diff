// shared/app-state.js — 패널 간 공유 상태 (옵저버 패턴)
// 모든 패널이 이 하나의 상태를 바라봐요
// 패널끼리 직접 통신하지 않고, AppState를 통해서만 소통해요
// update()를 호출하면 구독한 모든 패널에 자동으로 알려줘요

import { StateHistory } from '../mini-react/src/history.js'

const AppState = {
  // VDom 관련
  currentVNode: null,
  previousVNode: null,
  lastPatches: [],

  // 히스토리
  stateHistory: new StateHistory(),

  // 성능 측정
  renderCounts: { vanilla: 0, miniReact: 0, realReact: 0 },
  benchmarkResults: [],

  // 옵저버 패턴 — 구독자 목록
  listeners: [],

  /**
   * 상태를 업데이트하고 모든 구독자에게 알려요
   * @param {object} partial - 바꿀 속성들 (전체가 아닌 일부만 넘겨도 돼요)
   */
  update(partial) {
    Object.assign(this, partial)
    this.listeners.forEach(fn => fn(this))
  },

  /**
   * 상태 변경을 구독해요
   * @param {Function} fn - 상태가 바뀔 때 호출될 함수
   * @returns {Function} 구독 해제 함수
   */
  subscribe(fn) {
    this.listeners.push(fn)
    // 구독 해제 함수 반환
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn)
    }
  },

  /**
   * 렌더링 카운트 증가
   */
  incrementRenderCount(version) {
    this.renderCounts[version]++
    this.listeners.forEach(fn => fn(this))
  },

  /**
   * 렌더링 카운트 리셋
   */
  resetRenderCounts() {
    this.renderCounts = { vanilla: 0, miniReact: 0, realReact: 0 }
    this.listeners.forEach(fn => fn(this))
  },
}

export default AppState
