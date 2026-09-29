import assert from "node:assert/strict"
import test from "node:test"
import { sessionPaid } from "./stripe"

test("checkout session is paid when payment_status is paid", () => {
  assert.equal(sessionPaid({ payment_status: "paid", status: "complete" } as never), true)
  assert.equal(sessionPaid({ payment_status: "unpaid", status: "open" } as never), false)
  assert.equal(sessionPaid(null), false)
})
