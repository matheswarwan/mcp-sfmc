import axios from "axios";
import { SFMCConfig, TokenCache } from "./types.js";

const tokenCache = new Map<string, TokenCache>();

export async function getAccessToken(config: SFMCConfig): Promise<TokenCache> {
  const cached = tokenCache.get(config.businessUnitName);
  if (cached && Date.now() < cached.expiresAt) {
    return cached;
  }

  const body: Record<string, string> = {
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  };

  if (config.accountId) {
    body.account_id = config.accountId;
  }

  const response = await axios.post(
    `https://${config.subdomain}.auth.marketingcloudapis.com/v2/token`,
    body,
    { headers: { "Content-Type": "application/json" } }
  );

  const data = response.data;

  const entry: TokenCache = {
    token: data.access_token,
    // Subtract 60s buffer from expiry
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    soapUrl: data.soap_instance_url || `https://${config.subdomain}.soap.marketingcloudapis.com`,
    restUrl: data.rest_instance_url || `https://${config.subdomain}.rest.marketingcloudapis.com`,
  };

  tokenCache.set(config.businessUnitName, entry);
  return entry;
}

export function clearTokenCache(businessUnitName?: string): void {
  if (businessUnitName) {
    tokenCache.delete(businessUnitName);
  } else {
    tokenCache.clear();
  }
}
