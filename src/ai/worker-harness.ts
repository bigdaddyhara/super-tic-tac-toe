import { ChooseOptions } from "./types";

// Minimal in-process harness that enforces a time budget and supports AbortSignal.
// Intended to be replaced by a Web Worker implementation for heavy searches.

export async function runWithTimeBudget<T>(
  work: (signal: AbortSignal) => Promise<T>,
  options?: ChooseOptions
): Promise<T> {
  if (!options || (!options.timeBudgetMs && !options.iterationBudget)) {
    // No budget given: just run until completion
    return work(new AbortController().signal);
  }

  const controller = new AbortController();
  const signal = controller.signal;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (options.timeBudgetMs && options.timeBudgetMs > 0) {
    timeoutId = globalThis.setTimeout(() => controller.abort(), options.timeBudgetMs);
  }

  if (options.abortSignal) {
    if (options.abortSignal.aborted) controller.abort();
    else options.abortSignal.addEventListener("abort", () => controller.abort());
  }

  try {
    return await work(signal);
  } finally {
    if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId as any);
  }
}
