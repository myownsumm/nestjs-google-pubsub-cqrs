import {
  DynamicModule,
  Global,
  Inject,
  Module,
  OnApplicationBootstrap,
  OnModuleInit,
} from "@nestjs/common";
import {
  CommandBus,
  CqrsModule,
  EventBus,
  EventPublisher,
  IEventHandler,
  QueryBus,
  CqrsModuleOptions,
} from "@nestjs/cqrs";
import { ExplorerService } from "@nestjs/cqrs/dist/services/explorer.service";
import { PubSubService } from "./service";
import { classToPlain, plainToClass } from "class-transformer";
import { EVENTS_HANDLER_METADATA } from "@nestjs/cqrs/dist/decorators/constants";
import { filter, map, tap } from "rxjs";
import { BaseEvent, PubSubEvent } from "./typings";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";

/**
 * Configuration options for the PubSubCqrsModule.
 * This interface defines the required parameters for connecting to Google Pub/Sub.
 */
interface DiPubSubModuleOptions extends CqrsModuleOptions {
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
@Global()
@Module({
  imports: [CqrsModule],
  exports: [CommandBus, QueryBus, EventBus, EventPublisher],
  providers: [
    CommandBus,
    QueryBus,
    EventBus,
    ExplorerService,
    EventPublisher,
    PubSubService,
  ],
})
export class PubSubCqrsModule
  extends CqrsModule<BaseEvent>
  implements OnApplicationBootstrap, OnModuleInit
{
  protected eventBusChild: EventBus<BaseEvent>;

  /**
   * Configures the module with static options.
   *
   * @param options - Configuration options for Google Pub/Sub connection
   * @returns DynamicModule configuration
   */
  static override forRoot(options?: DiPubSubModuleOptions): DynamicModule {
    return {
      module: PubSubCqrsModule,
      providers: [
        {
          provide: "OPTIONS",
          useValue: options || {},
        },
      ],
    };
  }

  /**
   * Configures the module with dynamic options using factories.
   * Useful for injecting configuration from ConfigService or other providers.
   *
   * @param optionsProvider - Provider configuration for dynamic options
   * @returns DynamicModule configuration
   */
  // TODO. Specify types https://github.com/u-cat-org/u-novelist/issues/81
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static forRootAsync(optionsProvider: any): DynamicModule {
    return {
      module: PubSubCqrsModule,
      imports: [],
      providers: [
        {
          provide: "OPTIONS",
          ...optionsProvider,
        },
      ],
    };
  }

  private readonly eventNamesToClasses = new Map<string, BaseEvent>();

  constructor(
    explorerService: ExplorerService,
    commandBus: CommandBus,
    queryBus: QueryBus,
    eventBus: EventBus<BaseEvent>,
    private readonly pubSubService: PubSubService,
    @Inject("OPTIONS") private options: DiPubSubModuleOptions
  ) {
    super(explorerService, eventBus, commandBus, queryBus);
    this.eventBusChild = eventBus;
  }

  async onModuleInit(): Promise<void> {
    await this.pubSubService.connect(this.options);
  }

  override async onApplicationBootstrap(): Promise<void> {
    super.onApplicationBootstrap();

    this.mapEventNamesToClasses();

    this.setOnGlobalBusRead();
    this.setOnLocalBusRead();
  }

  private mapEventNamesToClasses(): void {
    // TODO. get service in a proper way
    const { events } = this["explorerService"].explore();

    events.forEach((handler: InstanceWrapper<IEventHandler>) => {
      // If handler is an InstanceWrapper, get the class from .metatype or .token
      const target = handler.metatype || handler.token || handler;

      const metadata = Reflect.getMetadata(EVENTS_HANDLER_METADATA, target);

      if (!metadata || (Array.isArray(metadata) && metadata.length === 0)) {
        // no metadata for handler
        return;
      }

      // Handle both array and single-value metadata
      const constructor = Array.isArray(metadata) ? metadata[0] : metadata;

      if (constructor) {
        this.eventNamesToClasses.set(constructor.name, constructor);
      }
    });
  }

  private setOnGlobalBusRead(): void {
    this.pubSubService
      .read$()
      .pipe(
        // Do not listen to Messages dispatched by current MS itself, they were already handled
        // TODO. Could this be moved into PubSubService filtering mechanism?
        filter(
          (message) => message.eventInitiator !== this.options.subscriptionName
        ),
        map((message) => {
          const classInstance = this.eventNamesToClasses.get(message.eventName);

          const newClass = plainToClass(
            // TODO. Specify types https://github.com/u-cat-org/u-novelist/issues/81
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            classInstance as any,
            message.eventBody
          ) as BaseEvent;

          // Attach initiator data to Event class to filter in inside setOnLocalBusRead()
          // Cast to PubSubEvent to add the _eventInitiator field
          const pubSubEvent = newClass as PubSubEvent;
          pubSubEvent._eventInitiator = message.eventInitiator;

          this.eventBusChild.publish(pubSubEvent);
        })
      )
      .subscribe();
  }

  private setOnLocalBusRead(): void {
    this.eventBusChild.subject$
      .pipe(
        // listen only to Events dispatched by the Models and Commands itself
        // Filter out events that have _eventInitiator (these came from Pub/Sub)
        filter(
          (event: BaseEvent | PubSubEvent) =>
            !("_eventInitiator" in event) ||
            !(event as PubSubEvent)._eventInitiator
        ),
        tap((event: BaseEvent) => {
          this.pubSubService.write({
            eventBody: classToPlain(event),
            eventName: event.constructor.name,
            eventInitiator: this.options.subscriptionName,
          });
        })
      )
      .subscribe();
  }
}
