import { Injectable, Logger } from '@nestjs/common';
import { PubSub, Subscription, Topic } from '@google-cloud/pubsub';
import { Observable, Subject } from 'rxjs';


/**
 * Message format used internally for Google Pub/Sub communication.
 * This represents the structure of messages sent between services.
 */
export interface GlobalBusMessage {
  /** The name of the event class */
  eventName: string;
  /** The serialized event payload */
  eventBody: object;
  /** Identifier of the service that published the event */
  eventInitiator: string;
}

/**
 * Configuration options for connecting to Google Pub/Sub.
 *
 * @example
 * ```typescript
 * const options: IConnectionOptions = {
 *   subscriptionName: 'my-service-subscription',
 *   topicName: 'my-events-topic',
 *   projectId: 'my-gcp-project'
 * };
 * ```
 */
export interface IConnectionOptions {
  /** Name of the Google Pub/Sub subscription for this service */
  subscriptionName: string;
  /** Name of the Google Pub/Sub topic to publish/subscribe to */
  topicName: string;
  /** Google Cloud Project ID */
  projectId: string;
  /** Optional API endpoint (useful for local development with emulator) */
  apiEndpoint?: string;
  /** Optional port number (useful for local development with emulator) */
  port?: number;
  /**
   * Maximum time (ms) to wait for a single Pub/Sub RPC (e.g. `getTopics`,
   * `getSubscriptions`) before treating it as timed out. Prevents a single
   * attempt from silently consuming the underlying gRPC client's own
   * (much longer) internal deadline.
   *
   * @default 5000
   */
  connectionTimeoutMs?: number;
  /**
   * Maximum number of connection attempts (the initial attempt plus this
   * many retries) before `connect()` gives up and throws a classified error.
   *
   * @default 3
   */
  maxConnectionAttempts?: number;
  /**
   * Base delay (ms) between connection attempts. Grows linearly with the
   * attempt number (attempt 1 waits this long, attempt 2 waits double, etc).
   *
   * @default 1000
   */
  retryDelayMs?: number;
}

/**
 * Identifies why `PubSubService.connect` failed, so callers (and their
 * process supervisors/logs) can react without parsing an error message.
 */
export enum PubSubConnectionFailureReason {
  /** Every attempt's RPC exceeded `connectionTimeoutMs` without answering. */
  TIMEOUT = 'TIMEOUT',
  /** The RPC answered, but with an error other than a bare timeout. */
  RPC_ERROR = 'RPC_ERROR',
}

/**
 * Thrown by `PubSubService.connect` when Pub/Sub could not be reached within
 * the configured bounded retry budget. Replaces silently waiting out the
 * underlying gRPC client's own (typically ~60s) deadline with a fast,
 * classified failure.
 */
export class PubSubConnectionError extends Error {
  constructor(
    message: string,
    public readonly reason: PubSubConnectionFailureReason,
    public readonly attempts: number,
    public readonly elapsedMs: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PubSubConnectionError';
  }
}

/**
 * Internal marker for a single RPC attempt exceeding its bounded timeout.
 * Never escapes `connect()` directly — it is always translated into a
 * {@link PubSubConnectionError} with reason `TIMEOUT`.
 */
class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Internal interface for Google Cloud Pub/Sub client options.
 * Used to configure the @google-cloud/pubsub client.
 */
interface PubSubOptions {
  projectId: string;
  apiEndpoint?: string;
  port?: number;
}


/**
 * Service for managing Google Pub/Sub connections and message handling.
 * This service handles the low-level communication with Google Cloud Pub/Sub.
 * 
 * @example
 * ```typescript
 * const pubSubService = new PubSubService();
 * await pubSubService.connect({
 *   subscriptionName: 'my-subscription',
 *   topicName: 'my-topic',
 *   projectId: 'my-project'
 * });
 * ```
 */
@Injectable()
export class PubSubService {
  private pubSub: PubSub | undefined;
  private topic: Topic | undefined;
  private subscription: Subscription | undefined;

  private subject$: Subject<GlobalBusMessage> = new Subject();

  private static readonly DEFAULT_CONNECTION_TIMEOUT_MS = 5000;
  private static readonly DEFAULT_MAX_CONNECTION_ATTEMPTS = 3;
  private static readonly DEFAULT_RETRY_DELAY_MS = 1000;

  /**
   * Establishes connection to Google Pub/Sub and sets up topic and subscription.
   *
   * Every Pub/Sub RPC involved (`getTopics`, `getSubscriptions`, subscription
   * creation) is bounded by `connectionTimeoutMs` and retried up to
   * `maxConnectionAttempts` times. A backend that accepts the TCP/gRPC
   * connection but never actually serves RPCs (e.g. an emulator whose port is
   * open but whose process is not yet ready) fails fast and with a classified
   * {@link PubSubConnectionError} instead of silently consuming the
   * underlying gRPC client's own much longer internal deadline.
   *
   * @param options - Configuration options for the connection
   * @throws {PubSubConnectionError} When Pub/Sub is not reachable within the
   *   bounded retry budget
   */
  public async connect({
                         subscriptionName,
                         topicName,
                         projectId,
                         apiEndpoint,
                         port,
                         connectionTimeoutMs = PubSubService.DEFAULT_CONNECTION_TIMEOUT_MS,
                         maxConnectionAttempts = PubSubService.DEFAULT_MAX_CONNECTION_ATTEMPTS,
                         retryDelayMs = PubSubService.DEFAULT_RETRY_DELAY_MS,
                       }: IConnectionOptions): Promise<void> {
    console.log('🔗 PubSubService: Starting connection...');
    console.log('Connection options:', { subscriptionName, topicName, projectId, apiEndpoint, port });

    const options: PubSubOptions = { projectId };
    if (apiEndpoint && port) {
      options.apiEndpoint = `${ apiEndpoint }:${ port }`;
      console.log('Using explicit apiEndpoint:', options.apiEndpoint);
    }
    if (port) {
      options.port = port;
      console.log('Using explicit port:', options.port);
    }

    console.log('Creating PubSub client with options:', options);
    this.pubSub = new PubSub(options);

    const startedAt = Date.now();
    let lastFailure: { reason: PubSubConnectionFailureReason; cause: unknown } | undefined;

    for (let attempt = 1; attempt <= maxConnectionAttempts; attempt++) {
      try {
        console.log(`Getting topic (attempt ${ attempt }/${ maxConnectionAttempts }):`, topicName);
        this.topic = await this.withTimeout(
          this.getTopic(topicName),
          connectionTimeoutMs,
        );

        if (!this.topic) {
          throw new Error('Topic was not found');
        }
        console.log('✅ Topic found:', this.topic.name);

        console.log(`Getting subscription (attempt ${ attempt }/${ maxConnectionAttempts }):`, subscriptionName);
        this.subscription = await this.withTimeout(
          this.getSubscription(this.topic, subscriptionName),
          connectionTimeoutMs,
        );
        console.log('✅ Subscription ready:', this.subscription.name);

        Logger.log(`Global Bus connection established - ${ subscriptionName }`);

        this.subscription.on('error', (error) => {
          Logger.error(`Error: ${ JSON.stringify(error) }`);
        });

        this.initRead();
        console.log('✅ PubSubService: Connection complete');
        return;
      } catch (error: unknown) {
        const reason = error instanceof TimeoutError
          ? PubSubConnectionFailureReason.TIMEOUT
          : PubSubConnectionFailureReason.RPC_ERROR;
        lastFailure = { reason, cause: error };

        console.error(
          `❌ PubSubService: connection attempt ${ attempt }/${ maxConnectionAttempts } failed (${ reason }):`,
          error,
        );

        if (attempt < maxConnectionAttempts) {
          await this.delay(retryDelayMs * attempt);
        }
      }
    }

    const elapsedMs = Date.now() - startedAt;
    const reason = lastFailure?.reason ?? PubSubConnectionFailureReason.RPC_ERROR;
    const connectionError = new PubSubConnectionError(
      `Pub/Sub connection failed after ${ maxConnectionAttempts } attempt(s) over ${ elapsedMs }ms ` +
      `(${ reason }). The backend at ${ options.apiEndpoint ?? 'the configured project' } accepted a ` +
      `connection but never served a valid Pub/Sub RPC. Verify the emulator/service is actually serving, ` +
      `not just listening on its port.`,
      reason,
      maxConnectionAttempts,
      elapsedMs,
      lastFailure?.cause,
    );

    Logger.error(connectionError.message);

    // A failed PubSub client still holds its gRPC channel open, which keeps
    // the Node event loop alive — a process that exits on bootstrap failure
    // (the whole point of failing fast) would otherwise still hang. Release
    // it before throwing; a close() failure here must never mask the real
    // connection error.
    try {
      await this.pubSub?.close();
    } catch (closeError) {
      Logger.error(`Failed to close Pub/Sub client after connection failure: ${ closeError }`);
    }

    throw connectionError;
  }

  /**
   * Races `promise` against a timer. Rejects with {@link TimeoutError} if
   * `promise` has not settled within `timeoutMs`.
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(`Operation timed out after ${ timeoutMs }ms`));
      }, timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error: unknown) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Returns an Observable stream of incoming messages from Google Pub/Sub.
   * 
   * @returns Observable stream of GlobalBusMessage events
   */
  public read$(): Observable<GlobalBusMessage> {
    return this.subject$;
  }

  /**
   * Publishes a message to the Google Pub/Sub topic.
   * 
   * @param json - The message to publish
   * @throws {Error} When topic is not configured
   */
  public async write(json: GlobalBusMessage): Promise<void> {
    if (!this.topic) {
      throw new Error('Subscription was not set');
    }

    await this.topic.publishMessage({ json });
  }

  private initRead(): void {
    if (!this.subscription) {
      throw new Error('Subscription was not set');
    }

    this.subscription.on('message', (message) => {
      const json = JSON.parse(message.data.toString());
      this.subject$.next(json);

      message.ack();
    });
  }

  private async getTopic(name: string): Promise<Topic | undefined> {
    if (!this.pubSub) {
      throw new Error(`Pub sub was not initiated`);
    }

    const [ existingTopics ] = await this.pubSub.getTopics();

    return existingTopics.find(
      (topic: Topic) => topic.name.indexOf(name) !== -1,
    );
  }

  private async getSubscription(
    topic: Topic,
    subName: string,
  ): Promise<Subscription> {
    if (!this.pubSub) {
      throw new Error(`Pub sub was not initiated`);
    }

    const [ existingSubs ] = await this.pubSub.getSubscriptions();

    let existingSub = existingSubs.find(
      (sub: Subscription) => sub.name.indexOf(subName) !== -1,
    );

    if (!existingSub) {
      [ existingSub ] = await topic.createSubscription(subName, {
        // TODO. check if it is needed
        //  enableMessageOrdering: true,
      });
    }

    return existingSub;
  }
}
