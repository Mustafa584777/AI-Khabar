'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState<InpaintProgress>({ percent: 0, stage: '' });
  const [hasMaskStrokes, setHasMaskStrokes] = useState(false);
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
      (p) => p && p.status !== 'draft' && typeof p.imageUrl === 'string' && p.imageUrl.trim().length > 0
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

      maskHistoryRef.current = [mCtx.getImageData(0, 0, w, h)];

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
      clearWatermarkHandoff();
      showToast("Área da marca d'água do Gemini marcada automaticamente! Clique em \"Remover Marca d'Água Agora\".");
      return true;
    },
    [drawGeminiWatermarkMask, showToast]
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
        showToast("Última remoção de marca d'água desfeita.");
      }
    }
  };

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
      showToast("Marca d'água no canto inferior direito marcada. Clique em \"Remover Marca d'Água Agora\"!");
    } else {
      drawBottomLeftWatermarkMask(mCtx, w, h);
      showToast("Área no canto inferior esquerdo marcada. Clique em \"Remover Marca d'Água Agora\"!");
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

        const { removeWatermarkInpaint } = await import('@/lib/watermark-remover');
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
        showToast(
          `Marca d'água removida em ${(result.durationMs / 1000).toFixed(2)}s (Qualidade ${removalMode.toUpperCase()})!`
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
    showToast('Foto restaurada para a versão original.');
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
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-3 flex-wrap">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/25 shrink-0">
              <Eraser className="w-5 h-5" />
            </span>
            <span>Removedor de Marca d&apos;Água Gemini Online Grátis Sem Desfoque</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
            Nosso Removedor de Marca d&apos;Água Gemini Online Grátis Sem Desfoque funciona direto no navegador e permite apagar logos brilhantes do Gemini, selos de texto e marcas nos cantos em HD nítido. Zero envios ao servidor, zero perda de qualidade, 100% privado e funciona offline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
          {/* Seletor de Idioma */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              id="watermark-language-selector-btn"
              aria-haspopup="menu"
              aria-expanded={isLangMenuOpen}
              aria-label="Selecionar idioma da ferramenta"
              onClick={() => setIsLangMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              <span>Português (Brasil)</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-150 shrink-0 ${
                  isLangMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isLangMenuOpen && (
              <div
                role="menu"
                aria-label="Opções de idioma"
                className="absolute left-0 lg:left-auto lg:right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-1.5 z-40"
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
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between gap-2 transition-colors"
                >
                  <span>English</span>
                  <span className="text-[11px] font-medium text-neutral-400">EN</span>
                </Link>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={true}
                  onClick={() => setIsLangMenuOpen(false)}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-neutral-900 dark:text-white bg-pink-50/70 dark:bg-pink-950/30 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span>Português (Brasil)</span>
                  <Check className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 shrink-0" />
                </button>
              </div>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Funciona Offline</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/60">
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
              ? 'border-pink-500 bg-pink-50/40 dark:bg-pink-950/20 scale-[0.99]'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-pink-500 dark:hover:border-pink-500'
          }`}
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-violet-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-pink-500/25">
            <Upload className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white">
              Envie Sua Foto para Remover Marca d&apos;Água Localmente
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Escolha qualquer foto do Gemini ou arte de IA da sua galeria. Sua imagem fica totalmente na memória do seu aparelho e é limpa localmente com textura HD nítida em segundos.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-violet-700 text-white font-black text-sm shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Escolher Imagem do Celular / PC</span>
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
              <span>Adicionar em Lote</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider">
                <Crown className="w-2.5 h-2.5" />
                <span>{hasActivePremium ? 'PRO' : 'SÓ PRO'}</span>
              </span>
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[11px] font-medium text-neutral-400">
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
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                  <Sparkles className="w-4 h-4 text-pink-500" />
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
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{showCompareMode ? 'Voltar ao Pincel' : 'Comparar Antes/Depois'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Trocar Foto
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
                    <span>Envio em Lote</span>
                    {!hasActivePremium && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black uppercase">
                        PRO
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Viewport do Canvas */}
              <div className="relative w-full rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center min-h-[320px] sm:min-h-[460px] max-h-[72vh] select-none">
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
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-neutral-900 shadow-xl flex items-center justify-center text-[10px] font-black border border-neutral-300">
                        ↔
                      </div>
                    </div>
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 text-white text-[10px] font-bold pointer-events-none">
                      Antes
                    </span>
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-[10px] font-bold pointer-events-none">
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
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 px-1">
                  <span>
                    Resolução: {imageDimensions.width} × {imageDimensions.height} px
                  </span>
                  {lastProcessMs !== null && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Limpo localmente em {(lastProcessMs / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Direita 4 Colunas: Controles de Pincel, Predefinições e Exportação */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
              {/* Predefinições Rápidas de 1 Clique */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Predefinições Rápidas (1 Toque)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => applyCornerPreset('bottom-right')}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-pink-50 dark:hover:bg-pink-950/40 hover:text-pink-600 dark:hover:text-pink-300 border border-neutral-200 dark:border-neutral-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-pink-500" />
                      <span>Marcar Logo Gemini Auto</span>
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
                      <span>Marcar Texto Inferior Esquerdo</span>
                    </span>
                    <CornerDownLeft className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              </div>

              {/* Controle de Tamanho do Pincel */}
              <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-200">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-pink-500" />
                    Tamanho do Pincel
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
                    <span>Desfazer</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearMask}
                    className="py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Marcação</span>
                  </button>
                </div>
              </div>

              {/* Seletor de Motor de Remoção */}
              <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Motor de Remoção
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
                        <span>Textura HD (Recomendado)</span>
                      </span>
                      <span className="text-[10px] font-semibold text-pink-600 dark:text-pink-400">~1–3s</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      PatchMatch sem desfoque + detalhes contínuos para pele, cabelo, roupa e fundos texturizados.
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
                        <span>Apagador de Marca Transparente</span>
                      </span>
                      <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">~1–2s</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Remove logos brancos suaves e textos de canto recuperando os detalhes reais abaixo.
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
                        <span>Preenchimento Suave Instantâneo</span>
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">&lt;0.4s</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Ideal para paredes lisas, fundos de estúdio simples ou céus limpos.
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
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-violet-700 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
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
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 transition-all duration-150"
                        style={{ width: `${Math.max(8, progressInfo.percent)}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 text-center">
                      {progressInfo.stage || 'Processando pixels nítidos localmente...'}
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
                      <span>Baixar Imagem Limpa (PNG HD)</span>
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleShareClean()}
                        className="w-full py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        id="share-clean-image-btn"
                      >
                        <Share2 className="w-4 h-4 shrink-0" />
                        <span>Compartilhar Foto</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleShareTool()}
                        className="w-full py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        id="share-this-tool-btn"
                      >
                        <Link2 className="w-4 h-4 shrink-0" />
                        <span>Compartilhar Site</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDownloadClean('jpeg')}
                        className="py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Salvar em JPG
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToOriginal}
                        className="py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Restaurar Original
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider">
                  <Crown className="w-3 h-3" />
                  <span>FILA EM LOTE PRO</span>
                </span>
                <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                  Removedor em Lote ({bulkItems.length} Foto{bulkItems.length > 1 ? 's' : ''})
                </h3>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Limpeza em lote 100% local na memória do seu navegador. Escolha a posição da marca d&apos;água e processe todas em um clique.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBulkAddTrigger}
                className="px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Images className="w-3.5 h-3.5 text-pink-500" />
                <span>Adicionar Mais</span>
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
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Baixar Tudo em ZIP</span>
                </button>
              )}

              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleClearBulkQueue}
                className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 text-xs font-bold transition-colors cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Seletor de Zona Alvo */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-neutral-500 dark:text-neutral-400 mr-1">Zona da Marca d&apos;Água:</span>
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
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Salvar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleLoadBulkItemInEditor(item)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-[11px] font-bold cursor-pointer"
                    >
                      Editar Pincel
                    </button>
                    <button
                      type="button"
                      disabled={isBulkProcessing}
                      onClick={() => handleRemoveBulkItem(item.id)}
                      aria-label={`Remover ${item.name}`}
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

      {/* Seção Mais Ferramentas (Exibida após enviar uma imagem) */}
      {hasImage && (
        <section
          aria-label="Mais Ferramentas de Imagem e Produtividade"
          className="mt-8 p-5 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                Utilitários Complementares Rápidos
              </p>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                Mais Ferramentas Online Grátis de Imagem e Documentos
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Precisa comprimir, redimensionar para documento ou extrair anotações manuscritas?
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
                  Comprimir Imagem
                </h3>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Reduza o tamanho da foto até 50KB sem perder nitidez para formulários, portais e envio rápido.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 dark:text-pink-400">
                <span>Abrir Compressor</span>
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
                  Criador de Foto para Passaporte
                </h3>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Recorte e ajuste retratos exatamente para dimensões 2×2 polegadas de passaporte e visto na hora.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                <span>Criar Foto Passaporte</span>
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
                  Manuscrito para Texto
                </h3>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Converta anotações feitas à mão, cadernos e páginas digitalizadas em texto digital editável.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span>Converter Manuscrito</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>
          </div>
        </section>
      )}

      {/* Vitrine em Moldura MacBook (Último Prompt da Página Inicial com Controle Antes/Depois) */}
      {latestHomepagePost && (
        <section
          aria-label="Demonstração ao Vivo de Remoção de Marca d'Água Antes e Depois"
          className="mt-8 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-pink-600 dark:text-pink-400">
                Último Prompt da Página Inicial · Comparação ao Vivo
              </p>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                Prévia de Remoção de Marca d&apos;Água em HD (Antes e Depois)
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Arraste o controle deslizante na prévia do notebook para comparar a imagem com marca d&apos;água vs. reconstrução limpa.
            </p>
          </div>

          {/* Moldura MacBook */}
          <div className="mx-auto max-w-5xl">
            <div className="rounded-t-[24px] sm:rounded-t-[30px] bg-[#0b0c10] p-2.5 sm:p-4 ring-1 ring-neutral-800 shadow-2xl relative">
              <div
                aria-hidden="true"
                className="hidden sm:flex items-center justify-center w-28 h-4 bg-[#0b0c10] rounded-b-xl absolute top-2.5 left-1/2 -translate-x-1/2 z-30 border-x border-b border-neutral-800/80"
              >
                <span className="w-2 h-2 rounded-full bg-neutral-800 ring-1 ring-neutral-700 flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-sky-900" />
                </span>
              </div>

              <div className="rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800">
                <div className="bg-neutral-900/95 border-b border-neutral-800 px-3.5 sm:px-5 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                  </div>

                  <div className="flex-1 max-w-md mx-auto bg-neutral-950/90 border border-neutral-800 rounded-lg px-3 py-1 text-center truncate text-[11px] sm:text-xs font-medium text-neutral-300">
                    zeenaprompt.com · {latestHomepagePost.title}
                  </div>

                  <div className="hidden sm:block text-[11px] font-mono tabular-nums text-neutral-400 whitespace-nowrap shrink-0">
                    {latestHomepagePost.imageWidth || 1024} × {latestHomepagePost.imageHeight || 1536}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch bg-neutral-950">
                  <div className="lg:col-span-7 p-4 sm:p-6 bg-[#111318] flex items-center justify-center border-b lg:border-b-0 lg:border-r border-neutral-800/90">
                    <div className="relative w-full max-w-[330px] sm:max-w-[350px] aspect-[3/4] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 select-none shadow-lg">
                      {!demoImageError ? (
                        <>
                          <img
                            src={latestHomepagePost.imageUrl}
                            alt={`${latestHomepagePost.title} - Foto limpa sem marca d'água`}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={() => setDemoImageError(true)}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                          />

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
                              className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-black/35 backdrop-blur-[2px] text-white/95"
                            >
                              <Sparkles className="w-4 h-4 text-white drop-shadow" />
                              <span className="text-[11px] font-semibold tracking-tight drop-shadow">
                                Gemini
                              </span>
                            </div>
                          </div>

                          <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-black/75 text-white text-[11px] font-semibold pointer-events-none">
                            Antes · Marca d&apos;Água
                          </div>
                          <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-md bg-emerald-600/90 text-white text-[11px] font-semibold pointer-events-none">
                            Depois · HD Limpo
                          </div>

                          <div
                            aria-hidden="true"
                            className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.85)] z-20 pointer-events-none"
                            style={{ left: `${demoSliderPos}%` }}
                          >
                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white text-neutral-900 shadow-xl border border-neutral-200 flex items-center justify-center">
                              <MoveHorizontal className="w-4 h-4" />
                            </div>
                          </div>

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
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center gap-2 text-neutral-400">
                          <Images className="w-8 h-8 text-neutral-500" />
                          <p className="text-xs font-medium">{latestHomepagePost.title}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-5 sm:p-7 flex flex-col justify-between gap-5 text-neutral-100">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <span>{latestHomepagePost.preferredAi || latestHomepagePost.aiTool || 'Gemini'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{latestHomepagePost.category}</span>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                          {latestHomepagePost.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed line-clamp-3">
                          {latestHomepagePost.seo?.metaDescription || latestHomepagePost.promptText}
                        </p>
                      </div>

                      <div className="pt-2 space-y-2.5 border-t border-neutral-800/80">
                        <div className="flex items-center justify-between text-xs text-neutral-400">
                          <span>Divisão da Comparação</span>
                          <span className="font-mono tabular-nums text-neutral-200">
                            {demoSliderPos}% Antes / {100 - demoSliderPos}% Depois
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-neutral-900 border border-neutral-800">
                          <button
                            type="button"
                            onClick={() => setDemoSliderPos(100)}
                            className={`px-2 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              demoSliderPos >= 90
                                ? 'bg-neutral-800 text-white'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            Antes
                          </button>
                          <button
                            type="button"
                            onClick={() => setDemoSliderPos(50)}
                            className={`px-2 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              demoSliderPos > 10 && demoSliderPos < 90
                                ? 'bg-neutral-800 text-white'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            50 / 50
                          </button>
                          <button
                            type="button"
                            onClick={() => setDemoSliderPos(0)}
                            className={`px-2 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              demoSliderPos <= 10
                                ? 'bg-emerald-600 text-white'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            HD Limpo
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                          fileInputRef.current?.click();
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-violet-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Upload className="w-4 h-4 shrink-0" />
                        <span>Envie Sua Imagem para Limpar</span>
                      </button>

                      <a
                        href={`/prompt/${latestHomepagePost.slug || latestHomepagePost.id}`}
                        className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                      >
                        <span>Ver Este Prompt Inicial</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div aria-hidden="true" className="relative mx-auto w-[103%] -ml-[1.5%] h-3.5 sm:h-4 rounded-b-2xl bg-gradient-to-b from-neutral-300 via-neutral-400 to-neutral-500 dark:from-neutral-700 dark:via-neutral-800 dark:to-neutral-900 shadow-lg flex justify-center">
              <div className="w-16 sm:w-24 h-1.5 rounded-b-md bg-neutral-500/70 dark:bg-neutral-950/80" />
            </div>
          </div>
        </section>
      )}

      {/* Guia Completo de SEO, Tabela Comparativa e Perguntas Frequentes */}
      <WatermarkRemoverSEOPtBr />
    </div>
  );
};
