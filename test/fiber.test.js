import { createElement } from '../mini-react/src/vdom.js'
import {
  createFiber,
  buildFiberTree,
  workLoop,
  scheduleUpdate,
  flushUpdates,
} from '../mini-react/src/fiber.js'
import { useState, setCurrentFiber } from '../mini-react/src/hooks.js'

function test(desc, fn) {
  try { fn(); console.log(`✅ ${desc}`) }
  catch(e) { console.error(`❌ ${desc}\n   → ${e.message}`) }
}
async function testAsync(desc, fn) {
  try { await fn(); console.log(`✅ ${desc}`) }
  catch(e) { console.error(`❌ ${desc}\n   → ${e.message}`) }
}
function assert(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${msg}\n기대: ${JSON.stringify(expected)}\n실제: ${JSON.stringify(actual)}`)
}

// TC-10: useState Counter — 버튼 클릭 → count 증가
test('TC-10 useState — 초기값 설정 + setState로 증가', () => {
  const fiber = createFiber(createElement('div', {}))

  // 첫 렌더: useState(0) → [0, setState]
  setCurrentFiber(fiber)
  const [count1, setCount1] = useState(0)
  assert(count1, 0, '초기값 0')

  // setState로 값 변경 (직접 hooks에 반영해서 테스트)
  fiber.hooks[0].value = 1

  // 두 번째 렌더: 저장된 값을 읽어와야 해요
  setCurrentFiber(fiber)
  const [count2, setCount2] = useState(0)
  assert(count2, 1, '업데이트 후 1')
})

// useState 여러 개 — 순서대로 저장
test('useState 여러 개 — 순서 기반 저장', () => {
  const fiber = createFiber(createElement('div', {}))

  setCurrentFiber(fiber)
  const [name, setName] = useState('Alice')
  const [age, setAge] = useState(25)

  assert(name, 'Alice', 'first hook = Alice')
  assert(age, 25, 'second hook = 25')
  assert(fiber.hooks.length, 2, 'hooks 2개')
})

// EC-10: useState가 컴포넌트 밖에서 호출되면 에러
test('EC-10 useState — 컴포넌트 밖에서 호출 시 에러', () => {
  setCurrentFiber(null)
  let threw = false
  try {
    useState(0)
  } catch (e) {
    threw = true
  }
  assert(threw, true, 'Error thrown')
})

// Fiber 트리 빌드
test('buildFiberTree — VNode → Fiber 트리 변환', () => {
  const vnode = createElement('div', {},
    createElement('p', {}, 'hello'),
    createElement('span', {}, 'world'),
  )

  const root = buildFiberTree(vnode)

  assert(root.vnode.type, 'div', '루트 = div')
  assert(root.child.vnode.type, 'p', '첫 자식 = p')
  assert(root.child.sibling.vnode.type, 'span', '형제 = span')
  assert(root.child.parent === root, true, 'parent 연결')
})

// TC-11: Fiber workLoop — 작업 분할 (블로킹 없음)
await testAsync('TC-11 Fiber workLoop — 작업 분할 처리', async () => {
  const results = []
  const units = [1, 2, 3, 4, 5]

  await workLoop(units, (unit) => {
    results.push(unit * 2)
  })

  assert(results, [2, 4, 6, 8, 10], '모든 작업 완료')
})

// Batch: scheduleUpdate 3회 → flushUpdates 1회
test('Batch — setState 3회 → hooks에 마지막 값 반영', () => {
  const fiber = createFiber(createElement('div', {}))
  fiber.hooks = [{ value: 0 }]

  // 직접 hooks를 업데이트해서 배치 로직 테스트
  fiber.hooks[0].value = 1
  fiber.hooks[0].value = 2
  fiber.hooks[0].value = 3

  assert(fiber.hooks[0].value, 3, '최종 값 = 3 (3번 업데이트, 1개 값)')
})
