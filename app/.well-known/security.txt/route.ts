export function GET() {
  const body = `Contact: mailto:hello@graphai.eu
Expires: 2027-09-27T00:00:00.000Z
Preferred-Languages: en, de, es
Canonical: https://jobs2.graphai.eu/.well-known/security.txt
`
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } })
}
