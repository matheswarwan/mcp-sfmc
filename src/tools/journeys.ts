import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { SFMCConfig } from "../types.js";
import { restRequest } from "../client.js";

export const journeyTools: Tool[] = [
  // Event Definitions
  {
    name: "sfmc_journey_get_event_definitions",
    description: "Get all Journey Builder event definitions",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        pageSize: { type: "number" },
      },
    },
  },
  {
    name: "sfmc_journey_get_event_definition",
    description: "Get a specific Journey Builder event definition by key",
    inputSchema: {
      type: "object",
      properties: {
        eventDefinitionKey: { type: "string", description: "The event definition key" },
      },
      required: ["eventDefinitionKey"],
    },
  },
  {
    name: "sfmc_journey_create_event_definition",
    description: "Create a new Journey Builder event definition",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Event type (e.g. 'APIEvent')" },
        name: { type: "string", description: "Event name" },
        description: { type: "string" },
        mode: { type: "string", enum: ["Production", "Test"] },
        eventDefinitionKey: { type: "string", description: "Unique key for this event" },
        dataExtensionId: { type: "string", description: "Associated Data Extension ID" },
        fields: { type: "array", description: "Event fields", items: { type: "object" } },
      },
      required: ["type", "name", "eventDefinitionKey"],
    },
  },
  {
    name: "sfmc_journey_update_event_definition_by_key",
    description: "Update a Journey Builder event definition by key",
    inputSchema: {
      type: "object",
      properties: {
        eventDefinitionKey: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        mode: { type: "string" },
        dataExtensionId: { type: "string" },
      },
      required: ["eventDefinitionKey"],
    },
  },
  {
    name: "sfmc_journey_delete_event_definition_by_key",
    description: "Delete a Journey Builder event definition by key",
    inputSchema: {
      type: "object",
      properties: {
        eventDefinitionKey: { type: "string" },
      },
      required: ["eventDefinitionKey"],
    },
  },
  {
    name: "sfmc_journey_delete_event_definition_by_id",
    description: "Delete a Journey Builder event definition by ID",
    inputSchema: {
      type: "object",
      properties: {
        eventDefinitionId: { type: "string" },
      },
      required: ["eventDefinitionId"],
    },
  },
  // Journeys
  {
    name: "sfmc_journey_list",
    description: "Get all journeys in Journey Builder",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        pageSize: { type: "number" },
        mostRecentVersionOnly: { type: "boolean", description: "Return only the most recent version" },
        nameOrDescription: { type: "string", description: "Filter by name or description" },
        status: { type: "string", description: "Filter by status (Draft, Active, etc.)" },
      },
    },
  },
  {
    name: "sfmc_journey_get",
    description: "Get a specific journey by ID",
    inputSchema: {
      type: "object",
      properties: {
        journeyId: { type: "string", description: "The journey ID" },
        version: { type: "number", description: "Journey version" },
      },
      required: ["journeyId"],
    },
  },
  {
    name: "sfmc_journey_create",
    description: "Create a new journey in Journey Builder",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        workflowApiVersion: { type: "number", description: "API version (e.g. 1.0)" },
        triggers: { type: "array", description: "Journey entry triggers", items: { type: "object" } },
        goals: { type: "array", description: "Journey goals", items: { type: "object" } },
        activities: { type: "array", description: "Journey activities", items: { type: "object" } },
        defaults: { type: "object", description: "Journey defaults" },
      },
      required: ["name"],
    },
  },
  {
    name: "sfmc_journey_publish",
    description: "Publish/activate a journey asynchronously",
    inputSchema: {
      type: "object",
      properties: {
        journeyId: { type: "string", description: "The journey ID to publish" },
      },
      required: ["journeyId"],
    },
  },
  {
    name: "sfmc_journey_publish_status",
    description: "Get the publish status of a journey",
    inputSchema: {
      type: "object",
      properties: {
        statusId: { type: "string", description: "The publish status ID" },
      },
      required: ["statusId"],
    },
  },
  {
    name: "sfmc_journey_stop",
    description: "Stop an active journey",
    inputSchema: {
      type: "object",
      properties: {
        journeyId: { type: "string", description: "The journey ID to stop" },
      },
      required: ["journeyId"],
    },
  },
  {
    name: "sfmc_journey_delete",
    description: "Delete a journey",
    inputSchema: {
      type: "object",
      properties: {
        journeyId: { type: "string" },
      },
      required: ["journeyId"],
    },
  },
  {
    name: "sfmc_journey_get_audit",
    description: "Get the audit log for a journey",
    inputSchema: {
      type: "object",
      properties: {
        journeyId: { type: "string" },
      },
      required: ["journeyId"],
    },
  },
  {
    name: "sfmc_journey_fire_entry_event",
    description: "Fire a Journey Builder entry event to inject a contact into a journey",
    inputSchema: {
      type: "object",
      properties: {
        eventDefinitionKey: { type: "string", description: "The event definition key" },
        contactKey: { type: "string", description: "Contact key to inject" },
        data: { type: "object", description: "Additional event data" },
      },
      required: ["eventDefinitionKey", "contactKey"],
    },
  },
  {
    name: "sfmc_journey_exit_contact",
    description: "Exit a contact from a journey",
    inputSchema: {
      type: "object",
      properties: {
        journeyId: { type: "string" },
        contactKey: { type: "string" },
        reason: { type: "string" },
      },
      required: ["journeyId", "contactKey"],
    },
  },
  {
    name: "sfmc_journey_contact_exit_status",
    description: "Check the exit status of a contact in a journey",
    inputSchema: {
      type: "object",
      properties: {
        journeyId: { type: "string" },
        contactKey: { type: "string" },
      },
      required: ["journeyId", "contactKey"],
    },
  },
  {
    name: "sfmc_journey_contact_membership",
    description: "Check which journeys a contact is a member of",
    inputSchema: {
      type: "object",
      properties: {
        contactKey: { type: "string" },
        journeyIds: {
          type: "array",
          items: { type: "string" },
          description: "Optional: filter by specific journey IDs",
        },
      },
      required: ["contactKey"],
    },
  },
];

export async function handleJourneyTool(
  name: string,
  args: Record<string, unknown>,
  config: SFMCConfig
): Promise<unknown> {
  switch (name) {
    case "sfmc_journey_get_event_definitions": {
      const params: Record<string, string | number | boolean> = {};
      if (args.page) params.page = args.page as number;
      if (args.pageSize) params.pageSize = args.pageSize as number;
      return restRequest(config, "GET", "interaction/v1/eventDefinitions", undefined, params);
    }
    case "sfmc_journey_get_event_definition":
      return restRequest(config, "GET", `interaction/v1/eventDefinitions/key:${args.eventDefinitionKey}`);
    case "sfmc_journey_create_event_definition":
      return restRequest(config, "POST", "interaction/v1/eventDefinitions", args);
    case "sfmc_journey_update_event_definition_by_key": {
      const { eventDefinitionKey, ...body } = args;
      return restRequest(config, "PUT", `interaction/v1/eventDefinitions/key:${eventDefinitionKey}`, body);
    }
    case "sfmc_journey_delete_event_definition_by_key":
      return restRequest(config, "DELETE", `interaction/v1/eventDefinitions/key:${args.eventDefinitionKey}`);
    case "sfmc_journey_delete_event_definition_by_id":
      return restRequest(config, "DELETE", `interaction/v1/eventDefinitions/${args.eventDefinitionId}`);
    case "sfmc_journey_list": {
      const params: Record<string, string | number | boolean> = {};
      if (args.page) params.page = args.page as number;
      if (args.pageSize) params.pageSize = args.pageSize as number;
      if (args.mostRecentVersionOnly !== undefined) params.mostRecentVersionOnly = args.mostRecentVersionOnly as boolean;
      if (args.nameOrDescription) params.nameOrDescription = args.nameOrDescription as string;
      if (args.status) params.status = args.status as string;
      return restRequest(config, "GET", "interaction/v1/interactions", undefined, params);
    }
    case "sfmc_journey_get": {
      const params: Record<string, string | number | boolean> = {};
      if (args.version) params.version = args.version as number;
      return restRequest(config, "GET", `interaction/v1/interactions/${args.journeyId}`, undefined, params);
    }
    case "sfmc_journey_create":
      return restRequest(config, "POST", "interaction/v1/interactions", args);
    case "sfmc_journey_publish":
      return restRequest(config, "POST", `interaction/v1/interactions/publishAsync/${args.journeyId}`);
    case "sfmc_journey_publish_status":
      return restRequest(config, "GET", `interaction/v1/interactions/publishStatus/${args.statusId}`);
    case "sfmc_journey_stop":
      return restRequest(config, "POST", `interaction/v1/interactions/stop/${args.journeyId}`);
    case "sfmc_journey_delete":
      return restRequest(config, "DELETE", `interaction/v1/interactions/${args.journeyId}`);
    case "sfmc_journey_get_audit":
      return restRequest(config, "GET", `interaction/v1/interactions/${args.journeyId}/audit/all`);
    case "sfmc_journey_fire_entry_event":
      return restRequest(config, "POST", "interaction/v1/events", {
        ContactKey: args.contactKey,
        EventDefinitionKey: args.eventDefinitionKey,
        Data: args.data || {},
      });
    case "sfmc_journey_exit_contact":
      return restRequest(config, "POST", "interaction/v1/interactions/contactexit", args);
    case "sfmc_journey_contact_exit_status":
      return restRequest(config, "POST", "interaction/v1/interactions/contactexit/status", args);
    case "sfmc_journey_contact_membership":
      return restRequest(config, "POST", "interaction/v1/interactions/contactMembership", args);
    default:
      throw new Error(`Unknown journey tool: ${name}`);
  }
}
