import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { SFMCConfig } from "../types.js";
import { soapRequest } from "../client.js";

export const soapTools: Tool[] = [
  // Data Extensions
  {
    name: "sfmc_soap_de_retrieve",
    description: "Retrieve Data Extension records via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        deExternalKey: { type: "string", description: "Data Extension external key" },
        properties: {
          type: "array",
          items: { type: "string" },
          description: "Column names to retrieve",
        },
        filter: {
          type: "object",
          description: "Optional filter. Format: { \"property\": \"Name\", \"operator\": \"equals\", \"value\": \"foo\" }. Use an array for IN: { \"property\": \"Status\", \"operator\": \"IN\", \"value\": [\"0\",\"1\"] }",
        },
      },
      required: ["deExternalKey", "properties"],
    },
  },
  {
    name: "sfmc_soap_de_create_definition",
    description: "Create a new Data Extension definition via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Data Extension name" },
        externalKey: { type: "string", description: "External key (customer key)" },
        description: { type: "string" },
        isSendable: { type: "boolean", default: false },
        isTestable: { type: "boolean", default: false },
        sendableDataExtensionField: { type: "object", description: "Field used for sending" },
        sendableSubscriberField: { type: "object", description: "Subscriber field mapping" },
        fields: {
          type: "array",
          description: "Column definitions",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              fieldType: { type: "string", enum: ["Text", "Number", "Date", "Boolean", "Email", "Phone", "Decimal", "Locale"] },
              maxLength: { type: "number" },
              isRequired: { type: "boolean" },
              isPrimaryKey: { type: "boolean" },
              defaultValue: { type: "string" },
            },
          },
        },
      },
      required: ["name", "externalKey", "fields"],
    },
  },
  {
    name: "sfmc_soap_de_upsert_rows",
    description: "Upsert rows into a Data Extension via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        deExternalKey: { type: "string" },
        rows: {
          type: "array",
          description: "Array of row objects with column name/value pairs",
          items: { type: "object" },
        },
      },
      required: ["deExternalKey", "rows"],
    },
  },
  {
    name: "sfmc_soap_de_delete_rows",
    description: "Delete rows from a Data Extension via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        deExternalKey: { type: "string" },
        rows: {
          type: "array",
          description: "Array of row primary key objects to delete",
          items: { type: "object" },
        },
      },
      required: ["deExternalKey", "rows"],
    },
  },
  {
    name: "sfmc_soap_de_clear",
    description: "Clear all rows from a Data Extension via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        deExternalKey: { type: "string" },
      },
      required: ["deExternalKey"],
    },
  },
  {
    name: "sfmc_soap_de_list",
    description: "List all Data Extensions via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        filter: { type: "object", description: "Optional filter. Format: { \"property\": \"Name\", \"operator\": \"equals\", \"value\": \"foo\" }. Use an array for IN: { \"property\": \"Status\", \"operator\": \"IN\", \"value\": [\"0\",\"1\"] }" },
      },
    },
  },
  {
    name: "sfmc_soap_de_delete_definition",
    description: "Delete a Data Extension definition via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        deExternalKey: { type: "string" },
      },
      required: ["deExternalKey"],
    },
  },
  // Automations
  {
    name: "sfmc_soap_automation_retrieve",
    description: "Retrieve automation details via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        properties: {
          type: "array",
          items: { type: "string" },
          description: "Properties to retrieve (e.g. ['Name', 'Status', 'CustomerKey'])",
        },
        filter: { type: "object", description: "Optional filter. Format: { \"property\": \"Name\", \"operator\": \"equals\", \"value\": \"foo\" }. Use an array for IN: { \"property\": \"Status\", \"operator\": \"IN\", \"value\": [\"0\",\"1\"] }" },
      },
      required: ["properties"],
    },
  },
  {
    name: "sfmc_soap_automation_start",
    description: "Start an automation via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        automationKey: { type: "string", description: "Automation external key" },
      },
      required: ["automationKey"],
    },
  },
  {
    name: "sfmc_soap_automation_stop",
    description: "Stop a running automation via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        automationKey: { type: "string" },
      },
      required: ["automationKey"],
    },
  },
  {
    name: "sfmc_soap_automation_pause",
    description: "Pause a scheduled automation via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        automationKey: { type: "string" },
      },
      required: ["automationKey"],
    },
  },
  {
    name: "sfmc_soap_automation_run_once",
    description: "Run an automation once immediately via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        automationKey: { type: "string" },
      },
      required: ["automationKey"],
    },
  },
  // Subscribers
  {
    name: "sfmc_soap_subscriber_retrieve",
    description: "Retrieve subscriber information via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        properties: {
          type: "array",
          items: { type: "string" },
          description: "Properties to retrieve (e.g. ['EmailAddress', 'SubscriberKey', 'Status'])",
        },
        filter: { type: "object", description: "Filter (e.g. filter by email or key)" },
      },
      required: ["properties"],
    },
  },
  {
    name: "sfmc_soap_subscriber_upsert",
    description: "Create or update a subscriber via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        subscriberKey: { type: "string" },
        emailAddress: { type: "string" },
        status: { type: "string", enum: ["Active", "Bounced", "Held", "Unsubscribed", "Deleted"] },
        lists: {
          type: "array",
          description: "List memberships",
          items: { type: "object" },
        },
        attributes: {
          type: "array",
          description: "Subscriber attributes",
          items: { type: "object" },
        },
      },
      required: ["subscriberKey", "emailAddress"],
    },
  },
  // Users
  {
    name: "sfmc_soap_user_retrieve",
    description: "Retrieve user account information via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        properties: {
          type: "array",
          items: { type: "string" },
          description: "Properties to retrieve (e.g. ['Name', 'Email', 'UserID'])",
        },
        filter: { type: "object", description: "Optional filter. Format: { \"property\": \"Name\", \"operator\": \"equals\", \"value\": \"foo\" }. Use an array for IN: { \"property\": \"Status\", \"operator\": \"IN\", \"value\": [\"0\",\"1\"] }" },
      },
      required: ["properties"],
    },
  },
  // Admin
  {
    name: "sfmc_soap_account_retrieve",
    description: "Retrieve account/business unit information via SOAP API",
    inputSchema: {
      type: "object",
      properties: {
        properties: {
          type: "array",
          items: { type: "string" },
          description: "Properties to retrieve (e.g. ['ID', 'Name', 'ParentID'])",
        },
        filter: { type: "object", description: "Optional filter. Format: { \"property\": \"Name\", \"operator\": \"equals\", \"value\": \"foo\" }. Use an array for IN: { \"property\": \"Status\", \"operator\": \"IN\", \"value\": [\"0\",\"1\"] }" },
      },
      required: ["properties"],
    },
  },
];

function buildSimpleFilterXml(property: string, operator: string, value: unknown): string {
  const valueXml = Array.isArray(value)
    ? (value as unknown[]).map((v) => `<Value>${v}</Value>`).join("\n      ")
    : `<Value>${value}</Value>`;
  return `<Filter xsi:type="SimpleFilterPart">
      <Property>${property}</Property>
      <SimpleOperator>${operator}</SimpleOperator>
      ${valueXml}
    </Filter>`;
}

function buildFilter(filter: Record<string, unknown> | undefined): string {
  if (!filter) return "";

  // Wrapped format: { simpleFilterPart: { property, operator, value } }
  if (filter.simpleFilterPart) {
    const f = filter.simpleFilterPart as Record<string, unknown>;
    return buildSimpleFilterXml(
      f.property as string,
      (f.operator as string) || "equals",
      f.value
    );
  }

  // Direct format (camelCase or PascalCase): { property/Property, operator/SimpleOperator, value/Value }
  const property = (filter.property || filter.Property) as string | undefined;
  const operator = ((filter.operator || filter.SimpleOperator || "equals") as string);
  const value = filter.value ?? filter.Value;

  if (property && value !== undefined) {
    return buildSimpleFilterXml(property, operator, value);
  }

  return "";
}

function buildProperties(props: string[]): string {
  return props.map((p) => `<Properties>${p}</Properties>`).join("\n");
}

export async function handleSoapTool(
  name: string,
  args: Record<string, unknown>,
  config: SFMCConfig
): Promise<unknown> {
  const filter = args.filter as Record<string, unknown> | undefined;

  switch (name) {
    case "sfmc_soap_de_retrieve": {
      const props = args.properties as string[];
      const body = `<RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <RetrieveRequest>
          <ObjectType>DataExtensionObject[${args.deExternalKey}]</ObjectType>
          ${buildProperties(props)}
          ${buildFilter(filter)}
        </RetrieveRequest>
      </RetrieveRequestMsg>`;
      return soapRequest(config, "Retrieve", body);
    }
    case "sfmc_soap_de_create_definition": {
      const fields = args.fields as Array<Record<string, unknown>>;
      const fieldXml = fields
        .map(
          (f) => `<Fields>
            <Name>${f.name}</Name>
            <FieldType>${f.fieldType || "Text"}</FieldType>
            ${f.maxLength ? `<MaxLength>${f.maxLength}</MaxLength>` : ""}
            ${f.isRequired ? `<IsRequired>${f.isRequired}</IsRequired>` : ""}
            ${f.isPrimaryKey ? `<IsPrimaryKey>${f.isPrimaryKey}</IsPrimaryKey>` : ""}
            ${f.defaultValue ? `<DefaultValue>${f.defaultValue}</DefaultValue>` : ""}
          </Fields>`
        )
        .join("\n");

      const body = `<CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <Objects xsi:type="DataExtension">
          <CustomerKey>${args.externalKey}</CustomerKey>
          <Name>${args.name}</Name>
          ${args.description ? `<Description>${args.description}</Description>` : ""}
          <IsSendable>${args.isSendable || false}</IsSendable>
          <IsTestable>${args.isTestable || false}</IsTestable>
          ${fieldXml}
        </Objects>
      </CreateRequest>`;
      return soapRequest(config, "Create", body);
    }
    case "sfmc_soap_de_upsert_rows": {
      const rows = args.rows as Array<Record<string, unknown>>;
      const rowXml = rows
        .map((row) => {
          const props = Object.entries(row)
            .map(([k, v]) => `<Properties><Name>${k}</Name><Value>${v}</Value></Properties>`)
            .join("\n");
          return `<Objects xsi:type="DataExtensionObject">
            <CustomerKey>${args.deExternalKey}</CustomerKey>
            ${props}
          </Objects>`;
        })
        .join("\n");

      const body = `<UpsertRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
        ${rowXml}
      </UpsertRequest>`;
      return soapRequest(config, "Upsert", body);
    }
    case "sfmc_soap_de_delete_rows": {
      const rows = args.rows as Array<Record<string, unknown>>;
      const rowXml = rows
        .map((row) => {
          const props = Object.entries(row)
            .map(([k, v]) => `<Keys><Name>${k}</Name><Value>${v}</Value></Keys>`)
            .join("\n");
          return `<Objects xsi:type="DataExtensionObject">
            <CustomerKey>${args.deExternalKey}</CustomerKey>
            ${props}
          </Objects>`;
        })
        .join("\n");
      const body = `<DeleteRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
        ${rowXml}
      </DeleteRequest>`;
      return soapRequest(config, "Delete", body);
    }
    case "sfmc_soap_de_clear": {
      const body = `<ExecuteRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <Requests>
          <Name>ClearDataExtension</Name>
          <Parameters>
            <Parameter>
              <Name>CustomerKey</Name>
              <Value>${args.deExternalKey}</Value>
            </Parameter>
          </Parameters>
        </Requests>
      </ExecuteRequestMsg>`;
      return soapRequest(config, "Execute", body);
    }
    case "sfmc_soap_de_list": {
      const body = `<RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <RetrieveRequest>
          <ObjectType>DataExtension</ObjectType>
          <Properties>CustomerKey</Properties>
          <Properties>Name</Properties>
          <Properties>Description</Properties>
          <Properties>IsSendable</Properties>
          ${buildFilter(filter)}
        </RetrieveRequest>
      </RetrieveRequestMsg>`;
      return soapRequest(config, "Retrieve", body);
    }
    case "sfmc_soap_de_delete_definition": {
      const body = `<DeleteRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <Objects xsi:type="DataExtension">
          <CustomerKey>${args.deExternalKey}</CustomerKey>
        </Objects>
      </DeleteRequest>`;
      return soapRequest(config, "Delete", body);
    }
    case "sfmc_soap_automation_retrieve": {
      const props = args.properties as string[];
      const body = `<RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <RetrieveRequest>
          <ObjectType>Automation</ObjectType>
          ${buildProperties(props)}
          ${buildFilter(filter)}
        </RetrieveRequest>
      </RetrieveRequestMsg>`;
      return soapRequest(config, "Retrieve", body);
    }
    case "sfmc_soap_automation_start": {
      const body = `<PerformRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <Action>start</Action>
        <Definitions>
          <Definition xsi:type="Automation">
            <CustomerKey>${args.automationKey}</CustomerKey>
          </Definition>
        </Definitions>
      </PerformRequestMsg>`;
      return soapRequest(config, "Perform", body);
    }
    case "sfmc_soap_automation_stop": {
      const body = `<PerformRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <Action>stop</Action>
        <Definitions>
          <Definition xsi:type="Automation">
            <CustomerKey>${args.automationKey}</CustomerKey>
          </Definition>
        </Definitions>
      </PerformRequestMsg>`;
      return soapRequest(config, "Perform", body);
    }
    case "sfmc_soap_automation_pause": {
      const body = `<PerformRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <Action>pause</Action>
        <Definitions>
          <Definition xsi:type="Automation">
            <CustomerKey>${args.automationKey}</CustomerKey>
          </Definition>
        </Definitions>
      </PerformRequestMsg>`;
      return soapRequest(config, "Perform", body);
    }
    case "sfmc_soap_automation_run_once": {
      const body = `<PerformRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <Action>runOnce</Action>
        <Definitions>
          <Definition xsi:type="Automation">
            <CustomerKey>${args.automationKey}</CustomerKey>
          </Definition>
        </Definitions>
      </PerformRequestMsg>`;
      return soapRequest(config, "Perform", body);
    }
    case "sfmc_soap_subscriber_retrieve": {
      const props = args.properties as string[];
      const body = `<RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <RetrieveRequest>
          <ObjectType>Subscriber</ObjectType>
          ${buildProperties(props)}
          ${buildFilter(filter)}
        </RetrieveRequest>
      </RetrieveRequestMsg>`;
      return soapRequest(config, "Retrieve", body);
    }
    case "sfmc_soap_subscriber_upsert": {
      const lists = (args.lists as Array<Record<string, unknown>>) || [];
      const attributes = (args.attributes as Array<Record<string, unknown>>) || [];
      const listXml = lists
        .map(
          (l) => `<Lists>
            <ID>${l.id}</ID>
            <Status>${l.status || "Active"}</Status>
          </Lists>`
        )
        .join("\n");
      const attrXml = attributes
        .map(
          (a) => `<Attributes>
            <Name>${a.name}</Name>
            <Value>${a.value}</Value>
          </Attributes>`
        )
        .join("\n");
      const body = `<UpsertRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <Objects xsi:type="Subscriber">
          <SubscriberKey>${args.subscriberKey}</SubscriberKey>
          <EmailAddress>${args.emailAddress}</EmailAddress>
          ${args.status ? `<Status>${args.status}</Status>` : ""}
          ${listXml}
          ${attrXml}
        </Objects>
      </UpsertRequest>`;
      return soapRequest(config, "Upsert", body);
    }
    case "sfmc_soap_user_retrieve": {
      const props = args.properties as string[];
      const body = `<RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <RetrieveRequest>
          <ObjectType>AccountUser</ObjectType>
          ${buildProperties(props)}
          ${buildFilter(filter)}
        </RetrieveRequest>
      </RetrieveRequestMsg>`;
      return soapRequest(config, "Retrieve", body);
    }
    case "sfmc_soap_account_retrieve": {
      const props = args.properties as string[];
      const body = `<RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <RetrieveRequest>
          <ObjectType>Account</ObjectType>
          ${buildProperties(props)}
          ${buildFilter(filter)}
        </RetrieveRequest>
      </RetrieveRequestMsg>`;
      return soapRequest(config, "Retrieve", body);
    }
    default:
      throw new Error(`Unknown SOAP tool: ${name}`);
  }
}
