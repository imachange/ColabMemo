import { promises as fs } from "node:fs";
import path from "node:path";

const RELATIVE_PATH_PATTERN =
  /^(?![/\\])(?!.*\0)(?!.*(?:^|[/\\])\.\.(?:[/\\]|$))[a-zA-Z0-9._/\\-]+$/;

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

  async readNote(): Promise<string> {
    const safePath = validateAndResolvePath(this.workspaceDir, "note.md");
    return fs.readFile(safePath, "utf-8");
  }
}
