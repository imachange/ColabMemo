import { promises as fs } from "node:fs";
import path from "node:path";

const RELATIVE_PATH_PATTERN =
  /^(?![/\\])(?!.*\0)(?!.*(?:^|[/\\])\.\.(?:[/\\]|$))[a-zA-Z0-9._/\\-]+$/;

type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

const sanitizeRelativePath = (relativeUserPath: string): string => {
  if (!RELATIVE_PATH_PATTERN.test(relativeUserPath)) {
    throw new Error(`[Security Alert] Invalid Path: ${relativeUserPath}`);
  }
  return relativeUserPath.replaceAll("\\", "/");
};

export const validateAndResolvePath = (baseDir: string, relativeUserPath: string): string => {
  const safeRelativePath = sanitizeRelativePath(relativeUserPath);
  const resolvedPath = path.resolve(baseDir, safeRelativePath);
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

  async read(relativePath = "note.md"): Promise<string> {
    const safePath = validateAndResolvePath(this.workspaceDir, relativePath);
    return fs.readFile(safePath, "utf-8");
  }

  async write(relativePath: string, content: string): Promise<void> {
    const safePath = validateAndResolvePath(this.workspaceDir, relativePath);
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    await fs.writeFile(safePath, content, "utf-8");
  }

  async listTree(): Promise<FileNode[]> {
    return this.walk(this.workspaceDir, "");
  }

  async create(relativePath: string, type: "file" | "directory"): Promise<void> {
    const safePath = validateAndResolvePath(this.workspaceDir, relativePath);
    if (type === "directory") {
      await fs.mkdir(safePath, { recursive: true });
      return;
    }
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    await fs.writeFile(safePath, "", { flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") {
        throw error;
      }
    });
  }

  async remove(relativePath: string): Promise<void> {
    const safePath = validateAndResolvePath(this.workspaceDir, relativePath);
    await fs.rm(safePath, { recursive: true, force: true });
  }

  async move(from: string, to: string): Promise<void> {
    const safeFrom = validateAndResolvePath(this.workspaceDir, from);
    const safeTo = validateAndResolvePath(this.workspaceDir, to);
    await fs.mkdir(path.dirname(safeTo), { recursive: true });
    await fs.rename(safeFrom, safeTo);
  }

  private async walk(currentDir: string, relativeDir: string): Promise<FileNode[]> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    const filtered = entries.filter((entry) => !entry.name.startsWith("."));
    const nodes: FileNode[] = [];

    for (const entry of filtered) {
      const relPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        nodes.push({
          name: entry.name,
          path: relPath,
          type: "directory",
          children: await this.walk(path.join(currentDir, entry.name), relPath),
        });
      } else {
        nodes.push({ name: entry.name, path: relPath, type: "file" });
      }
    }

    return nodes.sort((a, b) => a.path.localeCompare(b.path, "ja"));
  }
}
