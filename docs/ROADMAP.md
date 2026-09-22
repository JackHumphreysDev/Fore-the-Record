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
17. Round-history filters. Completed in `0.22.0`.
18. Round notes. Completed in `0.23.0`.
19. Email notifications. Production delivery depends on the future custom domain and email configuration.
20. Privacy and account controls. Completed in `0.24.0`.
21. Installable mobile app. Completed in `0.25.0`.
22. Stableford scoring with Playing Handicap allocation and picked-up holes. Completed in `0.26.0`.
23. Nine-hole rounds with Front 9 and Back 9 scorecards. Completed in `0.27.0`.
24. Friends activity feed. Completed in `0.28.0`.
25. Scorecard photo. Completed in `0.29.0`.
26. Deeper performance analysis by course, tee, par type, front/back nine, competition type, and date range. Completed in `0.30.0`.
27. More competition formats and social games with optional playing-partner links. Completed in `0.31.0`.
28. Challenges and leaderboards. Completed in `0.32.0`.
29. Shared rounds. Completed in `0.33.0`.
30. Admin reporting and exports. Completed in `0.34.0`.
31. Account security centre. Completed in `0.35.0`.
32. Course personal bests. Completed in `0.36.0`.
33. Match-play scoring. Completed in `0.37.0`.
34. Friends groups and advanced leaderboards. Completed in `0.38.0`.
35. Performance insights. Completed in `0.39.0`.
36. Full team-game scoring.
37. Live Round mode.

The order may change as product needs become clearer, but security and data ownership must be implemented before administrative editing tools.

## Performance insights — completed in 0.39.0

The Rounds screen now turns verified individual play into private form and consistency insights. Stroke Play and Stableford are compared separately over the latest five complete 18-hole rounds and the previous five, with improving, steady, declining, and insufficient-data states. Players can also compare par 3, par 4, and par 5 scoring, complete Front 9 and Back 9 performance, gross-score consistency and range, and their strongest course-and-tee combinations. Every result retains its qualifying sample.

Hole Performance History lets a player choose an exact course, tee, and hole and plot every recorded score in chronological order against par and their personal average. Selecting a point shows its date and score-to-par result and can open the full matching round in History. Team rounds and unverified scorecards are excluded. A picked-up hole is shown as a missing observation and never receives an invented stroke score.

## Friends groups and advanced leaderboards — completed in 0.38.0

Players can create named private groups or leagues containing up to 20 accepted friends. The creator owns the group and can edit its description, add or replace a private group image, rename it, change membership, moderate messages, or delete it; other members can leave. Ending a friendship also removes the former friend from groups owned by either player.

Each group has live 30-day, 90-day, 12-month, and all-time rankings for verified individual rounds played, Stableford points, lowest average 18-hole gross, best 18-hole gross, and Handicap Index improvement. Every row shows its numbered position and selected ranking value. A private message board supports general leaderboard discussion and comments attached to recent verified group rounds. Only current members can read or post, and no private notes, support information, or full scorecards are copied into the group.

## Match-play scoring — completed in 0.37.0

Individual Match Play competitions and social games now keep a head-to-head hole card alongside the player's ordinary scorecard. Selecting exactly one linked friend or named guest identifies the opponent. Entering both gross scores determines the hole automatically, while Won, Lost, or Halved can be selected for concessions and net decisions.

The server calculates the final result and conventional margin, including early finishes such as **3 & 2**, a completed **1 up**, and **All square**. Unplayed holes after an early finish are omitted. Match results are visible in confirmation and expandable Round History, while the player's complete scorecard independently follows the existing handicap workflow.

## Course personal bests — completed in 0.36.0

The Rounds screen keeps a separate record book for each exact course and tee combination. It shows the player's lowest completed 18-hole gross score, highest 18-hole Stableford points total, best complete Front 9 and Back 9, and lowest completed score for every recorded hole, including the date each record was first set.

Only verified individual rounds qualify. Stroke-play records exclude picked-up holes rather than inventing a score, while a valid Stableford total may still set the points record. Nine-hole cards can set the matching Front 9 or Back 9 record but cannot set an 18-hole record.

## Account security centre — completed in 0.35.0

Account Settings now shows the authenticated identity's verified-email state, sign-in method, account creation time, and latest successful sign-in made available by Supabase. Existing password changes continue to require the current password through a non-persistent verification client.

Players can revoke every other refreshable session without closing the current browser, or type an exact confirmation before signing out across all devices. Session revocation is performed directly by Supabase Auth. Fore the Record does not store or display passwords, access or refresh tokens, a guessed device inventory, or a fabricated failed-login history.

## Admin reporting and exports — completed in 0.34.0

The protected administrator portal provides date-filtered registration, round, and support-request activity alongside current account status, open-work, and catalogue totals. The selected period is inclusive and applies consistently to the matching user, round, and support CSV files; catalogue exports always contain the complete current catalogue because those legacy records do not have reliable creation timestamps.

Every export is generated by an administrator-only server route and recorded in the audit log. CSV files exclude authentication IDs, passwords, tokens, connection details, support-message bodies, private round notes, and scorecard-photo paths. Text cells beginning with spreadsheet formula markers are neutralised before download.

## Competition and social game formats — completed in 0.31.0

Round Entry distinguishes casual golf, organized competition, and games with friends. Competition formats are selected from individual and team choices, while social rounds cover Wolf, Sixes, Skins, Nassau, Match Play, Bingo Bango Bongo, and a described Other option. A social game can retain a normal individual scorecard and remain eligible for the existing handicap rules; a team competition remains record-only.

Players may optionally link accepted active friends and add guest names. A linked friend receives only a limited tag containing the owner, date, course, tee, and game or competition result, can remove their own tag, and never receives a copied round or Handicap Index effect. Notes, scorecard photos, and hole-by-hole scores remain private.

## Deeper performance analysis — completed in 0.30.0

The Rounds screen provides private scoring averages for the signed-in player across courses, tees, par 3/4/5 holes, Front 9 and Back 9, and casual or competition rounds. Players can combine course, tee, round-type, 30-day, 90-day, 12-month, all-time, and custom-date filters. Every figure shows its qualifying sample so an average based on a small record remains clear.

Analysis is rebuilt from the player's existing verified individual rounds whenever it is requested. Team and record-only rounds do not contribute. Picked-up holes are excluded from hole averages, and a round containing a pickup does not receive an invented gross average. Complete scorecards supply par-type and nine-hole analysis; legacy total-only cards can still contribute to compatible course, tee, and competition averages.

## Scorecard photo — completed in 0.29.0

Players can attach one optional JPEG, PNG, or WebP photo of up to 10 MB to a saved individual round, then privately view, replace, or remove it from Round History. The administrator can view the same supporting photo while correcting that round or reviewing a player-entered scorecard. Photos never appear in friend activity and do not alter strokes, calculations, or approval decisions.

Image bodies upload directly to a private Supabase Storage bucket using a short-lived, server-issued token. The API verifies authenticated round ownership, the generated object path, stored content type, and stored size before saving metadata. Viewing requires a new five-minute signed link. Stored objects are removed with their photo record, round, or account.

## Friends activity feed — completed in 0.28.0

Accepted friends can see a newest-first, paginated feed of limited verified round summaries on the Friends screen. Entries show the player, home club, date, course, tee, round length, casual or competition classification, scoring format, gross score or Stableford points, and current Handicap Index counting status. Team records appear without a score. Handicap Index visibility continues to follow its separate privacy setting.

Players can disable **Share my round activity** in Account Settings. The choice hides all of their existing and future activity without deleting any records. The server includes only accepted friendships and excludes suspended, deleted, undiscoverable, or sharing-disabled profiles, pending or rejected manual scorecards, notes, full hole scores, email addresses, support data, and administrative information. Removing a friendship immediately removes access to that activity.

## Nine-hole rounds — completed in 0.27.0

Individual casual and competition rounds can be recorded over a selected Front 9 or Back 9 as well as all 18 holes. Round Entry loads only the chosen nine, checks its signed total, supports Stroke play, Stableford, pickups, and player-entered cards, and records the correct nine-hole totals. History, administrator round correction, scorecard review, data export, and lifetime holes, shots, and recorded yardage preserve the actual round length and segment.

Optional official Course Rating and Slope Rating pairs can be maintained separately for each nine. Nine-hole rounds remain outside the Handicap Index until the application has an authoritative source for the player-specific WHS expected differential. Fore the Record does not estimate that value or halve an 18-hole rating.

## Stableford scoring — completed in 0.26.0

Individual casual and competition rounds can be recorded as Stroke play or Stableford. Stableford uses a stored Playing Handicap to allocate strokes by the approved scorecard's stroke indexes and calculates each hole's net score and points, with automatic Front 9, Back 9, and 18-hole totals. A player may mark a hole as picked up, which records zero points and no invented gross score. For Handicap Index processing only, a picked-up hole receives the existing Net Double Bogey maximum. History, administrator correction, manual scorecard approval, exports, and lifetime totals all preserve that distinction.

## Installable mobile app — completed in 0.25.0

Players can add the existing Fore the Record website to a phone's Home Screen and launch it in a standalone window. Supported browsers show an Install app action; iPhone and iPad users see Safari's Add to Home Screen guidance. A public offline page explains that a connection is needed for private rounds and account details. The service worker never caches authenticated API responses, personal records, or live application pages. This is an installable web app, not a native App Store or Play Store package.

## Privacy and account controls — completed in 0.24.0

Account Settings lets players decide whether they appear in player search, accept new friend requests, and expose their current Handicap Index in player-facing connection data. Existing friendships remain intact when discovery or requests are disabled. Players can download a private JSON copy of their profile, rounds, goals, favourite courses, and support conversations. Non-administrator players can permanently delete their login and all related Fore the Record data only after current-password verification and exact email confirmation; the sole administrator remains protected.

## Round notes — completed in 0.23.0

Players can add an optional private note to any individual or team round while recording it, then read, edit, or clear that note from Round History. Notes support multiple lines, are limited to 2,000 characters, and are included in the player's existing History search. Updates are scoped to the authenticated owner and do not change scores, scorecard reviews, or Handicap Index calculations.

## Round-history filters — completed in 0.22.0

Players can narrow their authenticated Round History by club, course, tee, competition name or format, round type, Handicap Index counting status, scorecard-review status, and inclusive playing dates. Filters combine immediately, report the matching count, preserve original record numbers, and can be cleared together. Filtering operates only on the current player's already authorized history response and makes no external provider requests.

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
