'use client';

export interface InpaintResult {
  imageData: ImageData;
  durationMs: number;
  pixelsRepaired: number;
}

/**
 * Pure client-side, 100% offline fast image inpainting engine.
 * Combines directional fast-marching onion-peel diffusion, color-preserving bilateral smoothing,
 * and local border patch synthesis inside the masked bounding region for sub-second mobile speed.
 */
export function removeWatermarkInpaint(
  sourceImageData: ImageData,
  maskCanvasData: Uint8ClampedArray
): InpaintResult {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const { width, height, data: src } = sourceImageData;
  const totalPixels = width * height;

  // Extract binary mask (1 = needs inpainting, 0 = known background pixel)
  const mask = new Uint8Array(totalPixels);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let maskedCount = 0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const alpha = maskCanvasData[idx * 4 + 3];
      if (alpha > 20) {
        mask[idx] = 1;
        maskedCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const out = new Uint8ClampedArray(src);
  if (maskedCount === 0 || maxX < minX) {
    return {
      imageData: new ImageData(out, width, height),
      durationMs: 0,
      pixelsRepaired: 0,
    };
  }

  // Dilate mask by 2px to cover anti-aliased fringe / halo around logos & cursive text
  const dilated = new Uint8Array(mask);
  const padMinX = Math.max(0, minX - 3);
  const padMaxX = Math.min(width - 1, maxX + 3);
  const padMinY = Math.max(0, minY - 3);
  const padMaxY = Math.min(height - 1, maxY + 3);

  for (let y = padMinY; y <= padMaxY; y++) {
    for (let x = padMinX; x <= padMaxX; x++) {
      const idx = y * width + x;
      if (mask[idx] === 1) {
        for (let dy = -2; dy <= 2; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;
            if (dx * dx + dy * dy <= 5) {
              dilated[ny * width + nx] = 1;
            }
          }
        }
      }
    }
  }

  minX = Math.max(0, minX - 2);
  maxX = Math.min(width - 1, maxX + 2);
  minY = Math.max(0, minY - 2);
  maxY = Math.min(height - 1, maxY + 2);

  // Track filled state: 0 = original known pixel, 1 = unfilled masked pixel, 2 = filled inpainted pixel
  const state = new Uint8Array(totalPixels);
  let remaining = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      if (dilated[idx] === 1) {
        state[idx] = 1;
        remaining++;
      }
    }
  }

  // Pass 1: Onion-Peel Multi-Scale Directional Diffusion (outward -> inward)
  const peelOrder: number[] = [];
  const nextState = new Uint8Array(state);
  const neighborDx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const neighborDy = [-1, -1, -1, 0, 0, 1, 1, 1];

  // Collect initial boundary pixels
  let frontier: number[] = [];
  const inFrontier = new Uint8Array(totalPixels);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      if (state[idx] !== 1) continue;
      let touchesKnown = false;
      for (let k = 0; k < 8; k++) {
        const nx = x + neighborDx[k];
        const ny = y + neighborDy[k];
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && state[ny * width + nx] === 0) {
          touchesKnown = true;
          break;
        }
      }
      if (touchesKnown) {
        frontier.push(idx);
        inFrontier[idx] = 1;
      }
    }
  }

  let safetyGuard = 0;
  const MAX_PEEL_LAYERS = 2500;
  while (frontier.length > 0 && safetyGuard < MAX_PEEL_LAYERS) {
    safetyGuard++;
    const nextFrontier: number[] = [];

    for (let f = 0; f < frontier.length; f++) {
      const idx = frontier[f];
      const cx = idx % width;
      const cy = (idx / width) | 0;

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumW = 0;

      // Sample 7x7 neighborhood of already-known / already-peeled pixels
      for (let dy = -3; dy <= 3; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -3; dx <= 3; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          if (nx < 0 || nx >= width) continue;
          const nIdx = ny * width + nx;
          const st = state[nIdx];
          if (st === 1) continue; // Only use known (0) or previously filled (2) pixels

          const dist2 = dx * dx + dy * dy;
          if (dist2 > 11) continue;
          // Original known pixels get slightly higher anchor weight than propagated pixels
          const anchorBoost = st === 0 ? 1.5 : 1.0;
          const w = anchorBoost / (dist2 + 0.35);
          const p = nIdx * 4;
          sumR += out[p] * w;
          sumG += out[p + 1] * w;
          sumB += out[p + 2] * w;
          sumW += w;
        }
      }

      if (sumW > 0) {
        const p = idx * 4;
        out[p] = Math.round(sumR / sumW);
        out[p + 1] = Math.round(sumG / sumW);
        out[p + 2] = Math.round(sumB / sumW);
        out[p + 3] = 255;
      }

      nextState[idx] = 2;
      peelOrder.push(idx);

      for (let k = 0; k < 8; k++) {
        const nx = cx + neighborDx[k];
        const ny = cy + neighborDy[k];
        if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY) {
          const nIdx = ny * width + nx;
          if (state[nIdx] === 1 && inFrontier[nIdx] === 0) {
            inFrontier[nIdx] = 1;
            nextFrontier.push(nIdx);
          }
        }
      }
    }

    for (let f = 0; f < frontier.length; f++) {
      state[frontier[f]] = 2;
    }
    frontier = nextFrontier;
  }

  // Pass 2: Iterative harmonic relaxation (4 fast passes) for gradient smoothness
  const tmp = new Uint8ClampedArray(out);
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < peelOrder.length; i++) {
      const idx = peelOrder[i];
      const cx = idx % width;
      const cy = (idx / width) | 0;
      let r = 0;
      let g = 0;
      let b = 0;
      let wSum = 0;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          if (nx < 0 || nx >= width) continue;
          const nIdx = ny * width + nx;
          const w = dx === 0 && dy === 0 ? 1 : dx === 0 || dy === 0 ? 2 : 1;
          const p = nIdx * 4;
          r += out[p] * w;
          g += out[p + 1] * w;
          b += out[p + 2] * w;
          wSum += w;
        }
      }
      const p = idx * 4;
      tmp[p] = (r / wSum) | 0;
      tmp[p + 1] = (g / wSum) | 0;
      tmp[p + 2] = (b / wSum) | 0;
    }
    for (let i = 0; i < peelOrder.length; i++) {
      const p = peelOrder[i] * 4;
      out[p] = tmp[p];
      out[p + 1] = tmp[p + 1];
      out[p + 2] = tmp[p + 2];
    }
  }

  // Pass 3: Fast Local Patch Texture Synthesis (restores natural background grain & detail)
  // Collect clean candidate anchor pixels in a ring around the masked bounding box
  const ringMargin = 26;
  const searchMinX = Math.max(3, minX - ringMargin);
  const searchMaxX = Math.min(width - 4, maxX + ringMargin);
  const searchMinY = Math.max(3, minY - ringMargin);
  const searchMaxY = Math.min(height - 4, maxY + ringMargin);

  const candidates: number[] = [];
  const stepCandidate = Math.max(2, Math.floor(Math.max(searchMaxX - searchMinX, searchMaxY - searchMinY) / 36));
  for (let y = searchMinY; y <= searchMaxY; y += stepCandidate) {
    for (let x = searchMinX; x <= searchMaxX; x += stepCandidate) {
      // Check a 5x5 patch centered at (x, y) is 100% clean (state === 0)
      let allClean = true;
      for (let dy = -2; dy <= 2 && allClean; dy += 2) {
        for (let dx = -2; dx <= 2; dx += 2) {
          if (dilated[(y + dy) * width + (x + dx)] === 1) {
            allClean = false;
            break;
          }
        }
      }
      if (allClean) {
        candidates.push(y * width + x);
      }
    }
  }

  if (candidates.length > 0 && remaining <= 120000) {
    const texOut = new Uint8ClampedArray(out);
    // Process masked pixels in 3x3 strides for rapid high-frequency texture transfer
    for (let y = Math.max(3, minY); y <= Math.min(height - 4, maxY); y += 2) {
      for (let x = Math.max(3, minX); x <= Math.min(width - 4, maxX); x += 2) {
        const idx = y * width + x;
        if (dilated[idx] !== 1) continue;

        const targetP = idx * 4;
        const tr = out[targetP];
        const tg = out[targetP + 1];
        const tb = out[targetP + 2];

        // Find nearest color-matching clean patch to transfer micro-texture (high-pass detail)
        let bestCand = candidates[0];
        let bestErr = 1e12;
        for (let c = 0; c < candidates.length; c++) {
          const cIdx = candidates[c];
          const cp = cIdx * 4;
          const dr = src[cp] - tr;
          const dg = src[cp + 1] - tg;
          const db = src[cp + 2] - tb;
          const cx = cIdx % width;
          const cy = (cIdx / width) | 0;
          const distPenalty = ((cx - x) * (cx - x) + (cy - y) * (cy - y)) * 0.04;
          const err = dr * dr + dg * dg + db * db + distPenalty;
          if (err < bestErr) {
            bestErr = err;
            bestCand = cIdx;
          }
        }

        // Extract high-frequency grain delta from candidate patch center vs its local 5x5 average
        const cX = bestCand % width;
        const cY = (bestCand / width) | 0;
        let avgR = 0;
        let avgG = 0;
        let avgB = 0;
        for (let dy = -2; dy <= 2; dy += 2) {
          for (let dx = -2; dx <= 2; dx += 2) {
            const p = ((cY + dy) * width + (cX + dx)) * 4;
            avgR += src[p];
            avgG += src[p + 1];
            avgB += src[p + 2];
          }
        }
        avgR /= 9;
        avgG /= 9;
        avgB /= 9;

        for (let dy = 0; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny >= height) continue;
          for (let dx = 0; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx >= width) continue;
            const nIdx = ny * width + nx;
            if (dilated[nIdx] !== 1) continue;
            const np = nIdx * 4;
            const sp = ((cY + dy) * width + (cX + dx)) * 4;
            const deltaR = (src[sp] - avgR) * 0.72;
            const deltaG = (src[sp + 1] - avgG) * 0.72;
            const deltaB = (src[sp + 2] - avgB) * 0.72;

            texOut[np] = Math.max(0, Math.min(255, Math.round(out[np] * 0.85 + src[sp] * 0.15 + deltaR)));
            texOut[np + 1] = Math.max(0, Math.min(255, Math.round(out[np + 1] * 0.85 + src[sp + 1] * 0.15 + deltaG)));
            texOut[np + 2] = Math.max(0, Math.min(255, Math.round(out[np + 2] * 0.85 + src[sp + 2] * 0.15 + deltaB)));
          }
        }
      }
    }

    // Copy textured result back
    for (let i = 0; i < peelOrder.length; i++) {
      const p = peelOrder[i] * 4;
      out[p] = texOut[p];
      out[p + 1] = texOut[p + 1];
      out[p + 2] = texOut[p + 2];
    }
  }

  // Pass 4: Edge feather blend along exact 1px mask border so transition is invisible
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      if (dilated[idx] !== 1) continue;
      let touchesClean = false;
      for (let k = 0; k < 8; k++) {
        const nx = x + neighborDx[k];
        const ny = y + neighborDy[k];
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && dilated[ny * width + nx] === 0) {
          touchesClean = true;
          break;
        }
      }
      if (touchesClean) {
        let r = 0;
        let g = 0;
        let b = 0;
        let c = 0;
        for (let k = 0; k < 8; k++) {
          const nx = x + neighborDx[k];
          const ny = y + neighborDy[k];
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const np = (ny * width + nx) * 4;
            r += out[np];
            g += out[np + 1];
            b += out[np + 2];
            c++;
          }
        }
        const p = idx * 4;
        out[p] = Math.round(out[p] * 0.45 + (r / c) * 0.55);
        out[p + 1] = Math.round(out[p + 1] * 0.45 + (g / c) * 0.55);
        out[p + 2] = Math.round(out[p + 2] * 0.45 + (b / c) * 0.55);
      }
    }
  }

  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    imageData: new ImageData(out, width, height),
    durationMs: Math.max(1, Math.round(end - start)),
    pixelsRepaired: remaining,
  };
}
