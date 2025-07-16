import { promises as fs } from 'fs';
import * as path from 'path';

export async function logArtifact(service: string, message: string) {
  const logDir = path.resolve(__dirname, '../../artifacts');
  const logFile = path.join(logDir, `${service}.log`);
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  
  // Ensure the artifacts directory exists
  await fs.mkdir(logDir, { recursive: true });
  await fs.appendFile(logFile, line, { encoding: 'utf8' });
} 