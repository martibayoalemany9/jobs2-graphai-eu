import assert from "node:assert/strict"
import test from "node:test"
import {
  boardLabel,
  boardMeta,
  foldDupKey,
  resolveBoardId,
  uniqueBoards,
  type JobBoardMember,
} from "./job-boards"

test("URL host wins over google_alert source", () => {
  assert.equal(resolveBoardId("google_alert", "https://click.stepstone.de/abc"), "stepstone")
  assert.equal(resolveBoardId("google_alert", "https://www.linkedin.com/jobs/view/1"), "linkedin")
  assert.equal(resolveBoardId("google_alert", "https://cts.indeed.com/viewjob?jk=1"), "indeed")
})

test("top harvest sources map to board ids", () => {
  assert.equal(resolveBoardId("arbeitsagentur_v6", "https://www.arbeitsagentur.de/jobsuche/job-123"), "arbeitsagentur")
  assert.equal(resolveBoardId("eures", "https://europa.eu/eures/portal/job/123"), "eures")
  assert.equal(resolveBoardId("mpsv_cz", "https://www.uradprace.cz/volna-mista"), "mpsv")
  assert.equal(resolveBoardId("listed_greenhouse", "https://boards.greenhouse.io/acme/jobs/1"), "greenhouse")
  assert.equal(resolveBoardId("careers_apple", "https://jobs.apple.com/en-us/details/1"), "apple")
  assert.equal(resolveBoardId("google_news_rss", "https://news.example.com/job"), "google")
  assert.equal(resolveBoardId("epo", "https://jobs.epo.org/job/European-Patent-Examiner/22503-en_GB/"), "epo")
  assert.equal(resolveBoardId("dpma", "https://www.dpma.de/dpma/karriere/aktuellestellenanzeigen/index.html"), "dpma")
  assert.equal(resolveBoardId("euipo", "https://www.euipo.europa.eu/en/about-us/the-office/who-we-are/employer-of-choice/vacancies"), "euipo")
  assert.equal(resolveBoardId("wipo", "https://wipo.taleo.net/careersection/wp_2/jobdetail.ftl?job=123"), "wipo")
  assert.equal(resolveBoardId("philjobnet", "https://philjobnet.gov.ph/job-vacancies/1"), "philjobnet")
  assert.equal(resolveBoardId("worknet", "https://www.work.go.kr/empInfo/jobList.do"), "worknet")
  assert.equal(resolveBoardId("portalempleo", "https://portalempleo.gob.ar/OfertasLaborales/x"), "portalempleo")
  assert.equal(resolveBoardId("hawaii_neogov", "https://www.governmentjobs.com/careers/hawaii/jobs/1"), "hawaii")
  assert.equal(resolveBoardId("hawaii_uh", "https://www.schooljobs.com/careers/hawaiiedu/jobs/5495174/admin"), "hawaii")
  assert.equal(resolveBoardId("hawaii_neogov", "https://www.governmentjobs.com/careers/honolulu/jobs/1"), "hawaii")
  assert.equal(resolveBoardId("mol_oman", "https://taj.mol.gov.om/taj/vacancies.aspx?id=20516"), "mol_oman")
  assert.equal(resolveBoardId("zeit_jobs_kultur_musik", "https://jobs.zeit.de/jobs/foo-1"), "zeit")
  assert.equal(resolveBoardId("planned_jobs_eu_germany.csv", "https://example.com/a"), "planned")
  assert.equal(resolveBoardId("", ""), "other")
})

test("foldDupKey groups gender-token titles on the same site", () => {
  const a = foldDupKey({
    country: "DE",
    company: "Siemens AG",
    title: "Softwareentwickler (m/w/d)",
    location: "Munich",
  })
  const b = foldDupKey({
    country: "de",
    company: "siemens ag",
    title: "Softwareentwickler",
    location: "Munich",
  })
  assert.equal(a, b)
  assert.ok(a && a.startsWith("DE|siemens ag|softwareentwickler|munich"))
})

test("foldDupKey keeps different cities and empty company as distinct", () => {
  const munich = foldDupKey({
    country: "DE",
    company: "Siemens AG",
    title: "Softwareentwickler",
    location: "Munich",
  })
  const berlin = foldDupKey({
    country: "DE",
    company: "Siemens AG",
    title: "Softwareentwickler",
    location: "Berlin",
  })
  assert.notEqual(munich, berlin)
  assert.equal(foldDupKey({ country: "DE", company: "", title: "Engineer", location: "Berlin" }), null)
})

test("board badges and labels", () => {
  assert.equal(boardMeta("linkedin").letters, "IN")
  assert.equal(boardLabel("stepstone", "en"), "Stepstone")
  assert.equal(boardLabel("arbeitsagentur", "de"), "Bundesagentur für Arbeit")
  assert.equal(boardMeta("custom_board").letters, "CB")
  assert.equal(boardMeta("epo").letters, "EP")
  assert.equal(boardLabel("epo", "en"), "European Patent Office")
  assert.equal(boardLabel("dpma", "en"), "DPMA")
  assert.equal(boardLabel("euipo", "en"), "EUIPO")
})

test("uniqueBoards keeps first member per board_id", () => {
  const rows: JobBoardMember[] = [
    { job_key: "m", master_job_key: "m", is_master: true, member_rank: 1, board_id: "stepstone", source: "s", url: "u1" },
    { job_key: "d", master_job_key: "m", is_master: false, member_rank: 2, board_id: "linkedin", source: "s", url: "u2" },
    { job_key: "x", master_job_key: "m", is_master: false, member_rank: 3, board_id: "linkedin", source: "s", url: "u3" },
  ]
  const u = uniqueBoards(rows)
  assert.equal(u.length, 2)
  assert.equal(u[0].board_id, "stepstone")
  assert.equal(u[1].job_key, "d")
})
