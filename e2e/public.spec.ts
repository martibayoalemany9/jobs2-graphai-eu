import { expect, test } from "@playwright/test"

test("health", async ({ request }) => {
  const res = await request.get("/api/health")
  expect(res.ok()).toBeTruthy()
  const j = await res.json()
  expect(j.ok).toBeTruthy()
})

test("home chrome", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByLabel("graphai jobs")).toBeVisible()
  await expect(page.getByRole("tab", { name: "Map" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Jobs" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Imprint" })).toBeVisible()
})

test("security.txt", async ({ request }) => {
  const res = await request.get("/.well-known/security.txt")
  expect(res.ok()).toBeTruthy()
  expect(await res.text()).toContain("hello@graphai.eu")
})
