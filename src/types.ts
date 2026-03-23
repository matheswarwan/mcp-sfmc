export interface SFMCAccount {
  business_unit_name: string;
  subdomain: string;
  grant_type: string;
  client_id: string;
  client_secret: string;
  account_id?: string;
}

export interface SFMCConfig {
  businessUnitName: string;
  subdomain: string;
  clientId: string;
  clientSecret: string;
  accountId?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  soap_instance_url: string;
  rest_instance_url: string;
}

export interface TokenCache {
  token: string;
  expiresAt: number;
  soapUrl: string;
  restUrl: string;
}
