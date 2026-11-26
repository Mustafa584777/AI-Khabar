import { NextRequest, NextResponse } from 'next/server';
import {
  readCommentsFromGitHub,
  addCommentToGitHub,
  deleteCommentFromGitHub,
  sanitizeCommentPostId,
} from '@/lib/github-assets-server';
import { checkRateLimit, createRateLimitResponse, getClientIp, sanitizePayload } from '@/lib/security';
import { ServerStorage } from '@/lib/server-storage';
import { PromptComment } from '@/types/prompt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = sanitizeCommentPostId(searchParams.get('postId') || '');
    if (!postId) {
      return NextResponse.json({ success: false, error: 'Missing postId' }, { status: 400 });
    }

    const comments = await readCommentsFromGitHub(postId);
    return NextResponse.json(
      { success: true, comments },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load comments' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const ipLimit = checkRateLimit('auth', `comment_ip_${clientIp}`, {
    maxRequests: 10,
    windowMs: 60 * 1000,
  });
  if (!ipLimit.allowed) {
    return createRateLimitResponse(ipLimit.resetInMs);
  }

  try {
    const rawBody = await req.json();
    const body = sanitizePayload(rawBody);

    const postId = sanitizeCommentPostId(body?.postId || '');
    const userId = typeof body?.userId === 'string' ? body.userId.trim().slice(0, 120) : '';
    const userEmail = typeof body?.userEmail === 'string' ? body.userEmail.trim().toLowerCase() : '';
    const rawName = typeof body?.userName === 'string' ? body.userName.trim() : '';
    const userAvatar = typeof body?.userAvatar === 'string' ? body.userAvatar.trim().slice(0, 500) : undefined;
    const rawText = typeof body?.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : '';

    if (!postId) {
      return NextResponse.json({ success: false, error: 'Invalid post ID' }, { status: 400 });
    }

    if (!userId || !userEmail || !userEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please sign in to post a comment.' },
        { status: 401 }
      );
    }

    // Per-user cooldown to protect GitHub API from spam
    const userLimit = checkRateLimit('auth', `comment_user_${userId}`, {
      maxRequests: 4,
      windowMs: 60 * 1000,
    });
    if (!userLimit.allowed) {
      return createRateLimitResponse(userLimit.resetInMs);
    }

    if (rawText.length < 2 || rawText.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Comment must be between 2 and 500 characters.' },
        { status: 400 }
      );
    }

    // Optional profile lookup to resolve authoritative display name without storing email publicly
    let displayName = rawName;
    try {
      const profile = await ServerStorage.getUserProfile(userEmail, userId);
      if (profile?.name && typeof profile.name === 'string' && profile.name.trim()) {
        displayName = profile.name.trim();
      }
    } catch {}

    if (!displayName) {
      displayName = userEmail.split('@')[0] || 'Creator';
    }
    displayName = displayName.slice(0, 60);

    // Prevent identical duplicate spam within recent comments
    const existingComments = await readCommentsFromGitHub(postId);
    const duplicateRecent = existingComments.find(
      (c) =>
        c.userId === userId &&
        c.text.toLowerCase() === rawText.toLowerCase() &&
        Date.now() - new Date(c.createdAt).getTime() < 2 * 60 * 1000
    );
    if (duplicateRecent) {
      return NextResponse.json(
        { success: false, error: 'Duplicate comment detected. Please wait a moment.' },
        { status: 429 }
      );
    }

    const safeAvatar =
      userAvatar && (userAvatar.startsWith('https://') || userAvatar.startsWith('/'))
        ? userAvatar
        : undefined;

    const newComment: PromptComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      postId,
      userId,
      userName: displayName,
      userAvatar: safeAvatar,
      text: rawText,
      createdAt: new Date().toISOString(),
    };

    const saveRes = await addCommentToGitHub(postId, newComment);
    if (!saveRes.success) {
      return NextResponse.json(
        { success: false, error: saveRes.error || 'Failed to save comment to GitHub' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: newComment,
      comments: saveRes.comments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to post comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const clientIp = getClientIp(req);
  const ipLimit = checkRateLimit('auth', `comment_del_${clientIp}`, {
    maxRequests: 15,
    windowMs: 60 * 1000,
  });
  if (!ipLimit.allowed) {
    return createRateLimitResponse(ipLimit.resetInMs);
  }

  try {
    const rawBody = await req.json();
    const body = sanitizePayload(rawBody);
    const postId = sanitizeCommentPostId(body?.postId || '');
    const commentId = typeof body?.commentId === 'string' ? body.commentId.trim() : '';
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';

    if (!postId || !commentId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing commentId, postId, or userId' },
        { status: 400 }
      );
    }

    const res = await deleteCommentFromGitHub(postId, commentId, userId);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || 'Failed to delete comment' },
        { status: res.error?.includes('own comments') ? 403 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comments: res.comments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
