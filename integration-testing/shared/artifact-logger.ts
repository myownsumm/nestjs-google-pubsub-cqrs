import { promises as fs } from 'fs';
import * as path from 'path';

export async function logArtifact(service: string, message: string) {
  const logDir = path.resolve(process.cwd(), '../artifacts');
  const logFile = path.join(logDir, `${service}.log`);
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  await fs.appendFile(logFile, line, { encoding: 'utf8' });
} 