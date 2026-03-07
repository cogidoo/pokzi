import { describe, expect, it, vi } from 'vitest';
import { mapWithConcurrency, throwIfAborted } from './async';

describe('throwIfAborted', () => {
  it('does nothing when no signal is provided', () => {
    expect(() => {
      throwIfAborted();
    }).not.toThrow();
  });

  it('does nothing when signal is not aborted', () => {
    const controller = new AbortController();
    expect(() => {
      throwIfAborted(controller.signal);
    }).not.toThrow();
  });

  it('throws AbortError when signal is aborted', () => {
    const controller = new AbortController();
    controller.abort();

    expect(() => {
      throwIfAborted(controller.signal);
    }).toThrow();
  });

  it('throws the original signal reason when present', () => {
    const reason = new Error('custom-reason');
    const signal = { aborted: true, reason } as unknown as AbortSignal;

    expect(() => {
      throwIfAborted(signal);
    }).toThrow(reason);
  });

  it('falls back to AbortError when reason is missing', () => {
    const signal = { aborted: true, reason: undefined } as unknown as AbortSignal;

    expect(() => {
      throwIfAborted(signal);
    }).toThrow(/Aborted/);
  });
});

describe('mapWithConcurrency', () => {
  it('preserves input order in output', async () => {
    const values = [3, 1, 2];

    const result = await mapWithConcurrency(values, 2, (value) => Promise.resolve(value * 2));

    expect(result).toEqual([6, 2, 4]);
  });

  it('respects the concurrency limit', async () => {
    const values = [1, 2, 3, 4, 5];
    let active = 0;
    let maxSeen = 0;

    await mapWithConcurrency(values, 2, async (value) => {
      active += 1;
      maxSeen = Math.max(maxSeen, active);
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });
      active -= 1;
      return value;
    });

    expect(maxSeen).toBeLessThanOrEqual(2);
  });

  it('aborts before processing when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      mapWithConcurrency([1, 2], 2, (value) => Promise.resolve(value), controller.signal),
    ).rejects.toThrow();
  });

  it('propagates mapper errors', async () => {
    const mapper = vi.fn((value: number) => {
      if (value === 2) {
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve(value);
    });

    await expect(mapWithConcurrency([1, 2, 3], 2, mapper)).rejects.toThrow('boom');
  });
});
