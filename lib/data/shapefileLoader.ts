import fs from "node:fs";
import path from "node:path";
import * as shapefile from "shapefile";

/**
 * Reads a .shp/.dbf pair (both already WGS84 in this project) into a plain
 * GeoJSON FeatureCollection.
 *
 * Buffers are read ourselves and passed directly to shapefile.open() rather
 * than passing file paths — the shapefile package's string-path handling
 * (via the `path-source` dependency) resolves to a fetch()-based reader
 * instead of the Node fs reader under Turbopack's bundling, which fails with
 * a generic "fetch failed" for local paths. Passing Uint8Array buffers
 * bypasses that resolution ambiguity entirely (shapefile.open uses the
 * simpler, unambiguous `array-source` path for typed-array input).
 *
 * `subfolder` takes just the folder under Admin_Bounds/ (not the full relative path) so the
 * "Admin_Bounds" segment is a literal directly in this join — Turbopack's file tracer can't
 * see through a caller-supplied prefix, so a plain `relativeDir` param here made it fall back
 * to tracing the whole project. A literal first segment lets it scope the trace correctly.
 */
export async function loadShapefile(subfolder: string, baseName: string): Promise<GeoJSON.FeatureCollection> {
  const dir = path.join(process.cwd(), "Admin_Bounds", subfolder);
  const shpBuffer = fs.readFileSync(path.join(dir, `${baseName}.shp`));
  const dbfBuffer = fs.readFileSync(path.join(dir, `${baseName}.dbf`));
  const source = await shapefile.open(new Uint8Array(shpBuffer), new Uint8Array(dbfBuffer));

  const features: GeoJSON.Feature[] = [];
  let result = await source.read();
  while (!result.done) {
    features.push(result.value);
    result = await source.read();
  }
  return { type: "FeatureCollection", features };
}
