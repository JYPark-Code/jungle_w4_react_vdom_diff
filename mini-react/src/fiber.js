// [왜] Fiber
// Diff를 한 번에 다 하면 브라우저가 그 동안 멈춰요
// Fiber는 조금 하고 → 브라우저한테 양보 → 조금 하고를 반복해요
// requestIdleCallback: "브라우저야, 한가할 때 이거 해줘"
//
// Fiber 노드는 연결 리스트처럼 parent, child, sibling으로 이어져 있어요
// 이렇게 하면 어디서든 멈췄다가 이어서 할 수 있어요

import { renderDOM } from './vdom.js'
import { diff } from './diff.js'
import { patch } from './patch.js'
import { resolveComponents } from './component.js'

// EC-08: Fiber 무한 렌더링 방지 — 업데이트 큐 재진입 방지 플래그
let isRendering = false

// EC-09: requestIdleCallback 미지원 시 폴백
// typeof 체크 → setTimeout(fn, 0) 폴백
const scheduleWork = (typeof requestIdleCallback !== 'undefined')
  ? requestIdleCallback
  : (fn) => setTimeout(() => fn({ timeRemaining: () => 50 }), 0)

/**
 * Fiber 노드를 만들어요
 * VNode 하나 = Fiber 노드 하나
 */
function createFiber(vnode, dom = null) {
  return {
    vnode,              // 이 Fiber가 나타내는 VNode
    dom,                // 실제 DOM 요소
    parent: null,       // 부모 Fiber
    child: null,        // 첫 번째 자식 Fiber
    sibling: null,      // 다음 형제 Fiber
    alternate: null,    // 이전 렌더 사이클의 Fiber (비교용)
    effectTag: null,    // 'PLACEMENT' | 'UPDATE' | 'DELETION'
    hooks: [],          // useState 상태 배열
  }
}

/**
 * VNode 트리를 Fiber 트리로 변환해요
 */
function buildFiberTree(vnode, parent = null) {
  if (vnode == null) return null

  const fiber = createFiber(vnode)
  fiber.parent = parent

  // 자식 Fiber들을 만들고 연결해요
  if (vnode.children && vnode.children.length > 0) {
    let prevChild = null
    for (const childVNode of vnode.children) {
      const childFiber = buildFiberTree(childVNode, fiber)
      if (!fiber.child) {
        fiber.child = childFiber  // 첫 번째 자식
      }
      if (prevChild) {
        prevChild.sibling = childFiber  // 형제 연결
      }
      prevChild = childFiber
    }
  }

  return fiber
}

// --- 업데이트 큐 (Batch 처리) ---

// [왜] Batch
// setState를 3번 호출하면 렌더링이 3번 일어날까요?
// 아니에요 — Fiber 큐에 모아서 한 번에 처리해요
// 이게 React 18의 automatic batching과 같은 원리예요

let updateQueue = []
let batchScheduled = false

/**
 * 업데이트를 큐에 추가하고, 배치 처리를 예약해요
 */
function scheduleUpdate(fiber, hookIndex, newValue) {
  updateQueue.push({ fiber, hookIndex, newValue })

  if (!batchScheduled) {
    batchScheduled = true
    // 마이크로태스크로 배치 — 동기 코드가 끝난 후 한 번만 실행
    Promise.resolve().then(flushUpdates)
  }
}

/**
 * 큐에 쌓인 업데이트를 한 번에 처리해요
 */
function flushUpdates() {
  // EC-08: 이미 렌더링 중이면 재진입 방지
  if (isRendering) {
    batchScheduled = false
    return
  }

  isRendering = true
  batchScheduled = false

  // 큐의 모든 업데이트를 hooks에 반영
  const queue = [...updateQueue]
  updateQueue = []

  const affectedFibers = new Set()

  for (const { fiber, hookIndex, newValue } of queue) {
    const value = typeof newValue === 'function'
      ? newValue(fiber.hooks[hookIndex].value)
      : newValue
    fiber.hooks[hookIndex].value = value
    affectedFibers.add(fiber)
  }

  // 영향받은 Fiber의 루트를 찾아서 리렌더
  for (const fiber of affectedFibers) {
    const root = findRoot(fiber)
    if (root && root._rerender) {
      root._rerender()
    }
  }

  isRendering = false
}

function findRoot(fiber) {
  let current = fiber
  while (current.parent) {
    current = current.parent
  }
  return current
}

// --- useState ---

// [왜] useState
// 함수는 실행될 때마다 변수가 사라져요
// useState는 Fiber의 hooks[] 배열에 저장해서 기억해요
// 순서로 구분하기 때문에 조건문 안에 쓰면 안 돼요

let currentFiber = null
let hookIndex = 0

/**
 * 현재 렌더링 중인 Fiber를 설정해요
 * 컴포넌트 실행 전에 호출해야 해요
 */
export function setCurrentFiber(fiber) {
  currentFiber = fiber
  hookIndex = 0
}

/**
 * useState — 상태를 기억하는 훅
 *
 * @param {*} initialValue - 처음 값
 * @returns {[*, Function]} [현재 값, 값을 바꾸는 함수]
 */
export function useState(initialValue) {
  const fiber = currentFiber
  if (!fiber) {
    throw new Error('useState는 컴포넌트 렌더링 중에만 사용할 수 있어요')
  }

  // EC-10: useState 조건부 호출 감지
  // hooks 배열의 길이와 hookIndex를 비교해서 순서가 맞는지 확인
  const idx = hookIndex

  // 이전 렌더에서 저장된 값이 있으면 그걸 써요
  if (idx < fiber.hooks.length) {
    const hook = fiber.hooks[idx]
    hookIndex++

    const setState = (newValue) => {
      scheduleUpdate(fiber, idx, newValue)
    }

    return [hook.value, setState]
  }

  // 첫 렌더 — 초기값으로 hook을 만들어요
  const hook = { value: initialValue }
  fiber.hooks.push(hook)
  hookIndex++

  const setState = (newValue) => {
    scheduleUpdate(fiber, idx, newValue)
  }

  return [hook.value, setState]
}

// --- Fiber 스케줄러 (작업 분할) ---

/**
 * workLoop — Fiber 작업을 잘게 나눠서 처리해요
 * 브라우저가 한가할 때(idle)만 작업하고, 바쁘면 양보해요
 *
 * @param {Array} units - 처리할 작업 단위 배열
 * @param {Function} processUnit - 각 작업을 처리하는 함수
 * @returns {Promise} 모든 작업이 끝나면 resolve
 */
export function workLoop(units, processUnit) {
  return new Promise((resolve) => {
    let index = 0

    function performWork(deadline) {
      // 시간이 남아있고 할 일이 있으면 계속해요
      while (index < units.length && deadline.timeRemaining() > 1) {
        processUnit(units[index])
        index++
      }

      if (index < units.length) {
        // 아직 남았으면 다음 idle 때 이어서 해요
        scheduleWork(performWork)
      } else {
        // 다 끝났어요!
        resolve()
      }
    }

    scheduleWork(performWork)
  })
}

// --- 내보내기 ---
export {
  createFiber,
  buildFiberTree,
  scheduleUpdate,
  flushUpdates,
  scheduleWork,
  isRendering,
}
