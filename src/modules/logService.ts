import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export class LogService {
  constructor(private readonly rootDir: string) {}

  async logServer(message: string): Promise<void> {
    const dir = path.join(this.rootDir, "server");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}.log`);
    await appendFile(file, `${new Date().toISOString()} ${message}\n`);
  }

  async logClient(payload: unknown): Promise<void> {
    const dir = path.join(this.rootDir, "client");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}.log`);
    await appendFile(file, `${JSON.stringify(payload)}\n`);
  }
}
