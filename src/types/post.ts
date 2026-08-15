export type Post = {
  id: string
  content: string
  is_private: boolean
  created_at: string
  user_id: string | null
  author_name?: string | null
  image_url?: string | null
  is_pinned?: boolean
}