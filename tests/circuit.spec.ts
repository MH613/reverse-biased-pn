import { test, expect } from "@playwright/test";
import {
  validateCircuit,
  type Connection,
  type TerminalId,
} from "../src/lab/circuit";
const wires = (pairs: [TerminalId, TerminalId][]): Connection[] =>
  pairs.map(([from, to], i) => ({ id: String(i), from, to }));
test("validates topology, reverse polarity and a series ammeter independently of geometry", () => {
  expect(
    validateCircuit(
      wires([
        ["supply:positive", "ammeter:in"],
        ["ammeter:out", "junction:n"],
        ["junction:p", "supply:negative"],
      ]),
    ).valid,
  ).toBe(true);
  expect(
    validateCircuit(
      wires([
        ["supply:positive", "junction:n"],
        ["junction:p", "ammeter:in"],
        ["ammeter:out", "supply:negative"],
      ]),
    ).valid,
  ).toBe(true);
  expect(
    validateCircuit(
      wires([
        ["supply:positive", "ammeter:in"],
        ["ammeter:out", "junction:p"],
        ["junction:n", "supply:negative"],
      ]),
    ).code,
  ).toBe("polarity");
  expect(
    validateCircuit(
      wires([
        ["supply:positive", "junction:n"],
        ["junction:p", "supply:negative"],
      ]),
    ).code,
  ).toBe("bypass");
  expect(
    validateCircuit(wires([["supply:positive", "supply:negative"]])).code,
  ).toBe("short");
  expect(
    validateCircuit(
      wires([
        ["supply:positive", "ammeter:in"],
        ["supply:positive", "junction:n"],
      ]),
    ).code,
  ).toBe("branch");
  expect(validateCircuit([]).code).toBe("open");
  expect(
    validateCircuit(wires([["supply:positive", "ammeter:in"]])).valid,
  ).toBe(false);
});
