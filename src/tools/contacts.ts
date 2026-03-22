import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { SFMCConfig } from "../types.js";
import { restRequest } from "../client.js";

export const contactTools: Tool[] = [
  {
    name: "sfmc_contact_get_schema",
    description: "Get the contact schema including attribute groups and sets",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "sfmc_contact_get_attribute_groups",
    description: "Get all attribute groups for contacts",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "sfmc_contact_create",
    description: "Create a new contact in SFMC",
    inputSchema: {
      type: "object",
      properties: {
        contactKey: { type: "string", description: "Unique identifier for the contact" },
        attributeSets: {
          type: "array",
          description: "Array of attribute sets with values",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              items: { type: "array" },
            },
          },
        },
      },
      required: ["contactKey"],
    },
  },
  {
    name: "sfmc_contact_update",
    description: "Update an existing contact in SFMC",
    inputSchema: {
      type: "object",
      properties: {
        contactKey: { type: "string", description: "Unique identifier for the contact" },
        attributeSets: {
          type: "array",
          description: "Array of attribute sets with values to update",
        },
      },
      required: ["contactKey"],
    },
  },
  {
    name: "sfmc_contact_search_by_email",
    description: "Search for contacts by email address",
    inputSchema: {
      type: "object",
      properties: {
        channelAddressList: {
          type: "array",
          description: "List of email addresses to search",
          items: { type: "string" },
        },
      },
      required: ["channelAddressList"],
    },
  },
  {
    name: "sfmc_contact_delete",
    description: "Delete contacts by contact key or ID",
    inputSchema: {
      type: "object",
      properties: {
        deleteOperationType: {
          type: "string",
          enum: ["ContactAndAttributes", "ContactMembership"],
          description: "Type of deletion",
        },
        targetList: {
          type: "array",
          description: "List of contacts to delete (contactKey or contactId)",
          items: { type: "object" },
        },
      },
      required: ["deleteOperationType", "targetList"],
    },
  },
  {
    name: "sfmc_contact_get_delete_analytics",
    description: "Get analytics for contact deletion requests",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "sfmc_contact_get_delete_summary",
    description: "Get summary of contact deletion requests",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "sfmc_validate_email",
    description: "Validate an email address using SFMC Address API",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address to validate" },
      },
      required: ["email"],
    },
  },
];

export async function handleContactTool(
  name: string,
  args: Record<string, unknown>,
  config: SFMCConfig
): Promise<unknown> {
  switch (name) {
    case "sfmc_contact_get_schema":
      return restRequest(config, "GET", "contacts/v1/schema");
    case "sfmc_contact_get_attribute_groups":
      return restRequest(config, "GET", "contacts/v1/attributeGroups");
    case "sfmc_contact_create":
      return restRequest(config, "POST", "contacts/v1/contacts", args);
    case "sfmc_contact_update":
      return restRequest(config, "PATCH", "contacts/v1/contacts", args);
    case "sfmc_contact_search_by_email":
      return restRequest(config, "POST", "contacts/v1/addresses/email/search", args);
    case "sfmc_contact_delete":
      return restRequest(config, "POST", "contacts/v1/contacts/actions/delete", args);
    case "sfmc_contact_get_delete_analytics":
      return restRequest(config, "GET", "contacts/v1/contacts/analytics/deleterequests");
    case "sfmc_contact_get_delete_summary":
      return restRequest(config, "GET", "contacts/v1/contacts/analytics/deleterequests/summary");
    case "sfmc_validate_email":
      return restRequest(config, "POST", "address/v1/validateEmail", { email: args.email });
    default:
      throw new Error(`Unknown contact tool: ${name}`);
  }
}
