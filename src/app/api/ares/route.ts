import { NextRequest, NextResponse } from "next/server";
import { searchAresByIco } from "@/lib/ares";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const ico = url.searchParams.get("ico");

  if (!ico) {
    return NextResponse.json({ error: "Chybí parametr ico" }, { status: 400 });
  }

  const cleanIco = ico.replace(/\s/g, "");
  if (!/^\d{8}$/.test(cleanIco)) {
    return NextResponse.json(
      { error: "IČO musí mít 8 číslic" },
      { status: 400 },
    );
  }

  try {
    const result = await searchAresByIco(cleanIco);
    if (!result) {
      return NextResponse.json(
        { error: "Firma s tímto IČO nebyla nalezena" },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Neznámá chyba";
    return NextResponse.json(
      { error: `Chyba při vyhledávání: ${message}` },
      { status: 500 },
    );
  }
}