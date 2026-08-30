# Fore the Record

## Project purpose

Fore the Record is a web application for recording golf rounds and tracking a player's World Handicap System (WHS) Handicap Index over time. Users will be able to create a profile, find golf courses and tees, enter scorecards and playing conditions, and review which rounds contribute to their current handicap.

## Technology stack

- **Frontend:** React, Vite, and TypeScript
- **Backend:** Node.js, Express, and TypeScript
- **Database:** PostgreSQL hosted by Supabase
- **ORM:** Prisma
- **Testing:** Vitest
- **Package management:** npm workspaces
- **Hosting and deployment:** Vercel
- **Golf course data:** UK Golf Course Data API through RapidAPI, with a fallback lookup for supported club websites

Sensitive values such as database connection strings and API credentials are stored in local environment files and deployment secrets. They must never be committed to the repository.

## Current development status

The project foundation is complete. It includes a React and TypeScript frontend, an Express and TypeScript backend, a tested API health endpoint, and a Prisma schema connected to a Supabase PostgreSQL database. The initial database migration has been created and deployed successfully.

The application features are still under development. The core handicap calculation domain logic, backend profile creation and retrieval, two-tier backend course ratings lookup, course and tee persistence, transactional round logging with scorecard capping and automatic handicap recalculation, the round-history API, and the frontend profile-creation, course-search, and total-score round-entry flows are implemented; the frontend round-history view and Vercel deployment have not yet been implemented. Total-score entry uses gross score as adjusted gross score because Net Double Bogey capping requires a complete hole-by-hole scorecard.
