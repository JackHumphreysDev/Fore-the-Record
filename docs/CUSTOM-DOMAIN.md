# Custom domain cutover: foretherecord.co.uk

Status: repository configuration prepared on `codex/custom-domain`. Both domains are attached to the correct Vercel project: the apex serves Production, and `www` redirects permanently to the apex. Both Cloudflare CNAME records were saved on 30 September 2026, and Vercel reports **Valid Configuration** for both hosts. The apex website loads over HTTPS; `www` redirects to the apex and preserves path and query string. Supabase's Site URL and redirect allowlist were updated on 1 October 2026. Account-flow acceptance checks remain pending.

`foretherecord.co.uk` is registered with Cloudflare. Use `https://foretherecord.co.uk` as the canonical website and future iOS API origin. Point `www.foretherecord.co.uk` at Vercel too; the host-specific permanent redirect in `vercel.json` sends it to the apex hostname while retaining the path. Keep `https://fore-the-record.vercel.app` available during transition.

## 1. Vercel project

The repository is linked to the Vercel project named `fore-the-record` (local project ID `prj_BoPNhsHKUQrChsgwR2HXMqkogRkd`). In that project's **Settings → Domains**, `foretherecord.co.uk` is connected to Production and `www.foretherecord.co.uk` has a 308 redirect to the apex. Both hosts have passed DNS and certificate validation. Do not use the `--force` option or reassign a domain from another project without inspecting why it is there.

Use the existing Vercel project and deployment. No additional Vercel project, Vercel domain purchase, or Vercel nameserver change is needed. The project retains its existing Supabase and database environment variables.

## 2. Cloudflare DNS

In Cloudflare **DNS → Records**, create these exact records shown by Vercel on 30 September 2026:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `@` | `46ef121c80d26d5a.vercel-dns-017.com` | DNS only |
| CNAME | `www` | `46ef121c80d26d5a.vercel-dns-017.com` | DNS only |

Cloudflare's CNAME flattening supports the apex CNAME. Vercel currently requests no TXT ownership record; add one only if its domain screen later shows it. Avoid conflicting A/AAAA/CNAME records for either host; preserve unrelated MX, SPF, DKIM, DMARC and other email records.

Both records above are saved in Cloudflare as **DNS only**. Cloudflare's DNS list showed no other records at the time of setup.

Set the web records to **DNS only** (grey cloud) for this Vercel setup. Cloudflare remains the registrar and DNS provider; Vercel serves HTTPS and application traffic. Do not enable Cloudflare redirects, caching rules or proxying for these hosts during the cutover. Review the Cloudflare/Vercel combination before changing that later.

## 3. Supabase authentication

Supabase Auth's production **Site URL** is `https://foretherecord.co.uk`. Its redirect allowlist contains `https://foretherecord.co.uk/**`, the old `https://fore-the-record.vercel.app/**`, and `http://localhost:5173/**`; all were verified after reloading the dashboard. Email confirmation, password reset and email change currently derive their return URLs from `window.location.origin`; administrator invitations derive their return URL from the request origin. Verify each flow from the new hostname.

The domain alone does not configure outbound email. A verified SMTP sender and its Cloudflare DNS records are a separate step before inviting real users at scale. For the iOS app, add only the native callback/Universal Link configuration actually chosen for that app; it is not part of this web-domain cutover.

## 4. Deploy and acceptance

Merge/deploy the branch to Production only after the domain and DNS records are associated with the correct project. Then check:

- `foretherecord.co.uk` and `www.foretherecord.co.uk` both show **Valid Configuration** in Vercel; HTTPS certificates are issued.
- `https://foretherecord.co.uk/` loads the site and an application deep link reloads correctly.
- `https://www.foretherecord.co.uk/` redirects permanently to the apex hostname; a path and query string survive.
- `https://foretherecord.co.uk/api/health` returns the expected API health response.
- Existing accounts can sign in. Confirmation, reset, email-change and administrator invitation links return to the intended hostname and complete successfully.
- A player can start, save, resume and submit a draft. History and profile still load. Existing `vercel.app` access remains available while old links expire.
- Installed browser copies from the old origin are treated as separate installs; communicate that users should sign in or reinstall from the new domain.

Useful read-only checks after configuration: `dig +short foretherecord.co.uk CNAME`, `dig +short www.foretherecord.co.uk CNAME`, and `curl -I https://foretherecord.co.uk/`. Cloudflare may flatten the apex response to A/AAAA records; Vercel's **Valid Configuration** status and successful HTTPS check are the decisive signals. Do not publish the domain as the primary production URL in user-facing copy until these checks pass.

## Rollback

If authentication or API checks fail, leave the old Vercel URL available, restore Supabase's previous Site URL and keep both old/new redirect URLs permitted until the issue is resolved. Correct Vercel/DNS assignment; avoid deleting account data or deploying an unrelated rollback. The `www` redirect is scoped to that host and has no effect on the old Vercel URL.

References: [Vercel domain setup](https://vercel.com/docs/domains/set-up-custom-domain), [Vercel redirects](https://vercel.com/docs/project-configuration/vercel-json), [Cloudflare proxy status](https://developers.cloudflare.com/dns/proxy-status/), [Vercel on Cloudflare proxying](https://vercel.com/kb/guide/cloudflare-with-vercel), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
