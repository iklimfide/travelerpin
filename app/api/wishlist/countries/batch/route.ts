import { after, NextResponse } from "next/server";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { createClient } from "@/lib/supabase/server";
import { wishlistBatchSchema } from "@/lib/validations/wishlist-batch";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = wishlistBatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { add, remove_ids: removeIds } = parsed.data;
  const uniqueRemoveIds = [...new Set(removeIds)];

  if (add.length === 0 && uniqueRemoveIds.length === 0) {
    return NextResponse.json({ added: 0, removed: 0 });
  }

  let removed = 0;
  if (uniqueRemoveIds.length > 0) {
    const { count, error } = await supabase
      .from("wishlist_countries")
      .delete({ count: "exact" })
      .eq("user_id", user.id)
      .in("id", uniqueRemoveIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    removed = count ?? 0;
  }

  let added = 0;
  if (add.length > 0) {
    const seen = new Set<string>();
    const candidateRows = add
      .map((entry) => ({
        user_id: user.id,
        country_code: entry.country_code.toUpperCase(),
        country_name: entry.country_name,
      }))
      .filter((entry) => {
        if (seen.has(entry.country_code)) return false;
        seen.add(entry.country_code);
        return true;
      });

    if (candidateRows.length > 0) {
      const codes = candidateRows.map((row) => row.country_code);
      const { data: existing } = await supabase
        .from("wishlist_countries")
        .select("country_code")
        .eq("user_id", user.id)
        .in("country_code", codes);

      const existingCodes = new Set(
        (existing ?? []).map((row) => row.country_code.toUpperCase())
      );
      const rows = candidateRows.filter((row) => !existingCodes.has(row.country_code));

      if (rows.length > 0) {
        const { data: inserted, error } = await supabase
          .from("wishlist_countries")
          .insert(rows)
          .select();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        added = inserted?.length ?? 0;
      }
    }
  }

  if (added > 0 || removed > 0) {
    after(() => revalidateProfileForPin(supabase, user.id));
  }

  return NextResponse.json({ added, removed });
}
