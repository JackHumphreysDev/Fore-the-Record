# Versioning and release notes

Fore the Record uses one application version across the root, client, and server packages. The current version is `0.2.0`.

## Version format

Versions use `MAJOR.MINOR.PATCH`:

- **MAJOR** — a stable release with an intentionally incompatible product or data change. The project remains on major version `0` while it is in active pre-release development.
- **MINOR** — a new user-facing feature or a substantial compatible capability, such as competition rounds or the admin portal.
- **PATCH** — a compatible bug fix, security hardening, or documentation-only release.

Examples:

- `0.1.0` → `0.2.0` for a new feedback-submission feature.
- `0.2.0` → `0.2.1` for a correction to feedback validation.
- `0.x.x` → `1.0.0` when the product is ready for its first stable release.

Do not increase the version for every commit. Increase it once for a coherent release.

## Source of truth

The root `package.json` is the source of truth. Before a release, keep these versions identical:

- `package.json`
- `client/package.json`
- `server/package.json`
- their corresponding entries in `package-lock.json`

The version is part of the development record. It does not need to appear in the user-facing **What's New** section.

## Release checklist

For every release:

1. Finish and review the feature or fix on its branch.
2. Run the full tests, lint, production build, deployment type-check, and relevant manual checks.
3. Choose the next version using the rules above and update all package version fields together.
4. Move the completed entries from **Unreleased** in `CHANGELOG.md` into a dated version section.
5. Write a separate plain-language **What's New** entry containing only changes useful to ordinary players.
6. Keep database, security, deployment, and refactoring details in the developer/admin changelog only.
7. Merge through a pull request and verify the Production deployment.

## User-facing update language

The in-app update section is for non-technical users. Each entry should include:

- a short feature title;
- the date it became available;
- one or two sentences explaining what the player can now do;
- any action the player needs to take.

Do not include database migrations, API changes, authentication internals, dependency updates, or version numbers in that section.
