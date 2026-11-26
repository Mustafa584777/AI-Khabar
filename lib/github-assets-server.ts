import { PromptPost, PromptComment } from '@/types/prompt';
import { getPromptSlug } from './utils';

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

export async function listGitHubAssetPaths(): Promise<Set<string>> {
  const cfg = resolveGitHubAssetsConfig();
  if (!cfg.isConfigured) return new Set();

  try {
    const res = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/trees/${encodeURIComponent(cfg.branch)}?recursive=1`,
      {
        headers: githubHeaders(cfg.token),
        cache: 'no-store',
      }
    );

    if (res.status === 404 || res.status === 409) {
      // Empty repository or branch doesn't exist yet
      return new Set();
    }

    if (!res.ok) {
      return new Set();
    }

    const data = await res.json();
    const paths = new Set<string>();
    if (Array.isArray(data?.tree)) {
      for (const entry of data.tree) {
        if (entry?.type === 'blob' && typeof entry.path === 'string') {
          paths.add(entry.path);
        }
      }
    }
    return paths;
  } catch {
    return new Set();
  }
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
    const refUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${encodeURIComponent(cfg.branch)}`;
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
    const refUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${encodeURIComponent(cfg.branch)}`;
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
      cleanPosts.push({
        ...p,
        slug,
      });
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
      content: JSON.stringify(allPosts, null, 2),
    },
    {
      path: 'data/initial-feed.json',
      content: JSON.stringify(initialFeed, null, 2),
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
