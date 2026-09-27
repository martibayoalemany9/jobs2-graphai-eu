import { expect, test } from "@playwright/test"

test("settings free-mode control is present", async ({ page }) => {
  await page.goto("/?view=settings")
  await expect(page.getByTestId("entitlement")).toBeVisible()
  await expect(page.getByTestId("free-mode")).toBeVisible()
})
