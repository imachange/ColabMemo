export const initSync = (token = ""): WebSocket => {
  const ws = new WebSocket(
    `${location.origin.replace("http", "ws")}/ws?token=${encodeURIComponent(token)}`,
  );
  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ type: "auth", token }));
  });
  return ws;
};
