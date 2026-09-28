import assert from "node:assert/strict"
import test from "node:test"
import { canonicalHtmlHost, clerkProviderPropsForHost, clerkSatelliteForHost, isGraphaiHost } from "./clerk-runtime"

test("graphai subdomains are the production Clerk primary family", () => {
  assert.equal(isGraphaiHost("jobs2.graphai.eu"), true)
  assert.equal(clerkSatelliteForHost("jobs2.graphai.eu"), false)
  const p = clerkProviderPropsForHost("jobs2.graphai.eu")
  assert.equal(p.isSatellite, false)
  assert.equal(p.signInUrl, "/sign-in")
})

test("vercel.app aliases canonicalize to jobs2.graphai.eu", () => {
  assert.equal(clerkSatelliteForHost("jobs2-graphai-eu.vercel.app"), false)
  assert.equal(canonicalHtmlHost("jobs2-graphai-eu.vercel.app"), "jobs2.graphai.eu")
  const p = clerkProviderPropsForHost("jobs2-graphai-eu.vercel.app")
  assert.equal(p.isSatellite, false)
  assert.equal(p.signInUrl, "/sign-in")
})
