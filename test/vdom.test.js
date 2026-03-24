import { createElement, createTextNode, domToVNode, renderDOM } from '../mini-react/src/vdom.js'

function test(desc, fn) {
  try { fn(); console.log(`✅ ${desc}`) }
  catch(e) { console.error(`❌ ${desc}\n   → ${e.message}`) }
}
function assert(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${msg}\n기대: ${JSON.stringify(expected)}\n실제: ${JSON.stringify(actual)}`)
}

// --- createElement ---

test('createElement - 기본 VNode 생성', () => {
  const vnode = createElement('div', { class: 'app' }, 'hello')
  assert(vnode.type, 'div', 'type')
  assert(vnode.props.class, 'app', 'props.class')
  assert(vnode.children.length, 1, 'children.length')
  assert(vnode.children[0].type, '#text', 'child type')
  assert(vnode.children[0].text, 'hello', 'child text')
})

test('createElement - 중첩 자식', () => {
  const vnode = createElement('ul', {},
    createElement('li', {}, 'A'),
    createElement('li', {}, 'B'),
  )
  assert(vnode.children.length, 2, 'children count')
  assert(vnode.children[0].type, 'li', 'first child type')
})

test('EC-01 - children은 항상 배열', () => {
  const text = createTextNode('hi')
  assert(Array.isArray(text.children), true, 'text children is array')
  assert(text.children.length, 0, 'text children empty')
})

// --- renderDOM + domToVNode 왕복 ---

test('renderDOM → domToVNode 왕복 변환', () => {
  const vnode = createElement('p', { class: 'red' }, 'hello')
  const dom = renderDOM(vnode)
  const back = domToVNode(dom)
  assert(back.type, 'p', 'type preserved')
  assert(back.props.class, 'red', 'props preserved')
  assert(back.children[0].text, 'hello', 'text preserved')
})

test('renderDOM - null 입력 처리', () => {
  const dom = renderDOM(null)
  assert(dom, null, 'null returns null')
})
