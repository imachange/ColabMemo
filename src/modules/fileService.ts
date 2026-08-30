import { promises as fs } from "node:fs";
import path from "node:path";

export const validateAndResolvePath = (baseDir: string, relativeUserPath: string): string => {
  const resolvedPath = path.resolve(baseDir, relativeUserPath);
  const normalizedBase = path.resolve(baseDir);
  const relative = path.relative(normalizedBase, resolvedPath);
  const isSafe = (!relative.startsWith("..") && !path.isAbsolute(relative)) || relative === "";

  if (resolvedPath !== normalizedBase && !isSafe) {
    throw new Error(`[Security Alert] Directory Traversal Blocked: ${relativeUserPath}`);
  }

  return resolvedPath;
};

export class FileService {
  constructor(private readonly workspaceDir: string) {}

  async read(relativePath: string): Promise<string> {
    const safePath = validateAndResolvePath(this.workspaceDir, relativePath);
    return fs.readFile(safePath, "utf-8");
  }

  async write(relativePath: string, content: string): Promise<void> {
    const safePath = validateAndResolvePath(this.workspaceDir, relativePath);
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    await fs.writeFile(safePath, content, "utf-8");
  }
}
