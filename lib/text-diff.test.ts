import assert from "node:assert/strict"
import test from "node:test"
import { stripHtml, wordDiff } from "./text-diff"

test("identical text is one same span", () => {
  const ops = wordDiff("Java Spring Boot", "Java Spring Boot")
  assert.deepEqual(ops, [{ type: "same", text: "Java Spring Boot" }])
})

test("added and deleted words are colored separately", () => {
  const ops = wordDiff("Java Spring Boot in Berlin", "Java Kotlin in Berlin")
  const types = ops.map((o) => o.type)
  assert.ok(types.includes("del"))
  assert.ok(types.includes("add"))
  assert.ok(ops.some((o) => o.type === "del" && /Spring|Boot/.test(o.text)))
  assert.ok(ops.some((o) => o.type === "add" && /Kotlin/.test(o.text)))
  assert.ok(ops.some((o) => o.type === "same" && /Berlin/.test(o.text)))
})

test("empty sides", () => {
  assert.deepEqual(wordDiff("", "hello"), [{ type: "add", text: "hello" }])
  assert.deepEqual(wordDiff("hello", ""), [{ type: "del", text: "hello" }])
  assert.deepEqual(wordDiff("", ""), [])
})

test("stripHtml keeps line breaks from paragraphs", () => {
  assert.equal(stripHtml("<p>Hello</p><p>World</p>"), "Hello\n World")
  assert.equal(stripHtml("A &amp; B"), "A & B")
})
