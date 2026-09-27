const test = require("node:test");
const assert = require("node:assert/strict");

const client = require("../dist/client.js");
const emailValidation = require("../dist/tools/email-validation.js");

const config = { businessUnitName: "Test BU", subdomain: "x", clientId: "id", clientSecret: "secret" };

function stubRest(t, respond) {
  const original = client.restRequest;
  const calls = [];
  client.restRequest = async (_config, method, path, data) => {
    calls.push({ method, path, data });
    return respond(data);
  };
  t.after(() => {
    client.restRequest = original;
  });
  return calls;
}

test("editDistance counts an adjacent swap as one edit", () => {
  assert.equal(emailValidation.editDistance("gmial.com", "gmail.com"), 1);
  assert.equal(emailValidation.editDistance("same", "same"), 0);
  assert.equal(emailValidation.editDistance("", "abc"), 3);
});

test("suggestDomainFix corrects likely typos only", () => {
  assert.equal(emailValidation.suggestDomainFix("jo@gmial.com"), "jo@gmail.com");
  assert.equal(emailValidation.suggestDomainFix("Jo.Smith@HOTMAL.COM"), "Jo.Smith@hotmail.com");
  assert.equal(emailValidation.suggestDomainFix("jo@gmail.com"), undefined);
  assert.equal(emailValidation.suggestDomainFix("jo@cloudkettle.com"), undefined);
  assert.equal(emailValidation.suggestDomainFix("not-an-email"), undefined);
});

test("normalizeEmails trims, drops blanks and dedupes case-insensitively", () => {
  assert.deepEqual(emailValidation.normalizeEmails([" a@x.com ", "A@X.com", "", null, "b@x.com"]), ["a@x.com", "b@x.com"]);
});

test("sfmc_validate_emails reports failures and typos, not clean addresses", async (t) => {
  const calls = stubRest(t, (data) => {
    if (data.email === "bad@nowhere.invalid") return { email: data.email, valid: false, failedValidation: "MXValidator" };
    return { email: data.email, valid: true };
  });

  const result = await emailValidation.handleEmailValidationTool(
    "sfmc_validate_emails",
    { emails: ["ok@example.com", "bad@nowhere.invalid", "typo@gmial.com", "OK@example.com"] },
    config
  );

  assert.equal(result.checked, 3);
  assert.equal(result.validCount, 2);
  assert.equal(result.invalidCount, 1);
  assert.equal(result.possibleTypoCount, 1);
  assert.deepEqual(result.results, [
    { email: "bad@nowhere.invalid", valid: false, failedValidation: "MXValidator" },
    { email: "typo@gmial.com", valid: true, didYouMean: "typo@gmail.com" },
  ]);
  assert.ok(calls.every((c) => c.method === "POST" && c.path === "address/v1/validateEmail"));
  assert.deepEqual(calls[0].data.validators, emailValidation.SFMC_VALIDATORS);
});

test("sfmc_validate_emails keeps going when one call fails", async (t) => {
  stubRest(t, (data) => {
    if (data.email === "boom@example.com") throw new Error("SFMC API Error 500: oops");
    return { email: data.email, valid: true };
  });

  const result = await emailValidation.handleEmailValidationTool(
    "sfmc_validate_emails",
    { emails: ["boom@example.com", "fine@example.com"], includeValid: true, validators: ["SyntaxValidator"] },
    config
  );

  assert.equal(result.results.length, 2);
  assert.match(result.results[0].error, /500/);
  assert.equal(result.results[1].valid, true);
  assert.deepEqual(result.validators, ["SyntaxValidator"]);
});

test("sfmc_validate_emails enforces the batch limits", async () => {
  await assert.rejects(
    () => emailValidation.handleEmailValidationTool("sfmc_validate_emails", { emails: [] }, config),
    /at least one/
  );
  const tooMany = Array.from({ length: 501 }, (_, i) => `u${i}@example.com`);
  await assert.rejects(
    () => emailValidation.handleEmailValidationTool("sfmc_validate_emails", { emails: tooMany }, config),
    /at most 500/
  );
});
