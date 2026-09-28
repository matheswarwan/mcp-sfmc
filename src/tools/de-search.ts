import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { SFMCConfig } from "../types.js";
import { soapRequest } from "../client.js";
import { escapeXml } from "../xml.js";

export { escapeXml };

// Ported from the sfmc-search-in-all-de CloudPage tool: find which Data
// Extensions hold a value by running a LIKE search over every text-like field.

// System and high-volume DEs that are never worth searching. Matched as a
// case-insensitive substring of the DE name.
export const DEFAULT_EXCLUDED_NAME_PATTERNS = [
  "QueryStudioResults",
  "log",
  "ExpressionBuilderAttributes",
  "IGO_PROFILES",
  "IGO_VIEWS",
  "IGO_PURCHASES",
  "IGO_PRODUCTS",
  "IGO_PRODUCTATTRIBS",
  "PI_SESSION_ENDS",
  "PI_SESSIONS",
  "PI_CONTENTVIEWS",
  "PI_CONTENT",
  "PI_CONTENTATTRIBS",
  "PI_ABANDONED_CART_EVENT",
  "PI_ABANDONED_CART_ITEMS",
  "Einstein_MC_Predictive_Scores",
];

// LIKE only makes sense on string columns; Number, Date and Boolean fields
// make the whole retrieve fail.
export const DEFAULT_SEARCH_FIELD_TYPES = ["Text", "EmailAddress", "Phone"];

const XSI_NS = 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"';
const PARTNER_NS = 'xmlns="http://exacttarget.com/wsdl/partnerAPI"';

export const deSearchTools: Tool[] = [
  {
    name: "sfmc_de_search",
    description:
      "Search every Data Extension in the business unit for a text value (case-insensitive substring match on Text, EmailAddress and Phone fields). Returns which DEs contain it, which fields matched and a sample of matching rows. Use it to find where a subscriber key, email address or code lives when you don't know the DE. Large business units can mean hundreds of SOAP calls, so narrow with nameContains or deExternalKeys when you can.",
    inputSchema: {
      type: "object",
      properties: {
        searchString: { type: "string", description: "Text to search for. SQL LIKE wildcards (% and _) in it are treated as wildcards." },
        deExternalKeys: {
          type: "array",
          items: { type: "string" },
          description: "Only search these Data Extensions (external keys). Skips listing all DEs.",
        },
        nameContains: { type: "string", description: "Only search DEs whose name contains this text (case-insensitive)." },
        excludeNamePatterns: {
          type: "array",
          items: { type: "string" },
          description: "Skip DEs whose name contains any of these (case-insensitive). Defaults to common system DEs such as IGO_*, PI_* and QueryStudioResults. Pass [] to search everything.",
        },
        fieldTypes: {
          type: "array",
          items: { type: "string" },
          description: "Field types to search. Default: Text, EmailAddress, Phone.",
        },
        maxDataExtensions: { type: "number", description: "Stop after searching this many DEs. Default 200." },
        maxRowsPerDataExtension: { type: "number", description: "Matching rows returned per DE. Default 10." },
        concurrency: { type: "number", description: "DEs searched in parallel. Default 5, max 10." },
      },
      required: ["searchString"],
    },
  },
];

export interface DeRef {
  name: string;
  customerKey: string;
}

export interface DeField {
  name: string;
  fieldType: string;
}


export function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

// fast-xml-parser keeps namespace prefixes, so the envelope arrives as
// "soap:Envelope" or similar. Look up by local name instead.
function childByLocalName(node: unknown, localName: string): unknown {
  if (!node || typeof node !== "object") return undefined;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === localName || key.endsWith(`:${localName}`)) return value;
  }
  return undefined;
}

export interface RetrieveResponse {
  overallStatus: string;
  requestId?: string;
  results: Record<string, unknown>[];
}

export function parseRetrieveResponse(parsed: unknown): RetrieveResponse {
  const body = childByLocalName(childByLocalName(parsed, "Envelope"), "Body");
  const fault = childByLocalName(body, "Fault");
  if (fault) {
    throw new Error(`SOAP fault: ${JSON.stringify(fault)}`);
  }
  const msg = childByLocalName(body, "RetrieveResponseMsg") as Record<string, unknown> | undefined;
  if (!msg) {
    throw new Error("Unexpected SOAP response: no RetrieveResponseMsg");
  }
  return {
    overallStatus: String(msg.OverallStatus ?? ""),
    requestId: msg.RequestID === undefined ? undefined : String(msg.RequestID),
    results: toArray(msg.Results as Record<string, unknown> | Record<string, unknown>[]),
  };
}

// DataExtensionObject results carry values as Properties.Property[{Name, Value}].
export function rowFromResult(result: Record<string, unknown>): Record<string, string> {
  const props = (result.Properties as Record<string, unknown> | undefined)?.Property;
  const row: Record<string, string> = {};
  for (const p of toArray(props as Record<string, unknown> | Record<string, unknown>[])) {
    const value = p.Value;
    row[String(p.Name)] = value === undefined || value === null || typeof value === "object" ? "" : String(value);
  }
  return row;
}

export function isExcluded(deName: string, patterns: string[]): boolean {
  const lower = deName.toLowerCase();
  return patterns.some((p) => p !== "" && lower.includes(p.toLowerCase()));
}

// Build a balanced OR tree of LIKE filters, so depth grows with log(n) rather
// than n. Returns "" when there is nothing to search.
export function buildLikeFilterXml(fieldNames: string[], searchString: string, tag = "Filter"): string {
  if (fieldNames.length === 0) return "";
  const value = escapeXml(`%${searchString}%`);
  if (fieldNames.length === 1) {
    return `<${tag} xsi:type="SimpleFilterPart"><Property>${escapeXml(fieldNames[0])}</Property><SimpleOperator>like</SimpleOperator><Value>${value}</Value></${tag}>`;
  }
  const mid = Math.ceil(fieldNames.length / 2);
  return `<${tag} xsi:type="ComplexFilterPart">${buildLikeFilterXml(fieldNames.slice(0, mid), searchString, "LeftOperand")}<LogicalOperator>OR</LogicalOperator>${buildLikeFilterXml(fieldNames.slice(mid), searchString, "RightOperand")}</${tag}>`;
}

export function retrieveXml(objectType: string, properties: string[], filterXml = "", continueRequestId?: string): string {
  return `<RetrieveRequestMsg ${PARTNER_NS} ${XSI_NS}>
        <RetrieveRequest>
          ${continueRequestId ? `<ContinueRequest>${escapeXml(continueRequestId)}</ContinueRequest>` : ""}
          <ObjectType>${escapeXml(objectType)}</ObjectType>
          ${properties.map((p) => `<Properties>${escapeXml(p)}</Properties>`).join("")}
          ${filterXml}
        </RetrieveRequest>
      </RetrieveRequestMsg>`;
}

// Keep values as strings: numeric parsing would turn a key like "007" into 7.
async function retrieve(config: SFMCConfig, body: string): Promise<RetrieveResponse> {
  const parsed = await soapRequest(config, "Retrieve", body, { parseValues: false });
  return parseRetrieveResponse(parsed);
}

function assertOk(resp: RetrieveResponse, what: string): void {
  if (resp.overallStatus !== "OK" && resp.overallStatus !== "MoreDataAvailable") {
    throw new Error(`${what}: ${resp.overallStatus || "no status returned"}`);
  }
}

async function listDataExtensions(config: SFMCConfig): Promise<DeRef[]> {
  const des: DeRef[] = [];
  let resp = await retrieve(config, retrieveXml("DataExtension", ["Name", "CustomerKey"]));
  for (;;) {
    assertOk(resp, "Listing Data Extensions failed");
    for (const r of resp.results) {
      des.push({ name: String(r.Name ?? ""), customerKey: String(r.CustomerKey ?? "") });
    }
    if (resp.overallStatus !== "MoreDataAvailable" || !resp.requestId) break;
    resp = await retrieve(config, retrieveXml("DataExtension", ["Name", "CustomerKey"], "", resp.requestId));
  }
  return des;
}

async function getFields(config: SFMCConfig, customerKey: string): Promise<DeField[]> {
  const filter = `<Filter xsi:type="SimpleFilterPart"><Property>DataExtension.CustomerKey</Property><SimpleOperator>equals</SimpleOperator><Value>${escapeXml(customerKey)}</Value></Filter>`;
  const resp = await retrieve(config, retrieveXml("DataExtensionField", ["Name", "FieldType"], filter));
  assertOk(resp, "Reading fields failed");
  return resp.results.map((r) => ({ name: String(r.Name ?? ""), fieldType: String(r.FieldType ?? "") }));
}

export function matchingFields(row: Record<string, string>, fieldNames: string[], searchString: string): string[] {
  // Best effort: treat LIKE wildcards as "anything" so the field list still
  // reflects what SFMC matched.
  const pattern = searchString
    .split(/[%_]/)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  const re = new RegExp(pattern, "i");
  return fieldNames.filter((f) => re.test(row[f] ?? ""));
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

type SearchOutcome =
  | { kind: "match"; de: DeRef; matchedFields: string[]; rowsReturned: number; moreRows: boolean; rows: Record<string, string>[] }
  | { kind: "none" }
  | { kind: "skipped"; de: DeRef; reason: string }
  | { kind: "error"; de: DeRef; error: string };

async function searchOne(
  config: SFMCConfig,
  de: DeRef,
  searchString: string,
  fieldTypes: string[],
  maxRows: number
): Promise<SearchOutcome> {
  try {
    const fields = await getFields(config, de.customerKey);
    const searchable = fields.filter((f) => fieldTypes.includes(f.fieldType)).map((f) => f.name);
    if (searchable.length === 0) {
      return { kind: "skipped", de, reason: `no ${fieldTypes.join("/")} fields` };
    }
    const resp = await retrieve(
      config,
      retrieveXml(`DataExtensionObject[${de.customerKey}]`, fields.map((f) => f.name), buildLikeFilterXml(searchable, searchString))
    );
    assertOk(resp, "Search failed");
    if (resp.results.length === 0) return { kind: "none" };
    const allRows = resp.results.map(rowFromResult);
    const matched = new Set<string>();
    for (const row of allRows) for (const f of matchingFields(row, searchable, searchString)) matched.add(f);
    return {
      kind: "match",
      de,
      matchedFields: [...matched],
      rowsReturned: allRows.length,
      moreRows: resp.overallStatus === "MoreDataAvailable",
      rows: allRows.slice(0, maxRows),
    };
  } catch (error: unknown) {
    return { kind: "error", de, error: error instanceof Error ? error.message : String(error) };
  }
}

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.min(max, Math.max(min, n));
}

export async function handleDeSearchTool(
  name: string,
  args: Record<string, unknown>,
  config: SFMCConfig
): Promise<unknown> {
  if (name !== "sfmc_de_search") throw new Error(`Unknown DE search tool: ${name}`);

  const searchString = String(args.searchString ?? "");
  if (searchString.trim() === "") throw new Error("searchString must not be empty");

  const fieldTypes = (args.fieldTypes as string[] | undefined) ?? DEFAULT_SEARCH_FIELD_TYPES;
  const excludePatterns = (args.excludeNamePatterns as string[] | undefined) ?? DEFAULT_EXCLUDED_NAME_PATTERNS;
  const maxDes = clamp(args.maxDataExtensions, 200, 1, 5000);
  const maxRows = clamp(args.maxRowsPerDataExtension, 10, 1, 2500);
  const concurrency = clamp(args.concurrency, 5, 1, 10);
  const explicitKeys = args.deExternalKeys as string[] | undefined;

  let candidates: DeRef[];
  const excluded: string[] = [];
  if (explicitKeys && explicitKeys.length > 0) {
    candidates = explicitKeys.map((k) => ({ name: k, customerKey: k }));
  } else {
    const nameContains = (args.nameContains as string | undefined)?.toLowerCase();
    candidates = [];
    for (const de of await listDataExtensions(config)) {
      // Names starting with "_" are SFMC system DEs (data views and the like).
      if (de.name.startsWith("_")) continue;
      if (nameContains && !de.name.toLowerCase().includes(nameContains)) continue;
      if (isExcluded(de.name, excludePatterns)) {
        excluded.push(de.name);
        continue;
      }
      candidates.push(de);
    }
  }

  const toSearch = candidates.slice(0, maxDes);
  const outcomes = await mapWithConcurrency(toSearch, concurrency, (de) =>
    searchOne(config, de, searchString, fieldTypes, maxRows)
  );

  const matches = [];
  const skipped = [];
  const errors = [];
  for (const o of outcomes) {
    if (o.kind === "match") {
      matches.push({
        name: o.de.name,
        customerKey: o.de.customerKey,
        matchedFields: o.matchedFields,
        rowsReturned: o.rowsReturned,
        moreRows: o.moreRows,
        rows: o.rows,
      });
    } else if (o.kind === "skipped") {
      skipped.push({ name: o.de.name, reason: o.reason });
    } else if (o.kind === "error") {
      errors.push({ name: o.de.name, customerKey: o.de.customerKey, error: o.error });
    }
  }

  return {
    searchString,
    dataExtensionsSearched: toSearch.length,
    dataExtensionsNotSearched: candidates.length - toSearch.length,
    ...(candidates.length > toSearch.length
      ? { note: `Stopped at maxDataExtensions=${maxDes}. Narrow with nameContains or raise maxDataExtensions to search the rest.` }
      : {}),
    matchCount: matches.length,
    matches,
    excludedByName: excluded.length,
    skipped,
    errors,
  };
}
