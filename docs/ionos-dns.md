# IONOS DNS for jobs2.graphai.eu

Vercel project `jobs2-graphai-eu` is attached. IONOS zone `graphai.eu` still uses `ns*.ui-dns.*`. Add this record:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `jobs2` | `736f705838303748.vercel-dns-016.com` | 3600 |

Do not switch the zone to Vercel nameservers (that would take `graphai.eu` off IONOS).

Live siblings for comparison:

| Host | CNAME |
| --- | --- |
| grok.graphai.eu | 4b60e832bf51d69d.vercel-dns-013.com |
| jobs.graphai.eu | 77fdd00a9e856e7f.vercel-dns-017.com |
| jobs2.graphai.eu | 736f705838303748.vercel-dns-016.com (pending IONOS) |

Until DNS propagates, production is https://jobs2-graphai-eu.vercel.app
