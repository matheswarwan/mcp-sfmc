import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { SFMCConfig } from "../types.js";
import { restRequest } from "../client.js";

export const pushSmsTools: Tool[] = [
  // Push - Locations
  {
    name: "sfmc_push_list_locations",
    description: "List all push notification geofence locations",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "sfmc_push_get_location",
    description: "Get a specific push notification location",
    inputSchema: {
      type: "object",
      properties: {
        locationId: { type: "string" },
      },
      required: ["locationId"],
    },
  },
  {
    name: "sfmc_push_create_location",
    description: "Create a new push notification geofence location",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        radius: { type: "number", description: "Radius in meters" },
      },
      required: ["name", "latitude", "longitude", "radius"],
    },
  },
  {
    name: "sfmc_push_update_location",
    description: "Update an existing push notification location",
    inputSchema: {
      type: "object",
      properties: {
        locationId: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        radius: { type: "number" },
      },
      required: ["locationId"],
    },
  },
  {
    name: "sfmc_push_delete_location",
    description: "Delete a push notification location",
    inputSchema: {
      type: "object",
      properties: {
        locationId: { type: "string" },
      },
      required: ["locationId"],
    },
  },
  // Push - Messages
  {
    name: "sfmc_push_create_message",
    description: "Create a new push notification message",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        messageType: { type: "number", description: "Message type code" },
        contentType: { type: "number" },
        title: { type: "string" },
        alert: { type: "string", description: "Message alert text" },
        sound: { type: "string" },
        badge: { type: "string" },
        openDirect: { type: "string" },
        keys: { type: "array", items: { type: "object" } },
        custom: { type: "object" },
        inclusionTags: { type: "array", items: { type: "string" } },
        exclusionTags: { type: "array", items: { type: "string" } },
      },
      required: ["name", "messageType", "alert"],
    },
  },
  {
    name: "sfmc_push_broadcast_message",
    description: "Broadcast a push message to all app subscribers",
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "string", description: "The push message ID" },
        startDateTime: { type: "string", description: "Schedule time (ISO 8601)" },
        sendInitiator: { type: "number", description: "Send initiator code" },
      },
      required: ["messageId"],
    },
  },
  {
    name: "sfmc_push_send_to_list",
    description: "Send a push message to a specific list",
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "string" },
        listId: { type: "string" },
        startDateTime: { type: "string" },
      },
      required: ["messageId", "listId"],
    },
  },
  // SMS
  {
    name: "sfmc_sms_create_keyword",
    description: "Create an SMS keyword",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string" },
        shortCode: { type: "string" },
        countryCode: { type: "string", default: "US" },
        response: { type: "string", description: "Auto-response message" },
      },
      required: ["keyword", "shortCode"],
    },
  },
  {
    name: "sfmc_sms_delete_keyword_by_id",
    description: "Delete an SMS keyword by ID",
    inputSchema: {
      type: "object",
      properties: {
        keywordId: { type: "string" },
      },
      required: ["keywordId"],
    },
  },
  {
    name: "sfmc_sms_delete_keyword",
    description: "Delete an SMS keyword by keyword and shortcode",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string" },
        shortCode: { type: "string" },
        countryCode: { type: "string", default: "US" },
      },
      required: ["keyword", "shortCode"],
    },
  },
  {
    name: "sfmc_sms_send_message",
    description: "Send an SMS message to contacts",
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "string", description: "SMS message ID" },
        mobileNumbers: {
          type: "array",
          items: { type: "string" },
          description: "List of mobile numbers",
        },
        subscribe: { type: "boolean" },
        resubscribe: { type: "boolean" },
        keyword: { type: "string" },
        override: { type: "boolean" },
        messageText: { type: "string", description: "Override message text" },
      },
      required: ["messageId", "mobileNumbers"],
    },
  },
  {
    name: "sfmc_sms_get_message_history",
    description: "Get SMS message delivery history for a specific recipient",
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "string" },
        tokenId: { type: "string" },
        mobileNumber: { type: "string" },
      },
      required: ["messageId", "tokenId", "mobileNumber"],
    },
  },
  {
    name: "sfmc_sms_queue_mo",
    description: "Queue a mobile-originated (inbound) SMS message",
    inputSchema: {
      type: "object",
      properties: {
        mobileNumber: { type: "string" },
        shortCode: { type: "string" },
        messageText: { type: "string" },
      },
      required: ["mobileNumber", "shortCode", "messageText"],
    },
  },
  {
    name: "sfmc_sms_optin",
    description: "Opt-in a mobile number for SMS messages",
    inputSchema: {
      type: "object",
      properties: {
        mobileNumber: { type: "string" },
        keyword: { type: "string" },
        shortCode: { type: "string" },
      },
      required: ["mobileNumber", "keyword", "shortCode"],
    },
  },
  {
    name: "sfmc_sms_get_list_deliveries",
    description: "Get SMS delivery results for a list send",
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "string" },
        tokenId: { type: "string" },
      },
      required: ["messageId", "tokenId"],
    },
  },
  {
    name: "sfmc_sms_create_subscription",
    description: "Create an SMS subscription for a contact",
    inputSchema: {
      type: "object",
      properties: {
        mobileNumber: { type: "string" },
        keyword: { type: "string" },
        shortCode: { type: "string" },
        countryCode: { type: "string" },
      },
      required: ["mobileNumber", "keyword", "shortCode"],
    },
  },
];

export async function handlePushSmsTool(
  name: string,
  args: Record<string, unknown>,
  config: SFMCConfig
): Promise<unknown> {
  switch (name) {
    case "sfmc_push_list_locations":
      return restRequest(config, "GET", "push/v1/location/");
    case "sfmc_push_get_location":
      return restRequest(config, "GET", `push/v1/location/${args.locationId}`);
    case "sfmc_push_create_location":
      return restRequest(config, "POST", "push/v1/location", args);
    case "sfmc_push_update_location": {
      const { locationId, ...body } = args;
      return restRequest(config, "PUT", `push/v1/location/${locationId}`, body);
    }
    case "sfmc_push_delete_location":
      return restRequest(config, "DELETE", `push/v1/location/${args.locationId}`);
    case "sfmc_push_create_message":
      return restRequest(config, "POST", "push/v1/message", args);
    case "sfmc_push_broadcast_message":
      return restRequest(config, "POST", `push/v1/messageApp/${args.messageId}/send`, args);
    case "sfmc_push_send_to_list":
      return restRequest(config, "POST", `push/v1/messageList/${args.messageId}/send`, args);
    case "sfmc_sms_create_keyword":
      return restRequest(config, "POST", "sms/v1/keyword", args);
    case "sfmc_sms_delete_keyword_by_id":
      return restRequest(config, "DELETE", `sms/v1/keyword/${args.keywordId}`);
    case "sfmc_sms_delete_keyword":
      return restRequest(config, "DELETE", `sms/v1/keyword/${args.keyword}/${args.shortCode}/${args.countryCode || "US"}`);
    case "sfmc_sms_send_message":
      return restRequest(config, "POST", `sms/v1/messageContact/${args.messageId}/send`, {
        Subscribe: args.subscribe,
        Resubscribe: args.resubscribe,
        mobileNumbers: args.mobileNumbers,
        keyword: args.keyword,
        Override: args.override,
        messageText: args.messageText,
      });
    case "sfmc_sms_get_message_history":
      return restRequest(config, "GET", `sms/v1/messageContact/${args.messageId}/history/${args.tokenId}/mobileNumber/${args.mobileNumber}`);
    case "sfmc_sms_queue_mo":
      return restRequest(config, "POST", "sms/v1/queueMO", args);
    case "sfmc_sms_optin":
      return restRequest(config, "POST", "sms/v1/message/optin", args);
    case "sfmc_sms_get_list_deliveries":
      return restRequest(config, "GET", `sms/v1/messageList/${args.messageId}/deliveries/${args.tokenId}`);
    case "sfmc_sms_create_subscription":
      return restRequest(config, "POST", "sms/v1/contacts/subscriptions", args);
    default:
      throw new Error(`Unknown push/sms tool: ${name}`);
  }
}
