const { PubSub } = require("@google-cloud/pubsub");

async function quickstart() {
  const projectId = process.env.PUBSUB_PROJECT_ID || "integration-test-project";
  const topicNameOrId = process.env.PUBSUB_TOPIC || "integration-events-topic";
  const subscriptionName =
    process.env.PUBSUB_SUBSCRIPTION || "event-bus-monitoring-sub";
  const port = process.env.PUBSUB_EMULATOR_PORT || 8090;

  // Instantiates a client
  const pubsub = new PubSub({
    projectId,
    apiEndpoint: `http://0.0.0.0:${port}`,
    port: Number(port),
  });

  // Creates a new topic (if not exists)
  let topic;
  try {
    [topic] = await pubsub.createTopic(topicNameOrId);
    console.log(`Topic ${topic.name} created.`);
  } catch (e) {
    if (e.code === 6) {
      // Already exists
      topic = pubsub.topic(topicNameOrId);
      console.log(`Topic ${topicNameOrId} already exists.`);
    } else {
      throw e;
    }
  }

  // Creates a new subscription (if not exists)
  let existingSub;
  try {
    [existingSub] = await topic.createSubscription(subscriptionName);
    console.log(`Subscription ${subscriptionName} created.`);
  } catch (e) {
    if (e.code === 6) {
      // Already exists
      existingSub = topic.subscription(subscriptionName);
      console.log(`Subscription ${subscriptionName} already exists.`);
    } else {
      throw e;
    }
  }

  existingSub.on("message", (message) => {
    console.log(`${new Date()} - Global Bus message:`, message.data.toString());
    message.ack();
  });
}

module.exports.run = quickstart;
