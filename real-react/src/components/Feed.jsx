import React from 'react'
import Post from './Post.jsx'
import Story from './Story.jsx'
import InfiniteScroll from './InfiniteScroll.jsx'

export default function Feed({ posts, stories, onLike, onAddComment, onDeleteComment, onStorySeen, onAddPosts }) {
  return (
    <div className="feed-root">
      {/* 스토리 바 */}
      <div className="story-bar">
        {stories.map(story => (
          <Story key={story.id} story={story} onSeen={onStorySeen} />
        ))}
      </div>

      {/* 피드 리스트 */}
      <div className="feed-list">
        {posts.map(post => (
          <Post
            key={post.id}
            post={post}
            onLike={onLike}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
          />
        ))}
      </div>

      <InfiniteScroll onLoadMore={() => onAddPosts(10)} />
    </div>
  )
}
