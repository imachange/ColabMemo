import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config";

describe("loadConfig", () => {
  it("不正なURLを拒否する", () => {
    expect(() => loadConfig({ PORTAL_BASE_URL: "not-url" })).toThrow(/環境変数の検証/);
  });

  it("デフォルト値を適用する", () => {
    const cfg = loadConfig({});
    expect(cfg.WORKSPACE_TITLE).toBe("みんなの共同編集メモ");
    expect(cfg.IMAGE_QUALITY).toBe(80);
  });
});
