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
  await expect(page.getByTestId("sign-in")).toBeVisible()
  await expect(page.getByTestId("subscribe")).toBeVisible()
  await expect(page.getByTestId("catalog-locale")).toBeVisible()
})

test("sign-in page renders Clerk", async ({ page }) => {
  await page.goto("/sign-in")
  await expect(page.locator("input, iframe, [data-clerk-component]").first()).toBeVisible({ timeout: 20_000 })
})

test("security.txt", async ({ request }) => {
  const res = await request.get("/.well-known/security.txt")
  expect(res.ok()).toBeTruthy()
  expect(await res.text()).toContain("hello@graphai.eu")
})
