/** Trailing-edge throttle with a `cancel`, used for cursors and the outbox. */
export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): ((...args: A) => void) & { cancel(): void } {
  let last = 0;
  let timer: number | null = null;
  let pending: A | null = null;

  const run = (...args: A) => {
    const now = Date.now();
    const wait = ms - (now - last);
    if (wait <= 0) {
      last = now;
      fn(...args);
      return;
    }
    pending = args;
    if (timer !== null) return;
    timer = window.setTimeout(() => {
      timer = null;
      last = Date.now();
      if (pending) fn(...pending);
      pending = null;
    }, wait);
  };

  run.cancel = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    pending = null;
  };

  return run;
}
