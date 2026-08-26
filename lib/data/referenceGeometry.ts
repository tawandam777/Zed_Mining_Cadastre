/**
 * Loads the licence *attribute* records (owner, commodity, status, type,
 * area, dates, licence number) from ref/project/cadastre-data.js.
 *
 * Only used by scripts/generate-licences.ts as the source of licence
 * attributes when regenerating geometry — the file's own SVG-space
 * geometries and hand-drawn national/province outlines are discarded
 * entirely; real boundaries come from Admin_Bounds/*.shp via
 * lib/data/adminBoundaries.ts.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

export interface RawLicence {
  id: string;
  number: string;
  owner: string;
  commodity: string;
  province: string;
  status: string;
  licenceType: string;
  areaKm2: number;
  issueDate: string;
  expiryDate: string;
  points: number[][];
}

export interface CadastreProjection {
  xmin: number;
  ymax: number;
  scale: number;
  cosFactor: number;
}

export interface CadastreData {
  projection: CadastreProjection;
  licenses: RawLicence[];
}

let cachedCadastreData: CadastreData | null = null;

export function loadCadastreData(): CadastreData {
  if (cachedCadastreData) return cachedCadastreData;
  const filePath = path.resolve(process.cwd(), "ref/project/cadastre-data.js");
  const code = fs.readFileSync(filePath, "utf-8");
  const sandbox: { window: { CADASTRE_DATA?: CadastreData } } = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "cadastre-data.js" });
  if (!sandbox.window.CADASTRE_DATA) {
    throw new Error("cadastre-data.js did not populate window.CADASTRE_DATA");
  }
  cachedCadastreData = sandbox.window.CADASTRE_DATA;
  return cachedCadastreData;
}
