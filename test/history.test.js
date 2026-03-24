import { StateHistory } from '../mini-react/src/history.js'
import { createElement } from '../mini-react/src/vdom.js'

function test(desc, fn) {
  try { fn(); console.log(`✅ ${desc}`) }
  catch(e) { console.error(`❌ ${desc}\n   → ${e.message}`) }
}
function assert(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${msg}\n기대: ${JSON.stringify(expected)}\n실제: ${JSON.stringify(actual)}`)
}

// TC-06: 히스토리 이동 — Patch 3회 → 뒤로가기 2회
test('TC-06 히스토리 이동 — push 3회 → undo 2회', () => {
  const history = new StateHistory()

  const v1 = createElement('p', {}, '상태1')
  const v2 = createElement('p', {}, '상태2')
  const v3 = createElement('p', {}, '상태3')

  history.push(v1, '초기')
  history.push(v2, '변경1')
  history.push(v3, '변경2')

  assert(history.length, 3, '히스토리 3개')
  assert(history.currentIndex, 2, '현재 인덱스 2')

  // 뒤로가기 1번
  const back1 = history.undo()
  assert(back1.children[0].text, '상태2', '뒤로가기 1 → 상태2')
  assert(history.currentIndex, 1, '인덱스 1')

  // 뒤로가기 2번
  const back2 = history.undo()
  assert(back2.children[0].text, '상태1', '뒤로가기 2 → 상태1')
  assert(history.currentIndex, 0, '인덱스 0')

  // 더 이상 뒤로갈 수 없음
  assert(history.canUndo(), false, 'canUndo false')
  assert(history.undo(), null, 'undo returns null')
})

test('redo — 앞으로가기', () => {
  const history = new StateHistory()
  history.push(createElement('p', {}, 'A'), 'A')
  history.push(createElement('p', {}, 'B'), 'B')
  history.push(createElement('p', {}, 'C'), 'C')

  history.undo() // → B
  history.undo() // → A

  const redo1 = history.redo()
  assert(redo1.children[0].text, 'B', 'redo → B')

  const redo2 = history.redo()
  assert(redo2.children[0].text, 'C', 'redo → C')

  assert(history.canRedo(), false, '더 이상 redo 불가')
})

test('중간에서 push → 앞으로가기 기록 삭제', () => {
  const history = new StateHistory()
  history.push(createElement('p', {}, 'A'), 'A')
  history.push(createElement('p', {}, 'B'), 'B')
  history.push(createElement('p', {}, 'C'), 'C')

  history.undo() // → B
  history.undo() // → A

  // A 위치에서 새로운 상태 push → B, C는 사라져야 함
  history.push(createElement('p', {}, 'D'), 'D')

  assert(history.length, 2, 'A + D = 2개')
  assert(history.canRedo(), false, 'redo 불가')
  assert(history.current().children[0].text, 'D', '현재 = D')
})

test('goTo — 특정 인덱스로 이동', () => {
  const history = new StateHistory()
  history.push(createElement('p', {}, 'X'), 'X')
  history.push(createElement('p', {}, 'Y'), 'Y')
  history.push(createElement('p', {}, 'Z'), 'Z')

  const result = history.goTo(0)
  assert(result.children[0].text, 'X', 'goTo(0) → X')
  assert(history.currentIndex, 0, 'index = 0')
})

test('깊은 복사 — 원본 수정해도 히스토리 안 변함', () => {
  const history = new StateHistory()
  const vnode = createElement('p', {}, '원본')
  history.push(vnode)

  // 원본을 변경
  vnode.children[0].text = '수정됨'

  // 히스토리에 저장된 건 그대로여야 함
  assert(history.current().children[0].text, '원본', '깊은 복사 보장')
})
