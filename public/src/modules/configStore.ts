export type PreviewMode = "OFF" | "SPLIT" | "PREVIEW";
export type ThemeMode = "SYSTEM" | "DARK" | "LIGHT";

export type UserConfig = {
  displayName: string;
  color: string;
  previewMode: PreviewMode;
  syncScroll: boolean;
  presence: boolean;
  offline: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  theme: ThemeMode;
};

const STORAGE_KEY = "colabmd_config";
const CHANNEL_NAME = "colabmd_config_channel";

export const defaultConfig: UserConfig = {
  displayName: "guest",
  color: "#3b82f6",
  previewMode: "SPLIT",
  syncScroll: true,
  presence: true,
  offline: true,
  wordWrap: true,
  lineNumbers: true,
  theme: "SYSTEM",
};

const decode = (value: string): UserConfig | null => {
  try {
    const json = decodeURIComponent(escape(atob(value)));
    return { ...defaultConfig, ...(JSON.parse(json) as Partial<UserConfig>) };
  } catch {
    return null;
  }
};

const encode = (config: UserConfig): string =>
  btoa(unescape(encodeURIComponent(JSON.stringify(config))));

export class ConfigStore {
  private config = defaultConfig;
  private readonly listeners = new Set<(next: UserConfig, prev: UserConfig) => void>();
  private readonly channel = new BroadcastChannel(CHANNEL_NAME);

  constructor() {
    this.config = this.loadFromHash() ?? this.loadFromStorage();
    this.channel.onmessage = (event) => {
      const next = { ...defaultConfig, ...(event.data as Partial<UserConfig>) };
      this.update(next, false);
    };
  }

  current(): UserConfig {
    return this.config;
  }

  subscribe(listener: (next: UserConfig, prev: UserConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(next: UserConfig, publish = true): void {
    const prev = this.config;
    this.config = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    const hash = `config=${encode(next)}`;
    history.replaceState(null, "", `#${hash}`);
    for (const listener of this.listeners) {
      listener(next, prev);
    }
    if (publish) {
      this.channel.postMessage(next);
    }
  }

  loadFromHash(): UserConfig | null {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const encoded = params.get("config");
    if (!encoded) {
      return null;
    }
    return decode(encoded);
  }

  private loadFromStorage(): UserConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaultConfig;
      }
      return { ...defaultConfig, ...(JSON.parse(raw) as Partial<UserConfig>) };
    } catch {
      return defaultConfig;
    }
  }
}
