import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lon = Number(body.lon);
  const lat = Number(body.lat);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return NextResponse.json({ error: "lon/lat must be numbers" }, { status: 400 });
  }

  try {
    const licence = await getProvider().getLicenceAtPoint(lon, lat);
    return NextResponse.json({ licence });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
