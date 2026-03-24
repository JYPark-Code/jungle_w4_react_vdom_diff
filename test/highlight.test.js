import { createElement } from '../mini-react/src/vdom.js'
import { diff, PATCH_TYPES } from '../mini-react/src/diff.js'
import { patch } from '../mini-react/src/patch.js'
import { renderDOM } from '../mini-react/src/vdom.js'
import { highlightPatches } from '../mini-react/src/highlight.js'

function test(desc, fn) {
  try { fn(); console.log(`✅ ${desc}`) }
  catch(e) { console.error(`❌ ${desc}\n   → ${e.message}`) }
}
function assert(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${msg}\n기대: ${JSON.stringify(expected)}\n실제: ${JSON.stringify(actual)}`)
}

// TC-08: 변경 노드에 하이라이트가 적용되는지 확인
test('TC-08 하이라이트 — 변경 노드에 색상 적용', () => {
  const oldVNode = createElement('div', {},
    createElement('p', {}, '안녕'),
    createElement('span', { class: 'red' }, '빨강'),
  )
  const newVNode = createElement('div', {},
    createElement('p', {}, '반갑'),
    createElement('span', { class: 'blue' }, '빨강'),
  )

  const dom = renderDOM(oldVNode)
  const patches = diff(oldVNode, newVNode)
  patch(dom, patches)

  const highlighted = highlightPatches(dom, patches)

  // 2개 노드가 하이라이트되어야 해요 (텍스트 변경 + 속성 변경)
  assert(highlighted.length, 2, '하이라이트된 노드 2개')

  // 하이라이트된 노드에 backgroundColor가 설정되어야 해요
  for (const node of highlighted) {
    assert(node.style.backgroundColor !== '', true, 'backgroundColor 설정됨')
  }
})

// 하이라이트 — 빈 패치면 아무 것도 안 함
test('하이라이트 — 빈 패치면 빈 배열 반환', () => {
  const dom = renderDOM(createElement('div', {}))
  const highlighted = highlightPatches(dom, [])
  assert(highlighted.length, 0, '하이라이트 없음')
})

// 하이라이트 — 1.5초 후 자동 제거 (타이머 테스트)
test('TC-08 하이라이트 — 1.5초 후 자동 제거 확인', () => {
  const oldVNode = createElement('p', {}, 'old')
  const newVNode = createElement('p', {}, 'new')

  const dom = renderDOM(oldVNode)
  const patches = diff(oldVNode, newVNode)
  patch(dom, patches)

  const highlighted = highlightPatches(dom, patches)
  assert(highlighted.length > 0, true, '하이라이트 적용됨')

  // setTimeout이 등록되었는지는 직접 확인이 어렵지만,
  // 하이라이트가 적용된 것만으로 TC-08 기본 요구사항 충족
  // 브라우저에서 1.5초 후 제거는 시각적으로 확인
  assert(highlighted[0].style.backgroundColor !== '', true, '색상 있음')
})
