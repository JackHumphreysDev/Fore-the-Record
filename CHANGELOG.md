# Changelog

This file is the versioned development record for Fore the Record. It includes user-facing releases and internal engineering changes. The in-app **What's New** section will use only the plain-language user-facing entries and will not need to display version numbers.

The project follows the release process in [`docs/VERSIONING.md`](docs/VERSIONING.md).

## Unreleased

### User-facing changes

- No unreleased changes yet.

### Developer and admin changes

- No unreleased changes yet.

## 0.9.0 - 2026-09-02

### User-facing changes

- Added secure administrator invitations that let invited players choose their own password from the email link.
- Added a clear suspended-account response when a suspended player attempts to use the application.

### Developer and admin changes

- Added a protected administrator player directory for secure invitations and safe name/email editing.
- Added player suspension and restoration in both Supabase Auth and the application API access gate.
- Added confirmation-gated permanent deletion that requires prior suspension and removes the player's login and associated application records.
- Protected the sole administrator account from editing, suspension, or deletion.
- Added server-only Supabase secret-key configuration; the browser never receives the administrator key and the administrator never chooses or sees player passwords.
- Added audit records for invitations, profile changes, suspension, restoration, and deletion without recording secrets.
- Added migration, provider-operation, validation, suspended-session, account-lifecycle, sole-admin, and client response-contract regression coverage.

## 0.8.1 - 2026-09-02

### User-facing changes

- No player-facing changes in this release.

### Developer and admin changes

- Changed the administrator support queue to show only active requests by default.
- Added a separate closed-request archive that can be searched by request details, course information, player name, or player email and filtered by request type.
- Made closed requests leave the active queue immediately and reopened requests leave the archive immediately.
- Preserved complete closed conversations and existing audited status changes rather than deleting support history.
- Added regression coverage for the default active queue and searchable closed archive.

## 0.8.0 - 2026-09-02

### User-facing changes

- Added clear choices for casual rounds, individual competitions, and team competitions during round entry.
- Added competition name, format, number of players, and time played to competition records.
- Allowed team competitions to be saved without a gross score or hole-by-hole card.
- Labelled every history entry by round type and displayed competition details in plain language.
- Kept team competitions in the player’s golf history without changing their Handicap Index.

### Developer and admin changes

- Added server-derived round category and participation rules instead of accepting a browser-supplied handicap-eligibility flag.
- Added nullable score fields exclusively for validated team record entries, backed by database consistency constraints.
- Added a `NOT_REQUIRED` scorecard status for team competitions and excluded those entries from all handicap calculations.
- Preserved every existing round as a casual individual round through compatible migration defaults.
- Added API, persistence, history serialization, null-safety, and client response-validation regression coverage.

## 0.7.0 - 2026-09-01

### User-facing changes

- Added required 18-hole scorecard entry alongside the signed total gross score when recording a round.
- Added a running hole total and a clear difference warning that prevents submission until the hole scores match the declared total.
- Loaded saved or provider hole data for the selected tee, showing par, stroke index, and available yardage while the player enters only their strokes.
- Allowed players to enter missing par and stroke-index details themselves, with yardage remaining optional.
- Marked player-entered scorecards as awaiting review and kept their provisional rounds out of the Handicap Index until approval.
- Added scorecard-review status to round history so players can see when a card is pending or rejected.

### Developer and admin changes

- Added tee-specific canonical hole definitions, manual scorecard review records, review-hole data, and round scorecard statuses.
- Added a quota-conscious `GET /courses/{course_id}/scorecard` provider integration that validates complete 18-hole cards and saves successful results for reuse.
- Preserved provider club, course, and tee identifiers during on-demand catalogue saves so the correct tee scorecard can be retrieved.
- Added a protected administrator scorecard queue with editable par, stroke index, and optional yardage fields while keeping player strokes read-only.
- Added audited approve/amend/reject actions. Approval replaces only the scorecard definition, recalculates the saved round and player Handicap Index, and never changes entered strokes.
- Added migration, provider-normalisation, validation, caching, scorecard persistence, pending-review, and administrator-queue regression coverage.

## 0.6.0 - 2026-09-01

### User-facing changes

- Replaced the home-club dropdown with a partial-name search across the imported club catalogue.
- Added separate club and course search fields with paginated results and complete tee rating details.
- Made **Search catalogue** automatically check provider club names after an unsuccessful database search, with a clear request-allowance warning and a preview before saving.
- Allowed a course-field-only entry to be retried as a possible provider club name, helping misplaced partial names such as `Halla` find Hallamshire Golf Club.
- Added a provider club-choice list so broad partial searches such as `Hall` show every returned candidate instead of silently selecting one club.
- Removed the empty reserved results height that placed provider matches far below the search form.
- Saved all newly found rated tees so later home-club, course, and round-entry searches can reuse them without another provider lookup.
- Added a direct route from an unsuccessful course search to the missing-course support form.
- Added a bounded course-and-tee search to round entry so players do not have to scroll through the complete catalogue.

### Developer and admin changes

- Added normalized provider identifiers and catalogue metadata for clubs, courses, and tee sets while preserving existing round and home-club relationships.
- Added an idempotent, resumable RapidAPI catalogue importer with response validation, retry handling, dry-run-by-default behaviour, bounded runs, and safe progress output.
- Added protected paginated database search endpoints for clubs and courses rather than exposing RapidAPI credentials or spending API calls during ordinary player searches.
- Added a database-first, on-demand import path for the current 200-request monthly plan; provider calls occur only after a saved catalogue miss.
- Split provider lookup into one cached club-candidate request and one selected-club course request, avoiding a course request for every partial match.
- Strengthened tee identity and persistence so same-name tees with different course and slope ratings remain separate.
- Added importer, retry, command-option, normalization, pagination, filtering, and client response-contract tests.
- Kept the full production import disabled while the current plan cannot support the approximately 2,802 required requests.

## 0.5.0 - 2026-08-31

### User-facing changes

- Added private conversation threads to support requests so players can provide more information when asked.
- Added administrator replies within the original request instead of creating unrestricted direct messages.
- Added visible request progress through New, In progress, Resolved, and Closed statuses.
- Locked closed conversations while allowing the administrator to reopen them when further discussion is needed.

### Developer and admin changes

- Added a relational submission-message model that records the verified sender for every reply.
- Added ownership-protected player conversation endpoints and administrator-protected reply endpoints.
- Added administrator controls for resolving, closing, reopening, and otherwise updating submission status.
- Added audit records for administrator replies and changed statuses without copying support-message text into the audit log.
- Added reply validation plus cross-account, closed-thread, administrator-authorization, audit, response-shape, and client path tests.
- Kept profile and round administration read-only and deferred email notifications until production email delivery is configured.

## 0.4.0 - 2026-08-31

### User-facing changes

- Added a signed-in **Support** tab for sharing ideas, reporting site problems, flagging incorrect information, and submitting missing golf courses.
- Added structured club, location, website, course, and tee-detail fields for missing-course requests.
- Added a private request history so each player can follow the status of only their own submissions.

### Developer and admin changes

- Added database-backed submission types and statuses with profile ownership and indexed administrator filtering.
- Added server-side field validation, length limits, and safe website URL validation.
- Added authenticated creation and player-history endpoints that derive ownership from the verified session.
- Added a protected, read-only administrator request queue with search, status and type filters, and pagination.
- Added validation, ownership, administrator access, filtering, and response-shape tests.
- Deferred administrator replies and status changes to a future audited mutation release.

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
