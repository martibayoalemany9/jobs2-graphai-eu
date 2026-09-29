import { expect, test } from "@playwright/test"

test("specialty combobox, certs, slider", async ({ page }) => {
  await page.goto("/?view=jobs")
  await expect(page.getByTestId("specialty-certs")).toBeVisible()
  await expect(page.getByTestId("specialty-combobox")).toBeVisible()
  await expect(page.getByTestId("cert-slider")).toBeVisible()
  await expect(page.getByTestId("cert-bars")).toBeVisible()
  await expect(page.getByTestId("certs-collapse")).toBeVisible()
  await expect(page.getByTestId("job-count-label")).toBeVisible()
  await page.getByTestId("specialty-combobox").selectOption("it")
  await expect(page.getByTestId("availability-filter")).toBeVisible()
})
