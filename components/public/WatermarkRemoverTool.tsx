'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Eraser,
  Download,
  Undo2,
  Trash2,
  Sparkles,
  RefreshCw,
  Wand2,
  Eye,
  ShieldCheck,
  WifiOff,
  CheckCircle2,
  SlidersHorizontal,
  CornerDownRight,
  CornerDownLeft,
  Layers,
  Zap,
} from 'lucide-react';
import {
  removeWatermarkInpaint,
  type WatermarkRemovalMode,
  type InpaintProgress,
} from '@/lib/watermark-remover';
import { useApp } from '@/context/AppContext';
import { WatermarkRemoverSEO } from '@/components/public/WatermarkRemoverSEO';

export const WatermarkRemoverTool = () => {
  const { showToast } = useApp();

  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [brushSize, setBrushSize] = useState<number>(28);
  const [removalMode, setRemovalMode] = useState<WatermarkRemovalMode>('hd');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState<InpaintProgress>({ percent: 0, stage: '' });
  const [hasMaskStrokes, setHasMaskStrokes] = useState(false);
  const [hasProcessedResult, setHasProcessedResult] = useState(false);
  const [comparePosition, setComparePosition] = useState<number>(50);
  const [showCompareMode, setShowCompareMode] = useState(false);
  const [lastProcessMs, setLastProcessMs] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalSnapshotRef = useRef<ImageData | null>(null);
  const undoSnapshotsRef = useRef<ImageData[]>([]);
  const maskHistoryRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const beforeDataUrlRef = useRef<string>('');
  const afterDataUrlRef = useRef<string>('');

  const [beforePreviewUrl, setBeforePreviewUrl] = useState<string>('');
  const [afterPreviewUrl, setAfterPreviewUrl] = useState<string>('');

  const drawLoadedImage = useCallback((img: HTMLImageElement) => {
    const imgCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!imgCanvas || !maskCanvas) return;

    // Keep full crisp mobile resolution capped at 2400px longest side for instant <1s mobile RAM safety
    const maxDim = 2400;
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    imgCanvas.width = w;
    imgCanvas.height = h;
    maskCanvas.width = w;
    maskCanvas.height = h;

    const ctx = imgCanvas.getContext('2d', { willReadFrequently: true });
    const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !mCtx) return;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    mCtx.clearRect(0, 0, w, h);

    const snapshot = ctx.getImageData(0, 0, w, h);
    originalSnapshotRef.current = snapshot;
    undoSnapshotsRef.current = [];
    maskHistoryRef.current = [];

    try {
      const url = imgCanvas.toDataURL('image/png');
      beforeDataUrlRef.current = url;
      setBeforePreviewUrl(url);
      setAfterPreviewUrl('');
    } catch {}

    setImageDimensions({ width: w, height: h });
    setHasImage(true);
    setHasMaskStrokes(false);
    setHasProcessedResult(false);
    setShowCompareMode(false);
    setLastProcessMs(null);
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (PNG, JPG, WEBP).');
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        setHasImage(true);
        requestAnimationFrame(() => {
          drawLoadedImage(img);
          URL.revokeObjectURL(objectUrl);
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        showToast('Could not decode this image file.');
      };
      img.src = objectUrl;
    },
    [drawLoadedImage, showToast]
  );

  // Sync image canvas dimensions after first file loads into DOM
  useEffect(() => {
    if (!hasImage && imageCanvasRef.current && maskCanvasRef.current) {
      imageCanvasRef.current.width = 0;
      maskCanvasRef.current.width = 0;
    }
  }, [hasImage]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = maskCanvasRef.current;
    if (!canvas || canvas.width === 0) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const paintBrushSegment = (x1: number, y1: number, x2: number, y2: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!mCtx) return;

    // Scale brush relative to actual image size so brush slider matches screen feel
    const rect = maskCanvas.getBoundingClientRect();
    const displayScale = rect.width > 0 ? maskCanvas.width / rect.width : 1;
    const effectiveRadius = Math.max(6, (brushSize / 2) * displayScale);

    mCtx.save();
    mCtx.lineCap = 'round';
    mCtx.lineJoin = 'round';
    mCtx.strokeStyle = 'rgba(236, 72, 153, 0.72)';
    mCtx.fillStyle = 'rgba(236, 72, 153, 0.72)';
    mCtx.lineWidth = effectiveRadius * 2;

    mCtx.beginPath();
    mCtx.moveTo(x1, y1);
    mCtx.lineTo(x2, y2);
    mCtx.stroke();

    mCtx.beginPath();
    mCtx.arc(x2, y2, effectiveRadius, 0, Math.PI * 2);
    mCtx.fill();
    mCtx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (showCompareMode) return;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!mCtx) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    maskHistoryRef.current.push(mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height));
    if (maskHistoryRef.current.length > 15) maskHistoryRef.current.shift();

    const pt = getCanvasPoint(e);
    if (!pt) return;
    isDrawingRef.current = true;
    lastPointRef.current = pt;
    paintBrushSegment(pt.x, pt.y, pt.x, pt.y);
    setHasMaskStrokes(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || showCompareMode) return;
    const pt = getCanvasPoint(e);
    const prev = lastPointRef.current;
    if (!pt || !prev) return;
    paintBrushSegment(prev.x, prev.y, pt.x, pt.y);
    lastPointRef.current = pt;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleClearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!mCtx) return;
    maskHistoryRef.current.push(mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height));
    mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    setHasMaskStrokes(false);
  };

  const handleUndo = () => {
    const maskCanvas = maskCanvasRef.current;
    const imgCanvas = imageCanvasRef.current;
    if (!maskCanvas || !imgCanvas) return;

    if (maskHistoryRef.current.length > 0) {
      const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
      const prevMask = maskHistoryRef.current.pop();
      if (mCtx && prevMask) {
        mCtx.putImageData(prevMask, 0, 0);
        const data = prevMask.data;
        let hasAny = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 20) {
            hasAny = true;
            break;
          }
        }
        setHasMaskStrokes(hasAny);
        return;
      }
    }

    if (undoSnapshotsRef.current.length > 0) {
      const ctx = imgCanvas.getContext('2d', { willReadFrequently: true });
      const prevImg = undoSnapshotsRef.current.pop();
      if (ctx && prevImg) {
        ctx.putImageData(prevImg, 0, 0);
        const url = imgCanvas.toDataURL('image/png');
        afterDataUrlRef.current = url;
        setAfterPreviewUrl(url);
        if (undoSnapshotsRef.current.length === 0) {
          setHasProcessedResult(false);
          setShowCompareMode(false);
        }
        showToast('Reverted last watermark removal pass.');
      }
    }
  };

  // Smart Corner Preset Masks (Bottom-Right Gemini sparkle / Bottom-Left text watermark)
  const applyCornerPreset = (corner: 'bottom-right' | 'bottom-left') => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || !maskCanvas.width) return;
    const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!mCtx) return;

    maskHistoryRef.current.push(mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height));
    const w = maskCanvas.width;
    const h = maskCanvas.height;
    const minSide = Math.min(w, h);

    mCtx.save();
    mCtx.fillStyle = 'rgba(236, 72, 153, 0.72)';

    if (corner === 'bottom-right') {
      // Gemini AI bottom-right four-point sparkle badge zone
      const boxSize = Math.max(44, Math.round(minSide * 0.085));
      const pad = Math.max(8, Math.round(minSide * 0.015));
      const x = w - boxSize - pad;
      const y = h - boxSize - pad;
      mCtx.beginPath();
      mCtx.roundRect(x, y, boxSize, boxSize, 12);
      mCtx.fill();
      showToast('Marked Bottom-Right Gemini Watermark zone. Click "Remove Watermark"!');
    } else {
      // Bottom-left text/calligraphy watermark zone
      const boxW = Math.max(120, Math.round(w * 0.28));
      const boxH = Math.max(40, Math.round(h * 0.075));
      const padX = Math.max(8, Math.round(w * 0.015));
      const padY = Math.max(8, Math.round(h * 0.015));
      mCtx.beginPath();
      mCtx.roundRect(padX, h - boxH - padY, boxW, boxH, 10);
      mCtx.fill();
      showToast('Marked Bottom-Left Watermark zone. Click "Remove Watermark"!');
    }

    mCtx.restore();
    setHasMaskStrokes(true);
    setShowCompareMode(false);
  };

  const handleRemoveWatermark = () => {
    const imgCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!imgCanvas || !maskCanvas || imgCanvas.width === 0 || isProcessing) return;

    const ctx = imgCanvas.getContext('2d', { willReadFrequently: true });
    const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !mCtx) return;

    const currentImg = ctx.getImageData(0, 0, imgCanvas.width, imgCanvas.height);
    const maskImg = mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    // Quick check if user painted anything
    let hasPixels = false;
    for (let i = 3; i < maskImg.data.length; i += 4) {
      if (maskImg.data[i] > 20) {
        hasPixels = true;
        break;
      }
    }

    if (!hasPixels) {
      showToast('Brush over the watermark or tap a Corner Preset button first!');
      return;
    }

    setIsProcessing(true);
    setProgressInfo({ percent: 5, stage: 'Preparing high-detail reconstruction...' });

    // Defer 16ms so UI progress state mounts cleanly before starting chunked processing
    setTimeout(async () => {
      try {
        undoSnapshotsRef.current.push(currentImg);
        if (undoSnapshotsRef.current.length > 8) undoSnapshotsRef.current.shift();

        const result = await removeWatermarkInpaint(currentImg, maskImg.data, {
          mode: removalMode,
          onProgress: (info) => {
            setProgressInfo(info);
          },
        });
        ctx.putImageData(result.imageData, 0, 0);
        mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskHistoryRef.current = [];

        const cleanUrl = imgCanvas.toDataURL('image/png');
        afterDataUrlRef.current = cleanUrl;
        setAfterPreviewUrl(cleanUrl);
        setLastProcessMs(result.durationMs);
        setHasMaskStrokes(false);
        setHasProcessedResult(true);
        showToast(`Watermark removed in ${(result.durationMs / 1000).toFixed(2)}s (${removalMode.toUpperCase()} Quality)!`);
      } catch (err) {
        console.error('Local inpaint error:', err);
        showToast('Could not process this selection. Try a smaller brush region.');
      } finally {
        setIsProcessing(false);
        setProgressInfo({ percent: 0, stage: '' });
      }
    }, 16);
  };

  const handleResetToOriginal = () => {
    const imgCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!imgCanvas || !maskCanvas || !originalSnapshotRef.current) return;
    const ctx = imgCanvas.getContext('2d', { willReadFrequently: true });
    const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !mCtx) return;

    ctx.putImageData(originalSnapshotRef.current, 0, 0);
    mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    undoSnapshotsRef.current = [];
    maskHistoryRef.current = [];
    setHasMaskStrokes(false);
    setHasProcessedResult(false);
    setShowCompareMode(false);
    setAfterPreviewUrl('');
    setLastProcessMs(null);
    showToast('Reset to original photo.');
  };

  const handleDownloadClean = (format: 'png' | 'jpeg' = 'png') => {
    const imgCanvas = imageCanvasRef.current;
    if (!imgCanvas || imgCanvas.width === 0) return;

    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';

    imgCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `zeenaprompt-clean-photo.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('Clean photo downloaded directly from your device!');
      },
      mime,
      0.96
    );
  };

  return (
    <div className="space-y-6">
      {/* Main H1 Header & Privacy Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-3 flex-wrap">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/25 shrink-0">
              <Eraser className="w-5 h-5" />
            </span>
            <span>Free Gemini Watermark Remover Online</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
            Our browser-based Gemini logo remover lets you remove Gemini watermark for free—erasing sparkle logos, text stamps, and corner overlays in seconds inside your browser. Zero server uploads, 100% private, and works offline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Works Offline</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>On-Device Processing</span>
          </span>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {!hasImage ? (
        /* Dropzone Upload Card */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingFile(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 sm:p-14 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center space-y-5 bg-white dark:bg-neutral-900 shadow-sm ${
            isDraggingFile
              ? 'border-pink-500 bg-pink-50/40 dark:bg-pink-950/20 scale-[0.99]'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-pink-500 dark:hover:border-pink-500'
          }`}
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-violet-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-pink-500/25">
            <Upload className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white">
              Upload Photo to Remove Watermark Locally
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Select any Gemini photo or AI artwork from your gallery. Your image stays completely inside your device memory and is cleaned locally with crisp HD texture detail in seconds.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-violet-700 text-white font-black text-sm shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Choose Image from Phone / PC</span>
          </button>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[11px] font-medium text-neutral-400">
            <span>No Login Required</span>
            <span aria-hidden="true">·</span>
            <span>Unlimited Free Uses</span>
            <span aria-hidden="true">·</span>
            <span>Full HD Export</span>
          </div>
        </div>
      ) : (
        /* Editor Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols: Interactive Touch/Mouse Canvas + Before/After Compare */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  <span>
                    {showCompareMode
                      ? 'Before / After Comparison (Drag Slider)'
                      : 'Brush Over Watermark or Tap a Corner Preset'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {hasProcessedResult && beforePreviewUrl && afterPreviewUrl && (
                    <button
                      type="button"
                      onClick={() => setShowCompareMode(!showCompareMode)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        showCompareMode
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{showCompareMode ? 'Back to Brush' : 'Compare Before/After'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Change Photo
                  </button>
                </div>
              </div>

              {/* Canvas Viewport */}
              <div className="relative w-full rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center min-h-[320px] sm:min-h-[460px] max-h-[72vh] select-none">
                {showCompareMode && beforePreviewUrl && afterPreviewUrl ? (
                  <div className="relative inline-block max-w-full max-h-[70vh]">
                    {/* After Image Base */}
                    <img
                      src={afterPreviewUrl}
                      alt="Cleaned result"
                      className="max-w-full max-h-[70vh] w-auto h-auto object-contain block select-none pointer-events-none"
                    />
                    {/* Before Image Clipped Overlay */}
                    <div
                      className="absolute inset-0 overflow-hidden select-none pointer-events-none"
                      style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
                    >
                      <img
                        src={beforePreviewUrl}
                        alt="Original before removal"
                        className="w-full h-full object-contain block"
                      />
                    </div>
                    {/* Split Line */}
                    <div
                      className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] pointer-events-none"
                      style={{ left: `${comparePosition}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-neutral-900 shadow-xl flex items-center justify-center text-[10px] font-black border border-neutral-300">
                        ↔
                      </div>
                    </div>
                    {/* Labels */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 text-white text-[10px] font-bold pointer-events-none">
                      Before
                    </span>
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-[10px] font-bold pointer-events-none">
                      Cleaned
                    </span>
                    {/* Interactive Range Overlay */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={comparePosition}
                      onChange={(e) => setComparePosition(Number(e.target.value))}
                      aria-label="Compare before and after slider"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                    />
                  </div>
                ) : (
                  <div className="relative inline-flex items-center justify-center max-w-full max-h-[70vh]">
                    <canvas
                      ref={imageCanvasRef}
                      className="max-w-full max-h-[70vh] w-auto h-auto object-contain block rounded-lg"
                    />
                    <canvas
                      ref={maskCanvasRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      className="absolute inset-0 w-full h-full object-contain touch-none cursor-crosshair rounded-lg"
                    />
                  </div>
                )}
              </div>

              {imageDimensions && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 px-1">
                  <span>
                    Resolution: {imageDimensions.width} × {imageDimensions.height} px
                  </span>
                  {lastProcessMs !== null && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Cleaned locally in {(lastProcessMs / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right 4 Cols: Brush Controls, Corner Presets & Export */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
              {/* 1-Click Corner Presets */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Quick 1-Tap Presets
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => applyCornerPreset('bottom-right')}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-pink-50 dark:hover:bg-pink-950/40 hover:text-pink-600 dark:hover:text-pink-300 border border-neutral-200 dark:border-neutral-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-pink-500" />
                      <span>Auto-Mark Gemini Logo</span>
                    </span>
                    <CornerDownRight className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyCornerPreset('bottom-left')}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-600 dark:hover:text-violet-300 border border-neutral-200 dark:border-neutral-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Eraser className="w-4 h-4 text-violet-500" />
                      <span>Auto-Mark Bottom-Left Text</span>
                    </span>
                    <CornerDownLeft className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              </div>

              {/* Brush Size Control */}
              <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-200">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-pink-500" />
                    Brush Size
                  </span>
                  <span>{brushSize} px</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={85}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Undo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearMask}
                    className="py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Mask</span>
                  </button>
                </div>
              </div>

              {/* Reconstruction Quality Engine Selector */}
              <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Removal Engine
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRemovalMode('hd')}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      removalMode === 'hd'
                        ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/30 text-neutral-900 dark:text-white shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                        <span>HD Texture Fill (Recommended)</span>
                      </span>
                      <span className="text-[10px] font-semibold text-pink-600 dark:text-pink-400">~1–3s</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Zero-blur PatchMatch + Seamless Detail for skin, hair, cloth & textured backgrounds.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRemovalMode('translucent')}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      removalMode === 'translucent'
                        ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/30 text-neutral-900 dark:text-white shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-violet-500" />
                        <span>Transparent Watermark Eraser</span>
                      </span>
                      <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">~1–2s</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Unblends faint white logos & corner text to rescue real underlying photo detail.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRemovalMode('fast')}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      removalMode === 'fast'
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-neutral-900 dark:text-white shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Instant Smooth Fill</span>
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">&lt;0.4s</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Best for flat walls, plain studio backdrops, or clear skies.
                    </p>
                  </button>
                </div>
              </div>

              {/* Primary Inpaint Action */}
              <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  disabled={isProcessing || !hasMaskStrokes}
                  onClick={handleRemoveWatermark}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-violet-700 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  id="remove-watermark-action-btn"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Reconstructing HD... {progressInfo.percent}%</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Remove Watermark Now</span>
                    </>
                  )}
                </button>

                {isProcessing && (
                  <div className="space-y-1.5 px-1">
                    <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 transition-all duration-150"
                        style={{ width: `${Math.max(8, progressInfo.percent)}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 text-center">
                      {progressInfo.stage || 'Processing crisp pixels locally...'}
                    </p>
                  </div>
                )}

                {hasProcessedResult && (
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadClean('png')}
                      className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      id="download-clean-image-png-btn"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Clean Image (HD PNG)</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadClean('jpeg')}
                        className="py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Save as JPG
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToOriginal}
                        className="py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Reset Original
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive On-Page SEO Guide, Comparison Table & Interactive FAQ */}
      <WatermarkRemoverSEO />
    </div>
  );
};
