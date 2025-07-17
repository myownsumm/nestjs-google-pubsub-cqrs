const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ciDir = __dirname;
const artifactsDir = path.join(__dirname, '../artifacts');

const testScripts = fs.readdirSync(ciDir)
  .filter(f => f.endsWith('.sh'));

let allPassed = true;

for (const script of testScripts) {
  const base = script.replace(/\.sh$/, '');
  const configFile = path.join(ciDir, `${base}.events.json`);
  if (!fs.existsSync(configFile)) {
    console.warn(`⚠️  No config for ${script}, skipping`);
    continue;
  }
  console.log(`\n=== Running test: ${script} ===`);
  try {
    execSync(`bash ${path.join(ciDir, script)}`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`❌ Script ${script} failed to execute`);
    allPassed = false;
    continue;
  }
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  let testPassed = true;
  for (const [service, events] of Object.entries(config)) {
    const logFile = path.join(artifactsDir, `${service}.log`);
    const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
    for (const event of events.published || []) {
      if (!log.includes(event)) {
        console.error(`❌ [${service}] Published event not found: ${event}`);
        testPassed = false;
      } else {
        console.log(`✅ [${service}] Published event found: ${event}`);
      }
    }
    for (const event of events.received || []) {
      if (!log.includes(event)) {
        console.error(`❌ [${service}] Received event not found: ${event}`);
        testPassed = false;
      } else {
        console.log(`✅ [${service}] Received event found: ${event}`);
      }
    }
  }
  if (testPassed) {
    console.log(`✅ Test ${base} passed`);
  } else {
    console.error(`❌ Test ${base} failed`);
    allPassed = false;
  }
}

process.exit(allPassed ? 0 : 1); 