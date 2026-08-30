import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateAndResolvePath } from "../../src/modules/fileService";

describe("validateAndResolvePath", () => {
  it("workspace配下は許可する", () => {
    const base = "/tmp/workspace";
    const resolved = validateAndResolvePath(base, "docs/note.md");
    expect(resolved).toBe(path.resolve(base, "docs/note.md"));
  });

  it("ディレクトリトラバーサルを拒否する", () => {
    expect(() => validateAndResolvePath("/tmp/workspace", "../secret.txt")).toThrow(
      /Security Alert/,
    );
  });
});
