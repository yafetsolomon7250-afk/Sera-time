import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _db: SupabaseClient | null = null;

function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`${name} is not configured on the server.`);
  return value;
}

/** Server-only Supabase client. Never import this file into browser code. */
export function db() {
  if (!_db) {
    const url = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
    // Support the existing legacy Vercel variable and Supabase's newer secret-key name.
    const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    _db = createClient(url, required("SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY", secret), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return _db;
}

/** Validate a user's Supabase Auth access token using the public/publishable key. */
export async function authUser(accessToken: string) {
  if (!accessToken) throw new Error("Please log in first.");
  const url = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishable = required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const auth = createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await auth.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Your session has expired. Please log in again.");

  const au = data.user;
  const adminEmail = "yafet.tech0990@gmail.com";
  const isAdminEmail = String(au.email || "").trim().toLowerCase() === adminEmail;

  const { data: profile, error: profileError } = await db()
    .from("profiles")
    .select("*")
    .eq("id", au.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (profile) {
    if (isAdminEmail && !profile.is_admin) {
      const { data: promoted, error: promoteError } = await db()
        .from("profiles")
        .update({ is_admin: true })
        .eq("id", au.id)
        .select("*")
        .single();
      if (promoteError) throw promoteError;
      return promoted;
    }
    return profile;
  }

  const full = String(au.user_metadata?.full_name || au.email?.split("@")[0] || "Sera User");
  const { data: created, error: createError } = await db()
    .from("profiles")
    .insert({ id: au.id, email: au.email || "", full_name: full, is_admin: isAdminEmail })
    .select("*")
    .single();
  if (createError) throw createError;

  const { error: walletError } = await db().from("wallets").upsert({ user_id: au.id }, { onConflict: "user_id" });
  if (walletError) throw walletError;
  return created;
}

export function text(v: any, max = 10000) {
  return String(v ?? "").trim().slice(0, max);
}

export function num(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export async function notify(userId: string, title: string, body: string, type = "system") {
  const { error } = await db().from("notifications").insert({ user_id: userId, title, body, type });
  if (error) throw error;
}

export async function manyNotify(ids: string[], title: string, body: string, type = "system") {
  const rows = [...new Set(ids)].map((user_id) => ({ user_id, title, body, type }));
  if (!rows.length) return;
  const { error } = await db().from("notifications").insert(rows);
  if (error) throw error;
}
