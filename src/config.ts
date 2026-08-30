import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  PORTAL_BASE_URL: z.string().url().optional(),
  WORKSPACE_TITLE: z.string().default("みんなの共同編集メモ"),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),

  ENABLE_MARKDOWN_PREVIEW: z.coerce.boolean().default(true),
  ENABLE_PRESENCE: z.coerce.boolean().default(true),
  ENABLE_CLIENT_LOGGING: z.coerce.boolean().default(true),
  ENABLE_SNAPSHOTS: z.coerce.boolean().default(true),

  IMAGE_MAX_DIMENSION: z.coerce.number().int().positive().default(1280),
  IMAGE_QUALITY: z.coerce.number().int().min(1).max(100).default(80),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
  MAX_ATTACHMENTS_TOTAL_SIZE_MB: z.coerce.number().positive().default(500),

  AUTO_SAVE_INTERVAL_SECONDS: z.coerce.number().int().positive().default(30),
  SNAPSHOT_INTERVAL_MINUTES: z.coerce.number().int().positive().default(5),
  SNAPSHOT_MAX_GENERATIONS: z.coerce.number().int().positive().default(24),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): EnvConfig => {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(", ");
    throw new Error(`環境変数の検証に失敗しました: ${message}`);
  }
  return result.data;
};

export const config = loadConfig();
