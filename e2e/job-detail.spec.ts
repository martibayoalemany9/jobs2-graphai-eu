import { expect, test } from "@playwright/test"

test("opening a job shows the description, not onboarding", async ({ page }) => {
  await page.goto("/?view=jobs")
  const first = page.getByTestId("job-list").locator("a").first()
  await expect(first).toBeVisible({ timeout: 20_000 })
  await first.click()
  await expect(page).toHaveURL(/\/jobs\//)
  await expect(page.getByTestId("onboarding")).toHaveCount(0)
  await expect(page.locator("h1")).toBeVisible({ timeout: 20_000 })
  await expect(page.locator("article")).toBeVisible()
  await expect(page.getByTestId("job-location")).toBeVisible()
  await expect(page.getByTestId("job-report")).toBeVisible()
  await expect(page.getByTestId("job-report-send")).toBeVisible()
})

test("skill tags open a certifications modal", async ({ page }) => {
  await page.goto("/?view=jobs")
  await expect(page.getByTestId("job-list")).toBeVisible({ timeout: 20_000 })
  const tag = page.getByTestId("job-skill-tag").first()
  await expect(tag).toBeVisible({ timeout: 20_000 })
  await tag.click()
  await expect(page.getByTestId("skill-certs-modal")).toBeVisible()
  await expect(page.getByTestId("skill-certs-close")).toBeVisible()
  await page.getByTestId("skill-certs-close").click()
  await expect(page.getByTestId("skill-certs-modal")).toHaveCount(0)
})

test("employer reply icon opens product modal when present", async ({ page }) => {
  await page.goto("/?view=jobs")
  await expect(page.getByTestId("job-list")).toBeVisible({ timeout: 20_000 })
  const icon = page.getByTestId("employer-reply-icon").first()
  const n = await icon.count()
  if (n === 0) return
  await icon.click()
  await expect(page.getByTestId("employer-reply-modal")).toBeVisible()
  await page.getByTestId("employer-reply-close").click()
  await expect(page.getByTestId("employer-reply-modal")).toHaveCount(0)
})

test("job board icons open a listing compare modal", async ({ page }) => {
  await page.goto("/?view=jobs")
  await expect(page.getByTestId("job-list")).toBeVisible({ timeout: 20_000 })
  const icon = page.getByTestId("job-board-icon").first()
  await expect(icon).toBeVisible({ timeout: 20_000 })
  await icon.click()
  await expect(page.getByTestId("board-diff-modal")).toBeVisible()
  await expect(page.getByTestId("board-diff-close")).toBeVisible()
  await expect(page.getByTestId("board-diff-text")).toBeVisible({ timeout: 20_000 })
  await expect(page).toHaveURL(/view=jobs/)
  await page.getByTestId("board-diff-close").click()
  await expect(page.getByTestId("board-diff-modal")).toHaveCount(0)
})
