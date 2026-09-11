/**
 * 16:9 Widescreen Photo Strip & Collage Generator for Browser Push Notifications
 * Generates an HD 16:9 (1280x720) composite image with 1 to 4 images
 * perfectly formatted for native browser push notification trays (Android Chrome, Windows, macOS).
 */

// Helper to draw an image covering the slot without distortion (object-fit: cover)
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 18
) {
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    // Fallback for older canvas implementations
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
  ctx.closePath();
  ctx.clip();

  // Compute cover dimensions
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = w / h;

  let sx = 0;
  let sy = 0;
  let sWidth = img.naturalWidth;
  let sHeight = img.naturalHeight;

  if (imgRatio > targetRatio) {
    sWidth = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sWidth) / 2;
  } else {
    sHeight = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);

  // Subtle border overlay for definition
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

// Load image safely with CORS and proxy fallback to prevent canvas tainting
export async function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!url || !url.trim()) {
      return reject(new Error('Empty image URL'));
    }

    const img = new Image();
    // Only use crossOrigin for external HTTP/HTTPS images. Data URLs and local paths do not support crossOrigin
    if (url.startsWith('http://') || url.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => resolve(img);

    img.onerror = () => {
      // If direct anonymous load fails (CORS restriction), retry via server-side proxy
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const proxyUrl = `/api/notifications/proxy-image?url=${encodeURIComponent(url)}`;
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => reject(new Error(`Failed to load image via proxy: ${url}`));
        fallbackImg.src = proxyUrl;
      } else {
        reject(new Error(`Failed to load image: ${url}`));
      }
    };

    img.src = url;
  });
}

/**
 * Generates an authentic 16:9 (1280x720) widescreen image or Pinterest-style photo strip collage
 * @param imageUrls Array of 1 to 4 image URLs
 * @returns Promise resolving to a 16:9 JPEG data URL
 */
export async function generate16x9Collage(imageUrls: string[]): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('generate16x9Collage must run in browser context');
  }

  const validUrls = imageUrls.filter((u) => u && typeof u === 'string' && u.trim().length > 0);
  if (validUrls.length === 0) {
    throw new Error('At least 1 valid image URL is required');
  }

  // Widescreen 16:9 resolution: 1280 x 720 (standard HD widescreen for mobile lockscreen notifications)
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize canvas context');
  }

  // Load all images in parallel
  const loadedImages: HTMLImageElement[] = [];
  for (const url of validUrls.slice(0, 4)) {
    try {
      const img = await loadHtmlImage(url);
      loadedImages.push(img);
    } catch (err) {
      console.warn('Could not load image for collage:', url, err);
    }
  }

  if (loadedImages.length === 0) {
    throw new Error('None of the provided images could be loaded');
  }

  // 1. Draw elegant dark background
  ctx.fillStyle = '#0e0e10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const outerMargin = 16;
  const usableWidth = canvas.width - outerMargin * 2;
  const usableHeight = canvas.height - outerMargin * 2;

  const count = loadedImages.length;

  if (count === 1) {
    // Single image: full-bleed 16:9 widescreen format (1280x720)
    drawImageCover(ctx, loadedImages[0], 0, 0, canvas.width, canvas.height, 0);
  } else {
    // Multi-image Pinterest strip: 2, 3, or 4 vertical cards side-by-side
    const gap = count === 4 ? 12 : count === 3 ? 16 : 20;
    const totalGaps = gap * (count - 1);
    const cardWidth = (usableWidth - totalGaps) / count;
    const cardHeight = usableHeight;

    loadedImages.forEach((img, idx) => {
      const cardX = outerMargin + idx * (cardWidth + gap);
      const cardY = outerMargin;
      drawImageCover(ctx, img, cardX, cardY, cardWidth, cardHeight, 18);
    });
  }

  // Draw discrete, brand watermark pill on top right
  try {
    ctx.save();
    const pillText = 'tool.reelz';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    const textWidth = ctx.measureText(pillText).width;
    const pillW = textWidth + 36;
    const pillH = 40;
    const pillX = canvas.width - outerMargin - pillW - 12;
    const pillY = outerMargin + 12;

    // Pill background
    ctx.fillStyle = 'rgba(15, 15, 18, 0.75)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(pillX, pillY, pillW, pillH, 20);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Red dot indicator
    ctx.fillStyle = '#E60023';
    ctx.beginPath();
    ctx.arc(pillX + 16, pillY + pillH / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillText, pillX + 28, pillY + pillH / 2);
    ctx.restore();
  } catch {
    // Non-critical watermark failure
  }

  // Export as high-quality 16:9 JPEG
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Save generated 16:9 collage to public server directory
 * Returns relative path e.g. /collages/collage-123.jpg
 */
export async function saveCollageToServer(dataUrl: string, notificationId?: string): Promise<string> {
  try {
    const res = await fetch('/api/notifications/save-collage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, notificationId }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (err) {
    console.error('Failed to save collage to server:', err);
  }
  // If server saving fails, return the dataUrl itself as fallback
  return dataUrl;
}
