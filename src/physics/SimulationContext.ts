import { createContext, useContext } from "react";
import type { Connection, CircuitResult } from "../lab/circuit";
import type { JunctionSolution } from "./model";
export interface SimulationSnapshot {
  circuit: CircuitResult;
  connections: Connection[];
  requestedVoltageV: number;
  solution: JunctionSolution;
  ammeterCurrentA: number;
  loopCurrentA: number;
  wireDirections: Record<string, 1 | -1>;
  settling: boolean;
}
export const SimulationContext = createContext<SimulationSnapshot | null>(null);
export const useSimulation = () => useContext(SimulationContext);
