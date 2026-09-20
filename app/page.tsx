'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.initData) {
        tg.ready();
        tg.expand();
        setIsTelegram(true);
      } else {
        setIsTelegram(false);
      }
    }
  }, []);

  if (isTelegram === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
        <div className="bg-sky-500 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4 shadow-lg shadow-sky-500/30">
          S
        </div>
        <h1 className="text-2xl font-extrabold tracking-wide mb-6">SERA TIME</h1>
        <a
          href="https://t.me/your_bot_username" 
          className="bg-red-900/40 text-red-200 border border-red-800/50 px-6 py-3 rounded-xl font-medium hover:bg-red-900/60 transition"
        >
          Telegram ላይ Sera Timeን ክፈቱ
        </a>
      </div>
    );
  }

  return (
    <main className="p-4 text-white">
      {/* Your main Sera Time App UI */}
    </main>
  );
}
