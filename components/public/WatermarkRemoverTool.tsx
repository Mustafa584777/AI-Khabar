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
  Share2,
  Lock,
  Crown,
  ExternalLink,
  ArrowRight,
  Minimize2,
  Crop,
  FileText,
  Images,
  X,
  Package,
} from 'lucide-react';
import JSZip from 'jszip';
import {
  removeWatermarkInpaint,
  type WatermarkRemovalMode,
  type InpaintProgress,
} from '@/lib/watermark-remover';
import { useApp } from '@/context/AppContext';
import { WatermarkRemoverSEO } from '@/components/public/WatermarkRemoverSEO';

interface BulkWatermarkItem {
  id: string;
  name: string;
  originalUrl: string;
  cleanedUrl?: string;
  width: number;
  height: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  durationMs?: number;
}

export const WatermarkRemoverTool = () => {
  const {
    showToast,
    userAccount,
    isProUser,
    planTier,
    planExpiresAt,
    isActivePremiumUser,
    setIsProCheckoutModalOpen,
  } = useApp();

  const effectiveTier = planTier || userAccount?.planTier || 'free';
  const expires = planExpiresAt || userAccount?.planExpiresAt;
  const isExpired = Boolean(expires && new Date(expires).getTime() <= Date.now());
  const hasActivePremium = Boolean(
    isActivePremiumUser ||
      (userAccount?.isLoggedIn &&
        !isExpired &&
        (isProUser || ['starter', 'pro', 'vip'].includes(effectiveTier) || userAccount?.isProUser))
  );

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

  // Bulk Upload Queue (Premium-only feature)
  const [bulkItems, setBulkItems] = useState<BulkWatermarkItem[]>([]);
  const [bulkZone, setBulkZone] = useState<'bottom-right' | 'bottom-left' | 'both'>('bottom-right');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
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

  const pendingUploadRef = useRef<{ img: HTMLImageElement; objectUrl: string } | null>(null);
  const pendingRestoredRef = useRef<{
    afterDataUrl: string;
    beforeDataUrl: string;
    width: number;
    height: number;
    lastProcessMs: number | null;
  } | null>(null);

  const PENDING_REDIRECT_KEY = 'zp_wm_first_download_redirect_done';
  const PENDING_DOWNLOAD_META_KEY = 'zp_wm_pending_download';
  const PENDING_BACKUP_URL_KEY = 'zp_wm_pending_dataurl_backup';
  const IDB_NAME = 'zp_watermark_offline_db';
  const IDB_STORE = 'pending_downloads';
  const IDB_KEY = 'latest';

  // Calibrated from real Gemini outputs (e.g., 765x1024 where 39x40 sparkle center sits 102px from right & bottom)
  const getGeminiWatermarkRect = useCallback((w: number, h: number) => {
    const maxSide = Math.max(w, h);
    const centerOffset = Math.max(32, Math.round(maxSide * 0.1));
    const boxSize = Math.max(48, Math.round(maxSide * 0.068));
    const half = Math.round(boxSize / 2);

    const cx = Math.max(half + 2, w - centerOffset);
    const cy = Math.max(half + 2, h - centerOffset);
    const x = Math.max(0, Math.min(w - boxSize, cx - half));
    const y = Math.max(0, Math.min(h - boxSize, cy - half));

    return { x, y, width: boxSize, height: boxSize };
  }, []);

  const drawGeminiWatermarkMask = useCallback(
    (mCtx: CanvasRenderingContext2D, w: number, h: number) => {
      const rect = getGeminiWatermarkRect(w, h);
      mCtx.save();
      mCtx.fillStyle = 'rgba(236, 72, 153, 0.72)';
      mCtx.beginPath();
      mCtx.roundRect(rect.x, rect.y, rect.width, rect.height, 14);
      mCtx.fill();
      mCtx.restore();
    },
    [getGeminiWatermarkRect]
  );

  const drawBottomLeftWatermarkMask = useCallback((mCtx: CanvasRenderingContext2D, w: number, h: number) => {
    mCtx.save();
    mCtx.fillStyle = 'rgba(236, 72, 153, 0.72)';
    const boxW = Math.max(120, Math.round(w * 0.28));
    const boxH = Math.max(40, Math.round(h * 0.075));
    const padX = Math.max(8, Math.round(w * 0.015));
    const padY = Math.max(8, Math.round(h * 0.015));
    mCtx.beginPath();
    mCtx.roundRect(padX, h - boxH - padY, boxW, boxH, 10);
    mCtx.fill();
    mCtx.restore();
  }, []);

  const drawLoadedImage = useCallback(
    (img: HTMLImageElement) => {
      const imgCanvas = imageCanvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!imgCanvas || !maskCanvas) return false;

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
      if (!ctx || !mCtx) return false;

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      mCtx.clearRect(0, 0, w, h);

      const snapshot = ctx.getImageData(0, 0, w, h);
      originalSnapshotRef.current = snapshot;
      undoSnapshotsRef.current = [];

      // Save blank mask snapshot so Undo can clear the auto-mark cleanly if desired
      maskHistoryRef.current = [mCtx.getImageData(0, 0, w, h)];

      // Automatically mark the fixed bottom-right Gemini watermark spot right after upload
      drawGeminiWatermarkMask(mCtx, w, h);

      try {
        const url = imgCanvas.toDataURL('image/png');
        beforeDataUrlRef.current = url;
        setBeforePreviewUrl(url);
        setAfterPreviewUrl('');
      } catch {}

      setImageDimensions({ width: w, height: h });
      setHasImage(true);
      setHasMaskStrokes(true);
      setHasProcessedResult(false);
      setShowCompareMode(false);
      setLastProcessMs(null);
      showToast('Gemini watermark spot auto-marked! Just click "Remove Watermark Now".');
      return true;
    },
    [drawGeminiWatermarkMask, showToast]
  );

  // Ensure pending upload or restored image draws immediately once canvases mount when transitioning from !hasImage -> hasImage
  useEffect(() => {
    if (!hasImage) return;

    if (pendingUploadRef.current) {
      const pending = pendingUploadRef.current;
      if (drawLoadedImage(pending.img)) {
        URL.revokeObjectURL(pending.objectUrl);
        pendingUploadRef.current = null;
      }
      return;
    }

    if (pendingRestoredRef.current) {
      const restored = pendingRestoredRef.current;
      const imgCanvas = imageCanvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!imgCanvas || !maskCanvas) return;

      const afterImg = new window.Image();
      afterImg.onload = () => {
        const w = restored.width || afterImg.naturalWidth || afterImg.width;
        const h = restored.height || afterImg.naturalHeight || afterImg.height;
        imgCanvas.width = w;
        imgCanvas.height = h;
        maskCanvas.width = w;
        maskCanvas.height = h;

        const ctx = imgCanvas.getContext('2d', { willReadFrequently: true });
        const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        if (ctx && mCtx) {
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(afterImg, 0, 0, w, h);
          mCtx.clearRect(0, 0, w, h);

          const cleanSnap = ctx.getImageData(0, 0, w, h);
          originalSnapshotRef.current = cleanSnap;
          undoSnapshotsRef.current = [];
          maskHistoryRef.current = [];

          if (restored.beforeDataUrl) {
            const beforeImg = new window.Image();
            beforeImg.onload = () => {
              const off = document.createElement('canvas');
              off.width = w;
              off.height = h;
              const offCtx = off.getContext('2d');
              if (offCtx) {
                offCtx.drawImage(beforeImg, 0, 0, w, h);
                originalSnapshotRef.current = offCtx.getImageData(0, 0, w, h);
              }
            };
            beforeImg.src = restored.beforeDataUrl;
          }
        }
        setImageDimensions({ width: w, height: h });
        pendingRestoredRef.current = null;
      };
      afterImg.src = restored.afterDataUrl;
    }
  }, [hasImage, drawLoadedImage]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (PNG, JPG, WEBP).');
        return;
      }

      if (pendingUploadRef.current) {
        URL.revokeObjectURL(pendingUploadRef.current.objectUrl);
        pendingUploadRef.current = null;
      }

      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        pendingUploadRef.current = { img, objectUrl };
        if (hasImage && drawLoadedImage(img)) {
          URL.revokeObjectURL(objectUrl);
          pendingUploadRef.current = null;
        } else {
          setHasImage(true);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        showToast('Could not decode this image file.');
      };
      img.src = objectUrl;
    },
    [drawLoadedImage, hasImage, showToast]
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

    if (corner === 'bottom-right') {
      drawGeminiWatermarkMask(mCtx, w, h);
      showToast('Marked Bottom-Right Gemini Watermark zone. Click "Remove Watermark Now"!');
    } else {
      drawBottomLeftWatermarkMask(mCtx, w, h);
      showToast('Marked Bottom-Left Watermark zone. Click "Remove Watermark Now"!');
    }

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

  const dataUrlToBlob = useCallback((dataUrl: string): Blob | null => {
    try {
      const parts = dataUrl.split(',');
      if (parts.length < 2) return null;
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const binary = atob(parts[1]);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: mime });
    } catch {
      return null;
    }
  }, []);

  const getCleanDataUrl = useCallback(
    (format: 'png' | 'jpeg' = 'png'): string | null => {
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const imgCanvas = imageCanvasRef.current;
      if (imgCanvas && imgCanvas.width > 0 && imgCanvas.height > 0) {
        try {
          return imgCanvas.toDataURL(mime, 0.96);
        } catch {}
      }
      if (afterDataUrlRef.current) {
        return afterDataUrlRef.current;
      }
      if (afterPreviewUrl) {
        return afterPreviewUrl;
      }
      return null;
    },
    [afterPreviewUrl]
  );

  const triggerSyncDownload = useCallback(
    (dataUrl: string, format: 'png' | 'jpeg' = 'png', toastMsg?: string) => {
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      const filename = `zeenaprompt-clean-${Date.now()}.${ext}`;
      const blob = dataUrlToBlob(dataUrl);

      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.rel = 'noopener';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (link.parentNode) link.parentNode.removeChild(link);
        }, 300);
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 30000);
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.rel = 'noopener';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (link.parentNode) link.parentNode.removeChild(link);
        }, 300);
      }

      showToast(toastMsg || 'Clean photo downloaded directly from your device!');
    },
    [dataUrlToBlob, showToast]
  );

  const savePendingPayloadToIdb = useCallback(async (payload: any) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;
    return new Promise<void>((resolve) => {
      try {
        const req = window.indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => {
          try {
            const db = req.result;
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).put(payload, IDB_KEY);
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              resolve();
            };
          } catch {
            resolve();
          }
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }, []);

  const readAndClearPendingPayloadFromIdb = useCallback(async (): Promise<any | null> => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
    return new Promise<any | null>((resolve) => {
      try {
        const req = window.indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => {
          try {
            const db = req.result;
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            const getReq = store.get(IDB_KEY);
            getReq.onsuccess = () => {
              const val = getReq.result || null;
              try {
                store.delete(IDB_KEY);
              } catch {}
              resolve(val);
            };
            getReq.onerror = () => resolve(null);
            tx.oncomplete = () => db.close();
          } catch {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }, []);

  // Handle auto-download when user navigates back from toolimg.online (both BFCache restore & fresh page reload)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const processPendingReturnDownload = async (fromMount: boolean) => {
      const rawMeta = sessionStorage.getItem(PENDING_DOWNLOAD_META_KEY);
      if (!rawMeta) return;

      let parsed: { format?: 'png' | 'jpeg'; createdAt?: number } = {};
      try {
        parsed = JSON.parse(rawMeta);
      } catch {}

      // Prevent firing right before browser leaves on redirect
      if (!fromMount && parsed.createdAt && Date.now() - parsed.createdAt < 350) {
        return;
      }

      sessionStorage.removeItem(PENDING_DOWNLOAD_META_KEY);
      const format: 'png' | 'jpeg' = parsed.format === 'jpeg' ? 'jpeg' : 'png';

      const backupUrl = sessionStorage.getItem(PENDING_BACKUP_URL_KEY);
      sessionStorage.removeItem(PENDING_BACKUP_URL_KEY);

      const idbPayload = await readAndClearPendingPayloadFromIdb();

      const liveUrl = getCleanDataUrl(format);
      const finalUrl = liveUrl || idbPayload?.afterDataUrl || backupUrl;

      if (fromMount && idbPayload?.afterDataUrl) {
        pendingRestoredRef.current = {
          afterDataUrl: idbPayload.afterDataUrl,
          beforeDataUrl: idbPayload.beforeDataUrl || '',
          width: idbPayload.width || 0,
          height: idbPayload.height || 0,
          lastProcessMs: idbPayload.lastProcessMs ?? null,
        };
        afterDataUrlRef.current = idbPayload.afterDataUrl;
        setAfterPreviewUrl(idbPayload.afterDataUrl);
        if (idbPayload.beforeDataUrl) {
          beforeDataUrlRef.current = idbPayload.beforeDataUrl;
          setBeforePreviewUrl(idbPayload.beforeDataUrl);
        }
        if (idbPayload.lastProcessMs !== undefined) {
          setLastProcessMs(idbPayload.lastProcessMs);
        }
        setHasProcessedResult(true);
        setHasImage(true);
      }

      if (finalUrl) {
        setTimeout(() => {
          triggerSyncDownload(
            finalUrl,
            format,
            'Welcome back! Your clean photo is downloading automatically.'
          );
        }, 120);
      }
    };

    void processPendingReturnDownload(true);

    const onReturnEvent = () => {
      if (document.visibilityState === 'hidden') return;
      void processPendingReturnDownload(false);
    };

    window.addEventListener('pageshow', onReturnEvent);
    window.addEventListener('focus', onReturnEvent);
    document.addEventListener('visibilitychange', onReturnEvent);

    return () => {
      window.removeEventListener('pageshow', onReturnEvent);
      window.removeEventListener('focus', onReturnEvent);
      document.removeEventListener('visibilitychange', onReturnEvent);
    };
  }, [getCleanDataUrl, readAndClearPendingPayloadFromIdb, triggerSyncDownload]);

  const handleDownloadClean = async (format: 'png' | 'jpeg' = 'png') => {
    const dataUrl = getCleanDataUrl(format);
    if (!dataUrl) {
      showToast('No processed photo available to download yet.');
      return;
    }

    // First-time download click: save state & redirect to toolimg.online; auto-download when returning
    if (typeof window !== 'undefined' && sessionStorage.getItem(PENDING_REDIRECT_KEY) !== '1') {
      sessionStorage.setItem(PENDING_REDIRECT_KEY, '1');
      sessionStorage.setItem(
        PENDING_DOWNLOAD_META_KEY,
        JSON.stringify({ format, createdAt: Date.now() })
      );

      if (dataUrl.length < 2_500_000) {
        try {
          sessionStorage.setItem(PENDING_BACKUP_URL_KEY, dataUrl);
        } catch {}
      }

      const payload = {
        afterDataUrl: dataUrl,
        beforeDataUrl: beforeDataUrlRef.current || beforePreviewUrl || '',
        format,
        width: imageDimensions?.width || imageCanvasRef.current?.width || 0,
        height: imageDimensions?.height || imageCanvasRef.current?.height || 0,
        lastProcessMs,
        createdAt: Date.now(),
      };

      await Promise.race([
        savePendingPayloadToIdb(payload),
        new Promise<void>((resolve) => setTimeout(resolve, 350)),
      ]);

      window.location.href = 'https://toolimg.online';
      return;
    }

    triggerSyncDownload(dataUrl, format);
  };

  const handleShareClean = async () => {
    const dataUrl = getCleanDataUrl('png');
    if (!dataUrl) {
      showToast('Clean the photo first before sharing.');
      return;
    }

    const blob = dataUrlToBlob(dataUrl);
    if (!blob) {
      showToast('Unable to prepare image for sharing.');
      return;
    }

    const file = new File([blob], `zeenaprompt-clean-${Date.now()}.png`, {
      type: 'image/png',
    });

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Clean Photo - Zeenaprompt Watermark Remover',
            text: 'Watermark removed offline in seconds with Zeenaprompt!',
          });
          showToast('Shared clean photo successfully!');
          return;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }

      try {
        await navigator.share({
          title: 'Free Watermark Remover - Zeenaprompt',
          text: 'Remove watermarks offline in seconds directly in your browser!',
          url: window.location.href,
        });
        showToast('Shared link successfully!');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // Desktop clipboard fallback
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('Clean photo copied to clipboard! Paste anywhere to share.');
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Tool link copied to clipboard! Ready to share.');
    } catch {
      showToast('Sharing is not supported on this browser. Use Download instead.');
    }
  };

  // --- Bulk Add Handlers (Premium-Only) ---
  const handleBulkAddTrigger = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!hasActivePremium) {
      showToast('Bulk Upload is a Pro feature. Upgrade to Pro Yearly (₹99/year) to unlock!');
      setIsProCheckoutModalOpen(true);
      return;
    }
    bulkFileInputRef.current?.click();
  };

  const handleBulkFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!hasActivePremium) {
      setIsProCheckoutModalOpen(true);
      return;
    }

    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 30);
    if (validFiles.length === 0) {
      showToast('Please select valid image files (PNG, JPG, WEBP).');
      return;
    }

    const decodedItems: BulkWatermarkItem[] = [];
    for (const file of validFiles) {
      const objectUrl = URL.createObjectURL(file);
      const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 2400;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          resolve({ w, h });
        };
        img.onerror = () => resolve(null);
        img.src = objectUrl;
      });

      if (dims) {
        decodedItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          originalUrl: objectUrl,
          width: dims.w,
          height: dims.h,
          status: 'pending',
        });
      } else {
        URL.revokeObjectURL(objectUrl);
      }
    }

    if (decodedItems.length > 0) {
      setBulkItems((prev) => [...prev, ...decodedItems]);
      showToast(`Added ${decodedItems.length} photo${decodedItems.length > 1 ? 's' : ''} to Bulk Queue!`);
    }
  };

  const handleProcessBulkQueue = async () => {
    if (!hasActivePremium) {
      setIsProCheckoutModalOpen(true);
      return;
    }
    if (isBulkProcessing) return;

    const pendingQueue = bulkItems.filter((item) => item.status !== 'done');
    if (pendingQueue.length === 0) {
      showToast('All queued photos are already cleaned!');
      return;
    }

    setIsBulkProcessing(true);
    setBulkProgress({ current: 0, total: pendingQueue.length });

    let completed = 0;
    for (const target of pendingQueue) {
      setBulkItems((prev) =>
        prev.map((it) => (it.id === target.id ? { ...it, status: 'processing' } : it))
      );

      try {
        const result = await new Promise<{ cleanedUrl: string; durationMs: number }>((resolve, reject) => {
          const img = new window.Image();
          img.onload = async () => {
            try {
              const w = target.width;
              const h = target.height;
              const imgCanvas = document.createElement('canvas');
              imgCanvas.width = w;
              imgCanvas.height = h;
              const maskCanvas = document.createElement('canvas');
              maskCanvas.width = w;
              maskCanvas.height = h;

              const ctx = imgCanvas.getContext('2d', { willReadFrequently: true });
              const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
              if (!ctx || !mCtx) throw new Error('Canvas context unavailable');

              ctx.drawImage(img, 0, 0, w, h);
              if (bulkZone === 'bottom-right' || bulkZone === 'both') {
                drawGeminiWatermarkMask(mCtx, w, h);
              }
              if (bulkZone === 'bottom-left' || bulkZone === 'both') {
                drawBottomLeftWatermarkMask(mCtx, w, h);
              }

              const imgData = ctx.getImageData(0, 0, w, h);
              const maskData = mCtx.getImageData(0, 0, w, h);
              const inpainted = await removeWatermarkInpaint(imgData, maskData.data, {
                mode: removalMode,
              });
              ctx.putImageData(inpainted.imageData, 0, 0);
              resolve({
                cleanedUrl: imgCanvas.toDataURL('image/png'),
                durationMs: inpainted.durationMs,
              });
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => reject(new Error('Image decode failed'));
          img.src = target.originalUrl;
        });

        completed += 1;
        setBulkProgress({ current: completed, total: pendingQueue.length });
        setBulkItems((prev) =>
          prev.map((it) =>
            it.id === target.id
              ? { ...it, status: 'done', cleanedUrl: result.cleanedUrl, durationMs: result.durationMs }
              : it
          )
        );
      } catch {
        completed += 1;
        setBulkProgress({ current: completed, total: pendingQueue.length });
        setBulkItems((prev) =>
          prev.map((it) => (it.id === target.id ? { ...it, status: 'error' } : it))
        );
      }
    }

    setIsBulkProcessing(false);
    showToast(`Bulk processing complete! Cleaned ${pendingQueue.length} photo${pendingQueue.length > 1 ? 's' : ''} locally.`);
  };

  const handleDownloadBulkItem = (item: BulkWatermarkItem) => {
    const url = item.cleanedUrl;
    if (!url) return;
    const baseName = item.name.replace(/\.[^.]+$/, '') || 'photo';
    const blob = dataUrlToBlob(url);
    const filename = `clean-${baseName}.png`;

    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => link.parentNode?.removeChild(link), 300);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } else {
      triggerSyncDownload(url, 'png');
    }
  };

  const handleDownloadAllZip = async () => {
    const doneItems = bulkItems.filter((it) => it.status === 'done' && it.cleanedUrl);
    if (doneItems.length === 0) {
      showToast('Process the queued images first before downloading ZIP.');
      return;
    }

    const zip = new JSZip();
    doneItems.forEach((item, idx) => {
      if (!item.cleanedUrl) return;
      const blob = dataUrlToBlob(item.cleanedUrl);
      if (blob) {
        const safeBase = (item.name.replace(/\.[^.]+$/, '') || `photo-${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        zip.file(`${idx + 1}-clean-${safeBase}.png`, blob);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `zeenaprompt-bulk-clean-${Date.now()}.zip`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.parentNode?.removeChild(link), 300);
    setTimeout(() => URL.revokeObjectURL(zipUrl), 30000);
    showToast(`Downloaded ${doneItems.length} clean images as ZIP!`);
  };

  const handleLoadBulkItemInEditor = (item: BulkWatermarkItem) => {
    const srcUrl = item.cleanedUrl || item.originalUrl;
    const img = new window.Image();
    img.onload = () => {
      const tempObjUrl = srcUrl.startsWith('blob:') ? srcUrl : '';
      pendingUploadRef.current = { img, objectUrl: tempObjUrl };
      if (hasImage && drawLoadedImage(img)) {
        pendingUploadRef.current = null;
      } else {
        setHasImage(true);
      }
      showToast(`Loaded "${item.name}" into Brush Editor!`);
    };
    img.src = srcUrl;
  };

  const handleRemoveBulkItem = (id: string) => {
    setBulkItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.originalUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(target.originalUrl);
        } catch {}
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  const handleClearBulkQueue = () => {
    bulkItems.forEach((it) => {
      if (it.originalUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(it.originalUrl);
        } catch {}
      }
    });
    setBulkItems([]);
    setBulkProgress({ current: 0, total: 0 });
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

      {/* Hidden File Inputs */}
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
      <input
        ref={bulkFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleBulkFilesSelected(e.target.files);
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
            if (e.dataTransfer.files && e.dataTransfer.files.length > 1) {
              if (!hasActivePremium) {
                showToast('Bulk Upload is a Pro feature. Upgrade to Pro Yearly (₹99/year) to unlock!');
                setIsProCheckoutModalOpen(true);
                return;
              }
              void handleBulkFilesSelected(e.dataTransfer.files);
              return;
            }
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
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-violet-700 text-white font-black text-sm shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Choose Image from Phone / PC</span>
            </button>

            <button
              type="button"
              onClick={handleBulkAddTrigger}
              id="bulk-add-dropzone-btn"
              className={`inline-flex items-center gap-2 px-5 py-3.5 rounded-full font-black text-sm border transition-all cursor-pointer ${
                hasActivePremium
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white hover:opacity-90 shadow-md'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/70 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-sm'
              }`}
            >
              {hasActivePremium ? (
                <Images className="w-4 h-4 text-pink-500" />
              ) : (
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              )}
              <span>Bulk Add</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider">
                <Crown className="w-2.5 h-2.5" />
                <span>{hasActivePremium ? 'PRO' : 'PRO ONLY'}</span>
              </span>
            </button>
          </div>
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
                      : hasMaskStrokes
                      ? 'Gemini Watermark Auto-Marked — Click "Remove Watermark Now" or Adjust with Brush'
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

                  <button
                    type="button"
                    onClick={handleBulkAddTrigger}
                    id="bulk-add-editor-btn"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                      hasActivePremium
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/70 hover:bg-amber-100'
                    }`}
                  >
                    {hasActivePremium ? (
                      <Images className="w-3.5 h-3.5 text-pink-500" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>Bulk Add</span>
                    {!hasActivePremium && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black uppercase">
                        PRO
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Canvas Viewport (Canvases stay mounted so Compare toggle never resets image pixels) */}
              <div className="relative w-full rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center min-h-[320px] sm:min-h-[460px] max-h-[72vh] select-none">
                {showCompareMode && beforePreviewUrl && afterPreviewUrl && (
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
                )}

                <div
                  className={
                    showCompareMode && beforePreviewUrl && afterPreviewUrl
                      ? 'hidden'
                      : 'relative inline-flex items-center justify-center max-w-full max-h-[70vh]'
                  }
                >
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
                      onClick={() => void handleDownloadClean('png')}
                      className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      id="download-clean-image-png-btn"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Clean Image (HD PNG)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleShareClean()}
                      className="w-full py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      id="share-clean-image-btn"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Clean Photo</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDownloadClean('jpeg')}
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

      {/* Bulk Watermark Remover Queue Panel (Visible when Pro user adds multiple photos) */}
      {bulkItems.length > 0 && (
        <section
          aria-label="Bulk Watermark Removal Queue"
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider">
                  <Crown className="w-3 h-3" />
                  <span>PRO BULK QUEUE</span>
                </span>
                <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                  Bulk Watermark Remover ({bulkItems.length} Photo{bulkItems.length > 1 ? 's' : ''})
                </h3>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                100% local batch cleaning inside your browser memory. Choose watermark position and process all photos in one click.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBulkAddTrigger}
                className="px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Images className="w-3.5 h-3.5 text-pink-500" />
                <span>Add More</span>
              </button>

              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => void handleProcessBulkQueue()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-violet-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                {isBulkProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cleaning {bulkProgress.current}/{bulkProgress.total}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Process All ({bulkItems.filter((i) => i.status !== 'done').length || bulkItems.length})</span>
                  </>
                )}
              </button>

              {bulkItems.some((it) => it.status === 'done') && (
                <button
                  type="button"
                  onClick={() => void handleDownloadAllZip()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Download All ZIP</span>
                </button>
              )}

              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleClearBulkQueue}
                className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 text-xs font-bold transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Watermark Zone Preset Selector */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-neutral-500 dark:text-neutral-400 mr-1">Target Watermark Zone:</span>
            {(
              [
                { id: 'bottom-right', label: 'Bottom-Right (Gemini Sparkle)' },
                { id: 'bottom-left', label: 'Bottom-Left (Text Stamp)' },
                { id: 'both', label: 'Both Corners' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={isBulkProcessing}
                onClick={() => setBulkZone(opt.id)}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                  bulkZone === opt.id
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Bulk Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {bulkItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 flex items-center gap-3"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 relative">
                  <img
                    src={item.cleanedUrl || item.originalUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-[11px] text-neutral-500">
                    {item.width} × {item.height} px ·{' '}
                    <span
                      className={
                        item.status === 'done'
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                          : item.status === 'processing'
                          ? 'text-pink-600 font-bold'
                          : item.status === 'error'
                          ? 'text-red-500 font-bold'
                          : 'text-neutral-500'
                      }
                    >
                      {item.status === 'done'
                        ? `Cleaned (${((item.durationMs || 0) / 1000).toFixed(1)}s)`
                        : item.status === 'processing'
                        ? 'Processing...'
                        : item.status === 'error'
                        ? 'Failed'
                        : 'Ready'}
                    </span>
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {item.status === 'done' && (
                      <button
                        type="button"
                        onClick={() => handleDownloadBulkItem(item)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleLoadBulkItemInEditor(item)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-[11px] font-bold cursor-pointer"
                    >
                      Edit Brush
                    </button>
                    <button
                      type="button"
                      disabled={isBulkProcessing}
                      onClick={() => handleRemoveBulkItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-200/70 dark:hover:bg-neutral-800 cursor-pointer ml-auto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* More Tools Section (Appears after user uploads an image, directly above Browser-Native Pixel Reconstruction) */}
      {hasImage && (
        <section
          aria-label="More Image & Productivity Tools"
          className="mt-8 p-5 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                Quick Companion Utilities
              </p>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                More Free Online Image &amp; Document Tools
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Need to compress, resize for ID, or extract handwritten notes next?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://toolimg.online/compress/compress-image-to-50kb"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800 hover:border-pink-500 dark:hover:border-pink-500 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                    <Minimize2 className="w-5 h-5" />
                  </span>
                  <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-pink-500 transition-colors" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                  Compress Image
                </h3>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Shrink photo file sizes down to 50KB cleanly for online forms, portals, and fast sharing.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 dark:text-pink-400">
                <span>Open Compress Tool</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>

            <a
              href="https://toolimg.online/social-resize/us-passport-photo-2x2"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800 hover:border-violet-500 dark:hover:border-violet-500 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                    <Crop className="w-5 h-5" />
                  </span>
                  <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-violet-500 transition-colors" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  Passport size photo maker
                </h3>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Crop and resize portraits to exact 2×2 inch passport &amp; visa dimensions instantly.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                <span>Create Passport Photo</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>

            <a
              href="https://toolimg.online/tools/handwriting-to-text"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </span>
                  <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Handwriting to Text
                </h3>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Convert handwritten notes, notebooks, and scanned pages into clean editable digital text.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span>Convert Handwriting</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>
          </div>
        </section>
      )}

      {/* Comprehensive On-Page SEO Guide, Comparison Table & Interactive FAQ */}
      <WatermarkRemoverSEO />
    </div>
  );
};
