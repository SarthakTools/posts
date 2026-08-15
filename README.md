# Simple Public + Private Posts

Minimal clean posts app:
- Floating pill navbar
- Centered posts only
- Public + Private posts
- Light / Dark mode
- No likes, no comments

## 1. Create Supabase project (free)

1. Go to https://supabase.com → New project
2. After it loads, go to **SQL Editor** and run this:

```sql
create table posts (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  is_private boolean default false,
  user_id uuid references auth.users(id),
  author_name text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table posts enable row level security;

-- Anyone can read public posts
create policy "Public posts are viewable by everyone"
on posts for select
using (is_private = false);

-- Logged in users can read their own private posts
create policy "Users can view own private posts"
on posts for select
using (auth.uid() = user_id);

-- Only logged in users can create posts
create policy "Users can create posts"
on posts for insert
with check (auth.uid() = user_id);

-- Users can delete their own posts (optional)
create policy "Users can delete own posts"
on posts for delete
using (auth.uid() = user_id);
```

3. Go to **Project Settings → API**
4. Copy `Project URL` and `anon public` key

## 2. Setup this project

```bash
cd nas-posts
cp .env.local.example .env.local
```

Paste your Supabase URL and anon key into `.env.local`

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 3. Deploy (free)

1. Push to GitHub
2. Go to https://vercel.com → Import project
3. Add the same two environment variables
4. Deploy

Done.

## Features

- **Public** posts → everyone can see
- **Private** posts → only you can see
- Filter tabs: All / Public / Private
- Light + Dark mode
- Magic link login (email)
