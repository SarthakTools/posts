'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Navbar, { FeedTab } from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import { Post } from '@/types/post'
import { parseRgbString, toAmbientTint } from '@/lib/color'

// The one and only password that unlocks admin mode.
// NOTE: this is visible to anyone who inspects your site's code —
// it just hides/shows buttons, it is not real security.
const ADMIN_PASSWORD = 'parmarhehe'
const AUTHOR_NAME = 'MayBEE'
const SAVED_POSTS_KEY = 'savedPostIds'

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [authorName, setAuthorName] = useState('MayBEE')
  const [siteName, setSiteName] = useState('Posts')
  const [siteIcon, setSiteIcon] = useState('N')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Edit mode
  const [editingPost, setEditingPost] = useState<Post | null>(null)

  // Posts / Saved tab
  const [activeTab, setActiveTab] = useState<FeedTab>('posts')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [savedLoading, setSavedLoading] = useState(false)

  // Ambient background: tracks whichever post is centered in the viewport,
  // and the color sampled from that post's image (if any).
  const [postColors, setPostColors] = useState<Record<string, string>>({})
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const handleAccentChange = useCallback((id: string, rgbStr: string | null) => {
    setPostColors((prev) => {
      if (rgbStr) {
        if (prev[id] === rgbStr) return prev
        return { ...prev, [id]: rgbStr }
      }
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // Restore admin state on page load/refresh
  useEffect(() => {
    const saved = localStorage.getItem('isAdmin')
    if (saved === 'true') setIsAdmin(true)

    const savedName = localStorage.getItem('authorName')
    if (savedName) setAuthorName(savedName)

    // Restore bookmarked post ids
    const savedIdsRaw = localStorage.getItem(SAVED_POSTS_KEY)
    if (savedIdsRaw) {
      try {
        const ids: string[] = JSON.parse(savedIdsRaw)
        setSavedIds(new Set(ids))
      } catch {
        // ignore malformed data
      }
    }
  }, [])

  async function handleEditName() {
    const name = prompt('Enter display name:', authorName)
    if (!name || !name.trim()) return
    const trimmed = name.trim()
    setAuthorName(trimmed)
    localStorage.setItem('authorName', trimmed)

    // Update the currently loaded cards immediately so every visible post changes.
    setPosts((prev) => prev.map((p) => ({ ...p, author_name: trimmed })))
    setSavedPosts((prev) => prev.map((p) => ({ ...p, author_name: trimmed })))

    // Then persist the new name for ALL posts in Supabase, including posts
    // that haven't been loaded yet by infinite scroll.
    const { data, error } = await supabase
      .from('posts')
      .update({ author_name: trimmed })
      .not('id', 'is', null)
      .select('id')

    if (error) {
      alert('Name changed on this page, but Supabase could not update old posts: ' + error.message)
    } else if (!data || data.length === 0) {
      alert('Name changed on this page, but Supabase blocked the database update. Check the UPDATE RLS policy for the posts table.')
    }
  }

  useEffect(() => {
    loadPosts()
    loadSiteSettings()
  }, [])

  // Show the back-to-top button only after the user has scrolled down.
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 500)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Watches a thin band across the vertical center of the viewport — whichever
  // post card is crossing that band right now is treated as "the post you're on".
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-post-id')
            if (id) setActivePostId(id)
          }
        })
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    )
    cardRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [activeTab, posts, savedPosts])

  async function loadSiteSettings() {
    const { data } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 'main')
      .single()

    if (data) {
      setSiteName(data.site_name)
      setSiteIcon(data.site_icon)
    }
  }

  async function handleEditBranding() {
    const name = prompt('Enter site name:', siteName)
    if (!name || !name.trim()) return

    const icon = prompt('Enter logo (a single letter or an emoji):', siteIcon)
    if (!icon || !icon.trim()) return

    const trimmedName = name.trim()
    const trimmedIcon = icon.trim().slice(0, 4) // keep the badge small

    const { error } = await supabase
      .from('site_settings')
      .update({ site_name: trimmedName, site_icon: trimmedIcon })
      .eq('id', 'main')

    if (error) {
      alert('Failed to update branding: ' + error.message)
    } else {
      setSiteName(trimmedName)
      setSiteIcon(trimmedIcon)
    }
  }

  const PAGE_SIZE = 8

  // Pinned posts first, otherwise newest first. Stable sort keeps date order within each group.
  function sortWithPinnedFirst(list: Post[]) {
    return [...list].sort((a, b) => {
      if (!!a.is_pinned !== !!b.is_pinned) return a.is_pinned ? -1 : 1
      return 0 // already newest-first from the query, keep that order
    })
  }

  async function loadPosts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1)

    if (error) {
      console.error('Failed to load posts:', error.message)
      alert('Could not load posts: ' + error.message)
      setHasMore(false)
    } else if (data) {
      setPosts(sortWithPinnedFirst(data as Post[]))
      setHasMore(data.length === PAGE_SIZE)
    }
    setPage(0)
    setLoading(false)
  }

  async function loadMorePosts() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)

    const nextPage = page + 1
    const from = nextPage * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Failed to load more posts:', error.message)
      setHasMore(false) // stop the observer from retrying forever
    } else if (data) {
      setPosts((prev) => sortWithPinnedFirst([...prev, ...(data as Post[])]))
      setHasMore(data.length === PAGE_SIZE)
      setPage(nextPage)
    }
    setLoadingMore(false)
  }

  // Watches the bottom of the feed — when it scrolls into view, quietly load the next batch
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || activeTab !== 'posts') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePosts()
        }
      },
      { rootMargin: '400px' }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, page, loading, activeTab])

  // Fetch the full post data for saved/bookmarked ids whenever the Saved tab is opened
  async function loadSavedPosts(ids: Set<string>) {
    if (ids.size === 0) {
      setSavedPosts([])
      return
    }
    setSavedLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .in('id', Array.from(ids))
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load saved posts:', error.message)
    } else if (data) {
      setSavedPosts(sortWithPinnedFirst(data as Post[]))
    }
    setSavedLoading(false)
  }

  function handleTabChange(tab: FeedTab) {
    setActiveTab(tab)
    if (tab === 'saved') {
      loadSavedPosts(savedIds)
    }
  }

  function handleToggleSave(id: string) {
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(Array.from(next)))
      // Keep the Saved tab in sync if it's currently open
      if (activeTab === 'saved') {
        loadSavedPosts(next)
      }
      return next
    })
  }

  async function handleTogglePin(post: Post) {
    const nextPinned = !post.is_pinned

    // Optimistic update so the card re-sorts immediately
    setPosts((prev) => {
      const updated = prev.map((p) => (p.id === post.id ? { ...p, is_pinned: nextPinned } : p))
      return sortWithPinnedFirst(updated)
    })
    setSavedPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, is_pinned: nextPinned } : p))
    )

    const { data, error } = await supabase
      .from('posts')
      .update({ is_pinned: nextPinned })
      .eq('id', post.id)
      .select()

    if (error) {
      alert('Failed to update pin: ' + error.message)
      loadPosts() // revert to server truth
    } else if (!data || data.length === 0) {
      alert(
        'The pin update was blocked by Supabase permissions (Row Level Security). ' +
        'Make sure the UPDATE policy on the posts table allows this.'
      )
      loadPosts()
    }
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
    if ((!newContent.trim() && !imageFile) || !isAdmin) return
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
      author_name: authorName,
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
    if (!editingPost || (!newContent.trim() && !imageFile && !imagePreview)) return
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
      // Update the post in place so we stay on the same scroll position / page
      const updated = data[0] as Post
      setPosts((prev) =>
        prev.map((p) => (p.id === editingPost.id ? { ...p, ...updated } : p))
      )
      setSavedPosts((prev) =>
        prev.map((p) => (p.id === editingPost.id ? { ...p, ...updated } : p))
      )
      setEditingPost(null)
      setNewContent('')
      setImageFile(null)
      setImagePreview(null)
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
      // Remove from local feed without resetting pagination / scroll
      setPosts((prev) => prev.filter((p) => p.id !== id))
      setSavedPosts((prev) => prev.filter((p) => p.id !== id))
      if (savedIds.has(id)) {
        const next = new Set(savedIds)
        next.delete(id)
        setSavedIds(next)
        localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(Array.from(next)))
      }
    }
  }

  function openEdit(post: Post) {
    setEditingPost(post)
    setNewContent(post.content)
    setImagePreview(post.image_url || null)
    setImageFile(null)
  }

  const visiblePosts = activeTab === 'posts' ? posts : savedPosts
  const isLoadingVisible = activeTab === 'posts' ? loading : savedLoading

  // Color for the currently-centered post, darkened for use as a background
  // glow. null means "use the default palette" (no image, or too light).
  const activeRgbStr = activePostId ? postColors[activePostId] : null
  const ambient = toAmbientTint(activeRgbStr ? parseRgbString(activeRgbStr) : null)

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Ambient background glow — muted, gives the glass panels something soft to blur.
          Tints toward whichever post's image you're currently scrolled to. */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-zinc-100 dark:bg-zinc-950">
        <div
          className="absolute -top-40 left-1/4 w-[36rem] h-[36rem] bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[100px]"
          style={{
            transition: 'background-color 900ms ease',
            ...(ambient && { backgroundColor: `rgba(${ambient.r}, ${ambient.g}, ${ambient.b}, 0.28)` }),
          }}
        />
        <div
          className="absolute top-1/4 -right-40 w-[30rem] h-[30rem] bg-pink-400/15 dark:bg-orange-500/10 rounded-full blur-[100px]"
          style={{
            transition: 'background-color 900ms ease',
            ...(ambient && { backgroundColor: `rgba(${ambient.r}, ${ambient.g}, ${ambient.b}, 0.16)` }),
          }}
        />
      </div>

      <Navbar
        isLoggedIn={isAdmin}
        onLogin={handleLogin}
        onLogout={handleLogout}
        siteName={siteName}
        siteIcon={siteIcon}
        onEditBranding={handleEditBranding}
        activeTab={activeTab}
        onTabChange={handleTabChange}
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
                className="w-full h-48 p-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
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
                    disabled={posting || (!newContent.trim() && !imageFile && !imagePreview)}
                    className="px-4 py-2 rounded-full bg-amber-400 text-black text-sm font-medium hover:bg-amber-300 disabled:opacity-50"
                  >
                    {posting ? 'Saving...' : editingPost ? 'Update' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoadingVisible ? (
          <div className="text-center text-zinc-500 py-20">Loading...</div>
        ) : visiblePosts.length === 0 ? (
          <div className="text-center text-zinc-500 py-20">
            {activeTab === 'saved' ? 'No saved posts yet. Tap the bookmark icon on a post to save it here.' : 'No posts yet.'}
          </div>
        ) : (
          visiblePosts.map((post) => (
            <div
              key={post.id}
              data-post-id={post.id}
              ref={(el) => {
                if (el) cardRefs.current.set(post.id, el)
                else cardRefs.current.delete(post.id)
              }}
            >
              <PostCard
                post={post}
                isAdmin={isAdmin}
                authorName={authorName}
                isSaved={savedIds.has(post.id)}
                onEdit={openEdit}
                onDelete={handleDelete}
                onEditName={handleEditName}
                onToggleSave={handleToggleSave}
                onTogglePin={handleTogglePin}
                onAccentChange={handleAccentChange}
              />
            </div>
          ))
        )}

        {/* Sentinel: scrolling this into view quietly loads the next batch of posts (Posts tab only) */}
        {activeTab === 'posts' && hasMore && !loading && (
          <div ref={loadMoreRef} className="py-8 text-center text-zinc-400 text-sm">
            {loadingMore ? 'Loading more...' : ''}
          </div>
        )}
      </main>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          title="Back to top"
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-zinc-800 transition-all duration-200"
        >
          <ArrowUp size={19} />
        </button>
      )}
    </div>
  )
}