import assert from "node:assert/strict"
import test from "node:test"
import { logBarWidth } from "./bar-scale"

test("log bars keep small counts visible against a large max", () => {
  const max = 72738
  const small = logBarWidth(272, max)
  const mid = logBarWidth(8602, max)
  const large = logBarWidth(max, max)
  assert.equal(large, 100)
  assert.ok(small >= 4)
  assert.ok(small < mid)
  assert.ok(mid < large)
  assert.ok(small > (272 / max) * 100)
})
