'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Upload,
  Eraser,
  Download,
  Undo2,
  Redo2,
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
  Share2,
  Link2,
  MoveHorizontal,
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
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react';
import type {
  WatermarkRemovalMode,
  InpaintProgress,
} from '@/lib/watermark-remover';
import { useApp } from '@/context/AppContext';
import { startRouteNavigation } from '@/lib/navigation';
import { WatermarkRemoverSEOPtBr } from '@/components/public/WatermarkRemoverSEOPtBr';
import { clearWatermarkHandoff, peekWatermarkHandoff } from '@/lib/watermark-handoff';
import { AdsterraBanner300x250 } from '@/components/public/AdsterraBanner300x250';

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

export const WatermarkRemoverToolPtBr = () => {
  const {
    posts,
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
  const [intensity, setIntensity] = useState<25 | 50 | 75 | 100>(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState<InpaintProgress>({ percent: 0, stage: '' });
  const [hasMaskStrokes, setHasMaskStrokes] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasProcessedResult, setHasProcessedResult] = useState(false);
  const [comparePosition, setComparePosition] = useState<number>(50);
  const [showCompareMode, setShowCompareMode] = useState(false);
  const [lastProcessMs, setLastProcessMs] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLangMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLangMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isLangMenuOpen]);

  // Vitrine MacBook Antes/Depois (Último Prompt da Página Inicial)
  const [demoSliderPos, setDemoSliderPos] = useState<number>(52);
  const [demoImageError, setDemoImageError] = useState(false);

  const latestHomepagePost = useMemo(() => {
    const published = (posts || []).filter(
      (p) => p && p.status === 'published' && typeof p.imageUrl === 'string' && p.imageUrl.trim().length > 0
    );
    if (published.length === 0) return null;
    const sorted = [...published].sort((a, b) => {
      const ta = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
    return sorted[0];
  }, [posts]);

  // Fila de Envio em Lote (Recurso exclusivo Pro)
  const [bulkItems, setBulkItems] = useState<BulkWatermarkItem[]>([]);
  const [bulkZone, setBulkZone] = useState<'bottom-right' | 'bottom-left' | 'both'>('bottom-right');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const undoSnapshotsRef = useRef<ImageData[]>([]);
  const imageRedoRef = useRef<ImageData[]>([]);
  const maskHistoryRef = useRef<ImageData[]>([]);
  const maskRedoHistoryRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const beforeDataUrlRef = useRef<string>('');
  const afterDataUrlRef = useRef<string>('');

  const [beforePreviewUrl, setBeforePreviewUrl] = useState<string>('');
  const [afterPreviewUrl, setAfterPreviewUrl] = useState<string>('');

  const pendingUploadRef = useRef<{ img: HTMLImageElement; objectUrl: string } | null>(null);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(maskHistoryRef.current.length > 0 || undoSnapshotsRef.current.length > 0);
    setCanRedo(maskRedoHistoryRef.current.length > 0 || imageRedoRef.current.length > 0);
  }, []);

  // Calibrado com base em saídas reais do Gemini
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
      mCtx.fillStyle = 'rgba(230, 0, 35, 0.68)';
      mCtx.beginPath();
      mCtx.roundRect(rect.x, rect.y, rect.width, rect.height, 14);
      mCtx.fill();
      mCtx.restore();
    },
    [getGeminiWatermarkRect]
  );

  const drawBottomLeftWatermarkMask = useCallback((mCtx: CanvasRenderingContext2D, w: number, h: number) => {
    mCtx.save();
    mCtx.fillStyle = 'rgba(230, 0, 35, 0.68)';
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

      undoSnapshotsRef.current = [];
      imageRedoRef.current = [];

      maskHistoryRef.current = [mCtx.getImageData(0, 0, w, h)];
      maskRedoHistoryRef.current = [];

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
      syncHistoryFlags();
      clearWatermarkHandoff();
      showToast("Área da marca d'água do Gemini marcada automaticamente! Clique em \"Remover Marca d'Água Agora\".");
      return true;
    },
    [drawGeminiWatermarkMask, showToast, syncHistoryFlags]
  );

  useEffect(() => {
    if (!hasImage) return;

    if (pendingUploadRef.current) {
      const pending = pendingUploadRef.current;
      if (drawLoadedImage(pending.img)) {
        if (pending.objectUrl) URL.revokeObjectURL(pending.objectUrl);
        pendingUploadRef.current = null;
      }
    }
  }, [hasImage, drawLoadedImage]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        showToast('Selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
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
        showToast('Não foi possível decodificar este arquivo de imagem.');
      };
      img.src = objectUrl;
    },
    [drawLoadedImage, hasImage, showToast]
  );

  useEffect(() => {
    const handoff = peekWatermarkHandoff();
    if (!handoff) return;

    let cancelled = false;
    let createdObjectUrl = '';

    if (handoff.file) {
      createdObjectUrl = URL.createObjectURL(handoff.file);
    }
    const src = createdObjectUrl || handoff.dataUrl;
    if (!src) return;

    const img = new window.Image();
    img.onload = () => {
      if (cancelled) {
        if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
        return;
      }
      if (pendingUploadRef.current?.objectUrl) {
        URL.revokeObjectURL(pendingUploadRef.current.objectUrl);
      }
      pendingUploadRef.current = { img, objectUrl: createdObjectUrl };
      if (imageCanvasRef.current && maskCanvasRef.current && drawLoadedImage(img)) {
        if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
        pendingUploadRef.current = null;
      } else {
        setHasImage(true);
      }
    };
    img.onerror = () => {
      if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
      if (!cancelled) {
        clearWatermarkHandoff();
        showToast('Não foi possível carregar a imagem enviada. Selecione sua foto novamente.');
      }
    };
    img.src = src;

    return () => {
      cancelled = true;
      if (createdObjectUrl && pendingUploadRef.current?.objectUrl !== createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [drawLoadedImage, showToast]);

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

    const rect = maskCanvas.getBoundingClientRect();
    const displayScale = rect.width > 0 ? maskCanvas.width / rect.width : 1;
    const effectiveRadius = Math.max(6, (brushSize / 2) * displayScale);

    mCtx.save();
    mCtx.lineCap = 'round';
    mCtx.lineJoin = 'round';
    mCtx.strokeStyle = 'rgba(230, 0, 35, 0.68)';
    mCtx.fillStyle = 'rgba(230, 0, 35, 0.68)';
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
    maskRedoHistoryRef.current = [];
    syncHistoryFlags();

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

  const maskHasAlpha = (imgData: ImageData): boolean => {
    const data = imgData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 20) return true;
    }
    return false;
  };

  const handleClearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!mCtx) return;
    maskHistoryRef.current.push(mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height));
    if (maskHistoryRef.current.length > 15) maskHistoryRef.current.shift();
    maskRedoHistoryRef.current = [];
    mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    setHasMaskStrokes(false);
    syncHistoryFlags();
  };

  const handleUndo = () => {
    const maskCanvas = maskCanvasRef.current;
    const imgCanvas = imageCanvasRef.current;
    if (!maskCanvas || !imgCanvas) return;

    if (maskHistoryRef.current.length > 0) {
      const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
      const prevMask = maskHistoryRef.current.pop();
      if (mCtx && prevMask) {
        const currentMask = mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        maskRedoHistoryRef.current.push(currentMask);
        if (maskRedoHistoryRef.current.length > 15) maskRedoHistoryRef.current.shift();
        mCtx.putImageData(prevMask, 0, 0);
        setHasMaskStrokes(maskHasAlpha(prevMask));
        syncHistoryFlags();
        return;
      }
    }

    if (undoSnapshotsRef.current.length > 0) {
      const ctx = imgCanvas.getContext('2d', { willReadFrequently: true });
      const prevImg = undoSnapshotsRef.current.pop();
      if (ctx && prevImg) {
        const currentImg = ctx.getImageData(0, 0, imgCanvas.width, imgCanvas.height);
        imageRedoRef.current.push(currentImg);
        if (imageRedoRef.current.length > 8) imageRedoRef.current.shift();
        ctx.putImageData(prevImg, 0, 0);
        const url = imgCanvas.toDataURL('image/png');
        afterDataUrlRef.current = url;
        setAfterPreviewUrl(url);
        if (undoSnapshotsRef.current.length === 0) {
          setHasProcessedResult(false);
          setShowCompareMode(false);
        }
        syncHistoryFlags();
        showToast("Última remoção de marca d'água desfeita.");
      }
    }
  };

  const handleRedo = () => {
    const maskCanvas = maskCanvasRef.current;
    const imgCanvas = imageCanvasRef.current;
    if (!maskCanvas || !imgCanvas) return;

    if (maskRedoHistoryRef.current.length > 0) {
      const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
      const nextMask = maskRedoHistoryRef.current.pop();
      if (mCtx && nextMask) {
        const currentMask = mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        maskHistoryRef.current.push(currentMask);
        if (maskHistoryRef.current.length > 15) maskHistoryRef.current.shift();
        mCtx.putImageData(nextMask, 0, 0);
        setHasMaskStrokes(maskHasAlpha(nextMask));
        syncHistoryFlags();
        return;
      }
    }

    if (imageRedoRef.current.length > 0) {
      const ctx = imgCanvas.getContext('2d', { willReadFrequently: true });
      const nextImg = imageRedoRef.current.pop();
      if (ctx && nextImg) {
        const currentImg = ctx.getImageData(0, 0, imgCanvas.width, imgCanvas.height);
        undoSnapshotsRef.current.push(currentImg);
        if (undoSnapshotsRef.current.length > 8) undoSnapshotsRef.current.shift();
        ctx.putImageData(nextImg, 0, 0);
        const url = imgCanvas.toDataURL('image/png');
        afterDataUrlRef.current = url;
        setAfterPreviewUrl(url);
        setHasProcessedResult(true);
        syncHistoryFlags();
        showToast("Última remoção de marca d'água refeita.");
      }
    }
  };

  const applyCornerPreset = (corner: 'bottom-right' | 'bottom-left') => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || !maskCanvas.width) return;
    const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!mCtx) return;

    maskHistoryRef.current.push(mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height));
    if (maskHistoryRef.current.length > 15) maskHistoryRef.current.shift();
    maskRedoHistoryRef.current = [];
    const w = maskCanvas.width;
    const h = maskCanvas.height;

    if (corner === 'bottom-right') {
      drawGeminiWatermarkMask(mCtx, w, h);
      showToast("Marca d'água no canto inferior direito marcada. Clique em \"Remover Marca d'Água Agora\"!");
    } else {
      drawBottomLeftWatermarkMask(mCtx, w, h);
      showToast("Área no canto inferior esquerdo marcada. Clique em \"Remover Marca d'Água Agora\"!");
    }

    setHasMaskStrokes(true);
    setShowCompareMode(false);
    syncHistoryFlags();
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

    let hasPixels = false;
    for (let i = 3; i < maskImg.data.length; i += 4) {
      if (maskImg.data[i] > 20) {
        hasPixels = true;
        break;
      }
    }

    if (!hasPixels) {
      showToast("Passe o pincel sobre a marca d'água ou toque em um botão de predefinição de canto primeiro!");
      return;
    }

    setIsProcessing(true);
    setProgressInfo({ percent: 5, stage: 'Preparando reconstrução em alta definição...' });

    setTimeout(async () => {
      try {
        undoSnapshotsRef.current.push(currentImg);
        if (undoSnapshotsRef.current.length > 8) undoSnapshotsRef.current.shift();
        imageRedoRef.current = [];

        const { removeWatermarkInpaint } = await import('@/lib/watermark-remover');
        const result = await removeWatermarkInpaint(currentImg, maskImg.data, {
          mode: removalMode,
          intensity,
          onProgress: (info) => {
            setProgressInfo(info);
          },
        });
        ctx.putImageData(result.imageData, 0, 0);
        mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskHistoryRef.current = [];
        maskRedoHistoryRef.current = [];

        const cleanUrl = imgCanvas.toDataURL('image/png');
        afterDataUrlRef.current = cleanUrl;
        setAfterPreviewUrl(cleanUrl);
        setLastProcessMs(result.durationMs);
        setHasMaskStrokes(false);
        setHasProcessedResult(true);
        syncHistoryFlags();
        showToast(
          `Marca d'água removida em ${(result.durationMs / 1000).toFixed(2)}s (Intensidade ${intensity}%)!`
        );
      } catch (err) {
        console.error('Local inpaint error:', err);
        showToast('Não foi possível processar esta seleção. Tente pintar uma área menor.');
      } finally {
        setIsProcessing(false);
        setProgressInfo({ percent: 0, stage: '' });
      }
    }, 16);
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
      const filename = `zeenaprompt-limpo-${Date.now()}.${ext}`;
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

      showToast(toastMsg || 'Foto limpa baixada diretamente no seu dispositivo!');
    },
    [dataUrlToBlob, showToast]
  );

  const handleDownloadClean = (format: 'png' | 'jpeg' = 'png') => {
    const dataUrl = getCleanDataUrl(format);
    if (!dataUrl) {
      showToast('Nenhuma foto processada disponível para baixar ainda.');
      return;
    }

    triggerSyncDownload(dataUrl, format);
  };

  const handleShareClean = async () => {
    const dataUrl = getCleanDataUrl('png');
    if (!dataUrl) {
      showToast('Limpe a foto primeiro antes de compartilhar.');
      return;
    }

    const blob = dataUrlToBlob(dataUrl);
    if (!blob) {
      showToast('Não foi possível preparar a imagem para compartilhamento.');
      return;
    }

    const file = new File([blob], `zeenaprompt-limpo-${Date.now()}.png`, {
      type: 'image/png',
    });

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Foto Limpa - Removedor de Marca d'Água Zeenaprompt",
            text: "Marca d'água removida offline em segundos com o Zeenaprompt!",
          });
          showToast('Foto limpa compartilhada com sucesso!');
          return;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }

      try {
        await navigator.share({
          title: "Removedor de Marca d'Água Gemini Grátis - Zeenaprompt",
          text: "Remova marcas d'água offline em segundos diretamente no navegador!",
          url: window.location.href,
        });
        showToast('Link compartilhado com sucesso!');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('Foto limpa copiada para a área de transferência! Cole onde quiser.');
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link da ferramenta copiado para a área de transferência!');
    } catch {
      showToast('O compartilhamento não é suportado neste navegador. Use Baixar.');
    }
  };

  const handleShareTool = async () => {
    const shareUrl =
      typeof window !== 'undefined'
        ? window.location.href
        : 'https://zeenaprompt.com/removedor-de-marca-dagua-gemini-online';

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: "Removedor de Marca d'Água Gemini e IA Grátis - Zeenaprompt",
          text: "Remova marcas d'água do Gemini e de IA offline em segundos direto no seu navegador!",
          url: shareUrl,
        });
        showToast('Link da ferramenta compartilhado com sucesso!');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link da ferramenta copiado para a área de transferência!');
    } catch {
      showToast('Copie o link na barra do navegador para compartilhar esta ferramenta.');
    }
  };

  // --- Envio em Lote (Exclusivo Pro) ---
  const handleBulkAddTrigger = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!hasActivePremium) {
      showToast('O Envio em Lote é um recurso Pro. Assine o Pro Yearly (₹99/ano) para desbloquear!');
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
      showToast('Selecione arquivos de imagem válidos (PNG, JPG, WEBP).');
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
      showToast(
        `${decodedItems.length} foto${decodedItems.length > 1 ? 's' : ''} adicionada${decodedItems.length > 1 ? 's' : ''} à fila em lote!`
      );
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
      showToast('Todas as fotos da fila já estão limpas!');
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
              if (!ctx || !mCtx) throw new Error('Contexto Canvas indisponível');

              ctx.drawImage(img, 0, 0, w, h);
              if (bulkZone === 'bottom-right' || bulkZone === 'both') {
                drawGeminiWatermarkMask(mCtx, w, h);
              }
              if (bulkZone === 'bottom-left' || bulkZone === 'both') {
                drawBottomLeftWatermarkMask(mCtx, w, h);
              }

              const imgData = ctx.getImageData(0, 0, w, h);
              const maskData = mCtx.getImageData(0, 0, w, h);
              const { removeWatermarkInpaint } = await import('@/lib/watermark-remover');
              const inpainted = await removeWatermarkInpaint(imgData, maskData.data, {
                mode: removalMode,
                intensity,
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
          img.onerror = () => reject(new Error('Falha ao decodificar imagem'));
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
    showToast(
      `Processamento em lote concluído! ${pendingQueue.length} foto${pendingQueue.length > 1 ? 's' : ''} limpa${pendingQueue.length > 1 ? 's' : ''} localmente.`
    );
  };

  const handleDownloadBulkItem = (item: BulkWatermarkItem) => {
    const url = item.cleanedUrl;
    if (!url) return;
    const baseName = item.name.replace(/\.[^.]+$/, '') || 'foto';
    const blob = dataUrlToBlob(url);
    const filename = `limpo-${baseName}.png`;

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
      showToast('Processe as imagens da fila primeiro antes de baixar o ZIP.');
      return;
    }

    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    doneItems.forEach((item, idx) => {
      if (!item.cleanedUrl) return;
      const blob = dataUrlToBlob(item.cleanedUrl);
      if (blob) {
        const safeBase = (item.name.replace(/\.[^.]+$/, '') || `foto-${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        zip.file(`${idx + 1}-limpo-${safeBase}.png`, blob);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `zeenaprompt-lote-limpo-${Date.now()}.zip`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.parentNode?.removeChild(link), 300);
    setTimeout(() => URL.revokeObjectURL(zipUrl), 30000);
    showToast(`${doneItems.length} imagens limpas baixadas em arquivo ZIP!`);
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
      showToast(`"${item.name}" carregada no Editor de Pincel!`);
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
      {/* Cabeçalho Principal H1 e Selos de Privacidade + Seletor de Idioma */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-black dark:text-white flex items-center gap-3 flex-wrap">
            <span className="w-10 h-10 rounded-2xl bg-[#E60023] text-white flex items-center justify-center shadow-lg shadow-red-600/20 shrink-0">
              <Eraser className="w-5 h-5" />
            </span>
            <span>Removedor de Marca d&apos;Água Gemini Online Grátis Sem Desfoque</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 max-w-2xl">
            Nosso Removedor de Marca d&apos;Água Gemini Online Grátis Sem Desfoque funciona direto no navegador e permite apagar logos brilhantes do Gemini, selos de texto e marcas nos cantos em HD nítido. Zero envios ao servidor, zero perda de qualidade, 100% privado e funciona offline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs font-semibold text-black dark:text-white">
          {/* Seletor de Idioma (botão sem borda) */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              id="watermark-language-selector-btn"
              aria-haspopup="menu"
              aria-expanded={isLangMenuOpen}
              aria-label="Selecionar idioma da ferramenta"
              onClick={() => setIsLangMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[36px] rounded-xl bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-black dark:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-[#E60023] shrink-0" />
              <span>Português (Brasil)</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 transition-transform duration-150 shrink-0 ${
                  isLangMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isLangMenuOpen && (
              <div
                role="menu"
                aria-label="Opções de idioma"
                className="absolute left-0 lg:left-auto lg:right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-neutral-900 shadow-xl py-1.5 z-40"
              >
                <Link
                  href="/free-gemini-watermark-remover-online"
                  prefetch={false}
                  role="menuitemradio"
                  aria-checked={false}
                  onClick={() => {
                    setIsLangMenuOpen(false);
                    startRouteNavigation(
                      '/free-gemini-watermark-remover-online',
                      'Loading English version...'
                    );
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between gap-2 transition-colors"
                >
                  <span>English</span>
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">EN</span>
                </Link>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={true}
                  onClick={() => setIsLangMenuOpen(false)}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-black dark:text-white bg-red-50 dark:bg-red-950/30 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span>Português (Brasil)</span>
                  <Check className="w-3.5 h-3.5 text-[#E60023] shrink-0" />
                </button>
              </div>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white">
            <WifiOff className="w-3.5 h-3.5 text-[#E60023]" />
            <span>Funciona Offline</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#E60023] dark:text-red-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Processamento no Dispositivo</span>
          </span>
        </div>
      </div>

      {/* Inputs de Arquivo Ocultos */}
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
        /* Cartão de Upload Dropzone */
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
                showToast('O Envio em Lote é um recurso Pro. Assine o Pro Yearly (₹99/ano) para desbloquear!');
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
              ? 'border-[#E60023] bg-red-50/40 dark:bg-red-950/20 scale-[0.99]'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-[#E60023] dark:hover:border-[#E60023]'
          }`}
        >
          <div className="w-16 h-16 rounded-3xl bg-[#E60023] text-white flex items-center justify-center mx-auto shadow-xl shadow-red-600/20">
            <Upload className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-lg sm:text-xl font-black text-black dark:text-white">
              Envie Sua Foto para Remover Marca d&apos;Água Localmente
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              Escolha qualquer foto do Gemini ou arte de IA da sua galeria. Sua imagem fica totalmente na memória do seu aparelho e é limpa localmente com textura HD nítida em segundos.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#E60023] hover:bg-red-700 text-white font-black text-sm shadow-lg shadow-red-600/20 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Escolher Imagem do Celular / PC</span>
            </button>

            <button
              type="button"
              onClick={handleBulkAddTrigger}
              id="bulk-add-dropzone-btn"
              className={`inline-flex items-center gap-2 px-5 py-3.5 rounded-full font-black text-sm transition-all cursor-pointer ${
                hasActivePremium
                  ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 shadow-md'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 shadow-sm'
              }`}
            >
              {hasActivePremium ? (
                <Images className="w-4 h-4 text-[#E60023]" />
              ) : (
                <Lock className="w-4 h-4 text-[#E60023]" />
              )}
              <span>Adicionar em Lote</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E60023] text-white text-[10px] font-black uppercase tracking-wider">
                <Crown className="w-2.5 h-2.5" />
                <span>{hasActivePremium ? 'PRO' : 'SÓ PRO'}</span>
              </span>
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <span>Sem Login Obrigatório</span>
            <span aria-hidden="true">·</span>
            <span>Usos Gratuitos Ilimitados</span>
            <span aria-hidden="true">·</span>
            <span>Exportação Full HD</span>
          </div>
        </div>
      ) : (
        /* Área de Edição */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Esquerda 8 Colunas: Canvas Interativo + Comparação Antes/Depois */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-xs font-bold text-black dark:text-white">
                  <Sparkles className="w-4 h-4 text-[#E60023]" />
                  <span>
                    {showCompareMode
                      ? 'Comparação Antes / Depois (Arraste o Controle)'
                      : hasMaskStrokes
                      ? "Marca d'Água do Gemini Marcada — Clique em \"Remover Marca d'Água Agora\" ou Ajuste com o Pincel"
                      : "Passe o Pincel Sobre a Marca d'Água ou Toque em uma Predefinição"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {hasProcessedResult && beforePreviewUrl && afterPreviewUrl && (
                    <button
                      type="button"
                      onClick={() => setShowCompareMode(!showCompareMode)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        showCompareMode
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{showCompareMode ? 'Voltar ao Pincel' : 'Comparar Antes/Depois'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-black dark:text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Trocar Foto
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkAddTrigger}
                    id="bulk-add-editor-btn"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      hasActivePremium
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {hasActivePremium ? (
                      <Images className="w-3.5 h-3.5 text-[#E60023]" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-[#E60023]" />
                    )}
                    <span>Envio em Lote</span>
                    {!hasActivePremium && (
                      <span className="px-1.5 py-0.5 rounded bg-[#E60023] text-white text-[9px] font-black uppercase">
                        PRO
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Viewport do Canvas */}
              <div className="relative w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-[320px] sm:min-h-[460px] max-h-[72vh] select-none">
                {showCompareMode && beforePreviewUrl && afterPreviewUrl && (
                  <div className="relative inline-block max-w-full max-h-[70vh]">
                    <img
                      src={afterPreviewUrl}
                      alt="Resultado limpo"
                      className="max-w-full max-h-[70vh] w-auto h-auto object-contain block select-none pointer-events-none"
                    />
                    <div
                      className="absolute inset-0 overflow-hidden select-none pointer-events-none"
                      style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
                    >
                      <img
                        src={beforePreviewUrl}
                        alt="Original antes da remoção"
                        className="w-full h-full object-contain block"
                      />
                    </div>
                    <div
                      className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] pointer-events-none"
                      style={{ left: `${comparePosition}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-black shadow-xl flex items-center justify-center text-[10px] font-black">
                        ↔
                      </div>
                    </div>
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/85 text-white text-[10px] font-bold pointer-events-none">
                      Antes
                    </span>
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#E60023] text-white text-[10px] font-bold pointer-events-none">
                      Limpo
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={comparePosition}
                      onChange={(e) => setComparePosition(Number(e.target.value))}
                      aria-label="Controle deslizante para comparar antes e depois"
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
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 px-1">
                  <span>
                    Resolução: {imageDimensions.width} × {imageDimensions.height} px
                  </span>
                  {lastProcessMs !== null && (
                    <span className="text-[#E60023] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Limpo localmente em {(lastProcessMs / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Direita 4 Colunas: Controles de Pincel, Intensidade, Predefinições e Exportação */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
              {/* Predefinições Rápidas de 1 Clique */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                  Predefinições Rápidas (1 Toque)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => applyCornerPreset('bottom-right')}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-black dark:text-white hover:text-[#E60023] dark:hover:text-red-400 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-[#E60023]" />
                      <span>Marcar Logo Gemini Auto</span>
                    </span>
                    <CornerDownRight className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyCornerPreset('bottom-left')}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-black dark:text-white hover:text-[#E60023] dark:hover:text-red-400 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Eraser className="w-4 h-4 text-[#E60023]" />
                      <span>Marcar Texto Inferior Esquerdo</span>
                    </span>
                    <CornerDownLeft className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              </div>

              {/* Tamanho do Pincel + Caixa Compacta Desfazer / Refazer / Limpar Marcação */}
              <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between text-xs font-bold text-black dark:text-white">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#E60023]" />
                    Tamanho do Pincel
                  </span>
                  <span className="tabular-nums">{brushSize} px</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={85}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-[#E60023] cursor-pointer"
                />

                {/* Caixa Compacta: Desfazer (só ícone), Refazer (só ícone) e Limpar Marcação */}
                <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    aria-label="Desfazer"
                    title="Desfazer"
                    className="w-9 h-9 rounded-lg bg-white dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-35 text-black dark:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={!canRedo}
                    aria-label="Refazer"
                    title="Refazer"
                    className="w-9 h-9 rounded-lg bg-white dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-35 text-black dark:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearMask}
                    disabled={!hasMaskStrokes}
                    className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-neutral-900 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-[#E60023] disabled:opacity-40 text-black dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#E60023]" />
                    <span>Limpar Marcação</span>
                  </button>
                </div>
              </div>

              {/* Controle de Intensidade (25% / 50% / 75% / 100%, Padrão 100%) */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between text-xs font-bold text-black dark:text-white">
                  <span>Intensidade da Remoção</span>
                  <span className="tabular-nums text-[#E60023]">{intensity}%</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  {([25, 50, 75, 100] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setIntensity(level)}
                      className={`py-2 rounded-lg text-xs font-black tabular-nums transition-colors cursor-pointer ${
                        intensity === level
                          ? 'bg-[#E60023] text-white'
                          : 'bg-transparent text-black dark:text-white hover:bg-white dark:hover:bg-neutral-900'
                      }`}
                    >
                      {level}%
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Intensidade menor suaviza a mistura para evitar desfoque ou distorção; 100% aplica remoção total.
                </p>
              </div>

              {/* Seletor de Motor de Remoção */}
              <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                  Motor de Remoção
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRemovalMode('hd')}
                    className={`w-full p-3 rounded-xl text-left transition-all cursor-pointer ${
                      removalMode === 'hd'
                        ? 'bg-red-50 dark:bg-red-950/35 text-black dark:text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#E60023]" />
                        <span>Textura HD (Recomendado)</span>
                      </span>
                      <span className="text-[10px] font-bold text-[#E60023]">~1–3s</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                      PatchMatch sem desfoque + detalhes contínuos para pele, cabelo, roupa e fundos texturizados.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRemovalMode('translucent')}
                    className={`w-full p-3 rounded-xl text-left transition-all cursor-pointer ${
                      removalMode === 'translucent'
                        ? 'bg-red-50 dark:bg-red-950/35 text-black dark:text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#E60023]" />
                        <span>Apagador de Marca Transparente</span>
                      </span>
                      <span className="text-[10px] font-bold text-[#E60023]">~1–2s</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                      Remove logos brancos suaves e textos de canto recuperando os detalhes reais abaixo.
                    </p>
                  </button>
                </div>
              </div>

              {/* Ação Principal de Remoção */}
              <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  disabled={isProcessing || !hasMaskStrokes}
                  onClick={handleRemoveWatermark}
                  className="w-full py-3.5 px-5 rounded-2xl bg-[#E60023] hover:bg-red-700 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  id="remove-watermark-action-btn"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Reconstruindo HD... {progressInfo.percent}%</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Remover Marca d&apos;Água Agora</span>
                    </>
                  )}
                </button>

                {isProcessing && (
                  <div className="space-y-1.5 px-1">
                    <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#E60023] transition-all duration-150"
                        style={{ width: `${Math.max(8, progressInfo.percent)}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 text-center">
                      {progressInfo.stage || 'Processando pixels nítidos localmente...'}
                    </p>
                  </div>
                )}

                {hasProcessedResult && (
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void handleDownloadClean('png')}
                      className="w-full py-3 px-4 rounded-2xl bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      id="download-clean-image-png-btn"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar Imagem Limpa (PNG HD)</span>
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleShareClean()}
                        className="w-full py-2.5 px-3 rounded-2xl bg-[#E60023] hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        id="share-clean-image-btn"
                      >
                        <Share2 className="w-4 h-4 shrink-0" />
                        <span>Compartilhar Foto</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleShareTool()}
                        className="w-full py-2.5 px-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        id="share-this-tool-btn"
                      >
                        <Link2 className="w-4 h-4 shrink-0 text-[#E60023]" />
                        <span>Compartilhar Site</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Painel de Fila em Lote (Visível quando o usuário Pro adiciona múltiplas fotos) */}
      {bulkItems.length > 0 && (
        <section
          aria-label="Fila de Remoção de Marca d'Água em Lote"
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E60023] text-white text-[10px] font-black uppercase tracking-wider">
                  <Crown className="w-3 h-3" />
                  <span>FILA EM LOTE PRO</span>
                </span>
                <h3 className="text-base sm:text-lg font-black text-black dark:text-white">
                  Removedor em Lote ({bulkItems.length} Foto{bulkItems.length > 1 ? 's' : ''})
                </h3>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Limpeza em lote 100% local na memória do seu navegador. Escolha a posição da marca d&apos;água e processe todas em um clique.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBulkAddTrigger}
                className="px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-black dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Images className="w-3.5 h-3.5 text-[#E60023]" />
                <span>Adicionar Mais</span>
              </button>

              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => void handleProcessBulkQueue()}
                className="px-4 py-2 rounded-xl bg-[#E60023] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                {isBulkProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Limpando {bulkProgress.current}/{bulkProgress.total}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Processar Tudo ({bulkItems.filter((i) => i.status !== 'done').length || bulkItems.length})</span>
                  </>
                )}
              </button>

              {bulkItems.some((it) => it.status === 'done') && (
                <button
                  type="button"
                  onClick={() => void handleDownloadAllZip()}
                  className="px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Baixar Tudo em ZIP</span>
                </button>
              )}

              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleClearBulkQueue}
                className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[#E60023] text-black dark:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Seletor de Zona Alvo (botões sem borda) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-neutral-600 dark:text-neutral-400 mr-1">Zona da Marca d&apos;Água:</span>
            {(
              [
                { id: 'bottom-right', label: 'Inferior Direito (Estrela Gemini)' },
                { id: 'bottom-left', label: 'Inferior Esquerdo (Carimbo de Texto)' },
                { id: 'both', label: 'Ambos os Cantos' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={isBulkProcessing}
                onClick={() => setBulkZone(opt.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  bulkZone === opt.id
                    ? 'bg-[#E60023] text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Grade em Lote */}
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
                  <p className="text-xs font-bold text-black dark:text-white truncate">{item.name}</p>
                  <p className="text-[11px] text-neutral-500">
                    {item.width} × {item.height} px ·{' '}
                    <span
                      className={
                        item.status === 'done'
                          ? 'text-black dark:text-white font-bold'
                          : item.status === 'processing'
                          ? 'text-[#E60023] font-bold'
                          : item.status === 'error'
                          ? 'text-[#E60023] font-bold'
                          : 'text-neutral-500'
                      }
                    >
                      {item.status === 'done'
                        ? `Limpa (${((item.durationMs || 0) / 1000).toFixed(1)}s)`
                        : item.status === 'processing'
                        ? 'Processando...'
                        : item.status === 'error'
                        ? 'Falhou'
                        : 'Pronta'}
                    </span>
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {item.status === 'done' && (
                      <button
                        type="button"
                        onClick={() => handleDownloadBulkItem(item)}
                        className="px-2.5 py-1 rounded-lg bg-[#E60023] hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Salvar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleLoadBulkItemInEditor(item)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-black dark:text-white text-[11px] font-bold cursor-pointer"
                    >
                      Editar Pincel
                    </button>
                    <button
                      type="button"
                      disabled={isBulkProcessing}
                      onClick={() => handleRemoveBulkItem(item.id)}
                      aria-label={`Remover ${item.name}`}
                      className="p-1 rounded-lg text-neutral-500 hover:text-[#E60023] hover:bg-neutral-200/70 dark:hover:bg-neutral-800 cursor-pointer ml-auto"
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

      {/* Seção Mais Ferramentas (Exibida após enviar uma imagem) */}
      {hasImage && (
        <section
          aria-label="Mais Ferramentas de Imagem e Produtividade"
          className="mt-8 p-5 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#E60023] dark:text-red-400">
                Utilitários Complementares Rápidos
              </p>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-black dark:text-white">
                Mais Ferramentas Online Grátis de Imagem e Documentos
              </h2>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Precisa comprimir, redimensionar para documento ou extrair anotações manuscritas?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://toolimg.online/compress/compress-image-to-50kb"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800 hover:border-[#E60023] transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center">
                    <Minimize2 className="w-5 h-5" />
                  </span>
                  <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-[#E60023] transition-colors" />
                </div>
                <h3 className="text-base font-bold text-black dark:text-white group-hover:text-[#E60023] transition-colors">
                  Comprimir Imagem
                </h3>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Reduza o tamanho da foto até 50KB sem perder nitidez para formulários, portais e envio rápido.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E60023]">
                <span>Abrir Compressor</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>

            <a
              href="https://toolimg.online/social-resize/us-passport-photo-2x2"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800 hover:border-[#E60023] transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center">
                    <Crop className="w-5 h-5" />
                  </span>
                  <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-[#E60023] transition-colors" />
                </div>
                <h3 className="text-base font-bold text-black dark:text-white group-hover:text-[#E60023] transition-colors">
                  Criador de Foto para Passaporte
                </h3>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Recorte e ajuste retratos exatamente para dimensões 2×2 polegadas de passaporte e visto na hora.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E60023]">
                <span>Criar Foto Passaporte</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>

            <a
              href="https://toolimg.online/tools/handwriting-to-text"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800 hover:border-[#E60023] transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </span>
                  <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-[#E60023] transition-colors" />
                </div>
                <h3 className="text-base font-bold text-black dark:text-white group-hover:text-[#E60023] transition-colors">
                  Manuscrito para Texto
                </h3>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Converta anotações feitas à mão, cadernos e páginas digitalizadas em texto digital editável.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E60023]">
                <span>Converter Manuscrito</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>
          </div>
        </section>
      )}

      {/* Vitrine em Moldura Windows Branca (Apenas Imagem com Controle Antes/Depois) */}
      {latestHomepagePost && (
        <section
          aria-label="Demonstração ao Vivo de Remoção de Marca d'Água Antes e Depois"
          className="mt-8"
        >
          <div className="mx-auto max-w-md sm:max-w-lg rounded-2xl sm:rounded-3xl bg-white p-2.5 sm:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-neutral-200">
            {/* Barra Minimalista Branca (apenas bolinhas, sem textos nem botões) */}
            <div className="pb-2.5 px-1 flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E60023]" />
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-black" />
            </div>

            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-neutral-100 select-none">
              {!demoImageError ? (
                <>
                  {/* Camada Depois (Foto HD Limpa) */}
                  <img
                    src={latestHomepagePost.imageUrl}
                    alt={latestHomepagePost.title}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => setDemoImageError(true)}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                  />

                  {/* Camada Antes (Recorte Esquerdo Mostrando Marca d'Água Simulada) */}
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none select-none"
                    style={{ clipPath: `inset(0 ${100 - demoSliderPos}% 0 0)` }}
                  >
                    <img
                      src={latestHomepagePost.imageUrl}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover select-none"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute bottom-3 right-3 flex items-center justify-center p-1.5 rounded-md bg-black/40"
                    >
                      <Sparkles className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  </div>

                  {/* Linha Divisória Vertical & Botão Deslizante */}
                  <div
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.85)] z-20 pointer-events-none"
                    style={{ left: `${demoSliderPos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white text-black shadow-xl flex items-center justify-center">
                      <MoveHorizontal className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Controle Deslizante Interativo Acessível */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={demoSliderPos}
                    onChange={(e) => setDemoSliderPos(Number(e.target.value))}
                    aria-label="Deslize para comparar a foto com marca d'água antes e depois da remoção"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                  <Images className="w-8 h-8 text-neutral-400" />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <AdsterraBanner300x250 className="mt-8" />

      {/* Guia Completo de SEO, Tabela Comparativa e Perguntas Frequentes */}
      <WatermarkRemoverSEOPtBr />
    </div>
  );
};
