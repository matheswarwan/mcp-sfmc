import { Tool } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { SFMCConfig } from "../types.js";
import { getAccessToken, clearTokenCache } from "../auth.js";
import { restRequest } from "../client.js";
import { describeConfigSource, loadAccounts, shadowedConfigs } from "../config.js";

export const authTools: Tool[] = [
  {
    name: "sfmc_list_business_units",
    description: "List all configured SFMC business units available in this server. Call this first whenever the user mentions a specific business unit by name, so you can pass the exact name to the business_unit parameter of other tools.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "sfmc_get_token",
    description: "Request an access token from Salesforce Marketing Cloud using client credentials",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "sfmc_get_user_info",
    description: "Retrieve information about the currently authenticated user",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "sfmc_discovery",
    description: "Discover available REST API resources and endpoints",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

export async function handleAuthTool(
  name: string,
  args: Record<string, unknown>,
  config: SFMCConfig
): Promise<unknown> {
  switch (name) {
    case "sfmc_list_business_units": {
      const accounts = loadAccounts();
      const shadowed = shadowedConfigs();
      return {
        business_units: accounts.map((a) => a.businessUnitName),
        default: accounts[0].businessUnitName,
        // Naming the source makes a config mismatch visible in chat rather
        // than something the user has to infer from a missing business unit.
        config_source: describeConfigSource(),
        ...(shadowed.length > 0
          ? {
              warning: shadowed.map(
                (s) =>
                  `${s.path} also holds ${s.count} business unit(s) but is not the config in use. Business units added there will not appear here.`
              ),
            }
          : {}),
      };
    }
    case "sfmc_get_token": {
      clearTokenCache(config.businessUnitName);
      const tokenData = await getAccessToken(config);
      return {
        access_token: tokenData.token,
        expires_at: new Date(tokenData.expiresAt).toISOString(),
        rest_instance_url: tokenData.restUrl,
        soap_instance_url: tokenData.soapUrl,
      };
    }
    case "sfmc_get_user_info":
      return restRequest(config, "GET", "v2/userinfo");
    case "sfmc_discovery":
      return restRequest(config, "GET", "v2/discovery");
    default:
      throw new Error(`Unknown auth tool: ${name}`);
  }
}
