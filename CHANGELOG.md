# Changelog

This file is the versioned development record for Fore the Record. It includes user-facing releases and internal engineering changes. The in-app **What's New** section will use only the plain-language user-facing entries and will not need to display version numbers.

The project follows the release process in [`docs/VERSIONING.md`](docs/VERSIONING.md).

## Unreleased

### User-facing changes

- No unreleased changes yet.

### Developer and admin changes

- No unreleased changes yet.

## 0.3.0 - 2026-08-31

### User-facing changes

- No player-facing changes in this release.

### Developer and admin changes

- Added a responsive read-only portal visible only to the authorized administrator.
- Added operational totals for profiles, recorded rounds, and saved clubs.
- Added a recent-registration view and a paginated player directory searchable by name or email.
- Kept all portal data behind server-side administrator authorization and limited responses to safe profile fields.
- Added API authorization, overview, pagination, search, and client response-validation tests.

## 0.2.0 - 2026-08-31

### User-facing changes

- No player-facing changes in this release.

### Developer and admin changes

- Added database-backed `PLAYER` and `ADMIN` roles without using email addresses for runtime authorization.
- Enforced a single site-wide administrator in both the bootstrap command and PostgreSQL.
- Added a reusable server guard and protected administrator identity endpoint.
- Added an audit-log foundation for future administrative changes.
- Added a one-time, transactionally audited command for promoting an existing claimed profile to administrator.
- Added allowed, denied, unlinked-account, promotion, and idempotency tests for the administrator foundation.

## 0.1.0 - 2026-08-31

### User-facing changes

- Created the initial Fore the Record application and responsive visual design.
- Added secure email-and-password registration, existing-profile claiming, sign-in, sign-out, persistent sessions, and password recovery.
- Added full and partial golf-club search, course and tee selection, and a saved course library.
- Added home-club selection and removal.
- Added total-score round entry with weather and playing-condition details.
- Added round history, score differentials, counting-round markers, and the current Handicap Index.
- Added clear authentication validation and rate-limit guidance.

### Developer and admin changes

- Added the React and TypeScript client, Express and TypeScript API, Prisma ORM, and Supabase PostgreSQL database.
- Added Supabase Auth token verification and server-derived profile ownership for protected API requests.
- Added RapidAPI course lookup with normalization, caching, and supported fallback data retrieval.
- Added transactional round storage and automatic handicap recalculation.
- Added database migrations for the initial data model and authenticated profile links.
- Added automated client and server tests, linting, production builds, deployment type-checking, and Vercel deployment.
- Established a shared versioning policy, versioned changelog, and structured product roadmap.
