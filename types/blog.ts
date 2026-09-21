export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  coverImage: string;
  imageAlt?: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  publishedAt: string;
  tags: string[];
  content: string;
  featured?: boolean;
}
