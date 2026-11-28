import { PromptPost } from '@/types/prompt';
import defaultPostsData from '@/data/posts.json';
import { hydrateCompactPosts } from './post-normalizer';

export {
  INITIAL_CATEGORIES,
  INITIAL_NOTIFICATIONS,
  INITIAL_SETTINGS,
} from './site-defaults';

export const INITIAL_POSTS: PromptPost[] = hydrateCompactPosts(defaultPostsData);
