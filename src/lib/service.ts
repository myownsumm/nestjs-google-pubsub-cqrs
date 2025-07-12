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

  /**
   * Establishes connection to Google Pub/Sub and sets up topic and subscription.
   * 
   * @param options - Configuration options for the connection
   * @throws {Error} When topic is not found or connection fails
   */
  public async connect({
                         subscriptionName,
                         topicName,
                         projectId,
                         apiEndpoint,
                         port,
                       }: IConnectionOptions): Promise<void> {
    const options: PubSubOptions = { projectId };
    if (apiEndpoint && port) {
      options.apiEndpoint = `${ apiEndpoint }:${ port }`;
    }
    if (port) {
      options.port = port;
    }

    this.pubSub = new PubSub(options);

    this.topic = await this.getTopic(topicName);

    if (!this.topic) {
      throw new Error(`Topic was not found`);
    }

    this.subscription = await this.getSubscription(this.topic, subscriptionName);

    Logger.log(`Global Bus connection established - ${ subscriptionName }`);

    this.subscription.on('error', (error) => {
      Logger.error(`Error: ${ JSON.stringify(error) }`);
    });

    this.initRead();
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
