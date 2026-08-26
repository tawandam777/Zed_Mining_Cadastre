declare module "shapefile" {
  interface ShapefileSource {
    read(): Promise<{ done: boolean; value: GeoJSON.Feature }>;
  }
  export function open(shp: ArrayBuffer | Uint8Array, dbf?: ArrayBuffer | Uint8Array): Promise<ShapefileSource>;
}
