// mini-react/src/main.js — Mini React 버전 피드
// VDom → Diff → Patch로 변경된 부분만 업데이트해요
// Vanilla와 달리 전체를 다시 그리지 않아요!

import { createElement, domToVNode, renderDOM } from './vdom.js'
import { diff } from './diff.js'
import { patch } from './patch.js'
import { highlightPatches } from './highlight.js'
import { INITIAL_POSTS, INITIAL_STORIES, createPost, getNextPostId } from '../../shared/data.js'
import AppState from '../../shared/app-state.js'

let posts = []
let stories = []
let container = null
let currentVNode = null
let renderCount = 0

export function initMiniReactFeed(el) {
  container = el
  posts = JSON.parse(JSON.stringify(INITIAL_POSTS))
  stories = JSON.parse(JSON.stringify(INITIAL_STORIES))
  renderCount = 0
  currentVNode = null
  smartRender()
}

// --- 스마트 렌더링: diff → patch (변경분만!) ---
function smartRender() {
  if (!container) return
  renderCount++
  AppState.renderCounts.miniReact = renderCount

  const newVNode = buildFeedVNode()

  if (!currentVNode) {
    // 최초 렌더: DOM을 처음부터 만들어요
    container.innerHTML = ''
    const dom = renderDOM(newVNode)
    container.appendChild(dom)
  } else {
    // 이후 렌더: diff로 변경점만 찾아서 patch!
    const patches = diff(currentVNode, newVNode)
    if (patches.length > 0) {
      patch(container.firstChild, patches)
      highlightPatches(container.firstChild, patches)
    }
    // AppState에 패치 정보 공유
    AppState.update({
      previousVNode: currentVNode,
      currentVNode: newVNode,
      lastPatches: patches,
    })
  }

  currentVNode = newVNode
  bindEvents()
}

// --- VNode 트리 빌드 ---
function buildFeedVNode() {
  return createElement('div', { class: 'mini-react-root' },
    // 스토리 바
    createElement('div', { class: 'story-bar' },
      ...stories.map(story =>
        createElement('div', {
          class: `story-item${story.seen ? ' story-item--seen' : ''}`,
          'data-id': story.id,
        },
          createElement('div', { class: 'story-avatar' }, story.user.avatar),
          createElement('div', { class: 'story-name' }, story.user.name),
        )
      )
    ),
    // 피드 리스트
    createElement('div', { class: 'feed-list' },
      ...posts.map(post =>
        createElement('div', { class: 'post-card', 'data-id': post.id },
          createElement('div', { class: 'post-header' },
            createElement('span', { class: 'post-avatar' }, post.user.avatar),
            createElement('span', { class: 'post-username' }, post.user.name),
          ),
          createElement('div', { class: 'post-image' },
            createElement('img', { src: post.image, alt: 'post', loading: 'lazy' }),
          ),
          createElement('div', { class: 'post-actions' },
            createElement('button', {
              class: `btn-like${post.liked ? ' btn-like--active' : ''}`,
              'data-id': post.id,
            },
              post.liked ? '❤️ ' : '🤍 ',
              createElement('span', { class: 'like-count' }, String(post.likes)),
            ),
          ),
          createElement('div', { class: 'post-caption' }, post.caption),
          createElement('div', { class: 'post-comments' },
            ...post.comments.map(comment =>
              createElement('div', { class: 'comment' },
                createElement('strong', {}, comment.user),
                createElement('span', {}, ` ${comment.text} `),
                createElement('button', {
                  class: 'btn-delete-comment',
                  'data-post-id': post.id,
                  'data-comment-id': comment.id,
                }, '✕'),
              )
            )
          ),
          createElement('div', { class: 'comment-form' },
            createElement('input', {
              type: 'text',
              class: 'comment-input',
              placeholder: '댓글 달기...',
              'data-post-id': post.id,
            }),
            createElement('button', {
              class: 'btn-comment',
              'data-post-id': post.id,
            }, '게시'),
          ),
        )
      )
    ),
    // sentinel
    createElement('div', { class: 'scroll-sentinel', id: 'mini-sentinel' }),
  )
}

// --- 이벤트 바인딩 (렌더 후 매번) ---
function bindEvents() {
  if (!container) return

  // 좋아요
  container.querySelectorAll('.btn-like').forEach(btn => {
    btn.onclick = () => handleLike(btn.dataset.id)
  })

  // 댓글 추가
  container.querySelectorAll('.btn-comment').forEach(btn => {
    btn.onclick = () => {
      const card = btn.closest('.post-card')
      const input = card.querySelector('.comment-input')
      handleAddComment(btn.dataset.postId, input.value)
      input.value = ''
    }
  })

  // 댓글 입력 엔터
  container.querySelectorAll('.comment-input').forEach(input => {
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        handleAddComment(input.dataset.postId, input.value)
        input.value = ''
      }
    }
  })

  // 댓글 삭제
  container.querySelectorAll('.btn-delete-comment').forEach(btn => {
    btn.onclick = () => handleDeleteComment(btn.dataset.postId, btn.dataset.commentId)
  })

  // 스토리
  container.querySelectorAll('.story-item').forEach(item => {
    item.onclick = () => handleStorySeen(item.dataset.id)
  })
}

// --- 액션 핸들러 ---
function handleLike(postId) {
  const post = posts.find(p => p.id === postId)
  if (!post) return
  post.liked = !post.liked
  post.likes += post.liked ? 1 : -1
  smartRender()
}

function handleAddComment(postId, text) {
  if (!text || text.trim() === '') return
  const post = posts.find(p => p.id === postId)
  if (!post) return
  post.comments.push({
    id: `c${postId}_${Date.now()}`,
    user: 'me',
    text: text.trim(),
  })
  smartRender()
}

function handleDeleteComment(postId, commentId) {
  const post = posts.find(p => p.id === postId)
  if (!post) return
  post.comments = post.comments.filter(c => c.id !== commentId)
  smartRender()
}

function handleStorySeen(storyId) {
  const story = stories.find(s => s.id === storyId)
  if (story) {
    story.seen = true
    smartRender()
  }
}

// --- 공개 API ---
export function miniReactLike(postId) { handleLike(postId) }
export function miniReactAddComment(postId, text) { handleAddComment(postId, text) }
export function miniReactDeleteComment(postId, commentId) { handleDeleteComment(postId, commentId) }
export function miniReactStorySeen(storyId) { handleStorySeen(storyId) }
export function miniReactAddPosts(count) {
  for (let i = 0; i < count; i++) {
    posts.push(createPost(getNextPostId()))
  }
  smartRender()
}
export function miniReactBulkLike(postId, times) {
  const post = posts.find(p => p.id === postId)
  if (!post) return
  for (let i = 0; i < times; i++) {
    post.liked = !post.liked
    post.likes += post.liked ? 1 : -1
    smartRender()
  }
}
export function getMiniReactRenderCount() { return renderCount }
export function getMiniReactPosts() { return posts }
