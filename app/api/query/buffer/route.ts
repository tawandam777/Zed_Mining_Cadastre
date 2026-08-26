import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lon = Number(body.lon);
  const lat = Number(body.lat);
  const radiusKm = Number(body.radiusKm);

  if (![lon, lat, radiusKm].every(Number.isFinite)) {
    return NextResponse.json({ error: "lon/lat/radiusKm must be numbers" }, { status: 400 });
  }

  try {
    const licences = await getProvider().getLicencesInBuffer(lon, lat, radiusKm);
    return NextResponse.json({ licences });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
