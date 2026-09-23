# Changelog

This file is the versioned development record for Fore the Record. It includes user-facing releases and internal engineering changes. The in-app **What's New** section will use only the plain-language user-facing entries and will not need to display version numbers.

The project follows the release process in [`docs/VERSIONING.md`](docs/VERSIONING.md).

## Unreleased

### User-facing changes

- No unreleased changes yet.

### Developer and admin changes

- No unreleased changes yet.

## 0.47.0 - 2026-09-23

### User-facing changes

- Added a private Profile honours board with 37 achievements covering playing progress, scoring, competition and social play, course exploration, consistency, and Handicap Index improvement.
- Added earned, in-progress, and not-started filters plus category filters, earned dates, and live progress indicators.
- Added direct private History links from badges to the qualifying round where one exact card completed the requirement.

### Developer and admin changes

- Added authenticated server-derived badge calculation without persistent counters or a database migration.
- Restricted every badge to verified individual rounds and preserved honest pickup, scoring, streak, course, and reconstructed Handicap Index semantics.
- Added strict response validation plus catalogue, exclusion, route, and API-helper regression coverage.

## 0.46.0 - 2026-09-23

### User-facing changes

- Added private Season and Year Reviews with a filter for every recorded calendar year plus full-year, Winter, Spring, Summer, and Autumn views.
- Added previous-year comparisons for rounds, holes, shots, recorded yardage, eagles, birdies, pars, and bogeys.
- Added Handicap Index movement, most-played course, and notable gross, Stableford, and differential rounds with direct links to private History.

### Developer and admin changes

- Added an authenticated server-derived review endpoint over verified individual rounds without a database migration.
- Reconstructed period Handicap Index outcomes from eligible historical differentials and preserved honest pickup and missing-yardage semantics.
- Added strict response validation plus calculation, filtering, route, and API-helper regression coverage.

## 0.45.0 - 2026-09-23

### User-facing changes

- Added a private Playing Partners History for linked friends and named guests, with rounds played, player-perspective results, first and latest dates, shared courses, and formats.
- Added searchable friend and guest filters plus a newest-first round timeline, with direct Round History links for cards owned by the signed-in player.
- Kept another player's scores, notes, photos, and hole details private while clearly identifying incoming tagged rounds and their recorder.

### Developer and admin changes

- Added an authenticated server-derived history endpoint covering verified individual cards and record-only team cards without a database migration.
- Grouped guests by normalized name, inverted incoming friend results into the current player's perspective, and excluded removed incoming tags.
- Added strict client response validation plus aggregation, route, privacy, and invalid-response regression coverage.

## 0.44.0 - 2026-09-23

### User-facing changes

- Added private side-by-side comparison for two verified individual rounds from the same course and matching hole layout, including different tees.
- Added gross, score-to-par, Stableford, score-differential, Handicap Index outcome, Front 9, Back 9, and detailed-stat comparisons where the underlying data exists.
- Added hole-by-hole gained, lost, same, and unavailable results plus direct links to each complete card in Round History.

### Developer and admin changes

- Added an authenticated server-derived comparison endpoint with ownership, verification, participation, course, and layout safeguards.
- Reconstructed the Handicap Index and counting status after each selected historical round from eligible differentials rather than storing a duplicate value.
- Preserved pickup and missing-statistic semantics, added strict client response validation, and added calculation, route, and API-helper regression coverage.

## 0.43.0 - 2026-09-23

### User-facing changes

- Added private recent-form comparisons for putting, tee-shot accuracy, greens in regulation, scrambling, penalties, and bunker visits.
- Added strongest recent gain and area-to-watch summaries, GIR by par, and best-to-worst course-and-tee comparisons.
- Added exact round and observation samples plus clear insufficient-data states; all existing performance filters apply to every insight.

### Developer and admin changes

- Added server-derived advanced statistics over verified individual rounds without changing stored round data or Handicap Index calculations.
- Required five recent and five previous metric-bearing rounds for a directional trend, and at least two matching rounds for a course-and-tee comparison.
- Kept advanced statistics private and excluded team, pending, rejected, missing, and invented pickup data from calculations.

## 0.42.0 - 2026-09-23

### User-facing changes

- Added optional per-hole putts, fairway result, green in regulation, penalty strokes, bunker visits, and up-and-down results to standard and Live Round scorecards.
- Added private putting, driving, approach, scrambling, penalty, and bunker figures with course, tee, date, category, and round-length filters plus clear recorded sample sizes.
- Added detailed hole statistics and round summaries to expanded Round History cards without changing scoring or Handicap Index calculations.

### Developer and admin changes

- Added nullable validated hole-statistic fields and database constraints while retaining compatibility with existing rounds.
- Preserved recorded statistics through administrator score correction and excluded team, pending, and rejected rounds from aggregate analysis.
- Kept the new statistics out of friend, group, activity, and shared-round payloads and added parser, API, aggregation, draft, history, and correction regression coverage.

## 0.41.0 - 2026-09-23

### User-facing changes

- Added Live Round mode for nine- and 18-hole individual casual rounds, competitions, and games with friends.
- Added a focused one-hole screen with scorecard facts, running Front 9, Back 9, total, score-to-par, Stableford points, pickups, and Match Play results.
- Saved live progress securely so an unfinished round can resume after refreshing, signing in again, or moving to another device.
- Added a complete review step before the round enters History and the existing Handicap Index workflow.

### Developer and admin changes

- Added authenticated server-owned live-round drafts with one active draft per player and strict payload validation.
- Made completed round creation and live-draft deletion one database transaction so retries cannot leave a submitted draft active.
- Kept unfinished drafts outside History, statistics, leaderboards, milestones, and handicap calculations, and added explicit abandonment with confirmation.
- Added a database migration plus client, parser, route, and atomic submission regression coverage.

## 0.40.0 - 2026-09-23

### User-facing changes

- Added complete 18-hole team competition cards for formats such as Fourball, Foursomes, Greensomes, and Scramble.
- Added named player and opposing teams, Gross Strokes or Stableford Points scoring, automatic Front 9 and Back 9 totals, and tie-aware finishing positions.
- Added full team leaderboards to confirmation, Round History, and accepted friends' profile round views.

### Developer and admin changes

- Added server-owned team-card validation, total calculation, and leaderboard ranking; submitted totals and positions are never trusted.
- Added administrator correction support that recalculates the complete team leaderboard while preserving team rounds as record-only and outside the Handicap Index.
- Added persistent JSON team competition cards with validation and a database migration, while retaining read support for legacy scoreless team records.

## 0.39.0 - 2026-09-22

### User-facing changes

- Added private performance insights comparing the latest five complete rounds with the previous five for Stroke Play and Stableford separately.
- Added scoring consistency, strongest and weakest par types, Front 9 and Back 9 comparisons, and strongest course-and-tee summaries with clear sample sizes.
- Added Hole Performance History so players can select an exact course, tee, and hole, follow chronological scores against par and their average, and open the matching round in History.

### Developer and admin changes

- Added authenticated server-side insight aggregation over verified individual rounds with scoring-format separation and minimum-sample safeguards.
- Excluded team rounds, unverified cards, and invented pickup values; picked-up holes remain visible as missing observations in hole history.
- Added response validation, calculation coverage, chart selection handling, and focused History navigation without changing stored round data.

## 0.38.0 - 2026-09-22

### User-facing changes

- Added named private groups or leagues made from accepted friends, with an optional description and group image plus owner-managed membership and member leave controls.
- Added date-filtered leaderboards for rounds played, Stableford points, lowest average gross, best gross score, and Handicap Index improvement.
- Added a private group message board for general leaderboard discussion and comments attached to recent verified group rounds.

### Developer and admin changes

- Added group-scoped authorization, accepted-friend membership validation, owner moderation, and automatic membership removal when a friendship ends.
- Derived standings from verified individual rounds on demand; gross rankings use completed 18-hole scores and do not expose private round notes or scorecard details.
- Added persistent group, membership, message, description, and private image records with account, group, and stored-file cleanup.

## 0.37.0 - 2026-09-22

### User-facing changes

- Added calculated hole-by-hole Match Play scoring for individual competitions and games with friends.
- Added one-opponent selection from linked friends or named guests, automatic score comparisons, concessions, and Won/Lost/Halved hole results.
- Added conventional final margins including early finishes such as 3 & 2, completed results such as 1 up, and All square.
- Added Match Play summaries and opponent scores to round confirmation and expandable Round History cards.

### Developer and admin changes

- Added server-owned Match Play validation and final-result calculation rather than trusting a submitted overall result.
- Added persistent JSON hole results with opponent and final-score metadata, including administrator score-correction recalculation.
- Kept the Match Play card separate from the existing stroke card and Handicap Index calculation.

## 0.36.0 - 2026-09-22

### User-facing changes

- Added a course personal-bests panel to Rounds, separated by exact course and tee.
- Added dated records for lowest 18-hole gross, highest 18-hole Stableford points, best Front 9, best Back 9, and lowest completed score on each hole.
- Allowed verified nine-hole cards to set the matching nine-hole and individual-hole records while keeping 18-hole records limited to complete rounds.

### Developer and admin changes

- Added authenticated server-side personal-best aggregation and response validation.
- Excluded team rounds, unverified scorecards, and pickup-affected stroke records, with deterministic earliest-date tie handling.

## 0.35.0 - 2026-09-22

### User-facing changes

- Added an Account Security Centre showing verified email status, sign-in method, account creation date, and the latest successful sign-in supplied by Supabase.
- Added controls to sign out other devices while keeping the current browser active, or confirmation-gated sign-out across every device.
- Kept password changes protected by current-password verification and clearly explained which security information Fore the Record cannot access.

### Developer and admin changes

- Added client-side security summary normalization and exact global sign-out confirmation tests.
- Session revocation uses Supabase Auth scopes directly; Fore the Record does not store passwords, access tokens, device inventories, or failed-login histories.

## 0.34.0 - 2026-09-22

### User-facing changes

- No player-facing changes in this administrator release.

### Developer and admin changes

- Added an administrator reporting dashboard with date-filtered registration, round, and support activity plus current account, work-queue, and catalogue totals.
- Added audited CSV exports for users, rounds, support-request metadata, and the full course catalogue.
- Exports omit authentication identifiers, credentials, private messages, round notes, and scorecard-photo locations, and protect spreadsheet cells from formula injection.

## 0.33.0 - 2026-09-22

### User-facing changes

- Added explicit round sharing between accepted friends.
- Added friend profiles where accepted friends automatically see every round, score summary, hole-by-hole card, and attached scorecard photo.
- Added private incoming and outgoing one-round sharing, with controls to revoke or remove access.

### Developer and admin changes

- Added recipient-scoped round-share records, automatic accepted-friend profile access, short-lived authorised photo links, ownership checks, and duplicate protection. The separate activity-sharing preference continues to control only the Friends Activity feed.

## 0.32.0 - 2026-09-18

### User-facing changes

- Added private friend challenges for most rounds, most Stableford points, and lowest average gross score.
- Added accept, decline, and cancel controls plus a live two-player leaderboard for active challenges.
- Only verified individual rounds inside the selected date window contribute to standings.

### Developer and admin changes

- Added persistent challenge lifecycle, date validation, accepted-friend enforcement, and server-derived standings.

## 0.31.0 - 2026-09-17

### User-facing changes

- Added structured competition formats for individual and team events, including medal, Stableford, match play, fourball, foursomes, greensomes, and scramble formats.
- Added **Game with friends** rounds for Wolf, Sixes, Skins, Nassau, Match Play, Bingo Bango Bongo, and custom games.
- Added optional game results and the ability to link accepted friends or record guest player names.
- Added game details and playing partners to Round History and safe format details to friend activity.
- Added a Friends section where tagged players can see a limited round summary and remove their own tag without copying the score or affecting their handicap.

### Developer and admin changes

- Added persistent social-game classifications, results, guest names, and a many-to-many round-participant relation.
- Enforced accepted active friendships before a profile can be linked to a round.
- Kept individual scorecards eligible for the existing handicap workflow while team competitions remain record-only.
- Extended administrator round correction, performance analysis, account exports, API validation, and regression coverage for the new classifications.

## 0.30.0 - 2026-09-17

### User-facing changes

- Added private performance analysis to the Rounds screen with all-time, recent, and custom date ranges.
- Added course, tee, and casual-or-competition filters that can be combined.
- Added average gross and score-to-par views by course, tee, par 3/4/5, Front 9/Back 9, and round type.
- Added the qualifying round or hole sample beside every average and clear empty states when no matching data exists.

### Developer and admin changes

- Added authenticated server-side aggregation over the current player's verified individual rounds.
- Excluded team records, unverified scorecards, and invented pickup values from scoring averages.
- Added query validation, response-contract validation, calculation coverage, and endpoint regression tests.

## 0.29.0 - 2026-09-16

### User-facing changes

- Added one optional scorecard photo to every saved individual round.
- Added private photo viewing, replacement, and removal in expanded Round History entries.
- Made scorecard photos available to the administrator during round correction and manually entered scorecard review.
- Kept photos separate from saved strokes, scoring calculations, scorecard decisions, and Handicap Index results.

### Developer and admin changes

- Added direct-to-Supabase signed uploads for JPEG, PNG, and WebP files up to 10 MB without routing image bodies through Vercel functions.
- Added owner and administrator authorization boundaries with five-minute private viewing links and server verification of stored file metadata.
- Added automatic private-bucket enforcement and photo cleanup during replacement, removal, round deletion, and account deletion.
- Added upload-contract, file-validation, ownership-path, and API regression coverage.

## 0.28.0 - 2026-09-16

### User-facing changes

- Added a newest-first activity feed to Friends with paginated summaries of accepted friends' verified rounds.
- Added limited round details covering the course, tee, date, round length, format, score or Stableford points, and current Handicap Index counting status.
- Added a privacy choice that lets each player hide all of their round activity from friends without deleting any rounds.
- Kept private notes, full hole-by-hole scores, email addresses, pending scorecards, and account information out of the feed.

### Developer and admin changes

- Added server-owned friendship, account-status, profile-visibility, scorecard-status, and activity-sharing filters to the activity endpoint.
- Added persistent activity-sharing preferences with an enabled default for existing and new profiles.
- Added paginated response validation and regression coverage for limited activity data, privacy enforcement, and empty connection states.

## 0.27.0 - 2026-09-16

### User-facing changes

- Added an 18-hole or 9-hole choice for individual rounds, with Front 9 and Back 9 selection.
- Limited nine-hole entry to the selected holes and added automatic gross, adjusted, and Stableford totals for that nine.
- Marked nine-hole rounds and their selected segment clearly in History, including expandable hole-by-hole details.
- Added clear explanations when a nine-hole round cannot yet be included in the Handicap Index.

### Developer and admin changes

- Added persistent round length and nine-hole segment fields, plus optional official front-nine and back-nine Course Rating and Slope Rating fields.
- Added nine-hole-aware round validation, scorecard loading, manual scorecard review, administrator correction, exports, and lifetime totals.
- Kept nine-hole rounds outside Handicap Index calculations until an official expected-differential integration is available; no 18-hole rating is divided or estimated.
- Added front-nine, back-nine, mixed-card, Stableford allocation, and response-contract regression coverage.

## 0.26.0 - 2026-09-15

### User-facing changes

- Added Stroke play and Stableford scoring choices for individual casual and competition rounds.
- Added a Playing Handicap field with a tee-based Course Handicap suggestion.
- Added automatic gross, net, and Stableford points for every hole, plus Front 9, Back 9, and 18-hole point totals.
- Added a Picked up option that awards zero points without inventing a player score.
- Added Stableford totals, Playing Handicap, pickups, net scores, and hole points to Round History.

### Developer and admin changes

- Added persistent scoring format, Playing Handicap, Stableford total, and picked-up-hole fields.
- Kept pickup substitutions separate from player-entered scores and applied Net Double Bogey only to handicap processing.
- Added Stableford-aware scorecard approval, administrator round correction, data export, and milestone handling.
- Added calculation, allocation, pickup, response-validation, and round-submission regression coverage.

## 0.25.0 - 2026-09-12

### User-facing changes

- Fore the Record can be added to a phone's Home Screen and opened like an app.
- Added an in-app Install app action where browser installation is available, plus Safari Home Screen instructions for iPhone and iPad.
- Added a clear reconnect page when an installed app is opened without internet access.

### Developer and admin changes

- Added an install manifest, branded mobile icons, Apple Home Screen metadata, and a narrowly scoped service worker.
- Cached only the public offline page; authenticated APIs, profile data, live pages, and scorecards are never stored by the service worker.
- Added installation metadata, icon, device-detection, and offline-navigation regression tests.

## 0.24.1 - 2026-09-12

### User-facing changes

- No changes to player-facing behaviour.

### Developer and admin changes

- Replaced `Object.hasOwn` in round-note validation with an equivalent compatible with Vercel's TypeScript deployment target.

## 0.24.0 - 2026-09-10

### User-facing changes

- Added privacy choices for player-search discovery, new friend requests, and Handicap Index visibility.
- Added a personal JSON data export covering profile details, rounds, goals, favourites, and support conversations.
- Added guarded self-service account deletion with current-password and exact-email confirmation.
- Kept the sole administrator account protected from self-service deletion.

### Developer and admin changes

- Added persistent privacy controls and enforced them in friend search, request creation, and player serialization.
- Added authenticated export and deletion endpoints scoped to the current profile.
- Added complete related-record cleanup for player-initiated deletion and removal of the Supabase login.
- Added privacy parsing, friend-visibility, export, deletion, response-contract, and interface regression coverage.

## 0.23.0 - 2026-09-10

### User-facing changes

- Added optional private notes while recording individual and team rounds.
- Added round notes to every History card with clear empty states and character counts.
- Added note editing, clearing, and saving directly from Round History.
- Included private note text in the player's existing round-history search.

### Developer and admin changes

- Added nullable round-note storage with a 2,000-character database limit.
- Added an authenticated owner-scoped note update endpoint that cannot access another player's round.
- Kept notes separate from score, scorecard-review, and Handicap Index calculations.
- Added note normalization, length validation, ownership, response-contract, and search regression coverage.

## 0.22.0 - 2026-09-10

### User-facing changes

- Added combined filters to Round History for club, course, tee, or competition text.
- Added round-type, Handicap Index counting-status, scorecard-status, and inclusive date-range filters.
- Added live matching-round totals, clear-all controls, and a useful no-matches state.
- Preserved each round's original record number while a filtered subset is displayed.

### Developer and admin changes

- Added reusable, side-effect-free round filtering and active-filter detection.
- Kept filtering inside the already authenticated, player-owned history data with no additional provider requests.
- Added combined-filter, search-field, counting-status, date-range, and reset regression coverage.

## 0.21.0 - 2026-09-10

### User-facing changes

- Added a Player Goals section to the signed-in Profile.
- Added targets for Handicap Index, lowest gross score, rounds played, lifetime birdies, and lifetime pars.
- Added optional target dates, automatic progress percentages, reached-goal states, target replacement, and removal controls.

### Developer and admin changes

- Added authenticated, player-owned goal storage with one target per goal category.
- Derived all progress from the player's verified rounds, current Handicap Index, and existing milestone calculations rather than editable counters.
- Added server-side goal-type, numeric-range, decimal-precision, and date validation.
- Added ownership, upsert, deletion, progress-calculation, response-contract, and interface regression coverage.

## 0.20.0 - 2026-09-10

### User-facing changes

- Added a Friends screen where signed-in players can find other active profiles by first or last name.
- Added home-club and current Handicap Index details to help identify the correct player without exposing email addresses, rounds, or private statistics.
- Added friend requests with accept, decline, cancel, and remove controls.

### Developer and admin changes

- Added authenticated, player-owned friendship endpoints and direction-independent duplicate prevention.
- Added database constraints and cascade cleanup for pending requests and accepted friendships.
- Excluded unlinked, suspended, and self profiles from player search and connection creation.
- Added server authorization, privacy, validation, response-contract, and browser interaction regression coverage.

## 0.19.0 - 2026-09-10

### User-facing changes

- Added a dedicated Account Settings screen linked from the signed-in Profile.
- Added validated full-name editing with immediate profile updates.
- Added secure email changes that require the current password and confirmation before replacing the active sign-in email.
- Added password changes that verify the current password and clear every password field after completion.
- Added clear validation, duplicate-email, rate-limit, loading, success, and failure feedback.

### Developer and admin changes

- Added authenticated, player-owned profile-name and email-availability endpoints.
- Added verified identity-to-profile email synchronisation after a confirmed authentication email change.
- Kept all password verification and mutation between the browser and the authentication provider; passwords never enter the application API or database.
- Added shared input normalisation and regression coverage for account settings validation, ownership, duplicate emails, and verified email synchronisation.

## 0.18.0 - 2026-09-09

### User-facing changes

- Added automatically earned personal milestones with achievement dates and progress towards locked targets.
- Added lifetime totals for holes played, shots taken, recorded yards, eagles, birdies, pars, and bogeys.
- Added personal-best cards for lowest gross score, best score differential, and lowest historical Handicap Index.
- Added milestones for round totals, a first counting round, a first individual competition, and scores below 100, 90, 80, and 70.

### Developer and admin changes

- Added an authenticated milestone endpoint derived from the verified player's existing rounds and scorecards.
- Reused the central Handicap Index calculator to reconstruct the player's historical low.
- Excluded team, pending, rejected, and record-only scorecards from scoring statistics and used only known hole yardages.
- Added calculation, ownership, exclusion, empty-state, and browser response-contract regression coverage.

## 0.17.0 - 2026-09-09

### User-facing changes

- Added a favourite-course section above catalogue search.
- Added an optional default tee for every favourite course.
- Prioritized favourite courses in Round Entry and automatically selected a matching saved default tee.
- Kept per-round tee choice available and cleared a course's default when the favourite is removed.

### Developer and admin changes

- Added authenticated, player-owned course-preference APIs and database relationships.
- Enforced on the server that a default tee belongs to the selected course.
- Added response-contract and preference-validation regression coverage.

## 0.16.0 - 2026-09-09

### User-facing changes

- Added automatic Front 9, Back 9, and 18-hole totals to the Round Entry scorecard.
- Added expandable round-history cards containing each saved hole, par, stroke index, score, score to par, and nine-hole totals.
- Added a responsive Handicap Index journey chart to the Rounds screen for the latest 20 verified eligible rounds.
- Distinguished differentials that counted at the time of each round and showed the resulting Handicap Index with accessible round details.
- Added clear empty and unavailable-scorecard states for new players, team rounds, and older records without hole data.

### Developer and admin changes

- Added an authenticated progression endpoint derived from the player linked to the verified session.
- Reused the central handicap calculator for each historical point and limited the query to the 39 records required to accurately plot the latest 20-round journey.
- Added progression calculation, endpoint, response validation, subtotal, and history scorecard regression coverage.

## 0.15.0 - 2026-09-09

### User-facing changes

- No player-facing changes in this release.

### Developer and admin changes

- Added a protected, searchable course catalogue manager to the administrator portal.
- Added audited creation and editing of clubs, courses, rated tees, and complete 18-hole scorecards.
- Added confirmation-gated deletion and blocked removal of catalogue records that are still referenced.
- Locked tee ratings, par, and scorecards after a round uses the tee so historical scores and Handicap Index calculations cannot be silently changed.
- Kept safe metadata corrections available on used tees and directed rating corrections to a new tee record.
- Added server validation, authorization, usage-lock, nested-response, and client response-contract regression coverage.

## 0.14.0 - 2026-09-09

### User-facing changes

- Added a performance summary to the signed-in Profile screen.
- Added totals for casual, individual competition, team competition, verified scored, and currently counting rounds.
- Added best and average verified score differentials plus a five-round recent scoring trend.
- Marked recent differentials that currently contribute to the player's Handicap Index.

### Developer and admin changes

- Added a protected player performance-summary endpoint using the authenticated profile ownership boundary.
- Excluded pending, rejected, team, and unacceptable rounds from official differential statistics while retaining them in record totals.
- Added an indexed player/date round-history access path for scalable lifetime summaries.
- Added server calculation, endpoint, client response-validation, loading, empty, and error-state regression coverage.

## 0.13.1 - 2026-09-09

### User-facing changes

- Added a clear wait message when unusually frequent support requests or replies reach the hourly allowance.

### Developer and admin changes

- Added database-backed rolling limits of five new player support requests and twenty player replies per hour.
- Excluded automatically generated scorecard-review requests from the player's request allowance.
- Returned standard `429` responses with a `Retry-After` header while keeping administrator replies unrestricted.
- Added regression coverage for the rolling window, limit messages, rejected writes, and successful request and reply paths.

## 0.13.0 - 2026-09-07

### User-facing changes

- Added an unread count beside Support when an administrator reply is waiting.
- Added a new-reply marker to the relevant support request.
- Cleared unread markers automatically when the player opens the conversation.

### Developer and admin changes

- Added an administrator navigation count and per-request unread markers for new player submissions and replies.
- Tracked player and administrator unread state independently so a sender never creates a notification for themselves.
- Added protected unread-count endpoints and marked conversations read only after an authorized participant opens them.
- Kept existing conversations read during migration while new activity adopts the notification lifecycle.
- Added unread-count response validation plus server regression coverage for creation, replies, reads, counts, and participant isolation.

## 0.12.0 - 2026-09-07

### User-facing changes

- Added an optional affected-round selector to incorrect-information requests.
- Displayed the linked club, course, tee, and date in the player's support history.
- Preserved the complete support conversation if its linked round is later deleted.

### Developer and admin changes

- Added a nullable round relationship with `ON DELETE SET NULL` so correction requests remain usable after round deletion.
- Enforced round ownership on the server before accepting a player-supplied reference.
- Added linked player and round context to the protected support queue and a direct route into the exact round editor.
- Added authenticated round-option and protected administrator record endpoints with response validation.
- Added parsing, ownership, null-reference, and client response-contract regression coverage.

## 0.11.1 - 2026-09-07

### User-facing changes

- Restored automatic hole-by-hole scorecards for newly added provider courses and the exact tee selected during Round Entry.
- Kept the existing manual-entry and administrator-review route for courses whose provider data is genuinely incomplete.

### Developer and admin changes

- Updated the scorecard normalizer for the provider's current single-tee response while retaining support for its earlier multi-tee response.
- Added the selected provider tee ID to scorecard requests and separated cached scorecards by both course and tee.
- Corrected the deployed RapidAPI host, path, query parameter, and rejected Production and Preview credentials.
- Strengthened Express query-value narrowing for the TypeScript version used by Vercel builds.
- Added regression coverage for current response normalization, selected-tee requests, and separate same-course tee caching.

## 0.11.0 - 2026-09-07

### User-facing changes

- Added a signed-in **What's New** tab containing plain-language summaries of useful player features and the dates they became available.
- Listed updates newest first without showing version numbers or internal development details.

### Developer and admin changes

- Added a typed, curated source for player-visible update content rather than exposing or parsing the complete development changelog.
- Added responsive timeline styling and semantic release-date markup.
- Added regression coverage for ordering, unique entries, valid dates, date formatting, and exclusion of versions and internal terminology.
- Updated the shared application version and documented the completed roadmap item.

## 0.10.0 - 2026-09-07

### User-facing changes

- Added administrator-assisted correction of round details and scorecards when a player reports an incorrect entry.
- Recalculated the player's Handicap Index and counting rounds immediately after an administrator correction or deletion.

### Developer and admin changes

- Added paginated player round histories inside the protected account-management panel.
- Added audited editing of dates, times, classifications, competition details, weather, PCC, gross totals, and all 18 player strokes.
- Kept course, tee, participation, par, and stroke-index data locked during corrections to prevent accidental rating or scorecard substitution.
- Added typed-confirmation permanent round deletion, including cleanup of linked manual scorecard-review submissions.
- Recalculated counting flags and the complete player Handicap Index transactionally after every edit or deletion.
- Added API authorization, validation, total-mismatch, calculation, deletion, response-contract, and path regression coverage.

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
