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

test("occupation labels switch EN DE NL FR", async ({ page }) => {
  await page.goto("/?view=map")
  const bar = page.getByTestId("country-bar")
  await expect(bar).toBeVisible()
  const manufacturing = bar.locator('[data-specialty="fertigung"]')
  await expect(manufacturing).toContainText("Manufacturing")
  await page.getByTestId("catalog-locale-de").click()
  await expect(manufacturing).toContainText("Fertigung")
  await page.getByTestId("catalog-locale-nl").click()
  await expect(manufacturing).toContainText("Fabricage")
  await page.getByTestId("catalog-locale-fr").click()
  await expect(manufacturing).toContainText("Fabrication")
  await page.getByTestId("catalog-locale-en").click()
  await expect(manufacturing).toContainText("Manufacturing")
})
