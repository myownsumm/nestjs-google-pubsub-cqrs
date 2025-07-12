"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PubSubService = void 0;
const common_1 = require("@nestjs/common");
const pubsub_1 = require("@google-cloud/pubsub");
const rxjs_1 = require("rxjs");
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
let PubSubService = class PubSubService {
    constructor() {
        this.subject$ = new rxjs_1.Subject();
    }
    /**
     * Establishes connection to Google Pub/Sub and sets up topic and subscription.
     *
     * @param options - Configuration options for the connection
     * @throws {Error} When topic is not found or connection fails
     */
    async connect({ subscriptionName, topicName, projectId, apiEndpoint, port, }) {
        const options = { projectId };
        if (apiEndpoint && port) {
            options.apiEndpoint = `${apiEndpoint}:${port}`;
        }
        if (port) {
            options.port = port;
        }
        this.pubSub = new pubsub_1.PubSub(options);
        this.topic = await this.getTopic(topicName);
        if (!this.topic) {
            throw new Error(`Topic was not found`);
        }
        this.subscription = await this.getSubscription(this.topic, subscriptionName);
        common_1.Logger.log(`Global Bus connection established - ${subscriptionName}`);
        this.subscription.on('error', (error) => {
            common_1.Logger.error(`Error: ${JSON.stringify(error)}`);
        });
        this.initRead();
    }
    /**
     * Returns an Observable stream of incoming messages from Google Pub/Sub.
     *
     * @returns Observable stream of GlobalBusMessage events
     */
    read$() {
        return this.subject$;
    }
    /**
     * Publishes a message to the Google Pub/Sub topic.
     *
     * @param json - The message to publish
     * @throws {Error} When topic is not configured
     */
    async write(json) {
        if (!this.topic) {
            throw new Error('Subscription was not set');
        }
        await this.topic.publishMessage({ json });
    }
    initRead() {
        if (!this.subscription) {
            throw new Error('Subscription was not set');
        }
        this.subscription.on('message', (message) => {
            const json = JSON.parse(message.data.toString());
            this.subject$.next(json);
            message.ack();
        });
    }
    async getTopic(name) {
        if (!this.pubSub) {
            throw new Error(`Pub sub was not initiated`);
        }
        const [existingTopics] = await this.pubSub.getTopics();
        return existingTopics.find((topic) => topic.name.indexOf(name) !== -1);
    }
    async getSubscription(topic, subName) {
        if (!this.pubSub) {
            throw new Error(`Pub sub was not initiated`);
        }
        const [existingSubs] = await this.pubSub.getSubscriptions();
        let existingSub = existingSubs.find((sub) => sub.name.indexOf(subName) !== -1);
        if (!existingSub) {
            [existingSub] = await topic.createSubscription(subName, {
            // TODO. check if it is needed
            //  enableMessageOrdering: true,
            });
        }
        return existingSub;
    }
};
exports.PubSubService = PubSubService;
exports.PubSubService = PubSubService = __decorate([
    (0, common_1.Injectable)()
], PubSubService);
