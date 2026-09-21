import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: { bodyParser: true },
};

async function send(chatId: number | string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const app = process.env.APP_URL;
  if (!token) return;

  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };

  if (app) {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, service: "telegram-webhook" });
    }

    // Optional secret check
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expected) {
      const got = req.headers["x-telegram-bot-api-secret-token"];
      if (got !== expected) {
        return res.status(401).json({ ok: false });
      }
    }

    const update = req.body || {};
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
  } catch {
    return res.status(200).json({ ok: true });
  }
}
