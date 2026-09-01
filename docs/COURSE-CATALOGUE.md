# Course catalogue data

Version `0.6.0` adds database-backed catalogue search, an on-demand provider
lookup, and a resumable command for a possible future bulk import of the UK
Golf Course Data API catalogue.

Version `0.7.0` adds tee-specific hole scorecards. Round Entry requests a
selected tee's saved scorecard first. If one is not stored and the course has
a provider ID, the server makes one `GET /courses/{course_id}/scorecard`
request, validates a complete set of 18 holes, selects the matching tee, and
saves its par, stroke index, and available yardage. Later rounds reuse the
saved data and spend no provider requests. An incomplete or missing provider
card falls back to manual player entry and administrator review.

Clubs and tees saved before provider identifiers were introduced are upgraded
on their first scorecard lookup. The server matches the legacy club, course,
and tee by name and rating, stores the recovered identifiers, and then fetches
the card. That one-time recovery can use up to three provider requests; later
rounds use the saved scorecard and use none.

The reference snapshot supplied during development contains:

- 2,668 clubs;
- 3,083 courses;
- 14,223 tee sets.

The provider remains the source of truth, so its totals may change between
runs. The one-club validation run on 1 September 2026 reported 2,666 clubs.

## Current operation: on-demand imports

The current RapidAPI subscription allows 200 requests per month, has a hard
limit, and permits 5 requests per minute. Do **not** run a full catalogue
import on this plan.

Normal home-club and Round Entry searches query PostgreSQL and spend no
provider requests. **Search catalogue** checks PostgreSQL first. When it finds
no saved match, the same action automatically checks the provider and can use
up to two requests: one to find the club and one to retrieve its courses and
tee sets.

The first provider response is shown as a club-candidate list rather than
silently choosing one result. A broad partial search such as `Hall` can
therefore show Hallamshire Golf Club, Hallowes Golf Club, and any other clubs
returned on the provider's first page. Selecting one candidate spends the
second request and loads courses and rated tees only for that club.

The provider endpoint searches club names rather than course names. The club
field is preferred for the live lookup. If it is empty, the course-field text
is tried as a possible club name so a misplaced partial entry such as
`Halla` can still find Hallamshire Golf Club. A genuine course-name-only query
can only find courses already stored locally.

The selected club is previewed before it is saved. Choosing the add action persists
all new rated tees for that club, so future searches use the local catalogue
without another provider request. The provider fallback only runs after an
unsuccessful database search. If the provider also has no match, the player
can submit the club or course through the existing support form.

## Before running a future bulk import

1. Confirm that `DATABASE_URL`, `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, and
   `RAPIDAPI_SEARCH_PATH` are set in `server/.env`.
2. Apply the catalogue metadata migration:

   ```bash
   npm run db:deploy --workspace server
   ```

3. Upgrade or otherwise confirm that the subscribed RapidAPI request
   allowance and rate limit can support the complete run.

With 20 clubs per listing page, the reference snapshot needs about 134 club
listing requests and 2,668 course requests: approximately **2,802 requests**
in total. The current 200-request plan cannot cover that usage.

A dry run prevents database writes, but it still makes RapidAPI requests and
therefore still consumes quota.

## Safe validation run

The import defaults to dry-run mode. This command reads one club and its
courses, which normally uses two provider requests:

```bash
npm run catalogue:import --workspace server -- --max-clubs=1
```

Review the final totals and confirm that no credentials appear in the output.

## Bounded write after a future plan change

After the migration and validation run succeed, a small write can confirm the
database path:

```bash
npm run catalogue:import --workspace server -- --write --max-clubs=5
```

The command upserts provider records. It first matches provider IDs and can
attach matching legacy clubs, courses, and tees to those IDs. Existing home
clubs and rounds keep their internal database relationships.

## Full import after a future plan change

Only run this after confirming sufficient provider quota:

```bash
npm run catalogue:import --workspace server -- --write
```

Progress is reported after the first club and every 25 clubs. Credentials and
full provider response bodies are never logged.

## Resume after an interruption

Use the last listing page shown before the failure:

```bash
npm run catalogue:import --workspace server -- --write --start-page=17
```

Resume is page-based. Re-running an earlier page is safe because the import is
idempotent, and is preferable to accidentally skipping a partially completed
page.

Available options:

- `--write` — persist records; without it the run is read-only.
- `--dry-run` — explicitly select read-only mode.
- `--start-page=N` — begin at a one-based club listing page.
- `--per-page=N` — change the provider's `limit`; the documented default used
  by the importer is 20.
- `--max-clubs=N` — stop after a bounded number of clubs.

## Deployment order

The safe production sequence for the current plan is:

1. merge the reviewed application code;
2. apply the additive database migration before deploying the new app code;
3. deploy the application;
4. run a one-club dry run;
5. leave the bulk write disabled and use the database-first on-demand lookup;
6. verify that a provider result can be saved and then found without another
   lookup;
7. manually test home-club, Courses, and Round Entry searches.

If the provider plan changes later, first run a small bounded write and verify
catalogue search. Run the full import only after confirming sufficient quota.

The importer is intentionally not part of the Vercel build or deployment
command. This prevents a deployment from unexpectedly consuming provider
quota or starting a long-running data load.
