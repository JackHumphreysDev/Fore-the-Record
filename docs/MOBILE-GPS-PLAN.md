# Custom domain and native iOS app with live GPS rounds

Status: proposed implementation specification — no application changes implemented.
Prepared: 29 September 2026; revised for native iOS on 30 September 2026.
Baseline: `main`, commit `4deffe9` (PR #79), application version `0.53.0`.

## 1. Objective and delivery order

First connect the user-supplied custom domain to the existing production application. Then develop a polished phone experience where a golfer selects their course and tee, records each hole during play, sees their current distance to the green, and taps any point on a hole map to measure a shot or lay-up.

Build a **native iPhone app in SwiftUI**, using the existing Express API, Prisma/PostgreSQL course and round data, Supabase authentication, and Vercel-hosted backend. The React website continues as the existing web experience and administrator interface. The iOS app has its own Xcode project and shared API contract; it is not a packaged web view. Android is a separate future project. A TestFlight pilot should precede an App Store release.

This sequence takes priority over the existing roadmap's placement of custom domains after Calendar and Data Import. Those features are not dependencies for this work.

## 2. What main already provides

| Existing capability | Planned treatment |
| --- | --- |
| Existing website and installable PWA | Keep serving current web users; the iOS app is a separate native client. |
| Course/tee catalogue and hole scorecards | Reuse course IDs, tee IDs, par, yardage and stroke index. |
| Live Round in `client/src/RoundEntry.tsx` | Reuse its scoring behaviour and API contract while implementing native Score / GPS views in SwiftUI. |
| One account-owned `LiveRoundDraft` per user | Preserve this model; add revisions and reliable local persistence. |
| GET / PUT / DELETE `/api/users/me/live-round` | Extend existing contracts rather than introduce duplicate draft APIs. |
| Nine/18 holes, Stableford, pickups, Match Play and optional statistics | Preserve current behaviour and validation. |
| Review and submit into normal round history | Keep GPS and draft progress separate from handicap/statistics processing. |

Existing browser storage and service-worker behaviour do not give the native app offline storage. iOS draft persistence must be designed and tested independently; account-saved drafts and locally saved drafts remain distinct states.

The 18Birdies screenshot mentioned in the request was not available during this review. The layout below follows the written brief; visual comparison remains a design input before interface sign-off.

## 3. Step one — custom domain

**Domain supplied:** `foretherecord.co.uk`, registered through Cloudflare. The canonical hostname is the apex domain; `www.foretherecord.co.uk` redirects to it. Complete the external setup in [CUSTOM-DOMAIN.md](CUSTOM-DOMAIN.md).

Implementation checklist:

1. Confirm the existing Vercel project and production deployment from `main`. Record current domain, redirect and authentication configuration for rollback.
2. Add the supplied domain and the alternate hostname, if applicable. Apply the exact DNS records requested by Vercel; do not hardcode example IP addresses. Preserve unrelated email and verification records.
3. Wait for domain verification and HTTPS certificate issuance. Redirect the alternate hostname to the canonical HTTPS hostname. Test path and query preservation before enabling redirects from the old production URL.
4. Set Supabase's production Site URL and permitted authentication redirects for the new origin. Check confirmation, password reset, email-change and administrator invitation links; current website flows use `window.location.origin`. Plan and test separate native authentication return URLs.
5. Review API origin allowlists, absolute links, deployment variables and documentation for the website; confirm the iOS app can reach the same HTTPS API with bearer-token authentication. Keep development/preview access intentional.
6. If production authentication email is still on Supabase's default sender, configure a verified SMTP sender as a related launch dependency. Obtain provider-specified SPF/DKIM and appropriate DMARC configuration without replacing existing mail routing. Broader product email notifications remain separate work.
7. Explain the website origin change to existing users: browser sessions, permissions, caches and installed Home Screen apps do not automatically transfer. Retain a tested route from the old origin. The native iOS app signs in independently to the same account.

**Acceptance:** canonical HTTPS works on desktop and phone; alternate-host redirects work; `/api` and deep links resolve; website authentication emails return to the correct flow; existing records and server drafts remain available. Before the iOS pilot, verify native API sign-in and return-link handling against the custom domain.

**Rollback:** restore recorded URL/redirect settings and use the existing Vercel deployment URL while correcting DNS. Do not remove working access before the new-origin checks pass.

The custom domain also provides a stable API/auth link origin for iOS. Once the Apple Team ID and app bundle identifier are chosen, serve the `apple-app-site-association` file at `/.well-known/apple-app-site-association` without redirect, add the Associated Domains entitlement, and test the intended Universal Links for sign-in and shared content. Do not route every website URL into the app by default. [Apple associated domains](https://developer.apple.com/documentation/Xcode/supporting-associated-domains).

Reference: [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 4. Step two — mobile and live-round experience

### Native iOS foundation

Create an Xcode project with SwiftUI views for the twelve concept sections, a typed API client, Supabase-backed session handling and a local draft store. Keep the website's scoring rules and server validation as the source of truth; share schemas and API examples where useful, not React components. Establish the minimum supported iOS version before implementation based on the intended users and persistence framework. SwiftData is a candidate for modern iOS targets; SQLite/Core Data remains an option if broader OS support or explicit migration control is needed.

Retain Fore the Record's visual identity. Design for iPhone SE and current standard/large iPhones in portrait, with landscape checks. Use Dynamic Type, VoiceOver labels, sufficient outdoor contrast, native safe areas, at least 44-point touch targets and controls reachable with one hand. Prefer a SwiftUI tab bar for Home, Rounds, Play, History and Friends; use navigation stacks for secondary sections and a focused full-screen round flow.

Provide a prominent **Start round** action and **Resume round** when an unfinished draft exists. Reduce dashboard density and keep secondary statistics out of the scoring path. iPad adaptation can follow after the iPhone release.

### Starting and playing

1. Choose club, course, tee, 18 holes or Front/Back 9, and existing scoring format.
2. Show the selected tee's scorecard and GPS availability before starting. Missing geometry never blocks scoring.
3. Enter the live screen on the correct first hole. Back 9 begins at hole 10, not hole 1.
4. Switch between **Score** and **GPS** without losing edits, selected hole or target.
5. Enter strokes with large plus/minus controls and direct numeric entry. Blank remains unplayed; never prefill par as a completed score. Expose pickup only where the existing format supports it. Optional statistics stay collapsible.
6. Previous/next and a hole picker allow corrections. Retain running totals, score to par, applicable Stableford points and Match Play status.
7. Review the full card before submission. Missing required scores are highlighted. A successful submission creates one normal round through the existing validation/review process.

### GPS screen composition

| Region | Content and behaviour |
| --- | --- |
| Header | Course/tee, hole number, par, stroke index and card yardage. |
| Distance strip | Front / **Middle** / Back, with middle most prominent; all in yards. |
| Map | Satellite imagery where available; green/fairway/bunker overlays when verified; player marker with accuracy circle. |
| Controls | Re-centre, fit hole, north-up / hole-up, zoom and clear target. |
| Target readout | Player → selected point, and selected point → green middle; two distinct line segments. |
| Footer | Score / GPS switch, previous/next hole, saved/sync state and score action. |

Tap to create a target, drag to reposition, and clear to return to the normal view. A target stays fixed while player location changes. Explicitly distinguish a tap from pan/zoom gestures. The second leg is an optional planning aid, not the remaining distance along a guaranteed route.

Start in hole-up orientation: calculate bearing from the selected tee reference to green middle and orient that direction towards the top. Fit the entire hole with padding for controls, including doglegs. Panning suspends automatic following until **Re-centre** is selected. Clear the previous hole's target when changing holes. Do not automatically advance holes based on proximity in the first release.

## 5. Course data and mapping

**Pilot assumption:** Sickleholme, followed by additional verified courses. Its actual OSM coverage and imagery quality have not yet been audited.

Keep two independent data layers:

- **Scorecard:** tee-specific par, official card yardage, stroke index and existing rating information. Reuse approved catalogue values and reconcile against the club's current scorecard. GPS measurements must not overwrite official yardages or ratings.
- **Geometry:** reference coordinates and optional shapes used for map display and distances. Record source, licence, verification date, verifier and geometry version.

For the pilot, inspect OpenStreetMap/Overpass for hole paths, tees, greens, fairways, bunkers and water. Import to a draft dataset, associate every feature with the correct course/hole, and validate manually. Shared greens, nearby holes and ambiguous numbering need explicit review. Do not call public Overpass services during a player's live round. [OSM golf tags](https://wiki.openstreetmap.org/wiki/Key:golf) and [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API).

Fill gaps through an administrator pin-drop editor, club-supplied coordinates or on-course surveying. A single round can collect initial pins, but it is not a guarantee of accurate front/back boundaries or complete hazard coverage. Record uncertainty and verify questionable positions before publication. Use imagery for tracing only where its licence permits derived data.

Minimum publishable GPS data per hole:

- Selected tee reference position, green middle, and verified front/back reference pins.
- Course and hole identity, coordinate validation and provenance.
- A clearly marked partial state if only middle is verified; show unavailable fields as “—”.

Polygons are an enhancement, not a release blocker. An admin can import/edit draft geometry, preview distances, mark each hole verified, and publish an immutable course geometry version. Existing rounds retain their selected version; corrections become available to new rounds. Provide “Report map issue”.

### Provider recommendation

Start with **Apple MapKit** in the SwiftUI app: satellite imagery, camera rotation, user location and annotations/polygon overlays are supported by Apple's native framework. Prototype the Sickleholme hole view, including tap-to-target and overlay contrast, on a physical iPhone. If imagery, styling or geometry behaviour is insufficient, evaluate **MapLibre Native for iOS** with a licensed imagery source. MapLibre GL JS and Leaflet are browser libraries and are not the proposed iOS renderer. [Apple MapKit](https://developer.apple.com/documentation/mapkit), [MKMapView overlays](https://developer.apple.com/documentation/mapkit/mkmapview), [MapLibre Native iOS](https://github.com/maplibre/maplibre-native).

Compare MapKit satellite coverage at Sickleholme with any alternative licensed imagery before deciding to add a provider. If MapLibre Native is chosen, evaluate MapTiler/Mapbox resolution, iOS terms, attribution, offline rights, billing unit and limits. Do not assume a small pilot is automatically free. [MapTiler pricing](https://www.maptiler.com/cloud/pricing/), [terms](https://www.maptiler.com/terms/cloud/), [Mapbox pricing](https://www.mapbox.com/pricing).

If an external map provider is used, configure its iOS SDK and mobile-app key restrictions, read-only scopes, attribution and spending controls. A bundled iOS key is extractable; never place a server secret in the app. Review OSM attribution and database licence obligations for imported/derived data. Standard OSM tiles are not satellite imagery and prohibit offline prefetching. [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

## 6. Live location and distances

Request location only after the player chooses **Enable GPS**, with a clear `NSLocationWhenInUseUsageDescription`. Use Core Location's `CLLocationManager` for foreground updates, selecting an appropriate desired accuracy and distance filter after device testing. Handle denied/restricted permission, reduced accuracy, stale or unavailable fixes and GPS-disabled play; scoring stays usable. Request temporary full accuracy only if pilot evidence shows it is needed for hole yardages and the purpose is explained. [Apple Core Location](https://developer.apple.com/documentation/corelocation), [location authorization](https://developer.apple.com/documentation/corelocation/requesting-authorization-to-use-location-services).

Show `CLLocation.horizontalAccuracy` and fix age, for example “Accuracy about 8 m · updated 3 s ago”; reject invalid/negative accuracy. Do not claim guaranteed “GPS locked ±4 m”. Proposed quality thresholds: good ≤10 m, approximate 10–25 m, poor >25 m. After 15 seconds without a fresh fix, mark yardages stale; after 60 seconds, remove the live designation and require a fresh fix. Tune thresholds after field testing. [Apple horizontal accuracy](https://developer.apple.com/documentation/corelocation/cllocation/horizontalaccuracy).

When the player enables **Keep screen awake** during an active map view, set `UIApplication.shared.isIdleTimerDisabled` and reset it when the map/round closes or the scene is inactive. Explain the battery trade-off. Design the first release for foreground location; do not enable Always authorization or background location without a separate user need and battery/privacy review. [Apple idle timer](https://developer.apple.com/documentation/uikit/uiapplication/isidletimerdisabled).

Calculate on-device using Haversine, radians and a documented Earth radius (6,371,008.8 m), then divide metres by 0.9144 for yards. Keep full precision internally and display whole yards. Validate latitude/longitude and GeoJSON's `[longitude, latitude]` ordering. Treat results as straight-line ground distances; elevation, wind and “plays like” adjustment are excluded.

The first release measures to three saved green reference pins. Label these as mapped front/middle/back references: they are fixed, not the current flag location, and may not remain numerically ordered when the player approaches from behind the green. Do not silently sort or relabel them.

A later polygon mode may compute approach-relative front/back intersections along the player-to-middle line, with explicit handling of concave shapes, multiple intersections and a player inside the green. A polygon centroid is not necessarily a valid putting-surface middle. Likewise, a nearest bunker edge is not a carry distance: hazard carry requires an exit intersection along a specified aim line. Until this logic is verified, use labelled hazard reference pins or user-selected targets.

Keep player coordinates in memory for the first release. Do not persist routes or include coordinates in analytics/errors. Tile requests can reveal the viewed area to the map provider; explain that in the privacy information. Stop the watcher when GPS is disabled or the round closes.

## 7. Saving, offline use and API changes

Reliable scoring is part of the mobile release. Implement persistence before enabling the GPS pilot for real rounds.

- Save each edit promptly to an account-scoped native store, then debounce authenticated server sync. Store session credentials in Keychain and apply iOS file protection to private draft data. Show **Saved on this iPhone**, **Syncing**, **Saved to account**, **Offline** and actionable failures distinctly.
- Keep the active round, selected tee scorecard and permitted course geometry locally so a prepared round survives airplane mode, app termination and restart. New sign-in, uncached course lookup and first-time imagery still require a connection. An expired server session pauses sync until reauthentication; never discard pending edits.
- Treat the on-device draft store as an explicit data layer with migrations and recovery behaviour. The existing website service worker and IndexedDB are unrelated to native offline reliability.
- Add a server revision and client mutation ID. PUT includes expected revision; update atomically or return a conflict. Never let an older response overwrite a newer local edit. Preserve both copies and ask which to keep for conflicting device edits.
- Scope drafts/queues to authenticated identity; prevent another account on the same device seeing them. Clear private local data on explicit sign-out/account removal, warning about unsynced edits before sign-out. Handle quota/storage failures visibly.
- Make final submission idempotent and transactional with draft completion. Retry after a lost response must return the existing submitted round, not create another. Version or tombstone completed/abandoned drafts so stale queued writes cannot resurrect them.
- Final submission requires connectivity and successful server validation. An offline completed card remains “Awaiting submission”; it does not yet affect History or handicap.
- Cache only permitted geometry. Satellite tiles are online-only for the first release unless the chosen contract explicitly allows offline caching. When imagery fails, show a schematic hole/target view from saved geometry, available yardages and the scorecard.

Proposed additive schema: `CourseMapVersion` (course, version, publication state, provenance), `HoleMap` (version, hole, green pins, optional GeoJSON), and tee reference records keyed to tee/hole/version. Add draft concurrency fields and a submission idempotency record/constraint. Keep geometry separate from locked historical scorecards; PostGIS is optional, not required for this pilot.

Add an authenticated published-map read endpoint scoped to course/tee/version and protected administrator import/edit/publish endpoints. Validate bounds, shape size, polygon validity and hole membership server-side. Reuse current ownership checks for drafts; all final score validation remains server-authoritative. Support existing version-1 drafts during an additive migration to the new draft contract.

## 8. Implementation slices and acceptance gates

Each slice gets a feature branch from current main, review and a PR. Choose release versions through `docs/VERSIONING.md` during implementation; this document does not reserve them.

| Order | Slice | Gate before proceeding |
| --- | --- | --- |
| 1 | Domain and authentication cutover | Domain supplied; HTTPS, redirects, web auth and native return-link design verified. |
| 2A | Native iOS shell, auth and mobile sections | SwiftUI app signs in to the existing account; Home, Rounds, Play, History and Friends navigate on physical iPhones. |
| 2B | Native scoring, local persistence and sync safety | Nine/18-hole scoring, offline restart, interrupted saves, two-device conflict and duplicate-submit tests pass. |
| 2C | Sickleholme data audit and admin mapping | Correct hole/tee association and verified pins across all 18 holes; rights and provider decided. |
| 2D | GPS map, distances and target measurement | Middle yardage and tap/drag target work; poor GPS and tile failures degrade clearly. |
| 2E | TestFlight on-course pilot and App Store release preparation | Complete real rounds, reconcile all scores, record accuracy/battery observations, review App Store privacy information and fix blockers. |

Likely touchpoints: a new `ios/` Xcode project with SwiftUI screens, navigation, API/auth, local storage, Core Location and MapKit modules; `server/src/liveRounds.ts`, `server/src/app.ts`, Prisma schema/migrations and administrator catalogue UI. Existing React files remain reference implementations for business behaviour. Extract server mapping/sync routes rather than further concentrating responsibilities in `app.ts`.

Validation must cover:

- Existing scoring, pickup, Match Play, manual-course review and handicap exclusions without changes in results.
- Exact hole numbering for Back 9, tee changes, resumed drafts and edits to earlier holes.
- Reference distance fixtures, zero distance, unit conversion, swapped-coordinate rejection, north-wrap bearings and target updates while moving.
- Permission denial/revocation, reduced accuracy, stale/poor fixes, idle-timer restoration, scene background/foreground and map-rendering failure.
- Airplane mode, app termination/restart, failed local write, lost save response, session expiry, concurrent devices, repeated finish and stale queued writes after abandonment.
- Owner-only draft access, admin-only geometry publication and no location leakage into logs.
- An 18-hole field round using the installed iOS TestFlight build on a physical iPhone, with at least one nine-hole run. Compare several mapped distances to independent reference measurements and investigate discrepancies over 10 yards; this is a QA trigger, not a promised GPS accuracy.

Run the server's relevant Vitest tests, lint and deployment type-check, plus iOS unit/UI tests and Xcode build checks for implementation PRs. Update README, roadmap, changelog and What's New when functionality ships. Roll out GPS behind a feature flag to TestFlight pilot users; disabling it must preserve scoring and drafts. Keep schema changes additive and support older installed app versions during API rollout.

## 9. Remaining inputs and boundaries

Needed before the relevant implementation slice: Cloudflare DNS access and verified Vercel domain assignment; Apple Developer team and chosen bundle identifier for signing/Universal Links; minimum supported iOS version; SMTP status if needed; confirmation that Sickleholme is the first course; current scorecard and tee selection; visible 18Birdies reference for styling; physical iPhone access for field testing. External imagery account/budget is needed only if MapKit is insufficient.

Working defaults: native SwiftUI iPhone app, yards, one active individual round per account, explicit hole navigation, fixed verified green pins, private foreground location and MapKit satellite online with a locally rendered geometry fallback. Continuous background GPS, Android, automatic shot tracking, multiplayer live scoring, live flag positions, slope compensation and fully downloadable satellite courses are outside this first release.

The domain is the first implementation milestone. It has been supplied; live DNS, Vercel and Supabase configuration must be verified before cutover.

## 10. Mobile frontend concept — design reference

The mobile concept presented with this specification is the visual and navigation direction for the **native iOS app** in step two. Use it alongside the functional requirements above.

[Open the interactive mobile concept](concepts/mobile-concept.html). Open this HTML file in a browser to explore its section selector and sample interactions. The preview is stored with the specification so it remains available from the repository and VS Code. It is a browser-rendered design reference for an iPhone app, not the app implementation; it uses sample data and presentation resources.

### Visual style

- Continue the clubhouse aesthetic: warm cream backgrounds, forest-green primary actions, restrained gold accents and fine neutral separators. Provide corresponding dark surfaces with readable contrast.
- Use elegant serif headings and prominent score/handicap numbers, with a clear sans-serif face for labels, controls and body text.
- Use softly rounded cards (approximately 12 px), generous spacing and compact secondary information. Keep the primary action visually obvious on each screen.
- Retain the existing production logo; the preview's text wordmark indicates placement rather than replacing the brand asset.
- Keep the brand and notification shortcut at the top. Make controls comfortable for one-handed use, preserving the accessibility and responsive requirements in section 4.

### Navigation and information architecture

Use a native five-destination tab bar: **Home**, **Rounds**, **Play**, **History** and **Friends**. Home is the iOS entry to the existing Profile area. Play is the visually prominent central action and opens round setup or offers to resume an active round.

Access Courses through Play and the existing catalogue entry points. Keep Goals & achievements, Golf bag and Account accessible from Home; Notifications opens from the header. Preserve access to existing support and administrator functions for authorised users through the account/more navigation during implementation.

Within a live round, prioritise **GPS / Score**, hole navigation and round review. Global navigation must preserve the draft when leaving this flow and provide a clear route back. The concept's external section selector is a review tool and must not appear in the shipped product.

### Section-by-section screen direction

| Section | Layout and content | Primary interactions |
| --- | --- | --- |
| **1. Home / Profile** | “Your game, at a glance” introduction; forest-green Handicap Index card; Start/Resume round action; compact rounds-played and best-gross cards; latest round; links to goals, bag and account. | Start/resume play, open the latest scorecard, inspect personal goals or equipment. |
| **2. Rounds & insights** | “Find your form” heading; Overview / Statistics / Season views; a compact scoring trend, supporting statistics and links to course performance and comparison. | Change analysis view and filters; inspect underlying rounds. Include actual sample counts and unavailable states. |
| **3. Courses** | Favourite course feature card, saved courses, available tees and clear GPS coverage status. | Search the existing catalogue, inspect a course/scorecard, choose course and tee for play. |
| **4. Start a round** | A short vertical form for course, tee, 18 / Front 9 / Back 9 and scoring format; mapping availability; Start live round and Enter completed round actions. | Validate selections and start the correct hole sequence. Display the existing format-specific fields when required. |
| **5. Live GPS** | Compact course/hole header; Front / oversized Middle / Back yardages; dominant hole map; target distance readout; accuracy/freshness status; accessible measurement, re-centre and hole controls. | Tap/drag a target, clear it, change orientation, re-centre, change hole and enter a score. Full behaviour follows sections 4–6. |
| **6. Live scoring** | Large current-hole heading and par/index/yardage context; GPS / Score switch; large stroke entry with plus/minus controls; optional statistics; running total and save status; previous/next and review. | Enter or correct a score, record supported pickups/statistics and review the card. Untouched scores remain blank. |
| **7. History** | Chronological round cards with date, verification state, course, tee, format and prominent gross total; expandable scorecard detail and compact filters. | Filter history and open full round details. Keep pickups, partial cards and non-comparable formats explicit. |
| **8. Friends & competitions** | Activity / Competitions / Groups views; private friend activity cards; friends/requests; tournament and knockout entry points. Competition detail uses clear standings rows. | View permitted activity, manage requests, open competitions and groups. Honour all existing sharing rules. |
| **9. Goals & achievements** | Feature card for the current handicap goal, measurable progress towards playing targets and a compact honours board. | Review or edit supported goals, inspect earned achievements and their qualifying rounds. |
| **10. Golf bag** | Readable club list with brand/model or loft as supporting text and personal carry aligned on the right; add-club action. | Open/edit club details, add, reorder, archive or restore equipment using the existing feature set. |
| **11. Notifications** | A simple chronological inbox with concise event titles, context and read state. | Open the relevant request, verified scorecard, achievement or competition; preserve current notification semantics. |
| **12. Account** | Profile identity card and grouped Profile details, Privacy & sharing, On-course preferences, Security and Support controls. | Edit supported settings, manage sharing and sessions, access help and existing data controls. Clearly distinguish device preferences from account-wide settings. |

### What the interactive reference demonstrates

The concept allows browsing all twelve primary sections, following sample navigation links, changing sample strokes and holes, showing an example target measurement, opening scorecard/details and inspecting account controls. Smaller competition, friend and club views demonstrate the direction of secondary navigation.

It does not connect to the application, authenticate, request location or save real scores/settings. Some filters and secondary actions are placeholders. Its Sickleholme-labelled map is an illustrative layout, not surveyed course geometry or licensed satellite imagery. Its yardages, player statistics, scores, people, standings and badges are sample content, not catalogue or account data.

Production must implement the complete requirements in the earlier sections even where the concept simplifies an interaction. In particular:

- Round setup must determine the starting hole; the preview's hole 7 is only an example.
- Scores must start blank; the preview's prefilled four illustrates the completed-entry appearance only.
- Target distance must come from real coordinates, rather than the preview's fixed sample values, and support tap/drag placement beyond the example crosshair control.
- Save, offline, permission, empty, validation and conflict states must be implemented explicitly.
- Actual course data, privacy rules and existing scoring semantics take precedence over illustrative labels or totals.

### Design acceptance for implementation

Recreate the visual hierarchy, navigation and section layouts in reusable **SwiftUI** views; do not embed the preview HTML in a WebView. Connect them through the typed native API client to the existing server. Review Home, setup, GPS, Score, History and Account on iPhone SE and standard/large iPhones with Dynamic Type and VoiceOver, then check the remaining sections for spacing, contrast and interaction consistency. Ensure active-round controls remain usable outdoors and existing server-side scoring behaviour is preserved.
