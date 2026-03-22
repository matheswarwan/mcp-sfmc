import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { SFMCConfig } from "../types.js";
import { restRequest } from "../client.js";

export const ensTools: Tool[] = [
  // Callbacks
  {
    name: "sfmc_ens_list_callbacks",
    description: "List all Event Notification Service (ENS) callbacks",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "sfmc_ens_get_callback",
    description: "Get a specific ENS callback by ID",
    inputSchema: {
      type: "object",
      properties: {
        callbackId: { type: "string" },
      },
      required: ["callbackId"],
    },
  },
  {
    name: "sfmc_ens_create_callback",
    description: "Create a new ENS callback endpoint",
    inputSchema: {
      type: "object",
      properties: {
        callbackName: { type: "string", description: "Name for this callback" },
        url: { type: "string", description: "Endpoint URL to receive notifications" },
        maxBatchSize: { type: "number", description: "Max events per batch" },
      },
      required: ["callbackName", "url"],
    },
  },
  {
    name: "sfmc_ens_verify_callback",
    description: "Verify an ENS callback endpoint",
    inputSchema: {
      type: "object",
      properties: {
        callbackId: { type: "string" },
        verificationKey: { type: "string" },
      },
      required: ["callbackId"],
    },
  },
  {
    name: "sfmc_ens_update_callback",
    description: "Update an existing ENS callback",
    inputSchema: {
      type: "object",
      properties: {
        callbackId: { type: "string" },
        callbackName: { type: "string" },
        url: { type: "string" },
        maxBatchSize: { type: "number" },
      },
      required: ["callbackId"],
    },
  },
  {
    name: "sfmc_ens_delete_callback",
    description: "Delete an ENS callback",
    inputSchema: {
      type: "object",
      properties: {
        callbackId: { type: "string" },
      },
      required: ["callbackId"],
    },
  },
  // Subscriptions
  {
    name: "sfmc_ens_get_subscription",
    description: "Get a specific ENS subscription by ID",
    inputSchema: {
      type: "object",
      properties: {
        subscriptionId: { type: "string" },
      },
      required: ["subscriptionId"],
    },
  },
  {
    name: "sfmc_ens_list_subscriptions_by_callback",
    description: "List all ENS subscriptions for a specific callback",
    inputSchema: {
      type: "object",
      properties: {
        callbackId: { type: "string" },
      },
      required: ["callbackId"],
    },
  },
  {
    name: "sfmc_ens_create_subscription",
    description: "Create a new ENS event subscription",
    inputSchema: {
      type: "object",
      properties: {
        callbackId: { type: "string", description: "Callback to receive events" },
        eventCategoryTypes: {
          type: "array",
          items: { type: "string" },
          description: "Event category types to subscribe to",
        },
        filters: { type: "array", items: { type: "object" }, description: "Optional event filters" },
      },
      required: ["callbackId", "eventCategoryTypes"],
    },
  },
  {
    name: "sfmc_ens_update_subscription",
    description: "Update an ENS subscription",
    inputSchema: {
      type: "object",
      properties: {
        subscriptionId: { type: "string" },
        eventCategoryTypes: { type: "array", items: { type: "string" } },
        filters: { type: "array", items: { type: "object" } },
      },
      required: ["subscriptionId"],
    },
  },
  {
    name: "sfmc_ens_delete_subscription",
    description: "Delete an ENS subscription",
    inputSchema: {
      type: "object",
      properties: {
        subscriptionId: { type: "string" },
      },
      required: ["subscriptionId"],
    },
  },
  // Audit
  {
    name: "sfmc_audit_get_events",
    description: "Get audit events from SFMC",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        pageSize: { type: "number" },
      },
    },
  },
  {
    name: "sfmc_audit_get_security_events",
    description: "Get security audit events from SFMC",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        pageSize: { type: "number" },
      },
    },
  },
];

export async function handleEnsTool(
  name: string,
  args: Record<string, unknown>,
  config: SFMCConfig
): Promise<unknown> {
  switch (name) {
    case "sfmc_ens_list_callbacks":
      return restRequest(config, "GET", "platform/v1/ens-callbacks");
    case "sfmc_ens_get_callback":
      return restRequest(config, "GET", `platform/v1/ens-callbacks/${args.callbackId}`);
    case "sfmc_ens_create_callback":
      return restRequest(config, "POST", "platform/v1/ens-callbacks", args);
    case "sfmc_ens_verify_callback":
      return restRequest(config, "POST", "platform/v1/ens-verify", args);
    case "sfmc_ens_update_callback": {
      const { callbackId: _id, ...body } = args;
      return restRequest(config, "PUT", "platform/v1/ens-callbacks", { callbackId: _id, ...body });
    }
    case "sfmc_ens_delete_callback":
      return restRequest(config, "DELETE", `platform/v1/ens-callbacks/${args.callbackId}`);
    case "sfmc_ens_get_subscription":
      return restRequest(config, "GET", `platform/v1/ens-subscriptions/${args.subscriptionId}`);
    case "sfmc_ens_list_subscriptions_by_callback":
      return restRequest(config, "GET", `platform/v1/ens-subscriptions-by-cb/${args.callbackId}`);
    case "sfmc_ens_create_subscription":
      return restRequest(config, "POST", "platform/v1/ens-subscriptions", args);
    case "sfmc_ens_update_subscription":
      return restRequest(config, "PUT", "platform/v1/ens-subscriptions", args);
    case "sfmc_ens_delete_subscription":
      return restRequest(config, "DELETE", `platform/v1/ens-subscriptions/${args.subscriptionId}`);
    case "sfmc_audit_get_events": {
      const params: Record<string, string | number | boolean> = {};
      if (args.page) params.page = args.page as number;
      if (args.pageSize) params.pageSize = args.pageSize as number;
      return restRequest(config, "GET", "data/v1/audit/auditEvents", undefined, params);
    }
    case "sfmc_audit_get_security_events": {
      const params: Record<string, string | number | boolean> = {};
      if (args.page) params.page = args.page as number;
      if (args.pageSize) params.pageSize = args.pageSize as number;
      return restRequest(config, "GET", "data/v1/audit/securityEvents", undefined, params);
    }
    default:
      throw new Error(`Unknown ENS tool: ${name}`);
  }
}
