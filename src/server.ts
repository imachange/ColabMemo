import crypto from "node:crypto";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import express from "express";
import multer from "multer";
import { config } from "./config.js";
import { FileService, validateAndResolvePath } from "./modules/fileService.js";
import { GitService } from "./modules/gitService.js";
import { ImageService } from "./modules/imageService.js";
import { LogService } from "./modules/logService.js";
import { SnapshotService } from "./modules/snapshotService.js";
import { SyncService } from "./modules/syncService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = path.join(repoRoot, "workspace");
const attachmentsDir = path.join(workspaceDir, "attachments");
const tempDir = path.join(repoRoot, "temp");

export const createApp = () => {
  const app = express();
  const token = crypto.randomBytes(32).toString("hex");
  const upload = multer();

  const fileService = new FileService(workspaceDir);
  const imageService = new ImageService(workspaceDir, attachmentsDir, {
    maxFileSizeMb: config.MAX_FILE_SIZE_MB,
    maxTotalSizeMb: config.MAX_ATTACHMENTS_TOTAL_SIZE_MB,
  });
  const gitService = new GitService(repoRoot, process.env.GIT_BRANCH ?? "main");
  const logService = new LogService(path.join(tempDir, "logs"));
  const snapshotService = new SnapshotService(
    workspaceDir,
    path.join(tempDir, "snapshots"),
    config.SNAPSHOT_MAX_GENERATIONS,
  );

  if (config.ENABLE_SNAPSHOTS) {
    snapshotService.start(config.SNAPSHOT_INTERVAL_MINUTES);
  }

  app.disable("x-powered-by");
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use((_, res, next) => {
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  app.get("/api/health", (_, res) => {
    res.json({
      ok: true,
      uptimeSeconds: Math.floor(process.uptime()),
      gitSyncStatus: gitService.getStatus(),
      enabledFlags: {
        preview: config.ENABLE_MARKDOWN_PREVIEW,
        presence: config.ENABLE_PRESENCE,
        clientLogging: config.ENABLE_CLIENT_LOGGING,
        snapshots: config.ENABLE_SNAPSHOTS,
      },
    });
  });

  app.get("/api/files", async (req, res) => {
    const target = typeof req.query.path === "string" ? req.query.path : "note.md";
    const safeTarget = validateAndResolvePath(workspaceDir, target);
    const relativePath = path.relative(workspaceDir, safeTarget);
    const content = await fileService.read(relativePath);
    res.json({ path: relativePath, content });
  });

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file || typeof req.body.activePath !== "string") {
      res.status(400).json({ error: "file と activePath が必要です" });
      return;
    }
    try {
      const relativePath = await imageService.saveImage(req.file.buffer, req.body.activePath);
      res.json({ path: relativePath });
    } catch (error) {
      const message = String(error);
      if (message.includes("上限")) {
        res.status(413).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  });

  app.post("/api/attachments/gc", async (_, res) => {
    const deleted = await imageService.gcUnusedFiles();
    res.json({ deleted });
  });

  app.post("/api/logs/client", async (req, res) => {
    if (!config.ENABLE_CLIENT_LOGGING) {
      res.status(403).json({ error: "client logging disabled" });
      return;
    }
    await logService.logClient(req.body);
    res.status(204).send();
  });

  app.use("/portal", express.static(path.join(repoRoot, "portal")));
  app.use(express.static(path.join(repoRoot, "public")));

  app.use((_, res) => {
    res.sendFile(path.join(repoRoot, "public", "index.html"));
  });

  const server = createServer(app);
  const syncService = new SyncService(server, token);

  const interval = setInterval(() => {
    gitService.sync().then(async (result) => {
      if (result.reason) {
        await logService.logServer(result.reason);
      }
    });
  }, config.AUTO_SAVE_INTERVAL_SECONDS * 1000);

  const shutdown = async () => {
    clearInterval(interval);
    await imageService.gcUnusedFiles().catch(() => undefined);
    snapshotService.stop();
    server.close();
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  return { app, server, token, syncService };
};

if (process.env.NODE_ENV !== "test") {
  const { server } = createApp();
  server.listen(config.PORT, () => {
    console.log(`ColabMemo server: http://localhost:${config.PORT}`);
  });
}
