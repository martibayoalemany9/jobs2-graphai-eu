import assert from "node:assert/strict"
import test from "node:test"
import { createHmac } from "node:crypto"
import { eventIsLapsed, eventIsPaid, revolutSignatureOk } from "./revolut"

test("paid and lapsed event names", () => {
  assert.equal(eventIsPaid("ORDER_COMPLETED"), true)
  assert.equal(eventIsLapsed("SUBSCRIPTION_CANCELLED"), true)
  assert.equal(eventIsPaid("PING"), false)
})

test("hmac v1.ts.raw window", () => {
  process.env.REVOLUT_API_SECRET = "test-secret"
  const ts = String(Math.floor(Date.now() / 1000))
  const raw = '{"event":"ORDER_COMPLETED"}'
  const sig = createHmac("sha256", "test-secret").update(`v1.${ts}.${raw}`).digest("hex")
  assert.equal(revolutSignatureOk(raw, `v1.${ts}.${sig}`), true)
  assert.equal(revolutSignatureOk(raw, `v1.${ts}.deadbeef`), false)
})
