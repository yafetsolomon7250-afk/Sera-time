'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const initTelegram = () => {
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;

        // Signal to Telegram that the Mini App is ready
        tg.ready();
        tg.expand();

        // Check for initData string which Telegram injects inside the app
        if (tg.initData && tg.initData.length > 0) {
          setIsTelegram(true);
          if (tg.initDataUnsafe?.user) {
            setUserData(tg.initDataUnsafe.user);
          }
        } else {
          // Accessed in external browser without Telegram context
          setIsTelegram(false);
        }
      } else {
        setIsTelegram(false);
      }
    };

    initTelegram();
  }, []);

  // 1. Loading screen while detecting runtime context
  if (isTelegram === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="animate-pulse text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-xl font-bold">
            S
          </div>
          <p className="text-slate-400 font-medium">Loading Sera Time...</p>
        </div>
      </div>
    );
  }

  // 2. Fallback screen for direct web browser access
  if (!isTelegram) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white text-center">
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

  // 3. Main Sera Time Interface inside Telegram
  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="mx-auto max-w-md space-y-6">
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 font-bold">
              S
            </div>
            <div>
              <h1 className="font-bold text-lg">Sera Time</h1>
              <p className="text-xs text-slate-400">
                {userData ? `Welcome, ${userData.first_name}` : 'Welcome back'}
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-slate-900 p-5 border border-slate-800">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Dashboard
          </h2>
          <p className="text-slate-200">
            Your Telegram Mini App is connected and running successfully!
          </p>
        </section>
      </div>
    </main>
  );
}
