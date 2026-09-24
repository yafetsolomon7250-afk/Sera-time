import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: true } };

const HARDCODED_ADMINS = ["5980396006"];

function db() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

function adminList() {
  const env = (process.env.ADMIN_TELEGRAM_IDS || "").split(",").map((x) => x.trim()).filter(Boolean);
  return [...new Set([...HARDCODED_ADMINS, ...env])];
}

async function send(chatId: number | string, text: string, extra?: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
}

async function sendPhoto(chatId: number | string, photo: string, caption: string, extra?: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo, caption, parse_mode: "HTML", ...extra }),
  });
}

async function answerCb(id: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text, show_alert: true }),
  });
}

function extractUuid(s: string): string | null {
  const m = String(s || "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0] : null;
}

async function welcome(chatId: number | string) {
  const app = process.env.APP_URL || "https://sera-time-zhyo.vercel.app";
  const keyboard = {
    inline_keyboard: [
      [{ text: "🚀 Sera Time ክፈት", web_app: { url: app } }],
      [
        { text: "💼 ስራ ፈልግ", web_app: { url: app } },
        { text: "📢 ስራ ለጥፍ", web_app: { url: app } },
      ],
    ],
  };
  const caption =
    `✨ <b>እንኳን ወደ Sera Time በደህና መጡ!</b>\n\n` +
    `🇪🇹 የኢትዮጵያ የመስመር ላይ ስራ መድረክ\n\n` +
    `✅ ስራ ይቀበሉ እና ገቢ ያግኙ\n` +
    `✅ ስራ ይለጥፉ እና ባለሙያ ያግኙ\n` +
    `✅ Telebirr ዲፖዚት እና ማውጣት\n` +
    `✅ ሪፈራል 5% ቦነስ\n\n` +
    `👇 <b>Sera Time ክፈት</b> ይጫኑ እና ይጀምሩ!`;
  const photo = process.env.WELCOME_IMAGE_URL || "";
  try {
    if (photo) {
      await sendPhoto(chatId, photo, caption, { reply_markup: keyboard });
      return;
    }
  } catch {}
  await send(chatId, caption, { reply_markup: keyboard });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, service: "telegram-webhook", version: "10.1" });
    }
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expected) {
      const got = req.headers["x-telegram-bot-api-secret-token"];
      if (got !== expected) return res.status(401).json({ ok: false });
    }

    const update = req.body || {};
    const cb = update.callback_query;

    if (cb?.data && cb?.from?.id) {
      const fromId = String(cb.from.id);
      const admins = adminList();
      const supabase = db();

      let { data: adminUser } = await supabase
        .from("users")
        .select("id,is_admin")
        .eq("telegram_id", fromId)
        .maybeSingle();

      const isAdmin = admins.includes(fromId) || adminUser?.is_admin === true;
      if (!isAdmin) {
        await answerCb(cb.id, "ፈቃድ የለዎትም");
        return res.status(200).json({ ok: true });
      }

      if (!adminUser?.id) {
        const { data: created } = await supabase
          .from("users")
          .insert({
            telegram_id: fromId,
            first_name: cb.from?.first_name || "Admin",
            username: cb.from?.username || null,
            is_admin: true,
          })
          .select("id,is_admin")
          .maybeSingle();
        if (created?.id) {
          adminUser = created;
          await supabase.from("wallets").upsert(
            { user_id: created.id, available: 0, locked: 0 },
            { onConflict: "user_id" }
          );
        }
      }

      const data = String(cb.data || "");
      const msgText = String(cb.message?.text || cb.message?.caption || "");
      const isDep = data.startsWith("dep_ok_") || data.startsWith("dep_no_");
      const isWd = data.startsWith("wd_ok_") || data.startsWith("wd_no_");
      const approve = data.startsWith("dep_ok_") || data.startsWith("wd_ok_");

      // ID from callback, then from message body
      let id =
        extractUuid(data) ||
        extractUuid(msgText) ||
        "";

      if (isDep || (!isWd && msgText.includes("ዲፖዚት"))) {
        if (!id) {
          // last resort: newest pending deposit
          const { data: latest } = await supabase
            .from("deposits")
            .select("id,user_id,amount,status")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latest) id = latest.id;
        }
        if (!id) {
          await answerCb(cb.id, "ዲፖዚት ID አልተገኘም። አዲስ ዲፖዚት ይላኩ።");
          return res.status(200).json({ ok: true });
        }

        const { data: dep } = await supabase
          .from("deposits")
          .select("id,user_id,amount,status")
          .eq("id", id)
          .maybeSingle();

        if (!dep) {
          await answerCb(cb.id, "ዲፖዚት አልተገኘም: " + id.slice(0, 8));
          return res.status(200).json({ ok: true });
        }
        if (dep.status !== "pending") {
          await answerCb(cb.id, "አስቀድሞ: " + dep.status);
          return res.status(200).json({ ok: true });
        }

        if (approve) {
          const { data: w } = await supabase
            .from("wallets")
            .select("available")
            .eq("user_id", dep.user_id)
            .maybeSingle();
          if (!w) {
            await supabase
              .from("wallets")
              .insert({ user_id: dep.user_id, available: Number(dep.amount), locked: 0 });
          } else {
            await supabase
              .from("wallets")
              .update({ available: Number(w.available || 0) + Number(dep.amount) })
              .eq("user_id", dep.user_id);
          }
          await supabase.from("ledger_entries").insert({
            user_id: dep.user_id,
            type: "deposit",
            amount: Number(dep.amount),
            description: "Deposit approved",
            reference_id: id,
          });
          await supabase
            .from("deposits")
            .update({
              status: "approved",
              reviewed_by: adminUser?.id ?? null,
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", id);
        } else {
          await supabase
            .from("deposits")
            .update({
              status: "rejected",
              reviewed_by: adminUser?.id ?? null,
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", id);
        }

        await answerCb(cb.id, approve ? "ዲፖዚት ተፈቅዷል ✅" : "ተቀባይነት አላገኘም ❌");
        const { data: u } = await supabase
          .from("users")
          .select("telegram_id")
          .eq("id", dep.user_id)
          .maybeSingle();
        if (u?.telegram_id) {
          await send(
            u.telegram_id,
            approve
              ? `✅ ዲፖዚትዎ ተፈቅዷል። <b>${Number(dep.amount).toFixed(2)} ብር</b> ወደ ዋሌትዎ ገብቷል።`
              : "❌ የዲፖዚት ጥያቄዎ ተቀባይነት አላገኘም።"
          );
        }
        return res.status(200).json({ ok: true });
      }

      if (isWd || msgText.includes("ማውጣት")) {
        if (!id) {
          const { data: latest } = await supabase
            .from("withdrawals")
            .select("id")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latest) id = latest.id;
        }
        if (!id) {
          await answerCb(cb.id, "ማውጣት ID አልተገኘም");
          return res.status(200).json({ ok: true });
        }
        const { data: wd } = await supabase
          .from("withdrawals")
          .select("id,user_id,amount,status")
          .eq("id", id)
          .maybeSingle();
        if (!wd) {
          await answerCb(cb.id, "ማውጣት አልተገኘም: " + id.slice(0, 8));
          return res.status(200).json({ ok: true });
        }
        if (wd.status !== "pending") {
          await answerCb(cb.id, "አስቀድሞ: " + wd.status);
          return res.status(200).json({ ok: true });
        }
        const { data: w } = await supabase
          .from("wallets")
          .select("available,reserved")
          .eq("user_id", wd.user_id)
          .maybeSingle();
        if (approve) {
          if (w) {
            await supabase
              .from("wallets")
              .update({
                reserved: Math.max(0, Number(w.reserved || 0) - Number(wd.amount)),
              })
              .eq("user_id", wd.user_id);
          }
          await supabase.from("ledger_entries").insert({
            user_id: wd.user_id,
            type: "withdrawal",
            amount: -Number(wd.amount),
            description: "Withdrawal paid",
            reference_id: id,
          });
          await supabase
            .from("withdrawals")
            .update({
              status: "paid",
              processed_by: adminUser?.id ?? null,
              processed_at: new Date().toISOString(),
            })
            .eq("id", id);
        } else {
          if (w) {
            await supabase
              .from("wallets")
              .update({
                available: Number(w.available || 0) + Number(wd.amount),
                reserved: Math.max(0, Number(w.reserved || 0) - Number(wd.amount)),
              })
              .eq("user_id", wd.user_id);
          }
          await supabase
            .from("withdrawals")
            .update({
              status: "rejected",
              processed_by: adminUser?.id ?? null,
              processed_at: new Date().toISOString(),
              rejection_reason: "Rejected by admin",
            })
            .eq("id", id);
        }
        await answerCb(cb.id, approve ? "ክፍያ ተከናውኗል ✅" : "ተቀባይነት አላገኘም ❌");
        const { data: u } = await supabase
          .from("users")
          .select("telegram_id")
          .eq("id", wd.user_id)
          .maybeSingle();
        if (u?.telegram_id) {
          await send(
            u.telegram_id,
            approve
              ? `✅ ማውጣት ተከፍሏል። <b>${Number(wd.amount).toFixed(2)} ብር</b>`
              : "❌ የማውጣት ጥያቄዎ ተቀባይነት አላገኘም።"
          );
        }
        return res.status(200).json({ ok: true });
      }

      await answerCb(cb.id, "ያልታወቀ ትእዛዝ: " + data.slice(0, 20));
      return res.status(200).json({ ok: true });
    }

    const msg = update.message;
    if (msg?.chat?.id) await welcome(msg.chat.id);
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(200).json({ ok: true });
  }
}
