import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const xmin = searchParams.get("xmin");
  const ymin = searchParams.get("ymin");
  const xmax = searchParams.get("xmax");
  const ymax = searchParams.get("ymax");
  const hasBbox = xmin !== null && ymin !== null && xmax !== null && ymax !== null;

  try {
    const geojson = await getProvider().getLicencesGeoJSON(
      hasBbox ? { xmin: Number(xmin), ymin: Number(ymin), xmax: Number(xmax), ymax: Number(ymax) } : undefined,
    );
    return NextResponse.json(geojson);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
