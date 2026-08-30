export const createPresenceModule = () => {
  const marker = document.createElement("div");
  marker.id = "presence-indicator";
  marker.textContent = "Presence: ON";

  return {
    init() {
      document.body.appendChild(marker);
    },
    destroy() {
      marker.remove();
    },
  };
};
