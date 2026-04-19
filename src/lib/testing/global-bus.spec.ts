import { Subject } from 'rxjs';
import { delay } from 'rxjs/operators';
import type { GlobalBusMessage } from '../service';
import {
  collectMessages,
  getByPath,
  waitForEventName,
  waitForMessage,
  waitForMessageSequence,
} from './global-bus';

function msg(
  eventName: string,
  overrides: Partial<GlobalBusMessage> = {},
): GlobalBusMessage {
  return {
    eventName,
    eventBody: {},
    eventInitiator: 'test',
    ...overrides,
  };
}

describe('getByPath', () => {
  it('returns nested values', () => {
    expect(getByPath({ payload: { id: 'u1' } }, 'payload.id')).toBe('u1');
  });

  it('returns undefined for missing path', () => {
    expect(getByPath({ payload: {} }, 'payload.missing')).toBeUndefined();
  });

  it('returns root for empty path', () => {
    expect(getByPath({ a: 1 }, '')).toEqual({ a: 1 });
  });
});

describe('waitForMessage', () => {
  it('resolves on first matching message', async () => {
    const source = new Subject<GlobalBusMessage>();
    const p = waitForMessage(
      source.asObservable(),
      (m) => m.eventName === 'Wanted',
      { timeoutMs: 1000 },
    );
    source.next(msg('Other'));
    source.next(msg('Wanted', { eventBody: { x: 1 } }));
    const got = await p;
    expect(got.eventName).toBe('Wanted');
    expect((got.eventBody as { x: number }).x).toBe(1);
  });

  it('times out when no match', async () => {
    const source = new Subject<GlobalBusMessage>();
    const p = waitForMessage(
      source.asObservable(),
      () => false,
      { timeoutMs: 20 },
    );
    await expect(p).rejects.toThrow(/Timeout/);
  });

  it('rejects on abort', async () => {
    const source = new Subject<GlobalBusMessage>();
    const ac = new AbortController();
    const p = waitForMessage(
      source.asObservable(),
      () => false,
      { timeoutMs: 5000, signal: ac.signal },
    );
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('waitForEventName', () => {
  it('matches event name', async () => {
    const source = new Subject<GlobalBusMessage>();
    const p = waitForEventName(source.asObservable(), 'A', { timeoutMs: 500 });
    source.next(msg('B'));
    source.next(msg('A'));
    expect((await p).eventName).toBe('A');
  });
});

describe('waitForMessageSequence', () => {
  it('collects ordered matches skipping non-matching', async () => {
    const source = new Subject<GlobalBusMessage>();
    const p = waitForMessageSequence(
      source.asObservable(),
      [
        (m) => m.eventName === 'First',
        (m) => m.eventName === 'Second',
      ],
      { timeoutMs: 1000 },
    );
    source.next(msg('Noise'));
    source.next(msg('First'));
    source.next(msg('Noise2'));
    source.next(msg('Second'));
    const got = await p;
    expect(got.map((m) => m.eventName)).toEqual([ 'First', 'Second' ]);
  });

  it('times out if sequence incomplete', async () => {
    const source = new Subject<GlobalBusMessage>();
    const p = waitForMessageSequence(
      source.asObservable(),
      [ (m) => m.eventName === 'Only' ],
      { timeoutMs: 30 },
    );
    await expect(p).rejects.toThrow(/timed out/);
  });
});

describe('collectMessages', () => {
  it('collects n messages with optional predicate', async () => {
    const source = new Subject<GlobalBusMessage>();
    const p = collectMessages(source.asObservable(), {
      count: 2,
      timeoutMs: 500,
      predicate: (m) => m.eventName === 'Keep',
    });
    source.next(msg('Skip'));
    source.next(msg('Keep'));
    source.next(msg('Skip2'));
    source.next(msg('Keep'));
    const got = await p;
    expect(got.length).toBe(2);
    expect(got.every((m) => m.eventName === 'Keep')).toBe(true);
  });
});

describe('waitForMessage async emissions', () => {
  it('waits for delayed message', async () => {
    const source = new Subject<GlobalBusMessage>();
    const p = waitForMessage(
      source.pipe(delay(10)),
      (m) => m.eventName === 'Late',
      { timeoutMs: 500 },
    );
    setTimeout(() => source.next(msg('Late')), 15);
    const got = await p;
    expect(got.eventName).toBe('Late');
  });
});
