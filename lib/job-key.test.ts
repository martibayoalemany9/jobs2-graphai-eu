import assert from "node:assert/strict"
import test from "node:test"
import { jobKeyFromNorm, urlNorm } from "./job-key"

test("golden: example.com contains / in standard base64", () => {
  assert.equal(jobKeyFromNorm("https://example.com/jobs/0"), "WW_lTzJcDv0RV1K2Ze1n3Vhh")
})

test("golden: x.com contains + in standard base64", () => {
  assert.equal(jobKeyFromNorm("https://x.com/job?a=1"), "LBok6LHiGiQLMFWvExCnd-WZ")
})

test("urlNorm strips query hash and trailing slash", () => {
  assert.equal(urlNorm("HTTPS://Example.com/jobs/0/?a=1#x"), "https://example.com/jobs/0")
})
