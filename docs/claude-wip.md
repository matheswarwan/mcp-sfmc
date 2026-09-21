# Work in progress

## Just done

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
