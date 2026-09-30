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
