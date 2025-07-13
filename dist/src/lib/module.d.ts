import { DynamicModule, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common";
import { CommandBus, CqrsModule, EventBus, QueryBus } from "@nestjs/cqrs";
import { ExplorerService } from "@nestjs/cqrs/dist/services/explorer.service";
import { PubSubService } from "./service";
import { BaseEvent } from "./typings";
/**
 * Configuration options for the PubSubCqrsModule.
 * This interface defines the required parameters for connecting to Google Pub/Sub.
 */
interface DiPubSubModuleOptions {
    /** Name of the Google Pub/Sub subscription for this service */
    subscriptionName: string;
    /** Name of the Google Pub/Sub topic to publish/subscribe to */
    topicName: string;
    /** Google Cloud Project ID */
    projectId: string;
    /** API endpoint for Google Pub/Sub (useful for local development) */
    apiEndpoint: string;
    /** Port number for Google Pub/Sub (useful for local development) */
    port: number;
}
/**
 * NestJS module that integrates Google Pub/Sub with NestJS CQRS.
 * This module replaces the default CqrsModule and provides event bus functionality
 * powered by Google Cloud Pub/Sub for distributed microservices communication.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     PubSubCqrsModule.forRoot({
 *       subscriptionName: 'my-service-subscription',
 *       topicName: 'my-events-topic',
 *       projectId: 'my-gcp-project'
 *     })
 *   ]
 * })
 * export class AppModule {}
 * ```
 */
export declare class PubSubCqrsModule extends CqrsModule<BaseEvent> implements OnApplicationBootstrap, OnModuleInit {
    private readonly pubSubService;
    private options;
    protected eventBusChild: EventBus<BaseEvent>;
    /**
     * Configures the module with static options.
     *
     * @param options - Configuration options for Google Pub/Sub connection
     * @returns DynamicModule configuration
     */
    static forRoot(options?: DiPubSubModuleOptions): DynamicModule;
    /**
     * Configures the module with dynamic options using factories.
     * Useful for injecting configuration from ConfigService or other providers.
     *
     * @param optionsProvider - Provider configuration for dynamic options
     * @returns DynamicModule configuration
     */
    static forRootAsync(optionsProvider: any): DynamicModule;
    private readonly eventNamesToClasses;
    constructor(explorerService: ExplorerService, commandBus: CommandBus, queryBus: QueryBus, eventBus: EventBus<BaseEvent>, pubSubService: PubSubService, options: DiPubSubModuleOptions);
    onModuleInit(): Promise<void>;
    onApplicationBootstrap(): Promise<void>;
    private mapEventNamesToClasses;
    private setOnGlobalBusRead;
    private setOnLocalBusRead;
}
export {};
