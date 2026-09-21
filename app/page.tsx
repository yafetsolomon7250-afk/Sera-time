'use client';

import { useEffect, useState } from 'react';

type Role = 'worker' | 'client';
type WorkerTab = 'home' | 'tasks' | 'mytasks' | 'invite' | 'wallet';
type ClientTab = 'home' | 'post' | 'myposts';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [banned, setBanned] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('worker');
  const [workerTab, setWorkerTab] = useState<WorkerTab>('home');
  const [clientTab, setClientTab] = useState<ClientTab>('home');

  // User state
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  // Form states
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('Telebirr');
  const [accountNum, setAccountNum] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();

      const tgUser = tg.initDataUnsafe?.user;
      if (tgUser) {
        // Authenticate with server
        fetch('/api/get-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegram_id: tgUser.id,
            username: tgUser.username,
            first_name: tgUser.first_name,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error === 'banned') {
              setBanned(data.message);
            } else if (data.user) {
              setUser(data.user);
              setRole(data.user.role || 'worker');
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d131f] text-cyan-400 font-sans">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-2xl animate-bounce shadow-lg shadow-cyan-500/30">
            S
          </div>
          <p className="text-sm tracking-wider font-semibold animate-pulse">Sera Time በመጫን ላይ...</p>
        </div>
      </div>
    );
  }

  // Banned UI View
  if (banned) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d131f] p-6 text-center text-white font-sans">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 border border-red-500/30 text-red-500 text-4xl">
          ⚠️
        </div>
        <h1 className="text-2xl font-black text-red-400 mb-2">መለያዎ ታግዷል (Banned)</h1>
        <p className="text-sm text-slate-300 max-w-xs leading-relaxed bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          {banned}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d131f] text-slate-100 flex flex-col font-sans pb-20">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 bg-[#121929]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-cyan-500/20">
            S
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide leading-none text-white">SERA TIME</h1>
            <p className="text-[11px] text-cyan-400 mt-0.5 font-medium">
              {role === 'worker' ? '🛠️ ሠራተኛ (Worker)' : '📢 አጣሪ/ፖስተር (Client)'}
            </p>
          </div>
        </div>

        {/* Role Switcher Button */}
        <button
          onClick={() => setRole(role === 'worker' ? 'client' : 'worker')}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition font-medium"
        >
          ወደ {role === 'worker' ? 'Client' : 'Worker'} ቀይር
        </button>
      </header>

      {/* WORKER VIEW PORTAL */}
      {role === 'worker' && (
        <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
          {/* WORKER HOME */}
          {workerTab === 'home' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-[#1a2438] to-[#121824] p-5 border border-slate-800 shadow-xl relative overflow-hidden">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">የሠራተኛ የሂሳብ መጠን</span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-3xl font-black text-white">{user?.worker_balance || '0.00'}</span>
                  <span className="text-sm font-semibold text-cyan-400">ETB (ብር)</span>
                </div>
              </div>

              {/* Quick Adsgram Task Link */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-purple-200">📺 ማስታወቂያ በማየት ያግኙ</h3>
                  <p className="text-xs text-purple-300/70 mt-0.5">Adsgram በመጠቀም ተጨማሪ ብር ይሰብስቡ</p>
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs shadow-md shadow-purple-600/30">
                  እይ
                </button>
              </div>
            </div>
          )}

          {/* WORKER TASKS DIRECTORY */}
          {workerTab === 'tasks' && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">የሚገኙ ሥራዎች</h2>
              <div className="p-6 rounded-2xl bg-[#151c2c] border border-slate-800 text-center space-y-2">
                <p className="text-slate-400 text-xs">በአሁኑ ሰዓት ክፍት ሥራዎች አልተገኙም።</p>
              </div>
            </div>
          )}

          {/* WORKER WALLET */}
          {workerTab === 'wallet' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#151c2c] border border-slate-800 space-y-3">
                <h3 className="font-bold text-sm text-white">💸 ብር ማውጫ (Withdrawal)</h3>
                <p className="text-xs text-slate-400">አነስተኛው የማውጫ መጠን 1000 ETB ነው።</p>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">የባንክ / ሞባይል ባንኪንግ ዓይነት</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                    >
                      <option value="Telebirr">Telebirr</option>
                      <option value="CBE">የኢትዮጵያ ንግድ ባንክ (CBE)</option>
                      <option value="BOA">አቢሲንያ ባንክ</option>
                      <option value="Awash">አዋሽ ባንክ</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">ሙሉ ስም</label>
                    <input
                      type="text"
                      placeholder="አበበ በቀለ"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">የሂሳብ ቁጥር (Account / Phone)</label>
                    <input
                      type="text"
                      placeholder="09..."
                      value={accountNum}
                      onChange={(e) => setAccountNum(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">የብር መጠን (ETB)</label>
                    <input
                      type="number"
                      placeholder="1000"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                    />
                  </div>

                  <button className="w-full mt-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition">
                    ገንዘብ አውጣ
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WORKER INVITE */}
          {workerTab === 'invite' && (
            <div className="p-5 rounded-2xl bg-[#151c2c] border border-slate-800 text-center space-y-3">
              <h3 className="font-bold text-base text-white">👥 ጓደኞችዎን ይጋብዙ</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ጋብዘዋቸው እያንዳንዱን ሥራ ሲያጠናቅቁ የ 5% ኮሚሽን ያግኙ!
              </p>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-cyan-400 select-all break-all">
                https://t.me/seratime_bot?start={user?.telegram_id || ''}
              </div>
            </div>
          )}
        </main>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      {role === 'worker' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#121929]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 flex justify-around items-center z-50">
          {(['home', 'tasks', 'mytasks', 'invite', 'wallet'] as WorkerTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setWorkerTab(tab)}
              className={`flex flex-col items-center text-[10px] font-medium transition ${
                workerTab === tab ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-base mb-0.5">
                {tab === 'home' && '🏠'}
                {tab === 'tasks' && '📋'}
                {tab === 'mytasks' && '📂'}
                {tab === 'invite' && '🎁'}
                {tab === 'wallet' && '💳'}
              </span>
              <span className="capitalize">{tab}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
