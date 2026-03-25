import React, { useState, useCallback, useRef } from 'react'
import Feed from './components/Feed.jsx'

// 공통 데이터 (shared/data.js와 동일한 구조)
const createPost = (id) => ({
  id: String(id),
  user: {
    name: `user_${String(id).padStart(2, '0')}`,
    avatar: ['🧑','👩','🧔','👧'][id % 4],
  },
  image: `https://picsum.photos/seed/${id}/600/600`,
  likes: Math.floor(Math.random() * 500) + 10,
  liked: false,
  comments: [
    { id: `c${id}_1`, user: 'friend_01', text: '멋지다! 👍' },
    { id: `c${id}_2`, user: 'friend_02', text: '나도 가고 싶다 ✈️' },
  ],
  caption: ['오늘의 일상 ☀️','주말 나들이 🌿','맛있는 거 먹었다 😋','힐링 중 🧘'][id % 4],
})

const createStory = (id) => ({
  id: String(id),
  user: { name: `user_${String(id).padStart(2, '0')}`, avatar: ['🧑','👩','🧔','👧'][id % 4] },
  seen: false,
})

const INITIAL_POSTS = Array.from({ length: 10 }, (_, i) => createPost(i + 1))
const INITIAL_STORIES = Array.from({ length: 8 }, (_, i) => createStory(i + 1))

let nextId = 11

// 부모 window와 통신 (postMessage)
function sendStats(renderCount, time) {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'real-react-stats', renderCount, time }, '*')
  }
}

export default function App() {
  const [posts, setPosts] = useState(INITIAL_POSTS)
  const [stories, setStories] = useState(INITIAL_STORIES)
  const renderCountRef = useRef(0)
  renderCountRef.current++

  // 좋아요 토글
  const handleLike = useCallback((postId) => {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }
        : p
    ))
  }, [])

  // 댓글 추가
  const handleAddComment = useCallback((postId, text) => {
    if (!text || text.trim() === '') return
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: [...p.comments, { id: `c${postId}_${Date.now()}`, user: 'me', text: text.trim() }] }
        : p
    ))
  }, [])

  // 댓글 삭제
  const handleDeleteComment = useCallback((postId, commentId) => {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: p.comments.filter(c => c.id !== commentId) }
        : p
    ))
  }, [])

  // 스토리 읽음
  const handleStorySeen = useCallback((storyId) => {
    setStories(prev => prev.map(s =>
      s.id === storyId ? { ...s, seen: true } : s
    ))
  }, [])

  // 포스트 추가
  const handleAddPosts = useCallback((count) => {
    const newPosts = Array.from({ length: count }, () => createPost(nextId++))
    setPosts(prev => [...prev, ...newPosts])
  }, [])

  // postMessage로 외부 명령 수신
  React.useEffect(() => {
    const handler = (e) => {
      if (!e.data || !e.data.type) return
      const { type, postId, times, count, text, commentId, storyId } = e.data

      switch (type) {
        case 'bulk-like': {
          const start = performance.now()
          // React 18 automatic batching: 여러 setState도 한 번만 렌더
          setPosts(prev => {
            let updated = [...prev]
            const idx = updated.findIndex(p => p.id === postId)
            if (idx === -1) return prev
            for (let i = 0; i < times; i++) {
              const p = { ...updated[idx] }
              p.liked = !p.liked
              p.likes += p.liked ? 1 : -1
              updated[idx] = p
            }
            return updated
          })
          requestAnimationFrame(() => {
            sendStats(renderCountRef.current, performance.now() - start)
          })
          break
        }
        case 'add-posts':
          handleAddPosts(count || 10)
          break
        case 'add-comment':
          handleAddComment(postId, text)
          break
        case 'delete-comment':
          handleDeleteComment(postId, commentId)
          break
        case 'story-seen':
          handleStorySeen(storyId)
          break
        case 'get-render-count':
          sendStats(renderCountRef.current, 0)
          break
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [handleAddPosts, handleAddComment, handleDeleteComment, handleStorySeen])

  return (
    <Feed
      posts={posts}
      stories={stories}
      onLike={handleLike}
      onAddComment={handleAddComment}
      onDeleteComment={handleDeleteComment}
      onStorySeen={handleStorySeen}
      onAddPosts={handleAddPosts}
    />
  )
}
