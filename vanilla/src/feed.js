// vanilla/src/feed.js — 버전 A: DOM 직접 조작
// 변경이 생길 때마다 전체를 innerHTML로 다시 그려요
// 이게 바로 Virtual DOM 없이 하는 방식이에요 — 느린 이유!

import { INITIAL_POSTS, INITIAL_STORIES, createPost, getNextPostId } from '../../shared/data.js'
import AppState from '../../shared/app-state.js'

let posts = []
let stories = []
let container = null
let renderCount = 0

export function initVanillaFeed(el) {
  container = el
  posts = JSON.parse(JSON.stringify(INITIAL_POSTS))
  stories = JSON.parse(JSON.stringify(INITIAL_STORIES))
  renderCount = 0
  render()
}

// --- 전체 다시 그리기 (Vanilla의 핵심 문제) ---
function render() {
  if (!container) return
  renderCount++
  AppState.renderCounts.vanilla = renderCount

  // EC-07: XSS 방지 — textContent 사용을 위해 DOM API로 생성
  container.innerHTML = ''

  // 스토리 바
  const storyBar = document.createElement('div')
  storyBar.className = 'story-bar'
  stories.forEach(story => {
    const item = document.createElement('div')
    item.className = `story-item${story.seen ? ' story-item--seen' : ''}`
    item.dataset.id = story.id
    item.innerHTML = `
      <div class="story-avatar">${story.user.avatar}</div>
      <div class="story-name">${story.user.name}</div>
    `
    item.addEventListener('click', () => handleStorySeen(story.id))
    storyBar.appendChild(item)
  })
  container.appendChild(storyBar)

  // 피드
  const feedList = document.createElement('div')
  feedList.className = 'feed-list'
  posts.forEach(post => {
    feedList.appendChild(createPostCard(post))
  })
  container.appendChild(feedList)

  // 인피니트 스크롤 sentinel
  const sentinel = document.createElement('div')
  sentinel.className = 'scroll-sentinel'
  sentinel.id = 'vanilla-sentinel'
  container.appendChild(sentinel)
}

function createPostCard(post) {
  const card = document.createElement('div')
  card.className = 'post-card'
  card.dataset.id = post.id

  // EC-07: 사용자 입력은 textContent로
  card.innerHTML = `
    <div class="post-header">
      <span class="post-avatar">${post.user.avatar}</span>
      <span class="post-username"></span>
    </div>
    <div class="post-image">
      <img src="${post.image}" alt="post" loading="lazy" />
    </div>
    <div class="post-actions">
      <button class="btn-like ${post.liked ? 'btn-like--active' : ''}" data-id="${post.id}">
        ${post.liked ? '❤️' : '🤍'} <span class="like-count">${post.likes}</span>
      </button>
    </div>
    <div class="post-caption"></div>
    <div class="post-comments"></div>
    <div class="comment-form">
      <input type="text" class="comment-input" placeholder="댓글 달기..." data-post-id="${post.id}" />
      <button class="btn-comment" data-post-id="${post.id}">게시</button>
    </div>
  `

  // textContent로 사용자 데이터 설정 (XSS 방지)
  card.querySelector('.post-username').textContent = post.user.name
  card.querySelector('.post-caption').textContent = post.caption

  // 댓글 목록
  const commentsEl = card.querySelector('.post-comments')
  post.comments.forEach(comment => {
    const commentEl = document.createElement('div')
    commentEl.className = 'comment'
    commentEl.innerHTML = `<strong></strong> <span></span> <button class="btn-delete-comment" data-post-id="${post.id}" data-comment-id="${comment.id}">✕</button>`
    commentEl.querySelector('strong').textContent = comment.user
    commentEl.querySelector('span').textContent = comment.text
    commentsEl.appendChild(commentEl)
  })

  // 이벤트
  card.querySelector('.btn-like').addEventListener('click', () => handleLike(post.id))
  card.querySelector('.btn-comment').addEventListener('click', () => {
    const input = card.querySelector('.comment-input')
    handleAddComment(post.id, input.value)
    input.value = ''
  })
  card.querySelector('.comment-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleAddComment(post.id, e.target.value)
      e.target.value = ''
    }
  })
  card.querySelectorAll('.btn-delete-comment').forEach(btn => {
    btn.addEventListener('click', () => {
      handleDeleteComment(btn.dataset.postId, btn.dataset.commentId)
    })
  })

  return card
}

// --- 액션 핸들러 ---

function handleLike(postId) {
  const post = posts.find(p => p.id === postId)
  if (!post) return
  post.liked = !post.liked
  post.likes += post.liked ? 1 : -1
  render()  // 전체 다시 그리기!
}

function handleAddComment(postId, text) {
  // EC-06: 빈 댓글 차단
  if (!text || text.trim() === '') return
  const post = posts.find(p => p.id === postId)
  if (!post) return
  post.comments.push({
    id: `c${postId}_${Date.now()}`,
    user: 'me',
    text: text.trim(),
  })
  render()
}

function handleDeleteComment(postId, commentId) {
  const post = posts.find(p => p.id === postId)
  if (!post) return
  post.comments = post.comments.filter(c => c.id !== commentId)
  render()
}

function handleStorySeen(storyId) {
  const story = stories.find(s => s.id === storyId)
  if (story) {
    story.seen = true
    render()
  }
}

// --- 공개 API (공통 컨트롤에서 호출) ---

export function vanillaLike(postId) {
  handleLike(postId)
}

export function vanillaAddComment(postId, text) {
  handleAddComment(postId, text)
}

export function vanillaDeleteComment(postId, commentId) {
  handleDeleteComment(postId, commentId)
}

export function vanillaStorySeen(storyId) {
  handleStorySeen(storyId)
}

export function vanillaAddPosts(count) {
  for (let i = 0; i < count; i++) {
    const id = getNextPostId()
    posts.push(createPost(id))
  }
  render()
}

export function vanillaBulkLike(postId, times) {
  const post = posts.find(p => p.id === postId)
  if (!post) return
  for (let i = 0; i < times; i++) {
    post.liked = !post.liked
    post.likes += post.liked ? 1 : -1
    render()  // 매번 전체 리렌더!
  }
}

export function getVanillaRenderCount() {
  return renderCount
}

export function getVanillaPosts() {
  return posts
}
