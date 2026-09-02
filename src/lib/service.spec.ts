import { Test, TestingModule } from '@nestjs/testing';
import { PubSubService, GlobalBusMessage, PubSubConnectionError, PubSubConnectionFailureReason } from './service';
import { PubSub, Topic, Subscription } from '@google-cloud/pubsub';
import { Subject } from 'rxjs';


jest.mock('@google-cloud/pubsub');
jest.mock('rxjs');

describe('PubSubService', () => {
  let service: PubSubService;
  let pubSubMock: jest.Mocked<PubSub>;
  let topicMock: jest.Mocked<Topic>;
  let subscriptionMock: jest.Mocked<Subscription>;
  let subjectMock: jest.Mocked<Subject<GlobalBusMessage>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ PubSubService ],
    }).compile();

    service = module.get<PubSubService>(PubSubService);

    pubSubMock = new PubSub() as jest.Mocked<PubSub>;
    topicMock = {
      publishMessage: jest.fn(),
    } as unknown as jest.Mocked<Topic>;
    subscriptionMock = {
      on: jest.fn(),
    } as unknown as jest.Mocked<Subscription>;
    subjectMock = new Subject<GlobalBusMessage>() as jest.Mocked<Subject<GlobalBusMessage>>;

    (PubSub as unknown as jest.Mock).mockImplementation(() => pubSubMock);
    // TODO. Specify types https://github.com/u-cat-org/u-novelist/issues/81
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).pubSub = pubSubMock;
    // TODO. Specify types https://github.com/u-cat-org/u-novelist/issues/81
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).topic = topicMock;
    // TODO. Specify types https://github.com/u-cat-org/u-novelist/issues/81
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).subscription = subscriptionMock;
    // TODO. Specify types https://github.com/u-cat-org/u-novelist/issues/81
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).subject$ = subjectMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('connect', () => {
    it('should initialize pubSub, topic, and subscription', async () => {
      const subName = 'test-sub';
      // TODO. Specify types https://github.com/u-cat-org/u-novelist/issues/81
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getTopicSpy = jest.spyOn(service as any, 'getTopic').mockResolvedValue(topicMock);
      // TODO. Specify types https://github.com/u-cat-org/u-novelist/issues/81
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getSubscriptionSpy = jest.spyOn(service as any, 'getSubscription').mockResolvedValue(subscriptionMock);

      await service.connect({ subscriptionName: subName, topicName: 'test-topic', projectId: 'test-project' });

      expect(pubSubMock).toBeDefined();
      expect(getTopicSpy).toHaveBeenCalled();
      expect(getSubscriptionSpy).toHaveBeenCalledWith(topicMock, subName);
      expect(subscriptionMock.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('retries and succeeds if an early attempt fails', async () => {
      const subName = 'test-sub';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getTopicSpy = jest.spyOn(service as any, 'getTopic')
        .mockRejectedValueOnce(new Error('backend not serving yet'))
        .mockResolvedValueOnce(topicMock);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, 'getSubscription').mockResolvedValue(subscriptionMock);

      await service.connect({
        subscriptionName: subName,
        topicName: 'test-topic',
        projectId: 'test-project',
        retryDelayMs: 1,
      });

      expect(getTopicSpy).toHaveBeenCalledTimes(2);
    });

    it('throws a classified PubSubConnectionError after exhausting retries', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, 'getTopic').mockRejectedValue(new Error('backend not serving'));

      await expect(
        service.connect({
          subscriptionName: 'test-sub',
          topicName: 'test-topic',
          projectId: 'test-project',
          maxConnectionAttempts: 2,
          retryDelayMs: 1,
        }),
      ).rejects.toMatchObject({
        name: 'PubSubConnectionError',
        reason: PubSubConnectionFailureReason.RPC_ERROR,
        attempts: 2,
      });
    });

    it('classifies a timed-out RPC as TIMEOUT, not a generic RPC error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, 'getTopic').mockImplementation(
        () => new Promise(() => { /* never resolves — simulates a wedged RPC */ }),
      );

      const connectPromise = service.connect({
        subscriptionName: 'test-sub',
        topicName: 'test-topic',
        projectId: 'test-project',
        connectionTimeoutMs: 5,
        maxConnectionAttempts: 1,
        retryDelayMs: 1,
      });

      await expect(connectPromise).rejects.toBeInstanceOf(PubSubConnectionError);
      await expect(connectPromise).rejects.toMatchObject({
        reason: PubSubConnectionFailureReason.TIMEOUT,
      });
    });
  });

  describe('read$', () => {
    it('should return an observable', () => {
      const result = service.read$();
      expect(result).toBe(subjectMock);
    });
  });

  describe('write', () => {
    it('should publish a message to the topic', async () => {
      const message: GlobalBusMessage = {
        eventName: 'testEvent',
        eventBody: {},
        eventInitiator: 'testInitiator',
      };

      await service.write(message);

      expect(topicMock.publishMessage).toHaveBeenCalledWith({ json: message });
    });
  });

  // describe('initRead', () => {
  //   it('should set up message listener on subscription', () => {
  //     const messageHandler = jest.fn();
  //     subscriptionMock.on.mockImplementation((event, handler) => {
  //       if (event === 'message') {
  //         messageHandler.mockImplementation(handler);
  //       }
  //     });
  //
  //     (service as any).initRead();
  //
  //     expect(subscriptionMock.on).toHaveBeenCalledWith('message', expect.any(Function));
  //   });
  // });

  // describe('getTopic', () => {
  //   it('should return the correct topic', async () => {
  //     const existingTopics = [{ name: `projects/unov/topics/${EVENT_BUS_TOPIC_NAME}` }] as Topic[];
  //     pubSubMock.getTopics.mockResolvedValue([existingTopics]);
  //
  //     const result = await (service as any).getTopic();
  //
  //     expect(result).toBe(existingTopics[0]);
  //   });
  // });

  // describe('getSubscription', () => {
  //   it('should return the correct subscription', async () => {
  //     const subName = 'test-sub';
  //     const existingSubs = [{ name: `projects/unov/subscriptions/${subName}` }] as Subscription[];
  //     pubSubMock.getSubscriptions.mockResolvedValue([existingSubs]);
  //
  //     const result = await (service as any).getSubscription(topicMock, subName);
  //
  //     expect(result).toBe(existingSubs[0]);
  //   });
  // });
});
