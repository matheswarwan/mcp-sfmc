import { Tool } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { SFMCConfig } from "../types.js";
import { getAccessToken, clearTokenCache } from "../auth.js";
import { restRequest } from "../client.js";

export const authTools: Tool[] = [
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
