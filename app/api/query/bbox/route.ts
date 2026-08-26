import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { xmin, ymin, xmax, ymax } = body;

  if ([xmin, ymin, xmax, ymax].some((v) => typeof v !== "number" || Number.isNaN(v))) {
    return NextResponse.json({ error: "xmin/ymin/xmax/ymax must be numbers" }, { status: 400 });
  }

  try {
    const licences = await getProvider().getLicencesInBbox({ xmin, ymin, xmax, ymax });
    return NextResponse.json({ licences });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
