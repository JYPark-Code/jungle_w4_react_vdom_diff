import React, { useEffect, useRef, useState } from 'react'

export default function InfiniteScroll({ onLoadMore }) {
  const sentinelRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const loadCountRef = useRef(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && loadCountRef.current < 5) {
          setLoading(true)
          loadCountRef.current++
          setTimeout(() => {
            onLoadMore()
            setLoading(false)
          }, 300)
        }
      },
      { threshold: 0.1 }
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [onLoadMore, loading])

  return (
    <div ref={sentinelRef} className="scroll-sentinel">
      {loading && <span style={{ color: '#a8a8a8', fontSize: '0.8rem' }}>로딩 중...</span>}
      {loadCountRef.current >= 5 && <span style={{ color: '#a8a8a8', fontSize: '0.8rem' }}>모두 불러왔어요</span>}
    </div>
  )
}
