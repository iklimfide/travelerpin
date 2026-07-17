import { NextResponse } from "next/server";
import { requireKamikazeMasterApi } from "@/lib/kamikaze/auth";
import {
  buildI18nEntries,
  listNamespaces,
  readMessagesFile,
  setMessageAtPath,
  writeTrMessagesFile,
  type MessageTree,
} from "@/lib/kamikaze/i18n-messages";

export async function GET() {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  try {
    const [en, tr] = await Promise.all([
      readMessagesFile("en"),
      readMessagesFile("tr"),
    ]);
    const entries = buildI18nEntries(en, tr);
    const sameAsEn = entries.filter((row) => row.tr.trim() && row.tr === row.en).length;
    const missingTr = entries.filter((row) => !row.tr.trim()).length;

    return NextResponse.json({
      namespaces: listNamespaces(en),
      entries,
      stats: {
        total: entries.length,
        sameAsEn,
        missingTr,
        translated: entries.filter((row) => row.tr.trim() && row.tr !== row.en).length,
      },
      writable: process.env.VERCEL !== "1",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Çeviri dosyaları okunamadı",
      },
      { status: 500 }
    );
  }
}

type UpdateBody = {
  updates?: Array<{ path?: string; value?: string }>;
};

export async function POST(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  if (process.env.VERCEL === "1") {
    return NextResponse.json(
      {
        error:
          "Canlı ortamda messages/tr.json yazılamaz. Yerelde düzenleyip commit edin.",
      },
      { status: 400 }
    );
  }

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const updates = Array.isArray(body.updates) ? body.updates : [];
  if (updates.length === 0) {
    return NextResponse.json({ error: "Güncelleme yok" }, { status: 400 });
  }

  try {
    const [en, tr] = await Promise.all([
      readMessagesFile("en"),
      readMessagesFile("tr"),
    ]);

    const nextTr: MessageTree = structuredClone(tr);
    const applied: string[] = [];

    for (const update of updates) {
      const messagePath = typeof update.path === "string" ? update.path.trim() : "";
      if (!messagePath) {
        return NextResponse.json({ error: "Boş path" }, { status: 400 });
      }
      if (typeof update.value !== "string") {
        return NextResponse.json(
          { error: `Geçersiz değer: ${messagePath}` },
          { status: 400 }
        );
      }
      // Only keys that exist in EN may be edited.
      if (typeof getEnValue(en, messagePath) !== "string") {
        return NextResponse.json(
          { error: `EN anahtarı yok: ${messagePath}` },
          { status: 400 }
        );
      }
      if (!setMessageAtPath(nextTr, messagePath, update.value)) {
        // Key missing in TR — create along EN structure by ensuring path exists.
        if (!ensureStringPath(nextTr, en, messagePath, update.value)) {
          return NextResponse.json(
            { error: `TR anahtarı yazılamadı: ${messagePath}` },
            { status: 400 }
          );
        }
      }
      applied.push(messagePath);
    }

    await writeTrMessagesFile(nextTr);
    const entries = buildI18nEntries(en, nextTr);

    return NextResponse.json({
      ok: true,
      appliedCount: applied.length,
      entries,
      stats: {
        total: entries.length,
        sameAsEn: entries.filter((row) => row.tr.trim() && row.tr === row.en).length,
        missingTr: entries.filter((row) => !row.tr.trim()).length,
        translated: entries.filter((row) => row.tr.trim() && row.tr !== row.en)
          .length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Çeviri dosyası yazılamadı",
      },
      { status: 500 }
    );
  }
}

function getEnValue(en: MessageTree, messagePath: string): string | undefined {
  const parts = messagePath.split(".");
  let current: string | MessageTree | undefined = en;
  for (const part of parts) {
    if (!current || typeof current === "string") return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

/** Create intermediate objects so a missing TR key can still be set. */
function ensureStringPath(
  tr: MessageTree,
  en: MessageTree,
  messagePath: string,
  value: string
): boolean {
  const parts = messagePath.split(".");
  let trCur: MessageTree = tr;
  let enCur: MessageTree = en;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const enNext = enCur[part];
    if (!enNext || typeof enNext === "string") return false;
    const trNext = trCur[part];
    if (!trNext || typeof trNext === "string") {
      trCur[part] = {};
    }
    trCur = trCur[part] as MessageTree;
    enCur = enNext;
  }

  const leaf = parts[parts.length - 1]!;
  if (typeof enCur[leaf] !== "string") return false;
  trCur[leaf] = value;
  return true;
}
