// [왜] Virtual DOM
// 브라우저는 DOM이 바뀌면 화면을 처음부터 다시 계산해요 (Reflow)
// 그리고 다시 그려요 (Repaint)
// Virtual DOM은 진짜로 바뀐 부분만 찾아서 한 번만 건드려요
//
// VNode는 진짜 DOM을 흉내낸 가벼운 자바스크립트 객체예요
// 진짜 DOM을 만들기 전에 이 객체끼리 비교해서 뭐가 달라졌는지 찾아요

/**
 * VNode를 만들어요
 * @param {string} type - 태그 이름 (예: 'div', 'span') 또는 '#text'
 * @param {object} props - 속성들 (예: { class: 'red', id: 'app' })
 * @param {Array} children - 자식 VNode 배열
 * @returns {object} VNode
 */
export function createElement(type, props = {}, ...children) {
  return {
    type,
    props: props || {},
    children: children
      .flat()
      .map(child =>
        typeof child === 'string' || typeof child === 'number'
          ? createTextNode(String(child))
          : child
      )
      .filter(child => child != null),
    text: null,
  }
}

/**
 * 텍스트 전용 VNode를 만들어요
 * 글자만 있는 노드는 태그가 필요 없어서 특별히 '#text' 타입을 써요
 */
export function createTextNode(value) {
  return {
    type: '#text',
    props: {},
    children: [],  // EC-01: children은 항상 빈 배열로 초기화
    text: String(value),
  }
}

/**
 * 진짜 DOM 요소를 VNode로 변환해요
 * 화면에 이미 있는 HTML을 Virtual DOM 세계로 가져오는 거예요
 */
export function domToVNode(domNode) {
  // 텍스트 노드인 경우
  if (domNode.nodeType === Node.TEXT_NODE) {
    const text = domNode.textContent
    // 빈 공백만 있는 텍스트 노드는 무시해요
    if (text.trim() === '') return null
    return createTextNode(text)
  }

  // 요소 노드가 아니면 무시해요
  if (domNode.nodeType !== Node.ELEMENT_NODE) return null

  const type = domNode.tagName.toLowerCase()

  // 속성 가져오기
  const props = {}
  for (const attr of domNode.attributes) {
    props[attr.name] = attr.value
  }

  // 자식 노드를 재귀적으로 변환해요
  const children = []
  for (const childNode of domNode.childNodes) {
    const vChild = domToVNode(childNode)
    if (vChild != null) {
      children.push(vChild)
    }
  }

  return {
    type,
    props,
    children,  // EC-01: 항상 배열
    text: null,
  }
}

/**
 * VNode를 진짜 DOM으로 만들어요
 * Virtual DOM 세계에서 설계한 것을 실제 화면에 올리는 거예요
 */
export function renderDOM(vnode) {
  if (vnode == null) return null

  // 텍스트 노드
  if (vnode.type === '#text') {
    return document.createTextNode(vnode.text)
  }

  // 요소 노드
  const el = document.createElement(vnode.type)

  // 속성 설정
  for (const [key, value] of Object.entries(vnode.props)) {
    el.setAttribute(key, value)
  }

  // 자식들을 재귀적으로 만들어서 붙여요
  for (const child of vnode.children) {
    const childDOM = renderDOM(child)
    if (childDOM) {
      el.appendChild(childDOM)
    }
  }

  return el
}
