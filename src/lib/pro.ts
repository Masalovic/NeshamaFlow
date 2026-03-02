// src/lib/pro.ts
import { supabase } from "./supabase";
import { getItem as sGet, setItem as sSet } from "./secureStorage";

const KEY = "entitlement.pro";

/**
 * Pro entitlement:
 * - Primary source: Supabase table `entitlements` scoped by user_id.
 * - Fallback: encrypted cache (local preview toggle).
 */
export async function isPro(): Promise<boolean> {
  const cached = await sGet<boolean>(KEY);
  let result = !!cached;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If not authed, rely on cached (preview toggle)
    if (!user) return result;

    const { data, error } = await supabase
      .from("entitlements")
      .select("active")
      .eq("user_id", user.id)
      .eq("product", "pro")
      .maybeSingle();

    if (!error && data) {
      result = !!data.active;
      await sSet(KEY, result);
    }
  } catch {
    // ignore, rely on cache
  }

  return result;
}

/** Local preview toggle used in Settings (does not touch Supabase). */
export async function setPro(val: boolean): Promise<void> {
  await sSet(KEY, !!val);
}

/** Refresh from server after login or foreground. */
export async function refreshEntitlement(): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("entitlements")
      .select("active")
      .eq("user_id", user.id)
      .eq("product", "pro")
      .maybeSingle();

    if (!error && data) {
      await sSet(KEY, !!data.active);
    }
  } catch {
    // ignore
  }
}