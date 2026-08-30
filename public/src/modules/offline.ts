export const createOfflineModule = () => {
  const handler = () => {
    localStorage.setItem("colabmd_offline_backup", new Date().toISOString());
  };

  return {
    init() {
      window.addEventListener("offline", handler);
    },
    destroy() {
      window.removeEventListener("offline", handler);
    },
  };
};
