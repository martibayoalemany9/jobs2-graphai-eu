import assert from "node:assert/strict"
import test from "node:test"
import { canonicalEmail, isOperatorEmail } from "./operators"

test("canonical googlemail to gmail", () => {
  assert.equal(canonicalEmail("MartiBayoAlemany@googlemail.com"), "martibayoalemany@gmail.com")
})

test("operator allowlist", () => {
  assert.equal(isOperatorEmail("martibayoalemany@gmail.com"), true)
  assert.equal(isOperatorEmail("martibayoalemany@googlemail.com"), true)
  assert.equal(isOperatorEmail("martibayoalemany+jobs2@gmail.com"), false)
  assert.equal(isOperatorEmail("hello@graphai.eu"), false)
})
