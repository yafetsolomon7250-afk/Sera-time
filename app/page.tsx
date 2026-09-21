'use client';

import { useEffect, useState } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export default function Home() {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;

      if (tg && tg.initData) {
        tg.ready();
        tg.expand();
        setIsTelegram(true);

        if (tg.initDataUnsafe?.user) {
          setUser(tg.initDataUnsafe.user);
        }
      } else {
        setIsTelegram(false);
      }
      setLoading(false);
    }
  }, []);

  if (loading || isTelegram === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d131f] text-white">
        <div className="animate-pulse text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500 font-bold text-lg">
            S
          </div>
          <p className="text-slate-400 text-sm">Loading Sera Time...</p>
        </div>
      </div>
    );
  }

  if (!isTelegram) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d131f] p-6 text-white text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500 text-2xl font-bold shadow-lg shadow-sky-500/30">
          S
        </div>
        <h1 className="mb-6 text-2xl font-extrabold tracking-wide">SERA TIME</h1>
        <a
          href="https://t.me/your_bot_username"
          className="rounded-xl border border-red-800/50 bg-red-900/40 px-6 py-3 font-medium text-red-200 transition hover:bg-red-900/60"
        >
          Telegram ላይ Sera Timeን ክፈቱ
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d131f] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#151c2c]/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-black shadow-md shadow-sky-500/20">
            S
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide leading-none">Sera Time</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {user ? `@${user.username || user.first_name}` : 'Welcome'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        {/* User Greeting Card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#1a2336] to-[#121824] p-5 border border-slate-800/80 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">
            Dashboard
          </p>
          <h2 className="text-xl font-bold text-white">
            Hello, {user?.first_name || 'User'} 👋
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Your Sera Time account is active and connected.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#151c2c] p-4 border border-slate-800/80">
            <span className="text-xs text-slate-400">Balance</span>
            <p className="text-lg font-extrabold text-white mt-1">0.00 ETB</p>
          </div>
          <div className="rounded-xl bg-[#151c2c] p-4 border border-slate-800/80">
            <span className="text-xs text-slate-400">Tasks</span>
            <p className="text-lg font-extrabold text-white mt-1">0 Active</p>
          </div>
        </div>
      </main>
    </div>
  );
}
