const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ciDir = __dirname;
const artifactsDir = path.join(__dirname, '../artifacts');

// Clean artifacts directory before running tests
console.log('🧹 Cleaning artifacts directory...');
if (fs.existsSync(artifactsDir)) {
  const files = fs.readdirSync(artifactsDir);
  for (const file of files) {
    if (file.endsWith('.log')) {
      fs.unlinkSync(path.join(artifactsDir, file));
      console.log(`🗑️  Deleted: ${file}`);
    }
  }
} else {
  fs.mkdirSync(artifactsDir, { recursive: true });
  console.log('📁 Created artifacts directory');
}

const testScripts = fs.readdirSync(ciDir)
  .filter(f => f.endsWith('.sh'));

let allPassed = true;

// Helper function to count occurrences of a string in text
function countOccurrences(text, searchString) {
  const regex = new RegExp(searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

// Helper function to check event (supports both string and object format)
function checkEvent(log, event, service, eventType) {
  if (typeof event === 'string') {
    // Old format: simple string
    if (!log.includes(event)) {
      console.error(`❌ [${service}] ${eventType} event not found: ${event}`);
      return false;
    } else {
      console.log(`✅ [${service}] ${eventType} event found: ${event}`);
      return true;
    }
  } else if (typeof event === 'object' && event.event && typeof event.count === 'number') {
    // New format: object with event name and expected count
    const actualCount = countOccurrences(log, event.event);
    if (actualCount < event.count) {
      console.error(`❌ [${service}] ${eventType} event count mismatch: expected ${event.count}, found ${actualCount} for ${event.event}`);
      return false;
    } else {
      console.log(`✅ [${service}] ${eventType} event count correct: ${actualCount}/${event.count} for ${event.event}`);
      return true;
    }
  } else {
    console.error(`❌ [${service}] Invalid event format: ${JSON.stringify(event)}`);
    return false;
  }
}

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
    // Wait for events to be processed and written to logs
    execSync('sleep 5');
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
    
    // Check published events
    for (const event of events.published || []) {
      if (!checkEvent(log, event, service, 'Published')) {
        testPassed = false;
      }
    }
    
    // Check received events
    for (const event of events.received || []) {
      if (!checkEvent(log, event, service, 'Received')) {
        testPassed = false;
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