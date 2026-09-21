# mcp-sfmc project context

## What this is

An MCP server (npm package `mcp-sfmc`, bin `mcp-sfmc`) exposing Salesforce Marketing Cloud REST and SOAP APIs as MCP tools.
Runs locally over stdio only; there is no HTTP transport, so browser clients such as claude.ai and ChatGPT cannot connect.

## Dual mode binary

`dist/index.js` is both the MCP server and a setup CLI.
With no arguments it starts the stdio server, which is what MCP clients launch.
With arguments it runs the CLI: `init`, `add`, `list`, `test`, `remove`, `path`, `help`, `version`.
The dispatch lives at the bottom of `src/index.ts`.

## Layout

- `src/index.ts` - argv dispatch, server bootstrap, tool registry, tool-call dispatch to the per-area handlers.
- `src/cli.ts` - the setup CLI: prompting (including no-echo secret entry via raw mode), flag parsing, credential verification, MID detection.
- `src/config.ts` - config path resolution, read/write of the accounts file, mtime-based cache, environment fallback.
- `src/auth.ts` - OAuth `client_credentials` token fetch and in-memory cache (SFMC tokens expire in 20 min).
- `src/client.ts` - axios REST client plus SOAP envelope build/parse (fast-xml-parser).
- `src/version.ts` - reads the version from the installed manifest so it is never duplicated in source.
- `src/types.ts` - account and config types.
- `src/tools/*.ts` - one module per API area (auth, assets, contacts, data-events, journeys, transactional, push-sms, ens, soap), each exporting a tool list and a handler.
- `test/*.test.js` - Node built-in test runner, plain JS against `dist/`, no credentials or network needed.
- `docs/Salesforce Marketing Cloud APIs.postman_collection.json` - upstream API reference used to derive tool shapes.

## Config model

Accounts are resolved in this order:

1. `SFMC_SUBDOMAIN` + `SFMC_CLIENT_ID` + `SFMC_CLIENT_SECRET` environment variables, which define a single business unit and take precedence.
2. A JSON file at `$SFMC_CONFIG_PATH`, else `$XDG_CONFIG_HOME/sfmc/accounts.json`, else `~/.config/sfmc/accounts.json`.

The file holds an array of `business_unit_name`, `subdomain`, `grant_type`, `client_id`, `client_secret`, optional `account_id`.
Every tool takes an optional `business_unit`; when omitted the first account wins.
`sfmc_list_business_units` lists what is configured.

The loader caches by path and mtime, so a business unit added by the CLI is visible to a running server without restarting the MCP client.
Writes are atomic (temp file plus rename) and always `0600`, with a warning when an existing file is group or world readable.

## Conventions

- Secrets belong in the accounts file or the environment, never in client config and never in an MCP tool argument, which would put them in model context.
- Tool names are prefixed `sfmc_`, with `sfmc_soap_` for the SOAP surface.
- Build with `npm run build` (tsc to `dist/`); `npm test` builds first, then runs the suite.
- Only `dist` and `README.md` are published, so tests and docs stay out of the tarball.

## CI and releases

- `.github/workflows/ci.yml` - builds and tests every push to `main` and every pull request, on Node 20 and 22.
- `.github/workflows/npm-publish.yml` - publishes to npm when a GitHub release is published, or on manual dispatch.

The publish job checks the release tag against `package.json`, refuses a tarball containing anything outside `dist`, `README.md` and `package.json`, and publishes with provenance.
Authentication prefers trusted publishing over OIDC (`id-token: write`, npm 11.5.1 or newer) and falls back to an `NPM_TOKEN` secret when one is set.
Because the `secrets` context cannot be read from a step-level `if`, the token is surfaced as a job-level `env` value and the two publish steps branch on that.

Both workflows install `expect` so the pty driven test that proves the secret prompt does not echo actually runs rather than skipping.

Provenance requires the `repository` field in `package.json` to match the building repository, which is why that field exists.

## Docs to keep current

- `README.md` - quick start, CLI reference, config schema, per-client setup, troubleshooting, full tool catalogue.
- `docs/claude-wip.md` - current and next work.
