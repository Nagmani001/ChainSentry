import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";
import { env } from "./env.js";
import { runReadOnlyQuery } from "./rawQuery.js";
import type { Panel, VizType } from "./dashboards.js";

const SCHEMA_DOC = `
ClickHouse database "chainsentry". Two tables, both queried with FINAL for dedup.

TABLE events:
  chain_id UInt32, contract_address String (lowercase hex),
  block_number UInt64, block_timestamp DateTime,
  tx_hash String, tx_index UInt32, log_index UInt32,
  event_name LowCardinality(String), event_signature String,
  topic0 String, args String (JSON object -> use JSONExtractString(args,'field') / JSONExtractInt / JSONExtractRaw),
  data String, removed UInt8, ingested_at DateTime

TABLE transactions:
  chain_id UInt32, contract_address String, block_number UInt64, block_timestamp DateTime,
  tx_hash String, tx_index UInt32, from_address String, to_address String,
  value String (wei; use toUInt256OrZero(value), divide by 1e18 for ETH),
  gas_used UInt64, gas_price UInt64, effective_gas_price UInt64,
  status UInt8 (1 = success, 0 = revert), method_selector String

TABLE traces (internal call frames from debug_traceTransaction):
  chain_id UInt32, contract_address String, block_number UInt64, block_timestamp DateTime,
  tx_hash String, tx_index UInt32,
  trace_address String (dotted path within the call tree, e.g. "0.1.2"; root is ""),
  depth UInt16 (0 = top-level call), call_type LowCardinality(String)
    (CALL, DELEGATECALL, STATICCALL, CREATE, CREATE2, SELFDESTRUCT),
  from_address String, to_address String, value String (wei),
  gas UInt64, gas_used UInt64, input String, output String,
  method_selector String (first 4 bytes of input), error String (empty when the call succeeded)

RULES:
- ALWAYS filter by: contract_address = {addr:String} AND chain_id = {chain:UInt32}
  (these params are supplied automatically; never inline literal addresses).
- ALWAYS use the FINAL modifier on the table.
- For time series, bucket with toStartOfMinute(block_timestamp) AS t and GROUP BY t ORDER BY t.
- Only SELECT / WITH. Never write/DDL.

PANEL viz types and the shape their SQL must return:
- "stat": one row, one numeric column (alias it "value").
- "line" / "area": first column = time/x-axis, remaining numeric columns = series.
- "bar": first column = category label, remaining numeric columns = series.
- "pie": exactly two columns: (label, value).
- "table": any columns.
- "logs": a Grafana-style log stream from the events table. Select one row per log,
  newest first, including block_timestamp, event_name and any detail columns
  (event_signature, block_number, log_index, tx_hash, topic0, args, data). Order by
  block_number DESC, log_index DESC and LIMIT it.
- "trace": a call-tree view from the traces table. Select one row per call frame
  including tx_hash, trace_address, depth, call_type, from_address, to_address, value,
  gas_used, method_selector, error. Order by block_number DESC, tx_index DESC,
  trace_address ASC so frames of each transaction stay in call order, then LIMIT.
`;

const runQueryDecl: FunctionDeclaration = {
  name: "run_query",
  description:
    "Run a read-only ClickHouse SELECT against the chainsentry DB and get rows back. Use this to inspect data and answer questions.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      sql: {
        type: Type.STRING,
        description:
          "A single SELECT/WITH statement. Must filter by {addr:String} and {chain:UInt32} and use FINAL.",
      },
    },
    required: ["sql"],
  },
};

const createPanelDecl: FunctionDeclaration = {
  name: "create_panel",
  description:
    "Create a dashboard panel (chart) from a ClickHouse query. Call this when the user wants to build/add a pane or chart.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      viz: {
        type: Type.STRING,
        enum: ["line", "bar", "area", "stat", "table", "pie", "logs", "trace"],
      },
      sql: {
        type: Type.STRING,
        description:
          "The query backing this panel, matching the required shape for the chosen viz.",
      },
      unit: {
        type: Type.STRING,
        description: "Optional unit suffix for stat panels, e.g. %, ETH.",
      },
    },
    required: ["title", "viz", "sql"],
  },
};

export interface AgentContext {
  prompt: string;
  contractAddress: string;
  chainId: number;
  contractName?: string;
  section?: "metrics" | "logs" | "traces";
}

export interface AgentResult {
  answer: string;
  panel: Panel | null;
  steps: { sql: string; rowCount: number }[];
}

export async function runAgent(ctx: AgentContext): Promise<AgentResult> {
  if (!env.geminiApiKey) {
    throw new Error(
      "Pane builder needs a Gemini API key. Set GEMINI_API_KEY in .env.",
    );
  }
  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  const params = { addr: ctx.contractAddress.toLowerCase(), chain: ctx.chainId };

  const sectionHint =
    ctx.section === "logs"
      ? `You are working in the LOGS section. Focus on the events table (event logs: topics, args, data). Prefer the "logs" viz for streams of individual log records, and "bar"/"area" for aggregates over events.`
      : ctx.section === "traces"
        ? `You are working in the TRACES section. Focus on the traces table (internal call frames). Prefer the "trace" viz to show call trees, and "pie"/"bar"/"area" for aggregates over call frames (by call_type, callee, gas).`
        : `You are working in the METRICS section. Focus on aggregate metrics over the transactions and events tables.`;

  const systemInstruction = `You are ChainSentry's observability copilot. You help a developer observe their smart contract ${
    ctx.contractName ? `"${ctx.contractName}" ` : ""
  }(address ${ctx.contractAddress}, chain ${ctx.chainId}) using ClickHouse.
${sectionHint}
${SCHEMA_DOC}
When the user asks a question, use run_query then answer concisely in plain English with the numbers.
When the user wants a chart/pane/panel, call create_panel with well-formed SQL and the best viz.
Keep answers short.`;

  const contents: {
    role: string;
    parts: Record<string, unknown>[];
  }[] = [{ role: "user", parts: [{ text: ctx.prompt }] }];

  const steps: { sql: string; rowCount: number }[] = [];
  let panel: Panel | null = null;
  let answer = "";

  for (let turn = 0; turn < 6; turn++) {
    const res = await ai.models.generateContent({
      model: env.geminiModel,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [runQueryDecl, createPanelDecl] }],
        temperature: 0.2,
      },
    });

    const calls = res.functionCalls ?? [];
    if (calls.length === 0) {
      answer = res.text ?? answer;
      break;
    }

    contents.push({
      role: "model",
      parts: calls.map((c) => ({ functionCall: c })),
    });

    const responseParts: Record<string, unknown>[] = [];
    for (const call of calls) {
      const args = (call.args ?? {}) as Record<string, unknown>;
      if (call.name === "run_query") {
        try {
          const r = await runReadOnlyQuery(String(args.sql), params);
          steps.push({ sql: String(args.sql), rowCount: r.rowCount });
          responseParts.push({
            functionResponse: {
              name: "run_query",
              response: {
                columns: r.columns,
                rows: r.rows.slice(0, 50),
                rowCount: r.rowCount,
              },
            },
          });
        } catch (err) {
          responseParts.push({
            functionResponse: {
              name: "run_query",
              response: { error: (err as Error).message },
            },
          });
        }
      } else if (call.name === "create_panel") {
        const sql = String(args.sql);
        try {
          await runReadOnlyQuery(sql, params);
          panel = {
            id: `ai-${Date.now()}`,
            title: String(args.title ?? "Untitled"),
            viz: (args.viz as VizType) ?? "table",
            sql,
            unit: args.unit ? String(args.unit) : undefined,
            gridPos: { x: 0, y: 0, w: 6, h: 7 },
          };
          responseParts.push({
            functionResponse: {
              name: "create_panel",
              response: { ok: true, title: panel.title, viz: panel.viz },
            },
          });
        } catch (err) {
          responseParts.push({
            functionResponse: {
              name: "create_panel",
              response: { ok: false, error: (err as Error).message },
            },
          });
        }
      }
    }
    contents.push({ role: "user", parts: responseParts });
  }

  if (!answer) {
    answer = panel
      ? `Added panel "${panel.title}".`
      : "I couldn't produce a result. Try rephrasing.";
  }
  return { answer, panel, steps };
}
