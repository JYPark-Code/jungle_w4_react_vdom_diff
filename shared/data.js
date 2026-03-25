// shared/data.js — 3버전 공통 더미 데이터
// Vanilla, Mini React, Real React 모두 같은 데이터를 사용해요
// 이렇게 하면 "같은 데이터, 다른 방식"을 공정하게 비교할 수 있어요

export const createPost = (id) => ({
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

export const createStory = (id) => ({
  id: String(id),
  user: { name: `user_${String(id).padStart(2, '0')}`, avatar: ['🧑','👩','🧔','👧'][id % 4] },
  seen: false,
})

export const INITIAL_POSTS   = Array.from({ length: 10 }, (_, i) => createPost(i + 1))
export const INITIAL_STORIES = Array.from({ length: 8  }, (_, i) => createStory(i + 1))
export let postIdCounter = 11

export function getNextPostId() {
  return postIdCounter++
}
