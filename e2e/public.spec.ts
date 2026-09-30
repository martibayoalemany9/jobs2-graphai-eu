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
  await expect(page.getByTestId("catalog-locale-ja")).toBeVisible()
  await expect(page.getByTestId("catalog-locale-et")).toBeVisible()
  await expect(page.getByTestId("catalog-locale-ru")).toBeVisible()
  await expect(page.getByTestId("catalog-locale-cs")).toBeVisible()
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

test("imprint shows Graphai OÜ company notice", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Imprint" }).click()
  await expect(page).toHaveURL(/\/imprint/)
  await expect(page.getByTestId("imprint-page")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Imprint" })).toBeVisible()
  await expect(page.locator("address").filter({ hasText: "Graphai OÜ" })).toBeVisible()
  await expect(page.getByText("Tartu mnt 67/1-13b")).toBeVisible()
  await expect(page.getByText("17550354")).toBeVisible()
  await expect(page.getByText("LT66 3250 0794 2676 6416")).toBeVisible()
  await expect(page.locator("address").filter({ hasText: "Dalanta OÜ" })).toBeVisible()
  await expect(page.getByRole("link", { name: "jobs2.graphai.eu" }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "hello@graphai.eu" }).first()).toBeVisible()
  const key = await page.request.get("/gpg.asc")
  expect(key.ok()).toBeTruthy()
  expect(await key.text()).toContain("BEGIN PGP PUBLIC KEY BLOCK")
})
