import axios, { AxiosRequestConfig } from "axios";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { getAccessToken } from "./auth.js";
import { SFMCConfig } from "./types.js";

export async function restRequest(
  config: SFMCConfig,
  method: string,
  path: string,
  data?: unknown,
  params?: Record<string, string | number | boolean>
): Promise<unknown> {
  const tokenData = await getAccessToken(config);
  const baseUrl = tokenData.restUrl.replace(/\/$/, "");

  const reqConfig: AxiosRequestConfig = {
    method,
    url: `${baseUrl}/${path.replace(/^\//, "")}`,
    headers: {
      Authorization: `Bearer ${tokenData.token}`,
      "Content-Type": "application/json",
    },
    params,
  };

  if (data !== undefined && method !== "GET" && method !== "DELETE") {
    reqConfig.data = data;
  }

  try {
    const response = await axios(reqConfig);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        `SFMC API Error ${error.response.status}: ${JSON.stringify(error.response.data)}`
      );
    }
    throw error;
  }
}

export async function soapRequest(
  config: SFMCConfig,
  action: string,
  body: string
): Promise<unknown> {
  const tokenData = await getAccessToken(config);
  const soapUrl = `${tokenData.soapUrl.replace(/\/$/, "")}/Service.asmx`;

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <a:Action s:mustUnderstand="1">${action}</a:Action>
    <a:To s:mustUnderstand="1">${soapUrl}</a:To>
    <fueloauth xmlns="http://exacttarget.com">${tokenData.token}</fueloauth>
  </s:Header>
  <s:Body>
    ${body}
  </s:Body>
</s:Envelope>`;

  try {
    const response = await axios.post(soapUrl, envelope, {
      headers: {
        "Content-Type": "text/xml",
        SOAPAction: action,
      },
    });

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    return parser.parse(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        `SFMC SOAP Error ${error.response.status}: ${error.response.data}`
      );
    }
    throw error;
  }
}
