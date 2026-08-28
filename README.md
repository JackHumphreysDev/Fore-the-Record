# Golf History Tracker

## Project purpose

Golf History Tracker is a web application for recording golf rounds and tracking a player's World Handicap System (WHS) Handicap Index over time. Users will be able to create a profile, find golf courses and tees, enter scorecards and playing conditions, and review which rounds contribute to their current handicap.

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

The project is in its initial foundation phase. The technology choices and core product requirements have been defined, but the frontend, backend, database schema, automated tests, and deployment configuration have not yet been scaffolded.
