import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';

export class AiUnavailableError extends Error {
  constructor(readonly reason: 'not_configured' | 'timeout' | 'provider_error') {
    super(`AI unavailable: ${reason}`);
    this.name = 'AiUnavailableError';
  }
}

export function isAiConfigured(): boolean {
  return Boolean(config.aiApiKey);
}

/** Rejects with a timeout error if `promise` takes longer than `ms`. */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AiUnavailableError('timeout')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends one prompt to Gemini and returns the raw text. Only the error type is
 * logged: never the prompt (it contains the user's financial data) or the key.
 */
export async function generateText(prompt: string, options: { json: boolean }): Promise<string> {
  if (!config.aiApiKey) throw new AiUnavailableError('not_configured');

  const model = new GoogleGenerativeAI(config.aiApiKey).getGenerativeModel(
    {
      model: config.geminiModel,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
        ...(options.json ? { responseMimeType: 'application/json' } : {}),
      },
    },
    { timeout: config.aiTimeoutMs },
  );

  try {
    const result = await withTimeout(model.generateContent(prompt), config.aiTimeoutMs);
    return result.response.text();
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      console.warn(`Gemini request failed: ${error.reason}`);
      throw error;
    }
    const name = error instanceof Error ? error.name : 'UnknownError';
    console.warn(`Gemini request failed: provider_error (${name})`);
    throw new AiUnavailableError('provider_error');
  }
}
