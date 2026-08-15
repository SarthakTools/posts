'use client'

import { LogIn, LogOut, Plus, Pencil, Bookmark, Rows3 } from 'lucide-react'

export type FeedTab = 'posts' | 'saved'

type Props = {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onNewPost: () => void
  siteName: string
  siteIcon: string
  onEditBranding: () => void
  activeTab: FeedTab
  onTabChange: (tab: FeedTab) => void
}

export default function Navbar({
  isLoggedIn,
  onLogin,
  onLogout,
  onNewPost,
  siteName,
  siteIcon,
  onEditBranding,
  activeTab,
  onTabChange,
}: Props) {
  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl">
      <nav className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-lg shadow-black/5">
        {/* Logo */}
        <div className="flex items-center gap-1.5 font-semibold text-sm tracking-tight shrink-0">
          <span className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-black text-xs font-bold overflow-hidden">
            {siteIcon}
          </span>
          <span className="hidden sm:inline">{siteName}</span>
          {isLoggedIn && (
            <button
              onClick={onEditBranding}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition text-zinc-400 dark:text-zinc-500"
              title="Edit logo & site name"
              aria-label="Edit logo & site name"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>

        {/* Tabs: Posts | Saved */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-black/5 dark:bg-white/5 shrink-0">
          <button
            onClick={() => onTabChange('posts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
              activeTab === 'posts'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <Rows3 size={14} />
            <span className="hidden sm:inline">Posts</span>
          </button>
          <button
            onClick={() => onTabChange('saved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
              activeTab === 'saved'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <Bookmark size={14} />
            <span className="hidden sm:inline">Saved</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isLoggedIn ? (
            <>
              <button
                onClick={onNewPost}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
                title="New post"
              >
                <Plus size={18} />
              </button>
              <button
                onClick={onLogout}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 text-black text-sm font-medium hover:bg-amber-300 transition"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">Login</span>
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}