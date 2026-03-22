# mcp-sfmc

An MCP (Model Context Protocol) server for Salesforce Marketing Cloud REST and SOAP APIs.

## Features

- **90+ tools** covering all major SFMC API areas
- Automatic token management with refresh (tokens expire after 20 min)
- REST API support: Auth, Assets, Contacts, Data Events, Journeys, Transactional Messaging, Push, SMS, ENS, Audit
- SOAP API support: Data Extensions, Automations, Subscribers, Users, Admin

## Installation

```bash
npm install -g mcp-sfmc
```

## Configuration

Set the following environment variables:

| Variable | Required | Description |
|---|---|---|
| `SFMC_SUBDOMAIN` | Yes | Your tenant subdomain (e.g. `abc123def456`) |
| `SFMC_CLIENT_ID` | Yes | OAuth client ID |
| `SFMC_CLIENT_SECRET` | Yes | OAuth client secret |
| `SFMC_ACCOUNT_ID` | No | MID of the business unit |

## Usage with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sfmc": {
      "command": "mcp-sfmc",
      "env": {
        "SFMC_SUBDOMAIN": "your-subdomain",
        "SFMC_CLIENT_ID": "your-client-id",
        "SFMC_CLIENT_SECRET": "your-client-secret",
        "SFMC_ACCOUNT_ID": "your-mid"
      }
    }
  }
}
```

## Usage with npx (no install)

```json
{
  "mcpServers": {
    "sfmc": {
      "command": "npx",
      "args": ["mcp-sfmc"],
      "env": {
        "SFMC_SUBDOMAIN": "your-subdomain",
        "SFMC_CLIENT_ID": "your-client-id",
        "SFMC_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

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
git clone https://github.com/your-username/mcp-sfmc
cd mcp-sfmc
npm install
npm run build
```

Run locally:
```bash
SFMC_SUBDOMAIN=xxx SFMC_CLIENT_ID=xxx SFMC_CLIENT_SECRET=xxx npm start
```

## License

MIT
