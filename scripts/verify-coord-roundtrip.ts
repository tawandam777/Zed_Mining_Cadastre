/**
 * Verifies the coordinate format/parse round-trip fixed in this change: every string
 * lib/crs.ts's formatters produce must be parseable back by lib/coord-parse.ts's
 * parseCoordinateInput() to within a small tolerance, and the pre-existing bare-number
 * (no hemisphere letters) parsing behavior must stay unchanged.
 *
 * No test runner in this project — run directly: npx tsx scripts/verify-coord-roundtrip.ts
 */
import { formatDD, formatDMS, formatUTM } from "../lib/crs";
import { parseCoordinateInput } from "../lib/coord-parse";
import { distanceKm } from "../lib/geo";

const TOLERANCE_M = 2;

const POINTS: { lon: number; lat: number; zone: string }[] = [
  { lon: 27.85432, lat: -13.12345, zone: "35S" },
  { lon: 24.70624, lat: -12.92734, zone: "35S" },
  { lon: 32.1, lat: -16.5, zone: "36S" },
];

let failures = 0;

function check(label: string, lon: number, lat: number, formatted: string) {
  const parsed = parseCoordinateInput(formatted);
  if (!parsed) {
    console.error(`FAIL  ${label}: "${formatted}" -> null (unparseable)`);
    failures++;
    return;
  }
  const distM = distanceKm([lon, lat], [parsed.lon, parsed.lat]) * 1000;
  const ok = distM < TOLERANCE_M;
  console.log(
    `${ok ? "ok  " : "FAIL"}  ${label}: "${formatted}" -> lon=${parsed.lon.toFixed(6)}, lat=${parsed.lat.toFixed(6)} (${distM.toFixed(2)} m)`,
  );
  if (!ok) failures++;
}

console.log("--- round-trip: format -> parse ---");
for (const p of POINTS) {
  check(`DD   [${p.zone}]`, p.lon, p.lat, formatDD(p.lon, p.lat));
  check(`DMS  [${p.zone}]`, p.lon, p.lat, formatDMS(p.lon, p.lat));
  check(`UTM  [${p.zone}]`, p.lon, p.lat, formatUTM(p.lon, p.lat));
}

console.log("\n--- backward compatibility: bare-number parsing unchanged ---");
function checkExact(input: string, expectedLat: number, expectedLon: number) {
  const parsed = parseCoordinateInput(input);
  const ok = !!parsed && parsed.lat === expectedLat && parsed.lon === expectedLon;
  console.log(
    `${ok ? "ok  " : "FAIL"}  "${input}" -> ${parsed ? `lat=${parsed.lat}, lon=${parsed.lon}` : "null"} (expected lat=${expectedLat}, lon=${expectedLon})`,
  );
  if (!ok) failures++;
}

checkExact("-13.12345, 27.85432", -13.12345, 27.85432);
checkExact("-13.12345 27.85432", -13.12345, 27.85432);
checkExact("100, -13.1", -13.1, 100);

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
