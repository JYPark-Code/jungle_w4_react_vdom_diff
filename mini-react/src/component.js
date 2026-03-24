// [왜] Component
// 화면을 작은 조각(컴포넌트)으로 나눠요
// 각 조각은 자기만의 데이터(props)를 받아서 VNode를 만들어요
// 이렇게 하면 레고 블록처럼 조립할 수 있어요
//
// 함수 컴포넌트: props를 받아서 VNode를 리턴하는 함수
// 예: function Button(props) { return createElement('button', {}, props.text) }

import { createElement } from './vdom.js'

/**
 * 함수 컴포넌트를 VNode로 변환해요
 * type이 함수인 VNode를 만나면 이 함수로 실제 VNode를 얻어요
 *
 * @param {Function} component - 함수 컴포넌트
 * @param {object} props - 컴포넌트에 전달할 속성
 * @param {Array} children - 자식 요소들
 * @returns {object} VNode
 */
export function renderComponent(component, props = {}, children = []) {
  // 함수 컴포넌트 실행 — props와 children을 넘겨서 VNode를 받아요
  const vnode = component({ ...props, children })
  return vnode
}

/**
 * VNode 트리에서 함수 컴포넌트를 모두 해석해요
 * 함수 타입의 VNode를 만나면 실행해서 실제 VNode로 바꿔요
 * 재귀적으로 처리해서 중첩된 컴포넌트도 모두 해석해요
 *
 * @param {object} vnode - VNode (type이 함수일 수 있음)
 * @returns {object} 함수 컴포넌트가 모두 해석된 VNode
 */
export function resolveComponents(vnode) {
  if (vnode == null) return null

  // 텍스트 노드는 그대로
  if (vnode.type === '#text') return vnode

  // 함수 컴포넌트인 경우 — type이 함수면 실행해서 VNode를 얻어요
  if (typeof vnode.type === 'function') {
    const resolved = renderComponent(vnode.type, vnode.props, vnode.children)
    // 결과도 함수 컴포넌트일 수 있으니 재귀 처리
    return resolveComponents(resolved)
  }

  // 일반 요소 노드 — 자식들을 재귀적으로 해석
  return {
    ...vnode,
    children: vnode.children.map(child => resolveComponents(child)),
  }
}
