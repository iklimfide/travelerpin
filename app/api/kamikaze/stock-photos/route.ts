import { NextResponse } from "next/server";
import { requireKamikazeMasterApi } from "@/lib/kamikaze/auth";
import {
  configuredStockPhotoProviders,
  searchStockPhotos,
} from "@/lib/kamikaze/stock-photos/search";

export async function GET(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") ?? "").trim();
  const pageRaw = Number.parseInt(String(searchParams.get("page") ?? "1"), 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  if (!q) {
    return NextResponse.json({ error: "Arama metni gerekli" }, { status: 400 });
  }

  const configured = configuredStockPhotoProviders();
  if (configured.length === 0) {
    return NextResponse.json(
      {
        error:
          "Stok foto API anahtarları tanımlı değil (PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY, PEXELS_API_KEY).",
        results: [],
        providers: [],
        providerErrors: {},
      },
      { status: 503 }
    );
  }

  try {
    const payload = await searchStockPhotos(q, page);
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Arama başarısız" },
      { status: 500 }
    );
  }
}
