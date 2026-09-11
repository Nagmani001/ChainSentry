import type { EventInfo } from "./abi.js";

export interface PromptPlan {
  selectedEvents: EventInfo[];
  includeTransactions: boolean;
  notes: string[];
}

export function parsePrompt(prompt: string, allEvents: EventInfo[]): PromptPlan {
  const text = (prompt ?? "").toLowerCase();
  const notes: string[] = [];

  const mentioned = allEvents.filter((e) =>
    new RegExp(`\\b${e.name.toLowerCase()}\\b`).test(text),
  );

  let selectedEvents: EventInfo[];
  if (mentioned.length > 0 && !/\ball events\b|\bevery event\b/.test(text)) {
    selectedEvents = mentioned;
    notes.push(`Indexing ${mentioned.length} event(s) named in prompt: ${mentioned.map((e) => e.name).join(", ")}.`);
  } else {
    selectedEvents = allEvents;
    notes.push(`No specific events named; indexing all ${allEvents.length} event(s) from the ABI.`);
  }

  let includeTransactions = true;
  if (/\b(events only|logs only|no metrics|no transactions)\b/.test(text)) {
    includeTransactions = false;
    notes.push("Transaction-level metrics disabled by prompt.");
  } else {
    notes.push("Collecting transaction-level metrics (gas, status, value, callers).");
  }

  return { selectedEvents, includeTransactions, notes };
}
