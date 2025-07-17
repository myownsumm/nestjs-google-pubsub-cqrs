import { promises as fs } from 'fs';
import * as path from 'path';

export async function logArtifact(service: string, message: string) {
  // From compiled shared directory (e.g., dist/shared), go up to dist, then up to service, then up to integration-testing, then to artifacts
  // __dirname will be something like: /path/to/users-service/dist/shared
  // We need to get to: /path/to/integration-testing/artifacts
  const integrationTestingDir = path.resolve(__dirname, '../../../');
  const logDir = path.join(integrationTestingDir, 'artifacts');
  const logFile = path.join(logDir, `${service}.log`);
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  
  // Ensure the artifacts directory exists
  await fs.mkdir(logDir, { recursive: true });
  await fs.appendFile(logFile, line, { encoding: 'utf8' });
} 