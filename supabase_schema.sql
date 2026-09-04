-- ==============================================================================
-- SUPABASE DATABASE INITIALIZATION SCRIPT FOR TRENDING PHOTO PROMPTS
-- Project ID: kigytienokbvwetbemac
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. POSTS TABLE
create table if not exists public.posts (
  id text primary key,
  title text not null,
  slug text unique not null,
  category text not null,
  ai_tool text default 'Midjourney',
  prompt_text text not null,
  negative_prompt text,
  image_url text not null,
  image_alt text,
  image_width integer default 1024,
  image_height integer default 1536,
  additional_images text[] default '{}',
  parameters jsonb default '{}'::jsonb,
  variables jsonb default '[]'::jsonb,
  article_content text,
  tags text[] default '{}',
  status text default 'published',
  is_featured boolean default false,
  is_trending boolean default false,
  views_count integer default 0,
  copies_count integer default 0,
  likes_count integer default 0,
  bookmarks_count integer default 0,
  seo_title text,
  seo_description text,
  author jsonb default '{"name": "tool.reelz", "avatar": "/logo.png", "role": "Author"}'::jsonb,
  seo jsonb default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure all columns exist in posts if table was previously created
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='posts' and column_name='ai_tool') then
    alter table public.posts add column ai_tool text default 'Midjourney';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='posts' and column_name='copies_count') then
    alter table public.posts add column copies_count integer default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='posts' and column_name='negative_prompt') then
    alter table public.posts add column negative_prompt text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='posts' and column_name='article_content') then
    alter table public.posts add column article_content text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='posts' and column_name='additional_images') then
    alter table public.posts add column additional_images text[] default '{}';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='posts' and column_name='parameters') then
    alter table public.posts add column parameters jsonb default '{}'::jsonb;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='posts' and column_name='variables') then
    alter table public.posts add column variables jsonb default '[]'::jsonb;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='posts' and column_name='is_featured') then
    alter table public.posts add column is_featured boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='posts' and column_name='is_trending') then
    alter table public.posts add column is_trending boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='posts' and column_name='seo') then
    alter table public.posts add column seo jsonb default '{}'::jsonb;
  end if;
end $$;

-- 2. CATEGORIES TABLE
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text unique not null,
  icon_name text default 'Sparkles',
  description text,
  color text,
  badge_bg text,
  image_url text,
  count integer default 0,
  sort_order integer default 0
);

-- 3. SETTINGS TABLE
create table if not exists public.settings (
  id text primary key,
  data jsonb not null
);

-- 4. TAGS TABLE
create table if not exists public.tags (
  id text primary key,
  tags text[] default '{}'
);

-- 5. SEARCH QUERIES TABLE
create table if not exists public.search_queries (
  id text primary key,
  query text not null,
  count integer default 1,
  last_searched_at timestamptz default now()
);

-- 6. ROW LEVEL SECURITY & POLICIES (Full CRUD access for app)
alter table public.posts enable row level security;
alter table public.categories enable row level security;
alter table public.settings enable row level security;
alter table public.tags enable row level security;
alter table public.search_queries enable row level security;

drop policy if exists "Public posts access" on public.posts;
drop policy if exists "Public categories access" on public.categories;
drop policy if exists "Public settings access" on public.settings;
drop policy if exists "Public tags access" on public.tags;
drop policy if exists "Public search queries access" on public.search_queries;

create policy "Public posts access" on public.posts for all using (true) with check (true);
create policy "Public categories access" on public.categories for all using (true) with check (true);
create policy "Public settings access" on public.settings for all using (true) with check (true);
create policy "Public tags access" on public.tags for all using (true) with check (true);
create policy "Public search queries access" on public.search_queries for all using (true) with check (true);
