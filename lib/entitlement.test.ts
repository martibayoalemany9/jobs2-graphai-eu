import assert from "node:assert/strict"
import test from "node:test"
import { CAP_ANON, CAP_FREE, capFor } from "./entitlement"

test("anonymous cap 50", () => {
  const r = capFor({})
  assert.equal(r.tier, "anonymous")
  assert.equal(r.cap, CAP_ANON)
})

test("operator unlimited unless free-mode", () => {
  const full = capFor({ email: "martibayoalemany@gmail.com" })
  assert.equal(full.tier, "operator")
  assert.equal(full.cap, null)
  const free = capFor({ email: "martibayoalemany@gmail.com", freeMode: true })
  assert.equal(free.cap, CAP_FREE)
})

test("trial 10k then 50 jobs if not subscribed", () => {
  const start = new Date("2026-09-20T00:00:00Z")
  const during = capFor({
    email: "user@example.com",
    trialStartedAt: start,
    entitlementStatus: "trial",
    now: new Date("2026-09-24T00:00:00Z"),
  })
  assert.equal(during.tier, "trial")
  assert.equal(during.cap, CAP_FREE)
  const after = capFor({
    email: "user@example.com",
    trialStartedAt: start,
    entitlementStatus: "trial",
    now: new Date("2026-09-28T00:00:00Z"),
  })
  assert.equal(after.tier, "free")
  assert.equal(after.cap, CAP_ANON)
})

test("paid unlimited; free-mode forces 10k", () => {
  const paid = capFor({ email: "user@example.com", entitlementStatus: "paid" })
  assert.equal(paid.cap, null)
  const capped = capFor({ email: "user@example.com", entitlementStatus: "paid", freeMode: true })
  assert.equal(capped.cap, CAP_FREE)
})

test("lapsed is 50 jobs", () => {
  const r = capFor({ email: "user@example.com", entitlementStatus: "lapsed" })
  assert.equal(r.tier, "free")
  assert.equal(r.cap, CAP_ANON)
})
