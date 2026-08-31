# Administration

Version `0.2.0` established administrator authorization and auditing. Version `0.3.0` added the first read-only portal, and version `0.4.0` adds read-only support-request review. These releases do not add user, round, or submission mutation controls.

## Security model

- Supabase Auth verifies the signed-in account and supplies its account ID.
- The API finds the linked application profile by `authUserId`.
- A protected admin route requires that profile's database role to be `ADMIN`.
- A database constraint permits no more than one `ADMIN` profile across the site.
- Email addresses are not used for authorization after the one-time bootstrap.
- Ordinary players and authenticated accounts without a linked profile receive the same `403` response.
- Future administrative mutations must write a safe audit record in the same database transaction as the change.
- Audit details must never contain passwords, tokens, connection strings, or other secrets.

## Promote the first administrator

The promotion command is intentionally local and one-time. Do not add `ADMIN_EMAIL` to Vercel.

Before running it, the owner must already have registered, confirmed their email, and created or claimed the matching Fore the Record profile.

1. Apply the role and audit-log migration:

   ```bash
   npm run db:deploy --workspace server
   ```

2. Temporarily add the existing profile email to `server/.env`:

   ```dotenv
   ADMIN_EMAIL="owner@example.com"
   ```

3. Run the transactionally audited promotion:

   ```bash
   npm run admin:promote --workspace server
   ```

4. Remove `ADMIN_EMAIL` from `server/.env`. Running the command again for the same profile is safe: the administrator remains unchanged and no duplicate promotion audit record is written. Trying to promote another profile is rejected by both the command and the database.

## Protected endpoints

`GET /api/admin/me` is the first route behind the administrator guard. A verified administrator access token receives the administrator's safe profile identity. A signed-in non-administrator receives `403 Administrator access required`, and a request without a verified session receives `401 Authentication required`.

`GET /api/admin/overview` returns profile, round, and saved-club totals plus the five most recent registrations.

`GET /api/admin/users` returns safe, paginated profile details. Its optional `search` query matches names and emails; `page` and `pageSize` control pagination, with a maximum page size of 50.

`GET /api/admin/submissions` returns safe, paginated support requests with their submitting profile identity. Its optional `search` query matches request text, course details, player names, and player emails. The `status` and `type` queries use the documented submission enums; `page` and `pageSize` control pagination, with a maximum page size of 50.

The browser shows the **Admin** navigation item only after `/api/admin/me` confirms access. This is a convenience for the administrator, while the server guard remains the security boundary. The portal is intentionally read-only and exposes no password, token, authentication-secret, or mutation fields. Submission replies and status changes remain deferred until they can be implemented as authorized, audited mutations.

Every future `/api/admin/...` route must remain behind this server guard. Hiding a client navigation item is useful presentation, but it is not authorization.
