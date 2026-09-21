import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sera-time-zhyo.vercel.app';

export async function POST(req: Request) {
  try {
    const update = await req.json();

    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // Handle /start command
      if (text.startsWith('/start')) {
        const messageText = "Welcome to **Sera Time**!\n\nClick the button below to launch the application.";

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🚀 Open Sera Time',
                    web_app: { url: WEBAPP_URL },
                  },
                ],
              ],
            },
          }),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    // Return 200 OK even on error to prevent Telegram from repeatedly retrying failed requests
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Telegram Webhook Endpoint Active' });
}
