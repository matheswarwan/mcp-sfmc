const test = require("node:test");
const assert = require("node:assert/strict");

const client = require("../dist/client.js");
const deSearch = require("../dist/tools/de-search.js");

const config = { businessUnitName: "Test BU", subdomain: "x", clientId: "id", clientSecret: "secret" };

// Shape a parsed SOAP Retrieve response the way fast-xml-parser returns it.
function retrieveResponse(results, { status = "OK", requestId = "req-1" } = {}) {
  return {
    "soap:Envelope": {
      "soap:Body": {
        RetrieveResponseMsg: { OverallStatus: status, RequestID: requestId, Results: results },
      },
    },
  };
}

function rowResult(row) {
  return { Properties: { Property: Object.entries(row).map(([Name, Value]) => ({ Name, Value })) } };
}

// Replace soapRequest for one test and record every request body it receives.
function stubSoap(t, respond) {
  const original = client.soapRequest;
  const calls = [];
  client.soapRequest = async (_config, action, body, options) => {
    calls.push({ action, body, options });
    return respond(body, calls.length);
  };
  t.after(() => {
    client.soapRequest = original;
  });
  return calls;
}

test("buildLikeFilterXml: single field is a simple LIKE filter", () => {
  const xml = deSearch.buildLikeFilterXml(["Email"], "bob");
  assert.equal(
    xml,
    '<Filter xsi:type="SimpleFilterPart"><Property>Email</Property><SimpleOperator>like</SimpleOperator><Value>%bob%</Value></Filter>'
  );
});

test("buildLikeFilterXml: several fields form a balanced OR tree", () => {
  const xml = deSearch.buildLikeFilterXml(["A", "B", "C", "D"], "x");
  assert.match(xml, /^<Filter xsi:type="ComplexFilterPart"><LeftOperand xsi:type="ComplexFilterPart">/);
  assert.equal((xml.match(/<LogicalOperator>OR<\/LogicalOperator>/g) || []).length, 3);
  for (const f of ["A", "B", "C", "D"]) assert.ok(xml.includes(`<Property>${f}</Property>`));
});

test("buildLikeFilterXml: no fields means no filter", () => {
  assert.equal(deSearch.buildLikeFilterXml([], "x"), "");
});

test("buildLikeFilterXml: escapes XML in the search string", () => {
  const xml = deSearch.buildLikeFilterXml(["Name"], `<a & "b">`);
  assert.ok(xml.includes("<Value>%&lt;a &amp; &quot;b&quot;&gt;%</Value>"));
});

test("isExcluded matches case-insensitive substrings", () => {
  assert.equal(deSearch.isExcluded("My_IGO_PROFILES_copy", deSearch.DEFAULT_EXCLUDED_NAME_PATTERNS), true);
  assert.equal(deSearch.isExcluded("Newsletter Subscribers", deSearch.DEFAULT_EXCLUDED_NAME_PATTERNS), false);
  assert.equal(deSearch.isExcluded("anything", []), false);
});

test("parseRetrieveResponse normalizes a single result to an array", () => {
  const resp = deSearch.parseRetrieveResponse(retrieveResponse({ Name: "Only" }));
  assert.deepEqual(resp.results, [{ Name: "Only" }]);
  assert.equal(resp.overallStatus, "OK");
});

test("parseRetrieveResponse surfaces SOAP faults", () => {
  assert.throws(
    () => deSearch.parseRetrieveResponse({ "soap:Envelope": { "soap:Body": { "soap:Fault": { faultstring: "bad" } } } }),
    /SOAP fault/
  );
});

test("rowFromResult flattens properties and keeps empty values as strings", () => {
  const row = deSearch.rowFromResult({ Properties: { Property: [{ Name: "Key", Value: "007" }, { Name: "Blank", Value: "" }] } });
  assert.deepEqual(row, { Key: "007", Blank: "" });
});

test("sfmc_de_search lists, filters and searches Data Extensions", async (t) => {
  const calls = stubSoap(t, (body) => {
    if (body.includes("<ObjectType>DataExtension</ObjectType>")) {
      if (body.includes("<ContinueRequest>")) {
        return retrieveResponse([{ Name: "Orders", CustomerKey: "orders" }]);
      }
      return retrieveResponse(
        [
          { Name: "Subscribers", CustomerKey: "subs" },
          { Name: "_Sent", CustomerKey: "sent" },
          { Name: "IGO_PROFILES", CustomerKey: "igo" },
          { Name: "Numbers Only", CustomerKey: "nums" },
        ],
        { status: "MoreDataAvailable", requestId: "page-2" }
      );
    }
    if (body.includes("<ObjectType>DataExtensionField</ObjectType>")) {
      if (body.includes("<Value>nums</Value>")) return retrieveResponse([{ Name: "Total", FieldType: "Number" }]);
      return retrieveResponse([
        { Name: "Email", FieldType: "EmailAddress" },
        { Name: "Name", FieldType: "Text" },
        { Name: "Age", FieldType: "Number" },
      ]);
    }
    if (body.includes("DataExtensionObject[subs]")) {
      return retrieveResponse([rowResult({ Email: "bob@example.com", Name: "Bob", Age: "40" })]);
    }
    if (body.includes("DataExtensionObject[orders]")) return retrieveResponse([]);
    throw new Error(`unexpected request: ${body}`);
  });

  const result = await deSearch.handleDeSearchTool("sfmc_de_search", { searchString: "bob@" }, config);

  assert.equal(result.dataExtensionsSearched, 3);
  assert.equal(result.excludedByName, 1);
  assert.equal(result.matchCount, 1);
  assert.deepEqual(result.matches[0], {
    name: "Subscribers",
    customerKey: "subs",
    matchedFields: ["Email"],
    rowsReturned: 1,
    moreRows: false,
    rows: [{ Email: "bob@example.com", Name: "Bob", Age: "40" }],
  });
  assert.deepEqual(result.skipped, [{ name: "Numbers Only", reason: "no Text/EmailAddress/Phone fields" }]);
  assert.deepEqual(result.errors, []);

  // The search only LIKEs string fields, but retrieves every column.
  const search = calls.find((c) => c.body.includes("DataExtensionObject[subs]")).body;
  assert.ok(search.includes("<Property>Email</Property>"));
  assert.ok(!search.includes("<Property>Age</Property>"));
  assert.ok(search.includes("<Properties>Age</Properties>"));
  // Values are kept as strings so keys like "007" are not turned into numbers.
  assert.ok(calls.every((c) => c.options && c.options.parseValues === false));
  // Paging followed the RequestID.
  assert.ok(calls.some((c) => c.body.includes("<ContinueRequest>page-2</ContinueRequest>")));
});

test("sfmc_de_search with deExternalKeys skips listing and reports per-DE errors", async (t) => {
  const calls = stubSoap(t, (body) => {
    if (body.includes("<Value>broken</Value>")) {
      return retrieveResponse([], { status: "Error: Data Extension does not exist" });
    }
    if (body.includes("DataExtensionField")) return retrieveResponse([{ Name: "Code", FieldType: "Text" }]);
    return retrieveResponse([rowResult({ Code: "ABC123" })]);
  });

  const result = await deSearch.handleDeSearchTool(
    "sfmc_de_search",
    { searchString: "abc", deExternalKeys: ["codes", "broken"] },
    config
  );

  assert.ok(!calls.some((c) => c.body.includes("<ObjectType>DataExtension</ObjectType>")));
  assert.equal(result.matchCount, 1);
  assert.equal(result.matches[0].customerKey, "codes");
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].customerKey, "broken");
  assert.match(result.errors[0].error, /does not exist/);
});

test("sfmc_de_search stops at maxDataExtensions and says so", async (t) => {
  stubSoap(t, (body) => {
    if (body.includes("<ObjectType>DataExtension</ObjectType>")) {
      return retrieveResponse([1, 2, 3].map((i) => ({ Name: `DE ${i}`, CustomerKey: `de${i}` })));
    }
    if (body.includes("DataExtensionField")) return retrieveResponse([{ Name: "Name", FieldType: "Text" }]);
    return retrieveResponse([]);
  });

  const result = await deSearch.handleDeSearchTool("sfmc_de_search", { searchString: "x", maxDataExtensions: 2 }, config);
  assert.equal(result.dataExtensionsSearched, 2);
  assert.equal(result.dataExtensionsNotSearched, 1);
  assert.match(result.note, /maxDataExtensions=2/);
});

test("sfmc_de_search rejects an empty search string", async () => {
  await assert.rejects(() => deSearch.handleDeSearchTool("sfmc_de_search", { searchString: "  " }, config), /must not be empty/);
});
