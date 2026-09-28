const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");

const client = require("../dist/client.js");
const { clearTokenCache } = require("../dist/auth.js");
const soap = require("../dist/tools/soap.js");

const config = { businessUnitName: "Client Test BU", subdomain: "x", clientId: "id", clientSecret: "secret" };

// A DataExtensionObject Retrieve response with values that look numeric but are data.
const RETRIEVE_XML = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <RetrieveResponseMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <OverallStatus>OK</OverallStatus>
      <RequestID>4a0c9d6e-1111-2222-3333-444455556666</RequestID>
      <Results xsi:type="DataExtensionObject">
        <Properties>
          <Property><Name>SubscriberKey</Name><Value>007</Value></Property>
          <Property><Name>Zip</Name><Value>02134</Value></Property>
          <Property><Name>Phone</Name><Value>+14155550100</Value></Property>
          <Property><Name>PromoCode</Name><Value>1e5</Value></Property>
          <Property><Name>Price</Name><Value>12.50</Value></Property>
          <Property><Name>Opted</Name><Value>true</Value></Property>
        </Properties>
      </Results>
    </RetrieveResponseMsg>
  </soap:Body>
</soap:Envelope>`;

// Stub axios.post: the token endpoint returns a token, the SOAP endpoint the fixture.
function stubAxios(t) {
  const original = axios.post;
  axios.post = async (url) => {
    if (url.includes("/v2/token")) {
      return { data: { access_token: "tok", expires_in: 1200, soap_instance_url: "https://x.soap.example/" } };
    }
    if (url.endsWith("/Service.asmx")) return { data: RETRIEVE_XML };
    throw new Error(`unexpected POST ${url}`);
  };
  clearTokenCache();
  t.after(() => {
    axios.post = original;
    clearTokenCache();
  });
}

function properties(parsed) {
  const props = parsed["soap:Envelope"]["soap:Body"].RetrieveResponseMsg.Results.Properties.Property;
  return Object.fromEntries(props.map((p) => [p.Name, p.Value]));
}

test("soapRequest keeps values exactly as SFMC sent them by default", async (t) => {
  stubAxios(t);
  const parsed = await client.soapRequest(config, "Retrieve", "<RetrieveRequestMsg/>");
  assert.deepEqual(properties(parsed), {
    SubscriberKey: "007",
    Zip: "02134",
    Phone: "+14155550100",
    PromoCode: "1e5",
    Price: "12.50",
    Opted: "true",
  });
});

test("soapRequest still converts values when asked", async (t) => {
  stubAxios(t);
  const parsed = await client.soapRequest(config, "Retrieve", "<RetrieveRequestMsg/>", { parseValues: true });
  const row = properties(parsed);
  assert.equal(row.SubscriberKey, 7);
  assert.equal(row.Opted, true);
});

test("sfmc_soap_de_retrieve returns leading zeros and phone prefixes intact", async (t) => {
  stubAxios(t);
  const parsed = await soap.handleSoapTool(
    "sfmc_soap_de_retrieve",
    { deExternalKey: "subs", properties: ["SubscriberKey", "Zip", "Phone"] },
    config
  );
  const row = properties(parsed);
  assert.equal(row.SubscriberKey, "007");
  assert.equal(row.Zip, "02134");
  assert.equal(row.Phone, "+14155550100");
});

// Prefixes used on element and attribute names, e.g. "s" in <s:Body> and "xsi" in xsi:type.
function undeclaredPrefixes(xml) {
  const declared = new Set([...xml.matchAll(/xmlns:([A-Za-z_][\w.-]*)=/g)].map((m) => m[1]));
  const used = new Set();
  for (const m of xml.matchAll(/<\/?([A-Za-z_][\w.-]*):[A-Za-z_]/g)) used.add(m[1]);
  for (const m of xml.matchAll(/\s([A-Za-z_][\w.-]*):[A-Za-z_][\w.-]*=/g)) if (m[1] !== "xmlns") used.add(m[1]);
  return [...used].filter((p) => !declared.has(p));
}

test("every SOAP envelope declares the namespace prefixes it uses", async (t) => {
  const original = axios.post;
  const envelopes = [];
  axios.post = async (url, body) => {
    if (url.includes("/v2/token")) {
      return { data: { access_token: "tok", expires_in: 1200, soap_instance_url: "https://x.soap.example/" } };
    }
    envelopes.push(body);
    return { data: RETRIEVE_XML };
  };
  clearTokenCache();
  t.after(() => {
    axios.post = original;
    clearTokenCache();
  });

  const args = {
    deExternalKey: "k",
    automationKey: "k",
    externalKey: "k",
    name: "n",
    subscriberKey: "s",
    emailAddress: "e@example.com",
    properties: ["Name"],
    rows: [{ Id: "1" }],
    fields: [{ name: "Name", fieldType: "Text" }],
    filter: { property: "Name", operator: "equals", value: "x" },
  };
  for (const tool of soap.soapTools) {
    envelopes.length = 0;
    await soap.handleSoapTool(tool.name, args, config);
    assert.equal(envelopes.length, 1, `${tool.name} did not send a request`);
    assert.deepEqual(undeclaredPrefixes(envelopes[0]), [], `${tool.name} uses an undeclared prefix`);
  }
});
