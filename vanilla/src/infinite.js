// vanilla/src/infinite.js — Vanilla 인피니트 스크롤
// Intersection Observer로 스크롤 바닥 감지 → 포스트 추가

import { vanillaAddPosts } from './feed.js'

let observer = null
// EC-04: 연속 빠른 스크롤 — isLoading 플래그로 중복 요청 방지
let isLoading = false
// EC-05: 더미 데이터 소진 — hasMore 플래그
let hasMore = true
let loadCount = 0
const MAX_LOADS = 5  // 최대 5번 추가 로드 (총 60개)

export function initVanillaInfiniteScroll() {
  if (observer) observer.disconnect()

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !isLoading && hasMore) {
        loadMore()
      }
    })
  }, { threshold: 0.1 })

  // sentinel 요소가 나타날 때까지 대기
  const check = setInterval(() => {
    const sentinel = document.getElementById('vanilla-sentinel')
    if (sentinel) {
      observer.observe(sentinel)
      clearInterval(check)
    }
  }, 200)
}

function loadMore() {
  isLoading = true
  loadCount++

  if (loadCount >= MAX_LOADS) {
    hasMore = false
  }

  // 약간의 지연 후 추가 (네트워크 시뮬레이션)
  setTimeout(() => {
    vanillaAddPosts(10)
    isLoading = false
  }, 300)
}

export function resetVanillaInfiniteScroll() {
  isLoading = false
  hasMore = true
  loadCount = 0
}
