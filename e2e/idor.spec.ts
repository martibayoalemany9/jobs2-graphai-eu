import { expect, test } from "@playwright/test"

test("guessable job key outside cap is 404", async ({ request }) => {
  const res = await request.get("/api/jobs/AAAAAAAAAAAAAAAAAAAAAAAA")
  expect(res.status()).toBe(404)
})

test("jobs listing requires country", async ({ request }) => {
  const res = await request.get("/api/jobs")
  expect(res.status()).toBe(400)
})
