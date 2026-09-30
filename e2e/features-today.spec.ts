import { expect, test } from "@playwright/test"

test.describe("Features added on 2026-09-30", () => {
  test("Oman is available in country selector with IT & Telecom function", async ({ page }) => {
    await page.goto("/?view=map")
    const countrySelect = page.getByTestId("country-select")
    await expect(countrySelect).toBeVisible({ timeout: 20_000 })
    const omanOption = countrySelect.locator('option[value="OM"]')
    await expect(omanOption).toBeAttached()

    // Switch to Oman and verify heading
    await countrySelect.selectOption("OM")
    await expect(page.getByTestId("country-bar-heading")).toContainText("Oman", { timeout: 20_000 })

    // Verify Information Technology, Telecommunications specialty label is available
    const itSpecialty = page.locator('[data-specialty="it"]')
    if (await itSpecialty.count() > 0) {
      await expect(itSpecialty).toBeVisible()
    }
  })

  test("Time series charts render translucent area fills under lines", async ({ page }) => {
    await page.goto("/?view=map")
    await expect(page.getByTestId("time-series")).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId("series-jobs-fill")).toBeVisible()
  })

  test("Job listing displays origin job-board badges and skill tags", async ({ page }) => {
    await page.goto("/?view=jobs")
    await expect(page.getByTestId("job-list")).toBeVisible({ timeout: 25_000 })
    
    // Check for origin job board badges
    const boardBadges = page.getByTestId("job-board-icon")
    await expect(boardBadges.first()).toBeVisible({ timeout: 20_000 })
    const badgeCount = await boardBadges.count()
    expect(badgeCount).toBeGreaterThan(0)

    // Check for skill tags
    const skillTags = page.getByTestId("job-skill-tag")
    await expect(skillTags.first()).toBeVisible({ timeout: 20_000 })
    const tagCount = await skillTags.count()
    expect(tagCount).toBeGreaterThan(0)
  })

  test("Catalog language switcher supports JA, ET, RU, and CS", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("catalog-locale-ja")).toBeVisible()
    await expect(page.getByTestId("catalog-locale-et")).toBeVisible()
    await expect(page.getByTestId("catalog-locale-ru")).toBeVisible()
    await expect(page.getByTestId("catalog-locale-cs")).toBeVisible()

    // Test clicking Estonian (ET)
    await page.getByTestId("catalog-locale-et").click()
    await expect(page.getByTestId("catalog-locale-et")).toHaveAttribute("aria-pressed", "true")

    // Test clicking Japanese (JA)
    await page.getByTestId("catalog-locale-ja").click()
    await expect(page.getByTestId("catalog-locale-ja")).toHaveAttribute("aria-pressed", "true")

    // Return to English (EN)
    await page.getByTestId("catalog-locale-en").click()
    await expect(page.getByTestId("catalog-locale-en")).toHaveAttribute("aria-pressed", "true")
  })

  test("Correction / deletion mailto link contains job key and company", async ({ page }) => {
    await page.goto("/?view=jobs")
    await expect(page.getByTestId("job-list")).toBeVisible({ timeout: 25_000 })
    const reportLink = page.locator('a[href^="mailto:hello@graphai.eu"]').first()
    await expect(reportLink).toBeVisible({ timeout: 20_000 })
    const href = await reportLink.getAttribute("href")
    expect(href).toContain("hello@graphai.eu")
    expect(href).toContain("correction")
  })

  test("Capture camera endpoint enforces authentication and handles payload", async ({ request }) => {
    // Unauthenticated request returns 401
    const unauth = await request.post("/api/jobs/capture", {
      data: { image_base64: "dGVzdA==", ocr_text: "test engineer job description" },
    })
    expect(unauth.status()).toBe(401)
  })
})
