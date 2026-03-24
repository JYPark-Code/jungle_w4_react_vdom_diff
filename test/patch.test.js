import { createElement } from '../mini-react/src/vdom.js'
import { diff } from '../mini-react/src/diff.js'
import { patch } from '../mini-react/src/patch.js'
import { renderDOM } from '../mini-react/src/vdom.js'

function test(desc, fn) {
  try { fn(); console.log(`✅ ${desc}`) }
  catch(e) { console.error(`❌ ${desc}\n   → ${e.message}`) }
}
function assert(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${msg}\n기대: ${JSON.stringify(expected)}\n실제: ${JSON.stringify(actual)}`)
}

// TC-01 + patch: 텍스트 변경을 DOM에 적용
test('patch - 텍스트 변경 DOM 적용', () => {
  const oldVNode = createElement('p', {}, '안녕')
  const newVNode = createElement('p', {}, '반갑')

  const dom = renderDOM(oldVNode)  // <p>안녕</p>
  const patches = diff(oldVNode, newVNode)
  // diff 결과의 path=[0]은 p의 0번째 자식(텍스트노드)를 의미
  // patch에 루트DOM인 p를 넘기면, p.childNodes[0]의 텍스트를 바꿔요
  patch(dom, patches)

  assert(dom.textContent, '반갑', 'DOM 텍스트 변경')
})

// TC-02 + patch: 속성 변경을 DOM에 적용
test('patch - 속성 변경 DOM 적용', () => {
  const oldVNode = createElement('div', { class: 'red' })
  const newVNode = createElement('div', { class: 'blue' })

  const dom = renderDOM(oldVNode)
  const patches = diff(oldVNode, newVNode)
  // path=[]은 루트(div) 자체의 속성 변경
  patch(dom, patches)

  assert(dom.getAttribute('class'), 'blue', 'class 변경됨')
})

// TC-03 + patch: 노드 추가를 DOM에 적용
test('patch - 노드 추가 DOM 적용', () => {
  const oldVNode = createElement('ul', {}, createElement('li', {}, 'A'))
  const newVNode = createElement('ul', {},
    createElement('li', {}, 'A'),
    createElement('li', {}, 'B'),
  )

  const dom = renderDOM(oldVNode)  // <ul><li>A</li></ul>
  const patches = diff(oldVNode, newVNode)
  // path=[1]은 ul의 1번째 자식 → CREATE
  patch(dom, patches)

  assert(dom.children.length, 2, 'li 2개')
  assert(dom.children[1].textContent, 'B', '두 번째 li')
})

// TC-04 + patch: 노드 삭제를 DOM에 적용
test('patch - 노드 삭제 DOM 적용', () => {
  const oldVNode = createElement('ul', {},
    createElement('li', {}, 'A'),
    createElement('li', {}, 'B'),
  )
  const newVNode = createElement('ul', {}, createElement('li', {}, 'A'))

  const dom = renderDOM(oldVNode)
  const patches = diff(oldVNode, newVNode)
  patch(dom, patches)

  assert(dom.children.length, 1, 'li 1개')
  assert(dom.children[0].textContent, 'A', '남은 li')
})

// TC-05 + patch: 타입 교체를 DOM에 적용
test('patch - 타입 교체 DOM 적용', () => {
  const oldVNode = createElement('p', {}, 'hello')
  const newVNode = createElement('span', {}, 'hello')

  const container = document.createElement('div')
  const dom = renderDOM(oldVNode)
  container.appendChild(dom)

  const patches = diff(oldVNode, newVNode)
  // path=[]는 루트 자체 교체 → 부모(container)가 필요해요
  patch(dom, patches)

  // replaceChild가 container에서 실행됨
  assert(container.firstChild.tagName, 'SPAN', 'p → span')
})

// EC-02: 빈 패치 → DOM 변경 없음
test('EC-02 patch - 빈 패치 배열이면 DOM 안 건드림', () => {
  const container = document.createElement('div')
  container.innerHTML = '<p>original</p>'
  patch(container, [])
  assert(container.innerHTML, '<p>original</p>', 'DOM 변경 없음')
})

// TC-07 + patch: 중첩 구조 변경
test('patch - 중첩 구조 변경 DOM 적용', () => {
  const oldVNode = createElement('div', {},
    createElement('span', {}, '원래')
  )
  const newVNode = createElement('div', {},
    createElement('strong', {}, '바뀜')
  )

  const dom = renderDOM(oldVNode)
  const patches = diff(oldVNode, newVNode)
  patch(dom, patches)

  assert(dom.children[0].tagName, 'STRONG', 'span → strong')
  assert(dom.children[0].textContent, '바뀜', '텍스트도 변경')
})
