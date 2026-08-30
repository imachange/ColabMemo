import type { ConfigStore } from "./configStore";

export const initSettingsUI = (store: ConfigStore): void => {
  const button = document.getElementById("settings");
  if (!button) {
    return;
  }
  button.addEventListener("click", () => {
    const current = store.current();
    store.update({
      ...current,
      previewMode: current.previewMode === "OFF" ? "SPLIT" : "OFF",
    });
  });
};
