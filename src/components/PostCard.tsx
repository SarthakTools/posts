'use client'

import { Post } from '@/types/post'
import { useEffect, useState } from 'react'
import { Pencil, Pin, PinOff, Bookmark, BookmarkCheck } from 'lucide-react'

type Props = {
  post: Post
  isAdmin: boolean
  authorName: string
  isSaved: boolean
  onEdit: (post: Post) => void
  onDelete: (id: string) => void
  onEditName: () => void
  onToggleSave: (id: string) => void
  onTogglePin: (post: Post) => void
}

const CONTENT_PREVIEW_LIMIT = 220

// Turns any http(s):// or www. link inside post text into a real, colored, clickable link.
function renderWithLinks(text: string) {
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g
  const result: (string | React.ReactElement)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index))
    }
    const url = match[0]
    const href = url.startsWith('http') ? url : `https://${url}`
    result.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-500 dark:text-sky-400 underline decoration-sky-500/40 hover:decoration-sky-500 break-words"
      >
        {url}
      </a>
    )
    lastIndex = match.index + url.length
  }
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }
  return result
}

export default function PostCard({
  post,
  isAdmin,
  authorName,
  isSaved,
  onEdit,
  onDelete,
  onEditName,
  onToggleSave,
  onTogglePin,
}: Props) {
  // Average color pulled from the post's image, used to tint the card.
  const [accent, setAccent] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const isLong = post.content.length > CONTENT_PREVIEW_LIMIT
  const displayContent = isLong && !expanded
    ? post.content.slice(0, CONTENT_PREVIEW_LIMIT).trimEnd() + '…'
    : post.content

  const date = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  useEffect(() => {
    if (!post.image_url) {
      setAccent(null)
      return
    }

    let cancelled = false
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = post.image_url

    img.onload = () => {
      if (cancelled) return
      try {
        const size = 16
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)

        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          // skip near-transparent pixels
          if (data[i + 3] < 100) continue
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }
        if (count === 0) return

        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)
        setAccent(`${r}, ${g}, ${b}`)
      } catch {
        // Image blocked canvas reads (CORS) — just skip the tint, no big deal.
        setAccent(null)
      }
    }
    img.onerror = () => setAccent(null)

    return () => {
      cancelled = true
    }
  }, [post.image_url])

  return (
    <article
      className={`w-full max-w-2xl mx-auto rounded-2xl p-6 sm:p-7 relative border backdrop-blur-2xl bg-white/40 dark:bg-white/[0.06] shadow-xl shadow-black/10 transition-colors duration-700 ${
        post.is_pinned
          ? 'border-amber-400/40 dark:border-amber-400/30 ring-1 ring-amber-400/20'
          : 'border-white/10 dark:border-white/10'
      }`}
      style={
        accent
          ? {
              // Very subtle tint pulled from the image — a hint of color, not a colored panel.
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 30px rgba(${accent}, 0.15)`,
              borderColor: `rgba(${accent}, 0.18)`,
            }
          : undefined
      }
    >
      {post.is_pinned && (
        <div className="flex items-center gap-1 mb-3 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Pin size={12} className="fill-current" />
          <span>Pinned</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">{authorName}</span>
          {isAdmin && (
            <button
              onClick={onEditName}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition text-zinc-400 dark:text-zinc-500"
              title="Edit display name"
              aria-label="Edit display name"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1">{date}</span>
          <button
            onClick={() => onToggleSave(post.id)}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition text-zinc-400 dark:text-zinc-500"
            title={isSaved ? 'Remove from saved' : 'Save post'}
            aria-label={isSaved ? 'Remove from saved' : 'Save post'}
          >
            {isSaved ? (
              <BookmarkCheck size={16} className="text-amber-500" />
            ) : (
              <Bookmark size={16} />
            )}
          </button>
          {isAdmin && (
            <button
              onClick={() => onTogglePin(post)}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition text-zinc-400 dark:text-zinc-500"
              title={post.is_pinned ? 'Unpin post' : 'Pin post to top'}
              aria-label={post.is_pinned ? 'Unpin post' : 'Pin post to top'}
            >
              {post.is_pinned ? (
                <PinOff size={16} className="text-amber-500" />
              ) : (
                <Pin size={16} />
              )}
            </button>
          )}
        </div>
      </div>

      {post.image_url && (
        <div className="w-full rounded-2xl mb-4 overflow-hidden flex items-center justify-start">
          {/* object-contain + no forced width: image shows at its real resolution, not stretched/upscaled (that stretching was causing the blur) */}
          <img
            src={post.image_url}
            alt="Post image"
            className="max-w-full max-h-[420px] w-auto h-auto object-contain"
            crossOrigin="anonymous"
          />
        </div>
      )}

      <p className="text-[15px] sm:text-base text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap leading-7 tracking-[-0.01em]">
        {renderWithLinks(displayContent)}
      </p>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}

      {/* Admin buttons */}
      {isAdmin && (
        <div className="flex gap-2 mt-5 pt-4 border-t border-black/5 dark:border-white/10">
          <button
            onClick={() => onEdit(post)}
            className="text-sm px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(post.id)}
            className="text-sm px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60"
          >
            Delete
          </button>
        </div>
      )}
    </article>
  )
}