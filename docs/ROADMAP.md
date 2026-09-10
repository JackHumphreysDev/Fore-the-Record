# Product roadmap

This roadmap records agreed future work. Items are planned requirements, not completed features. Each feature should still receive its own branch, tests, review, version decision, and pull request.

## Suggested delivery order

1. Custom domain and production email delivery.
2. Admin-role and audit-log foundation. Completed in `0.2.0`.
3. Admin portal. Read-only monitoring completed in `0.3.0`; guarded account management completed in `0.9.0`; audited round correction and deletion completed in `0.10.0`.
4. User submissions and admin messaging. Submission foundation completed in `0.4.0`; private conversations and audited resolution controls completed in `0.5.0`; active and archived administrator queues completed in `0.8.1`; linked round-correction requests completed in `0.12.0`; unread indicators completed in `0.13.0`; rate limiting completed in `0.13.1`.
5. Course catalogue and database-backed search. Import tooling, search, and quota-safe on-demand additions completed in `0.6.0`; a full production data load requires a future RapidAPI plan change.
6. Hole-by-hole scorecards and administrator approval. Completed in `0.7.0`.
7. Competition, casual, individual, and team round records. Completed in `0.8.0`.
8. User-facing **What's New** section. Completed in `0.11.0`.
9. Player performance summary. Completed in `0.14.0`.
10. Admin course catalogue management. Completed in `0.15.0`.
11. Round insights, including the Handicap Index progression chart, automatic nine-hole totals, and expandable history scorecards. Completed in `0.16.0`.
12. Favourite courses and default tees. Completed in `0.17.0`.
13. Personal milestones. Completed in `0.18.0`.
14. Account settings. Completed in `0.19.0`.
15. Friends and player connections. Completed in `0.20.0`.
16. Player goals. Completed in `0.21.0`.
17. Round-history filters.
18. Round notes.
19. Email notifications. Production delivery depends on the future custom domain and email configuration.
20. Privacy and account controls.
21. Installable mobile app.

The order may change as product needs become clearer, but security and data ownership must be implemented before administrative editing tools.

## Player goals — completed in 0.21.0

The signed-in Profile lets each player maintain one target for Handicap Index, lowest verified gross score, total rounds played, lifetime birdies, and lifetime pars. Targets can include an optional date and can be replaced or removed. Current values, completion states, and progress percentages are calculated from the player's private verified round history, current Handicap Index, and existing milestone rules. Goal records are owned through the authenticated profile boundary and cannot be read or changed by another player.

## Friends and player connections — completed in 0.20.0

Signed-in players can search active, linked profiles by first or last name and use the displayed home club to distinguish people with the same name. A player can send one direction-independent request, accept or decline an incoming request, cancel an outgoing request, and remove an accepted friend. Search and connection cards show only the player's name, home club, and current Handicap Index; email addresses, rounds, and private statistics remain hidden. Self-connections, duplicate relationships, suspended profiles, and unlinked profiles are refused by the server.

## Account settings — completed in 0.19.0

Signed-in players can open a dedicated Account Settings screen from Profile and change their displayed full name, confirmed sign-in email, or password. Sensitive changes require the current password. Email changes keep the current address active until the secure confirmation process is complete, after which the verified authentication identity is synchronised to the same player profile. Duplicate application emails are refused. Passwords are sent only to the authentication provider and are never accepted or stored by the Fore the Record API.

Account deletion remains reserved for the separate privacy and account-controls feature. Friend connections and notification preferences also remain separate roadmap items.

## Favourite courses and default tees — completed in 0.17.0

Players can save shared catalogue courses to a private favourites list and choose one optional default tee for each. The Courses screen keeps favourites above catalogue search and allows the default to be changed or cleared. Round Entry prioritizes matching favourites and automatically selects their saved default tee while retaining the ability to choose another tee for any round. The server derives ownership from the verified session and verifies that every selected default tee belongs to its course.

## Personal milestones — completed in 0.18.0

The signed-in Profile derives lifetime achievements from the player's existing rounds without storing editable counters. It shows total holes, shots, recorded yards, eagles, birdies, pars, and bogeys; lowest gross score, score differential, and historical Handicap Index; and dated progress achievements for round totals, the first eligible counting round, the first individual competition, and gross-score thresholds. Scoring totals exclude team rounds and unverified scorecards. Yardage uses only saved hole distances and does not estimate missing data.

## Administrator course catalogue management — completed in 0.15.0

The protected administrator portal can search and maintain clubs, courses, rated tees, and complete 18-hole scorecards. Creates, edits, scorecard replacements, and deletes are audited. Permanent removal requires typed confirmation and is refused while a record is referenced. Once a round uses a tee, its ratings, par, and scorecard remain immutable so existing differentials and Handicap Index history cannot change silently; safe descriptive and distance corrections remain available.

## Round insights — completed in 0.16.0

The Rounds screen plots the latest 20 verified acceptable individual rounds with each score differential, whether it counted at that point, and the Handicap Index produced after that round. Historical values are rebuilt using the central handicap calculator and enough preceding rounds to preserve the correct 20-round window. Round Entry shows automatic Front 9, Back 9, and overall totals, while each History card can reveal the saved hole scores, pars, stroke indexes, score-to-par values, and nine-hole summaries. Team rounds and legacy records without a complete card show a clear unavailable state.

## Player performance summary — completed in 0.14.0

The signed-in Profile screen summarizes total, casual, individual competition, team competition, verified scored, and currently counting rounds. It also shows the player's current Handicap Index, best and average verified acceptable score differentials, and their five most recent eligible differentials. Pending, rejected, team, and otherwise unacceptable rounds remain in the record totals but cannot distort the scoring figures. All summary data is derived through the authenticated player's server-side ownership boundary.

## Full course catalogue — tooling completed in 0.6.0

### Goal

Make all available RapidAPI clubs, courses, and rated tee sets searchable without spending a provider request every time a player uses the site.

### Delivery status

Version `0.6.0` adds the database fields, migration, resilient import command, paginated catalogue APIs, searchable home-club picker, separate club/course search, missing-course route, and bounded round-entry tee search. The current 200-request monthly plan cannot support the approximately 2,802-request production data load. Instead, **Search catalogue** checks the provider only after an unsuccessful database search, previews the result, and saves all new rated tees for future database-only searches. A full import remains deferred until the provider plan changes.

### Safeguards

- Keep RapidAPI credentials on the server and never expose them in browser code.
- Default the importer to dry-run and require `--write` for database changes.
- Upsert provider records and safely attach matching legacy records so repeat or resumed runs do not duplicate data or break existing rounds.
- Validate provider response shapes before persisting them.
- Retry temporary rate-limit and server failures without logging credentials.
- Paginate player searches and load only matching tees during round entry.
- Call the provider only after a database miss and show the possible two-request cost beside the search action.
- Show all club candidates from the first provider page and retrieve courses only after the player chooses one.
- Persist successful on-demand results so ordinary searches do not repeatedly spend provider requests.
- Treat the production migration and full catalogue import as separate operations.

## Hole-by-hole scorecards — completed in 0.7.0

Players now submit a declared total gross score and all 18 hole scores. The running total must match before submission. Saved or provider scorecards supply read-only par, stroke index, and available yardage. If no complete card exists, the player supplies par and stroke index while yardage remains optional.

Only player-defined scorecards enter review. Their rounds are stored with a provisional differential but remain outside the Handicap Index until an administrator approves the definition. The administrator can amend par, stroke index, and yardage, but cannot change the player's strokes. Approval saves the reusable tee scorecard and recalculates the round, counting flags, and Handicap Index; rejection leaves the round excluded.

## Versioned releases and What's New

### Goal

Maintain a professional version history for development while giving players a simple explanation of new features.

### Requirements

- Use the shared application version and release process defined in [`VERSIONING.md`](VERSIONING.md).
- Record user-facing and developer/admin changes separately in [`../CHANGELOG.md`](../CHANGELOG.md).
- Add an in-app **What's New** section or tab containing plain-language feature summaries and release dates.
- Do not require a version number to appear in the player-facing section.
- Never show internal database, infrastructure, security, dependency, or refactoring notes to ordinary users.

### Delivery status

Version `0.11.0` adds a signed-in **What's New** navigation tab with curated, newest-first release dates and plain-language summaries. Its browser content is maintained separately from the complete developer changelog so internal changes and version numbers are not exposed to players.

## Admin-role foundation — completed in 0.2.0

### Goal

Give the project owner controlled administrative access without making an email address the authorization mechanism.

### Requirements

- Add a server-verified role such as `PLAYER` or `ADMIN` to the application user record.
- Assign the owner's existing verified account as the first administrator through a controlled database or migration step.
- Use the authenticated account ID and database role for every authorization decision. An email comparison or hidden navigation item is not sufficient security.
- Protect every admin API route on the server and test both allowed and denied access.
- Add an audit log recording the administrator, action, target record, timestamp, and safe before/after details.
- Never expose passwords, access tokens, database credentials, or authentication secrets in the portal.

## Admin portal — round management completed in 0.10.0

### Goal

Allow authorized administrators to monitor and maintain player data.

### Delivery status

Version `0.3.0` provides protected operational totals, recent registrations, and paginated user search. Version `0.9.0` adds secure player invitations, safe name/email editing, linked Auth synchronization, suspension/restoration, and confirmation-gated permanent deletion. Version `0.10.0` adds paginated round inspection, safe score and metadata correction, guarded deletion, full Handicap Index recalculation, and audit history. The sole administrator remains protected and unrestricted user impersonation remains out of scope.

### Capabilities

- View operational summaries such as total users, recent registrations, submissions awaiting review, and recent rounds.
- View and search users.
- Create users through a secure invitation flow or edit appropriate profile fields. Completed in `0.9.0`.
- Suspend, restore, or permanently delete a user account when necessary. Completed in `0.9.0`.
- Review a user's rounds and current Handicap Index. Completed in `0.10.0`; a combined saved-course view remains optional future work.
- Correct or remove a round when necessary. Completed in `0.10.0`.
- Reply to user submissions and update their status.

### Safety requirements

- Prefer suspension or soft deletion over immediate permanent deletion.
- Require clear confirmation and an audit record before permanent deletion.
- Never let an administrator choose or view another user's password; account creation should send the user a secure invitation.
- Do not build account impersonation in the first version.
- Recalculate affected handicap values transactionally after an administrator changes or removes a counting round.
- Preserve an audit record for every administrative change.
- Add pagination and filters rather than loading every user and round at once.

## User submissions and admin messaging — messaging completed in 0.5.0

### Goal

Give signed-in players one place to report problems, suggest improvements, request data corrections, and submit missing courses.

### Delivery status

Version `0.4.0` added player submission creation, private player history, structured missing-course details, and a protected read-only administrator queue with search, filters, and pagination. Version `0.5.0` added private player and administrator replies, audited administrator status changes, and closed-thread safeguards. Version `0.8.1` separates active requests from a searchable closed archive while retaining the complete conversation and reopening controls. Version `0.12.0` lets a player link one of their own rounds to a data-correction request and lets the administrator open that player's exact round editor directly from the queue. The nullable reference preserves the conversation if the round is deleted. Version `0.13.0` adds participant-specific unread state, request markers, and navigation counts for both players and the administrator. Version `0.13.1` adds persistent player limits of five new requests and twenty replies per rolling hour while excluding automatic scorecard-review requests. Email notifications remain planned.

### Submission types

- `IDEA` — improvement or add-on suggestion.
- `ISSUE` — a problem encountered while using the site.
- `DATA_CORRECTION` — an incorrect profile, course, tee, or round submission.
- `MISSING_COURSE` — a club or course that does not appear in search.

### Requirements

- Add a signed-in **Feedback** or **Support** tab.
- Let a player create a submission and view only their own submissions and replies.
- Give each submission a status such as `NEW`, `IN_PROGRESS`, `RESOLVED`, or `CLOSED`.
- Allow administrators to view, filter, reply to, and update every submission.
- Keep the conversation attached to its original submission rather than creating unrestricted direct messaging.
- Let a data-correction submission reference the affected round, course, or tee when available.
- Ask for club name, town/county, website, course name, and known tee details on missing-course submissions.
- Add server-side length limits, validation, and rate limiting to reduce spam and unsafe content.

## Round classification — completed in 0.8.0

### Goal

Record casual rounds, individual competitions, and team competitions accurately while keeping handicap calculations correct.

### Delivery status

Version `0.8.0` records the round category, participation type, competition
details, player count, date, and time. Casual and individual competition
rounds retain the complete scorecard and handicap workflow. Team competitions
are stored without score fields as history-only records and cannot affect the
Handicap Index.

### Round fields

- Round category: `CASUAL` or `COMPETITION`.
- Participation: `INDIVIDUAL` or `TEAM`.
- Competition name when the round is competitive.
- Competition format, such as medal, Stableford, match play, scramble, or four-ball.
- Number of players or field size.
- Date and time played.
- Whether the round is acceptable for handicap purposes.
- Whether the entry is record-only and therefore has no score differential.

### Handicap rules

- An acceptable individual casual round may count toward the Handicap Index.
- An acceptable individual competition round may count toward the Handicap Index.
- A team competition entry is record-only and must not count toward the official Handicap Index.
- The application must derive handicap eligibility from validated round type and acceptability rules rather than trusting a browser-supplied boolean.

### Entry experience

- Ask whether the player is recording a casual or competition round.
- For a competition, collect the competition name, format, participation type, and number of players.
- Validate the number of players as a positive whole number.
- For an individual round, continue collecting the score information required for handicap calculation.
- For a team round without an individual total gross score, allow the player to select **Team competition / record only** and save the course, tee when relevant, competition details, date, and time without a gross score.
- Clearly label history entries as **Casual**, **Individual competition**, or **Team competition**.
- Show team competition entries in golf history without a score differential, counting-round badge, or Handicap Index effect.

### Data and calculation safeguards

- Make score fields nullable only for explicitly validated record-only entries.
- Reject a handicap-eligible individual round that lacks the required score and rating data.
- Re-run handicap calculation only from acceptable scored individual rounds.
- Update existing history and calculation tests before migrating stored round data.

## Custom domain and production email

- Secure a project domain.
- Configure DNS records for the site and a transactional email provider.
- Verify a sender such as `no-reply@the-project-domain`.
- Configure the provider's SMTP credentials directly in Supabase.
- Keep email confirmation enabled because profile claiming depends on verified email ownership.
- Test signup confirmation, password recovery, delivery failure handling, and provider rate limits before inviting real users.
