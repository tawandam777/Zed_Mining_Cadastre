import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lon = Number(body.lon);
  const lat = Number(body.lat);
  const meters = Number(body.meters);

  if (![lon, lat, meters].every(Number.isFinite)) {
    return NextResponse.json({ error: "lon/lat/meters must be numbers" }, { status: 400 });
  }

  try {
    const licences = await getProvider().getLicencesWithinDistance(lon, lat, meters);
    return NextResponse.json({ licences });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
