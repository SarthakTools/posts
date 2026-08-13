import { Post } from '@/types/post'

type Props = {
  post: Post
  isAdmin: boolean
  onEdit: (post: Post) => void
  onDelete: (id: string) => void
}

export default function PostCard({ post, isAdmin, onEdit, onDelete }: Props) {
  const date = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <article className="w-full max-w-xl mx-auto bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl p-6 shadow-sm relative">
      <div className="flex items-center justify-between mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">sarthakparmar</span>
        <div className="flex items-center gap-2">
          <span>{date}</span>
        </div>
      </div>

      {post.image_url && (
  <img
    src={`${post.image_url}?width=900&resize=contain&t=${Date.now()}`}
    alt="Post image"
    className="w-full rounded-xl mb-4 object-cover max-h-96"
  />
)}

      <p className="text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
        {post.content}
      </p>

      {/* Admin buttons */}
      {isAdmin && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-black/5 dark:border-white/10">
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