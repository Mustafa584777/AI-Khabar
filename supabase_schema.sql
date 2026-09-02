-- Supabase SQL Schema for PromptCMS
-- Run this in your Supabase SQL Editor for fresh integration.

-- 1. Posts Table
create table if not exists public.posts (
  id text primary key,
  title text not null,
  slug text unique not null,
  category text not null,
  prompt_text text not null,
  image_url text not null,
  image_alt text,
  image_width integer default 1024,
  image_height integer default 1536,
  status text default 'published',
  tags text[] default '{}',
  author jsonb default '{"name": "tool.reelz", "avatar": "/logo.png", "role": "Author"}',
  views_count integer default 0,
  likes_count integer default 0,
  bookmarks_count integer default 0,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Categories Table
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  count integer default 0,
  sort_order integer default 0
);

-- 3. Settings Table
create table if not exists public.settings (
  id text primary key,
  data jsonb not null
);

-- 4. Tags Table
create table if not exists public.tags (
  id text primary key,
  tags text[] default '{}'
);

-- 5. Search Queries Table
create table if not exists public.search_queries (
  id text primary key,
  query text not null,
  count integer default 1,
  last_searched_at timestamptz default now()
);

-- Enable Row Level Security (RLS) or open public access for demo/CMS use
alter table public.posts enable row level security;
alter table public.categories enable row level security;
alter table public.settings enable row level security;
alter table public.tags enable row level security;
alter table public.search_queries enable row level security;

-- Create public read/write policies for easy CMS operations (or customize as needed)
create policy "Public posts access" on public.posts for all using (true) with check (true);
create policy "Public categories access" on public.categories for all using (true) with check (true);
create policy "Public settings access" on public.settings for all using (true) with check (true);
create policy "Public tags access" on public.tags for all using (true) with check (true);
create policy "Public search queries access" on public.search_queries for all using (true) with check (true);
