"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UnovPubSubCqrsModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnovPubSubCqrsModule = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const explorer_service_1 = require("@nestjs/cqrs/dist/services/explorer.service");
const service_1 = require("./service");
const class_transformer_1 = require("class-transformer");
const constants_1 = require("@nestjs/cqrs/dist/decorators/constants");
const rxjs_1 = require("rxjs");
/**
 * NestJS module that integrates Google Pub/Sub with NestJS CQRS.
 * This module replaces the default CqrsModule and provides event bus functionality
 * powered by Google Cloud Pub/Sub for distributed microservices communication.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     UnovPubSubCqrsModule.forRoot({
 *       subscriptionName: 'my-service-subscription',
 *       topicName: 'my-events-topic',
 *       projectId: 'my-gcp-project'
 *     })
 *   ]
 * })
 * export class AppModule {}
 * ```
 */
let UnovPubSubCqrsModule = UnovPubSubCqrsModule_1 = class UnovPubSubCqrsModule extends cqrs_1.CqrsModule {
    /**
     * Configures the module with static options.
     *
     * @param options - Configuration options for Google Pub/Sub connection
     * @returns DynamicModule configuration
     */
    static forRoot(options) {
        return {
            module: UnovPubSubCqrsModule_1,
            providers: [
                {
                    provide: 'OPTIONS',
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
    static forRootAsync(optionsProvider) {
        return {
            module: UnovPubSubCqrsModule_1,
            imports: [],
            providers: [
                {
                    provide: 'OPTIONS',
                    ...optionsProvider,
                },
            ],
        };
    }
    constructor(explorerService, commandBus, queryBus, eventBus, pubSubService, options) {
        super(explorerService, eventBus, commandBus, queryBus);
        this.pubSubService = pubSubService;
        this.options = options;
        this.eventNamesToClasses = new Map();
        this.eventBusChild = eventBus;
    }
    async onModuleInit() {
        await this.pubSubService.connect(this.options);
    }
    async onApplicationBootstrap() {
        super.onApplicationBootstrap();
        this.mapEventNamesToClasses();
        this.setOnGlobalBusRead();
        this.setOnLocalBusRead();
    }
    mapEventNamesToClasses() {
        // TODO. get service in a proper way
        const { events } = this['explorerService'].explore();
        events.forEach((handler) => {
            const [constructor] = Reflect.getMetadata(constants_1.EVENTS_HANDLER_METADATA, handler);
            this.eventNamesToClasses.set(constructor.name, constructor);
        });
    }
    setOnGlobalBusRead() {
        this.pubSubService
            .read$()
            .pipe(
        // Do not listen to Messages dispatched by current MS itself, they were already handled
        // TODO. Could this be moved into PubSubService filtering mechanism?
        (0, rxjs_1.filter)((message) => message.eventInitiator !== this.options.subscriptionName), (0, rxjs_1.map)((message) => {
            const classInstance = this.eventNamesToClasses.get(message.eventName);
            const newClass = (0, class_transformer_1.plainToClass)(
            // TODO. Specify types https://github.com/u-cat-org/u-novelist/issues/81
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            classInstance, message.eventBody);
            // Attach initiator data to Event class to filter in inside setOnLocalBusRead()
            // Cast to PubSubEvent to add the _eventInitiator field
            const pubSubEvent = newClass;
            pubSubEvent._eventInitiator = message.eventInitiator;
            this.eventBusChild.publish(pubSubEvent);
        }))
            .subscribe();
    }
    setOnLocalBusRead() {
        this.eventBusChild.subject$
            .pipe(
        // listen only to Events dispatched by the Models and Commands itself
        // Filter out events that have _eventInitiator (these came from Pub/Sub)
        (0, rxjs_1.filter)((event) => !('_eventInitiator' in event) || !event._eventInitiator), (0, rxjs_1.tap)((event) => {
            this.pubSubService.write({
                eventBody: (0, class_transformer_1.classToPlain)(event),
                eventName: event.constructor.name,
                eventInitiator: this.options.subscriptionName,
            });
        }))
            .subscribe();
    }
};
exports.UnovPubSubCqrsModule = UnovPubSubCqrsModule;
exports.UnovPubSubCqrsModule = UnovPubSubCqrsModule = UnovPubSubCqrsModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [cqrs_1.CqrsModule],
        exports: [cqrs_1.CommandBus, cqrs_1.QueryBus, cqrs_1.EventBus, cqrs_1.EventPublisher],
        providers: [
            cqrs_1.CommandBus,
            cqrs_1.QueryBus,
            cqrs_1.EventBus,
            explorer_service_1.ExplorerService,
            cqrs_1.EventPublisher,
            service_1.PubSubService,
        ],
    }),
    __param(5, (0, common_1.Inject)('OPTIONS')),
    __metadata("design:paramtypes", [explorer_service_1.ExplorerService,
        cqrs_1.CommandBus,
        cqrs_1.QueryBus,
        cqrs_1.EventBus,
        service_1.PubSubService, Object])
], UnovPubSubCqrsModule);
