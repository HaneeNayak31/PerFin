import { parseModelJson } from '../../src/services/ai.service.js';
import { AiUnavailableError, withTimeout } from '../../src/services/gemini.client.js';

describe('AI helpers', () => {
  it('parses JSON wrapped in markdown fences', () => {
    expect(parseModelJson('```json\n{"categoryName":"Food"}\n```')).toEqual({ categoryName: 'Food' });
  });

  it('returns undefined for non-JSON output instead of throwing', () => {
    expect(parseModelJson('Sure! The category is Food.')).toBeUndefined();
  });

  it('times out slow provider calls', async () => {
    vi.useFakeTimers();
    const never = new Promise<string>(() => {});
    const result = withTimeout(never, 1000);
    vi.advanceTimersByTime(1001);
    await expect(result).rejects.toBeInstanceOf(AiUnavailableError);
    vi.useRealTimers();
  });

  it('passes through results that arrive in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });
});
