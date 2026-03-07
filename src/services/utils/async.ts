/**
 * Maps items concurrently with a bounded worker count.
 *
 * @param items - Input items to process.
 * @param concurrency - Maximum number of active workers.
 * @param mapper - Async mapper applied per item.
 * @param signal - Optional cancellation signal.
 * @returns Mapper results in input order.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  const results = Array.from({ length: items.length }, () => undefined as unknown as R);
  let nextIndex = 0;

  /**
   * Processes queued items until all work is completed.
   */
  async function worker() {
    while (nextIndex < items.length) {
      throwIfAborted(signal);
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  const workerCount = Math.min(Math.max(concurrency, 1), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

/**
 * Throws an AbortError when the signal has already been aborted.
 *
 * @param signal - Optional abort signal from caller context.
 */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  }
}
