# Implementation Plan - Fix Prompt Flickering and Stale Cache Overrides

## Problem Analysis
Prompts added by the user temporarily appear, disappear, reappear, and eventually vanish after 12 hours (due to client localStorage cache expiration) or get overwritten by stale server memory cache and un-synced Firestore states. Deleted prompts also briefly reappear because tombstone tracking was lagging behind cache refreshes.

## Proposed Solution
1. **Unified Storage Truth & Cache Bypassing**:
   - Update `StorageService.getCachedPosts()` in `lib/storage.ts` and `ServerStorage.getAllPosts()` in `lib/server-storage.ts` so that newly created/saved prompts are merged instantly and never overwritten by stale TTL cache.
   - Disable or bypass aggressive 12-hour/24-hour TTL caching when local updates or remote sync occur, ensuring newly added or removed posts persist permanently.

2. **Robust Tombstone (Deleted ID) Synchronisation**:
   - Ensure deleted post IDs (`promptcms_deleted_ids` and `deleted_posts.json`) are checked and filtered immediately on every read, client and server side, preventing deleted prompts from ever reappearing.

3. **Client-Server State Reconciliation**:
   - Update `AppContext.tsx` `syncFromRemote()` and `savePost()` to merge incoming remote posts with local optimistic state instead of replacing state blindly.

## Proposed Changes

### `lib/storage.ts`
- Update `getCachedPosts()` to ensure deleted IDs and newly saved local posts are prioritized over stale cache.

### `lib/server-storage.ts`
- Update `getAllPosts()` and `savePost()` to maintain persistent consistency and prevent stale memory cache overrides.

### `context/AppContext.tsx`
- Refine state synchronization to prevent background remote syncs from overwriting optimistic local additions/deletions.

## Verification Plan
- Create a new prompt and verify it persists across page reloads and background syncs.
- Delete a prompt and verify it is permanently removed without flickering or reappearing.
