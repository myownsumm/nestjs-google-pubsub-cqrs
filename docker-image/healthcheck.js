const { PubSub } = require('@google-cloud/pubsub');

/**
 * Protocol-aware Docker HEALTHCHECK for the Pub/Sub emulator image.
 *
 * The previous healthcheck (`netstat -tulpen | grep <port>`) only proved the
 * TCP port was open — it reported "healthy" even while the emulator process
 * was still starting up (JVM cold start) and no gRPC service was actually
 * being served yet, so a socket-open/non-serving state could pass as
 * healthy indefinitely. This performs a real Pub/Sub RPC (`getTopics`)
 * against the emulator's own port and only exits 0 if that RPC actually
 * answers within a short, bounded timeout.
 */
async function checkHealth() {
  const port = process.env.PUBSUB_EMULATOR_PORT || 8090;
  const projectId = process.env.PUBSUB_PROJECT_ID || 'integration-test-project';
  const timeoutMs = Number(process.env.PUBSUB_HEALTHCHECK_TIMEOUT_MS) || 3000;

  const pubsub = new PubSub({
    projectId,
    apiEndpoint: `0.0.0.0:${ port }`,
    port: Number(port),
  });

  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Health check RPC timed out after ${ timeoutMs }ms`)), timeoutMs);
  });

  await Promise.race([ pubsub.getTopics(), timeout ]);
}

checkHealth()
  .then(() => {
    console.log('✅ healthcheck: Pub/Sub emulator is serving RPCs');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ healthcheck: Pub/Sub emulator is not serving RPCs:', error.message);
    process.exit(1);
  });
