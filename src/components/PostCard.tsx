'use client'

import { Post } from '@/types/post'
import { useEffect, useState } from 'react'

type Props = {
  post: Post
  isAdmin: boolean
  onEdit: (post: Post) => void
  onDelete: (id: string) => void
}

export default function PostCard({ post, isAdmin, onEdit, onDelete }: Props) {
  // Average color pulled from the post's image, used to tint the card.
  const [accent, setAccent] = useState<string | null>(null)

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
      className="w-full max-w-2xl mx-auto rounded-2xl p-6 sm:p-7 relative border border-white/10 dark:border-white/10 backdrop-blur-2xl bg-white/40 dark:bg-white/[0.06] shadow-xl shadow-black/10 transition-colors duration-700"
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
      <div className="flex items-center justify-between mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">sarthakparmar</span>
        <div className="flex items-center gap-2">
          <span>{date}</span>
        </div>
      </div>

      {post.image_url && (
        <div className="w-full rounded-2xl mb-4 overflow-hidden flex items-center justify-start">
          {/* object-contain + no forced width: image shows at its real resolution, not stretched/upscaled (that stretching was causing the blur) */}
          <img
            src={post.image_url}
            alt="Post image"
            className="max-w-full max-h-[560px] w-auto h-auto object-contain"
            crossOrigin="anonymous"
          />
        </div>
      )}

      <p className="text-[15px] sm:text-base text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap leading-7 tracking-[-0.01em]">
        {post.content}
      </p>

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