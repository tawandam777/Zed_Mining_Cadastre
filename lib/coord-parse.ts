import { utmToLonLat, type UtmCoordinate } from "./crs";

export interface ParsedCoordinate {
  lon: number;
  lat: number;
  format: "dd" | "dms" | "utm";
}

function tryParseUtm(input: string): ParsedCoordinate | null {
  const m = input.trim().match(/^(\d{1,2})\s*([NnSs])\s+([\d.]+)\s+([\d.]+)$/);
  if (!m) return null;
  const zone = Number(m[1]);
  const hemisphere = m[2].toUpperCase() as "N" | "S";
  const easting = Number(m[3]);
  const northing = Number(m[4]);
  if (zone < 1 || zone > 60) return null;
  const utm: UtmCoordinate = { zone, hemisphere, easting, northing };
  const [lon, lat] = utmToLonLat(utm);
  return { lon, lat, format: "utm" };
}

function dmsToDecimal(deg: number, min: number, sec: number, sign: 1 | -1): number {
  return sign * (deg + min / 60 + sec / 3600);
}

function tryParseDms(input: string): ParsedCoordinate | null {
  const token = /([NSEWnsew])?\s*(\d{1,3})[°:\s]+(\d{1,2})['\s]+([\d.]+)["\s]*([NSEWnsew])?/g;
  const matches = [...input.matchAll(token)];
  if (matches.length < 2) return null;

  let lat: number | null = null;
  let lon: number | null = null;

  for (const m of matches) {
    const letter = (m[1] ?? m[5] ?? "").toUpperCase();
    const deg = Number(m[2]);
    const min = Number(m[3]);
    const sec = Number(m[4]);
    if (letter === "N" || letter === "S") {
      lat = dmsToDecimal(deg, min, sec, letter === "S" ? -1 : 1);
    } else if (letter === "E" || letter === "W") {
      lon = dmsToDecimal(deg, min, sec, letter === "W" ? -1 : 1);
    }
  }

  if (lat === null || lon === null) return null;
  return { lon, lat, format: "dms" };
}

function tryParseDecimal(input: string): ParsedCoordinate | null {
  const parts = input
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;

  let [a, b] = parts;
  // Convention: "lat, lon" — but tolerate the reverse if the first value can't be a latitude.
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
    [a, b] = [b, a];
  }
  const lat = a;
  const lon = b;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lon, lat, format: "dd" };
}

/** Parse a free-form coordinate string in decimal degrees, DMS, or UTM. Returns null if unparseable. */
export function parseCoordinateInput(input: string): ParsedCoordinate | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  return tryParseUtm(trimmed) ?? tryParseDms(trimmed) ?? tryParseDecimal(trimmed);
}
