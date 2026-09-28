
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serverDb: SupabaseClient | null = null;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://gosytupmjddrmtdvzotp.supabase.co";

const PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_jnjtlsiNBz-d8TO3Toyo9Q_vxLKa3Zf";

/*
 * IMPORTANT
 *
 * Browser/public key:
 *   sb_publishable_...
 *
 * Server database key:
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OR SUPABASE_SECRET_KEY
 *
 * Never use the publishable key as the server database key.
 */
function getServerKey(): string {
  // Prefer SERVICE_ROLE first.
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceRole && !serviceRole.startsWith("sb_publishable_")) {
    return serviceRole;
  }

  // New Supabase secret key.
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (secretKey && !secretKey.startsWith("sb_publishable_")) {
    return secretKey;
  }

  throw new Error(
    "Sera Time server database key is missing or invalid. " +
      "Set SUPABASE_SERVICE_ROLE_KEY to the Supabase server/service-role key."
  );
}

/*
 * SERVER DATABASE CLIENT
 *
 * This is the ONLY client that accesses public tables.
 */
export function db(): SupabaseClient {
  if (serverDb) return serverDb;

  const key = getServerKey();

  serverDb = createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },

    global: {
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
    },
  });

  return serverDb;
}

/*
 * Authenticate the user.
 *
 * The publishable key is used ONLY to validate the login session.
 * Database operations below use db(), which uses the server key.
 */
export async function authUser(accessToken: string) {
  if (!accessToken) {
    throw new Error("Please log in first.");
  }

  const authClient = createClient(SUPABASE_URL, PUBLIC_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const {
    data: authData,
    error: authError,
  } = await authClient.auth.getUser(accessToken);

  if (authError || !authData.user) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const authUser = authData.user;

  const adminEmail = "yafet.tech0990@gmail.com";

  const isAdmin =
    String(authUser.email || "")
      .trim()
      .toLowerCase() === adminEmail;

  /*
   * IMPORTANT:
   * From here onward we use SERVER db().
   */
  const {
    data: profile,
    error: profileError,
  } = await db()
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      `Server could not access profiles: ${profileError.message}`
    );
  }

  /*
   * Existing profile
   */
  if (profile) {
    /*
     * Automatically make the configured admin email admin.
     */
    if (isAdmin && !profile.is_admin) {
      const {
        data: promoted,
        error: promoteError,
      } = await db()
        .from("profiles")
        .update({
          is_admin: true,
        })
        .eq("id", authUser.id)
        .select("*")
        .single();

      if (promoteError) {
        throw new Error(
          `Could not update admin profile: ${promoteError.message}`
        );
      }

      return promoted;
    }

    return profile;
  }

  /*
   * Create profile for a new authenticated user.
   */
  const fullName = String(
    authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split("@")[0] ||
      "Sera User"
  ).slice(0, 160);

  const {
    data: createdProfile,
    error: createProfileError,
  } = await db()
    .from("profiles")
    .insert({
      id: authUser.id,
      email: authUser.email || "",
      full_name: fullName,
      is_admin: isAdmin,
    })
    .select("*")
    .single();

  if (createProfileError) {
    throw new Error(
      `Could not create Sera Time profile: ${createProfileError.message}`
    );
  }

  /*
   * Create wallet.
   */
  const {
    error: walletError,
  } = await db()
    .from("wallets")
    .upsert(
      {
        user_id: authUser.id,
      },
      {
        onConflict: "user_id",
      }
    );

  if (walletError) {
    throw new Error(
      `Could not create wallet: ${walletError.message}`
    );
  }

  return createdProfile;
}

/*
 * Safe text helper.
 */
export function text(value: any, max = 10000) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

/*
 * Safe number helper.
 */
export function num(value: any, defaultValue = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : defaultValue;
}

/*
 * Send notification.
 */
export async function notify(
  userId: string,
  title: string,
  body: string,
  type = "system"
) {
  const {
    error,
  } = await db()
    .from("notifications")
    .insert({
      user_id: userId,
      title,
      body,
      type,
    });

  if (error) {
    throw new Error(
      `Notification failed: ${error.message}`
    );
  }
}

/*
 * Send notification to multiple users.
 */
export async function manyNotify(
  userIds: string[],
  title: string,
  body: string,
  type = "system"
) {
  const rows = [
    ...new Set(userIds),
  ].map((user_id) => ({
    user_id,
    title,
    body,
    type,
  }));

  if (!rows.length) {
    return;
  }

  const {
    error,
  } = await db()
    .from("notifications")
    .insert(rows);

  if (error) {
    throw new Error(
      `Notifications failed: ${error.message}`
    );
  }
}
