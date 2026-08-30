import { expect, test } from "@playwright/test";

test("health APIが応答する", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  expect(json.ok).toBe(true);
});
