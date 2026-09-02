# Administration

Version `0.2.0` established administrator authorization and auditing. Version `0.3.0` added the first read-only portal, version `0.4.0` added support-request review, version `0.5.0` added audited replies and status controls, version `0.7.0` added manual scorecard review, version `0.8.1` separates active support work from a searchable closed archive, and version `0.9.0` adds guarded player-account management. Round management remains read-only outside the existing scorecard-review workflow.

## Security model

- Supabase Auth verifies the signed-in account and supplies its account ID.
- The API finds the linked application profile by `authUserId`.
- A protected admin route requires that profile's database role to be `ADMIN`.
- A database constraint permits no more than one `ADMIN` profile across the site.
- The sole administrator cannot be edited, suspended, or deleted by the account-management routes.
- Email addresses are not used for authorization after the one-time bootstrap.
- Ordinary players and authenticated accounts without a linked profile receive the same `403` response.
- Successful administrative mutations write a safe audit record in the same database transaction as the application data change.
- Audit details must never contain passwords, tokens, connection strings, or other secrets.
- Suspended profiles are blocked by the API even if an already-issued access token has not yet expired.

## Configure account management

Player invitations and Supabase Auth changes require a server-only Supabase secret key. Set `SUPABASE_SECRET_KEY` in `server/.env` for local development and in both Preview and Production on Vercel. Never place this key in `client/.env.local`, use a `VITE_` prefix, or expose it to browser code.

Invitations use Supabase email delivery. Configure production SMTP before inviting real players; the default sender has a low project-wide testing limit. The invite redirects the player back to Fore the Record, where they choose their own password. The administrator never chooses, sees, or receives player passwords.

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

`POST /api/admin/users` sends a secure Supabase invitation and creates or links an active player profile. It accepts only the player's name and email; password input is deliberately unsupported. `PATCH /api/admin/users/:userId` updates safe name and email fields and keeps a linked Auth email synchronized. `PATCH /api/admin/users/:userId/status` suspends or restores a player in both Supabase Auth and the application status gate.

`DELETE /api/admin/users/:userId` is the guarded permanent-delete path. The player must first be suspended and the administrator must type the exact player email. It removes the Supabase Auth login, profile, rounds, scorecard reviews, support requests, and related messages while preserving a non-secret deletion audit record. This action cannot be undone. The sole `ADMIN` profile is rejected by every account-mutation route.

`GET /api/admin/submissions` returns safe, paginated support requests with their submitting profile identity. Without a `status` query it excludes closed requests so completed work does not remain in the active queue. Passing `status=CLOSED` returns the searchable archive. Its optional `search` query matches request text, course details, player names, and player emails. The `status` and `type` queries use the documented submission enums; `page` and `pageSize` control pagination, with a maximum page size of 50.

`GET /api/admin/submissions/:submissionId/messages` returns the ordered conversation for an existing request. `POST` to the same path adds a validated administrator reply unless the request is closed. The audit record notes that a reply was added but deliberately excludes the support-message text.

`PATCH /api/admin/submissions/:submissionId/status` accepts `NEW`, `IN_PROGRESS`, `RESOLVED`, or `CLOSED`. A changed status and its before/after audit record are written in one database transaction. Repeating the current status is safe and does not create duplicate audit noise.

`GET /api/admin/scorecard-reviews` returns unresolved player-entered scorecard definitions with the associated player, tee, round, and locked hole strokes. `PATCH /api/admin/scorecard-reviews/:reviewId` accepts an approval with all 18 corrected hole definitions or a rejection. Approval stores the canonical tee scorecard, recalculates the adjusted gross score, differential, counting rounds, and Handicap Index, and writes an audit record. The player's submitted strokes are never editable or replaced.

Players use the corresponding `/api/submissions/:submissionId/messages` routes. Those routes resolve ownership from the verified authentication account and return `404` for requests belonging to another player. Closed requests remain in the player's private history but cannot receive player or administrator replies until the administrator reopens them. In the administrator portal, closing a request moves it out of **Active requests** and into **Closed archive**; reopening it moves it back.

The browser shows the **Admin** navigation item only after `/api/admin/me` confirms access. This is a convenience for the administrator, while the server guard remains the security boundary. The portal exposes no password, token, authentication-secret, impersonation, or unrestricted round-management fields.

Every future `/api/admin/...` route must remain behind this server guard. Hiding a client navigation item is useful presentation, but it is not authorization.
