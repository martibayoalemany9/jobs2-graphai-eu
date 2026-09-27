# IONOS DNS for jobs2.graphai.eu

Create the Vercel project and attach the domain **first**. Copy the CNAME target from the Vercel domain UI. Graphai siblings use host-specific `*.vercel-dns-0xx.com` values:

| Host | Live CNAME (2026-09-27) |
| --- | --- |
| grok.graphai.eu | 4b60e832bf51d69d.vercel-dns-013.com |
| jobs.graphai.eu | 77fdd00a9e856e7f.vercel-dns-017.com |

IONOS zone `graphai.eu`:

1. Type: CNAME
2. Host: `jobs2`
3. Value: the exact hostname Vercel shows for this project (expect `*.vercel-dns-0xx.com`)
4. TTL: 3600

`cname.vercel-dns.com` is fallback only if the Vercel UI still shows it. Do not invent a jobs2 hash before the project exists.
