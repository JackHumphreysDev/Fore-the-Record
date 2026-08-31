# Fore the Record client

The React and TypeScript frontend for Fore the Record.

## Current functionality

- Responsive application shell and project branding
- Email-and-password registration and login through Supabase Auth
- Verified-email claiming for profiles created before authentication was added
- Persistent authenticated sessions, logout, and password recovery
- Loading, API-error, and authenticated-profile states
- Home-club selection and removal using clubs in the saved course library
- Interactive Profile, Courses, Rounds, and History navigation
- Full or partial club-name search with per-tee saved status and incremental course-library additions
- Round entry using saved tees, total gross score, date, and playing conditions
- Round confirmation with Score Differential and refreshed Handicap Index
- Newest-first round history with course, tee, score, weather, and rating details
- Counting-round badges and a current Handicap Index summary
- Local `/api` proxy to the Express server on port `3000`

## Local development

Run the API and client in separate terminals from the repository root:

```bash
npm run dev:server
npm run dev:client
```

The client uses relative `/api` requests. Vite proxies those requests to the
local Express server during development, while Vercel routes them to the
deployed Express API in production.

Copy `.env.example` to `.env.local` and supply the Supabase project URL and
publishable key before starting Vite. These are public client configuration;
never place a service-role secret in a `VITE_` variable.
