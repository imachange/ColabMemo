import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

export class SnapshotService {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly workspaceDir: string,
    private readonly snapshotRoot: string,
    private readonly maxGenerations: number,
  ) {}

  start(intervalMinutes: number): void {
    this.stop();
    this.timer = setInterval(
      () => {
        this.createSnapshot().catch(() => undefined);
      },
      intervalMinutes * 60 * 1000,
    );
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async createSnapshot(): Promise<void> {
    await mkdir(this.snapshotRoot, { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15).replace("T", "-");
    const dest = path.join(this.snapshotRoot, stamp);
    await cp(this.workspaceDir, dest, { recursive: true });

    const generations = (await readdir(this.snapshotRoot)).sort();
    while (generations.length > this.maxGenerations) {
      const old = generations.shift();
      if (old) {
        await rm(path.join(this.snapshotRoot, old), { recursive: true, force: true });
      }
    }
  }
}
