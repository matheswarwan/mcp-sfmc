# Work in progress

## Just done

### Account setup CLI (v1.2.0)

The binary is now dual mode: no arguments starts the MCP server as before, arguments run a setup CLI.

- `init`, `add`, `list`, `test`, `remove`, `path`, `help`, `version` in `src/cli.ts`.
- `add` creates the config file and its parent directories from nothing on first run, so there is no hand-written JSON step.
- Credentials are verified against SFMC before anything is saved, and the MID is filled in from `/platform/v1/tokenContext` when the user leaves it blank.
- The secret prompt reads raw bytes with echo disabled rather than driving readline internals, which did not actually suppress the echo.
- `SFMC_CONFIG_PATH` is now optional: the path falls back to `$XDG_CONFIG_HOME/sfmc/accounts.json` then `~/.config/sfmc/accounts.json`, which removes the env var from every client snippet.
- The config loader re-reads on mtime change, so a newly added business unit works without restarting the MCP client.
- A single business unit can come entirely from environment variables, for containers and CI.
- `serverInfo.version` now comes from the manifest instead of the hardcoded `1.0.0`.

Testing: 27 cases under `test/`, using the Node built-in runner against `dist/`, no credentials or network required.
One case drives the interactive prompts through `expect` and asserts the typed secret never reaches the terminal; it skips when `expect` is absent.
Verified live against both real business units with `mcp-sfmc test`, including MID auto-detection for the BU that had no `account_id`.

### Earlier

- README: per-client setup for Claude Code, Claude Desktop, VS Code, Cursor, Windsurf, Gemini CLI and Codex CLI, plus troubleshooting.
- Debugged a local "failed to connect": `~/.zshrc` used `export PATH="$(npm -g bin):$PATH"`, and `npm bin` was removed in npm 9, so npm's error text was spliced into PATH in place of the npm global bin directory.
  Fixed on the machine with a `~/.npm-global` per-install prefix; a global npm prefix was avoided because nvm is loaded from `~/.zprofile` and refuses to run alongside one.

## Next candidates

- Publish 1.2.0 to npm; the registry is still on 1.1.3.
- Verify the client snippets by actually registering the server in Cursor, Windsurf, VS Code and Codex; only the Claude Code path is confirmed.
- Consider an HTTP transport so browser clients can connect; that pulls in auth and hosting.
- Consider reading secrets from the macOS keychain, e.g. a `keychain:` prefix on `client_secret`, so the file holds references rather than secrets.
- The tool catalogue in the README uses em dashes, which the project style avoids; worth normalising in a separate pass.
