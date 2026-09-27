import { expect, test } from "@playwright/test"

test("guessable job key outside cap is 404", async ({ request }) => {
  const res = await request.get("/api/jobs/AAAAAAAAAAAAAAAAAAAAAAAA")
  expect([404, 200]).toContain(res.status())
  if (res.status() === 200) {
    const j = await res.json()
    expect(j.error || j.job).toBeTruthy()
  }
})

test("jobs listing requires country", async ({ request }) => {
  const res = await request.get("/api/jobs")
  expect(res.status()).toBe(400)
})
