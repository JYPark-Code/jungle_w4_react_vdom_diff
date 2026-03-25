import React, { useState, memo } from 'react'

const Post = memo(function Post({ post, onLike, onAddComment, onDeleteComment }) {
  const [commentText, setCommentText] = useState('')

  const handleSubmit = () => {
    if (!commentText.trim()) return
    onAddComment(post.id, commentText)
    setCommentText('')
  }

  return (
    <div className="post-card">
      <div className="post-header">
        <span className="post-avatar">{post.user.avatar}</span>
        <span className="post-username">{post.user.name}</span>
      </div>

      <div className="post-image">
        <img src={post.image} alt="post" loading="lazy" />
      </div>

      <div className="post-actions">
        <button
          className={`btn-like${post.liked ? ' btn-like--active' : ''}`}
          onClick={() => onLike(post.id)}
        >
          <span className="heart-icon" />
        </button>
      </div>

      <div className="like-count">좋아요 {post.likes.toLocaleString()}개</div>
      <div className="post-caption">{post.caption}</div>

      <div className="post-comments">
        {post.comments.map(comment => (
          <div key={comment.id} className="comment">
            <strong>{comment.user}</strong>
            <span> {comment.text} </span>
            <button
              className="btn-delete-comment"
              onClick={() => onDeleteComment(post.id, comment.id)}
            >✕</button>
          </div>
        ))}
      </div>

      <div className="comment-form">
        <input
          type="text"
          className="comment-input"
          placeholder="댓글 달기..."
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        <button className="btn-comment" onClick={handleSubmit}>게시</button>
      </div>
    </div>
  )
})

export default Post
