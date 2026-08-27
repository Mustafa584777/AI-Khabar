import { ServerStorage } from '@/lib/server-storage';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [allPosts, allCategories, allTags, settings] = await Promise.all([
      ServerStorage.getAllPosts(true),
      ServerStorage.getAllCategories(),
      ServerStorage.getAllTags(),
      ServerStorage.getSettings(),
    ]);

    const backupPayload = {
      version: '1.2',
      backupType: 'full_prompts_archive',
      exportedAt: new Date().toISOString(),
      site: 'tool.reelz',
      totalPrompts: allPosts.length,
      totalCategories: allCategories.length,
      posts: allPosts,
      categories: allCategories,
      tags: allTags,
      settings,
    };

    return NextResponse.json(
      { success: true, ...backupPayload },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Disposition': `attachment; filename="prompts-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawList: any[] = [];

    if (Array.isArray(body)) {
      rawList = body;
    } else if (body && typeof body === 'object') {
      if (Array.isArray(body.posts)) rawList = body.posts;
      else if (Array.isArray(body.prompts)) rawList = body.prompts;
      else if (Array.isArray(body.data)) rawList = body.data;
      else if (Array.isArray(body.items)) rawList = body.items;
      else if (Array.isArray(body.cards)) rawList = body.cards;
      else if (Array.isArray(body.records)) rawList = body.records;
      else {
        rawList = Object.values(body).filter(
          (v: any) => v && typeof v === 'object' && (v.prompt || v.promptText || v.title)
        );
      }
    }

    const incomingPosts = rawList
      .map((item: any, idx: number) => {
        if (!item || typeof item !== 'object') return null;
        const promptText = (
          item.promptText ||
          item.prompt ||
          item.text ||
          item.content ||
          item.body ||
          item.description ||
          ''
        )
          .toString()
          .trim();
        const title = (
          item.title ||
          item.name ||
          item.heading ||
          item.subject ||
          (promptText ? promptText.slice(0, 45) : `Prompt #${idx + 1}`)
        )
          .toString()
          .trim();

        if (!promptText && !title) return null;

        const id = (
          item.id ||
          item._id ||
          `prompt-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`
        ).toString();
        const category = (
          item.category ||
          item.cat ||
          (Array.isArray(item.categories) ? item.categories[0] : null) ||
          'General'
        ).toString();
        const aiTool = (item.aiTool || item.tool || item.model || 'ChatGPT').toString();
        const imageUrl = (
          item.imageUrl ||
          item.image ||
          item.img ||
          item.thumbnail ||
          item.photo ||
          ''
        ).toString();

        let tags: string[] = [];
        if (Array.isArray(item.tags)) {
          tags = item.tags.map((t: any) => String(t).trim()).filter(Boolean);
        } else if (typeof item.tags === 'string') {
          tags = item.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
        if (tags.length === 0) tags = ['AI Prompt'];

        return {
          id,
          title: title || 'Untitled Prompt',
          slug: item.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          category,
          aiTool,
          promptText: promptText || title,
          negativePrompt: (item.negativePrompt || item.negative || '').toString(),
          imageUrl,
          imageAlt: (item.imageAlt || title).toString(),
          imageFileName: item.imageFileName,
          additionalImages: Array.isArray(item.additionalImages) ? item.additionalImages : [],
          parameters: typeof item.parameters === 'object' && item.parameters ? item.parameters : {},
          variables: Array.isArray(item.variables) ? item.variables : [],
          articleContent: (item.articleContent || item.article || '').toString(),
          tags,
          status: item.status === 'draft' ? 'draft' : 'published',
          isFeatured: Boolean(item.isFeatured),
          isTrending: Boolean(item.isTrending),
          viewsCount: Number(item.viewsCount) || 0,
          copiesCount: Number(item.copiesCount) || 0,
          likesCount: Number(item.likesCount) || 0,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: item.publishedAt || new Date().toISOString(),
        };
      })
      .filter((p): p is any => p !== null && p.title.length > 0 && p.promptText.length > 0);

    if (!incomingPosts || incomingPosts.length === 0) {
      return NextResponse.json(
        { error: 'No valid prompt cards found in the uploaded backup file.' },
        { status: 400 }
      );
    }

    const mode = body.mode === 'replace' ? 'replace' : 'merge';
    const updatedPosts = await ServerStorage.restorePosts(incomingPosts, mode);

    // If incoming categories were also supplied, save them
    if (Array.isArray(body.categories) && body.categories.length > 0) {
      for (const cat of body.categories) {
        if (cat && cat.name) {
          try {
            await ServerStorage.saveCategory(cat);
          } catch {
            // ignore
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully restored ${incomingPosts.length} prompt cards (${mode} mode)`,
      count: updatedPosts.length,
      posts: updatedPosts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
