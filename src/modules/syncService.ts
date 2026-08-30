import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";

export class SyncService {
  private readonly wss;
  private connectedUsers = 0;

  constructor(
    server: HttpServer,
    private readonly token: string,
  ) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.wss.on("connection", (socket, request) => {
      const url = new URL(request.url ?? "", "http://localhost");
      if (url.searchParams.get("token") !== this.token) {
        socket.close(4003, "forbidden");
        return;
      }

      this.connectedUsers += 1;
      let authenticated = false;
      const authTimer = setTimeout(() => {
        if (!authenticated) {
          socket.close(4003, "auth timeout");
        }
      }, 5000);

      socket.on("message", (raw) => {
        if (authenticated) {
          return;
        }
        try {
          const data = JSON.parse(String(raw)) as { type?: string; token?: string };
          if (data.type === "auth" && data.token === this.token) {
            authenticated = true;
            clearTimeout(authTimer);
            socket.send(JSON.stringify({ type: "ack" }));
            return;
          }
        } catch {
          // ignore
        }
        socket.close(4003, "auth required");
      });

      socket.on("close", () => {
        clearTimeout(authTimer);
        this.connectedUsers = Math.max(0, this.connectedUsers - 1);
      });
    });
  }

  getConnectedUsers(): number {
    return this.connectedUsers;
  }
}
