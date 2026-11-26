import { NextRequest, NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import { pushPostsJsonToGitHub, resolveGitHubSiteRepoConfig } from '@/lib/github-assets-server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const cfg = resolveGitHubSiteRepoConfig();
  return NextResponse.json({
    configured: cfg.isConfigured,
    owner: cfg.owner,
    repo: cfg.repo,
    branch: cfg.branch,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const posts = await ServerStorage.getFirebasePosts();

    const extraFiles: Array<{ path: string; content: string }> = [];
    try {
      const redirectsPath = path.join(process.cwd(), 'data', 'media-redirects.json');
      if (fs.existsSync(redirectsPath)) {
        const content = fs.readFileSync(redirectsPath, 'utf-8');
        if (content && content.trim().length > 2) {
          extraFiles.push({ path: 'data/media-redirects.json', content });
        }
      }
    } catch {}

    const commitMessage =
      typeof body?.message === 'string' && body.message.trim()
        ? body.message.trim()
        : undefined;

    const result = await pushPostsJsonToGitHub(posts, commitMessage, extraFiles);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to push posts.json to GitHub',
          repo: result.repo,
          branch: result.branch,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      commitSha: result.commitSha,
      repo: result.repo,
      branch: result.branch,
      count: result.count,
      message: `Pushed ${result.count} prompts to ${result.repo} (${result.branch})!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to push posts.json to GitHub' },
      { status: 500 }
    );
  }
}
