// shared/drag-scroll.js — 스토리 바 드래그 스크롤
// 마우스로 잡고 좌우로 드래그하면 스크롤되는 기능
// Instagram 스토리 바처럼 스크롤바 없이 드래그로만 이동

/**
 * 요소에 드래그 스크롤을 적용해요
 * @param {HTMLElement} el - 드래그 스크롤할 요소
 */
export function enableDragScroll(el) {
  if (!el || el._dragScrollEnabled) return
  el._dragScrollEnabled = true

  let isDown = false
  let startX = 0
  let scrollLeft = 0

  el.addEventListener('mousedown', (e) => {
    isDown = true
    startX = e.pageX - el.offsetLeft
    scrollLeft = el.scrollLeft
  })

  el.addEventListener('mouseleave', () => { isDown = false })
  el.addEventListener('mouseup', () => { isDown = false })

  el.addEventListener('mousemove', (e) => {
    if (!isDown) return
    e.preventDefault()
    const x = e.pageX - el.offsetLeft
    const walk = (x - startX) * 1.5  // 스크롤 속도 배율
    el.scrollLeft = scrollLeft - walk
  })
}
