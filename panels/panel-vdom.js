// panels/panel-vdom.js — 패널 2: VDom Inspector
// 상단: GitHub diff 스타일 변경 요약 (-/+ 라인)
// 하단: 트리 뷰 (접기/펼치기, 변경 노드 하이라이트)

import { onPanelMount } from '../shared/router.js'
import AppState from '../shared/app-state.js'
import { PATCH_TYPES } from '../mini-react/src/diff.js'

let initialized = false

export function initPanelVdom() {
  const panel = document.getElementById('panel-vdom')
  panel.innerHTML = `
    <div class="panel-header">
      <h2>🌳 VDom Inspector</h2>
      <p class="panel-desc">클릭 하나에 내부에서 무슨 일이 일어나는가 — 피드에서 인터랙션하면 자동 업데이트</p>
    </div>
    <div class="vdom-summary" id="vdom-summary">
      피드 패널에서 좋아요/댓글/스토리 등 인터랙션을 하면 여기에 변경 사항이 표시됩니다.
    </div>

    <!-- GitHub diff 스타일 변경 요약 -->
    <div class="diff-summary-block" id="diff-summary-block">
      <span class="tree-empty">아직 변경 사항 없음</span>
    </div>

    <!-- 트리 뷰 (접기 가능) -->
    <button class="tree-toggle" id="tree-toggle">▶ 전체 VNode 트리 보기</button>
    <div id="tree-section" style="display:none">
      <div class="two-col vdom-trees">
        <div>
          <h3 class="tree-title">📋 이전 VNode 트리 <span class="tree-tag tree-tag--old">- 이전</span></h3>
          <div class="tree-container" id="vdom-old">
            <span class="tree-empty">아직 데이터 없음</span>
          </div>
        </div>
        <div>
          <h3 class="tree-title">📋 현재 VNode 트리 <span class="tree-tag tree-tag--new">+ 현재</span></h3>
          <div class="tree-container" id="vdom-new">
            <span class="tree-empty">아직 데이터 없음</span>
          </div>
        </div>
      </div>
    </div>
  `

  // 트리 접기/펼치기
  document.getElementById('tree-toggle').addEventListener('click', () => {
    const section = document.getElementById('tree-section')
    const btn = document.getElementById('tree-toggle')
    if (section.style.display === 'none') {
      section.style.display = 'block'
      btn.textContent = '▼ 전체 VNode 트리 접기'
    } else {
      section.style.display = 'none'
      btn.textContent = '▶ 전체 VNode 트리 보기'
    }
  })

  onPanelMount('vdom', () => {
    if (!initialized) {
      AppState.subscribe(onStateChange)
      initialized = true
    }
    onStateChange(AppState)
  })
}

function onStateChange(state) {
  if (!state.currentVNode) return

  const summaryEl = document.getElementById('vdom-summary')
  const diffBlock = document.getElementById('diff-summary-block')
  const oldTreeEl = document.getElementById('vdom-old')
  const newTreeEl = document.getElementById('vdom-new')

  if (!summaryEl) return

  const patches = state.lastPatches || []
  const totalNodes = countNodes(state.currentVNode)

  // --- 상단 요약 ---
  const typeCounts = {}
  patches.forEach(p => { typeCounts[p.type] = (typeCounts[p.type] || 0) + 1 })
  const typeStr = Object.entries(typeCounts).map(([t, c]) => `${t}: ${c}개`).join('  ')

  summaryEl.innerHTML = patches.length > 0
    ? `총 <strong>${totalNodes}</strong>개 노드 중 <strong>${patches.length}</strong>개 변경  |  ${typeStr}`
    : `총 <strong>${totalNodes}</strong>개 노드 — 변경 없음`

  // --- GitHub diff 요약 블록 ---
  if (patches.length > 0) {
    diffBlock.innerHTML = ''

    // 헤더
    const header = document.createElement('div')
    header.className = 'diff-summary-header'
    const addCount = patches.filter(p => p.type === PATCH_TYPES.CREATE).length
    const delCount = patches.filter(p => p.type === PATCH_TYPES.REMOVE).length
    const modCount = patches.length - addCount - delCount
    header.innerHTML = `
      <span>${patches.length}개 변경</span>
      ${addCount > 0 ? `<span class="diff-summary-stat diff-summary-stat--add">+${addCount} 추가</span>` : ''}
      ${delCount > 0 ? `<span class="diff-summary-stat diff-summary-stat--del">-${delCount} 삭제</span>` : ''}
      ${modCount > 0 ? `<span class="diff-summary-stat" style="color:var(--accent)">${modCount} 수정</span>` : ''}
    `
    diffBlock.appendChild(header)

    // 각 패치를 diff 파일 블록으로
    patches.forEach(p => {
      const file = document.createElement('div')
      file.className = 'diff-file'

      // 파일 헤더 — 경로를 breadcrumb으로
      const pathLabel = buildPathBreadcrumb(state.previousVNode || state.currentVNode, p.path)
      const fileHeader = document.createElement('div')
      fileHeader.className = 'diff-file-header'
      fileHeader.textContent = pathLabel

      file.appendChild(fileHeader)

      // diff 라인
      const lines = buildDiffLines(p)
      lines.forEach(line => {
        const lineEl = document.createElement('div')
        lineEl.className = `diff-line diff-line--${line.type}`
        lineEl.innerHTML = `<span class="diff-line-prefix">${line.type === 'del' ? '-' : '+'}</span><span>${escapeHtml(line.text)}</span>`
        file.appendChild(lineEl)
      })

      diffBlock.appendChild(file)
    })
  } else {
    diffBlock.innerHTML = '<span class="tree-empty">변경 없음 — 피드에서 인터랙션해보세요</span>'
  }

  // --- 트리 뷰 ---
  const patchMap = new Map()
  patches.forEach(p => patchMap.set(p.path.join(','), p))

  const expandPaths = new Set()
  patches.forEach(p => {
    for (let i = 0; i <= p.path.length; i++) {
      expandPaths.add(p.path.slice(0, i).join(','))
    }
  })

  if (state.previousVNode) {
    oldTreeEl.innerHTML = ''
    oldTreeEl.appendChild(renderTree(state.previousVNode, [], patchMap, expandPaths, 'old'))
  } else {
    oldTreeEl.innerHTML = '<span class="tree-empty">초기 상태 (이전 없음)</span>'
  }

  newTreeEl.innerHTML = ''
  newTreeEl.appendChild(renderTree(state.currentVNode, [], patchMap, expandPaths, 'new'))

  // 변경 사항이 있으면 diff 요약 블록으로 자동 스크롤
  if (patches.length > 0) {
    setTimeout(() => {
      diffBlock.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }
}

// --- GitHub diff 라인 생성 ---

function buildDiffLines(patch) {
  const lines = []
  switch (patch.type) {
    case PATCH_TYPES.TEXT:
      lines.push({ type: 'del', text: `"${patch.oldText}"` })
      lines.push({ type: 'add', text: `"${patch.newText}"` })
      break
    case PATCH_TYPES.PROPS:
      patch.propPatches.forEach(pp => {
        if (pp.action === 'SET') {
          lines.push({ type: 'del', text: `${pp.key}="${pp.oldValue || '(없음)'}"` })
          lines.push({ type: 'add', text: `${pp.key}="${pp.value}"` })
        } else {
          lines.push({ type: 'del', text: `${pp.key} (제거됨)` })
        }
      })
      break
    case PATCH_TYPES.CREATE:
      lines.push({ type: 'add', text: `<${patch.newNode.type}> (새 노드 추가)` })
      break
    case PATCH_TYPES.REMOVE:
      lines.push({ type: 'del', text: `(노드 삭제)` })
      break
    case PATCH_TYPES.REPLACE:
      lines.push({ type: 'del', text: `(이전 노드)` })
      lines.push({ type: 'add', text: `<${patch.newNode.type}> (타입 교체)` })
      break
  }
  return lines
}

/**
 * path를 따라가서 breadcrumb 경로 문자열 생성
 * 예: root > div.story-bar > div.story-item
 */
function buildPathBreadcrumb(rootVNode, path) {
  const parts = []
  let current = rootVNode
  if (current) {
    parts.push(nodeTag(current))
    for (const idx of path) {
      if (current && current.children && current.children[idx]) {
        current = current.children[idx]
        parts.push(nodeTag(current))
      }
    }
  }
  return parts.join(' > ')
}

function nodeTag(vnode) {
  if (!vnode) return '?'
  if (vnode.type === '#text') return `"${truncate(vnode.text, 15)}"`
  let tag = vnode.type
  if (vnode.props && vnode.props.class) tag += `.${vnode.props.class.split(' ')[0]}`
  return tag
}

// --- 트리 뷰 렌더링 ---

function renderTree(vnode, path, patchMap, expandPaths, side) {
  if (!vnode) return document.createTextNode('')

  const wrapper = document.createElement('div')
  wrapper.className = 'tree-node'

  const pathKey = path.join(',')
  const patch = patchMap.get(pathKey)
  const isOnExpandPath = expandPaths.has(pathKey)
  const isChanged = !!patch

  const label = document.createElement('div')
  label.className = 'tree-label'

  if (isChanged) {
    if (side === 'old') {
      label.classList.add('tree-label--removed')
      label.innerHTML = buildChangedLabel(vnode, patch, 'old')
    } else {
      label.classList.add('tree-label--added')
      label.innerHTML = buildChangedLabel(vnode, patch, 'new')
    }
  } else {
    label.textContent = buildNodeLabel(vnode)
  }

  wrapper.appendChild(label)

  if (vnode.children && vnode.children.length > 0) {
    const childrenEl = document.createElement('div')
    childrenEl.className = 'tree-children'

    if (!isOnExpandPath && path.length > 0) {
      const collapsed = document.createElement('span')
      collapsed.className = 'tree-collapsed'
      collapsed.textContent = `  ... ${vnode.children.length}개 노드 (변경 없음)`
      childrenEl.appendChild(collapsed)
    } else {
      const maxShow = 30
      const children = vnode.children.slice(0, maxShow)
      children.forEach((child, i) => {
        childrenEl.appendChild(renderTree(child, [...path, i], patchMap, expandPaths, side))
      })
      if (vnode.children.length > maxShow) {
        const more = document.createElement('span')
        more.className = 'tree-collapsed'
        more.textContent = `  ... +${vnode.children.length - maxShow}개 더`
        childrenEl.appendChild(more)
      }
    }

    wrapper.appendChild(childrenEl)
  }

  return wrapper
}

function buildNodeLabel(vnode) {
  if (vnode.type === '#text') return `"${truncate(vnode.text, 30)}"`
  let tag = vnode.type
  if (vnode.props.class) tag += `.${vnode.props.class.split(' ')[0]}`
  if (vnode.props.id) tag += `#${vnode.props.id}`
  return tag
}

function buildChangedLabel(vnode, patch, side) {
  const prefix = side === 'old'
    ? '<span class="diff-prefix diff-prefix--old">-</span> '
    : '<span class="diff-prefix diff-prefix--new">+</span> '
  const nodeLabel = escapeHtml(buildNodeLabel(vnode))

  let detail = ''
  if (patch) {
    switch (patch.type) {
      case PATCH_TYPES.TEXT:
        detail = side === 'old'
          ? `  <span class="diff-value">"${escapeHtml(truncate(patch.oldText, 20))}"</span>`
          : `  <span class="diff-value">"${escapeHtml(truncate(patch.newText, 20))}"</span>`
        break
      case PATCH_TYPES.PROPS:
        detail = `  <span class="diff-value">${patch.propPatches.map(pp =>
          pp.action === 'SET' ? `${pp.key}="${escapeHtml(truncate(pp.value, 15))}"` : `${pp.key} 제거`
        ).join(', ')}</span>`
        break
      case PATCH_TYPES.CREATE:
        detail = '  <span class="diff-value">(새 노드)</span>'
        break
      case PATCH_TYPES.REMOVE:
        detail = '  <span class="diff-value">(삭제됨)</span>'
        break
      case PATCH_TYPES.REPLACE:
        detail = '  <span class="diff-value">(타입 교체)</span>'
        break
    }
  }

  return `${prefix}<span class="diff-node">${nodeLabel}</span>${detail}`
}

function countNodes(vnode) {
  if (!vnode) return 0
  let count = 1
  if (vnode.children) vnode.children.forEach(c => { count += countNodes(c) })
  return count
}

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
