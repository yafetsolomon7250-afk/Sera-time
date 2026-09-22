import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _db: SupabaseClient | null = null;

export function db() {
  if (!_db) {
    _db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return _db;
}

export const num = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
export const text = (v: any, max: number) => String(v ?? "").trim().slice(0, max);

export function validateTelegram(initData: string) {
  if (!initData) throw new Error("Telegram ላይ Sera Timeን ከBot ውስጥ ይክፈቱ።");
  const p = new URLSearchParams(initData);
  const hash = p.get("hash");
  if (!hash) throw new Error("Telegram ማረጋገጫ የለም። 🚀 ክፈት ቁልፍ ይጠቀሙ።");
  p.delete("hash");
  const check = [...p.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(process.env.TELEGRAM_BOT_TOKEN || "")
    .digest();
  const expected = crypto.createHmac("sha256", secret).update(check).digest("hex");
  if (hash.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected))) {
    throw new Error("Telegram ማረጋገጫ አልተሳካም።");
  }
  const authDate = Number(p.get("auth_date") || 0);
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (!authDate || age < 0 || age > 86400) {
    throw new Error("Telegram ክፍለ ጊዜው አልፏል። እንደገና ከBot ይክፈቱ።");
  }
  let u: any = {};
  try {
    u = JSON.parse(p.get("user") || "{}");
  } catch {
    throw new Error("Telegram የተጠቃሚ መረጃ አልተነበበም።");
  }
  if (!u?.id) throw new Error("Telegram user አልተገኘም።");
  // start_param comes from ?start= or startapp=
  const startParam = p.get("start_param") || "";
  return { u, startParam };
}

export async function authUser(initData: string, ref?: string) {
  const { u, startParam } = validateTelegram(initData);
  const start = String(ref || startParam || "");
  const { data, error } = await db().rpc("ensure_user", {
    p_telegram_id: String(u.id),
    p_first_name: u.first_name || "",
    p_last_name: u.last_name || "",
    p_username: u.username || null,
    p_start_param: start,
  });
  if (error) throw error;
  const admins = (process.env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (admins.includes(String(u.id))) {
    await db()
      .from("users")
      .update({ is_admin: true, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    data.is_admin = true;
  }
  return data;
}

export async function rpc(name: string, args: any) {
  const { data, error } = await db().rpc(name, args);
  if (error) throw error;
  return data;
}

export async function notify(userId: string, title: string, body: string, type: string) {
  await db().from("notifications").insert({ user_id: userId, title, body, type });
}

export async function tgMessage(userId: string, textMsg: string) {
  try {
    const { data: u } = await db().from("users").select("telegram_id").eq("id", userId).maybeSingle();
    if (!u?.telegram_id || !process.env.TELEGRAM_BOT_TOKEN) return;
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: u.telegram_id, text: textMsg, parse_mode: "HTML" }),
    });
  } catch {}
}

export async function postToChannel(channel: string, textMsg: string, replyMarkup?: any) {
  if (!channel || !process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: channel,
        text: textMsg,
        parse_mode: "HTML",
        reply_markup: replyMarkup || undefined,
      }),
    });
  } catch (e) {
    console.error("channel post failed", e);
  }
}

export function ensureWorker(user: any) {
  if (user.banned) {
    throw new Error(
      `የሰራተኛ መለያዎ ታግዷል። ምክንያት: ${user.ban_reason || "አልተገለጸም"}። የደንበኛ ሚና መጠቀም ይችላሉ።`
    );
  }
}
