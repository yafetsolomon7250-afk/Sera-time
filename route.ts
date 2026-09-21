import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function send(chatId: number | string, text: string, extra?: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const app = process.env.APP_URL;
  if (!token) return;
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra,
  };
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

async function answerCallback(id: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text, show_alert: true }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expected) {
      const got = req.headers.get("x-telegram-bot-api-secret-token");
      if (got !== expected) return NextResponse.json({ ok: false }, { status: 401 });
    }

    const update = await req.json();

    // Handle callback buttons from channels (Approve / Done)
    const cb = update?.callback_query;
    if (cb?.data && cb?.from?.id) {
      const admins = (process.env.ADMIN_TELEGRAM_IDS || "")
        .split(",")
        .map((x: string) => x.trim())
        .filter(Boolean);
      if (!admins.includes(String(cb.from.id))) {
        await answerCallback(cb.id, "ፈቃድ የለዎትም።");
        return NextResponse.json({ ok: true });
      }

      const data = String(cb.data);
      const adminTelegramId = String(cb.from.id);

      // Find admin user id
      const { data: adminUser } = await db
        .from("users")
        .select("id")
        .eq("telegram_id", adminTelegramId)
        .maybeSingle();

      if (data.startsWith("dep_ok_") || data.startsWith("dep_no_")) {
        const id = data.replace("dep_ok_", "").replace("dep_no_", "");
        const approve = data.startsWith("dep_ok_");
        if (adminUser?.id) {
          const { error } = await db.rpc("admin_deposit", {
            p_admin_id: adminUser.id,
            p_deposit_id: id,
            p_approve: approve,
          });
          if (error) {
            await answerCallback(cb.id, "ስህተት: " + error.message);
          } else {
            await answerCallback(cb.id, approve ? "ዲፖዚት ተፈቅዷል ✅" : "ዲፖዚት ተቀባይነት አላገኘም ❌");
            // Notify user
            const { data: dep } = await db
              .from("deposits")
              .select("user_id")
              .eq("id", id)
              .maybeSingle();
            if (dep?.user_id) {
              const { data: u } = await db
                .from("users")
                .select("telegram_id")
                .eq("id", dep.user_id)
                .maybeSingle();
              if (u?.telegram_id) {
                await send(
                  u.telegram_id,
                  approve
                    ? "✅ ዲፖዚትዎ ተፈቅዷል። ገንዘቡ ወደ ዋሌትዎ ገብቷል።"
                    : "❌ የዲፖዚት ጥያቄዎ ተቀባይነት አላገኘም።"
                );
              }
            }
          }
        }
      } else if (data.startsWith("wd_ok_") || data.startsWith("wd_no_")) {
        const id = data.replace("wd_ok_", "").replace("wd_no_", "");
        const approve = data.startsWith("wd_ok_");
        if (adminUser?.id) {
          const { error } = await db.rpc("admin_withdraw", {
            p_admin_id: adminUser.id,
            p_withdrawal_id: id,
            p_approve: approve,
          });
          if (error) {
            await answerCallback(cb.id, "ስህተት: " + error.message);
          } else {
            await answerCallback(cb.id, approve ? "ክፍያ ተከናውኗል ✅" : "ተቀባይነት አላገኘም ❌");
            const { data: wd } = await db
              .from("withdrawals")
              .select("user_id")
              .eq("id", id)
              .maybeSingle();
            if (wd?.user_id) {
              const { data: u } = await db
                .from("users")
                .select("telegram_id")
                .eq("id", wd.user_id)
                .maybeSingle();
              if (u?.telegram_id) {
                await send(
                  u.telegram_id,
                  approve
                    ? "✅ የማውጣት ጥያቄዎ ተከፍሏል። ገንዘቡ ወደ ሂሳብዎ ገብቷል።"
                    : "❌ የማውጣት ጥያቄዎ ተቀባይነት አላገኘም።"
                );
              }
            }
          }
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Normal messages
    const msg = update?.message;
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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram-webhook" });
}
