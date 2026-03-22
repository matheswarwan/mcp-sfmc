import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { SFMCConfig } from "../types.js";
import { restRequest } from "../client.js";

export const assetTools: Tool[] = [
  // Categories
  {
    name: "sfmc_asset_get_categories",
    description: "Get all asset categories (Content Builder folders)",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", description: "Page number" },
        pageSize: { type: "number", description: "Number of results per page" },
      },
    },
  },
  {
    name: "sfmc_asset_get_category",
    description: "Get a specific asset category by ID",
    inputSchema: {
      type: "object",
      properties: {
        categoryId: { type: "number", description: "The category ID" },
      },
      required: ["categoryId"],
    },
  },
  {
    name: "sfmc_asset_create_category",
    description: "Create a new asset category (folder) in Content Builder",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Category name" },
        parentId: { type: "number", description: "Parent category ID" },
      },
      required: ["name", "parentId"],
    },
  },
  {
    name: "sfmc_asset_update_category",
    description: "Update an existing asset category",
    inputSchema: {
      type: "object",
      properties: {
        categoryId: { type: "number", description: "The category ID to update" },
        name: { type: "string", description: "New category name" },
        parentId: { type: "number", description: "New parent category ID" },
      },
      required: ["categoryId"],
    },
  },
  {
    name: "sfmc_asset_delete_category",
    description: "Delete an asset category",
    inputSchema: {
      type: "object",
      properties: {
        categoryId: { type: "number", description: "The category ID to delete" },
      },
      required: ["categoryId"],
    },
  },
  // Assets
  {
    name: "sfmc_asset_list",
    description: "List assets in Content Builder with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", description: "Page number" },
        pageSize: { type: "number", description: "Results per page (max 50)" },
        orderBy: { type: "string", description: "Sort field (e.g. 'name ASC')" },
        query: { type: "string", description: "Filter query (e.g. 'assetType.name=htmlemail')" },
      },
    },
  },
  {
    name: "sfmc_asset_get",
    description: "Get a specific asset by ID",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "number", description: "The asset ID" },
      },
      required: ["assetId"],
    },
  },
  {
    name: "sfmc_asset_get_file",
    description: "Get the file content of an asset",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "number", description: "The asset ID" },
      },
      required: ["assetId"],
    },
  },
  {
    name: "sfmc_asset_query",
    description: "Advanced query to search assets using filter criteria",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "object",
          description: "Query object with property, simpleOperator, value fields",
        },
        fields: {
          type: "array",
          items: { type: "string" },
          description: "Fields to return",
        },
        page: { type: "object", description: "Pagination: { page, pageSize }" },
        sort: {
          type: "array",
          items: { type: "object" },
          description: "Sort order: [{ property, direction }]",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "sfmc_asset_create",
    description: "Create a new asset in Content Builder (image, template, HTML email, HTML block, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Asset name" },
        assetType: {
          type: "object",
          description: "Asset type object with id or name (e.g. { id: 207 } for HTML email)",
        },
        content: { type: "string", description: "Asset content/HTML" },
        data: { type: "object", description: "Asset data (slots, views, etc.)" },
        category: {
          type: "object",
          description: "Category/folder (e.g. { id: 12345 })",
        },
        channels: { type: "object", description: "Channel availability" },
        views: { type: "object", description: "Asset views (subjectline, preheader, etc.)" },
        slots: { type: "object", description: "Asset slots for templates" },
        file: { type: "string", description: "Base64-encoded file content for image assets" },
        fileProperties: { type: "object", description: "File properties (fileName, extension, etc.)" },
        description: { type: "string", description: "Asset description" },
      },
      required: ["name", "assetType"],
    },
  },
  {
    name: "sfmc_asset_update",
    description: "Update an existing asset in Content Builder",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "number", description: "The asset ID to update" },
        name: { type: "string" },
        content: { type: "string" },
        data: { type: "object" },
        views: { type: "object" },
        slots: { type: "object" },
        category: { type: "object" },
        description: { type: "string" },
      },
      required: ["assetId"],
    },
  },
  {
    name: "sfmc_asset_delete",
    description: "Delete an asset from Content Builder",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "number", description: "The asset ID to delete" },
      },
      required: ["assetId"],
    },
  },
];

export async function handleAssetTool(
  name: string,
  args: Record<string, unknown>,
  config: SFMCConfig
): Promise<unknown> {
  switch (name) {
    case "sfmc_asset_get_categories":
      return restRequest(config, "GET", "asset/v1/content/categories", undefined, {
        ...(args.page !== undefined ? { page: args.page as number } : {}),
        ...(args.pageSize !== undefined ? { pageSize: args.pageSize as number } : {}),
      });
    case "sfmc_asset_get_category":
      return restRequest(config, "GET", `asset/v1/content/categories/${args.categoryId}`);
    case "sfmc_asset_create_category":
      return restRequest(config, "POST", "asset/v1/content/categories", {
        name: args.name,
        parentId: args.parentId,
      });
    case "sfmc_asset_update_category": {
      const { categoryId, ...rest } = args;
      return restRequest(config, "PUT", `asset/v1/content/categories/${categoryId}`, rest);
    }
    case "sfmc_asset_delete_category":
      return restRequest(config, "DELETE", `asset/v1/content/categories/${args.categoryId}`);
    case "sfmc_asset_list": {
      const params: Record<string, string | number | boolean> = {};
      if (args.page) params.page = args.page as number;
      if (args.pageSize) params.pageSize = args.pageSize as number;
      if (args.orderBy) params.orderBy = args.orderBy as string;
      if (args.query) params.query = args.query as string;
      return restRequest(config, "GET", "asset/v1/content/assets", undefined, params);
    }
    case "sfmc_asset_get":
      return restRequest(config, "GET", `asset/v1/content/assets/${args.assetId}`);
    case "sfmc_asset_get_file":
      return restRequest(config, "GET", `asset/v1/content/assets/${args.assetId}/file`);
    case "sfmc_asset_query":
      return restRequest(config, "POST", "asset/v1/content/assets/query", args);
    case "sfmc_asset_create": {
      const { ...body } = args;
      return restRequest(config, "POST", "asset/v1/content/assets", body);
    }
    case "sfmc_asset_update": {
      const { assetId, ...body } = args;
      return restRequest(config, "PATCH", `asset/v1/content/assets/${assetId}`, body);
    }
    case "sfmc_asset_delete":
      return restRequest(config, "DELETE", `asset/v1/content/assets/${args.assetId}`);
    default:
      throw new Error(`Unknown asset tool: ${name}`);
  }
}
