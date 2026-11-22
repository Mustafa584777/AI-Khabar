'use client';

export type WatermarkRemovalMode = 'hd' | 'translucent' | 'fast';

export interface InpaintProgress {
  percent: number;
  stage: string;
}

export interface InpaintOptions {
  mode?: WatermarkRemovalMode;
  intensity?: number; // 25 | 50 | 75 | 100 (default 100)
  onProgress?: (progress: InpaintProgress) => void;
}

export interface InpaintResult {
  imageData: ImageData;
  durationMs: number;
  pixelsRepaired: number;
  modeUsed: WatermarkRemovalMode;
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

// 17-tap symmetric star + 3x3 core kernel for 7x7 patch matching (fast & rotation/edge sensitive)
const PATCH_TAPS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 1.5],
  [-1, 0, 1.2],
  [1, 0, 1.2],
  [0, -1, 1.2],
  [0, 1, 1.2],
  [-1, -1, 1.0],
  [1, -1, 1.0],
  [-1, 1, 1.0],
  [1, 1, 1.0],
  [-2, -2, 0.75],
  [2, -2, 0.75],
  [-2, 2, 0.75],
  [2, 2, 0.75],
  [-3, 0, 0.65],
  [3, 0, 0.65],
  [0, -3, 0.65],
  [0, 3, 0.65],
];

const NEIGHBOR_DX = [-1, 0, 1, -1, 1, -1, 0, 1];
const NEIGHBOR_DY = [-1, -1, -1, 0, 0, 1, 1, 1];

/**
 * Pure client-side, 100% offline HD watermark removal engine.
 * Combines:
 * 1) Directional isophote-guided onion-peel initialization
 * 2) Multi-scale Coarse-to-Fine PatchMatch Nearest-Neighbor Field (NNF) texture synthesis
 * 3) Poisson Successive Over-Relaxation (SOR) seamless gradient blending (zero blur!)
 * 4) Optional semi-transparent white/light watermark alpha matte inversion
 */
export async function removeWatermarkInpaint(
  sourceImageData: ImageData,
  maskCanvasData: Uint8ClampedArray,
  options: InpaintOptions = {}
): Promise<InpaintResult> {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const mode: WatermarkRemovalMode = options.mode ?? 'hd';
  const intensity = Math.max(10, Math.min(100, Math.round(options.intensity ?? 100)));
  const strength = intensity / 100;
  const report = (percent: number, stage: string) => {
    options.onProgress?.({ percent: Math.min(100, Math.max(0, Math.round(percent))), stage });
  };

  const { width, height, data: src } = sourceImageData;
  const totalPixels = width * height;
  const out = new Uint8ClampedArray(src);

  report(4, 'Scanning watermark mask...');

  // 1. Extract mask & bounding box
  const rawMask = new Uint8Array(totalPixels);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let maskedCount = 0;

  for (let y = 0; y < height; y++) {
    const rowOff = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOff + x;
      if (maskCanvasData[idx * 4 + 3] > 20) {
        rawMask[idx] = 1;
        maskedCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maskedCount === 0 || maxX < minX) {
    return {
      imageData: new ImageData(out, width, height),
      durationMs: 1,
      pixelsRepaired: 0,
      modeUsed: mode,
    };
  }

  // Scale mask dilation radius by intensity so low intensity stays tightly inside painted watermark pixels
  const dilateRadius = intensity >= 90 ? 2 : intensity >= 65 ? 1 : 0;
  const dilated = new Uint8Array(rawMask);
  if (dilateRadius > 0) {
    const padMinX = Math.max(0, minX - (dilateRadius + 1));
    const padMaxX = Math.min(width - 1, maxX + (dilateRadius + 1));
    const padMinY = Math.max(0, minY - (dilateRadius + 1));
    const padMaxY = Math.min(height - 1, maxY + (dilateRadius + 1));
    const r2 = dilateRadius === 2 ? 5 : 2;

    for (let y = padMinY; y <= padMaxY; y++) {
      for (let x = padMinX; x <= padMaxX; x++) {
        if (rawMask[y * width + x] === 1) {
          for (let dy = -dilateRadius; dy <= dilateRadius; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -dilateRadius; dx <= dilateRadius; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;
              if (dx * dx + dy * dy <= r2) {
                dilated[ny * width + nx] = 1;
              }
            }
          }
        }
      }
    }
  }

  minX = Math.max(0, minX - dilateRadius);
  maxX = Math.min(width - 1, maxX + dilateRadius);
  minY = Math.max(0, minY - dilateRadius);
  maxY = Math.min(height - 1, maxY + dilateRadius);

  // Build adaptive ROI around masked bounding box (ensures plenty of clean reference texture without wasting RAM)
  const maskW = maxX - minX + 1;
  const maskH = maxY - minY + 1;
  let margin = mode === 'fast'
    ? Math.max(24, Math.min(80, Math.round(Math.max(maskW, maskH) * 0.5)))
    : Math.max(76, Math.min(260, Math.round(Math.max(maskW, maskH) * 1.15)));

  let roiX0 = Math.max(0, minX - margin);
  let roiX1 = Math.min(width - 1, maxX + margin);
  let roiY0 = Math.max(0, minY - margin);
  let roiY1 = Math.min(height - 1, maxY + margin);

  // Guarantee sufficient clean margin if user painted nearly the whole ROI
  for (let expand = 0; expand < 3; expand++) {
    const rw = roiX1 - roiX0 + 1;
    const rh = roiY1 - roiY0 + 1;
    let cleanCount = 0;
    const step = Math.max(1, Math.floor((rw * rh) / 4000));
    let sampled = 0;
    for (let y = roiY0; y <= roiY1; y += step) {
      for (let x = roiX0; x <= roiX1; x += step) {
        sampled++;
        if (dilated[y * width + x] === 0) cleanCount++;
      }
    }
    if (cleanCount / Math.max(1, sampled) >= 0.32) break;
    margin += 120;
    roiX0 = Math.max(0, minX - margin);
    roiX1 = Math.min(width - 1, maxX + margin);
    roiY0 = Math.max(0, minY - margin);
    roiY1 = Math.min(height - 1, maxY + margin);
  }

  const roiW = roiX1 - roiX0 + 1;
  const roiH = roiY1 - roiY0 + 1;
  const roiLen = roiW * roiH;

  const roiSrc = new Uint8ClampedArray(roiLen * 4);
  const roiMask = new Uint8Array(roiLen);
  let remaining = 0;

  for (let y = 0; y < roiH; y++) {
    const srcRow = (roiY0 + y) * width + roiX0;
    const dstRow = y * roiW;
    for (let x = 0; x < roiW; x++) {
      const gIdx = srcRow + x;
      const rIdx = dstRow + x;
      const m = dilated[gIdx];
      roiMask[rIdx] = m;
      if (m === 1) remaining++;
      const gp = gIdx * 4;
      const rp = rIdx * 4;
      roiSrc[rp] = src[gp];
      roiSrc[rp + 1] = src[gp + 1];
      roiSrc[rp + 2] = src[gp + 2];
      roiSrc[rp + 3] = 255;
    }
  }

  // Optional Mode: Translucent White/Light Watermark Matte De-blending
  // Recovers real background detail underneath semi-transparent logos/text, leaving only opaque pixels for PatchMatch
  if (mode === 'translucent') {
    report(10, 'Recovering pixels under semi-transparent watermark...');
    await yieldToMain();

    const estPixels = new Uint8ClampedArray(roiSrc);
    const estOrder = directionalPeelInit(estPixels, roiMask, roiW, roiH, 2);
    void estOrder;

    let recoveredPixels = 0;
    const stillOpaque = new Uint8Array(roiMask);

    for (let y = 1; y < roiH - 1; y++) {
      for (let x = 1; x < roiW - 1; x++) {
        const idx = y * roiW + x;
        if (roiMask[idx] !== 1) continue;
        const p = idx * 4;
        const r = roiSrc[p];
        const g = roiSrc[p + 1];
        const b = roiSrc[p + 2];

        const br = estPixels[p];
        const bg = estPixels[p + 1];
        const bb = estPixels[p + 2];

        // Estimate white/light overlay alpha normalized per channel (accurate on colored & dark backgrounds)
        const alphas: number[] = [];
        const channels: Array<[number, number]> = [
          [r, br],
          [g, bg],
          [b, bb],
        ];
        let brightened = 0;
        for (let c = 0; c < 3; c++) {
          const obs = channels[c][0];
          const base = channels[c][1];
          const diff = obs - base;
          if (diff >= 6) brightened++;
          if (base < 238 && diff >= 4) {
            alphas.push(Math.max(0, Math.min(1, diff / (255 - base))));
          }
        }

        const isClipped = r >= 250 && g >= 250 && b >= 250;
        if (!isClipped && brightened >= 2 && alphas.length >= 2) {
          let aMin = 1;
          let aMax = 0;
          let aSum = 0;
          for (let c = 0; c < alphas.length; c++) {
            if (alphas[c] < aMin) aMin = alphas[c];
            if (alphas[c] > aMax) aMax = alphas[c];
            aSum += alphas[c];
          }
          const alpha = aSum / alphas.length;

          // Consistent alpha across channels confirms neutral white/light watermark veil
          if (alpha > 0.06 && alpha < 0.74 && (aMax - aMin) < 0.28) {
            const effAlpha = alpha * strength;
            const inv = 1 / Math.max(0.26, 1 - effAlpha);
            roiSrc[p] = Math.max(0, Math.min(255, Math.round((r - effAlpha * 255) * inv)));
            roiSrc[p + 1] = Math.max(0, Math.min(255, Math.round((g - effAlpha * 255) * inv)));
            roiSrc[p + 2] = Math.max(0, Math.min(255, Math.round((b - effAlpha * 255) * inv)));
            stillOpaque[idx] = 0;
            recoveredPixels++;
          }
        } else if (
          Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb) < 26
        ) {
          // Clean un-watermarked background pixel inside brush stroke: keep exact crisp original pixel
          stillOpaque[idx] = 0;
          recoveredPixels++;
        }
      }
    }

    // Re-dilate any remaining opaque watermark cores by 1px to avoid bright fringe
    if (recoveredPixels > 0) {
      roiMask.set(stillOpaque);
      const fringeCopy = new Uint8Array(stillOpaque);
      for (let y = 1; y < roiH - 1; y++) {
        for (let x = 1; x < roiW - 1; x++) {
          if (stillOpaque[y * roiW + x] === 1) {
            for (let k = 0; k < 8; k++) {
              fringeCopy[(y + NEIGHBOR_DY[k]) * roiW + (x + NEIGHBOR_DX[k])] = 1;
            }
          }
        }
      }
      roiMask.set(fringeCopy);
    }
  }

  // Fast mode path (< 0.4s): Directional edge peel + minimal 1-pass blend + edge feather
  if (mode === 'fast') {
    report(45, 'Running fast directional fill...');
    const fastOut = new Uint8ClampedArray(roiSrc);
    directionalPeelInit(fastOut, roiMask, roiW, roiH, intensity <= 50 ? 1 : 2);
    report(88, 'Feathering edges...');
    copyRoiMaskBack(out, fastOut, roiMask, width, roiX0, roiY0, roiW, roiH, undefined, false, strength);
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    report(100, 'Done!');
    return {
      imageData: new ImageData(out, width, height),
      durationMs: Math.max(1, Math.round(end - start)),
      pixelsRepaired: remaining,
      modeUsed: mode,
    };
  }

  // Stage 1: Directional Isophote-Guided Structural Baseline (for HD & leftover opaque pixels)
  report(18, 'Stage 1/3: Reconstructing image edges & structure...');
  await yieldToMain();

  const roiWork = new Uint8ClampedArray(roiSrc);
  const peelRelaxPasses = intensity <= 50 ? 1 : 2;
  const peelOrder = directionalPeelInit(roiWork, roiMask, roiW, roiH, peelRelaxPasses);

  if (peelOrder.length === 0) {
    // Everything recovered cleanly by translucent matte pass
    copyRoiMaskBack(out, roiSrc, dilated, width, roiX0, roiY0, roiW, roiH, roiMask, true, 1);
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    report(100, 'Complete!');
    return {
      imageData: new ImageData(out, width, height),
      durationMs: Math.max(1, Math.round(end - start)),
      pixelsRepaired: remaining,
      modeUsed: mode,
    };
  }

  // Stage 2: Multi-Scale Coarse-to-Fine PatchMatch Nearest-Neighbor Field (Zero-Blur Texture Search)
  report(34, 'Stage 2/3: Searching crisp background textures...');
  await yieldToMain();

  let coarseNnfX: Int16Array | null = null;
  let coarseNnfY: Int16Array | null = null;
  const maxMaskDim = Math.max(maskW, maskH);

  // Run coarse half-resolution PatchMatch when watermark is medium/large so curves & lines align globally
  if (maxMaskDim >= 36 && roiW >= 64 && roiH >= 64) {
    const halfW = Math.max(16, roiW >> 1);
    const halfH = Math.max(16, roiH >> 1);
    const halfImg = downsample2x(roiWork, roiW, roiH, halfW, halfH);
    const halfMask = downsampleMask2x(roiMask, roiW, roiH, halfW, halfH);
    const halfPeel = collectMaskPixels(halfMask, halfW, halfH);

    if (halfPeel.length > 0) {
      const coarseRes = await runPatchMatchNNF(halfImg, halfImg, halfMask, halfPeel, halfW, halfH, 4, null, null);
      coarseNnfX = coarseRes.nnfX;
      coarseNnfY = coarseRes.nnfY;
    }
  }

  report(52, 'Stage 2/3: Matching high-resolution pixel patterns...');
  await yieldToMain();

  // Initialize full-res NNF seeded from coarse NNF (if available) and run 5 crisp iterations
  const fullIterations = peelOrder.length > 90000 ? 4 : 5;
  const nnfResult = await runPatchMatchNNF(
    roiSrc,
    roiWork,
    roiMask,
    peelOrder,
    roiW,
    roiH,
    fullIterations,
    coarseNnfX,
    coarseNnfY,
    async (iter, totalIter) => {
      const pct = 52 + ((iter + 1) / totalIter) * 28;
      report(pct, `Stage 2/3: Refining crisp texture (${iter + 1}/${totalIter})...`);
      await yieldToMain();
    }
  );

  // Construct direct crisp texture copy G from converged NNF offsets
  const crispCopy = new Uint8ClampedArray(roiSrc);
  for (let i = 0; i < peelOrder.length; i++) {
    const idx = peelOrder[i];
    const sx = nnfResult.nnfX[idx];
    const sy = nnfResult.nnfY[idx];
    if (sx >= 0 && sy >= 0) {
      const sp = (sy * roiW + sx) * 4;
      const dp = idx * 4;
      crispCopy[dp] = roiSrc[sp];
      crispCopy[dp + 1] = roiSrc[sp + 1];
      crispCopy[dp + 2] = roiSrc[sp + 2];
      crispCopy[dp + 3] = 255;
    }
  }

  // Stage 3: Poisson SOR Seamless Gradient Blending
  // Preserves 100% sharp edges & textures from crispCopy while removing any exposure/color step at the boundary!
  report(84, 'Stage 3/3: Seamless lighting & edge blending...');
  await yieldToMain();

  const seamlessPixels = solvePoissonSOR(
    roiSrc,
    crispCopy,
    roiMask,
    peelOrder,
    nnfResult.nnfX,
    nnfResult.nnfY,
    roiW,
    roiH,
    42
  );

  // Copy back repaired ROI pixels scaled cleanly by selected intensity (100% = full replacement; lower = gentler blend avoiding blur/distortion)
  const invStrength = 1 - strength;
  for (let y = 0; y < roiH; y++) {
    const gy = roiY0 + y;
    const gRow = gy * width + roiX0;
    const rRow = y * roiW;
    for (let x = 0; x < roiW; x++) {
      const rIdx = rRow + x;
      const gIdx = gRow + x;
      if (dilated[gIdx] === 1) {
        const gp = gIdx * 4;
        const rp = rIdx * 4;
        if (roiMask[rIdx] === 1) {
          if (strength >= 0.99) {
            out[gp] = seamlessPixels[rp];
            out[gp + 1] = seamlessPixels[rp + 1];
            out[gp + 2] = seamlessPixels[rp + 2];
          } else {
            out[gp] = Math.round(src[gp] * invStrength + seamlessPixels[rp] * strength);
            out[gp + 1] = Math.round(src[gp + 1] * invStrength + seamlessPixels[rp + 1] * strength);
            out[gp + 2] = Math.round(src[gp + 2] * invStrength + seamlessPixels[rp + 2] * strength);
          }
          out[gp + 3] = 255;
        } else if (mode === 'translucent') {
          // Pixel was recovered directly by translucent alpha matte removal
          out[gp] = roiSrc[rp];
          out[gp + 1] = roiSrc[rp + 1];
          out[gp + 2] = roiSrc[rp + 2];
          out[gp + 3] = 255;
        }
      }
    }
  }

  report(100, 'Complete!');
  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    imageData: new ImageData(out, width, height),
    durationMs: Math.max(1, Math.round(end - start)),
    pixelsRepaired: remaining,
    modeUsed: mode,
  };
}

function copyRoiMaskBack(
  out: Uint8ClampedArray,
  roiOut: Uint8ClampedArray,
  roiMask: Uint8Array,
  fullW: number,
  roiX0: number,
  roiY0: number,
  roiW: number,
  roiH: number,
  overrideMask?: Uint8Array,
  copyAllInRoi = false,
  strength = 1
) {
  const invStrength = 1 - strength;
  for (let y = 0; y < roiH; y++) {
    const gRow = (roiY0 + y) * fullW + roiX0;
    const rRow = y * roiW;
    for (let x = 0; x < roiW; x++) {
      const rIdx = rRow + x;
      const use = copyAllInRoi ? roiMask[(roiY0 + y) * fullW + (roiX0 + x)] === 1 : roiMask[rIdx] === 1;
      if (use || (overrideMask && overrideMask[rIdx] === 1)) {
        const gp = (gRow + x) * 4;
        const rp = rIdx * 4;
        if (strength >= 0.99) {
          out[gp] = roiOut[rp];
          out[gp + 1] = roiOut[rp + 1];
          out[gp + 2] = roiOut[rp + 2];
        } else {
          out[gp] = Math.round(out[gp] * invStrength + roiOut[rp] * strength);
          out[gp + 1] = Math.round(out[gp + 1] * invStrength + roiOut[rp + 1] * strength);
          out[gp + 2] = Math.round(out[gp + 2] * invStrength + roiOut[rp + 2] * strength);
        }
        out[gp + 3] = 255;
      }
    }
  }
}

/**
 * Directional Isophote-Guided Onion-Peel Diffusion.
 * Estimates structural edge directions around known pixels so edges propagate straight into gaps.
 */
function directionalPeelInit(
  pixels: Uint8ClampedArray,
  mask: Uint8Array,
  w: number,
  h: number,
  relaxPasses: number
): number[] {
  const total = w * h;
  const state = new Uint8Array(mask); // 0 = known, 1 = unfilled, 2 = filled
  const inFrontier = new Uint8Array(total);
  const peelOrder: number[] = [];

  // Precompute luminance & gradient magnitude/direction for structure-aware continuation
  const lum = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    lum[i] = 0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2];
  }

  let frontier: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (state[idx] !== 1) continue;
      let touchesKnown = false;
      for (let k = 0; k < 8; k++) {
        const nx = x + NEIGHBOR_DX[k];
        const ny = y + NEIGHBOR_DY[k];
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && state[ny * w + nx] === 0) {
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

  let guard = 0;
  while (frontier.length > 0 && guard < 2500) {
    guard++;
    const nextFrontier: number[] = [];

    for (let f = 0; f < frontier.length; f++) {
      const idx = frontier[f];
      const cx = idx % w;
      const cy = (idx / w) | 0;

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumW = 0;

      for (let dy = -3; dy <= 3; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -3; dx <= 3; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          if (nx < 0 || nx >= w) continue;
          const nIdx = ny * w + nx;
          const st = state[nIdx];
          if (st === 1) continue;

          const dist2 = dx * dx + dy * dy;
          if (dist2 > 11) continue;

          // Isophote weight: measure local gradient at (nx, ny) if interior
          let dirBoost = 1.0;
          if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1) {
            const gx = lum[nIdx + 1] - lum[nIdx - 1];
            const gy = lum[nIdx + w] - lum[nIdx - w];
            const gMag = Math.hypot(gx, gy);
            if (gMag > 6) {
              // Vector from neighbor -> center is (-dx, -dy); tangent is (-gy, gx)
              const dist = Math.sqrt(dist2);
              const cross = Math.abs((-dx * gx - dy * gy)) / (dist * gMag);
              // When step vector is perpendicular to gradient (along the edge/isophote), cross is near 0 -> boost!
              const alongEdge = 1 - cross;
              dirBoost = 0.65 + 2.2 * alongEdge * alongEdge;
            }
          }

          const anchorBoost = st === 0 ? 1.85 : 1.0;
          const weight = (anchorBoost * dirBoost) / (dist2 + 0.35);
          const p = nIdx * 4;
          sumR += pixels[p] * weight;
          sumG += pixels[p + 1] * weight;
          sumB += pixels[p + 2] * weight;
          sumW += weight;
        }
      }

      if (sumW > 0) {
        const p = idx * 4;
        const r = Math.round(sumR / sumW);
        const g = Math.round(sumG / sumW);
        const b = Math.round(sumB / sumW);
        pixels[p] = r;
        pixels[p + 1] = g;
        pixels[p + 2] = b;
        pixels[p + 3] = 255;
        lum[idx] = 0.299 * r + 0.587 * g + 0.114 * b;
      }

      peelOrder.push(idx);

      for (let k = 0; k < 8; k++) {
        const nx = cx + NEIGHBOR_DX[k];
        const ny = cy + NEIGHBOR_DY[k];
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nIdx = ny * w + nx;
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

  // Light harmonic relaxation for baseline smoothness
  if (relaxPasses > 0 && peelOrder.length > 0) {
    const tmp = new Uint8ClampedArray(pixels);
    for (let pass = 0; pass < relaxPasses; pass++) {
      for (let i = 0; i < peelOrder.length; i++) {
        const idx = peelOrder[i];
        const cx = idx % w;
        const cy = (idx / w) | 0;
        let r = 0;
        let g = 0;
        let b = 0;
        let wSum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            if (nx < 0 || nx >= w) continue;
            const nIdx = ny * w + nx;
            const wt = dx === 0 && dy === 0 ? 1 : dx === 0 || dy === 0 ? 2 : 1;
            const np = nIdx * 4;
            r += pixels[np] * wt;
            g += pixels[np + 1] * wt;
            b += pixels[np + 2] * wt;
            wSum += wt;
          }
        }
        const p = idx * 4;
        tmp[p] = (r / wSum) | 0;
        tmp[p + 1] = (g / wSum) | 0;
        tmp[p + 2] = (b / wSum) | 0;
      }
      for (let i = 0; i < peelOrder.length; i++) {
        const p = peelOrder[i] * 4;
        pixels[p] = tmp[p];
        pixels[p + 1] = tmp[p + 1];
        pixels[p + 2] = tmp[p + 2];
      }
    }
  }

  return peelOrder;
}

function collectMaskPixels(mask: Uint8Array, w: number, h: number): number[] {
  const list: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (mask[i] === 1) list.push(i);
  }
  return list;
}

function downsample2x(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  dw: number,
  dh: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(h - 1, y * 2);
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(w - 1, x * 2);
      const sp = (sy * w + sx) * 4;
      const dp = (y * dw + x) * 4;
      out[dp] = src[sp];
      out[dp + 1] = src[sp + 1];
      out[dp + 2] = src[sp + 2];
      out[dp + 3] = 255;
    }
  }
  return out;
}

function downsampleMask2x(mask: Uint8Array, w: number, h: number, dw: number, dh: number): Uint8Array {
  const out = new Uint8Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const sy0 = Math.min(h - 1, y * 2);
    const sy1 = Math.min(h - 1, y * 2 + 1);
    for (let x = 0; x < dw; x++) {
      const sx0 = Math.min(w - 1, x * 2);
      const sx1 = Math.min(w - 1, x * 2 + 1);
      if (
        mask[sy0 * w + sx0] === 1 ||
        mask[sy0 * w + sx1] === 1 ||
        mask[sy1 * w + sx0] === 1 ||
        mask[sy1 * w + sx1] === 1
      ) {
        out[y * dw + x] = 1;
      }
    }
  }
  return out;
}

/**
 * Iterative Bidirectional PatchMatch NNF Solver.
 * Propagates coherent texture chunks & performs exponentially shrinking random search.
 */
async function runPatchMatchNNF(
  cleanSourcePixels: Uint8ClampedArray,
  workPixels: Uint8ClampedArray,
  mask: Uint8Array,
  peelOrder: number[],
  w: number,
  h: number,
  iterations: number,
  coarseNnfX: Int16Array | null,
  coarseNnfY: Int16Array | null,
  onIterProgress?: (iter: number, totalIter: number) => Promise<void>
): Promise<{ nnfX: Int16Array; nnfY: Int16Array }> {
  const total = w * h;
  const nnfX = new Int16Array(total).fill(-1);
  const nnfY = new Int16Array(total).fill(-1);
  const nnfErr = new Float32Array(total).fill(1e15);

  // Build valid 7x7 source center map (must contain 0 masked pixels inside [-3..+3])
  const validSource = new Uint8Array(total);
  const validIndices: number[] = [];
  for (let y = 3; y <= h - 4; y++) {
    for (let x = 3; x <= w - 4; x++) {
      let ok = true;
      for (let dy = -3; dy <= 3 && ok; dy++) {
        const row = (y + dy) * w;
        for (let dx = -3; dx <= 3; dx++) {
          if (mask[row + x + dx] === 1) {
            ok = false;
            break;
          }
        }
      }
      if (ok) {
        const idx = y * w + x;
        validSource[idx] = 1;
        validIndices.push(idx);
      }
    }
  }

  // Fallback to single-pixel clean check if region is extremely dense
  if (validIndices.length === 0) {
    for (let y = 3; y <= h - 4; y++) {
      for (let x = 3; x <= w - 4; x++) {
        const idx = y * w + x;
        if (mask[idx] === 0) {
          validSource[idx] = 1;
          validIndices.push(idx);
        }
      }
    }
  }

  if (validIndices.length === 0) {
    return { nnfX, nnfY };
  }

  // Precompute gradient arrays for cleanSourcePixels (for source candidates) and workPixels (for target patches)
  const srcLum = new Float32Array(total);
  const workLum = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    srcLum[i] = 0.299 * cleanSourcePixels[p] + 0.587 * cleanSourcePixels[p + 1] + 0.114 * cleanSourcePixels[p + 2];
    workLum[i] = 0.299 * workPixels[p] + 0.587 * workPixels[p + 1] + 0.114 * workPixels[p + 2];
  }

  const srcGx = new Float32Array(total);
  const srcGy = new Float32Array(total);
  const workGx = new Float32Array(total);
  const workGy = new Float32Array(total);

  const recomputeWorkGradients = () => {
    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = row + x;
        const p = idx * 4;
        workLum[idx] = 0.299 * workPixels[p] + 0.587 * workPixels[p + 1] + 0.114 * workPixels[p + 2];
      }
    }
    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = row + x;
        workGx[idx] = workLum[idx + 1] - workLum[idx - 1];
        workGy[idx] = workLum[idx + w] - workLum[idx - w];
      }
    }
  };

  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const idx = row + x;
      srcGx[idx] = srcLum[idx + 1] - srcLum[idx - 1];
      srcGy[idx] = srcLum[idx + w] - srcLum[idx - w];
    }
  }
  recomputeWorkGradients();

  // Deterministic fast PRNG for random search
  let seed = 133791;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Compute patch similarity error combining color, directional gradient, and local spatial coherence
  const evalPatch = (tx: number, ty: number, sx: number, sy: number): number => {
    if (sx < 3 || sx > w - 4 || sy < 3 || sy > h - 4) return 1e14;
    if (validSource[sy * w + sx] !== 1) return 1e14;

    let cost = 0;
    for (let t = 0; t < PATCH_TAPS.length; t++) {
      const dx = PATCH_TAPS[t][0];
      const dy = PATCH_TAPS[t][1];
      const tapW = PATCH_TAPS[t][2];

      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;

      const tIdx = ny * w + nx;
      const sIdx = (sy + dy) * w + (sx + dx);
      const tp = tIdx * 4;
      const sp = sIdx * 4;

      const dr = workPixels[tp] - cleanSourcePixels[sp];
      const dg = workPixels[tp + 1] - cleanSourcePixels[sp + 1];
      const db = workPixels[tp + 2] - cleanSourcePixels[sp + 2];
      const dgx = workGx[tIdx] - srcGx[sIdx];
      const dgy = workGy[tIdx] - srcGy[sIdx];

      // Known original anchor pixels carry 3x weight so patches lock sharply to the boundary
      const anchorW = mask[tIdx] === 0 ? 3.0 : 1.0;
      cost += (dr * dr + dg * dg + db * db + 1.8 * (dgx * dgx + dgy * dgy)) * tapW * anchorW;
    }

    // Mild proximity penalty so textures prefer physically nearby regions
    const dist2 = (sx - tx) * (sx - tx) + (sy - ty) * (sy - ty);
    cost += dist2 * 0.06;

    // Coherence bonus if shifted neighbor matches neighboring NNF offset (all 4 cardinal directions)
    let coherentHits = 0;
    if (tx > 0 && mask[ty * w + tx - 1] === 1 && nnfX[ty * w + tx - 1] >= 0 && Math.abs(nnfX[ty * w + tx - 1] + 1 - sx) <= 1 && Math.abs(nnfY[ty * w + tx - 1] - sy) <= 1) {
      coherentHits++;
    }
    if (ty > 0 && mask[(ty - 1) * w + tx] === 1 && nnfX[(ty - 1) * w + tx] >= 0 && Math.abs(nnfX[(ty - 1) * w + tx] - sx) <= 1 && Math.abs(nnfY[(ty - 1) * w + tx] + 1 - sy) <= 1) {
      coherentHits++;
    }
    if (tx < w - 1 && mask[ty * w + tx + 1] === 1 && nnfX[ty * w + tx + 1] >= 0 && Math.abs(nnfX[ty * w + tx + 1] - 1 - sx) <= 1 && Math.abs(nnfY[ty * w + tx + 1] - sy) <= 1) {
      coherentHits++;
    }
    if (ty < h - 1 && mask[(ty + 1) * w + tx] === 1 && nnfX[(ty + 1) * w + tx] >= 0 && Math.abs(nnfX[(ty + 1) * w + tx] - sx) <= 1 && Math.abs(nnfY[(ty + 1) * w + tx] - 1 - sy) <= 1) {
      coherentHits++;
    }
    if (coherentHits > 0) {
      cost *= coherentHits >= 2 ? 0.82 : 0.90;
    }

    return cost;
  };

  // Outward-to-Inward Exemplar Seed Pass:
  // Only scores already-known / already-synthesized sharp pixels (ignores blurry harmonic center!),
  // immediately propagates exact crisp edges & periodic textures cleanly inward layer by layer.
  const filled = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (mask[i] === 0) filled[i] = 1;
  }

  const evalSeedPatch = (tx: number, ty: number, sx: number, sy: number): number => {
    if (sx < 3 || sx > w - 4 || sy < 3 || sy > h - 4) return 1e14;
    if (validSource[sy * w + sx] !== 1) return 1e14;

    let cost = 0;
    let wSum = 0;
    for (let t = 0; t < PATCH_TAPS.length; t++) {
      const dx = PATCH_TAPS[t][0];
      const dy = PATCH_TAPS[t][1];
      const tapW = PATCH_TAPS[t][2];

      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;

      const tIdx = ny * w + nx;
      if (filled[tIdx] !== 1) continue; // Only score known / already synthesized crisp pixels

      const sIdx = (sy + dy) * w + (sx + dx);
      const tp = tIdx * 4;
      const sp = sIdx * 4;

      const dr = workPixels[tp] - cleanSourcePixels[sp];
      const dg = workPixels[tp + 1] - cleanSourcePixels[sp + 1];
      const db = workPixels[tp + 2] - cleanSourcePixels[sp + 2];
      const anchorW = mask[tIdx] === 0 ? 2.5 : 1.0;
      const effW = tapW * anchorW;

      cost += (dr * dr + dg * dg + db * db) * effW;
      wSum += effW;
    }

    if (wSum <= 0.001) return 1e13;
    let avgCost = cost / wSum;
    const dist2 = (sx - tx) * (sx - tx) + (sy - ty) * (sy - ty);
    avgCost += dist2 * 0.015;
    return avgCost;
  };

  const halfW = w >> 1;
  const halfH = h >> 1;

  for (let i = 0; i < peelOrder.length; i++) {
    const idx = peelOrder[i];
    const tx = idx % w;
    const ty = (idx / w) | 0;

    let bestX = -1;
    let bestY = -1;
    let bestE = 1e14;

    const testSeed = (cx: number, cy: number) => {
      if (cx < 3 || cx > w - 4 || cy < 3 || cy > h - 4) return;
      const e = evalSeedPatch(tx, ty, cx, cy);
      if (e < bestE) {
        bestE = e;
        bestX = cx;
        bestY = cy;
      }
    };

    // Propagate exact shifts from any of the 8 already-filled neighbors!
    for (let k = 0; k < 8; k++) {
      const nx = tx + NEIGHBOR_DX[k];
      const ny = ty + NEIGHBOR_DY[k];
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nIdx = ny * w + nx;
        if (mask[nIdx] === 1 && filled[nIdx] === 1 && nnfX[nIdx] >= 0) {
          testSeed(nnfX[nIdx] - NEIGHBOR_DX[k], nnfY[nIdx] - NEIGHBOR_DY[k]);
        }
      }
    }

    // Also test upsampled coarse NNF proposal when available
    if (coarseNnfX && coarseNnfY) {
      const cx = Math.min(halfW - 1, tx >> 1);
      const cy = Math.min(halfH - 1, ty >> 1);
      const csx = coarseNnfX[cy * halfW + cx] * 2;
      const csy = coarseNnfY[cy * halfW + cx] * 2;
      testSeed(csx, csy);
    }

    // Test multi-ring nearby + global valid source candidates (for first border layer & new corners)
    const numSamples = bestE > 450 ? 18 : 6;
    for (let s = 0; s < numSamples; s++) {
      const cIdx = validIndices[(rand() * validIndices.length) | 0];
      testSeed(cIdx % w, (cIdx / w) | 0);
    }

    if (bestX < 0) {
      const fallback = validIndices[i % validIndices.length];
      bestX = fallback % w;
      bestY = (fallback / w) | 0;
      bestE = evalSeedPatch(tx, ty, bestX, bestY);
    }

    nnfX[idx] = bestX;
    nnfY[idx] = bestY;
    nnfErr[idx] = bestE;
    filled[idx] = 1;

    // Immediately write crisp winning pixel so the next inward layer matches sharp real detail
    const sp = (bestY * w + bestX) * 4;
    const dp = idx * 4;
    workPixels[dp] = cleanSourcePixels[sp];
    workPixels[dp + 1] = cleanSourcePixels[sp + 1];
    workPixels[dp + 2] = cleanSourcePixels[sp + 2];
  }

  recomputeWorkGradients();

  // Sort masked pixels in strict scanline order for clean directional propagation
  const scanOrder = Int32Array.from(peelOrder).sort((a, b) => a - b);
  const maxSearchRadius = Math.max(w, h);

  // Run PatchMatch propagation + multi-scale random search iterations
  for (let iter = 0; iter < iterations; iter++) {
    const forward = iter % 2 === 0;
    const stepDir = forward ? 1 : -1;
    const startI = forward ? 0 : scanOrder.length - 1;
    const endI = forward ? scanOrder.length : -1;

    for (let i = startI; i !== endI; i += stepDir) {
      const idx = scanOrder[i];
      const tx = idx % w;
      const ty = (idx / w) | 0;

      let bestX = nnfX[idx];
      let bestY = nnfY[idx];
      let bestE = evalPatch(tx, ty, bestX, bestY);

      const tryCandidate = (cx: number, cy: number) => {
        if (cx < 3 || cx > w - 4 || cy < 3 || cy > h - 4) return;
        const e = evalPatch(tx, ty, cx, cy);
        if (e < bestE) {
          bestE = e;
          bestX = cx;
          bestY = cy;
        }
      };

      // 1. Spatial Propagation (horizontal, vertical, diagonal neighbors)
      if (forward) {
        if (tx > 0 && mask[idx - 1] === 1 && nnfX[idx - 1] >= 0) {
          tryCandidate(nnfX[idx - 1] + 1, nnfY[idx - 1]);
        }
        if (ty > 0 && mask[idx - w] === 1 && nnfX[idx - w] >= 0) {
          tryCandidate(nnfX[idx - w], nnfY[idx - w] + 1);
        }
        if (tx > 0 && ty > 0 && mask[idx - w - 1] === 1 && nnfX[idx - w - 1] >= 0) {
          tryCandidate(nnfX[idx - w - 1] + 1, nnfY[idx - w - 1] + 1);
        }
      } else {
        if (tx < w - 1 && mask[idx + 1] === 1 && nnfX[idx + 1] >= 0) {
          tryCandidate(nnfX[idx + 1] - 1, nnfY[idx + 1]);
        }
        if (ty < h - 1 && mask[idx + w] === 1 && nnfX[idx + w] >= 0) {
          tryCandidate(nnfX[idx + w], nnfY[idx + w] - 1);
        }
        if (tx < w - 1 && ty < h - 1 && mask[idx + w + 1] === 1 && nnfX[idx + w + 1] >= 0) {
          tryCandidate(nnfX[idx + w + 1] - 1, nnfY[idx + w + 1] - 1);
        }
      }

      // 2. Exponentially shrinking Random Search around current best offset
      let radius = maxSearchRadius;
      while (radius >= 4) {
        const rx = bestX + Math.round((rand() * 2 - 1) * radius);
        const ry = bestY + Math.round((rand() * 2 - 1) * radius);
        tryCandidate(rx, ry);
        radius >>= 1;
      }

      // 3. One local ring jump to avoid getting stuck in local minima
      const rIdx = validIndices[(rand() * validIndices.length) | 0];
      tryCandidate(rIdx % w, (rIdx / w) | 0);

      nnfX[idx] = bestX;
      nnfY[idx] = bestY;
      nnfErr[idx] = bestE;
    }

    // Update target workPixels gently toward best crisp source colors so next iter refines sharper alignment
    const blendAlpha = iter === iterations - 1 ? 1.0 : 0.72;
    const invAlpha = 1 - blendAlpha;
    for (let i = 0; i < scanOrder.length; i++) {
      const idx = scanOrder[i];
      const sx = nnfX[idx];
      const sy = nnfY[idx];
      if (sx < 0 || sy < 0) continue;
      const sp = (sy * w + sx) * 4;
      const dp = idx * 4;
      workPixels[dp] = Math.round(workPixels[dp] * invAlpha + cleanSourcePixels[sp] * blendAlpha);
      workPixels[dp + 1] = Math.round(workPixels[dp + 1] * invAlpha + cleanSourcePixels[sp + 1] * blendAlpha);
      workPixels[dp + 2] = Math.round(workPixels[dp + 2] * invAlpha + cleanSourcePixels[sp + 2] * blendAlpha);
    }

    recomputeWorkGradients();
    if (onIterProgress) {
      await onIterProgress(iter, iterations);
    }
  }

  return { nnfX, nnfY };
}

/**
 * Poisson Successive Over-Relaxation (SOR) Seamless Solver.
 * Solves Δf = div(G) with fixed boundary values from original clean image pixels.
 * Keeps crisp copied textures & edges intact while eliminating lighting/color seams.
 */
function solvePoissonSOR(
  originalRoi: Uint8ClampedArray,
  crispCopy: Uint8ClampedArray,
  mask: Uint8Array,
  peelOrder: number[],
  nnfX: Int16Array,
  nnfY: Int16Array,
  w: number,
  h: number,
  numPasses: number
): Uint8ClampedArray {
  const total = w * h;
  const fR = new Float32Array(total);
  const fG = new Float32Array(total);
  const fB = new Float32Array(total);

  // Initialize field: known pixels stay exact originalRoi; masked pixels start at crispCopy
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    if (mask[i] === 0) {
      fR[i] = originalRoi[p];
      fG[i] = originalRoi[p + 1];
      fB[i] = originalRoi[p + 2];
    } else {
      fR[i] = crispCopy[p];
      fG[i] = crispCopy[p + 1];
      fB[i] = crispCopy[p + 2];
    }
  }

  // Precompute target gradient divergence (divR, divG, divB) for every masked pixel
  const count = peelOrder.length;
  const divR = new Float32Array(count);
  const divG = new Float32Array(count);
  const divB = new Float32Array(count);
  const deg = new Uint8Array(count);

  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let i = 0; i < count; i++) {
    const idx = peelOrder[i];
    const x = idx % w;
    const y = (idx / w) | 0;
    const p = idx * 4;
    const sx = nnfX[idx];
    const sy = nnfY[idx];

    let sumDR = 0;
    let sumDG = 0;
    let sumDB = 0;
    let neighbors = 0;

    for (let d = 0; d < 4; d++) {
      const nx = x + dirs[d][0];
      const ny = y + dirs[d][1];
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      neighbors++;
      const nIdx = ny * w + nx;
      const np = nIdx * 4;

      if (mask[nIdx] === 0) {
        // Boundary edge: use smooth gradient inside original clean source patch around (sx, sy)
        // so brightness offsets across the boundary melt away seamlessly
        const snx = Math.max(0, Math.min(w - 1, sx + dirs[d][0]));
        const sny = Math.max(0, Math.min(h - 1, sy + dirs[d][1]));
        const sp = (sy * w + sx) * 4;
        const snp = (sny * w + snx) * 4;
        sumDR += originalRoi[sp] - originalRoi[snp];
        sumDG += originalRoi[sp + 1] - originalRoi[snp + 1];
        sumDB += originalRoi[sp + 2] - originalRoi[snp + 2];
      } else {
        // Interior edge: strictly antisymmetric crispCopy[p] - crispCopy[np] (zero curl -> zero dark/bright artifacts!)
        sumDR += crispCopy[p] - crispCopy[np];
        sumDG += crispCopy[p + 1] - crispCopy[np + 1];
        sumDB += crispCopy[p + 2] - crispCopy[np + 2];
      }
    }

    divR[i] = sumDR;
    divG[i] = sumDG;
    divB[i] = sumDB;
    deg[i] = neighbors;
  }

  // Run Successive Over-Relaxation (ω = 1.6) strictly over masked pixels
  const omega = 1.6;
  const sortOrder = Int32Array.from({ length: count }, (_, k) => k);
  // Sort by peelOrder pixel index for spatial cache locality
  sortOrder.sort((a, b) => peelOrder[a] - peelOrder[b]);

  for (let pass = 0; pass < numPasses; pass++) {
    for (let k = 0; k < count; k++) {
      const i = sortOrder[k];
      const idx = peelOrder[i];
      const x = idx % w;
      const y = (idx / w) | 0;
      const dCount = deg[i];
      if (dCount === 0) continue;

      let nR = 0;
      let nG = 0;
      let nB = 0;

      if (x > 0) {
        nR += fR[idx - 1];
        nG += fG[idx - 1];
        nB += fB[idx - 1];
      }
      if (x < w - 1) {
        nR += fR[idx + 1];
        nG += fG[idx + 1];
        nB += fB[idx + 1];
      }
      if (y > 0) {
        nR += fR[idx - w];
        nG += fG[idx - w];
        nB += fB[idx - w];
      }
      if (y < h - 1) {
        nR += fR[idx + w];
        nG += fG[idx + w];
        nB += fB[idx + w];
      }

      const invD = 1 / dCount;
      const targetR = (nR + divR[i]) * invD;
      const targetG = (nG + divG[i]) * invD;
      const targetB = (nB + divB[i]) * invD;

      fR[idx] = Math.max(-40, Math.min(295, fR[idx] + omega * (targetR - fR[idx])));
      fG[idx] = Math.max(-40, Math.min(295, fG[idx] + omega * (targetG - fG[idx])));
      fB[idx] = Math.max(-40, Math.min(295, fB[idx] + omega * (targetB - fB[idx])));
    }
  }

  const out = new Uint8ClampedArray(total * 4);
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    out[p] = Math.max(0, Math.min(255, Math.round(fR[i])));
    out[p + 1] = Math.max(0, Math.min(255, Math.round(fG[i])));
    out[p + 2] = Math.max(0, Math.min(255, Math.round(fB[i])));
    out[p + 3] = 255;
  }
  return out;
}
