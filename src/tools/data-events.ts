import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { SFMCConfig } from "../types.js";
import { restRequest } from "../client.js";

export const dataEventTools: Tool[] = [
  // Synchronous Data Events
  {
    name: "sfmc_de_upsert_rows_by_key",
    description: "Synchronously upsert multiple rows into a Data Extension by External Key",
    inputSchema: {
      type: "object",
      properties: {
        deExternalKey: { type: "string", description: "Data Extension external key" },
        items: {
          type: "array",
          description: "Array of row objects to upsert",
          items: { type: "object" },
        },
      },
      required: ["deExternalKey", "items"],
    },
  },
  {
    name: "sfmc_de_upsert_rows_by_id",
    description: "Synchronously upsert multiple rows into a Data Extension by ID",
    inputSchema: {
      type: "object",
      properties: {
        deId: { type: "string", description: "Data Extension ID" },
        items: {
          type: "array",
          description: "Array of row objects to upsert",
          items: { type: "object" },
        },
      },
      required: ["deId", "items"],
    },
  },
  {
    name: "sfmc_de_upsert_row_by_key",
    description: "Synchronously upsert a single row in a Data Extension by External Key",
    inputSchema: {
      type: "object",
      properties: {
        deExternalKey: { type: "string", description: "Data Extension external key" },
        primaryKey: { type: "string", description: "Primary key column name and value (e.g. 'Email:test@test.com')" },
        values: { type: "object", description: "Column name/value pairs to upsert" },
      },
      required: ["deExternalKey", "primaryKey", "values"],
    },
  },
  {
    name: "sfmc_de_upsert_row_by_id",
    description: "Synchronously upsert a single row in a Data Extension by ID",
    inputSchema: {
      type: "object",
      properties: {
        deId: { type: "string", description: "Data Extension ID" },
        primaryKey: { type: "string", description: "Primary key column name and value" },
        values: { type: "object", description: "Column name/value pairs to upsert" },
      },
      required: ["deId", "primaryKey", "values"],
    },
  },
  {
    name: "sfmc_de_increment_column_by_key",
    description: "Synchronously increment a numeric column value in a Data Extension by External Key",
    inputSchema: {
      type: "object",
      properties: {
        deExternalKey: { type: "string", description: "Data Extension external key" },
        primaryKey: { type: "string", description: "Primary key (e.g. 'Email:test@test.com')" },
        columnName: { type: "string", description: "The column to increment" },
      },
      required: ["deExternalKey", "primaryKey", "columnName"],
    },
  },
  {
    name: "sfmc_de_increment_column_by_id",
    description: "Synchronously increment a numeric column value in a Data Extension by ID",
    inputSchema: {
      type: "object",
      properties: {
        deId: { type: "string", description: "Data Extension ID" },
        primaryKey: { type: "string", description: "Primary key (e.g. 'Email:test@test.com')" },
        columnName: { type: "string", description: "The column to increment" },
      },
      required: ["deId", "primaryKey", "columnName"],
    },
  },
  // Asynchronous Data Events
  {
    name: "sfmc_de_async_upsert_rows_by_key",
    description: "Asynchronously upsert multiple rows into a Data Extension by External Key",
    inputSchema: {
      type: "object",
      properties: {
        deExternalKey: { type: "string", description: "Data Extension external key" },
        items: {
          type: "array",
          description: "Array of row objects to upsert",
          items: { type: "object" },
        },
      },
      required: ["deExternalKey", "items"],
    },
  },
  {
    name: "sfmc_de_async_upsert_rows_by_id",
    description: "Asynchronously upsert multiple rows into a Data Extension by ID",
    inputSchema: {
      type: "object",
      properties: {
        deId: { type: "string", description: "Data Extension ID" },
        items: {
          type: "array",
          description: "Array of row objects to upsert",
          items: { type: "object" },
        },
      },
      required: ["deId", "items"],
    },
  },
  {
    name: "sfmc_de_async_upsert_row_by_key",
    description: "Asynchronously upsert a single row in a Data Extension by External Key",
    inputSchema: {
      type: "object",
      properties: {
        deExternalKey: { type: "string", description: "Data Extension external key" },
        primaryKey: { type: "string", description: "Primary key (e.g. 'Email:test@test.com')" },
        values: { type: "object", description: "Column values to upsert" },
      },
      required: ["deExternalKey", "primaryKey", "values"],
    },
  },
  {
    name: "sfmc_de_async_upsert_row_by_id",
    description: "Asynchronously upsert a single row in a Data Extension by ID",
    inputSchema: {
      type: "object",
      properties: {
        deId: { type: "string", description: "Data Extension ID" },
        primaryKey: { type: "string", description: "Primary key (e.g. 'Email:test@test.com')" },
        values: { type: "object", description: "Column values to upsert" },
      },
      required: ["deId", "primaryKey", "values"],
    },
  },
  // Async file import
  {
    name: "sfmc_data_import_file",
    description: "Import a file asynchronously into SFMC",
    inputSchema: {
      type: "object",
      properties: {
        fileName: { type: "string", description: "Name of the file to import" },
        filePath: { type: "string", description: "Path to the file" },
        targetDataExtensionId: { type: "string", description: "Target Data Extension ID" },
        uploadType: { type: "string", description: "Upload type (e.g. 'fileTransfer')" },
      },
      required: ["fileName"],
    },
  },
  {
    name: "sfmc_data_import_status",
    description: "Get the status of an async file import",
    inputSchema: {
      type: "object",
      properties: {
        importId: { type: "string", description: "The import operation ID" },
      },
      required: ["importId"],
    },
  },
  {
    name: "sfmc_data_import_validation_summary",
    description: "Get validation summary of an async file import",
    inputSchema: {
      type: "object",
      properties: {
        importId: { type: "string", description: "The import operation ID" },
      },
      required: ["importId"],
    },
  },
  {
    name: "sfmc_data_import_validation_result",
    description: "Get full validation result of an async file import",
    inputSchema: {
      type: "object",
      properties: {
        importId: { type: "string", description: "The import operation ID" },
      },
      required: ["importId"],
    },
  },
];

export async function handleDataEventTool(
  name: string,
  args: Record<string, unknown>,
  config: SFMCConfig
): Promise<unknown> {
  switch (name) {
    case "sfmc_de_upsert_rows_by_key":
      return restRequest(config, "POST", `hub/v1/dataevents/key:${args.deExternalKey}/rowset`, args.items);
    case "sfmc_de_upsert_rows_by_id":
      return restRequest(config, "POST", `hub/v1/dataevents/${args.deId}/rowset`, args.items);
    case "sfmc_de_upsert_row_by_key":
      return restRequest(config, "PUT", `hub/v1/dataevents/key:${args.deExternalKey}/rows/${args.primaryKey}`, { values: args.values });
    case "sfmc_de_upsert_row_by_id":
      return restRequest(config, "PUT", `hub/v1/dataevents/${args.deId}/rows/${args.primaryKey}`, { values: args.values });
    case "sfmc_de_increment_column_by_key":
      return restRequest(config, "PUT", `hub/v1/dataevents/key:${args.deExternalKey}/rows/${args.primaryKey}/column/${args.columnName}/increment`);
    case "sfmc_de_increment_column_by_id":
      return restRequest(config, "PUT", `hub/v1/dataevents/${args.deId}/rows/${args.primaryKey}/column/${args.columnName}/increment`);
    case "sfmc_de_async_upsert_rows_by_key":
      return restRequest(config, "POST", `hub/v1/dataeventsasync/key:${args.deExternalKey}/rowset`, args.items);
    case "sfmc_de_async_upsert_rows_by_id":
      return restRequest(config, "POST", `hub/v1/dataeventsasync/${args.deId}/rowset`, args.items);
    case "sfmc_de_async_upsert_row_by_key":
      return restRequest(config, "PUT", `hub/v1/dataeventsasync/key:${args.deExternalKey}/rows/${args.primaryKey}`, { values: args.values });
    case "sfmc_de_async_upsert_row_by_id":
      return restRequest(config, "PUT", `hub/v1/dataeventsasync/${args.deId}/rows/${args.primaryKey}`, { values: args.values });
    case "sfmc_data_import_file":
      return restRequest(config, "POST", "data/v1/async/import", args);
    case "sfmc_data_import_status":
      return restRequest(config, "GET", `data/v1/async/import/${args.importId}/summary`);
    case "sfmc_data_import_validation_summary":
      return restRequest(config, "GET", `data/v1/async/import/${args.importId}/validationsummary`);
    case "sfmc_data_import_validation_result":
      return restRequest(config, "GET", `data/v1/async/import/${args.importId}/validationresult`);
    default:
      throw new Error(`Unknown data event tool: ${name}`);
  }
}
