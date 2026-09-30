import assert from "node:assert/strict"
import test from "node:test"
import { extractUrls, parseCapturedOffer, sha256Hex } from "./capture-offer"

test("extractUrls prefers job-board links and strips trailing punctuation", () => {
  const text = [
    "See https://example.com/about.",
    "Apply https://boards.greenhouse.io/acme/jobs/123)",
    "https://www.company.com/careers/software-engineer",
  ].join("\n")
  const urls = extractUrls(text)
  assert.equal(urls[0], "https://boards.greenhouse.io/acme/jobs/123")
  assert.ok(urls.includes("https://www.company.com/careers/software-engineer"))
  assert.ok(urls.some((u) => u.endsWith("/about")))
})

test("parseCapturedOffer reads title company location and URI", () => {
  const ocr = `
Software Engineer (m/w/d)
Graphai GmbH
Berlin, Germany
https://jobs.example.de/stellenangebote/software-engineer
Remote possible. Java Spring Kubernetes.
`
  const offer = parseCapturedOffer(ocr, "abc123")
  assert.equal(offer.job_url, "https://jobs.example.de/stellenangebote/software-engineer")
  assert.equal(offer.title, "Software Engineer (m/w/d)")
  assert.equal(offer.company, "Graphai GmbH")
  assert.equal(offer.country_iso2, "DE")
  assert.equal(offer.is_remote, "true")
  assert.ok(offer.specialties.includes("software") || offer.specialties.includes("it"))
  assert.equal(offer.synthesized_url, false)
})

test("missing URI synthesizes a capture URL from the screenshot hash", () => {
  const offer = parseCapturedOffer("Warehouse picker\nAmazon Fulfillment GmbH\nLeipzig", "deadbeefcafebabe")
  assert.equal(offer.synthesized_url, true)
  assert.ok(offer.job_url.startsWith("https://jobs2.graphai.eu/capture/deadbeef"))
  assert.equal(offer.company, "Amazon Fulfillment GmbH")
})

test("sha256Hex is stable", () => {
  assert.equal(sha256Hex(Buffer.from("jobs2")), sha256Hex(Buffer.from("jobs2")))
  assert.equal(sha256Hex(Buffer.from("jobs2")).length, 64)
})
