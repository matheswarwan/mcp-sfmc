# mcp-sfmc

An MCP (Model Context Protocol) server for Salesforce Marketing Cloud REST and SOAP APIs.

## Features

- **90+ tools** covering all major SFMC API areas
- Guided setup: `mcp-sfmc init` creates the config, verifies credentials against SFMC and detects your MID
- Multiple business units, selectable by name from chat
- Automatic token management with refresh (tokens expire after 20 min)
- REST API support: Auth, Assets, Contacts, Data Events, Journeys, Transactional Messaging, Push, SMS, ENS, Audit
- SOAP API support: Data Extensions, Automations, Subscribers, Users, Admin

## Installation

```bash
npm install -g mcp-sfmc
```

## Quick start

```bash
mcp-sfmc init
```

This walks you through adding your first business unit, verifies the credentials against SFMC before saving anything, fills in the MID for you, and prints the command to register the server with your client.
Nothing needs to be created by hand.
The config file is created at `~/.config/sfmc/accounts.json` with `0600` permissions, and the client secret is never echoed as you type it.

Then register the server:

```bash
claude mcp add sfmc --scope user -- mcp-sfmc
```

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

## License

MIT
