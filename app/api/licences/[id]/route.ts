import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const detail = await getProvider().getLicenceDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Licence not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
