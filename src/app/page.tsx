'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import { Post } from '@/types/post'

// The one and only password that unlocks admin mode.
// NOTE: this is visible to anyone who inspects your site's code —
// it just hides/shows buttons, it is not real security.
const ADMIN_PASSWORD = 'parmarhehe'

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Edit mode
  const [editingPost, setEditingPost] = useState<Post | null>(null)

  // Restore admin state on page load/refresh
  useEffect(() => {
    const saved = localStorage.getItem('isAdmin')
    if (saved === 'true') setIsAdmin(true)
  }, [])

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false })

    if (data) setPosts(data as Post[])
    setLoading(false)
  }

  function handleLogin() {
    const password = prompt('Enter password:')
    if (password === null) return // user hit cancel

    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true)
      localStorage.setItem('isAdmin', 'true')
    } else {
      alert('Incorrect password')
    }
  }

  function handleLogout() {
    setIsAdmin(false)
    localStorage.removeItem('isAdmin')
  }

  async function handleCreatePost() {
    if (!newContent.trim() || !isAdmin) return
    setPosting(true)

    let imageUrl = null

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `admin/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, imageFile)

      if (uploadError) {
        alert('Image upload failed: ' + uploadError.message)
        setPosting(false)
        return
      }

      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      imageUrl = data.publicUrl
    }

    const { error } = await supabase.from('posts').insert({
      content: newContent.trim(),
      is_private: false,
      author_name: 'sarthakparmar',
      image_url: imageUrl,
    })

    if (error) {
      alert(error.message)
    } else {
      setNewContent('')
      setImageFile(null)
      setImagePreview(null)
      setShowNewPost(false)
      loadPosts()
    }
    setPosting(false)
  }

  async function handleUpdatePost() {
    if (!editingPost || !newContent.trim()) return
    setPosting(true)

    let imageUrl = editingPost.image_url // keep old image by default

    // If user selected a new image
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `admin/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, imageFile)

      if (uploadError) {
        alert('Image upload failed: ' + uploadError.message)
        setPosting(false)
        return
      }

      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      imageUrl = data.publicUrl
    }

    // If user removed the image (clicked the ×)
    if (!imagePreview && !imageFile) {
      imageUrl = null
    }

    const { data, error } = await supabase
      .from('posts')
      .update({
        content: newContent.trim(),
        image_url: imageUrl,
      })
      .eq('id', editingPost.id)
      .select()

    if (error) {
      alert(error.message)
    } else if (!data || data.length === 0) {
      // Supabase silently blocks the update instead of erroring when
      // Row Level Security denies it. This is almost always a permissions
      // (RLS) issue in the Supabase dashboard, not a bug in the app.
      alert(
        'The update was blocked by Supabase permissions (Row Level Security). ' +
        'See the RLS fix instructions to allow edits without a real login.'
      )
    } else {
      setEditingPost(null)
      setNewContent('')
      setImageFile(null)
      setImagePreview(null)
      loadPosts()
    }
    setPosting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this post?')) return

    const { data, error } = await supabase.from('posts').delete().eq('id', id).select()
    if (error) {
      alert(error.message)
    } else if (!data || data.length === 0) {
      alert(
        'The delete was blocked by Supabase permissions (Row Level Security). ' +
        'See the RLS fix instructions to allow deletes without a real login.'
      )
    } else {
      loadPosts()
    }
  }

  function openEdit(post: Post) {
    setEditingPost(post)
    setNewContent(post.content)
    setImagePreview(post.image_url || null)
    setImageFile(null)
  }

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Ambient background glow — muted, gives the glass panels something soft to blur */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-zinc-100 dark:bg-zinc-950">
        <div className="absolute -top-40 left-1/4 w-[36rem] h-[36rem] bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/4 -right-40 w-[30rem] h-[30rem] bg-pink-400/15 dark:bg-orange-500/10 rounded-full blur-[100px]" />
      </div>

      <Navbar
        isLoggedIn={isAdmin}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onNewPost={() => {
          setEditingPost(null)
          setNewContent('')
          setImageFile(null)
          setImagePreview(null)
          setShowNewPost(true)
        }}
      />

      <main className="pt-28 px-4 max-w-2xl mx-auto space-y-8">
        {/* Create / Edit Modal */}
        {(showNewPost || editingPost) && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-black/5 dark:border-white/10">
              <h2 className="text-lg font-semibold mb-4">
                {editingPost ? 'Edit Post' : 'New Post'}
              </h2>

              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What's on your mind..."
                className="w-full h-28 p-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                autoFocus
              />

              {imagePreview && (
                <div className="mt-3 relative">
                  <img src={imagePreview} alt="Preview" className="w-full rounded-xl max-h-48 object-cover" />
                  <button
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <label className="cursor-pointer text-sm px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition">
                  📷 {imagePreview ? 'Change Image' : 'Image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setImageFile(file)
                        setImagePreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowNewPost(false)
                      setEditingPost(null)
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                    className="px-4 py-2 rounded-full text-sm hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingPost ? handleUpdatePost : handleCreatePost}
                    disabled={posting || !newContent.trim()}
                    className="px-4 py-2 rounded-full bg-amber-400 text-black text-sm font-medium hover:bg-amber-300 disabled:opacity-50"
                  >
                    {posting ? 'Saving...' : editingPost ? 'Update' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center text-zinc-500 py-20">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-zinc-500 py-20">No posts yet.</div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </main>
    </div>
  )
}