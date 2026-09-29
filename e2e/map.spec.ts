import { expect, test } from "@playwright/test"

test("country select and bar", async ({ page }) => {
  await page.goto("/?view=map")
  await expect(page.getByTestId("country-select")).toBeVisible()
  await expect(page.getByTestId("country-map")).toBeVisible()
  await expect(page.getByTestId("map-stats")).toBeVisible()
  await expect(page.getByTestId("metric-this-month")).toBeVisible()
  await expect(page.getByTestId("country-bar")).toBeVisible()
  await expect(page.getByTestId("country-bar")).not.toContainText("All jobs")
  await expect(page.getByTestId("time-series")).toBeVisible()
  await expect(page.getByTestId("kpi-legend")).toBeVisible()
})
