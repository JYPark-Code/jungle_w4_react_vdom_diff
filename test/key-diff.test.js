import { createElement } from '../mini-react/src/vdom.js'
import { keyDiff, KEY_PATCH_TYPES } from '../mini-react/src/key-diff.js'
import { resolveComponents } from '../mini-react/src/component.js'

function test(desc, fn) {
  try { fn(); console.log(`✅ ${desc}`) }
  catch(e) { console.error(`❌ ${desc}\n   → ${e.message}`) }
}
function assert(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${msg}\n기대: ${JSON.stringify(expected)}\n실제: ${JSON.stringify(actual)}`)
}

// TC-09: key 최적화 — 순서 변경 시 MOVE 패치 생성 (DOM 재생성 없음)
test('TC-09 key 최적화 — 순서 변경 → MOVE 패치 (재생성 아님)', () => {
  const oldChildren = [
    createElement('li', { key: 'a' }, 'A'),
    createElement('li', { key: 'b' }, 'B'),
    createElement('li', { key: 'c' }, 'C'),
  ]
  const newChildren = [
    createElement('li', { key: 'c' }, 'C'),
    createElement('li', { key: 'a' }, 'A'),
    createElement('li', { key: 'b' }, 'B'),
  ]

  const patches = keyDiff(oldChildren, newChildren)

  // MOVE 패치가 있어야 해요 (REMOVE+CREATE가 아님)
  const moves = patches.filter(p => p.type === KEY_PATCH_TYPES.MOVE)
  assert(moves.length > 0, true, 'MOVE 패치 존재')

  // REMOVE나 CREATE가 없어야 해요 (순서만 바뀌었으니까)
  const removes = patches.filter(p => p.type === KEY_PATCH_TYPES.REMOVE)
  const creates = patches.filter(p => p.type === KEY_PATCH_TYPES.CREATE)
  assert(removes.length, 0, 'REMOVE 없음')
  assert(creates.length, 0, 'CREATE 없음')
})

// key로 새 아이템 추가
test('key-diff — 새 아이템 추가', () => {
  const oldChildren = [
    createElement('li', { key: 'a' }, 'A'),
  ]
  const newChildren = [
    createElement('li', { key: 'a' }, 'A'),
    createElement('li', { key: 'b' }, 'B'),
  ]

  const patches = keyDiff(oldChildren, newChildren)
  const creates = patches.filter(p => p.type === KEY_PATCH_TYPES.CREATE)
  assert(creates.length, 1, '1개 CREATE')
  assert(creates[0].key, 'b', 'key = b')
})

// key로 아이템 삭제
test('key-diff — 아이템 삭제', () => {
  const oldChildren = [
    createElement('li', { key: 'a' }, 'A'),
    createElement('li', { key: 'b' }, 'B'),
  ]
  const newChildren = [
    createElement('li', { key: 'a' }, 'A'),
  ]

  const patches = keyDiff(oldChildren, newChildren)
  const removes = patches.filter(p => p.type === KEY_PATCH_TYPES.REMOVE)
  assert(removes.length, 1, '1개 REMOVE')
  assert(removes[0].key, 'b', 'key = b')
})

// key 없으면 인덱스 기반 diff
test('key-diff — key 없으면 인덱스 기반 동작', () => {
  const oldChildren = [
    createElement('li', {}, 'A'),
    createElement('li', {}, 'B'),
  ]
  const newChildren = [
    createElement('li', {}, 'A'),
    createElement('li', {}, 'B'),
    createElement('li', {}, 'C'),
  ]

  const patches = keyDiff(oldChildren, newChildren)
  const creates = patches.filter(p => p.type === KEY_PATCH_TYPES.CREATE)
  assert(creates.length, 1, '1개 CREATE')
})

// --- component 테스트 ---

test('함수 컴포넌트 해석 (resolveComponents)', () => {
  function Greeting(props) {
    return createElement('p', {}, `Hello ${props.name}`)
  }

  const vnode = {
    type: Greeting,
    props: { name: 'World' },
    children: [],
    text: null,
  }

  const resolved = resolveComponents(vnode)
  assert(resolved.type, 'p', 'type = p')
  assert(resolved.children[0].text, 'Hello World', 'text 해석됨')
})

test('중첩 함수 컴포넌트 해석', () => {
  function Inner(props) {
    return createElement('span', {}, props.text)
  }
  function Outer(props) {
    return createElement('div', {},
      { type: Inner, props: { text: 'nested' }, children: [], text: null }
    )
  }

  const vnode = { type: Outer, props: {}, children: [], text: null }
  const resolved = resolveComponents(vnode)

  assert(resolved.type, 'div', '외부 = div')
  assert(resolved.children[0].type, 'span', '내부 = span')
  assert(resolved.children[0].children[0].text, 'nested', '텍스트')
})
