import { Observable } from 'rxjs';
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
export declare class PubSubService {
    private pubSub;
    private topic;
    private subscription;
    private subject$;
    /**
     * Establishes connection to Google Pub/Sub and sets up topic and subscription.
     *
     * @param options - Configuration options for the connection
     * @throws {Error} When topic is not found or connection fails
     */
    connect({ subscriptionName, topicName, projectId, apiEndpoint, port, }: IConnectionOptions): Promise<void>;
    /**
     * Returns an Observable stream of incoming messages from Google Pub/Sub.
     *
     * @returns Observable stream of GlobalBusMessage events
     */
    read$(): Observable<GlobalBusMessage>;
    /**
     * Publishes a message to the Google Pub/Sub topic.
     *
     * @param json - The message to publish
     * @throws {Error} When topic is not configured
     */
    write(json: GlobalBusMessage): Promise<void>;
    private initRead;
    private getTopic;
    private getSubscription;
}
