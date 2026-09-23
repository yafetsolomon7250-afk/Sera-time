import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: true } };

function db() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

async function send(chatId: number | string, text: string, extra?: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const app = process.env.APP_URL;
  if (!token) return;
  const body: any = { chat_id: chatId, text, parse_mode: "HTML", ...extra };
  if (app && !extra?.reply_markup) {
    body.reply_markup = {
      inline_keyboard: [[{ text: "🚀 Sera Timeን ክፈት", web_app: { url: app } }]],
    };
  }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, service: "telegram-webhook", version: "9.2" });
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
      const admins = (process.env.ADMIN_TELEGRAM_IDS || "")
        .split(",")
        .map((x: string) => x.trim())
        .filter(Boolean);

      const supabase = db();
      const { data: adminUser } = await supabase
        .from("users")
        .select("id,is_admin")
        .eq("telegram_id", fromId)
        .maybeSingle();

      const isAdmin =
        admins.includes(fromId) || adminUser?.is_admin === true;

      if (!isAdmin) {
        await answerCb(cb.id, "ፈቃድ የለዎትም — ADMIN_TELEGRAM_IDS ያረጋግጡ");
        return res.status(200).json({ ok: true });
      }

      if (!adminUser?.id) {
        await answerCb(cb.id, "አስተዳዳሪ መለያ በሲስተም አልተገኘም። መጀመሪያ Mini App ይክፈቱ።");
        return res.status(200).json({ ok: true });
      }

      const data = String(cb.data);

      // ===== DEPOSIT approve / reject (no RPC required) =====
      if (data.startsWith("dep_ok_") || data.startsWith("dep_no_")) {
        const id = data.replace("dep_ok_", "").replace("dep_no_", "");
        const approve = data.startsWith("dep_ok_");

        const { data: dep, error: depErr } = await supabase
          .from("deposits")
          .select("id,user_id,amount,status")
          .eq("id", id)
          .maybeSingle();

        if (depErr || !dep) {
          await answerCb(cb.id, "ዲፖዚት አልተገኘም");
          return res.status(200).json({ ok: true });
        }
        if (dep.status !== "pending") {
          await answerCb(cb.id, "አስቀድሞ ተስተናግዷል: " + dep.status);
          return res.status(200).json({ ok: true });
        }

        if (approve) {
          // credit wallet
          const { data: w } = await supabase
            .from("wallets")
            .select("available")
            .eq("user_id", dep.user_id)
            .maybeSingle();
          if (!w) {
            await supabase.from("wallets").insert({
              user_id: dep.user_id,
              available: Number(dep.amount),
              locked: 0,
            });
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
              reviewed_by: adminUser.id,
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", id);
        } else {
          await supabase
            .from("deposits")
            .update({
              status: "rejected",
              reviewed_by: adminUser.id,
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
              ? `✅ ዲፖዚትዎ ተፈቅዷል። ${Number(dep.amount).toFixed(2)} ብር ወደ ዋሌትዎ ገብቷል።`
              : "❌ የዲፖዚት ጥያቄዎ ተቀባይነት አላገኘም።"
          );
        }
        return res.status(200).json({ ok: true });
      }

      // ===== WITHDRAWAL pay / reject (no RPC required) =====
      if (data.startsWith("wd_ok_") || data.startsWith("wd_no_")) {
        const id = data.replace("wd_ok_", "").replace("wd_no_", "");
        const approve = data.startsWith("wd_ok_");

        const { data: wd } = await supabase
          .from("withdrawals")
          .select("id,user_id,amount,status")
          .eq("id", id)
          .maybeSingle();

        if (!wd) {
          await answerCb(cb.id, "ማውጣት አልተገኘም");
          return res.status(200).json({ ok: true });
        }
        if (wd.status !== "pending") {
          await answerCb(cb.id, "አስቀድሞ ተስተናግዷል: " + wd.status);
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
              processed_by: adminUser.id,
              processed_at: new Date().toISOString(),
            })
            .eq("id", id);
        } else {
          // refund reserved → available
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
              processed_by: adminUser.id,
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
              ? `✅ ማውጣት ተከፍሏል። ${Number(wd.amount).toFixed(2)} ብር`
              : "❌ የማውጣት ጥያቄዎ ተቀባይነት አላገኘም።"
          );
        }
        return res.status(200).json({ ok: true });
      }

      await answerCb(cb.id, "ያልታወቀ ትእዛዝ");
      return res.status(200).json({ ok: true });
    }

    const msg = update.message;
    if (msg?.chat?.id) {
      const text = String(msg.text || "");
      if (text.startsWith("/start")) {
        await send(
          msg.chat.id,
          "እንኳን ወደ <b>Sera Time</b> በደህና መጡ! 👋\n\nስራ ይስሩ፣ ገቢ ያግኙ፣ ወይም ስራ ይለጥፉ።\n\nከታች ያለውን 🚀 ቁልፍ በመጫን Sera Timeን ይክፈቱ።"
        );
      } else {
        await send(
          msg.chat.id,
          "Sera Timeን ለመጠቀም 🚀 <b>Sera Timeን ክፈት</b> የሚለውን ቁልፍ ይጫኑ።"
        );
      }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: true });
  }
}
