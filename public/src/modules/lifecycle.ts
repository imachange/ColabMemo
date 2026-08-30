import type { UserConfig } from "./configStore";

export type LifecycleKey = "preview" | "presence" | "offline";

export const diffLifecycleTargets = (
  next: UserConfig,
  prev: UserConfig,
): {
  activate: LifecycleKey[];
  deactivate: LifecycleKey[];
} => {
  const map: Record<LifecycleKey, boolean> = {
    preview: next.previewMode !== "OFF",
    presence: next.presence,
    offline: next.offline,
  };
  const prevMap: Record<LifecycleKey, boolean> = {
    preview: prev.previewMode !== "OFF",
    presence: prev.presence,
    offline: prev.offline,
  };

  const activate: LifecycleKey[] = [];
  const deactivate: LifecycleKey[] = [];

  for (const key of Object.keys(map) as LifecycleKey[]) {
    if (!prevMap[key] && map[key]) {
      activate.push(key);
    }
    if (prevMap[key] && !map[key]) {
      deactivate.push(key);
    }
  }

  return { activate, deactivate };
};
