export interface WatermarkHandoffPayload {
  file?: File;
  dataUrl?: string;
  name?: string;
  createdAt: number;
}

const SESSION_KEY = 'zeenaprompt_watermark_preload';
let pendingHandoff: WatermarkHandoffPayload | null = null;

export function setWatermarkHandoff(payload: {
  file?: File;
  dataUrl?: string;
  name?: string;
}): void {
  pendingHandoff = {
    file: payload.file,
    dataUrl: payload.dataUrl,
    name: payload.name || payload.file?.name || 'uploaded-image',
    createdAt: Date.now(),
  };

  if (typeof window !== 'undefined' && payload.dataUrl) {
    try {
      sessionStorage.setItem(SESSION_KEY, payload.dataUrl);
    } catch {
      // Ignore storage quota errors for large images; in-memory handoff handles them
    }
  }
}

export function peekWatermarkHandoff(): WatermarkHandoffPayload | null {
  if (pendingHandoff) {
    // Expire stale handoffs older than 10 minutes
    if (Date.now() - pendingHandoff.createdAt < 10 * 60 * 1000) {
      return pendingHandoff;
    }
    pendingHandoff = null;
  }

  if (typeof window !== 'undefined') {
    try {
      const savedUrl = sessionStorage.getItem(SESSION_KEY);
      if (savedUrl) {
        return {
          dataUrl: savedUrl,
          createdAt: Date.now(),
        };
      }
    } catch {
      // Ignore storage access errors
    }
  }

  return null;
}

export function clearWatermarkHandoff(): void {
  pendingHandoff = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage access errors
    }
  }
}
