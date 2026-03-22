#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SFMCConfig } from "./types.js";
import {
  authTools, handleAuthTool,
  assetTools, handleAssetTool,
  contactTools, handleContactTool,
  dataEventTools, handleDataEventTool,
  journeyTools, handleJourneyTool,
  transactionalTools, handleTransactionalTool,
  pushSmsTools, handlePushSmsTool,
  ensTools, handleEnsTool,
  soapTools, handleSoapTool,
} from "./tools/index.js";

function getConfig(): SFMCConfig {
  const subdomain = process.env.SFMC_SUBDOMAIN;
  const clientId = process.env.SFMC_CLIENT_ID;
  const clientSecret = process.env.SFMC_CLIENT_SECRET;
  const accountId = process.env.SFMC_ACCOUNT_ID;

  if (!subdomain || !clientId || !clientSecret) {
    throw new Error(
      "Missing required environment variables: SFMC_SUBDOMAIN, SFMC_CLIENT_ID, SFMC_CLIENT_SECRET"
    );
  }

  return { subdomain, clientId, clientSecret, accountId };
}

const allTools = [
  ...authTools,
  ...assetTools,
  ...contactTools,
  ...dataEventTools,
  ...journeyTools,
  ...transactionalTools,
  ...pushSmsTools,
  ...ensTools,
  ...soapTools,
];

// Build a lookup map for fast dispatch
const toolHandlers: Record<string, (args: Record<string, unknown>, config: SFMCConfig) => Promise<unknown>> = {};

for (const tool of authTools) {
  toolHandlers[tool.name] = (args, cfg) => handleAuthTool(tool.name, args, cfg);
}
for (const tool of assetTools) {
  toolHandlers[tool.name] = (args, cfg) => handleAssetTool(tool.name, args, cfg);
}
for (const tool of contactTools) {
  toolHandlers[tool.name] = (args, cfg) => handleContactTool(tool.name, args, cfg);
}
for (const tool of dataEventTools) {
  toolHandlers[tool.name] = (args, cfg) => handleDataEventTool(tool.name, args, cfg);
}
for (const tool of journeyTools) {
  toolHandlers[tool.name] = (args, cfg) => handleJourneyTool(tool.name, args, cfg);
}
for (const tool of transactionalTools) {
  toolHandlers[tool.name] = (args, cfg) => handleTransactionalTool(tool.name, args, cfg);
}
for (const tool of pushSmsTools) {
  toolHandlers[tool.name] = (args, cfg) => handlePushSmsTool(tool.name, args, cfg);
}
for (const tool of ensTools) {
  toolHandlers[tool.name] = (args, cfg) => handleEnsTool(tool.name, args, cfg);
}
for (const tool of soapTools) {
  toolHandlers[tool.name] = (args, cfg) => handleSoapTool(tool.name, args, cfg);
}

async function main() {
  const server = new Server(
    {
      name: "mcp-sfmc",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    const handler = toolHandlers[name];
    if (!handler) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    try {
      const config = getConfig();
      const result = await handler(args as Record<string, unknown>, config);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SFMC MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
