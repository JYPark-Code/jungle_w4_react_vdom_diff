import React, { memo } from 'react'

const Story = memo(function Story({ story, onSeen }) {
  return (
    <div
      className={`story-item${story.seen ? ' story-item--seen' : ''}`}
      onClick={() => onSeen(story.id)}
    >
      <div className="story-avatar">{story.user.avatar}</div>
      <div className="story-name">{story.user.name}</div>
    </div>
  )
})

export default Story
