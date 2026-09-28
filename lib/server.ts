import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

let _db: SupabaseClient | null = null;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://gosytupmjddrmtdvzotp.supabase.co";

function serverKey() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!key) {
    throw new Error(
      "Server Supabase key is missing. Set SUPABASE_SERVICE_ROLE_KEY in Vercel."
    );
  }

  // Never allow a browser/publishable key to be used as the server key.
  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is a publishable key. Use the Supabase service_role key or sb_secret key instead."
    );
  }

  return key;
}

function publicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_jnjtlsiNBz-d8TO3Toyo9Q_vxLKa3Zf"
  );
}

/**
 * SERVER-ONLY database client.
 *
 * IMPORTANT:
 * - Never import this module into client/browser code.
 * - All public table access is intentionally performed here.
 * - The database revokes anon/authenticated table permissions, so this
 *   client MUST use the server service_role/sb_secret key.
 */
export function db(): SupabaseClient {
  if (_db) return _db;

  const key = serverKey();

  _db = createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // Explicitly force the server credential on every PostgREST request.
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
    },
  });

  return _db;
}

/** Validate the user's Auth access token without ever using the browser key for database access. */
export async function authUser(accessToken: string) {
  if (!accessToken) throw new Error("Please log in first.");

  // Validate the user's JWT with Supabase Auth.
  // The database client remains completely separate from the browser client.
  const auth = createClient(SUPABASE_URL, publicKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: authData, error: authError } =
    await auth.auth.getUser(accessToken);

  if (authError || !authData.user) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const au: User = authData.user;
  const adminEmail = "yafet.tech0990@gmail.com";
  const isAdminEmail =
    String(au.email || "").trim().toLowerCase() === adminEmail;

  // EVERYTHING below this line uses db(), never the browser client.
  const { data: profile, error: profileError } = await db()
    .from("profiles")
    .select("*")
    .eq("id", au.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Server database access failed: ${profileError.message}`);
  }

  if (profile) {
    if (isAdminEmail && !profile.is_admin) {
      const { data: promoted, error: promoteError } = await db()
        .from("profiles")
        .update({ is_admin: true })
        .eq("id", au.id)
        .select("*")
        .single();

      if (promoteError) {
        throw new Error(
          `Could not promote admin account: ${promoteError.message}`
        );
      }

      return promoted;
    }

    return profile;
  }

  const fullName = String(
    au.user_metadata?.full_name ||
      au.user_metadata?.name ||
      au.email?.split("@")[0] ||
      "Sera User"
  ).slice(0, 160);

  const { data: created, error: createError } = await db()
    .from("profiles")
    .insert({
      id: au.id,
      email: au.email || "",
      full_name: fullName,
      is_admin: isAdminEmail,
    })
    .select("*")
    .single();

  if (createError) {
    throw new Error(`Could not create profile: ${createError.message}`);
  }

  const { error: walletError } = await db()
    .from("wallets")
    .upsert({ user_id: au.id }, { onConflict: "user_id" });

  if (walletError) {
    throw new Error(`Could not create wallet: ${walletError.message}`);
  }

  return created;
}

export function text(v: any, max = 10000) {
  return String(v ?? "").trim().slice(0, max);
}

export function num(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export async function notify(
  userId: string,
  title: string,
  body: string,
  type = "system"
) {
  const { error } = await db()
    .from("notifications")
    .insert({ user_id: userId, title, body, type });

  if (error) throw new Error(`Notification failed: ${error.message}`);
}

export async function manyNotify(
  ids: string[],
  title: string,
  body: string,
  type = "system"
) {
  const rows = [...new Set(ids)].map((user_id) => ({
    user_id,
    title,
    body,
    type,
  }));

  if (!rows.length) return;

  const { error } = await db().from("notifications").insert(rows);
  if (error) throw new Error(`Notifications failed: ${error.message}`);
}
