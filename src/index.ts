#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SFMCConfig } from "./types.js";
import {
  describeConfigSource,
  getAccount,
  loadAccounts,
  resolveConfigPath,
  shadowedConfigs,
} from "./config.js";
import { runCli, CliError } from "./cli.js";
import { packageVersion } from "./version.js";
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
  deSearchTools, handleDeSearchTool,
  emailValidationTools, handleEmailValidationTool,
} from "./tools/index.js";

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
  ...deSearchTools,
  ...emailValidationTools,
];

// Inject business_unit param into every tool (except the listing tool) so the LLM can select a BU by name
for (const tool of allTools) {
  if (tool.name === "sfmc_list_business_units") continue;
  (tool.inputSchema as Record<string, unknown>).properties = {
    ...((tool.inputSchema as Record<string, unknown>).properties as Record<string, unknown>),
    business_unit: {
      type: "string",
      description: "Name of the business unit to use. If the user mentions a specific business unit, call sfmc_list_business_units first to get the exact name, then pass it here. Defaults to the first account in the config file.",
    },
  };
}

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
for (const tool of deSearchTools) {
  toolHandlers[tool.name] = (args, cfg) => handleDeSearchTool(tool.name, args, cfg);
}
for (const tool of emailValidationTools) {
  toolHandlers[tool.name] = (args, cfg) => handleEmailValidationTool(tool.name, args, cfg);
}

async function main() {
  // Validate config at startup so misconfiguration fails fast
  let accounts;
  try {
    accounts = loadAccounts();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`SFMC MCP Server: ${message}`);
    console.error(`SFMC MCP Server: expected config at ${resolveConfigPath()}. Run "mcp-sfmc init" to create it.`);
    process.exit(1);
  }
  // Name the file as well as the business units. Without the path, a client
  // pointing at a different config than the CLI just writes to looks like a
  // business unit that silently vanished.
  console.error(`SFMC MCP Server: config ${describeConfigSource()}`);
  console.error(`SFMC MCP Server: loaded ${accounts.length} business unit(s): ${accounts.map((a) => a.businessUnitName).join(", ")}`);

  for (const other of shadowedConfigs()) {
    console.error(
      `SFMC MCP Server: warning: ${other.path} also holds ${other.count} business unit(s) but is not being used. Business units added there will not appear here.`
    );
  }

  const server = new Server(
    {
      name: "mcp-sfmc",
      version: packageVersion(),
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
      const config = getAccount((args as Record<string, unknown>).business_unit as string | undefined);
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

// With arguments this binary is a setup CLI; with none it is the MCP server an
// MCP client launches over stdio.
const cliArgs = process.argv.slice(2);

if (cliArgs.length > 0) {
  runCli(cliArgs)
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      if (error instanceof CliError) {
        console.error(error.message);
      } else {
        console.error(error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    });
} else {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
