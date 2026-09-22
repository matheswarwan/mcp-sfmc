# mcp-sfmc

An MCP (Model Context Protocol) server for Salesforce Marketing Cloud REST and SOAP APIs.

## Features

- **126 tools** covering all major SFMC API areas
- Guided setup: `mcp-sfmc init` creates the config, verifies credentials against SFMC and detects your MID
- Multiple business units, selectable by name from chat
- Automatic token management with refresh (tokens expire after 20 min)
- REST API support: Auth, Assets, Contacts, Data Events, Journeys, Transactional Messaging, Push, SMS, ENS, Audit
- SOAP API support: Data Extensions, Automations, Subscribers, Users, Admin

## How this compares to Salesforce's MCP server

Salesforce ships a first-party [MCP Server for Marketing Cloud Engagement](https://developer.salesforce.com/docs/marketing/mce-mcp/guide/mce-mcp.html), generally available since June 2026.
It is hosted by Salesforce and reached over HTTP.
This project is an independent, locally run server and is not affiliated with Salesforce.

They solve overlapping problems in different ways, and for a lot of teams the right answer is Salesforce's.

| | Salesforce MCE MCP Server | mcp-sfmc |
|---|---|---|
| Maintained by | Salesforce, first party, supported | This repository, MIT licensed |
| Where it runs | Hosted by Salesforce, remote HTTP endpoint | Your machine, over stdio |
| Works with | Any MCP client, including browser based ones such as claude.ai and ChatGPT | Clients that can launch a local process: Claude Code, Claude Desktop, VS Code, Cursor, Windsurf, Gemini CLI, Codex CLI |
| Authentication | OAuth against a dedicated installed package; you authenticate as yourself | `client_credentials` from an installed package, stored locally at `0600` |
| Effective permissions | The installed package's scopes intersected with your own user permissions | Whatever the installed package allows; there is no user identity behind the calls |
| Business units | A connection is scoped to the business unit its installed package belongs to | Many business units in one config, chosen by name in conversation |
| API surface | Tools over core Engagement features, closely mapped to the REST routes | 126 tools across both REST and SOAP |
| Cost | Included with Marketing Cloud Engagement | Free |

### When Salesforce's server is the better choice

- You want something supported, with Salesforce accountable for its behaviour and its roadmap.
- Per-user permission enforcement matters, because several people will use it and their existing Marketing Cloud permissions should still apply.
- You want to use it from a browser based client, which a local stdio server cannot serve.
- You would rather no credential material sat on a laptop at all.

### When this one fits

- You work in a terminal based client and want the server running locally, with no third party between you and your tenant.
- You move between several business units in a single session, rather than one connection per business unit.
- You need SOAP operations, such as starting, stopping and pausing automations, retrieving data extension rows, or reading subscriber, user and account objects.
- You want to read, fork or extend the code, or run it somewhere a hosted endpoint is not reachable.

### Using both

Nothing stops you registering both at once, and the tool names do not collide.
A reasonable split is Salesforce's server for governed day to day work, and this one for local development, SOAP-only tasks and cross business unit work.

### Points worth knowing either way

- Marketing Cloud API limits apply the same way to both.
- Both expose tools that change data irreversibly. Ask for a dry run, or for the plan, before letting an assistant run a destructive tool.
- Scope the installed package to what the assistant actually needs. That is the real permission boundary in both cases.

## Getting started

Six steps from nothing to a working server. Nothing is created by hand.

### 1. Install

```bash
npm install -g mcp-sfmc
mcp-sfmc --version
```

If `mcp-sfmc` is not found straight after installing, your npm global bin directory is not on your PATH.
See [Executable not found in $PATH](#executable-not-found-in-path-mcp-sfmc) below, which is a common one on Homebrew node.

### 2. Check what is configured

Before adding anything, confirm which file the CLI will use:

```bash
mcp-sfmc path
```

It prints the config path and exits non-zero while that file does not exist yet.
Starting the server at this point tells you the same thing rather than failing obscurely:

```bash
mcp-sfmc
# No SFMC accounts configured. Expected a config file at ~/.config/sfmc/accounts.json.
# Run "mcp-sfmc init" to create one.
```

### 3. Add your first business unit

```bash
mcp-sfmc init
```

You are asked for a name to use in chat, your tenant subdomain, the client ID and the client secret.
The secret is not echoed as you type.
Leave the MID blank and it is detected for you.

The credentials are checked against SFMC before anything is written, so a typo fails here rather than in the middle of a chat later.
The file is created at `~/.config/sfmc/accounts.json` with `0600` permissions.

### 4. Add any other business units

```bash
mcp-sfmc add     # repeat per business unit
mcp-sfmc list    # what is configured, secrets redacted
mcp-sfmc test    # request a token for each one
```

`mcp-sfmc test` prints `ok (MID ...)` per business unit.
A 4xx is reported as a credential problem and a 5xx as a server or proxy error, so a corporate proxy is not mistaken for a bad secret.

### 5. Register the server with your client

This is the step that connects everything up. For Claude Code:

```bash
claude mcp add sfmc --scope user -- mcp-sfmc
claude mcp list
```

`claude mcp list` should show `sfmc ... ✓ Connected`.
Drop `--scope user` to register it for the current project only.
For Claude Desktop, VS Code, Cursor, Windsurf, Gemini CLI and Codex CLI, see [Connect from your client](#connect-from-your-client).

Two things worth knowing here:

- If `mcp-sfmc` is not on the PATH of whatever launches your client, register it by absolute path instead: `claude mcp add sfmc --scope user -- "$HOME/.npm-global/bin/mcp-sfmc"`.
- Only add `--env SFMC_CONFIG_PATH=...` if you keep your accounts file somewhere other than the default. When the client sets that variable and your shell does not, `mcp-sfmc add` and the server read different files, and a newly added business unit appears to vanish. Leaving it out keeps both sides on the same file.

### 6. Verify from your client

In Claude Code, run `/mcp`, select **sfmc**, and check it reports `connected` with its tools listed.
Then ask in chat:

> "List my SFMC business units"

The reply lists every business unit you configured, along with the config file they came from.
If one is missing, the response and the server log both name the file in use and warn about any other config holding business units.

## Managing business units

```bash
mcp-sfmc init            # set up the config file and add your first business unit
mcp-sfmc add             # add another business unit
mcp-sfmc list            # list configured business units, secrets redacted
mcp-sfmc test [name]     # request a token for one or all business units
mcp-sfmc remove <name>   # remove a business unit
mcp-sfmc path            # print the config file path
mcp-sfmc help            # show usage
```

`add` and `init` also accept flags, so setup can be scripted or run in CI:

```bash
mcp-sfmc add --name "Sales" --subdomain mc123abc --client-id abc123 --client-secret "$SECRET"
```

| Flag | Description |
|---|---|
| `--name` | Business unit name you will use in chat |
| `--subdomain` | Tenant subdomain; a full `https://...marketingcloudapis.com` URL is also accepted |
| `--client-id` | Installed package client ID |
| `--client-secret` | Client secret, or set `SFMC_CLIENT_SECRET` to keep it out of your shell history |
| `--account-id` | MID; detected automatically when omitted |
| `--no-verify` | Save without checking the credentials against SFMC |

Adding a business unit takes effect immediately.
The server re-reads the config file when it changes, so there is no need to restart your MCP client.

## Configuration file

The config file is resolved in this order:

1. `$SFMC_CONFIG_PATH`
2. `$XDG_CONFIG_HOME/sfmc/accounts.json`
3. `~/.config/sfmc/accounts.json`

It holds an array of business unit credentials:

```json
[
  {
    "business_unit_name": "Primary",
    "subdomain": "your-subdomain",
    "grant_type": "client_credentials",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "account_id": "your-mid"
  }
]
```

| Field | Required | Description |
|---|---|---|
| `business_unit_name` | Yes | Display name used to identify this BU in tool calls |
| `subdomain` | Yes | Your tenant subdomain (e.g. `abc123def456`) |
| `grant_type` | Yes | Always `client_credentials` |
| `client_id` | Yes | OAuth client ID |
| `client_secret` | Yes | OAuth client secret |
| `account_id` | No | MID of the business unit |

### Multiple business units

Every tool accepts an optional `business_unit` parameter. If omitted, the first account in the config file is used.

> "List journeys for the Sales business unit"

### Configuring through the environment

A single business unit can be supplied entirely through environment variables, which suits containers and CI.
When these are set they take precedence over the config file:

| Variable | Required | Description |
|---|---|---|
| `SFMC_SUBDOMAIN` | Yes | Tenant subdomain |
| `SFMC_CLIENT_ID` | Yes | OAuth client ID |
| `SFMC_CLIENT_SECRET` | Yes | OAuth client secret |
| `SFMC_ACCOUNT_ID` | No | MID |
| `SFMC_BUSINESS_UNIT_NAME` | No | Display name, defaults to `Default` |

## Connect from your client

`mcp-sfmc` runs locally over stdio.
Every client below launches the same command, `mcp-sfmc`, and picks up the config file created by `mcp-sfmc init`.
If you keep your config somewhere else, add `SFMC_CONFIG_PATH` to the `env` block, or pass `--env SFMC_CONFIG_PATH=...` to `claude mcp add`.

### Claude Code

```bash
claude mcp add sfmc --scope user -- mcp-sfmc
```

Drop `--scope user` to register the server for the current project only.
Verify with `claude mcp list`, or `/mcp` inside a session.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "sfmc": {
      "command": "mcp-sfmc"
    }
  }
}
```

Restart Claude Desktop after saving.

### VS Code (GitHub Copilot agent mode)

Create `.vscode/mcp.json` in the workspace, or add the same block to your user `mcp.json` via **MCP: Open User Configuration**:

```json
{
  "servers": {
    "sfmc": {
      "type": "stdio",
      "command": "mcp-sfmc"
    }
  }
}
```

Or add it in one command:

```bash
code --add-mcp '{"name":"sfmc","command":"mcp-sfmc"}'
```

### Cursor

Add to `~/.cursor/mcp.json` for all projects, or `.cursor/mcp.json` for one project:

```json
{
  "mcpServers": {
    "sfmc": {
      "command": "mcp-sfmc"
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "sfmc": {
      "command": "mcp-sfmc"
    }
  }
}
```

### Gemini CLI

Add to `~/.gemini/settings.json` (or `.gemini/settings.json` in a project):

```json
{
  "mcpServers": {
    "sfmc": {
      "command": "mcp-sfmc"
    }
  }
}
```

### Codex CLI

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.sfmc]
command = "mcp-sfmc"
```

### Without installing globally

Replace `"command": "mcp-sfmc"` with `"command": "npx", "args": ["-y", "mcp-sfmc"]` in any of the snippets above.

### Troubleshooting

Start with the CLI, which checks the parts a client cannot:

```bash
mcp-sfmc path     # which config file is in use
mcp-sfmc list     # what is configured
mcp-sfmc test     # whether SFMC accepts each set of credentials
```

`mcp-sfmc test` distinguishes a rejected credential (HTTP 4xx) from an SFMC or proxy failure (HTTP 5xx), so a corporate proxy or VPN is not mistaken for a bad client secret.

#### A business unit you added does not show up

The CLI and the server each resolve the config path independently, and they only agree when they see the same environment.
An MCP client that sets `SFMC_CONFIG_PATH` reads that file, while `mcp-sfmc add` run in a plain shell writes to the default location, so the new business unit lands somewhere the server never looks.

The server names its config file on startup and warns when another one holds business units:

```
SFMC MCP Server: config /Users/you/.config/sfmc/accounts.json
SFMC MCP Server: loaded 2 business unit(s): Primary, Sales
SFMC MCP Server: warning: /elsewhere/accounts.json also holds 1 business unit(s) but is not being used.
```

`sfmc_list_business_units` reports the same `config_source` and warning, so the mismatch is visible from chat.
`mcp-sfmc path` prints the file the CLI would use.

The simplest fix is to stop overriding the path: move your accounts file to `~/.config/sfmc/accounts.json` and re-register the server without `--env SFMC_CONFIG_PATH=...`, so both sides resolve to the same file.

#### "Executable not found in $PATH: mcp-sfmc"

The package is installed but your client cannot launch it.
This is a PATH problem, not a server problem.

```bash
npm ls -g --depth=0         # is mcp-sfmc listed?
which mcp-sfmc              # is it reachable?
echo "$(npm prefix -g)/bin" # where npm put the binary
```

If `npm ls -g` lists it but `which` cannot find it, the npm global bin directory is not on your PATH.
On Homebrew node that directory is version pinned, for example `/opt/homebrew/Cellar/node/25.8.0/bin`, and Homebrew only symlinks the binaries that existed when the formula was linked.

Two traps to avoid when fixing your shell profile:

- `npm bin` and `npm -g bin` were removed in npm 9, so a line like `export PATH="$(npm -g bin):$PATH"` silently injects npm's error text into your PATH instead of a directory. Use `$(npm prefix -g)/bin` if you want the dynamic form.
- `npm config set prefix` and `NPM_CONFIG_PREFIX` both break nvm, which refuses to run when a global prefix is configured.

The approach that survives a `brew upgrade node` and stays compatible with nvm is a per-install prefix:

```bash
npm install -g --prefix "$HOME/.npm-global" mcp-sfmc
export PATH="$HOME/.npm-global/bin:$PATH"   # add this to ~/.zshrc
```

Then register the server by absolute path, so it does not depend on the PATH of whatever process launches it:

```bash
claude mcp add sfmc --scope user -- "$HOME/.npm-global/bin/mcp-sfmc"
```

#### Checking the server without a client

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"debug","version":"1"}}}' | mcp-sfmc
```

A healthy server prints the business units it loaded on stderr and returns an `initialize` result on stdout.

### Web clients (claude.ai, ChatGPT)

Not supported directly.
Those clients only connect to remote MCP servers over HTTP, and this server speaks stdio on your machine.
To use it from a browser client you would need to host it behind an HTTP MCP endpoint with its own authentication, which this package does not provide.

> **Keep credentials out of client config files.**
> Only a path belongs in client config; the client IDs and secrets stay in the accounts file, which `mcp-sfmc` writes with `0600` permissions.

## Available Tools

### Authentication
- `sfmc_get_token` — Request a new access token
- `sfmc_get_user_info` — Get current user info
- `sfmc_discovery` — Discover available API resources

### Content Builder (Assets)
- `sfmc_asset_list` — List assets
- `sfmc_asset_get` — Get asset by ID
- `sfmc_asset_create` — Create asset (image, template, HTML email, etc.)
- `sfmc_asset_update` — Update asset
- `sfmc_asset_delete` — Delete asset
- `sfmc_asset_query` — Advanced asset search
- `sfmc_asset_get_categories` — List folders
- `sfmc_asset_create_category` — Create folder
- `sfmc_asset_update_category` — Update folder
- `sfmc_asset_delete_category` — Delete folder

### Contacts
- `sfmc_contact_create` — Create contact
- `sfmc_contact_update` — Update contact
- `sfmc_contact_search_by_email` — Search contacts by email
- `sfmc_contact_delete` — Delete contacts
- `sfmc_contact_get_schema` — Get contact schema
- `sfmc_validate_email` — Validate email address

### Data Events (Data Extensions via REST)
- `sfmc_de_upsert_rows_by_key` / `sfmc_de_upsert_rows_by_id` — Bulk upsert rows
- `sfmc_de_upsert_row_by_key` / `sfmc_de_upsert_row_by_id` — Single row upsert
- `sfmc_de_increment_column_by_key` / `sfmc_de_increment_column_by_id` — Increment numeric column
- `sfmc_de_async_*` — Async variants of all above
- `sfmc_data_import_file` — Import file async
- `sfmc_data_import_status` — Check import status

### Journey Builder
- `sfmc_journey_list` — List journeys
- `sfmc_journey_get` — Get journey by ID
- `sfmc_journey_create` — Create journey
- `sfmc_journey_publish` — Publish journey
- `sfmc_journey_stop` — Stop journey
- `sfmc_journey_delete` — Delete journey
- `sfmc_journey_fire_entry_event` — Inject contact into journey
- `sfmc_journey_exit_contact` — Remove contact from journey
- `sfmc_journey_contact_membership` — Check journey membership
- `sfmc_journey_get_event_definitions` — List event definitions
- `sfmc_journey_create_event_definition` — Create event definition

### Transactional Messaging
- `sfmc_tx_email_create_definition` — Create email send definition
- `sfmc_tx_email_send_single` — Send single transactional email
- `sfmc_tx_email_send_batch` — Send batch of emails
- `sfmc_tx_email_get_message_status` — Check delivery status
- `sfmc_tx_sms_create_definition` — Create SMS send definition
- `sfmc_tx_sms_send_single` — Send single transactional SMS
- `sfmc_triggered_send` — Send via classic Triggered Send

### Push Notifications
- `sfmc_push_create_message` — Create push message
- `sfmc_push_broadcast_message` — Broadcast to all subscribers
- `sfmc_push_send_to_list` — Send to list
- `sfmc_push_create_location` / `sfmc_push_list_locations` — Manage geofence locations

### SMS
- `sfmc_sms_send_message` — Send SMS to contacts
- `sfmc_sms_create_keyword` — Create SMS keyword
- `sfmc_sms_optin` — Opt-in mobile number
- `sfmc_sms_create_subscription` — Create SMS subscription

### Event Notification Service (ENS)
- `sfmc_ens_create_callback` — Register webhook endpoint
- `sfmc_ens_create_subscription` — Subscribe to event types
- `sfmc_ens_list_callbacks` / `sfmc_ens_list_subscriptions_by_callback` — List callbacks/subscriptions

### Audit
- `sfmc_audit_get_events` — Get audit events
- `sfmc_audit_get_security_events` — Get security events

### SOAP APIs
- `sfmc_soap_de_retrieve` — Query Data Extension rows
- `sfmc_soap_de_create_definition` — Create Data Extension
- `sfmc_soap_de_upsert_rows` — Upsert rows
- `sfmc_soap_de_delete_rows` — Delete rows
- `sfmc_soap_de_clear` — Clear all DE rows
- `sfmc_soap_automation_retrieve` — List automations
- `sfmc_soap_automation_start` / `sfmc_soap_automation_stop` / `sfmc_soap_automation_pause` — Control automations
- `sfmc_soap_automation_run_once` — Run automation immediately
- `sfmc_soap_subscriber_retrieve` — Retrieve subscribers
- `sfmc_soap_subscriber_upsert` — Create/update subscriber
- `sfmc_soap_user_retrieve` — Retrieve users
- `sfmc_soap_account_retrieve` — Retrieve business units

## Development

```bash
git clone https://github.com/matheswarwan/mcp-sfmc
cd mcp-sfmc
npm install
npm run build
npm test
```

Run locally:
```bash
SFMC_CONFIG_PATH=./sfmc-accounts.json npm start
```

The test suite uses the Node built-in test runner and needs no credentials or network access.
One case drives the interactive prompts through `expect` to prove the secret is never echoed; it is skipped when `expect` is not installed.

## Releasing

Releases are published to npm by GitHub Actions, not from a laptop.

1. Bump the version on `main`: `npm version patch|minor|major`
2. Push the commit and the tag: `git push && git push --tags`
3. Publish a GitHub release for that tag

The workflow runs the test suite on Node 20 and 22, refuses to continue when the release tag and `package.json` disagree, checks that the tarball contains nothing but `dist`, `README.md` and `package.json`, and publishes with a provenance attestation.

Authentication prefers npm trusted publishing (OIDC), which needs no stored secret.
Configure it once in the package settings on npmjs.com by adding this repository and the `npm-publish.yml` workflow as a trusted publisher.
Until that is done, the workflow falls back to an `NPM_TOKEN` repository secret, which should be a granular access token with read and write access to this package.

## License

MIT
