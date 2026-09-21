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
      return res.status(200).json({ ok: true, service: "telegram-webhook", version: "8" });
    }

    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expected) {
      const got = req.headers["x-telegram-bot-api-secret-token"];
      if (got !== expected) return res.status(401).json({ ok: false });
    }

    const update = req.body || {};
    const cb = update.callback_query;

    if (cb?.data && cb?.from?.id) {
      const admins = (process.env.ADMIN_TELEGRAM_IDS || "").split(",").map((x: string) => x.trim()).filter(Boolean);
      if (!admins.includes(String(cb.from.id))) {
        await answerCb(cb.id, "ፈቃድ የለዎትም");
        return res.status(200).json({ ok: true });
      }
      const supabase = db();
      const { data: adminUser } = await supabase.from("users").select("id").eq("telegram_id", String(cb.from.id)).maybeSingle();
      const data = String(cb.data);

      if (adminUser?.id && (data.startsWith("dep_ok_") || data.startsWith("dep_no_"))) {
        const id = data.replace("dep_ok_", "").replace("dep_no_", "");
        const approve = data.startsWith("dep_ok_");
        const { error } = await supabase.rpc("admin_deposit", { p_admin_id: adminUser.id, p_deposit_id: id, p_approve: approve });
        if (error) await answerCb(cb.id, "ስህተት: " + error.message);
        else {
          await answerCb(cb.id, approve ? "ዲፖዚት ተፈቅዷል ✅" : "ተቀባይነት አላገኘም ❌");
          const { data: dep } = await supabase.from("deposits").select("user_id,amount").eq("id", id).maybeSingle();
          if (dep?.user_id) {
            const { data: u } = await supabase.from("users").select("telegram_id").eq("id", dep.user_id).maybeSingle();
            if (u?.telegram_id) {
              await send(u.telegram_id, approve
                ? `✅ ዲፖዚትዎ ተፈቅዷል። ${Number(dep.amount).toFixed(2)} ብር ወደ ዋሌትዎ ገብቷል።`
                : "❌ የዲፖዚት ጥያቄዎ ተቀባይነት አላገኘም።");
            }
          }
        }
      } else if (adminUser?.id && (data.startsWith("wd_ok_") || data.startsWith("wd_no_"))) {
        const id = data.replace("wd_ok_", "").replace("wd_no_", "");
        const approve = data.startsWith("wd_ok_");
        const { error } = await supabase.rpc("admin_withdraw", { p_admin_id: adminUser.id, p_withdrawal_id: id, p_approve: approve });
        if (error) await answerCb(cb.id, "ስህተት: " + error.message);
        else {
          await answerCb(cb.id, approve ? "ክፍያ ተከናውኗል ✅" : "ተቀባይነት አላገኘም ❌");
          const { data: wd } = await supabase.from("withdrawals").select("user_id,amount").eq("id", id).maybeSingle();
          if (wd?.user_id) {
            const { data: u } = await supabase.from("users").select("telegram_id").eq("id", wd.user_id).maybeSingle();
            if (u?.telegram_id) {
              await send(u.telegram_id, approve
                ? `✅ ማውጣት ተከፍሏል። ${Number(wd.amount).toFixed(2)} ብር ወደ ሂሳብዎ ገብቷል።`
                : "❌ የማውጣት ጥያቄዎ ተቀባይነት አላገኘም።");
            }
          }
        }
      }
      return res.status(200).json({ ok: true });
    }

    const msg = update.message;
    if (msg?.chat?.id) {
      const text = String(msg.text || "");
      if (text.startsWith("/start")) {
        await send(msg.chat.id,
          "እንኳን ወደ <b>Sera Time</b> በደህና መጡ! 👋\n\nስራ ይስሩ፣ ገቢ ያግኙ፣ ወይም ስራ ይለጥፉ።\n\nከታች ያለውን 🚀 ቁልፍ በመጫን Sera Timeን ይክፈቱ።");
      } else {
        await send(msg.chat.id, "Sera Timeን ለመጠቀም 🚀 <b>Sera Timeን ክፈት</b> የሚለውን ቁልፍ ይጫኑ።");
      }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: true });
  }
}
