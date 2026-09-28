const test = require("node:test");
const assert = require("node:assert/strict");
const { XMLParser, XMLValidator } = require("fast-xml-parser");

const client = require("../dist/client.js");
const soap = require("../dist/tools/soap.js");
const { escapeXml } = require("../dist/xml.js");

const config = { businessUnitName: "Test BU", subdomain: "x", clientId: "id", clientSecret: "secret" };

// Characters that break XML when inserted unescaped.
const NASTY = `Tom & Jerry <b>"quoted"</b> 'single' ]]>`;

// Capture the SOAP body each tool builds instead of sending it.
function captureBody(t) {
  const original = client.soapRequest;
  const captured = {};
  client.soapRequest = async (_config, action, body) => {
    captured.action = action;
    captured.body = body;
    return {};
  };
  t.after(() => {
    client.soapRequest = original;
  });
  return captured;
}

function parse(body) {
  const valid = XMLValidator.validate(body);
  assert.equal(valid, true, `body is not well-formed XML: ${JSON.stringify(valid)}\n${body}`);
  return new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: false }).parse(body);
}

test("escapeXml escapes the five XML special characters", () => {
  assert.equal(escapeXml(`<a href="x">Tom & 'Jerry'</a>`), "&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;");
  assert.equal(escapeXml(42), "42");
  assert.equal(escapeXml(false), "false");
});

test("sfmc_soap_de_upsert_rows escapes row names and values", async (t) => {
  const captured = captureBody(t);
  await soap.handleSoapTool("sfmc_soap_de_upsert_rows", { deExternalKey: "key&1", rows: [{ Name: NASTY, Note: "a<b" }] }, config);
  const obj = parse(captured.body).UpsertRequest.Objects;
  assert.equal(obj.CustomerKey, "key&1");
  assert.deepEqual(obj.Properties, [
    { Name: "Name", Value: NASTY },
    { Name: "Note", Value: "a<b" },
  ]);
});

test("sfmc_soap_de_delete_rows escapes keys", async (t) => {
  const captured = captureBody(t);
  await soap.handleSoapTool("sfmc_soap_de_delete_rows", { deExternalKey: "k", rows: [{ Id: NASTY }] }, config);
  assert.equal(parse(captured.body).DeleteRequest.Objects.Keys.Value, NASTY);
});

test("sfmc_soap_de_retrieve escapes the key and the filter", async (t) => {
  const captured = captureBody(t);
  await soap.handleSoapTool(
    "sfmc_soap_de_retrieve",
    { deExternalKey: "k<1>", properties: ["Email"], filter: { property: "Name", operator: "equals", value: NASTY } },
    config
  );
  const req = parse(captured.body).RetrieveRequestMsg.RetrieveRequest;
  assert.equal(req.ObjectType, "DataExtensionObject[k<1>]");
  assert.equal(req.Filter.Value, NASTY);
});

test("filters with IN values escape each value", async (t) => {
  const captured = captureBody(t);
  await soap.handleSoapTool(
    "sfmc_soap_automation_retrieve",
    { properties: ["Name"], filter: { property: "Name", operator: "IN", value: ["a&b", "<c>"] } },
    config
  );
  assert.deepEqual(parse(captured.body).RetrieveRequestMsg.RetrieveRequest.Filter.Value, ["a&b", "<c>"]);
});

test("sfmc_soap_de_create_definition escapes names, description and field defaults", async (t) => {
  const captured = captureBody(t);
  await soap.handleSoapTool(
    "sfmc_soap_de_create_definition",
    {
      name: "R&D <leads>",
      externalKey: "rd&leads",
      description: NASTY,
      fields: [{ name: "Notes", fieldType: "Text", maxLength: 500, defaultValue: "n/a & <none>" }],
    },
    config
  );
  const obj = parse(captured.body).CreateRequest.Objects;
  assert.equal(obj.Name, "R&D <leads>");
  assert.equal(obj.CustomerKey, "rd&leads");
  assert.equal(obj.Description, NASTY);
  assert.equal(obj.Fields.DefaultValue, "n/a & <none>");
  assert.equal(obj.Fields.MaxLength, "500");
});

test("sfmc_soap_subscriber_upsert escapes subscriber fields and attributes", async (t) => {
  const captured = captureBody(t);
  await soap.handleSoapTool(
    "sfmc_soap_subscriber_upsert",
    {
      subscriberKey: "sub&1",
      emailAddress: "o'brien@example.com",
      attributes: [{ name: "Company", value: "AT&T" }],
      lists: [{ id: "12", status: "Active" }],
    },
    config
  );
  const obj = parse(captured.body).UpsertRequest.Objects;
  assert.equal(obj.SubscriberKey, "sub&1");
  assert.equal(obj.EmailAddress, "o'brien@example.com");
  assert.equal(obj.Attributes.Name, "Company");
  assert.equal(obj.Attributes.Value, "AT&T");
});

test("every SOAP tool produces well-formed XML from hostile input", async (t) => {
  const captured = captureBody(t);
  const args = {
    deExternalKey: NASTY,
    automationKey: NASTY,
    externalKey: NASTY,
    name: NASTY,
    description: NASTY,
    subscriberKey: NASTY,
    emailAddress: NASTY,
    status: NASTY,
    properties: ["Name"],
    rows: [{ [`Col`]: NASTY }],
    fields: [{ name: NASTY, fieldType: "Text", defaultValue: NASTY }],
    lists: [{ id: NASTY, status: NASTY }],
    attributes: [{ name: NASTY, value: NASTY }],
    filter: { property: "Name", operator: "equals", value: NASTY },
  };
  for (const tool of soap.soapTools) {
    captured.body = undefined;
    await soap.handleSoapTool(tool.name, args, config);
    assert.ok(captured.body, `${tool.name} sent nothing`);
    assert.equal(XMLValidator.validate(captured.body), true, `${tool.name} built invalid XML`);
    assert.ok(!captured.body.includes(NASTY), `${tool.name} inserted a raw value`);
  }
});
