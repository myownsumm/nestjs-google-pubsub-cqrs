const { spawn } = require('child_process');
const { PubSub } = require("@google-cloud/pubsub");

/**
 * Polls the emulator with real Pub/Sub RPCs (not just a port check) until one
 * answers, or `maxWaitMs` elapses. A cold-started emulator process (e.g.
 * after the host machine has been asleep/idle, which slows the JVM's own
 * boot) can bind its TCP port well before it can actually serve gRPC calls —
 * a fixed sleep before `quickstart()` raced that window and could leave the
 * topic/subscription only partially created while the port already looked
 * "up" to anything checking it. Waiting for a real RPC to succeed removes
 * that race deterministically instead of guessing a fixed delay.
 */
async function waitForEmulatorReady(pubsub, { maxWaitMs = 60000, pollIntervalMs = 1000 } = {}) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < maxWaitMs) {
    try {
      await pubsub.getTopics();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  throw new Error(
    `Pub/Sub emulator did not start serving RPCs within ${ maxWaitMs }ms. ` +
    `Last error: ${ lastError ? lastError.message : 'unknown' }`,
  );
}

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

  console.log('⏳ Waiting for Pub/Sub emulator to actually serve RPCs...');
  await waitForEmulatorReady(pubsub);
  console.log('✅ Pub/Sub emulator is serving RPCs.');

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

  // Give the emulator process a moment to fork/bind before the first RPC
  // attempt; quickstart() itself bounds-polls for real readiness afterwards
  // (see waitForEmulatorReady), so this is just a cheap initial delay, not
  // the readiness gate.
  setTimeout(async () => {
    try {
      await quickstart();
    } catch (error) {
      console.error('Failed to initialize:', error);
      process.exit(1);
    }
  }, 1000);

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