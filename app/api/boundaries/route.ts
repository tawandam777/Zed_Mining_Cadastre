import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

export async function GET() {
  try {
    const geojson = await getProvider().getBoundariesGeoJSON();
    return NextResponse.json(geojson);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
