import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { validateAndResolvePath } from "./fileService.js";

export type ImageLimits = {
  maxFileSizeMb: number;
  maxTotalSizeMb: number;
};

export class ImageService {
  constructor(
    private readonly workspaceDir: string,
    private readonly attachmentsDir: string,
    private readonly limits: ImageLimits,
  ) {}

  async saveImage(buffer: Buffer, activePath: string): Promise<string> {
    if (buffer.byteLength > this.limits.maxFileSizeMb * 1024 * 1024) {
      throw new Error("ファイルサイズ上限を超えました");
    }

    const safeActivePath = validateAndResolvePath(this.workspaceDir, activePath);
    const totalSize = await this.getAttachmentsTotalSize();
    if (totalSize + buffer.byteLength > this.limits.maxTotalSizeMb * 1024 * 1024) {
      throw new Error("添付ファイル総容量の上限を超えました");
    }

    await fs.mkdir(this.attachmentsDir, { recursive: true });
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 12);
    const fileName = `${hash}.webp`;
    const attachmentPath = validateAndResolvePath(this.attachmentsDir, fileName);

    try {
      await fs.access(attachmentPath);
    } catch {
      await fs.writeFile(attachmentPath, buffer);
    }

    return path.relative(path.dirname(safeActivePath), attachmentPath).replaceAll(path.sep, "/");
  }

  async gcUnusedFiles(): Promise<string[]> {
    await fs.mkdir(this.attachmentsDir, { recursive: true });
    const markdownHashes = await this.collectReferencedHashes();
    const files = await fs.readdir(this.attachmentsDir);
    const deleted: string[] = [];

    for (const file of files) {
      if (!file.endsWith(".webp")) {
        continue;
      }
      const hash = file.replace(/\.webp$/, "");
      if (!markdownHashes.has(hash)) {
        const safePath = validateAndResolvePath(this.attachmentsDir, file);
        await fs.unlink(safePath);
        deleted.push(file);
      }
    }

    return deleted;
  }

  private async collectReferencedHashes(): Promise<Set<string>> {
    const hashes = new Set<string>();
    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
          continue;
        }
        if (!entry.name.endsWith(".md")) {
          continue;
        }
        const content = await fs.readFile(full, "utf-8");
        const matches = content.matchAll(/[a-f0-9]{12}/g);
        for (const match of matches) {
          hashes.add(match[0]);
        }
      }
    };

    await walk(this.workspaceDir);
    return hashes;
  }

  private async getAttachmentsTotalSize(): Promise<number> {
    await fs.mkdir(this.attachmentsDir, { recursive: true });
    const files = await fs.readdir(this.attachmentsDir);
    let total = 0;
    for (const file of files) {
      const stat = await fs.stat(path.join(this.attachmentsDir, file));
      total += stat.size;
    }
    return total;
  }
}
