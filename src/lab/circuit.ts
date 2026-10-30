export type InstrumentId = "supply" | "junction" | "ammeter";
export type TerminalId =
  | "supply:positive"
  | "supply:negative"
  | "junction:p"
  | "junction:n"
  | "ammeter:in"
  | "ammeter:out";
export interface Connection {
  id: string;
  from: TerminalId;
  to: TerminalId;
  lane?: number;
}
export const terminalNames: Record<TerminalId, string> = {
  "supply:positive": "Supply +",
  "supply:negative": "Supply −",
  "junction:p": "Junction P",
  "junction:n": "Junction N",
  "ammeter:in": "Ammeter IN",
  "ammeter:out": "Ammeter OUT",
};
export const terminals = Object.keys(terminalNames) as TerminalId[];
export const owner = (terminal: TerminalId) =>
  terminal.split(":")[0] as InstrumentId;
export const sameConnection = (
  wire: Pick<Connection, "from" | "to">,
  a: TerminalId,
  b: TerminalId,
) => (wire.from === a && wire.to === b) || (wire.from === b && wire.to === a);
const internal: Partial<Record<TerminalId, TerminalId>> = {
  "junction:p": "junction:n",
  "junction:n": "junction:p",
  "ammeter:in": "ammeter:out",
  "ammeter:out": "ammeter:in",
};
export interface CircuitResult {
  valid: boolean;
  code: "open" | "branch" | "short" | "bypass" | "polarity" | "ready";
  message: string;
}
// Validation uses terminal identities only. Screen positions never enter the graph.
export function validateCircuit(wires: Connection[]): CircuitResult {
  const adjacency = Object.fromEntries(
    terminals.map((t) => [t, [] as TerminalId[]]),
  ) as Record<TerminalId, TerminalId[]>;
  for (const w of wires) {
    adjacency[w.from].push(w.to);
    adjacency[w.to].push(w.from);
  }
  if (terminals.some((t) => adjacency[t].length > 1))
    return {
      valid: false,
      code: "branch",
      message:
        "Remove the branch. Each terminal needs one wire for a series circuit.",
    };
  if (
    wires.some((w) => sameConnection(w, "supply:positive", "supply:negative"))
  )
    return {
      valid: false,
      code: "short",
      message:
        "The supply is shorted. Route its leads through the junction and ammeter.",
    };
  let cursor: TerminalId = "supply:positive",
    entry: TerminalId | undefined;
  const seen = new Set<TerminalId>();
  const devices = new Set<InstrumentId>();
  while (!seen.has(cursor)) {
    seen.add(cursor);
    const next: TerminalId | undefined = adjacency[cursor][0];
    if (!next) break;
    if (next === "supply:negative") {
      if (!devices.has("junction"))
        return {
          valid: false,
          code: "short",
          message:
            "The supply is shorted. Include the semiconductor in the circuit.",
        };
      if (!devices.has("ammeter"))
        return {
          valid: false,
          code: "bypass",
          message:
            "The ammeter is bypassed. Insert it in series with the junction.",
        };
      if (entry !== "junction:n")
        return {
          valid: false,
          code: "polarity",
          message:
            "The junction would be forward biased. Connect N toward supply + and P toward supply −.",
        };
      if (wires.length === 3)
        return {
          valid: true,
          code: "ready",
          message: "Reverse bias connected. The ammeter is in series.",
        };
      break;
    }
    const device = owner(next);
    devices.add(device);
    if (device === "junction") entry = next;
    const exit: TerminalId | undefined = internal[next];
    if (!exit) break;
    cursor = exit;
  }
  const missing = terminals.filter((t) => adjacency[t].length === 0);
  return {
    valid: false,
    code: "open",
    message:
      wires.length === 0
        ? "Connect the supply, ammeter, and junction in one series loop."
        : missing.length
          ? `Still open: ${missing.map((t) => terminalNames[t]).join(", ")}.`
          : "The connections do not form one complete series loop.",
  };
}
export const suggestedConnections: Pick<Connection, "from" | "to">[] = [
  { from: "supply:positive", to: "ammeter:in" },
  { from: "ammeter:out", to: "junction:n" },
  { from: "junction:p", to: "supply:negative" },
];

/** Conventional current follows supply + to − through the valid series loop. */
export function traceCurrent(connections: Connection[]): {
  directions: Record<string, 1 | -1>;
  meterSign: 1 | -1;
} {
  const directions: Record<string, 1 | -1> = {};
  let meterSign: 1 | -1 = 1;
  let cursor: TerminalId = "supply:positive";
  const seen = new Set<TerminalId>();
  while (!seen.has(cursor)) {
    seen.add(cursor);
    const w = connections.find((w) => w.from === cursor || w.to === cursor);
    if (!w) break;
    directions[w.id] = w.from === cursor ? 1 : -1;
    const next: TerminalId = w.from === cursor ? w.to : w.from;
    if (next === "supply:negative") break;
    if (owner(next) === "ammeter") meterSign = next === "ammeter:in" ? 1 : -1;
    const exit: TerminalId | undefined = internal[next];
    if (!exit) break;
    cursor = exit;
  }
  return { directions, meterSign };
}
