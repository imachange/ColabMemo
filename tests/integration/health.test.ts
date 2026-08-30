import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/server";

const { app, server } = createApp();

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("GET /api/health", () => {
  it("ヘルスチェック情報を返す", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.enabledFlags).toBeTypeOf("object");
  });
});
