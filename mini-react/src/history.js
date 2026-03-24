// [왜] History (상태 히스토리)
// Ctrl+Z처럼 이전 상태로 되돌아갈 수 있어요
// VNode 스냅샷을 배열에 쌓아두고
// 뒤로가기/앞으로가기로 원하는 시점으로 이동해요
//
// 히스토리 중간에서 새 변경을 하면
// 앞으로가기 기록은 지워요 (브라우저 뒤로가기와 같은 원리)

/**
 * 상태 히스토리를 관리하는 클래스
 * push로 저장하고, undo/redo로 시간여행해요
 */
export class StateHistory {
  constructor() {
    this.snapshots = []    // VNode 스냅샷 배열
    this.currentIndex = -1 // 현재 보고 있는 위치 (-1 = 아직 아무것도 없음)
    this.timestamps = []   // 각 스냅샷의 저장 시각
    this.labels = []       // 각 스냅샷에 대한 설명 (예: "좋아요: 128")
  }

  /**
   * 새 상태를 저장해요
   * 중간 위치에서 push하면 앞으로가기 기록은 버려요
   */
  push(vnode, label = '') {
    // 현재 위치 뒤에 있는 기록은 잘라내요
    this.snapshots = this.snapshots.slice(0, this.currentIndex + 1)
    this.timestamps = this.timestamps.slice(0, this.currentIndex + 1)
    this.labels = this.labels.slice(0, this.currentIndex + 1)

    // 깊은 복사해서 저장해요 — 원본이 바뀌어도 히스토리는 그대로
    this.snapshots.push(deepClone(vnode))
    this.timestamps.push(Date.now())
    this.labels.push(label)
    this.currentIndex = this.snapshots.length - 1
  }

  /**
   * 뒤로가기 — 이전 상태로 이동해요
   * @returns {object|null} 이전 VNode 또는 null (더 이상 갈 수 없으면)
   */
  undo() {
    if (!this.canUndo()) return null
    this.currentIndex--
    return deepClone(this.snapshots[this.currentIndex])
  }

  /**
   * 앞으로가기 — 다시 되돌린 것을 복구해요
   * @returns {object|null} 다음 VNode 또는 null
   */
  redo() {
    if (!this.canRedo()) return null
    this.currentIndex++
    return deepClone(this.snapshots[this.currentIndex])
  }

  /**
   * 특정 인덱스의 상태로 바로 이동해요
   */
  goTo(index) {
    if (index < 0 || index >= this.snapshots.length) return null
    this.currentIndex = index
    return deepClone(this.snapshots[this.currentIndex])
  }

  /** 뒤로갈 수 있는지 확인해요 */
  canUndo() {
    return this.currentIndex > 0
  }

  /** 앞으로갈 수 있는지 확인해요 */
  canRedo() {
    return this.currentIndex < this.snapshots.length - 1
  }

  /** 현재 상태를 가져와요 */
  current() {
    if (this.currentIndex < 0) return null
    return deepClone(this.snapshots[this.currentIndex])
  }

  /** 전체 히스토리 길이 */
  get length() {
    return this.snapshots.length
  }
}

/**
 * VNode를 깊은 복사해요
 * 참조가 아닌 완전한 복사본을 만들어서 원본이 바뀌어도 안전해요
 */
function deepClone(obj) {
  if (obj == null) return null
  return JSON.parse(JSON.stringify(obj))
}
