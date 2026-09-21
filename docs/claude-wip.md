# Work in progress

## Just done

### Release automation

- Replaced the stock GitHub template in `.github/workflows/npm-publish.yml`.
  The template published on `release: created` using a long lived `npm_token` secret, ran no tag check and produced no provenance.
- The workflow now tests on Node 20 and 22, verifies the release tag against `package.json`, inspects the tarball for anything outside `dist`, `README.md` and `package.json`, and publishes with a provenance attestation.
- Authentication prefers npm trusted publishing over OIDC, with an `NPM_TOKEN` secret as fallback.
  This matters because publishing from a laptop is currently blocked: the npm account has 2FA set to `auth-and-writes` and the TOTP secret is not generating codes in 1Password.
- Added `.github/workflows/ci.yml` so tests run on pull requests, not only at release time.
- Added `repository`, `bugs` and `homepage` to `package.json`; provenance requires `repository` to match the building repo.

### Account setup CLI (v1.2.0)

The binary is dual mode: no arguments starts the MCP server, arguments run a setup CLI (`init`, `add`, `list`, `test`, `remove`, `path`, `help`, `version`).
`add` creates the config file and parent directories from nothing, verifies credentials against SFMC before saving, and fills in the MID from `/platform/v1/tokenContext`.
The secret prompt reads raw bytes with echo disabled; the first readline based attempt did not actually suppress the echo, which a pty driven test caught.
`SFMC_CONFIG_PATH` is optional, falling back to `$XDG_CONFIG_HOME/sfmc/accounts.json` then `~/.config/sfmc/accounts.json`.
The config loader re-reads on mtime change, so a new business unit is picked up without restarting the MCP client.

Merged as PR #18. 27 tests, no credentials or network needed.

## Blocked

- **1.2.0 is not on npm.** The registry still serves 1.1.3.
  `npm publish` fails with 403 because the account requires 2FA or a granular token, and the TOTP secret is not producing codes.
  Unblocking needs either a working authenticator entry, or a granular access token created on npmjs.com, or the trusted publisher configured for this repo.
  All three need a working login to npmjs.com.

## Next candidates

- Configure the trusted publisher on npmjs.com, then cut the v1.2.0 release and let the workflow publish.
- Verify the client snippets by registering the server in Cursor, Windsurf, VS Code and Codex; only Claude Code is confirmed.
- 79 Dependabot alerts on the default branch are unaddressed.
- Consider an HTTP transport so browser clients can connect; that pulls in auth and hosting.
- Consider reading secrets from the macOS keychain so the accounts file holds references rather than secrets.
- The tool catalogue in the README uses em dashes, which the project style avoids; worth normalising in a separate pass.
