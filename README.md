# Fore the Record

## Project purpose

Fore the Record is a web application for recording golf rounds and tracking a player's World Handicap System (WHS) Handicap Index over time. Players can create or securely claim a profile, find golf courses and tees, enter scorecards and playing conditions, and review which rounds contribute to their current handicap.

## Technology stack

- **Frontend:** React, Vite, and TypeScript
- **Backend:** Node.js, Express, and TypeScript
- **Database:** PostgreSQL hosted by Supabase
- **Authentication:** Supabase Auth with verified email and password accounts
- **ORM:** Prisma
- **Testing:** Vitest
- **Package management:** npm workspaces
- **Hosting and deployment:** Vercel
- **Golf course data:** UK Golf Course Data API through RapidAPI, with a fallback lookup for supported club websites

Sensitive values such as database connection strings and API credentials are stored in local environment files and deployment secrets. They must never be committed to the repository.

## Current development status

The project foundation is complete. It includes a React and TypeScript frontend, an Express and TypeScript backend, a tested API health endpoint, and a Prisma schema connected to a Supabase PostgreSQL database. The initial database migration has been created and deployed successfully.

Round-correction support requests can securely reference one of the signed-in player's own rounds. The administrator can open the linked player and exact round directly from the protected queue; deleting that round removes only the reference and preserves its private support conversation.

Support conversations track unread activity separately for the player and administrator. Navigation counts and request markers identify waiting replies, and opening an authorized conversation marks it read for that viewer without changing the other participant's state.

Player support activity is protected by persistent rolling limits of five new requests and twenty replies per hour. Automated scorecard-review requests do not use the player's new-request allowance, and a clear wait message is shown if a limit is reached.

The Profile screen includes a private performance summary with round-type totals, verified scored and counting-round totals, best and average score differentials, and the five most recent verified differentials. Pending and rejected player-entered scorecards cannot distort the official performance figures.

The protected administrator portal includes searchable course catalogue management. The administrator can create and correct clubs, courses, rated tees, and complete hole-by-hole scorecards. Referenced records cannot be deleted, and tee ratings, par, and scorecards are locked once a round uses that tee so historical handicap results remain stable.

The Rounds screen includes a Handicap Index journey for the latest 20 verified eligible rounds. Round Entry calculates Front 9, Back 9, and complete totals automatically, and saved History rounds can be expanded to inspect every recorded hole and score-to-par result.

Round History can be filtered by club, course, tee, competition text, round type, Handicap Index counting status, scorecard status, and inclusive playing dates. Filters can be combined and cleared together while each result keeps its original position in the player's record.

Players can add a private note while recording any individual or team round, then read, edit, clear, or search that note from Round History. Notes remain inside the authenticated player's record and never affect scoring or Handicap Index calculations.

Account Settings includes privacy choices for player discovery, new friend requests, Handicap Index visibility, and sharing limited round activity with accepted friends. Players can download a JSON copy of their own Fore the Record data and permanently delete a non-administrator account after password verification and exact email confirmation.

Fore the Record can be installed from a supported browser and launched from a phone's Home Screen. The app offers an install action when the browser supports it; on iPhone and iPad, players can use Safari's Share menu and Add to Home Screen. Installation does not make private rounds available offline: the service worker keeps only a public reconnect page and never caches authenticated API responses or personal data.

Signed-in players can open Account Settings from Profile to change their displayed name, request a confirmed sign-in email change, or securely update their password. Sensitive changes require the current password, duplicate profile emails are blocked, and passwords never pass through the Fore the Record API.

The Friends screen lets signed-in players find active profiles by first or last name, distinguish matching names by home club, and exchange friend requests. Accepted friends can see a newest-first feed of limited verified round summaries when the player has enabled activity sharing. Handicap visibility remains a separate privacy choice, while email addresses, notes, full hole scores, pending scorecards, and account details stay private.

The Profile screen includes private Player Goals for Handicap Index, lowest gross score, rounds played, lifetime birdies, and lifetime pars. Players can optionally choose a target date, replace an existing target, or remove it. Progress is calculated automatically from verified playing records and the current Handicap Index rather than stored as an editable counter.

The application features are still under development. Core profile, authentication, course catalogue, scorecard, round-history, handicap, support, social, privacy, goal, milestone, and administrator workflows are implemented. Authenticated API requests derive ownership from the verified Supabase session rather than trusting a browser-supplied profile ID.

Round Entry supports casual rounds, individual competitions, and record-only team competitions. Individual cards can use Stroke play or Stableford scoring. Stableford stores the Playing Handicap used, allocates strokes by the approved hole indexes, calculates every hole's net score and points, and supports explicit picked-up holes. A pickup records zero points and no invented gross score; Net Double Bogey is used only for handicap processing. Manually supplied course definitions remain provisional until administrator approval.

Individual rounds can now be recorded over 18 holes or a selected Front 9 or Back 9. Nine-hole cards retain their gross, adjusted, and Stableford totals, appear clearly in History, contribute their actual holes, shots, and recorded yardage to lifetime totals, and can be corrected by the administrator. They remain outside the Handicap Index until Fore the Record can apply the official WHS expected-differential process; the application never estimates a nine-hole rating by halving an 18-hole value.

The production application is deployed on Vercel. The current RapidAPI allowance cannot support a full catalogue import, so catalogue searches use saved data first and make bounded provider checks only after a miss.

## Roadmap and releases

The current application version is `0.28.0`. Fore the Record uses a shared application version and keeps user-facing release notes separate from developer-only changes:

- [Product roadmap](docs/ROADMAP.md)
- [Versioning and release process](docs/VERSIONING.md)
- [Versioned changelog](CHANGELOG.md)
- [Administrator guide](docs/ADMIN.md)
- [Course catalogue import guide](docs/COURSE-CATALOGUE.md)

The signed-in **What's New** section explains useful changes in non-technical language without showing version numbers or exposing internal development details.

## Authentication setup

In the Supabase dashboard:

1. Enable the Email authentication provider and keep email confirmation required.
2. Set the production Site URL to `https://fore-the-record.vercel.app`.
3. Add `http://localhost:5173/**` and `https://fore-the-record.vercel.app/**` to the allowed redirect URLs.
4. Configure a production SMTP provider before inviting real users; Supabase's default sender is intended only for limited testing and has a low project-wide email limit.

Keep email confirmation enabled. Existing-profile claiming relies on a verified email address to prove ownership, so disabling confirmation would make that flow insecure. If Supabase reports that too many emails were requested, wait for the testing allowance to reset or finish the custom SMTP setup below.

For custom SMTP, obtain a host, port, username, password, verified sender address, and sender name from an email provider. In Supabase, open the Authentication settings, enable Custom SMTP, enter those provider values, and save. SMTP credentials are configured in Supabase and must never be committed to this repository or placed in a `VITE_` variable. After SMTP is enabled, review the project's Authentication rate limits for the expected traffic level. See the [Supabase SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp) and [Auth rate-limit reference](https://supabase.com/docs/guides/auth/rate-limits).

Copy the Supabase project URL and publishable key into both `server/.env` and `client/.env.local` using the names shown in their `.env.example` files. The publishable key is designed for browser use.

Administrator account management also requires a Supabase secret key in `server/.env` as `SUPABASE_SECRET_KEY`. Create or copy the server-side secret from the Supabase project API Keys settings. Never use this key in the client, expose it through a `VITE_` variable, paste it into source control, or share it in support messages. The key lets the protected server invite, update, suspend, and delete Supabase Auth users; the browser never receives it.

Existing profiles have a nullable `authUserId`. Apply the included migration before testing account creation or claiming:

```bash
npm run db:deploy --workspace server
```

## Deployment

The production application is available at [fore-the-record.vercel.app](https://fore-the-record.vercel.app).

Vercel builds the Vite client and serves the Express API through the `/api` route. The following environment variables must be configured for both Preview and Production deployments:

- `DATABASE_URL`
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`
- `RAPIDAPI_SEARCH_PATH`
- `RAPIDAPI_SEARCH_QUERY_PARAM`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

The database connection, RapidAPI values, and Supabase secret key are secrets and must never be committed. The Supabase publishable key is intentionally public, but it should still be managed as configuration rather than hardcoded.

Apply database migrations before deploying the application. The v0.9.0 migration adds active/suspended player status and compatible update timestamps; existing accounts remain active. Do not run the full RapidAPI import on the current 200-request plan. Course and scorecard provider calls use the quota-safe, on-demand process documented in the [course catalogue guide](docs/COURSE-CATALOGUE.md).

Deploy the current branch to Production with:

```bash
npx --yes vercel@59.10.0 deploy --prod --yes
```
