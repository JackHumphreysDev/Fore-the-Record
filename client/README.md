# Fore the Record client

The React and TypeScript frontend for Fore the Record.

## Current functionality

- Responsive application shell and project branding
- Profile creation form with client-side validation
- Loading, API-error, and successful-profile states
- Interactive Profile and Courses navigation
- Full or partial club-name search with tee selection and course-library persistence
- Local `/api` proxy to the Express server on port `3000`

## Local development

Run the API and client in separate terminals from the repository root:

```bash
npm run dev:server
npm run dev:client
```

The client uses relative `/api` requests. Vite proxies those requests to the
local Express server during development; deployment routing will be configured
when hosting is implemented.
