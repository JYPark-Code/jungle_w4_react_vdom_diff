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
  likes: (id * 37 + 13) % 500 + 10,  // id 기반 고정값 (3버전 동일)
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

// ready 메시지는 App 컴포넌트의 useEffect에서 보냅니다

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
        case 'reset':
          setPosts(INITIAL_POSTS.map(p => ({ ...p })))
          setStories(INITIAL_STORIES.map(s => ({ ...s })))
          nextId = 11
          break

        // --- 배치 없음 벤치마크: setState를 1000번 개별 호출 ---
        case 'bulk-like-nobatch': {
          const s = performance.now()
          for (let i = 0; i < 1000; i++) {
            setPosts(prev => {
              const idx = prev.findIndex(p => p.id === '1')
              if (idx === -1) return prev
              const p = { ...prev[idx] }
              p.liked = !p.liked
              p.likes += p.liked ? 1 : -1
              return [...prev.slice(0, idx), p, ...prev.slice(idx + 1)]
            })
          }
          const elapsed = performance.now() - s
          window.parent.postMessage({ type: 'bench-result', testId: 'nobatch', time: elapsed }, '*')
          break
        }

        // --- 벤치마크 ---
        // setState 콜백 안에서 연산 시간만 측정하고 즉시 응답
        case 'bench-like1000': {
          const s = performance.now()
          setPosts(prev => {
            let u = [...prev]
            const idx = u.findIndex(p => p.id === '1')
            if (idx === -1) return prev
            for (let i = 0; i < 1000; i++) {
              const p = { ...u[idx] }
              p.liked = !p.liked
              p.likes += p.liked ? 1 : -1
              u[idx] = p
            }
            const elapsed = performance.now() - s
            window.parent.postMessage({ type: 'bench-result', testId: 'like1000', time: elapsed }, '*')
            return u
          })
          break
        }
        case 'bench-render100': {
          const s = performance.now()
          const newPosts = Array.from({ length: 100 }, (_, i) => createPost(100 + i))
          setPosts(prev => {
            const result = [...prev, ...newPosts]
            const elapsed = performance.now() - s
            window.parent.postMessage({ type: 'bench-result', testId: 'render100', time: elapsed }, '*')
            return result
          })
          break
        }
        case 'bench-scroll10': {
          const s = performance.now()
          const morePosts = Array.from({ length: 10 }, (_, i) => createPost(200 + i))
          setPosts(prev => {
            const result = [...prev, ...morePosts]
            const elapsed = performance.now() - s
            window.parent.postMessage({ type: 'bench-result', testId: 'scroll10', time: elapsed }, '*')
            return result
          })
          break
        }
        case 'bench-batch': {
          const s = performance.now()
          setPosts(prev => prev.map((p, i) => i === 0 ? { ...p, likes: p.likes + 1 } : p))
          setPosts(prev => prev.map((p, i) => i === 0 ? { ...p, likes: p.likes + 1 } : p))
          setPosts(prev => {
            const result = prev.map((p, i) => i === 0 ? { ...p, likes: p.likes + 1 } : p)
            const elapsed = performance.now() - s
            window.parent.postMessage({ type: 'bench-result', testId: 'batch', time: elapsed }, '*')
            return result
          })
          break
        }
        case 'bench-blocking': {
          const s = performance.now()
          setPosts(prev => {
            let u = [...prev]
            for (let i = 0; i < 1000; i++) {
              u = u.map((p, idx) => idx === 0 ? { ...p, likes: p.likes + 1 } : p)
            }
            const elapsed = performance.now() - s
            window.parent.postMessage({ type: 'bench-result', testId: 'blocking', time: elapsed }, '*')
            return u
          })
          break
        }
      }
    }
    window.addEventListener('message', handler)

    // 부모에게 "준비 완료" 알림 — 부모가 놓치지 않도록 반복 전송
    if (window.parent !== window) {
      const readyInterval = setInterval(() => {
        window.parent.postMessage({ type: 'real-react-ready' }, '*')
      }, 500)
      // 5초 후 중단
      setTimeout(() => clearInterval(readyInterval), 5000)
    }

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
