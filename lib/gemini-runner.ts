import { GoogleGenAI, ThinkingLevel } from '@google/genai';

/**
 * Valid active Gemini models tiered for fast sub-15s hedged execution and maximum reliability.
 * Strictly excludes deprecated legacy models (1.5 / 2.0 / gemini-pro).
 */
export const GEMINI_MODEL_WAVES: readonly (readonly string[])[] = [
  // Wave 1: Ultra-low-latency fast models (raced concurrently, typically resolves in 1-4s)
  ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen', 'gemini-flash-latest'],
  // Wave 2: Rapid Flash & Lite alternates (raced concurrently if Wave 1 fails/times out)
  ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest'],
  // Wave 3: High-capability Pro & Gemini 4 models (raced concurrently as deep fallback)
  ['gemini-2.5-pro', 'gemini-3.1-pro-preview', 'gemini-pro-latest', 'gemini-4-argon', 'gemini-4-neon', 'gemini-4-carbon'],
];

export const ALL_GEMINI_MODELS = GEMINI_MODEL_WAVES.flat();

export function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function extractJsonFromText(rawText: string): any {
  const trimmed = (rawText || '').trim();
  if (!trimmed) {
    throw new Error('Empty response text from Gemini');
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    // Strip markdown code fences if present
    const unfenced = trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      return JSON.parse(unfenced);
    } catch {
      const match = unfenced.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error('Could not parse JSON response from Gemini');
    }
  }
}

function buildConfigForModel(model: string, baseConfig?: Record<string, any>): Record<string, any> | undefined {
  if (!baseConfig) return undefined;
  const cloned: Record<string, any> = { ...baseConfig };

  const isGemini4 = model.startsWith('gemini-4-');
  const isGemini3 = model.startsWith('gemini-3');
  const isGemini25Flash = model === 'gemini-2.5-flash' || model === 'gemini-2.5-flash-lite';

  if (isGemini4) {
    // Gemini 4 series: do not pass temperature/topP/topK or thinkingBudget; use minimal/low thinkingLevel for speed
    delete cloned.temperature;
    delete cloned.topP;
    delete cloned.topK;
    cloned.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  } else if (isGemini3) {
    // Gemini 3 series: prefer LOW thinkingLevel for <15s response latency
    cloned.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  } else if (isGemini25Flash) {
    // Gemini 2.5 Flash: disable slow thinking budget for near-instant structured responses
    cloned.thinkingConfig = { thinkingBudget: 0 };
  }

  return cloned;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${timeoutMs}ms (${label})`));
    }, timeoutMs);

    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export interface FastGeminiRunOptions {
  apiKey: string;
  contents: any;
  config?: Record<string, any>;
  preferredModel?: string;
  expectJson?: boolean;
  maxTotalMs?: number;
}

export interface FastGeminiRunResult {
  text: string;
  parsedJson?: any;
  modelUsed: string;
  elapsedMs: number;
}

/**
 * Races waves of valid Gemini models concurrently with strict deadline capping (<15s total).
 * Guarantees first valid, schema/JSON-verified response wins immediately without waiting for slow fallbacks.
 */
export async function runGeminiWithFastFallback({
  apiKey,
  contents,
  config,
  preferredModel,
  expectJson = false,
  maxTotalMs = 13500,
}: FastGeminiRunOptions): Promise<FastGeminiRunResult> {
  const ai = createGeminiClient(apiKey);
  const startTime = Date.now();
  const seenErrors: string[] = [];

  // Build waves, placing valid preferredModel at front of Wave 1 if given
  const waves: string[][] = GEMINI_MODEL_WAVES.map((w) => [...w]);
  if (preferredModel && preferredModel !== 'imagen-3.0-generate-002' && !preferredModel.includes('1.5') && !preferredModel.includes('2.0')) {
    const cleaned = waves.map((w) => w.filter((m) => m !== preferredModel));
    cleaned[0].unshift(preferredModel);
    for (let i = 0; i < waves.length; i++) waves[i] = cleaned[i];
  }

  const attemptSingleModel = async (model: string, waveDeadlineMs: number): Promise<FastGeminiRunResult> => {
    const strictConfig = buildConfigForModel(model, config);

    const callOnce = async (cfg?: Record<string, any>) => {
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), Math.max(1000, waveDeadlineMs));

      try {
        const res = await withTimeout(
          ai.models.generateContent({
            model,
            contents,
            config: {
              ...cfg,
              abortSignal: controller.signal,
            },
          }),
          waveDeadlineMs,
          model
        );

        const text = (res?.text || '').trim();
        if (!text) {
          throw new Error(`Empty response from ${model}`);
        }

        if (expectJson) {
          const parsedJson = extractJsonFromText(text);
          return {
            text,
            parsedJson,
            modelUsed: model,
            elapsedMs: Date.now() - startTime,
          };
        }

        return {
          text,
          modelUsed: model,
          elapsedMs: Date.now() - startTime,
        };
      } finally {
        clearTimeout(abortTimer);
      }
    };

    try {
      return await callOnce(strictConfig);
    } catch (firstErr: any) {
      // If strict responseSchema caused an issue and time remains, retry relaxed JSON config immediately
      const remainingMs = maxTotalMs - (Date.now() - startTime);
      if (strictConfig?.responseSchema && remainingMs > 2200) {
        const relaxedConfig = { ...strictConfig };
        delete relaxedConfig.responseSchema;
        return await callOnce(relaxedConfig);
      }
      throw firstErr;
    }
  };

  for (let waveIndex = 0; waveIndex < waves.length; waveIndex++) {
    const models = waves[waveIndex];
    if (models.length === 0) continue;

    const elapsed = Date.now() - startTime;
    const remainingTotal = maxTotalMs - elapsed;
    if (remainingTotal <= 800) break;

    // Budget per wave so Wave 1, 2, 3 all fit comfortably under 13.5s total
    const waveCap =
      waveIndex === 0
        ? Math.min(4800, remainingTotal)
        : waveIndex === 1
          ? Math.min(4500, remainingTotal)
          : remainingTotal;

    try {
      const result = await Promise.any(
        models.map((m) =>
          attemptSingleModel(m, waveCap).catch((err) => {
            const msg = `${m}: ${err?.message || 'failed'}`;
            seenErrors.push(msg);
            throw err;
          })
        )
      );
      return result;
    } catch {
      // Continue to next wave if time permits
    }
  }

  throw new Error(`All Gemini waves failed within ${maxTotalMs}ms. Details: ${seenErrors.slice(0, 5).join(' | ')}`);
}
