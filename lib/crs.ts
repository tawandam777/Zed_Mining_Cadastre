import proj4 from "proj4";

export interface UtmCoordinate {
  zone: number;
  hemisphere: "N" | "S";
  easting: number;
  northing: number;
}

function utmZoneFromLon(lon: number): number {
  return Math.floor((lon + 180) / 6) + 1;
}

function utmDef(zone: number, hemisphere: "N" | "S"): string {
  return `+proj=utm +zone=${zone} ${hemisphere === "S" ? "+south " : ""}+datum=WGS84 +units=m +no_defs`;
}

/** Convert WGS84 lon/lat to UTM, auto-selecting the zone from the point's longitude. */
export function lonLatToUtm(lon: number, lat: number): UtmCoordinate {
  const zone = utmZoneFromLon(lon);
  const hemisphere: "N" | "S" = lat >= 0 ? "N" : "S";
  const [easting, northing] = proj4(utmDef(zone, hemisphere)).forward([lon, lat]);
  return { zone, hemisphere, easting, northing };
}

/** Convert a UTM coordinate back to WGS84 lon/lat. */
export function utmToLonLat(utm: UtmCoordinate): [number, number] {
  const [lon, lat] = proj4(utmDef(utm.zone, utm.hemisphere)).inverse([utm.easting, utm.northing]);
  return [lon, lat];
}

function toDms(value: number): { deg: number; min: number; sec: number } {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  return { deg, min, sec };
}

export function formatDD(lon: number, lat: number, precision = 5): string {
  return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`;
}

export function formatDMS(lon: number, lat: number): string {
  const latDms = toDms(lat);
  const lonDms = toDms(lon);
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${latDms.deg}°${latDms.min}'${latDms.sec.toFixed(1)}"${ns} ${lonDms.deg}°${lonDms.min}'${lonDms.sec.toFixed(1)}"${ew}`;
}

export function formatUTM(lon: number, lat: number): string {
  const utm = lonLatToUtm(lon, lat);
  return `${utm.zone}${utm.hemisphere} ${Math.round(utm.easting)}E ${Math.round(utm.northing)}N`;
}

export function formatCoordinate(lon: number, lat: number, format: "dd" | "dms" | "utm"): string {
  if (format === "dms") return formatDMS(lon, lat);
  if (format === "utm") return formatUTM(lon, lat);
  return formatDD(lon, lat);
}
