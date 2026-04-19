import { PubSub, Subscription as GcpSubscription, Topic } from '@google-cloud/pubsub';
import { Observable, Subject } from 'rxjs';
import type { GlobalBusMessage, IConnectionOptions } from '../service';

/**
 * E2E helper: subscribes to an existing topic with a **dedicated** subscription name
 * (e.g. `e2e-${randomUUID()}`) and exposes incoming {@link GlobalBusMessage} values.
 * Use from Playwright/Jest Node context when the app runs in another process.
 */
export class PubSubGlobalBusListener {
  private pubSub: PubSub | undefined;
  private subscription: GcpSubscription | undefined;
  private closed = false;

  private readonly subject$ = new Subject<GlobalBusMessage>();

  /** Incoming messages (multicast). */
  public get messages$(): Observable<GlobalBusMessage> {
    return this.subject$.asObservable();
  }

  /**
   * Connects to Pub/Sub (or emulator) using the same shape as {@link PubSubService.connect}.
   * `subscriptionName` should be unique per test run when multiple tests share a topic.
   */
  public async connect(options: IConnectionOptions): Promise<void> {
    const { subscriptionName, topicName, projectId, apiEndpoint, port } = options;

    const pubSubOptions: { projectId: string; apiEndpoint?: string; port?: number } = {
      projectId,
    };
    if (apiEndpoint && port) {
      pubSubOptions.apiEndpoint = `${apiEndpoint}:${port}`;
    }
    if (port) {
      pubSubOptions.port = port;
    }

    this.pubSub = new PubSub(pubSubOptions);

    const topic = await this.getTopic(topicName);
    if (!topic) {
      throw new Error(`Topic was not found: ${topicName}`);
    }

    this.subscription = await this.getSubscription(topic, subscriptionName);

    this.subscription.on('error', () => {
      // Surface via messages$ is non-trivial; callers can add logging in tests if needed.
    });

    this.attachMessageHandler();
  }

  /**
   * Stops the subscription and completes the message stream.
   */
  public async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    try {
      await this.subscription?.close();
    } finally {
      this.subscription = undefined;
      this.pubSub = undefined;
      this.subject$.complete();
    }
  }

  private attachMessageHandler(): void {
    if (!this.subscription) {
      throw new Error('Subscription was not set');
    }

    this.subscription.on('message', (message) => {
      const json = JSON.parse(message.data.toString()) as GlobalBusMessage;
      this.subject$.next(json);
      message.ack();
    });
  }

  private async getTopic(name: string): Promise<Topic | undefined> {
    if (!this.pubSub) {
      throw new Error('Pub sub was not initiated');
    }

    const [ existingTopics ] = await this.pubSub.getTopics();

    return existingTopics.find(
      (topic: Topic) => topic.name.indexOf(name) !== -1,
    );
  }

  private async getSubscription(
    topic: Topic,
    subName: string,
  ): Promise<GcpSubscription> {
    if (!this.pubSub) {
      throw new Error('Pub sub was not initiated');
    }

    const [ existingSubs ] = await this.pubSub.getSubscriptions();

    let existingSub = existingSubs.find(
      (sub: GcpSubscription) => sub.name.indexOf(subName) !== -1,
    );

    if (!existingSub) {
      [ existingSub ] = await topic.createSubscription(subName, {});
    }

    return existingSub;
  }
}
