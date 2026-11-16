export async function triggerConfetti(options?: Record<string, unknown>): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const mod = await import('canvas-confetti');
    const confetti = mod.default;
    if (typeof confetti === 'function') {
      confetti(options as any);
    }
  } catch {
    // Silent fallback if confetti chunk fails
  }
}
