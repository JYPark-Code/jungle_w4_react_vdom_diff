// Node.js에서 DOM API를 쓸 수 없으니까
// 간단한 가짜 DOM을 만들어서 테스트해요
// (브라우저 없이도 VDom 로직을 검증할 수 있어요)

// --- 미니 DOM 구현 (테스트 전용) ---
class MiniNode {
  constructor(type) {
    this.nodeType = type === '#text' ? 3 : 1
    this._tagName = type === '#text' ? null : type.toUpperCase()
    this._attributes = {}
    this._children = []
    this._textContent = ''
    this.parentNode = null
    this.style = {}  // CSS 스타일 (highlight 테스트용)
  }

  get tagName() { return this._tagName }
  get childNodes() { return this._children }
  get children() { return this._children.filter(c => c.nodeType === 1) }
  get firstChild() { return this._children[0] || null }
  get innerHTML() { return this._serializeInner() }
  set innerHTML(val) {
    this._children = []
    // 간단한 파싱 (테스트용)
    if (val) {
      const text = new MiniNode('#text')
      text.nodeType = 3
      // innerHTML 파싱은 복잡하니까 원시 문자열만 지원
      this._parseHTML(val)
    }
  }

  get textContent() {
    if (this.nodeType === 3) return this._textContent
    return this._children.map(c => c.textContent).join('')
  }
  set textContent(val) {
    if (this.nodeType === 3) {
      this._textContent = val
    } else {
      this._children = []
      if (val) {
        const text = new MiniNode('#text')
        text.nodeType = 3
        text._textContent = val
        text.parentNode = this
        this._children.push(text)
      }
    }
  }

  get attributes() {
    return Object.entries(this._attributes).map(([name, value]) => ({ name, value }))
  }

  getAttribute(name) { return this._attributes[name] ?? null }
  setAttribute(name, value) { this._attributes[name] = String(value) }
  removeAttribute(name) { delete this._attributes[name] }

  appendChild(child) {
    child.parentNode = this
    this._children.push(child)
    return child
  }
  insertBefore(newChild, refChild) {
    const idx = this._children.indexOf(refChild)
    if (idx === -1) {
      this.appendChild(newChild)
    } else {
      newChild.parentNode = this
      this._children.splice(idx, 0, newChild)
    }
    return newChild
  }
  removeChild(child) {
    const idx = this._children.indexOf(child)
    if (idx !== -1) {
      this._children.splice(idx, 1)
      child.parentNode = null
    }
    return child
  }
  replaceChild(newChild, oldChild) {
    const idx = this._children.indexOf(oldChild)
    if (idx !== -1) {
      newChild.parentNode = this
      oldChild.parentNode = null
      this._children[idx] = newChild
    }
    return oldChild
  }

  querySelector(selector) {
    // 간단한 태그 셀렉터만 지원
    const tag = selector.toUpperCase()
    for (const child of this._children) {
      if (child.nodeType === 1 && child.tagName === tag) return child
      if (child.nodeType === 1) {
        const found = child.querySelector(selector)
        if (found) return found
      }
    }
    return null
  }

  _serializeInner() {
    return this._children.map(c => c._serialize()).join('')
  }
  _serialize() {
    if (this.nodeType === 3) return this._textContent
    const tag = this._tagName.toLowerCase()
    const attrs = Object.entries(this._attributes).map(([k,v]) => ` ${k}="${v}"`).join('')
    return `<${tag}${attrs}>${this._serializeInner()}</${tag}>`
  }

  _parseHTML(html) {
    // 매우 간단한 HTML 파싱 — <tag>text</tag> 패턴만
    const tagRegex = /^<(\w+)([^>]*)>(.*?)<\/\1>$/s
    const match = html.match(tagRegex)
    if (match) {
      const child = createMiniElement(match[1])
      // 속성 파싱
      const attrRegex = /(\w+)="([^"]*)"/g
      let attrMatch
      while ((attrMatch = attrRegex.exec(match[2]))) {
        child.setAttribute(attrMatch[1], attrMatch[2])
      }
      if (match[3]) {
        const text = createMiniTextNode(match[3])
        child.appendChild(text)
      }
      this.appendChild(child)
    } else {
      // 평문 텍스트
      const text = createMiniTextNode(html)
      this.appendChild(text)
    }
  }
}

function createMiniElement(tag) {
  return new MiniNode(tag)
}

function createMiniTextNode(text) {
  const node = new MiniNode('#text')
  node.nodeType = 3
  node._textContent = text
  return node
}

// --- 글로벌 DOM API 설정 ---
globalThis.Node = { TEXT_NODE: 3, ELEMENT_NODE: 1 }
globalThis.document = {
  createElement: (tag) => createMiniElement(tag),
  createTextNode: (text) => createMiniTextNode(text),
}

// --- 테스트 실행 ---
async function runAll() {
  console.log('=== 테스트 시작 ===\n')

  console.log('--- vdom.test.js ---')
  await import('./vdom.test.js')

  console.log('\n--- diff.test.js ---')
  await import('./diff.test.js')

  console.log('\n--- patch.test.js ---')
  await import('./patch.test.js')

  console.log('\n--- history.test.js ---')
  await import('./history.test.js')

  console.log('\n--- highlight.test.js ---')
  await import('./highlight.test.js')

  console.log('\n=== 테스트 완료 ===')
}

runAll().catch(e => console.error('테스트 실행 오류:', e))
