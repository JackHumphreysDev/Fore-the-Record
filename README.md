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

The application features are still under development. The core handicap calculation domain logic, backend profile creation and retrieval, two-tier backend course ratings lookup, course and tee persistence, transactional round logging with scorecard capping and automatic handicap recalculation, the round-history API, and the frontend authentication, course-search, total-score round-entry, round-history, and support-request flows are implemented. Supabase Auth provides email-and-password registration, existing-profile claiming through verified email ownership, login, logout, persistent sessions, and password recovery. Authenticated API requests derive profile ownership from the verified access token rather than trusting a browser-stored profile ID. Players can choose or remove their home club from clubs already saved in the course library. The history view lists rounds newest first, displays score and course details, and identifies the rounds used in the current Handicap Index. Signed-in players can submit ideas, site issues, data corrections, and missing-course details, then view only their own request history and status. The sole administrator has a protected read-only portal with operational totals, recent registrations, paginated player search, and a searchable, filterable support-request queue. The production application is deployed on Vercel. Total-score entry uses gross score as adjusted gross score because Net Double Bogey capping requires a complete hole-by-hole scorecard.

## Roadmap and releases

The current application version is `0.4.0`. Fore the Record uses a shared application version and keeps user-facing release notes separate from developer-only changes:

- [Product roadmap](docs/ROADMAP.md)
- [Versioning and release process](docs/VERSIONING.md)
- [Versioned changelog](CHANGELOG.md)
- [Administrator guide](docs/ADMIN.md)

Future releases will include a simple in-app **What's New** section for players. It will explain useful changes in non-technical language without requiring version numbers or exposing internal development details.

## Authentication setup

In the Supabase dashboard:

1. Enable the Email authentication provider and keep email confirmation required.
2. Set the production Site URL to `https://fore-the-record.vercel.app`.
3. Add `http://localhost:5173/**` and `https://fore-the-record.vercel.app/**` to the allowed redirect URLs.
4. Configure a production SMTP provider before inviting real users; Supabase's default sender is intended only for limited testing and has a low project-wide email limit.

Keep email confirmation enabled. Existing-profile claiming relies on a verified email address to prove ownership, so disabling confirmation would make that flow insecure. If Supabase reports that too many emails were requested, wait for the testing allowance to reset or finish the custom SMTP setup below.

For custom SMTP, obtain a host, port, username, password, verified sender address, and sender name from an email provider. In Supabase, open the Authentication settings, enable Custom SMTP, enter those provider values, and save. SMTP credentials are configured in Supabase and must never be committed to this repository or placed in a `VITE_` variable. After SMTP is enabled, review the project's Authentication rate limits for the expected traffic level. See the [Supabase SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp) and [Auth rate-limit reference](https://supabase.com/docs/guides/auth/rate-limits).

Copy the Supabase project URL and publishable key into both `server/.env` and `client/.env.local` using the names shown in their `.env.example` files. The publishable key is designed for browser use. Never use the Supabase service-role secret in a client or `VITE_` variable.

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

The database connection and RapidAPI values are secrets and must never be committed. The Supabase publishable key is intentionally public, but it should still be managed as configuration rather than hardcoded.

Deploy the current branch to Production with:

```bash
npx --yes vercel@59.10.0 deploy --prod --yes
```
