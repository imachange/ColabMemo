import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type GitSyncStatus = "healthy" | "degraded";

export class GitService {
  private isRunning = false;
  private consecutiveFailures = 0;
  private status: GitSyncStatus = "healthy";

  constructor(
    private readonly repoRoot: string,
    private readonly branch: string,
    private readonly failureThreshold = 3,
  ) {}

  getStatus(): GitSyncStatus {
    return this.status;
  }

  async sync(): Promise<{ skipped: boolean; reason?: string }> {
    if (this.isRunning) {
      return { skipped: true, reason: "前回同期が継続中" };
    }

    this.isRunning = true;
    try {
      const lockPath = path.join(this.repoRoot, ".git", "index.lock");
      try {
        await access(lockPath);
        return { skipped: true, reason: "index.lock が存在" };
      } catch {
        // lockなし
      }

      const status = await this.runGit(["status", "--porcelain"]);
      if (!status.stdout.trim()) {
        this.markSuccess();
        return { skipped: true, reason: "差分なし" };
      }

      await this.runGit(["add", "workspace"]);
      await this.runGit(["commit", "-m", "chore: auto sync workspace"]);

      try {
        await this.runGit(["push", "origin", this.branch]);
      } catch (error) {
        const err = error as Error;
        if (!err.message.includes("non-fast-forward") && !err.message.includes("rejected")) {
          throw error;
        }
        await this.runGit(["pull", "--rebase", "origin", this.branch]);
        await this.runGit(["push", "origin", this.branch]);
      }

      this.markSuccess();
      return { skipped: false };
    } catch (error) {
      const message = String(error);
      if (message.includes("CONFLICT")) {
        await this.runGit(["rebase", "--abort"]).catch(() => undefined);
      }
      this.markFailure();
      return { skipped: true, reason: `同期失敗: ${message}` };
    } finally {
      this.isRunning = false;
    }
  }

  private markSuccess(): void {
    this.consecutiveFailures = 0;
    this.status = "healthy";
  }

  private markFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.status = "degraded";
    }
  }

  private async runGit(args: string[]) {
    return execFileAsync("git", args, { cwd: this.repoRoot });
  }
}
