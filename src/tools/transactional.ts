import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { SFMCConfig } from "../types.js";
import { restRequest } from "../client.js";

export const transactionalTools: Tool[] = [
  // Email Transactional
  {
    name: "sfmc_tx_email_create_definition",
    description: "Create a transactional email send definition",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string", description: "Unique key for this definition" },
        name: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["Active", "Inactive"] },
        classification: { type: "string", description: "e.g. 'Default Transactional'" },
        content: {
          type: "object",
          description: "Content object with customerKey (asset ID)",
        },
        subscriptions: {
          type: "object",
          description: "Subscription settings (list, autoAddSubscriber, updateSubscriber)",
        },
        options: { type: "object", description: "Send options" },
      },
      required: ["definitionKey", "name", "content"],
    },
  },
  {
    name: "sfmc_tx_email_list_definitions",
    description: "List all transactional email send definitions",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        pageSize: { type: "number" },
        status: { type: "string" },
        nameOrDescription: { type: "string" },
      },
    },
  },
  {
    name: "sfmc_tx_email_get_definition",
    description: "Get a specific transactional email send definition",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string" },
      },
      required: ["definitionKey"],
    },
  },
  {
    name: "sfmc_tx_email_update_definition",
    description: "Update a transactional email send definition",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        status: { type: "string" },
        content: { type: "object" },
        subscriptions: { type: "object" },
      },
      required: ["definitionKey"],
    },
  },
  {
    name: "sfmc_tx_email_delete_definition",
    description: "Delete a transactional email send definition",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string" },
      },
      required: ["definitionKey"],
    },
  },
  {
    name: "sfmc_tx_email_get_queue",
    description: "Get the send queue for a transactional email definition",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string" },
      },
      required: ["definitionKey"],
    },
  },
  {
    name: "sfmc_tx_email_send_single",
    description: "Send a single transactional email message",
    inputSchema: {
      type: "object",
      properties: {
        messageKey: { type: "string", description: "Unique key for this message (UUID)" },
        definitionKey: { type: "string", description: "Send definition key" },
        recipient: {
          type: "object",
          description: "Recipient object with contactKey, to, attributes",
        },
        content: { type: "object", description: "Optional content overrides" },
        attributes: { type: "object", description: "Additional attributes" },
      },
      required: ["messageKey", "definitionKey", "recipient"],
    },
  },
  {
    name: "sfmc_tx_email_send_batch",
    description: "Send a batch of transactional email messages",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string" },
        recipients: {
          type: "array",
          description: "Array of recipient objects",
          items: { type: "object" },
        },
      },
      required: ["definitionKey", "recipients"],
    },
  },
  {
    name: "sfmc_tx_email_list_messages",
    description: "List transactional email message send statuses",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        pageSize: { type: "number" },
        status: { type: "string" },
      },
    },
  },
  {
    name: "sfmc_tx_email_get_message_status",
    description: "Get the status of a specific transactional email message",
    inputSchema: {
      type: "object",
      properties: {
        messageKey: { type: "string", description: "The message key" },
      },
      required: ["messageKey"],
    },
  },
  // SMS Transactional
  {
    name: "sfmc_tx_sms_create_definition",
    description: "Create a transactional SMS send definition",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["Active", "Inactive"] },
        content: { type: "object", description: "Content with message body" },
        subscriptions: { type: "object" },
      },
      required: ["definitionKey", "name", "content"],
    },
  },
  {
    name: "sfmc_tx_sms_list_definitions",
    description: "List all transactional SMS send definitions",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        pageSize: { type: "number" },
        status: { type: "string" },
      },
    },
  },
  {
    name: "sfmc_tx_sms_get_definition",
    description: "Get a specific transactional SMS send definition",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string" },
      },
      required: ["definitionKey"],
    },
  },
  {
    name: "sfmc_tx_sms_update_definition",
    description: "Update a transactional SMS send definition",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        status: { type: "string" },
        content: { type: "object" },
      },
      required: ["definitionKey"],
    },
  },
  {
    name: "sfmc_tx_sms_delete_definition",
    description: "Delete a transactional SMS send definition",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string" },
      },
      required: ["definitionKey"],
    },
  },
  {
    name: "sfmc_tx_sms_delete_queue",
    description: "Delete the send queue for a transactional SMS definition",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string" },
      },
      required: ["definitionKey"],
    },
  },
  {
    name: "sfmc_tx_sms_get_queue",
    description: "Get the send queue for a transactional SMS definition",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string" },
      },
      required: ["definitionKey"],
    },
  },
  {
    name: "sfmc_tx_sms_send_single",
    description: "Send a single transactional SMS message",
    inputSchema: {
      type: "object",
      properties: {
        messageKey: { type: "string", description: "Unique message key (UUID)" },
        definitionKey: { type: "string" },
        recipient: {
          type: "object",
          description: "Recipient object with contactKey, to (mobile number), attributes",
        },
      },
      required: ["messageKey", "definitionKey", "recipient"],
    },
  },
  {
    name: "sfmc_tx_sms_send_batch",
    description: "Send a batch of transactional SMS messages",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: { type: "string" },
        recipients: {
          type: "array",
          items: { type: "object" },
        },
      },
      required: ["definitionKey", "recipients"],
    },
  },
  {
    name: "sfmc_tx_sms_list_messages",
    description: "List transactional SMS message send statuses",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        pageSize: { type: "number" },
      },
    },
  },
  {
    name: "sfmc_tx_sms_get_message_status",
    description: "Get the status of a specific transactional SMS message",
    inputSchema: {
      type: "object",
      properties: {
        messageKey: { type: "string" },
      },
      required: ["messageKey"],
    },
  },
  // Classic Triggered Send
  {
    name: "sfmc_triggered_send",
    description: "Send via classic Triggered Send Definition",
    inputSchema: {
      type: "object",
      properties: {
        tsdExternalKey: { type: "string", description: "Triggered Send Definition external key" },
        subscribers: {
          type: "array",
          description: "Array of subscriber objects",
          items: { type: "object" },
        },
      },
      required: ["tsdExternalKey", "subscribers"],
    },
  },
  {
    name: "sfmc_triggered_send_get_delivery_record",
    description: "Get delivery record for a triggered send",
    inputSchema: {
      type: "object",
      properties: {
        tsdExternalKey: { type: "string" },
        recipientSendId: { type: "string" },
      },
      required: ["tsdExternalKey", "recipientSendId"],
    },
  },
];

export async function handleTransactionalTool(
  name: string,
  args: Record<string, unknown>,
  config: SFMCConfig
): Promise<unknown> {
  switch (name) {
    case "sfmc_tx_email_create_definition":
      return restRequest(config, "POST", "messaging/v1/email/definitions", args);
    case "sfmc_tx_email_list_definitions": {
      const params: Record<string, string | number | boolean> = {};
      if (args.page) params.page = args.page as number;
      if (args.pageSize) params.pageSize = args.pageSize as number;
      if (args.status) params.status = args.status as string;
      if (args.nameOrDescription) params.nameOrDescription = args.nameOrDescription as string;
      return restRequest(config, "GET", "messaging/v1/email/definitions", undefined, params);
    }
    case "sfmc_tx_email_get_definition":
      return restRequest(config, "GET", `messaging/v1/email/definitions/${args.definitionKey}`);
    case "sfmc_tx_email_update_definition": {
      const { definitionKey, ...body } = args;
      return restRequest(config, "PATCH", `messaging/v1/email/definitions/${definitionKey}`, body);
    }
    case "sfmc_tx_email_delete_definition":
      return restRequest(config, "DELETE", `messaging/v1/email/definitions/${args.definitionKey}`);
    case "sfmc_tx_email_get_queue":
      return restRequest(config, "GET", `messaging/v1/email/definitions/${args.definitionKey}/queue`);
    case "sfmc_tx_email_send_single": {
      const { messageKey, ...body } = args;
      return restRequest(config, "POST", `messaging/v1/email/messages/${messageKey}`, body);
    }
    case "sfmc_tx_email_send_batch":
      return restRequest(config, "POST", "messaging/v1/email/messages", args);
    case "sfmc_tx_email_list_messages": {
      const params: Record<string, string | number | boolean> = {};
      if (args.page) params.page = args.page as number;
      if (args.pageSize) params.pageSize = args.pageSize as number;
      if (args.status) params.status = args.status as string;
      return restRequest(config, "GET", "messaging/v1/email/messages/", undefined, params);
    }
    case "sfmc_tx_email_get_message_status":
      return restRequest(config, "GET", `messaging/v1/email/messages/${args.messageKey}`);
    case "sfmc_tx_sms_create_definition":
      return restRequest(config, "POST", "messaging/v1/sms/definitions", args);
    case "sfmc_tx_sms_list_definitions": {
      const params: Record<string, string | number | boolean> = {};
      if (args.page) params.page = args.page as number;
      if (args.pageSize) params.pageSize = args.pageSize as number;
      if (args.status) params.status = args.status as string;
      return restRequest(config, "GET", "messaging/v1/sms/definitions/", undefined, params);
    }
    case "sfmc_tx_sms_get_definition":
      return restRequest(config, "GET", `messaging/v1/sms/definitions/${args.definitionKey}`);
    case "sfmc_tx_sms_update_definition": {
      const { definitionKey, ...body } = args;
      return restRequest(config, "PATCH", `messaging/v1/sms/definitions/${definitionKey}`, body);
    }
    case "sfmc_tx_sms_delete_definition":
      return restRequest(config, "DELETE", `messaging/v1/sms/definitions/${args.definitionKey}`);
    case "sfmc_tx_sms_delete_queue":
      return restRequest(config, "DELETE", `messaging/v1/sms/definitions/${args.definitionKey}/queue`);
    case "sfmc_tx_sms_get_queue":
      return restRequest(config, "GET", `messaging/v1/sms/definitions/${args.definitionKey}/queue`);
    case "sfmc_tx_sms_send_single": {
      const { messageKey, ...body } = args;
      return restRequest(config, "POST", `messaging/v1/sms/messages/${messageKey}`, body);
    }
    case "sfmc_tx_sms_send_batch":
      return restRequest(config, "POST", "messaging/v1/sms/messages", args);
    case "sfmc_tx_sms_list_messages": {
      const params: Record<string, string | number | boolean> = {};
      if (args.page) params.page = args.page as number;
      if (args.pageSize) params.pageSize = args.pageSize as number;
      return restRequest(config, "GET", "messaging/v1/sms/messages/", undefined, params);
    }
    case "sfmc_tx_sms_get_message_status":
      return restRequest(config, "GET", `messaging/v1/sms/messages/${args.messageKey}`);
    case "sfmc_triggered_send":
      return restRequest(config, "POST", `messaging/v1/messageDefinitionSends/key:${args.tsdExternalKey}/send`, {
        subscribers: args.subscribers,
      });
    case "sfmc_triggered_send_get_delivery_record":
      return restRequest(config, "GET", `messaging/v1/messageDefinitionSends/key:${args.tsdExternalKey}/deliveryRecords/${args.recipientSendId}`);
    default:
      throw new Error(`Unknown transactional tool: ${name}`);
  }
}
