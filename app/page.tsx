'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
      setIsTelegram(true);
    } else {
      setIsTelegram(false);
    }
  }, []);

  if (isTelegram === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d131f] text-white">
        <p className="animate-pulse text-slate-400">Loading Sera Time...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d131f] text-white flex flex-col items-center justify-between p-6">
      <header className="w-full flex justify-between items-center py-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-black">
            S
          </div>
          <span className="font-semibold text-lg tracking-wide">Sera Time</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-sm">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-4xl font-extrabold shadow-lg shadow-cyan-500/20">
          S
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-wider">SERA TIME</h1>
          <p className="text-slate-400 text-sm">
            Your platform is ready and connected inside Telegram.
          </p>
        </div>
      </main>

      <footer className="w-full text-center text-xs text-slate-500 py-4">
        © Sera Time. All rights reserved.
      </footer>
    </div>
  );
}
