const key = "colabmd_config";
const channel = new BroadcastChannel("colabmd_config_channel");

const defaultConfig = {
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

const load = () => {
  try {
    return { ...defaultConfig, ...JSON.parse(localStorage.getItem(key) || "{}") };
  } catch {
    return defaultConfig;
  }
};

const save = (cfg) => {
  localStorage.setItem(key, JSON.stringify(cfg));
  channel.postMessage(cfg);
};

const config = load();
document.getElementById("displayName").value = config.displayName;
document.getElementById("color").value = config.color;
document.getElementById("displayName").addEventListener("input", (e) => {
  save({ ...load(), displayName: e.target.value });
});
document.getElementById("color").addEventListener("input", (e) => {
  save({ ...load(), color: e.target.value });
});
document.getElementById("openEditor").addEventListener("click", () => {
  const cfg = load();
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(cfg))));
  window.location.href = `/#config=${encodeURIComponent(encoded)}`;
});
