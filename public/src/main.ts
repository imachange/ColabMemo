import { ConfigStore } from "./modules/configStore";
import { initEditor } from "./modules/editor";
import { initExplorer } from "./modules/explorer";
import { type LifecycleKey, diffLifecycleTargets } from "./modules/lifecycle";
import { initLogger } from "./modules/logger";
import { createOfflineModule } from "./modules/offline";
import { createPresenceModule } from "./modules/presence";
import { createPreviewModule } from "./modules/preview";
import { initSettingsUI } from "./modules/settingsUI";
import { initSync } from "./modules/sync";
import { initUploader } from "./modules/uploader";

type RuntimeModule = { init: () => void; destroy: () => void };

const store = new ConfigStore();
const modules: Record<LifecycleKey, RuntimeModule> = {
  preview: createPreviewModule(),
  presence: createPresenceModule(),
  offline: createOfflineModule(),
};

initEditor();
initExplorer();
initUploader();
initLogger();
initSettingsUI(store);
initSync();

const bootstrapConfig = store.current();
if (bootstrapConfig.previewMode !== "OFF") {
  modules.preview.init();
}
if (bootstrapConfig.presence) {
  modules.presence.init();
}
if (bootstrapConfig.offline) {
  modules.offline.init();
}

store.subscribe((next, prev) => {
  const { activate, deactivate } = diffLifecycleTargets(next, prev);
  for (const key of deactivate) {
    modules[key].destroy();
  }
  for (const key of activate) {
    modules[key].init();
  }
});
