import { describe, expect, it } from "vitest";
import { type UserConfig, defaultConfig } from "../../public/src/modules/configStore";
import { diffLifecycleTargets } from "../../public/src/modules/lifecycle";

describe("diffLifecycleTargets", () => {
  it("OFF化とON化を判定する", () => {
    const prev: UserConfig = {
      ...defaultConfig,
      previewMode: "SPLIT",
      presence: false,
      offline: true,
    };
    const next: UserConfig = {
      ...defaultConfig,
      previewMode: "OFF",
      presence: true,
      offline: true,
    };
    const result = diffLifecycleTargets(next, prev);

    expect(result.deactivate).toContain("preview");
    expect(result.activate).toContain("presence");
  });
});
