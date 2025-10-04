// src/lib/pro.ts
import { supabase } from './supabase';
import { getItem as sGet, setItem as sSet } from './secureStorage';

const KEY = 'entitlement.pro';

export async function isPro(): Promise<boolean> {
  // local cache first
  const cached = await sGet<boolean>(KEY);
  let result = !!cached;

  try {
    const { data, error } = await supabase
      .from('entitlements')
      .select('active')
      .eq('product', 'pro')
      .maybeSingle();

    if (!error && data) {
      result = !!data.active;
      await sSet(KEY, result);
    }
  } catch {
    // ignore network errors; rely on cache
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
    const { data, error } = await supabase
      .from('entitlements')
      .select('active')
      .eq('product', 'pro')
      .maybeSingle();

    if (!error && data) {
      await sSet(KEY, !!data.active);
    }
  } catch {
    // ignore
  }
}
