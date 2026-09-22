# Work in progress

## Just done

### Comparison with Salesforce's first party server (v1.3.2)

Added a README section comparing this project with the [MCP Server for Marketing Cloud Engagement](https://developer.salesforce.com/docs/marketing/mce-mcp/guide/mce-mcp.html), GA since June 2026.
Salesforce's is hosted and reached over HTTP, authenticates the user through an installed package, and enforces the intersection of package scopes and that user's permissions.
This one runs locally over stdio, uses `client_credentials` with no user identity, holds several business units in one config, and covers SOAP as well as REST.
The section says plainly when Salesforce's is the better choice, rather than only listing this project's strengths.

Sourcing note: developer.salesforce.com returns 403 to automated fetches, so the facts came from search indexed documentation plus first hand evidence in the environment, where MCE MCP endpoints are registered as remote HTTP servers with per tenant URLs requiring OAuth.
Worth re-checking against the live docs, especially anything about editions or cost, which was not established.

Also corrected the Features line from "90+ tools" to 126, verified against `tools/list` from the built server.

### README walkthrough (v1.3.1)

Replaced the two line "Installation" and "Quick start" sections with a numbered six step walkthrough: install, check what is configured, `init`, add the rest, register with the client, verify from chat.
Step 5 spells out the wiring that was previously implicit, including registering by absolute path when PATH is unreliable, and why adding `--env SFMC_CONFIG_PATH=...` invites the config mismatch.
Note there is only one README: `files` in `package.json` is `["dist", "README.md"]`, so the same file renders on GitHub and on npmjs.com, and the npm page only refreshes on publish.

### Config mismatch diagnostics (v1.3.0)

A business unit added with the CLI could silently fail to appear in the MCP client.
The cause was not different resolution logic, which is shared, but different environments: Claude Code injects `SFMC_CONFIG_PATH` into the server process, while an interactive shell has no such variable, so `add` wrote to `~/.config/sfmc/accounts.json` while the server read a pinned path.

- The server now logs its config source at startup, and warns when another candidate config holds business units.
- `sfmc_list_business_units` returns `config_source` and the same warning, so the mismatch is visible from chat instead of inferred.
- `mcp-sfmc add` and `list` print the same warning.
- Candidate paths are only the ones the resolver could actually choose under the current environment. An earlier version also counted `~/.config` while `XDG_CONFIG_HOME` pointed elsewhere, which produced a warning about a file that could never load; a test caught it.

### Fixed a race in the secret prompt

`askSecret` wrote the prompt before attaching the stdin listener, leaving a window where input arriving immediately was read by nobody.
It showed up as the pty test failing roughly one run in eight, and would lose characters for a fast typist or a paste.
The listener is now attached first. 15 consecutive clean runs after the fix.

### Earlier

- v1.2.0: setup CLI (`init`, `add`, `list`, `test`, `remove`, `path`), optional `SFMC_CONFIG_PATH`, mtime reload, published to npm with provenance via trusted publishing.
- Release automation in `.github/workflows/npm-publish.yml`, CI on pull requests in `ci.yml`.

## Next candidates

- README says "90+ tools"; the server actually exposes 126.
- 79 Dependabot alerts on the default branch.
- Verify the client snippets by registering the server in Cursor, Windsurf, VS Code and Codex; only Claude Code is confirmed.
- Consider an HTTP transport so browser clients can connect.
- Consider reading secrets from the macOS keychain so the accounts file holds references rather than secrets.
- The tool catalogue in the README uses em dashes, which the project style avoids.
