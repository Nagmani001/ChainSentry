import type { AbiParameter } from "viem";
import type { EventInfo } from "./abi.js";

type EventParameter = AbiParameter & { indexed?: boolean };

export interface GeneratedConfig {
  subgraphYaml: string;
  schemaGraphql: string;
  mappingsTs: string;
  entityNames: string[];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function solidityToGraphQL(type: string): string {
  if (type.endsWith("[]")) {
    return `[${solidityToGraphQL(type.slice(0, -2))}!]`;
  }
  if (type === "address") return "Bytes";
  if (type === "bool") return "Boolean";
  if (type === "string") return "String";
  if (type === "bytes" || /^bytes\d+$/.test(type)) return "Bytes";
  const intMatch = /^u?int(\d*)$/.exec(type);
  if (intMatch) {
    const bits = intMatch[1] ? Number(intMatch[1]) : 256;
    return bits < 32 ? "Int" : "BigInt";
  }
  if (type.startsWith("tuple")) return "String";
  return "String";
}

function solidityToAscType(type: string): string {
  if (type.endsWith("[]"))
    return `Array<${solidityToAscType(type.slice(0, -2))}>`;
  if (type === "address") return "Bytes";
  if (type === "bool") return "boolean";
  if (type === "string") return "string";
  if (type === "bytes" || /^bytes\d+$/.test(type)) return "Bytes";
  if (/^u?int(\d*)$/.test(type)) return "BigInt";
  return "string";
}

function fieldName(input: EventParameter, index: number): string {
  return input.name && input.name.length > 0 ? input.name : `param${index}`;
}

function paramToString(type: string, value: string): string {
  if (type === "address" || type === "bytes" || /^bytes\d+$/.test(type)) {
    return `${value}.toHexString()`;
  }
  if (type.endsWith("[]") || type.startsWith("tuple")) return `""`;
  return `${value}.toString()`;
}

function uniqueEntityName(base: string, used: Set<string>): string {
  let name = capitalize(base);
  let n = 1;
  while (used.has(name)) name = `${capitalize(base)}${n++}`;
  used.add(name);
  return name;
}

export function generateConfig(params: {
  contractName: string;
  address: string;
  network: string;
  startBlock: number;
  selectedEvents: EventInfo[];
}): GeneratedConfig {
  const { contractName, address, network, startBlock, selectedEvents } = params;
  const usedEntities = new Set<string>(["ChainSentryEvent"]);

  const perEvent = selectedEvents.map((ev) => {
    const inputs = ev.item.inputs as readonly EventParameter[];
    const manifestSig = `${ev.name}(${inputs
      .map((i) => `${i.indexed ? "indexed " : ""}${i.type}`)
      .join(",")})`;
    const entity = uniqueEntityName(ev.name, usedEntities);
    const handler = `handle${entity}`;
    const fields = inputs.map((input, i) => ({
      name: fieldName(input, i),
      gqlType: solidityToGraphQL(input.type),
      ascType: solidityToAscType(input.type),
      solidityType: input.type,
    }));
    return { ev, entity, handler, manifestSig, fields };
  });

  const entityNames = perEvent.map((e) => e.entity);

  const eventHandlers = perEvent
    .map(
      (e) =>
        `        - event: ${e.manifestSig}\n          handler: ${e.handler}`,
    )
    .join("\n");

  const subgraphYaml = `specVersion: 1.0.0
description: ChainSentry auto-generated subgraph for ${contractName}
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum/contract
    name: ${contractName}
    network: ${network}
    source:
      address: "${address}"
      abi: ${contractName}
      startBlock: ${startBlock}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.9
      language: wasm/assemblyscript
      entities:
${[...entityNames, "ChainSentryEvent"].map((n) => `        - ${n}`).join("\n")}
      abis:
        - name: ${contractName}
          file: ./abis/${contractName}.json
      eventHandlers:
${eventHandlers}
      file: ./src/mapping.ts
`;

  const schemaGraphql = perEvent
    .map((e) => {
      const fieldLines = e.fields
        .map((f) => `  ${f.name}: ${f.gqlType}!`)
        .join("\n");
      return `type ${e.entity} @entity(immutable: true) {
  id: Bytes!
${fieldLines}
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}`;
    })
    .join("\n\n");

  const imports = `import { ${perEvent
    .map((e) => `${e.ev.name} as ${e.entity}Event`)
    .join(", ")} } from "../generated/${contractName}/${contractName}"
import { ${[...entityNames, "ChainSentryEvent"].join(", ")} } from "../generated/schema"`;

  const handlers = perEvent
    .map((e) => {
      const assigns = e.fields
        .map((f) => `  entity.${f.name} = event.params.${f.name}`)
        .join("\n");
      const argPairs = e.fields
        .map(
          (f) =>
            `jsonPair("${f.name}", ${paramToString(f.solidityType, `event.params.${f.name}`)})`,
        )
        .join(` + "," + `);
      const args = argPairs.length > 0 ? `"{" + ${argPairs} + "}"` : `"{}"`;
      return `export function ${e.handler}(event: ${e.entity}Event): void {
  let entity = new ${e.entity}(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
${assigns}
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  let normalized = new ChainSentryEvent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  normalized.contractAddress = event.address
  normalized.blockNumber = event.block.number
  normalized.blockTimestamp = event.block.timestamp
  normalized.transactionHash = event.transaction.hash
  normalized.transactionIndex = event.transaction.index
  normalized.logIndex = event.logIndex
  normalized.eventName = "${e.ev.name}"
  normalized.eventSignature = "${e.ev.signature}"
  normalized.topic0 = "${e.ev.topic0}"
  normalized.args = ${args}
  normalized.from = event.transaction.from
  normalized.to = event.transaction.to
  normalized.value = event.transaction.value
  normalized.gasPrice = event.transaction.gasPrice
  normalized.gasLimit = event.transaction.gasLimit
  normalized.input = event.transaction.input
  normalized.save()
}`;
    })
    .join("\n\n");

  const mappingsTs = `${imports}

function jsonPair(name: string, value: string): string {
  return '"' + name + '":"' + value + '"'
}

${handlers}
`;

  const normalizedSchema = `type ChainSentryEvent @entity(immutable: true) {
  id: Bytes!
  contractAddress: Bytes!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
  transactionIndex: BigInt!
  logIndex: BigInt!
  eventName: String!
  eventSignature: String!
  topic0: String!
  args: String!
  from: Bytes!
  to: Bytes
  value: BigInt!
  gasPrice: BigInt!
  gasLimit: BigInt!
  input: Bytes!
}`;

  return {
    subgraphYaml,
    schemaGraphql: `${schemaGraphql}\n\n${normalizedSchema}`,
    mappingsTs,
    entityNames,
  };
}
