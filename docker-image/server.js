const { spawn } = require('child_process');
const { PubSub } = require("@google-cloud/pubsub");

// Use the exact same logic as unov-gcloud/init.js
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

// Start the emulator and run quickstart
async function run() {
  const port = process.env.PUBSUB_EMULATOR_PORT || 8090;
  
  // Start emulator
  const emulatorProcess = spawn('/pubsub-emulator/bin/cloud-pubsub-emulator', [
    `--host=0.0.0.0`,
    `--port=${port}`
  ]);

  emulatorProcess.on('error', (error) => {
    console.error(`Failed to start emulator: ${error.message}`);
    process.exit(1);
  });

  // Wait a bit for emulator to start
  setTimeout(async () => {
    try {
      await quickstart();
    } catch (error) {
      console.error('Failed to initialize:', error);
      process.exit(1);
    }
  }, 5000);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    emulatorProcess.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    emulatorProcess.kill('SIGTERM');
    process.exit(0);
  });
}

run(); 