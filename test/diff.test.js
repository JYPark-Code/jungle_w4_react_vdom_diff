import { createElement, createTextNode } from '../mini-react/src/vdom.js'
import { diff, PATCH_TYPES } from '../mini-react/src/diff.js'

function test(desc, fn) {
  try { fn(); console.log(`✅ ${desc}`) }
  catch(e) { console.error(`❌ ${desc}\n   → ${e.message}`) }
}
function assert(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${msg}\n기대: ${JSON.stringify(expected)}\n실제: ${JSON.stringify(actual)}`)
}

// TC-01: 텍스트 변경
test('TC-01 텍스트 변경 — <p>안녕</p> → <p>반갑</p>', () => {
  const oldNode = createElement('p', {}, '안녕')
  const newNode = createElement('p', {}, '반갑')
  const patches = diff(oldNode, newNode)
  const textPatch = patches.find(p => p.type === PATCH_TYPES.TEXT)
  assert(textPatch != null, true, 'TEXT 패치 존재')
  assert(textPatch.oldText, '안녕', 'oldText')
  assert(textPatch.newText, '반갑', 'newText')
  assert(JSON.stringify(textPatch.path), JSON.stringify([0]), 'path = [0] (첫 번째 자식)')
})

// TC-02: 속성 변경
test('TC-02 속성 변경 — class="red" → class="blue"', () => {
  const oldNode = createElement('div', { class: 'red' })
  const newNode = createElement('div', { class: 'blue' })
  const patches = diff(oldNode, newNode)
  const propPatch = patches.find(p => p.type === PATCH_TYPES.PROPS)
  assert(propPatch != null, true, 'PROPS 패치 존재')
  assert(propPatch.propPatches[0].key, 'class', 'changed key')
  assert(propPatch.propPatches[0].value, 'blue', 'new value')
})

// TC-03: 노드 추가
test('TC-03 노드 추가 — li 1개 → li 2개', () => {
  const oldNode = createElement('ul', {}, createElement('li', {}, 'A'))
  const newNode = createElement('ul', {},
    createElement('li', {}, 'A'),
    createElement('li', {}, 'B'),
  )
  const patches = diff(oldNode, newNode)
  const createPatch = patches.find(p => p.type === PATCH_TYPES.CREATE)
  assert(createPatch != null, true, 'CREATE 패치 존재')
  assert(JSON.stringify(createPatch.path), JSON.stringify([1]), 'path = [1]')
})

// TC-04: 노드 삭제
test('TC-04 노드 삭제 — li 2개 → li 1개', () => {
  const oldNode = createElement('ul', {},
    createElement('li', {}, 'A'),
    createElement('li', {}, 'B'),
  )
  const newNode = createElement('ul', {}, createElement('li', {}, 'A'))
  const patches = diff(oldNode, newNode)
  const removePatch = patches.find(p => p.type === PATCH_TYPES.REMOVE)
  assert(removePatch != null, true, 'REMOVE 패치 존재')
})

// TC-05: 타입 교체
test('TC-05 타입 교체 — <p> → <span>', () => {
  const oldNode = createElement('p', {}, 'hello')
  const newNode = createElement('span', {}, 'hello')
  const patches = diff(oldNode, newNode)
  assert(patches[0].type, PATCH_TYPES.REPLACE, 'REPLACE 패치')
  assert(JSON.stringify(patches[0].path), JSON.stringify([]), 'path = [] (루트)')
})

// TC-07: 중첩 구조 변경
test('TC-07 중첩 구조 변경 — span→strong + 텍스트 변경', () => {
  const oldNode = createElement('div', {},
    createElement('span', {}, '원래')
  )
  const newNode = createElement('div', {},
    createElement('strong', {}, '바뀜')
  )
  const patches = diff(oldNode, newNode)
  const replacePatch = patches.find(p => p.type === PATCH_TYPES.REPLACE)
  assert(replacePatch != null, true, 'REPLACE 패치 존재')
  assert(JSON.stringify(replacePatch.path), JSON.stringify([0]), 'path = [0]')
})

// EC-02: 변경 없는 경우
test('EC-02 변경 없으면 빈 패치', () => {
  const node = createElement('div', { class: 'same' }, 'text')
  const patches = diff(node, node)
  assert(patches.length, 0, '패치 0개')
})

// EC-03: 속성 완전 제거
test('EC-03 속성 완전 제거', () => {
  const oldNode = createElement('div', { class: 'red', id: 'box' })
  const newNode = createElement('div', {})
  const patches = diff(oldNode, newNode)
  const propPatch = patches.find(p => p.type === PATCH_TYPES.PROPS)
  const removes = propPatch.propPatches.filter(pp => pp.action === 'REMOVE')
  assert(removes.length, 2, '2개 속성 제거')
})
