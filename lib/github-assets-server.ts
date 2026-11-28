import { Category, PromptComment, PromptPost, SiteSettings } from '@/types/prompt';
import { getPromptSlug } from './utils';
import { compactPostsForJson, hydrateCompactPosts } from './post-normalizer';

export interface GitHubAssetsConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  isConfigured: boolean;
  cdnBaseUrl: string;
}

const DEFAULT_OWNER = 'Mustafa584777';
const DEFAULT_REPO = 'zeena-prompt-assets';
const DEFAULT_BRANCH = 'main';

const DEFAULT_SITE_OWNER = 'Mustafa584777';
const DEFAULT_SITE_REPO = 'AI-Khabar';
const DEFAULT_SITE_BRANCH = 'main';

export function resolveGitHubAssetsConfig(): GitHubAssetsConfig {
  const token = (process.env.GITHUB_ASSETS_TOKEN || '').trim().replace(/^["']|["']$/g, '');
  const owner = (process.env.GITHUB_ASSETS_OWNER || DEFAULT_OWNER).trim().replace(/^["']|["']$/g, '') || DEFAULT_OWNER;
  const repo = (process.env.GITHUB_ASSETS_REPO || DEFAULT_REPO).trim().replace(/^["']|["']$/g, '') || DEFAULT_REPO;
  const branch = (process.env.GITHUB_ASSETS_BRANCH || DEFAULT_BRANCH).trim().replace(/^["']|["']$/g, '') || DEFAULT_BRANCH;

  return {
    token,
    owner,
    repo,
    branch,
    isConfigured: Boolean(token && owner && repo),
    cdnBaseUrl: `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}`,
  };
}

export function resolveGitHubSiteRepoConfig(): GitHubAssetsConfig {
  const token = (
    process.env.GITHUB_SITE_TOKEN ||
    process.env.GITHUB_ASSETS_TOKEN ||
    ''
  )
    .trim()
    .replace(/^["']|["']$/g, '');
  const owner =
    (process.env.GITHUB_SITE_OWNER || DEFAULT_SITE_OWNER).trim().replace(/^["']|["']$/g, '') ||
    DEFAULT_SITE_OWNER;
  const repo =
    (process.env.GITHUB_SITE_REPO || DEFAULT_SITE_REPO).trim().replace(/^["']|["']$/g, '') ||
    DEFAULT_SITE_REPO;
  const branch =
    (process.env.GITHUB_SITE_BRANCH || DEFAULT_SITE_BRANCH).trim().replace(/^["']|["']$/g, '') ||
    DEFAULT_SITE_BRANCH;

  return {
    token,
    owner,
    repo,
    branch,
    isConfigured: Boolean(token && owner && repo),
    cdnBaseUrl: `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}`,
  };
}

export function buildJsDelivrUrl(assetPath: string, config?: Partial<GitHubAssetsConfig>): string {
  const resolved = resolveGitHubAssetsConfig();
  const owner = config?.owner || resolved.owner;
  const repo = config?.repo || resolved.repo;
  const branch = config?.branch || resolved.branch;
  const cleanPath = assetPath.replace(/^\/+/, '');
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${cleanPath}`;
}

export function extractCloudinaryAssetPath(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('res.cloudinary.com/') || !url.includes('/image/upload/')) return null;

  try {
    const [, afterUpload] = url.split('/image/upload/');
    if (!afterUpload) return null;

    const cleanAfter = afterUpload.split('?')[0].replace(/^\/+/, '');
    const segments = cleanAfter.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    // Strip optional Cloudinary transformation segment (e.g. f_auto,q_auto:good,w_550,c_limit)
    const first = segments[0];
    if (
      first.includes(',') ||
      /^(f|q|w|h|c|dpr|e|g|fl|ar|bo|b|co|l|o|r|t|u|x|y|z)_/i.test(first)
    ) {
      segments.shift();
    }

    // Strip optional version segment (e.g. v1795329908)
    if (segments.length > 0 && /^v\d+$/i.test(segments[0])) {
      segments.shift();
    }

    if (segments.length === 0) return null;
    return segments.join('/');
  } catch {
    return null;
  }
}

export function convertCloudinaryUrlToJsDelivr(url?: string): string | null {
  const assetPath = extractCloudinaryAssetPath(url);
  if (!assetPath) return null;
  return buildJsDelivrUrl(assetPath);
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'zeena-prompt-assets-uploader',
    'Content-Type': 'application/json',
  };
}

export async function testGitHubAssetsConnection(): Promise<{
  configured: boolean;
  success: boolean;
  owner: string;
  repo: string;
  branch: string;
  cdnBaseUrl: string;
  canPush?: boolean;
  error?: string;
}> {
  const cfg = resolveGitHubAssetsConfig();
  if (!cfg.isConfigured) {
    return {
      configured: false,
      success: false,
      owner: cfg.owner,
      repo: cfg.repo,
      branch: cfg.branch,
      cdnBaseUrl: cfg.cdnBaseUrl,
      error: 'GITHUB_ASSETS_TOKEN is not configured in environment variables.',
    };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, {
      headers: githubHeaders(cfg.token),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        configured: true,
        success: false,
        owner: cfg.owner,
        repo: cfg.repo,
        branch: cfg.branch,
        cdnBaseUrl: cfg.cdnBaseUrl,
        error: data?.message || `GitHub API returned status ${res.status}`,
      };
    }

    const canPush = data?.permissions?.push !== false;
    return {
      configured: true,
      success: canPush,
      owner: cfg.owner,
      repo: cfg.repo,
      branch: cfg.branch,
      cdnBaseUrl: cfg.cdnBaseUrl,
      canPush,
      error: canPush ? undefined : 'Token does not have write/push permissions on this repository.',
    };
  } catch (err: any) {
    return {
      configured: true,
      success: false,
      owner: cfg.owner,
      repo: cfg.repo,
      branch: cfg.branch,
      cdnBaseUrl: cfg.cdnBaseUrl,
      error: err?.message || 'Failed to connect to GitHub API',
    };
  }
}

export async function getGitHubAssetsTreeWithHead(): Promise<{
  headCommitSha?: string;
  blobs: Set<string>;
}> {
  const cfg = resolveGitHubAssetsConfig();
  if (!cfg.isConfigured) return { blobs: new Set() };

  try {
    const [refRes, treeRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/refs/heads/${encodeURIComponent(cfg.branch)}`,
        {
          headers: githubHeaders(cfg.token),
          cache: 'no-store',
        }
      ).catch(() => null),
      fetch(
        `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/trees/${encodeURIComponent(cfg.branch)}?recursive=1`,
        {
          headers: githubHeaders(cfg.token),
          cache: 'no-store',
        }
      ),
    ]);

    let headCommitSha: string | undefined;
    if (refRes && refRes.ok) {
      const refJson = await refRes.json().catch(() => null);
      if (typeof refJson?.object?.sha === 'string') {
        headCommitSha = refJson.object.sha;
      }
    }

    if (treeRes.status === 404 || treeRes.status === 409 || !treeRes.ok) {
      return { headCommitSha, blobs: new Set() };
    }

    const data = await treeRes.json();
    const blobs = new Set<string>();
    if (Array.isArray(data?.tree)) {
      for (const entry of data.tree) {
        if (entry?.type === 'blob' && typeof entry.path === 'string') {
          blobs.add(entry.path);
        }
      }
    }
    return { headCommitSha, blobs };
  } catch {
    return { blobs: new Set() };
  }
}

export async function listGitHubAssetPaths(): Promise<Set<string>> {
  const { blobs } = await getGitHubAssetsTreeWithHead();
  return blobs;
}

function normalizeMimeExtension(mimeOrExt?: string): string {
  const clean = (mimeOrExt || '').toLowerCase().replace(/^image\//, '').replace(/[^a-z0-9]/g, '');
  if (!clean || clean === 'jpeg' || clean === 'pjpeg') return 'jpg';
  if (clean === 'svg+xml') return 'svg';
  return clean;
}

async function resolveImageToBase64(image: string): Promise<{ base64: string; ext: string }> {
  const dataUriMatch = image.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (dataUriMatch) {
    return {
      ext: normalizeMimeExtension(dataUriMatch[1]),
      base64: dataUriMatch[2],
    };
  }

  if (/^https?:\/\//i.test(image)) {
    const res = await fetch(image);
    if (!res.ok) {
      throw new Error(`Failed to fetch remote image (${res.status})`);
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const arrBuf = await res.arrayBuffer();
    const base64 = Buffer.from(arrBuf).toString('base64');
    return {
      ext: normalizeMimeExtension(contentType.split(';')[0]),
      base64,
    };
  }

  // Raw base64 fallback
  return {
    ext: 'webp',
    base64: image.replace(/^data:[^;]+;base64,/, ''),
  };
}

function sanitizeAssetPath(folder: string, fileName: string): string {
  const cleanFolder = folder
    .replace(/\\/g, '/')
    .split('/')
    .map((s) => s.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('/');

  const cleanFile = fileName.replace(/\\/g, '/').split('/').pop()?.replace(/[^a-zA-Z0-9._-]/g, '-') || `img-${Date.now()}.webp`;
  return cleanFolder ? `${cleanFolder}/${cleanFile}` : cleanFile;
}

export async function uploadImageToGitHubAssets(
  image: string,
  options?: { folder?: string; publicId?: string; exactPath?: string }
): Promise<{ success: boolean; url: string; path?: string; error?: string }> {
  try {
    if (!image || typeof image !== 'string') {
      return { success: false, url: image, error: 'No image data provided' };
    }

    const cfg = resolveGitHubAssetsConfig();
    if (!cfg.isConfigured) {
      return {
        success: false,
        url: image,
        error: 'GitHub Assets storage is not configured (missing GITHUB_ASSETS_TOKEN)',
      };
    }

    const { base64, ext } = await resolveImageToBase64(image);

    let targetPath: string;
    if (options?.exactPath) {
      targetPath = options.exactPath.replace(/^\/+/, '').replace(/\\/g, '/');
    } else {
      const folder = (options?.folder || 'prompts').trim() || 'prompts';
      const baseId = (options?.publicId || `prompt-${Date.now()}`)
        .replace(/\.(jpg|jpeg|png|webp|gif|avif)$/i, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 100);
      targetPath = sanitizeAssetPath(folder, `${baseId}.${ext}`);
    }

    const encodedPath = targetPath
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodedPath}`;

    const performPut = async (sha?: string) => {
      const putBody: Record<string, any> = {
        message: `Upload asset ${targetPath}`,
        content: base64,
        branch: cfg.branch,
      };
      if (sha) {
        putBody.sha = sha;
      }
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: githubHeaders(cfg.token),
        body: JSON.stringify(putBody),
      });
      const data = await res.json().catch(() => ({}));
      return { res, data };
    };

    const fetchLatestSha = async (): Promise<string | undefined> => {
      try {
        const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(cfg.branch)}`, {
          headers: githubHeaders(cfg.token),
          cache: 'no-store',
        });
        if (getRes.ok) {
          const existingJson = await getRes.json();
          return existingJson?.sha || undefined;
        }
      } catch {}
      return undefined;
    };

    const existingSha = await fetchLatestSha();
    let { res: putRes, data: putData } = await performPut(existingSha);

    // Retry once on 409 Conflict or 422 stale SHA (e.g. concurrent upload or just-created file)
    if (!putRes.ok && (putRes.status === 409 || putRes.status === 422)) {
      const refreshedSha = await fetchLatestSha();
      if (refreshedSha && refreshedSha !== existingSha) {
        const retry = await performPut(refreshedSha);
        putRes = retry.res;
        putData = retry.data;
      }
    }

    if (!putRes.ok) {
      return {
        success: false,
        url: image,
        error: putData?.message || `GitHub upload failed with status ${putRes.status}`,
      };
    }

    // Use commit SHA in jsDelivr URL so newly replaced images bypass @main edge cache immediately (0s freshness)
    const commitSha: string | undefined = putData?.commit?.sha;
    const cdnUrl = commitSha
      ? buildJsDelivrUrl(targetPath, { ...cfg, branch: commitSha })
      : buildJsDelivrUrl(targetPath, cfg);

    // Best-effort non-blocking purge for @branch URL as well
    void fetch(`https://purge.jsdelivr.net/gh/${cfg.owner}/${cfg.repo}@${cfg.branch}/${targetPath}`).catch(() => {});

    return {
      success: true,
      url: cdnUrl,
      path: targetPath,
    };
  } catch (err: any) {
    console.warn('GitHub Assets upload error:', err?.message || err);
    return {
      success: false,
      url: image,
      error: err?.message || 'Failed to upload image to GitHub Assets',
    };
  }
}

export async function uploadBatchToGitHubAssets(
  items: Array<{ path: string; contentBase64: string }>
): Promise<{
  success: boolean;
  uploadedPaths: string[];
  cdnUrls: Record<string, string>;
  error?: string;
}> {
  const cfg = resolveGitHubAssetsConfig();
  if (!cfg.isConfigured) {
    return {
      success: false,
      uploadedPaths: [],
      cdnUrls: {},
      error: 'GITHUB_ASSETS_TOKEN is not configured',
    };
  }

  if (!items || items.length === 0) {
    return { success: true, uploadedPaths: [], cdnUrls: {} };
  }

  try {
    // 1. Check current branch HEAD commit
    const refUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/refs/heads/${encodeURIComponent(cfg.branch)}`;
    let refRes = await fetch(refUrl, {
      headers: githubHeaders(cfg.token),
      cache: 'no-store',
    });

    // If repository is completely empty, initialize branch using the first item via Contents API
    let remainingItems = [...items];
    const uploadedPaths: string[] = [];
    const cdnUrls: Record<string, string> = {};

    if (refRes.status === 404 || refRes.status === 409) {
      const first = remainingItems.shift()!;
      const cleanFirstPath = first.path.replace(/^\/+/, '').replace(/\\/g, '/');
      const initRes = await uploadImageToGitHubAssets(`data:image/jpeg;base64,${first.contentBase64.replace(/^data:[^;]+;base64,/, '')}`, {
        exactPath: cleanFirstPath,
      });
      if (!initRes.success) {
        return {
          success: false,
          uploadedPaths: [],
          cdnUrls: {},
          error: initRes.error || 'Failed to initialize empty GitHub repository',
        };
      }
      uploadedPaths.push(cleanFirstPath);
      cdnUrls[cleanFirstPath] = initRes.url;

      if (remainingItems.length === 0) {
        return { success: true, uploadedPaths, cdnUrls };
      }

      refRes = await fetch(refUrl, {
        headers: githubHeaders(cfg.token),
        cache: 'no-store',
      });
    }

    if (!refRes.ok) {
      const refErr = await refRes.json().catch(() => ({}));
      return {
        success: false,
        uploadedPaths,
        cdnUrls,
        error: refErr?.message || `Failed to read branch ref (${refRes.status})`,
      };
    }

    const refData = await refRes.json();
    const latestCommitSha: string = refData?.object?.sha;
    if (!latestCommitSha) {
      return {
        success: false,
        uploadedPaths,
        cdnUrls,
        error: 'Could not determine latest commit SHA on branch',
      };
    }

    // 2. Get base tree SHA from latest commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/commits/${latestCommitSha}`,
      { headers: githubHeaders(cfg.token), cache: 'no-store' }
    );
    const commitData = await commitRes.json().catch(() => ({}));
    const baseTreeSha: string = commitData?.tree?.sha;
    if (!commitRes.ok || !baseTreeSha) {
      return {
        success: false,
        uploadedPaths,
        cdnUrls,
        error: commitData?.message || 'Failed to read commit base tree',
      };
    }

    // 3. Create Git blobs concurrently (limited to batch size e.g. 10-15)
    const treeEntries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = [];
    for (const item of remainingItems) {
      const cleanPath = item.path.replace(/^\/+/, '').replace(/\\/g, '/');
      const rawBase64 = item.contentBase64.replace(/^data:[^;]+;base64,/, '');

      const blobRes = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/blobs`, {
        method: 'POST',
        headers: githubHeaders(cfg.token),
        body: JSON.stringify({
          content: rawBase64,
          encoding: 'base64',
        }),
      });
      const blobData = await blobRes.json().catch(() => ({}));
      if (!blobRes.ok || !blobData?.sha) {
        throw new Error(blobData?.message || `Failed to create blob for ${cleanPath}`);
      }

      treeEntries.push({
        path: cleanPath,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    }

    // 4. Create new tree
    const treeRes = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/trees`, {
      method: 'POST',
      headers: githubHeaders(cfg.token),
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeEntries,
      }),
    });
    const treeData = await treeRes.json().catch(() => ({}));
    if (!treeRes.ok || !treeData?.sha) {
      throw new Error(treeData?.message || 'Failed to create Git tree');
    }

    // 5. Create new commit
    const newCommitRes = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/commits`, {
      method: 'POST',
      headers: githubHeaders(cfg.token),
      body: JSON.stringify({
        message: `Migrate ${treeEntries.length} prompt assets to GitHub CDN`,
        tree: treeData.sha,
        parents: [latestCommitSha],
      }),
    });
    const newCommitData = await newCommitRes.json().catch(() => ({}));
    if (!newCommitRes.ok || !newCommitData?.sha) {
      throw new Error(newCommitData?.message || 'Failed to create Git commit');
    }

    // 6. Update branch ref
    const updateRefRes = await fetch(refUrl, {
      method: 'PATCH',
      headers: githubHeaders(cfg.token),
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: false,
      }),
    });
    const updateRefData = await updateRefRes.json().catch(() => ({}));
    if (!updateRefRes.ok) {
      throw new Error(updateRefData?.message || 'Failed to update branch ref');
    }

    for (const entry of treeEntries) {
      uploadedPaths.push(entry.path);
      cdnUrls[entry.path] = buildJsDelivrUrl(entry.path, { ...cfg, branch: newCommitData.sha });
    }

    return {
      success: true,
      uploadedPaths,
      cdnUrls,
    };
  } catch (err: any) {
    return {
      success: false,
      uploadedPaths: [],
      cdnUrls: {},
      error: err?.message || 'Batch GitHub upload failed',
    };
  }
}

export function rewritePostMediaUrls(post: PromptPost): { post: PromptPost; changed: boolean } {
  let changed = false;
  let nextImageUrl = post.imageUrl;

  if (nextImageUrl && nextImageUrl.includes('res.cloudinary.com/')) {
    const converted = convertCloudinaryUrlToJsDelivr(nextImageUrl);
    if (converted && converted !== nextImageUrl) {
      nextImageUrl = converted;
      changed = true;
    }
  }

  let nextAdditional = post.additionalImages;
  if (Array.isArray(post.additionalImages) && post.additionalImages.length > 0) {
    const mapped = post.additionalImages.map((u) => {
      if (u && u.includes('res.cloudinary.com/')) {
        const converted = convertCloudinaryUrlToJsDelivr(u);
        if (converted && converted !== u) {
          changed = true;
          return converted;
        }
      }
      return u;
    });
    nextAdditional = mapped;
  }

  if (!changed) {
    return { post, changed: false };
  }

  return {
    changed: true,
    post: {
      ...post,
      imageUrl: nextImageUrl,
      additionalImages: nextAdditional,
    },
  };
}

export async function pushFilesToGitHubRepo(
  files: Array<{ path: string; content: string }>,
  commitMessage: string,
  overrideConfig?: Partial<GitHubAssetsConfig>
): Promise<{
  success: boolean;
  commitSha?: string;
  repo: string;
  branch: string;
  error?: string;
}> {
  const baseCfg = resolveGitHubSiteRepoConfig();
  const cfg: GitHubAssetsConfig = {
    ...baseCfg,
    ...overrideConfig,
    token: overrideConfig?.token || baseCfg.token,
    owner: overrideConfig?.owner || baseCfg.owner,
    repo: overrideConfig?.repo || baseCfg.repo,
    branch: overrideConfig?.branch || baseCfg.branch,
    isConfigured: Boolean(
      (overrideConfig?.token || baseCfg.token) &&
        (overrideConfig?.owner || baseCfg.owner) &&
        (overrideConfig?.repo || baseCfg.repo)
    ),
  };

  const repoFullName = `${cfg.owner}/${cfg.repo}`;

  if (!cfg.isConfigured) {
    return {
      success: false,
      repo: repoFullName,
      branch: cfg.branch,
      error: 'GitHub token is not configured (set GITHUB_SITE_TOKEN or GITHUB_ASSETS_TOKEN).',
    };
  }

  if (!files || files.length === 0) {
    return { success: true, repo: repoFullName, branch: cfg.branch };
  }

  const attemptPush = async (): Promise<{
    success: boolean;
    retryable?: boolean;
    commitSha?: string;
    error?: string;
  }> => {
    const refUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/refs/heads/${encodeURIComponent(cfg.branch)}`;
    const refRes = await fetch(refUrl, {
      headers: githubHeaders(cfg.token),
      cache: 'no-store',
    });

    const refData = await refRes.json().catch(() => ({}));
    if (!refRes.ok || !refData?.object?.sha) {
      if (refRes.status === 404 || refRes.status === 403) {
        return {
          success: false,
          error: `Token does not have access to ${repoFullName} (branch "${cfg.branch}"). Update your GitHub token to include ${repoFullName} with Contents: Read & Write permission, or set GITHUB_SITE_TOKEN.`,
        };
      }
      return {
        success: false,
        error: refData?.message || `Failed to read branch ref (${refRes.status})`,
      };
    }

    const latestCommitSha: string = refData.object.sha;

    const commitRes = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/commits/${latestCommitSha}`,
      { headers: githubHeaders(cfg.token), cache: 'no-store' }
    );
    const commitData = await commitRes.json().catch(() => ({}));
    const baseTreeSha: string | undefined = commitData?.tree?.sha;
    if (!commitRes.ok || !baseTreeSha) {
      return {
        success: false,
        error: commitData?.message || 'Failed to read commit base tree',
      };
    }

    const treeEntries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = [];
    for (const file of files) {
      const cleanPath = file.path.replace(/^\/+/, '').replace(/\\/g, '/');
      const contentBase64 = Buffer.from(file.content, 'utf-8').toString('base64');

      const blobRes = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/blobs`, {
        method: 'POST',
        headers: githubHeaders(cfg.token),
        body: JSON.stringify({
          content: contentBase64,
          encoding: 'base64',
        }),
      });
      const blobData = await blobRes.json().catch(() => ({}));
      if (!blobRes.ok || !blobData?.sha) {
        return {
          success: false,
          error: blobData?.message || `Failed to create Git blob for ${cleanPath}`,
        };
      }

      treeEntries.push({
        path: cleanPath,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    }

    const treeRes = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/trees`, {
      method: 'POST',
      headers: githubHeaders(cfg.token),
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeEntries,
      }),
    });
    const treeData = await treeRes.json().catch(() => ({}));
    if (!treeRes.ok || !treeData?.sha) {
      return {
        success: false,
        error: treeData?.message || 'Failed to create Git tree',
      };
    }

    const newCommitRes = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/commits`, {
      method: 'POST',
      headers: githubHeaders(cfg.token),
      body: JSON.stringify({
        message: commitMessage,
        tree: treeData.sha,
        parents: [latestCommitSha],
      }),
    });
    const newCommitData = await newCommitRes.json().catch(() => ({}));
    if (!newCommitRes.ok || !newCommitData?.sha) {
      return {
        success: false,
        error: newCommitData?.message || 'Failed to create Git commit',
      };
    }

    const updateRefRes = await fetch(refUrl, {
      method: 'PATCH',
      headers: githubHeaders(cfg.token),
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: false,
      }),
    });
    const updateRefData = await updateRefRes.json().catch(() => ({}));
    if (!updateRefRes.ok) {
      return {
        success: false,
        retryable: updateRefRes.status === 409 || updateRefRes.status === 422,
        error: updateRefData?.message || `Failed to update branch ref (${updateRefRes.status})`,
      };
    }

    return {
      success: true,
      commitSha: newCommitData.sha,
    };
  };

  try {
    let result = await attemptPush();
    if (!result.success && result.retryable) {
      result = await attemptPush();
    }

    return {
      success: result.success,
      commitSha: result.commitSha,
      repo: repoFullName,
      branch: cfg.branch,
      error: result.error,
    };
  } catch (err: any) {
    return {
      success: false,
      repo: repoFullName,
      branch: cfg.branch,
      error: err?.message || 'Failed to push files to GitHub repository',
    };
  }
}

export function buildCleanPostsPayload(rawPosts: PromptPost[]): {
  allPosts: PromptPost[];
  initialFeed: PromptPost[];
} {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const cleanPosts: PromptPost[] = [];

  const sorted = [...(Array.isArray(rawPosts) ? rawPosts : [])].sort(
    (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
  );

  for (const p of sorted) {
    if (!p || !p.id) continue;
    const slug = getPromptSlug(p);
    if (!seenIds.has(p.id) && !seenSlugs.has(slug)) {
      seenIds.add(p.id);
      seenSlugs.add(slug);

      const { post: rewritten } = rewritePostMediaUrls({
        ...p,
        slug,
      });

      cleanPosts.push(rewritten);
    }
  }

  const initialFeed = cleanPosts
    .filter((p) => p.status === 'published')
    .sort(
      (a, b) =>
        new Date(b.publishedAt || b.createdAt || 0).getTime() -
        new Date(a.publishedAt || a.createdAt || 0).getTime()
    )
    .slice(0, 16);

  return { allPosts: cleanPosts, initialFeed };
}

export async function fetchPostsJsonFromGitHub(
  overrideConfig?: Partial<GitHubAssetsConfig>
): Promise<PromptPost[] | null> {
  const baseCfg = resolveGitHubSiteRepoConfig();
  const cfg: GitHubAssetsConfig = {
    ...baseCfg,
    ...overrideConfig,
    token: overrideConfig?.token || baseCfg.token,
    owner: overrideConfig?.owner || baseCfg.owner,
    repo: overrideConfig?.repo || baseCfg.repo,
    branch: overrideConfig?.branch || baseCfg.branch,
  };

  // 1. Authenticated GitHub API read (bypasses raw CDN cache & supports >1MB blobs)
  if (cfg.token && cfg.owner && cfg.repo) {
    try {
      const metaRes = await fetch(
        `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/data/posts.json?ref=${encodeURIComponent(cfg.branch)}`,
        {
          headers: githubHeaders(cfg.token),
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        }
      );

      if (metaRes.ok) {
        const meta = await metaRes.json().catch(() => null);
        if (meta && typeof meta.content === 'string' && meta.content.length > 0) {
          const decoded = Buffer.from(meta.content.replace(/\n/g, ''), 'base64').toString('utf-8');
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed)) return hydrateCompactPosts(parsed);
        }
        if (meta && typeof meta.sha === 'string') {
          const blobRes = await fetch(
            `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/blobs/${meta.sha}`,
            {
              headers: {
                ...githubHeaders(cfg.token),
                Accept: 'application/vnd.github.raw+json',
              },
              cache: 'no-store',
              signal: AbortSignal.timeout(10000),
            }
          );
          if (blobRes.ok) {
            const parsed = await blobRes.json().catch(() => null);
            if (Array.isArray(parsed)) return hydrateCompactPosts(parsed);
          }
        }
        if (meta && typeof meta.download_url === 'string') {
          const dlRes = await fetch(meta.download_url, {
            cache: 'no-store',
            signal: AbortSignal.timeout(10000),
          });
          if (dlRes.ok) {
            const parsed = await dlRes.json().catch(() => null);
            if (Array.isArray(parsed)) return hydrateCompactPosts(parsed);
          }
        }
      }
    } catch (err: any) {
      console.warn('GitHub API fetchPostsJsonFromGitHub notice:', err?.message || err);
    }
  }

  // 2. Public raw.githubusercontent.com fallback
  if (cfg.owner && cfg.repo) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${encodeURIComponent(cfg.branch)}/data/posts.json?t=${Date.now()}`;
      const rawRes = await fetch(rawUrl, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (rawRes.ok) {
        const parsed = await rawRes.json().catch(() => null);
        if (Array.isArray(parsed)) return hydrateCompactPosts(parsed);
      }
    } catch {}
  }

  return null;
}

export async function reconcilePostsWithGitHubAssets(
  rawPosts: PromptPost[]
): Promise<{ posts: PromptPost[]; healedCount: number }> {
  if (!Array.isArray(rawPosts) || rawPosts.length === 0) {
    return { posts: rawPosts || [], healedCount: 0 };
  }

  const cfg = resolveGitHubAssetsConfig();
  if (!cfg.isConfigured) {
    return { posts: rawPosts, healedCount: 0 };
  }

  const { headCommitSha, blobs } = await getGitHubAssetsTreeWithHead();
  if (!blobs || blobs.size === 0) {
    return { posts: rawPosts, healedCount: 0 };
  }

  // Index all prompt assets by basename (without extension) for fast O(1) lookup
  const assetsByStem = new Map<string, string[]>();
  for (const blobPath of blobs) {
    if (!blobPath.startsWith('prompts/')) continue;
    const stem = blobPath
      .replace(/^prompts\//, '')
      .replace(/\.[a-z0-9]+$/i, '')
      .toLowerCase();
    if (!stem) continue;
    if (!assetsByStem.has(stem)) assetsByStem.set(stem, []);
    assetsByStem.get(stem)!.push(blobPath);
  }

  const preferExtOrder = (paths: string[]): string => {
    const rank = (p: string) => {
      if (/\.webp$/i.test(p)) return 0;
      if (/\.jpe?g$/i.test(p)) return 1;
      if (/\.png$/i.test(p)) return 2;
      if (/\.avif$/i.test(p)) return 3;
      return 4;
    };
    return [...paths].sort((a, b) => rank(a) - rank(b))[0];
  };

  const extractRepoPath = (url?: string): { path: string; ref: string } | null => {
    if (!url || typeof url !== 'string') return null;
    const prefix = `https://cdn.jsdelivr.net/gh/${cfg.owner}/${cfg.repo}@`;
    if (url.startsWith(prefix)) {
      const rest = url.slice(prefix.length);
      const slash = rest.indexOf('/');
      if (slash !== -1) {
        return {
          ref: rest.slice(0, slash),
          path: decodeURIComponent(rest.slice(slash + 1).split('?')[0]),
        };
      }
    }
    const rawPrefix = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/`;
    if (url.startsWith(rawPrefix)) {
      const rest = url.slice(rawPrefix.length);
      const slash = rest.indexOf('/');
      if (slash !== -1) {
        return {
          ref: rest.slice(0, slash),
          path: decodeURIComponent(rest.slice(slash + 1).split('?')[0]),
        };
      }
    }
    return null;
  };

  let healedCount = 0;
  const cdnBranchRef = headCommitSha || cfg.branch;

  const updatedPosts = rawPosts.map((post) => {
    if (!post || !post.id) return post;
    const slug = getPromptSlug(post);
    const stemCandidates = assetsByStem.get(slug.toLowerCase()) || [];

    let nextImageUrl = post.imageUrl;
    let postChanged = false;

    const currentInfo = extractRepoPath(post.imageUrl);
    const currentExistsOnMain = currentInfo ? blobs.has(currentInfo.path) : false;
    const isLegacyRandomPath = Boolean(
      currentInfo && /^prompts\/(prompt-\d+|prompt-seen-)/i.test(currentInfo.path)
    );

    // Heal if current imageUrl is missing from zeena-prompt-assets OR still points to a legacy timestamp/broken filename while <slug>.<ext> exists in zeena-prompt-assets
    if (stemCandidates.length > 0 && (!currentExistsOnMain || isLegacyRandomPath || !post.imageUrl)) {
      const bestAssetPath = preferExtOrder(stemCandidates);
      const healedUrl = buildJsDelivrUrl(bestAssetPath, { ...cfg, branch: cdnBranchRef });
      if (healedUrl !== nextImageUrl) {
        nextImageUrl = healedUrl;
        postChanged = true;
      }
    }

    // Heal or preserve carousel slide images uploaded under prompts/<slug>-slide-<n>.<ext>
    let nextAdditional = Array.isArray(post.additionalImages) ? [...post.additionalImages] : [];
    for (let i = 0; i < nextAdditional.length; i++) {
      const slideInfo = extractRepoPath(nextAdditional[i]);
      const slideExists = slideInfo ? blobs.has(slideInfo.path) : false;
      if (!slideExists) {
        const slideStem = `${slug.toLowerCase()}-slide-${i + 1}`;
        const slideCandidates = assetsByStem.get(slideStem) || [];
        if (slideCandidates.length > 0) {
          nextAdditional[i] = buildJsDelivrUrl(preferExtOrder(slideCandidates), {
            ...cfg,
            branch: cdnBranchRef,
          });
          postChanged = true;
        }
      }
    }

    if (!postChanged) return post;
    healedCount++;
    return {
      ...post,
      imageUrl: nextImageUrl,
      additionalImages: nextAdditional,
    };
  });

  return { posts: updatedPosts, healedCount };
}

export async function pushPostsJsonToGitHub(
  rawPosts: PromptPost[],
  commitMessage?: string,
  extraFiles?: Array<{ path: string; content: string }>
): Promise<{
  success: boolean;
  commitSha?: string;
  repo: string;
  branch: string;
  count: number;
  error?: string;
}> {
  const { allPosts, initialFeed } = buildCleanPostsPayload(rawPosts);
  const filesToPush: Array<{ path: string; content: string }> = [
    {
      path: 'data/posts.json',
      content: JSON.stringify(compactPostsForJson(allPosts), null, 2),
    },
    {
      path: 'data/initial-feed.json',
      content: JSON.stringify(
        compactPostsForJson(initialFeed, { omitPublishedStatus: true }),
        null,
        2
      ),
    },
  ];

  if (Array.isArray(extraFiles)) {
    for (const f of extraFiles) {
      if (f?.path && typeof f.content === 'string') {
        filesToPush.push(f);
      }
    }
  }

  const message =
    commitMessage || `Update data/posts.json (${allPosts.length} prompts) via Admin CMS`;

  const res = await pushFilesToGitHubRepo(filesToPush, message);
  return {
    ...res,
    count: allPosts.length,
  };
}

export interface SiteMetaSnapshotInput {
  categories?: Category[];
  tags?: string[];
  settings?: SiteSettings;
  searchQueries?: string[];
}

async function purgeJsDelivrDataPaths(cfg: GitHubAssetsConfig, paths: string[]): Promise<void> {
  await Promise.allSettled(
    paths.map((assetPath) => {
      const cleanPath = assetPath.replace(/^\/+/, '');
      return fetch(
        `https://purge.jsdelivr.net/gh/${cfg.owner}/${cfg.repo}@${cfg.branch}/${cleanPath}`,
        { cache: 'no-store' }
      ).catch(() => {});
    })
  );
}

/**
 * Pushes minified public catalog (`data/posts.min.json`, `data/initial-feed.json`)
 * and optional `data/site-meta.json` directly to the public assets repository (`zeena-prompt-assets`)
 * and purges jsDelivr CDN so public browsers fetch catalog updates with 0 Vercel Fast Origin Transfer.
 */
export async function pushPublicCdnBundleToAssetsRepo(
  rawPosts: PromptPost[],
  meta?: SiteMetaSnapshotInput,
  commitMessage?: string
): Promise<{
  success: boolean;
  commitSha?: string;
  repo: string;
  branch: string;
  publishedCount: number;
  error?: string;
}> {
  const assetsCfg = resolveGitHubAssetsConfig();
  const repoFullName = `${assetsCfg.owner}/${assetsCfg.repo}`;
  if (!assetsCfg.isConfigured) {
    return {
      success: false,
      repo: repoFullName,
      branch: assetsCfg.branch,
      publishedCount: 0,
      error: 'GITHUB_ASSETS_TOKEN is not configured.',
    };
  }

  const { allPosts, initialFeed } = buildCleanPostsPayload(rawPosts);
  // Strictly expose ONLY published prompts on the public CDN
  const publishedPosts = allPosts.filter((p) => p.status === 'published');

  const filesToPush: Array<{ path: string; content: string }> = [
    {
      path: 'data/posts.min.json',
      content: JSON.stringify(compactPostsForJson(publishedPosts, { omitPublishedStatus: true })),
    },
    {
      path: 'data/initial-feed.json',
      content: JSON.stringify(compactPostsForJson(initialFeed, { omitPublishedStatus: true })),
    },
  ];

  if (meta) {
    filesToPush.push({
      path: 'data/site-meta.json',
      content: JSON.stringify({
        categories: meta.categories || [],
        tags: meta.tags || [],
        settings: meta.settings || null,
        searchQueries: meta.searchQueries || [],
        count: publishedPosts.length,
        updatedAt: new Date().toISOString(),
      }),
    });
  }

  const message =
    commitMessage ||
    `Sync public CDN catalog (${publishedPosts.length} published prompts)`;

  const res = await pushFilesToGitHubRepo(filesToPush, message, assetsCfg);
  if (res.success) {
    await purgeJsDelivrDataPaths(
      assetsCfg,
      filesToPush.map((f) => f.path)
    );
  }

  return {
    ...res,
    publishedCount: publishedPosts.length,
  };
}

/**
 * Lightweight sync of categories, tags, site settings, and top search queries
 * to `zeena-prompt-assets/data/site-meta.json` + jsDelivr CDN purge.
 */
export async function pushSiteMetaSnapshotToAssetsRepo(
  meta: SiteMetaSnapshotInput,
  commitMessage = 'Sync public site metadata to CDN'
): Promise<{ success: boolean; commitSha?: string; error?: string }> {
  const assetsCfg = resolveGitHubAssetsConfig();
  if (!assetsCfg.isConfigured) {
    return { success: false, error: 'GITHUB_ASSETS_TOKEN is not configured.' };
  }

  const filePath = 'data/site-meta.json';
  const res = await pushFilesToGitHubRepo(
    [
      {
        path: filePath,
        content: JSON.stringify({
          categories: meta.categories || [],
          tags: meta.tags || [],
          settings: meta.settings || null,
          searchQueries: meta.searchQueries || [],
          updatedAt: new Date().toISOString(),
        }),
      },
    ],
    commitMessage,
    assetsCfg
  );

  if (res.success) {
    await purgeJsDelivrDataPaths(assetsCfg, [filePath]);
  }

  return {
    success: res.success,
    commitSha: res.commitSha,
    error: res.error,
  };
}

// ============================================================================
// GitHub-backed Per-Post Comments (stored in zeena-prompt-assets/comments/{postId}.json)
// ============================================================================

const COMMENTS_CACHE_TTL_MS = 5 * 60 * 1000;
const commentsMemoryCache = new Map<string, { comments: PromptComment[]; cachedAt: number }>();

export function sanitizeCommentPostId(postId: string): string {
  return String(postId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 120);
}

function getCommentAssetPath(safePostId: string): string {
  return `comments/${safePostId}.json`;
}

function normalizeCommentsArray(raw: unknown): PromptComment[] {
  if (!Array.isArray(raw)) return [];
  const valid: PromptComment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Partial<PromptComment>;
    if (!c.id || !c.postId || !c.userId || !c.userName || !c.text) continue;
    valid.push({
      id: String(c.id),
      postId: String(c.postId),
      userId: String(c.userId),
      userName: String(c.userName).slice(0, 80),
      userAvatar: typeof c.userAvatar === 'string' ? c.userAvatar : undefined,
      text: String(c.text).slice(0, 600),
      createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
    });
  }
  return valid.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function readCommentsFromGitHub(postId: string): Promise<PromptComment[]> {
  const safeId = sanitizeCommentPostId(postId);
  if (!safeId) return [];

  const cached = commentsMemoryCache.get(safeId);
  if (cached && Date.now() - cached.cachedAt < COMMENTS_CACHE_TTL_MS) {
    return cached.comments;
  }

  const cfg = resolveGitHubAssetsConfig();
  const assetPath = getCommentAssetPath(safeId);
  const cdnUrl = buildJsDelivrUrl(assetPath, cfg);

  try {
    const cdnRes = await fetch(cdnUrl, {
      cache: 'no-store',
    });
    if (cdnRes.ok) {
      const data = await cdnRes.json().catch(() => []);
      const normalized = normalizeCommentsArray(data);
      commentsMemoryCache.set(safeId, { comments: normalized, cachedAt: Date.now() });
      return normalized;
    }
    if (cdnRes.status === 404) {
      return [];
    }
  } catch {
    // Fall through to raw.githubusercontent.com fallback if jsDelivr fails
  }

  try {
    const rawUrl = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${encodeURIComponent(cfg.branch)}/${assetPath}`;
    const rawRes = await fetch(rawUrl, { cache: 'no-store' });
    if (rawRes.ok) {
      const data = await rawRes.json().catch(() => []);
      const normalized = normalizeCommentsArray(data);
      commentsMemoryCache.set(safeId, { comments: normalized, cachedAt: Date.now() });
      return normalized;
    }
  } catch {}

  return cached?.comments || [];
}

async function fetchCommentFileFromGitHubApi(
  cfg: GitHubAssetsConfig,
  assetPath: string
): Promise<{ comments: PromptComment[]; sha?: string }> {
  const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${assetPath}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(apiUrl, {
    headers: githubHeaders(cfg.token),
    cache: 'no-store',
  });

  if (res.status === 404) {
    return { comments: [], sha: undefined };
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.message || `Failed to read comments (${res.status})`);
  }

  const data = await res.json();
  let parsed: unknown = [];
  if (typeof data?.content === 'string') {
    const decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    try {
      parsed = JSON.parse(decoded);
    } catch {
      parsed = [];
    }
  }
  return {
    comments: normalizeCommentsArray(parsed),
    sha: data?.sha || undefined,
  };
}

export async function addCommentToGitHub(
  postId: string,
  newComment: PromptComment
): Promise<{ success: boolean; comments: PromptComment[]; error?: string }> {
  const safeId = sanitizeCommentPostId(postId);
  if (!safeId) {
    return { success: false, comments: [], error: 'Invalid post ID' };
  }

  const cfg = resolveGitHubAssetsConfig();
  if (!cfg.isConfigured) {
    return {
      success: false,
      comments: [],
      error: 'GITHUB_ASSETS_TOKEN is not configured',
    };
  }

  const assetPath = getCommentAssetPath(safeId);
  const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${assetPath}`;

  const writeAttempt = async (): Promise<{
    ok: boolean;
    retryable?: boolean;
    comments: PromptComment[];
    error?: string;
  }> => {
    const { comments: existing, sha } = await fetchCommentFileFromGitHubApi(cfg, assetPath);

    const updated = normalizeCommentsArray([
      newComment,
      ...existing.filter((c) => c.id !== newComment.id),
    ]).slice(0, 200);

    const encodedContent = Buffer.from(JSON.stringify(updated, null, 2), 'utf-8').toString('base64');
    const body: Record<string, any> = {
      message: `Add comment on ${safeId}`,
      content: encodedContent,
      branch: cfg.branch,
    };
    if (sha) {
      body.sha = sha;
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: githubHeaders(cfg.token),
      body: JSON.stringify(body),
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      return {
        ok: false,
        retryable: putRes.status === 409 || putRes.status === 422,
        comments: existing,
        error: errData?.message || `GitHub comment save failed (${putRes.status})`,
      };
    }

    return { ok: true, comments: updated };
  };

  try {
    let result = await writeAttempt();
    if (!result.ok && result.retryable) {
      result = await writeAttempt();
    }

    if (!result.ok) {
      return {
        success: false,
        comments: result.comments,
        error: result.error,
      };
    }

    commentsMemoryCache.set(safeId, { comments: result.comments, cachedAt: Date.now() });
    void fetch(
      `https://purge.jsdelivr.net/gh/${cfg.owner}/${cfg.repo}@${cfg.branch}/${assetPath}`
    ).catch(() => {});

    return {
      success: true,
      comments: result.comments,
    };
  } catch (err: any) {
    return {
      success: false,
      comments: [],
      error: err?.message || 'Failed to save comment to GitHub',
    };
  }
}

export async function deleteCommentFromGitHub(
  postId: string,
  commentId: string,
  userId: string
): Promise<{ success: boolean; comments: PromptComment[]; error?: string }> {
  const safeId = sanitizeCommentPostId(postId);
  if (!safeId || !commentId || !userId) {
    return { success: false, comments: [], error: 'Missing required fields' };
  }

  const cfg = resolveGitHubAssetsConfig();
  if (!cfg.isConfigured) {
    return { success: false, comments: [], error: 'GITHUB_ASSETS_TOKEN is not configured' };
  }

  const assetPath = getCommentAssetPath(safeId);
  const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${assetPath}`;

  try {
    const { comments: existing, sha } = await fetchCommentFileFromGitHubApi(cfg, assetPath);
    const target = existing.find((c) => c.id === commentId);
    if (!target) {
      return { success: true, comments: existing };
    }
    if (target.userId !== userId) {
      return { success: false, comments: existing, error: 'You can only delete your own comments' };
    }

    const updated = existing.filter((c) => c.id !== commentId);
    const encodedContent = Buffer.from(JSON.stringify(updated, null, 2), 'utf-8').toString('base64');
    const body: Record<string, any> = {
      message: `Delete comment on ${safeId}`,
      content: encodedContent,
      branch: cfg.branch,
    };
    if (sha) {
      body.sha = sha;
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: githubHeaders(cfg.token),
      body: JSON.stringify(body),
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      return {
        success: false,
        comments: existing,
        error: errData?.message || `Failed to delete comment (${putRes.status})`,
      };
    }

    commentsMemoryCache.set(safeId, { comments: updated, cachedAt: Date.now() });
    void fetch(
      `https://purge.jsdelivr.net/gh/${cfg.owner}/${cfg.repo}@${cfg.branch}/${assetPath}`
    ).catch(() => {});

    return { success: true, comments: updated };
  } catch (err: any) {
    return {
      success: false,
      comments: [],
      error: err?.message || 'Failed to delete comment',
    };
  }
}
