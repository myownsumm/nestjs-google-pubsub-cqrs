import {
  Observable,
  Subscription,
  firstValueFrom,
  fromEvent,
  race,
  throwError,
} from 'rxjs';
import { filter, mergeMap, take, timeout } from 'rxjs/operators';
import type { GlobalBusMessage } from '../service';

/** Options for waiting on {@link GlobalBusMessage} streams (e2e helpers). */
export interface WaitForBusMessageOptions {
  /** Max time to wait for the expected message(s). */
  timeoutMs: number;
  /** When aborted, pending waits reject with `AbortError`. */
  signal?: AbortSignal;
}

function abortError(): Error {
  const err = new Error('Operation aborted');
  err.name = 'AbortError';
  return err;
}

/**
 * Reads a nested property using dot segments (e.g. `payload.userId`).
 * Returns `undefined` if any segment is missing.
 */
export function getByPath(
  value: unknown,
  path: string,
): unknown {
  if (!path) {
    return value;
  }
  const segments = path.split('.').filter(Boolean);
  let current: unknown = value;
  for (const key of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Resolves when the first message matching `predicate` is observed, or times out / aborts.
 */
export async function waitForMessage(
  source: Observable<GlobalBusMessage>,
  predicate: (msg: GlobalBusMessage) => boolean,
  options: WaitForBusMessageOptions,
): Promise<GlobalBusMessage> {
  const { timeoutMs, signal } = options;

  if (signal?.aborted) {
    throw abortError();
  }

  const matched$ = source.pipe(
    filter(predicate),
    take(1),
    timeout({ first: timeoutMs }),
  );

  if (!signal) {
    return firstValueFrom(matched$);
  }

  const aborted$ = fromEvent(signal, 'abort').pipe(
    mergeMap(() => throwError(() => abortError())),
  );

  return firstValueFrom(race(matched$, aborted$));
}

/**
 * Resolves when a message with the given `eventName` is observed.
 */
export function waitForEventName(
  source: Observable<GlobalBusMessage>,
  eventName: string,
  options: WaitForBusMessageOptions,
): Promise<GlobalBusMessage> {
  return waitForMessage(source, (msg) => msg.eventName === eventName, options);
}

export interface CollectBusMessagesOptions extends WaitForBusMessageOptions {
  /** How many messages to collect (after optional filter). */
  count: number;
  /** If set, only messages satisfying this predicate are collected. */
  predicate?: (msg: GlobalBusMessage) => boolean;
}

/**
 * Collects `count` messages (optionally filtered) in arrival order, within the timeout window
 * measured from subscription until the last collected message.
 */
export async function collectMessages(
  source: Observable<GlobalBusMessage>,
  options: CollectBusMessagesOptions,
): Promise<GlobalBusMessage[]> {
  const { count, timeoutMs, signal, predicate } = options;

  if (count <= 0) {
    return [];
  }

  if (signal?.aborted) {
    throw abortError();
  }

  return new Promise((resolve, reject) => {
    const collected: GlobalBusMessage[] = [];
    let settled = false;

    const fail = (err: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      sub.unsubscribe();
      clearTimeout(timer);
      reject(err);
    };

    const succeed = () => {
      if (settled) {
        return;
      }
      settled = true;
      sub.unsubscribe();
      clearTimeout(timer);
      resolve(collected);
    };

    const onAbort = () => fail(abortError());

    const timer = setTimeout(() => {
      fail(new Error(`collectMessages timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    const sub: Subscription = source.subscribe({
      next: (msg) => {
        try {
          if (predicate && !predicate(msg)) {
            return;
          }
          collected.push(msg);
          if (collected.length >= count) {
            if (signal) {
              signal.removeEventListener('abort', onAbort);
            }
            succeed();
          }
        } catch (e) {
          fail(e instanceof Error ? e : new Error(String(e)));
        }
      },
      error: (e) => fail(e instanceof Error ? e : new Error(String(e))),
      complete: () => {
        if (collected.length < count) {
          fail(
            new Error(
              `collectMessages ended after ${collected.length} message(s), expected ${count}`,
            ),
          );
        }
      },
    });
  });
}

/**
 * Waits for messages matching each predicate **in order**. Non-matching messages are skipped
 * until the current predicate is satisfied, then the next predicate is applied.
 */
export async function waitForMessageSequence(
  source: Observable<GlobalBusMessage>,
  predicates: Array<(msg: GlobalBusMessage) => boolean>,
  options: WaitForBusMessageOptions,
): Promise<GlobalBusMessage[]> {
  if (predicates.length === 0) {
    return [];
  }

  const { timeoutMs, signal } = options;

  if (signal?.aborted) {
    throw abortError();
  }

  return new Promise((resolve, reject) => {
    const results: GlobalBusMessage[] = [];
    let index = 0;
    let settled = false;

    const fail = (err: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      sub.unsubscribe();
      clearTimeout(timer);
      reject(err);
    };

    const succeed = () => {
      if (settled) {
        return;
      }
      settled = true;
      sub.unsubscribe();
      clearTimeout(timer);
      resolve(results);
    };

    const onAbort = () => fail(abortError());

    const timer = setTimeout(() => {
      fail(
        new Error(
          `waitForMessageSequence timed out after ${timeoutMs}ms (matched ${index}/${predicates.length})`,
        ),
      );
    }, timeoutMs);

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    const sub: Subscription = source.subscribe({
      next: (msg) => {
        if (index >= predicates.length) {
          return;
        }
        try {
          if (predicates[index](msg)) {
            results.push(msg);
            index += 1;
            if (index === predicates.length) {
              if (signal) {
                signal.removeEventListener('abort', onAbort);
              }
              succeed();
            }
          }
        } catch (e) {
          fail(e instanceof Error ? e : new Error(String(e)));
        }
      },
      error: (e) => fail(e instanceof Error ? e : new Error(String(e))),
      complete: () => {
        if (index < predicates.length) {
          fail(
            new Error(
              `waitForMessageSequence stream completed after ${index}/${predicates.length} matches`,
            ),
          );
        }
      },
    });
  });
}
