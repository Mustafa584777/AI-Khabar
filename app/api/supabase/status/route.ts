import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured, getSupabaseDetails } from '@/lib/supabase';

export async function GET() {
  const details = getSupabaseDetails();
  const configured = isSupabaseConfigured();

  const status = {
    configured,
    connected: false,
    supabaseUrl: details.url,
    projectId: details.projectId,
    tables: {
      posts: false,
      categories: false,
      settings: false,
      tags: false,
      searchQueries: false,
    },
    counts: {
      posts: 0,
      categories: 0,
    },
    error: null as string | null,
  };

  if (!configured) {
    return NextResponse.json(status);
  }

  const client = supabaseAdmin || supabase;

  try {
    // 1. Test Posts table
    const { count: postsCount, error: postsError } = await client
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (!postsError) {
      status.tables.posts = true;
      status.counts.posts = postsCount || 0;
      status.connected = true;
    } else {
      status.error = `posts table error: ${postsError.message}`;
    }

    // 2. Test Categories table
    const { count: catsCount, error: catsError } = await client
      .from('categories')
      .select('*', { count: 'exact', head: true });

    if (!catsError) {
      status.tables.categories = true;
      status.counts.categories = catsCount || 0;
      status.connected = true;
    }

    // 3. Test Settings table
    const { error: settingsError } = await client
      .from('settings')
      .select('*', { count: 'exact', head: true });

    if (!settingsError) {
      status.tables.settings = true;
    }

    // 4. Test Tags table
    const { error: tagsError } = await client
      .from('tags')
      .select('*', { count: 'exact', head: true });

    if (!tagsError) {
      status.tables.tags = true;
    }

    // 5. Test Search Queries table
    const { error: searchError } = await client
      .from('search_queries')
      .select('*', { count: 'exact', head: true });

    if (!searchError) {
      status.tables.searchQueries = true;
    }

  } catch (err: unknown) {
    status.error = err instanceof Error ? err.message : 'Connection failed';
    status.connected = false;
  }

  return NextResponse.json(status);
}
