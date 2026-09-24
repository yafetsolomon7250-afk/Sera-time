"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Telegram?: { WebApp?: any };
    Adsgram?: any;
  }
}

type Role = "worker" | "client";
type Tab =
  | "home"
  | "tasks"
  | "my"
  | "invite"
  | "wallet"
  | "post"
  | "posts"
  | "deposits"
  | "notifications"
  | "admin";

type Category = { key: string; label: string; icon: string; group: string };

const CATEGORIES: Category[] = [
  { key: "graphic_design", label: "ግራፊክ ዲዛይን", icon: "🎨", group: "ዲዛይን" },
  { key: "logo_design", label: "ሎጎ ዲዛይን", icon: "✨", group: "ዲዛይን" },
  { key: "ui_ux", label: "UI/UX ዲዛይን", icon: "🧩", group: "ዲዛይን" },
  { key: "presentation_design", label: "Presentation ዲዛይን", icon: "📊", group: "ዲዛይን" },
  { key: "illustration", label: "Illustration", icon: "🖌️", group: "ዲዛይን" },
  { key: "3d_design", label: "3D ዲዛይን", icon: "🧊", group: "ዲዛይን" },
  { key: "video_editing", label: "ቪዲዮ ኤዲቲንግ", icon: "🎬", group: "ሚዲያ" },
  { key: "photo_editing", label: "ፎቶ ኤዲቲንግ", icon: "📸", group: "ሚዲያ" },
  { key: "motion_graphics", label: "Motion Graphics", icon: "💫", group: "ሚዲያ" },
  { key: "animation", label: "Animation", icon: "🎞️", group: "ሚዲያ" },
  { key: "voice_over", label: "Voice Over", icon: "🎙️", group: "ሚዲያ" },
  { key: "audio_editing", label: "Audio ኤዲቲንግ", icon: "🎧", group: "ሚዲያ" },
  { key: "photography", label: "Photography", icon: "📷", group: "ሚዲያ" },
  { key: "writing", label: "ጽሑፍ / Copywriting", icon: "✍️", group: "ቋንቋ" },
  { key: "translation", label: "ትርጉም", icon: "🌐", group: "ቋንቋ" },
  { key: "transcription", label: "Transcription", icon: "⌨️", group: "ቋንቋ" },
  { key: "proofreading", label: "Proofreading", icon: "📝", group: "ቋንቋ" },
  { key: "data_entry", label: "Data Entry", icon: "⌨️", group: "ዳታ" },
  { key: "excel", label: "Excel / Sheets", icon: "📈", group: "ዳታ" },
  { key: "data_analysis", label: "Data Analysis", icon: "📉", group: "ዳታ" },
  { key: "web_research", label: "Web Research", icon: "🔎", group: "ዳታ" },
  { key: "programming", label: "Programming", icon: "💻", group: "ቴክኖሎጂ" },
  { key: "website_development", label: "Website Development", icon: "🌍", group: "ቴክኖሎጂ" },
  { key: "mobile_app", label: "Mobile App Development", icon: "📱", group: "ቴክኖሎጂ" },
  { key: "api_development", label: "API Development", icon: "🔌", group: "ቴክኖሎጂ" },
  { key: "wordpress", label: "WordPress", icon: "📰", group: "ቴክኖሎጂ" },
  { key: "automation", label: "Automation", icon: "⚙️", group: "ቴክኖሎጂ" },
  { key: "ai_services", label: "AI አገልግሎት", icon: "🤖", group: "AI" },
  { key: "prompt_engineering", label: "Prompt Engineering", icon: "🧠", group: "AI" },
  { key: "ai_content", label: "AI Content", icon: "✨", group: "AI" },
  { key: "marketing", label: "Marketing", icon: "📣", group: "ንግድ" },
  { key: "social_media", label: "Social Media", icon: "📱", group: "ንግድ" },
  { key: "seo", label: "SEO", icon: "🚀", group: "ንግድ" },
  { key: "lead_generation", label: "Lead Generation", icon: "🎯", group: "ንግድ" },
  { key: "virtual_assistant", label: "Virtual Assistant", icon: "🧑‍💼", group: "ንግድ" },
  { key: "customer_support", label: "Customer Support", icon: "💬", group: "ንግድ" },
  { key: "marketing_strategy", label: "Marketing Strategy", icon: "🗺️", group: "ንግድ" },
  { key: "research", label: "Research", icon: "🔬", group: "ሙያ" },
  { key: "business_plan", label: "Business Plan", icon: "📋", group: "ሙያ" },
  { key: "accounting", label: "Accounting", icon: "🧾", group: "ሙያ" },
  { key: "architecture", label: "Architecture", icon: "🏗️", group: "ሙያ" },
  { key: "engineering", label: "Engineering", icon: "🛠️", group: "ሙያ" },
  { key: "education", label: "Education / Tutoring", icon: "🎓", group: "ሙያ" },
  { key: "other", label: "ሌላ ችሎታ", icon: "➕", group: "ሌላ" },
];

const ETHIOPIAN_BANKS = [
  { value: "telebirr", label: "Telebirr" },
  { value: "cbe", label: "Commercial Bank of Ethiopia (CBE)" },
  { value: "awash", label: "Awash Bank" },
  { value: "dashen", label: "Dashen Bank" },
  { value: "abyssinia", label: "Bank of Abyssinia" },
  { value: "wegagen", label: "Wegagen Bank" },
  { value: "united", label: "United Bank" },
  { value: "nib", label: "Nib International Bank" },
  { value: "cooperative", label: "Cooperative Bank of Oromia" },
  { value: "lion", label: "Lion International Bank" },
  { value: "zemen", label: "Zemen Bank" },
  { value: "bunna", label: "Bunna International Bank" },
  { value: "abay", label: "Abay Bank" },
  { value: "berhan", label: "Berhan Bank" },
  { value: "addis", label: "Addis International Bank" },
  { value: "enat", label: "Enat Bank" },
  { value: "hijra", label: "Hijra Bank" },
  { value: "siinqee", label: "Siinqee Bank" },
  { value: "tsehay", label: "Tsehay Bank" },
  { value: "amhara", label: "Amhara Bank" },
  { value: "other_bank", label: "ሌላ ባንክ" },
];

const cat = (key: string) => CATEGORIES.find((x) => x.key === key);
const catLabel = (key: string) => {
  const x = cat(key);
  return x ? `${x.icon} ${x.label}` : key;
};
const money = (v: any) => `${Number(v || 0).toFixed(2)} ብር`;
const statusLabel = (s: string) =>
  (
    ({
      open: "ክፍት",
      assigned: "ተመድቧል",
      submitted: "ተልኳል",
      revision_requested: "ማሻሻያ",
      disputed: "ክርክር",
      completed: "ተጠናቋል",
      cancelled: "ተሰርዟል",
      expired: "ጊዜው አልፏል",
    }) as Record<string, string>
  )[s] || s;

function getGuestId() {
  try {
    let g = localStorage.getItem("sera_guest_id");
    if (!g) {
      g = "web_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("sera_guest_id", g);
    }
    return g;
  } catch {
    return "web_" + Math.random().toString(36).slice(2, 12);
  }
}

async function api(action: string, body: any = {}) {
  const webApp = window.Telegram?.WebApp;
  const initData = webApp?.initData || "";
  const guestId = initData ? "" : getGuestId();
  const ref = new URLSearchParams(window.location.search).get("tgWebAppStartParam")
    || new URLSearchParams(window.location.search).get("ref")
    || "";
  const r = await fetch(`/api/sera`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, action, initData, guestId, ref }),
  });
  const d = await r.json().catch(() => ({ error: "Server returned an invalid response" }));
  if (!r.ok) throw new Error(d.error || "አንድ ችግር ተፈጥሯል");
  return d;
}

async function uploadFile(file: File) {
  const webApp = window.Telegram?.WebApp;
  const initData = webApp?.initData || "";
  const fd = new FormData();
  fd.append("file", file);
  fd.append("initData", initData);
  const r = await fetch("/api/upload", { method: "POST", body: fd });
  const d = await r.json().catch(() => ({ error: "Upload failed" }));
  if (!r.ok) throw new Error(d.error || "ፋይል መጫን አልተሳካም");
  return d as { url: string; path: string; name: string; type: string; size: number };
}

function useCountdown(deadline: string | null) {
  const [left, setLeft] = useState("");
  const [urgent, setUrgent] = useState(false);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const ms = new Date(deadline).getTime() - Date.now();
      if (ms <= 0) {
        setLeft("ጊዜው አልፏል");
        setUrgent(true);
        return;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(`${h}ሰ ${m}ደ ${s}ሰ`);
      setUrgent(ms < 3600000);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return { left, urgent };
}

export default function App() {
  const [me, setMe] = useState<any>(null);
  const [role, setRole] = useState<Role>("worker");
  const [tab, setTab] = useState<Tab>("home");
  const [data, setData] = useState<any>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [onboard, setOnboard] = useState(false);
  const [telegramReady, setTelegramReady] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const tried = useRef(false);

  const loadMe = useCallback(async () => {
    setLoading(true);
    setError("");
    // Wait briefly for Telegram WebApp script (inside bot)
    await new Promise((r) => setTimeout(r, 400));
    const wa = window.Telegram?.WebApp;
    const hasTg = !!(wa && wa.initData);

    if (hasTg) {
      try {
        wa.ready?.();
        wa.expand?.();
        wa.setBackgroundColor?.("#07111f");
        wa.setHeaderColor?.("#07111f");
      } catch {}
      setTelegramReady(true);
    } else {
      // Browser / outside Telegram → guest mode
      setTelegramReady(true);
    }

    try {
      const x = await api("me");
      setMe(x.user);
      const saved = localStorage.getItem("sera_role");
      const initial =
        saved === "worker" || saved === "client"
          ? saved
          : x.user?.active_role === "client"
          ? "client"
          : "worker";
      setRole(initial as Role);
      if (!saved) setOnboard(true);
    } catch (e: any) {
      setError(e.message || "መግባት አልተሳካም");
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    loadMe();
  }, [loadMe]);

  const chooseRole = async (r: Role) => {
    try {
      await api("set-role", { role: r });
      setRole(r);
      localStorage.setItem("sera_role", r);
      setOnboard(false);
      setTab("home");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const load = useCallback(
    async (t: Tab = tab) => {
      if (!me) return;
      setError("");
      try {
        let x: any = {};
        if (t === "home") x = await api("dashboard", { role });
        else if (t === "tasks") x = await api("tasks");
        else if (t === "my") x = await api("my-tasks");
        else if (t === "invite") x = await api("referrals");
        else if (t === "wallet") x = await api("wallet");
        else if (t === "posts") x = await api("my-posts");
        else if (t === "deposits") x = await api("deposits");
        else if (t === "notifications") x = await api("notifications");
        else if (t === "admin") x = await api("admin-dashboard");
        setData(x);
      } catch (e: any) {
        setError(e.message);
      }
    },
    [me, role, tab]
  );

  useEffect(() => {
    if (me && !onboard) load(tab);
  }, [me, role, tab, onboard, load]);

  if (loading) return <Splash />;
  if (!me) return <LaunchHelp telegramReady={telegramReady} error={error} onRetry={() => { setLoading(true); setRetryCount(0); tried.current = false; loadMe(); }} />;
  if (onboard) return <RolePicker choose={chooseRole} name={me.first_name || ""} />;

  // Banned worker still can use client role
  if (me.banned && role === "worker") {
    return (
      <main className="app picker">
        <div className="pickerInner">
          <div className="banCard">
            <b>🚫 የሰራተኛ መለያዎ ታግዷል</b>
            <p style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5 }}>
              {me.ban_reason || "ምክንያቱ አልተገለጸም።"}
            </p>
            {me.ban_until && (
              <small style={{ color: "var(--muted)" }}>
                እስከ: {new Date(me.ban_until).toLocaleString("am-ET")}
              </small>
            )}
          </div>
          <button className="primaryBtn" style={{ marginTop: 20, width: "100%" }} onClick={() => chooseRole("client")}>
            እንደ ደንበኛ ቀጥል 💼
          </button>
        </div>
      </main>
    );
  }

  const isAdmin = !!me.is_admin;
  const nav: [Tab, string, string][] =
    role === "worker"
      ? [
          ["home", "⌂", "ዋና"],
          ["tasks", "◈", "ስራዎች"],
          ["my", "✓", "የእኔ"],
          ["invite", "♧", "ግብዣ"],
          ["wallet", "◉", "ዋሌት"],
        ]
      : [
          ["home", "⌂", "ዋና"],
          ["post", "＋", "ስራ ለጥፍ"],
          ["posts", "▣", "ልጥፎች"],
          ["deposits", "＋", "አስገባ"],
          ["wallet", "◉", "ዋሌት"],
        ];

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="app">
      <header className="header">
        <div className="brand">
          <div className="mini">S</div>
          <div>
            <strong>SERA TIME</strong>
            <span>ስራ • ገቢ • እድል</span>
          </div>
        </div>
        <div className="headActions">
          <button className="circle" onClick={() => go("notifications")} aria-label="ማሳወቂያ">
            ♧
          </button>
          <button className="roleBtn" onClick={() => setOnboard(true)}>
            {role === "worker" ? "💼 ደንበኛ" : "👷 ሰራተኛ"}
          </button>
        </div>
      </header>

      {error && (
        <div className="error topError">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      <section className="content">
        {tab === "home" && <Home data={data} role={role} go={go} />}
        {tab === "tasks" && <Tasks data={data} reload={() => load("tasks")} />}
        {tab === "my" && <MyTasks data={data} reload={() => load("my")} />}
        {tab === "invite" && <Invite data={data} />}
        {tab === "wallet" && <Wallet data={data} reload={() => load("wallet")} />}
        {tab === "post" && <Post onDone={() => { go("posts"); load("posts"); }} />}
        {tab === "posts" && <Posts data={data} reload={() => load("posts")} />}
        {tab === "deposits" && <Deposits data={data} reload={() => load("deposits")} />}
        {tab === "notifications" && <Notifications data={data} reload={() => load("notifications")} />}
        {tab === "admin" && isAdmin && <Admin data={data} reload={() => load("admin")} />}
      </section>

      <nav className="bottom">
        {nav.map(([id, icon, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => go(id)}>
            <span>{icon}</span>
            {label}
          </button>
        ))}
        {isAdmin && (
          <button className={tab === "admin" ? "active" : ""} onClick={() => go("admin")}>
            <span>⚙</span>
            አስተዳደር
          </button>
        )}
      </nav>
    </main>
  );
}

/* ========== Splash / Launch / Role ========== */

function Splash() {
  return (
    <main className="app">
      <div className="splash">
        <div className="mark">S</div>
        <h1>SERA TIME</h1>
        <p>እባክዎ ትንሽ ይጠብቁ…</p>
      </div>
    </main>
  );
}

function LaunchHelp({
  telegramReady,
  error,
  onRetry,
}: {
  telegramReady: boolean;
  error: string;
  onRetry: () => void;
}) {
  return (
    <main className="app picker">
      <div className="pickerInner">
        <div className="mark big">S</div>
        <div className="eyebrow">SERA TIME</div>
        <h1>{telegramReady ? "Telegram ማረጋገጫ አልተገኘም" : "ከTelegram ውስጥ ይክፈቱ"}</h1>
        <p className="muted centerText">
          {error || "ይህን መተግበሪያ ከSera Time Bot ውስጥ ባለው 🚀 ክፈት ቁልፍ ብቻ ይክፈቱ።"}
        </p>

        <div className="launchSteps">
          <div className="launchStep">
            <div className="num">1</div>
            <div>
              <b>Sera Time Bot ይክፈቱ</b>
              <span>Telegram ላይ @YourBotUsername ይፈልጉ</span>
            </div>
          </div>
          <div className="launchStep">
            <div className="num">2</div>
            <div>
              <b>/start ይላኩ</b>
              <span>ቦቱ የእንኳን ደህና መጡ መልእክት ይልክልዎታል</span>
            </div>
          </div>
          <div className="launchStep">
            <div className="num">3</div>
            <div>
              <b>🚀 Sera Timeን ክፈት ይጫኑ</b>
              <span>ከታች ያለውን አረንጓዴ ቁልፍ ይጫኑ</span>
            </div>
          </div>
        </div>

        <p className="tiny" style={{ marginTop: 20 }}>
          የVercel ሊንኩን በቀጥታ በብራውዘር መክፈት አይሰራም። ሁልጊዜ ከBot ውስጥ ይክፈቱ።
        </p>

        <button className="secondary" style={{ marginTop: 16, padding: "10px 18px", borderRadius: 12 }} onClick={onRetry}>
          እንደገና ሞክር
        </button>
      </div>
    </main>
  );
}

function RolePicker({ choose, name }: { choose: (r: Role) => void; name: string }) {
  return (
    <main className="app picker">
      <div className="pickerInner">
        <div className="mark big">S</div>
        <div className="eyebrow">እንኳን ወደ Sera Time በደህና መጡ 👋</div>
        <h1>{name ? `${name}፣ እንኳን ደህና መጡ` : "የሚፈልጉትን ይምረጡ"}</h1>
        <p className="muted centerText">እንደ ሰራተኛ ገቢ ያግኙ ወይም እንደ ደንበኛ ስራ ይለጥፉ።</p>
        <div className="roleCards">
          <button onClick={() => choose("worker")}>
            <span>👷</span>
            <b>ሰራተኛ</b>
            <small>ስራዎችን ይቀበሉ፣ ይስሩ እና ገቢ ያግኙ</small>
          </button>
          <button onClick={() => choose("client")}>
            <span>💼</span>
            <b>ደንበኛ</b>
            <small>ስራ ይለጥፉ እና ተስማሚ ሰራተኛ ያግኙ</small>
          </button>
        </div>
        <p className="tiny">ሚናዎን በኋላ ማቀያየር ይችላሉ።</p>
      </div>
    </main>
  );
}

/* ========== Shared small components ========== */

function PageTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="pageTitle">
      <h2>{title}</h2>
      <p>{sub}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <span>○</span>
      <b>{text}</b>
      <small>ምድቡ ክፍት ነው። አዲስ ስራ ሲመጣ እዚህ ይታያል።</small>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: any }) {
  return (
    <div className="stat">
      <span className="statIcon">{icon}</span>
      <span className="statLabel">{label}</span>
      <b>{value}</b>
    </div>
  );
}

/* ========== Home ========== */

function Home({ data, role, go }: any) {
  const [adBusy, setAdBusy] = useState(false);
  const ads = data.ads || { completed: 0, limit: 5 };

  const showAd = async () => {
    if (adBusy || ads.completed >= ads.limit) return;
    setAdBusy(true);
    try {
      const block = process.env.NEXT_PUBLIC_ADSGRAM_BLOCK_ID || "";
      if (block && window.Adsgram) {
        const c = window.Adsgram.init({ blockId: block });
        const r = await c.show();
        if (!r?.done) throw new Error("ማስታወቂያው አልተጠናቀቀም");
      }
      // Always credit via our API (works even without AdsGram in test)
      const res = await api("claim-ad");
      alert(`✅ +${res.reward} ብር ተጨምሯል! ቀሪ: ${res.remaining}`);
      location.reload();
    } catch (e: any) {
      alert(e.message || "ማስታወቂያ አልተሳካም");
    } finally {
      setAdBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="hero">
        <div className="heroGlow" />
        <div className="heroMark">S</div>
        <div>
          <div className="eyebrow">{role === "worker" ? "የስራ መድረክ" : "የስራ ማስተናገጃ መድረክ"}</div>
          <h1>{role === "worker" ? "ስራ ይስሩ፣ ገቢ ያግኙ" : "ስራዎን ይለጥፉ፣ ውጤት ያግኙ"}</h1>
          <p>{(() => { const h = new Date().getHours(); return h < 12 ? "እንደምን አደሩ ☀️" : h < 18 ? "እንደምን አረፈዱ 🌤" : "እንደምን አመሹ 🌙"; })()} · በSera Time ፈጣንና የተጠበቀ ልውውጥ።</p>
        </div>
      </div>

      <div className="statGrid">
        <Stat icon="◉" label="ያለዎት ሂሳብ" value={money(data.wallet?.available)} />
        <Stat
          icon={role === "worker" ? "↗" : "↘"}
          label={role === "worker" ? "ጠቅላላ ገቢ" : "ጠቅላላ ወጪ"}
          value={money(role === "worker" ? data.wallet?.earned : data.wallet?.spent)}
        />
        <Stat icon="✓" label="የተጠናቀቁ" value={data.completed || 0} />
        <Stat icon="♧" label="ሪፈራል ገቢ" value={money(data.referralEarned)} />
      </div>

      {role === "worker" && (
        <div className="adCard">
          <div>
            <b>🎁 ተጨማሪ ገቢ</b>
            <span>
              ማስታወቂያ ይመልከቱ • 2 ብር • {ads.completed}/{ads.limit}
            </span>
          </div>
          <button disabled={adBusy || ads.completed >= ads.limit} onClick={showAd}>
            {adBusy ? "እየተጫነ…" : "ይመልከቱ"}
          </button>
        </div>
      )}

      <div className="sectionHead">
        <h2>ፈጣን መጀመሪያ</h2>
      </div>
      <div className="quickGrid">
        <button onClick={() => go(role === "worker" ? "tasks" : "post")}>
          <span>{role === "worker" ? "◈" : "＋"}</span>
          {role === "worker" ? "ስራዎችን ይመልከቱ" : "ስራ ይለጥፉ"}
        </button>
        <button onClick={() => go("wallet")}>
          <span>◉</span>
          ዋሌት
        </button>
        <button onClick={() => go("notifications")}>
          <span>♧</span>
          ማሳወቂያ
        </button>
        <button onClick={() => go("invite")}>
          <span>♧</span>
          ግብዣ · 5%
        </button>
      </div>

      <div className="progressCard card">
        <div className="rowBetween"><span>ወደ ቀጣይ ደረጃ</span><b>{(data.xp || 0) % 200}/200 XP</b></div>
        <div className="barTrack"><div className="barFill" style={{ width: `${Math.min(100, ((data.xp || 0) % 200) / 2)}%` }} /></div>
      </div>
    </div>
  );
}

/* ========== Tasks (Worker) ========== */

function Tasks({ data, reload }: any) {
  const [catKey, setCatKey] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"new" | "pay" | "deadline">("new");
  const tasks = data.tasks || [];
  const filtered = tasks.filter(
    (t: any) =>
      (!catKey || t.category === catKey) &&
      (!query || `${t.title} ${t.description}`.toLowerCase().includes(query.toLowerCase()))
  );
  const sorted = [...filtered].sort((a: any, b: any) => {
    if (sort === "pay") return Number(b.worker_payout || b.budget || 0) - Number(a.worker_payout || a.budget || 0);
    if (sort === "deadline") return new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime();
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
  const groups = [...new Set(CATEGORIES.map((x) => x.group))];
  const activeCat = CATEGORIES.find((c) => c.key === catKey);

  // Full-screen skill page when a category is opened
  if (catKey && activeCat) {
    return (
      <div className="skillFull">
        <div className="skillHeader">
          <button className="back" type="button" onClick={() => setCatKey("")}>←</button>
          <div>
            <div style={{ fontSize: 22 }}>{activeCat.icon} {activeCat.label}</div>
            <small style={{ color: "var(--muted)" }}>{sorted.length} ስራ ይገኛል</small>
          </div>
        </div>
        <div className="searchBox" style={{ marginBottom: 12 }}>
          <span>⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="በዚህ ችሎታ ውስጥ ፈልግ…" />
        </div>
        {sorted.map((t: any) => (
          <TaskCard key={t.id} t={t} reload={reload} />
        ))}
        {!sorted.length && <Empty text={`${activeCat.label} ላይ አሁን ስራ የለም`} />}
      </div>
    );
  }

  return (
    <div className="stack">
      <PageTitle title="ስራዎች" sub="ችሎታ ይምረጡ — ለእያንዳንዱ ችሎታ የራሱ ገጽ ይከፈታል።" />
      <div className="chipRow">
        <button type="button" className={"chip" + (sort === "new" ? " on" : "")} onClick={() => setSort("new")}>አዲስ</button>
        <button type="button" className={"chip" + (sort === "pay" ? " on" : "")} onClick={() => setSort("pay")}>ከፍተኛ ክፍያ</button>
        <button type="button" className={"chip" + (sort === "deadline" ? " on" : "")} onClick={() => setSort("deadline")}>ቅርብ ጊዜ</button>
        <button type="button" className="chip" onClick={() => reload()}>🔄 አድስ</button>
      </div>
      <div className="searchBox">
        <span>⌕</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ስራ ወይም ችሎታ ይፈልጉ…" />
      </div>

      <div className="categoryGrid">
        <button className={!catKey ? "selected" : ""} onClick={() => setCatKey("")}>
          <span>✦</span>
          <b>ሁሉም</b>
          <small>{tasks.length} ስራ</small>
        </button>
        {groups.map((g) => (
          <div className="groupBox" key={g}>
            <h4>{g}</h4>
            <div className="categoryGrid inner">
              {CATEGORIES.filter((c) => c.group === g).map((c) => (
                <button key={c.key} onClick={() => { setCatKey(c.key); setQuery(""); }}>
                  <span>{c.icon}</span>
                  <b>{c.label}</b>
                  <small>{tasks.filter((t: any) => t.category === c.key).length} ስራ</small>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!catKey && query && sorted.map((t: any) => (
        <TaskCard key={t.id} t={t} reload={reload} />
      ))}
      {!catKey && !query && (
        <Empty text="ከላይ ችሎታ በመምረጥ ስራዎችን ይመልከቱ" />
      )}
      {!catKey && query && !sorted.length && <Empty text="የፈለጉት ስራ አልተገኘም" />}
    </div>
  );
}

function TaskCard({ t, reload }: { t: any; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="taskCard">
      <div className="taskTop">
        <span className="badge">{catLabel(t.category)}</span>
        <strong>{money(t.worker_reward)}</strong>
      </div>
      <h3>{t.title}</h3>
      <p>{t.description}</p>
      {t.requirements && (
        <div className="requirements">
          <b>መስፈርቶች</b>
          <span>{t.requirements}</span>
        </div>
      )}
      <div className="taskMeta">
        <span>⏱ {new Date(t.deadline_at).toLocaleString("am-ET")}</span>
        <button
          disabled={busy}
          onClick={async () => {
            try {
              setBusy(true);
              await api("accept-task", { taskId: t.id });
              reload();
            } catch (e: any) {
              alert(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "እየተቀበለ…" : "ስራውን ተቀበል"}
        </button>
      </div>
    </div>
  );
}

/* ========== My Tasks ========== */

function MyTasks({ data, reload }: any) {
  return (
    <div className="stack">
      <PageTitle title="የእኔ ስራዎች" sub="አንድ ጊዜ አንድ ንቁ ስራ ብቻ ይያዙ። ጊዜው ካለፈ ታገዳለሁ።" />
      {(data.tasks || []).map((t: any) => (
        <TaskSubmission key={t.id} t={t} reload={reload} />
      ))}
      {!data.tasks?.length && <Empty text="እስካሁን ስራ አልተቀበሉም" />}
    </div>
  );
}

function TaskSubmission({ t, reload }: any) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const can = ["assigned", "revision_requested"].includes(t.status);
  const { left, urgent } = useCountdown(
    ["assigned", "revision_requested"].includes(t.status) ? t.deadline_at : null
  );

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setBusy(true);
      const up = await uploadFile(f);
      setFiles((prev) => [...prev, up]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="taskCard">
      <div className="taskTop">
        <span className="badge">{statusLabel(t.status)}</span>
        <strong>{money(t.worker_reward || t.worker_payout)}</strong>
      </div>
      <h3>{t.title}</h3>
      <p className="taskDesc">{t.description}</p>

      <div className="detailGrid">
        <div className="detailItem"><span>ክፍያ</span><b>{money(t.worker_reward || t.worker_payout)}</b></div>
        <div className="detailItem"><span>ችሎታ</span><b>{t.category || t.skill || "-"}</b></div>
        <div className="detailItem"><span>ሁኔታ</span><b>{statusLabel(t.status)}</b></div>
        <div className="detailItem"><span>ማሻሻያ</span><b>{t.revision_count || 0}/{t.revision_limit || 2}</b></div>
      </div>

      {t.requirements && (
        <div className="infoBox">
          <b>📋 መስፈርቶች</b>
          <p>{t.requirements}</p>
        </div>
      )}
      {t.client_notes && (
        <div className="infoBox">
          <b>💬 የደንበኛ ማስታወሻ</b>
          <p>{t.client_notes}</p>
        </div>
      )}
      {(t.attachment_url || t.brief_url || t.file_url) && (
        <a className="linkBtn" href={t.attachment_url || t.brief_url || t.file_url} target="_blank" rel="noreferrer">
          📎 የስራ ፋይል / ክሊፕ ክፈት
        </a>
      )}
      {t.deadline_at && (
        <div className="infoBox">
          <b>⏰ የመጨረሻ ጊዜ</b>
          <p>{new Date(t.deadline_at).toLocaleString()}</p>
        </div>
      )}

      <div className="taskMeta">
        {left && (
          <span className={`countdown ${urgent ? "danger" : ""}`}>
            ⏱ የቀረው ጊዜ: {left}
          </span>
        )}
      </div>

      {can && (
        <div className="form">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="የሰሩትን ስራ፣ ማገናኛ ወይም የመስሪያ ማስረጃ ያስገቡ"
          />
          <label className="fileBtn">
            📎 ፋይል አያይዝ
            <input type="file" className="fileInput" onChange={onFile} accept="image/*,video/*,audio/*,.pdf,.zip" />
          </label>
          {files.length > 0 && (
            <div className="fileRow">
              {files.map((f, i) => (
                <span className="fileChip" key={i}>
                  {f.name}
                </span>
              ))}
            </div>
          )}
          <button
            disabled={busy || (!content.trim() && files.length === 0)}
            onClick={async () => {
              try {
                setBusy(true);
                await api("submit-task", {
                  taskId: t.id,
                  content,
                  files: files.map((f) => ({ path: f.path, name: f.name, url: f.url })),
                });
                setContent("");
                setFiles([]);
                reload();
              } catch (e: any) {
                alert(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "እየተላከ…" : "ስራውን ላክ"}
          </button>
        </div>
      )}

      {t.status === "submitted" && <div className="infoBox">⏳ ስራዎ ለደንበኛው ግምገማ ተልኳል።</div>}
      {t.status === "completed" && (
        <div className="successBox">✓ ስራዎ ተጠናቋል። ክፍያው በዋሌት ውስጥ ነው።</div>
      )}
      {t.status === "revision_requested" && (
        <div className="warnBox">↻ ማሻሻያ ተጠይቋል። እባክዎ እንደገና ላኩ።</div>
      )}
    </div>
  );
}

/* ========== Invite ========== */

function Invite({ data }: any) {
  const link = data.link || "";
  const list = data.list || data.referrals || [];
  const top = data.topInviters || data.top || [];
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(link);
      alert("ሊንኩ ተቀድቷል ✅");
    } catch {
      alert(link);
    }
  };
  const shareTg = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Sera Time — ስራ ሰርተህ ገቢ አግኝ! 🇪🇹")}`;
    window.open(url, "_blank");
  };
  return (
    <div className="stack">
      <PageTitle title="ግብዣ" sub="ጓደኞችዎን ይጋብዙ · ከተሳካ ስራ 5% ያግኙ" />
      <div className="inviteCard">
        <div className="heroMark" style={{ margin: "0 auto 12px" }}>♧</div>
        <b>የግብዣ ሊንክዎ</b>
        <div className="linkBox">{link || "-"}</div>
        <div className="actions" style={{ justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={copy}>📋 ቅዳ</button>
          <button onClick={shareTg}>✈️ አጋራ</button>
        </div>
      </div>
      <div className="statGrid two">
        <Stat icon="♧" label="የተጋበዙ" value={data.count || list.length || 0} />
        <Stat icon="◉" label="የሪፈራል ገቢ" value={money(data.earned)} />
      </div>

      {top.length > 0 && (
        <div className="card topInviters">
          <h3>🏆 ምርጥ 3 ጋቢዎች</h3>
          {top.slice(0, 3).map((u: any, i: number) => (
            <div className={"topRow rank" + (i + 1)} key={i}>
              <span className="rankBadge">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
              <div>
                <b>{u.first_name || u.name || "ተጠቃሚ"}</b>
                <small>{u.invite_count || u.count || 0} ግብዣ</small>
              </div>
              <strong>{money(u.earned || 0)}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>የተጋበዙ ሰዎች ({list.length})</h3>
        {list.length === 0 && <Empty text="ገና ማንንም አልጋበዙም። ሊንኩን ያጋሩ!" />}
        {list.map((r: any, i: number) => (
          <div className="adminRow" key={r.id || i}>
            <div>
              <b>{r.first_name || r.name || "ተጠቃሚ"}</b>
              <small>
                {r.username ? "@" + r.username + " · " : ""}
                {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
              </small>
            </div>
            <span className="badge">{r.status || "active"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========== Wallet ========== */

function Wallet({ data, reload }: any) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("telebirr");
  const [acct, setAcct] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="stack">
      <div className="walletHero">
        <small>ያለዎት ሂሳብ</small>
        <b>{money(data.available)}</b>
        <small>የተያዘ {money(data.reserved)} · ጠቅላላ ገቢ {money(data.lifetimeEarned)}</small>
      </div>
      <PageTitle title="ዋሌት" sub="ብር ብቻ • ትንሹ ማውጫ 1,000 ብር • በ24 ሰዓት ውስጥ ይደርሳል" />

      <div className="statGrid two">
        <Stat icon="↗" label="ጠቅላላ ገቢ" value={money(data.lifetimeEarned)} />
        <Stat icon="↘" label="ጠቅላላ ወጪ" value={money(data.lifetimeSpent)} />
      </div>

      <div className="form card">
        <h3>ገንዘብ ማውጣት</h3>
        <div className="chipRow">
          {[1000, 2000, 5000, 10000].map((n) => (
            <button type="button" key={n} className={"chip" + (amount === String(n) ? " on" : "")} onClick={() => setAmount(String(n))}>{n}</button>
          ))}
        </div>
        <input
          type="number"
          min="1000"
          placeholder="የሚያወጡት መጠን (ቢያንስ 1000)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          {ETHIOPIAN_BANKS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
        <input
          placeholder="የሂሳብ / Telebirr ቁጥር"
          value={acct}
          onChange={(e) => setAcct(e.target.value)}
        />
        <input placeholder="ሙሉ ስም" value={name} onChange={(e) => setName(e.target.value)} />
        <button
          disabled={busy}
          onClick={async () => {
            try {
              setBusy(true);
              await api("withdraw", {
                amount: Number(amount),
                method,
                accountNumber: acct,
                accountName: name,
              });
              alert("የማውጣት ጥያቄዎ ተልኳል። በ24 ሰዓት ውስጥ ይደርሳል።");
              setAmount("");
              setAcct("");
              setName("");
              reload();
            } catch (e: any) {
              alert(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "እየተላከ…" : "የማውጣት ጥያቄ ላክ"}
        </button>
      </div>

      <div className="card">
        <h3>የግብይት ታሪክ</h3>
        {(data.transactions || []).map((x: any) => (
          <div className="history" key={x.id}>
            <span>{x.description || x.type}</span>
            <b>{money(x.amount)}</b>
          </div>
        ))}
        {!data.transactions?.length && <p className="muted">እስካሁን ግብይት የለም።</p>}
      </div>
    </div>
  );
}

/* ========== Post Task (Client) ========== */

function Post({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState<any>({
    category: CATEGORIES[0].key,
    title: "",
    description: "",
    requirements: "",
    deadlineHours: 24,
    budget: "",
  });
  const [files, setFiles] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF({ ...f, [k]: v });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      const up = await uploadFile(file);
      setFiles((prev) => [...prev, up]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="stack">
      <PageTitle title="ስራ ለጥፍ" sub="ሁሉንም የሚፈለገውን ግልጽ ያድርጉ። 10% የመድረክ ክፍያ ይቀነሳል።" />
      <div className="form card">
        <label>
          የስራ ምድብ
          <select value={f.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          የስራ ርዕስ
          <input
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="ምሳሌ፦ የንግድ ሎጎ እፈልጋለሁ"
          />
        </label>
        <label>
          ዝርዝር መግለጫ
          <textarea
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="ስራው በትክክል ምን ይፈልጋል?"
          />
        </label>
        <label>
          መስፈርቶች / መመሪያ
          <textarea
            value={f.requirements}
            onChange={(e) => set("requirements", e.target.value)}
            placeholder="ፋይል አይነት፣ መጠን፣ ቅርጽ፣ የመጨረሻ ውጤት…"
          />
        </label>
        <label className="fileBtn">
          📎 የመነሻ ፋይል / ሮው ክሊፕ አያይዝ
          <input type="file" className="fileInput" onChange={onFile} accept="image/*,video/*,audio/*,.pdf,.zip" />
        </label>
        {files.length > 0 && (
          <div className="fileRow">
            {files.map((file, i) => (
              <span className="fileChip" key={i}>
                {file.name}
              </span>
            ))}
          </div>
        )}
        <div className="twoFields">
          <label>
            የስራ ጊዜ (ሰዓት)
            <input
              type="number"
              min="1"
              max="720"
              value={f.deadlineHours}
              onChange={(e) => set("deadlineHours", e.target.value)}
            />
          </label>
          <label>
            በጀት (ብር)
            <input
              type="number"
              min="1"
              step="0.01"
              value={f.budget}
              onChange={(e) => set("budget", e.target.value)}
              placeholder="100"
            />
          </label>
        </div>
        <div className="feeBox">
          <span>ሰራተኛ የሚያገኘው</span>
          <b>{money(Number(f.budget || 0) * 0.9)}</b>
          <small>10% የመድረክ ክፍያ ይቀነሳል። ገንዘቡ ስራው እስኪጠናቀቅ ድረስ ተይዞ ይቆያል።</small>
        </div>
        <button
          disabled={busy}
          onClick={async () => {
            try {
              setBusy(true);
              await api("create-task", {
                ...f,
                budget: Number(f.budget),
                files: files.map((x) => ({ path: x.path, name: x.name, url: x.url })),
              });
              alert("ስራው ተለጥፏል።");
              onDone();
            } catch (e: any) {
              alert(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "እየተለጠፈ…" : "ስራውን ለጥፍ"}
        </button>
      </div>
    </div>
  );
}

/* ========== My Posts (Client) ========== */

function Posts({ data, reload }: any) {
  return (
    <div className="stack">
      <PageTitle title="የእኔ ልጥፎች" sub="Open → Assigned → Submitted → Completed የስራ ሂደትን ይከታተሉ።" />
      {(data.tasks || []).map((t: any) => (
        <ClientTask key={t.id} t={t} reload={reload} />
      ))}
      {!data.tasks?.length && <Empty text="እስካሁን ስራ አልለጠፉም" />}
    </div>
  );
}

function ClientTask({ t, reload }: any) {
  const [busy, setBusy] = useState(false);
  const [submission, setSubmission] = useState<any>(null);

  useEffect(() => {
    if (t.status === "submitted" || t.status === "completed") {
      api("get-submission", { taskId: t.id })
        .then(setSubmission)
        .catch(() => {});
    }
  }, [t.id, t.status]);

  return (
    <div className="taskCard">
      <div className="taskTop">
        <span className="badge">{statusLabel(t.status)}</span>
        <strong>{money(t.budget)}</strong>
      </div>
      <h3>{t.title}</h3>
      <p>{t.description}</p>
      <div className="taskMeta">
        <span>{catLabel(t.category)}</span>
        <span>
          ማሻሻያ {t.revision_count || 0}/{t.revision_limit || 2}
        </span>
      </div>

      {submission && (
        <div className="infoBox" style={{ marginTop: 12 }}>
          <b>የሰራተኛው ስራ:</b>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{submission.content}</p>
          {submission.files?.length > 0 && (
            <div className="fileRow">
              {submission.files.map((f: any, i: number) => (
                <a key={i} className="fileChip" href={f.url || "#"} target="_blank" rel="noreferrer">
                  ⬇ {f.name || "ፋይል"}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {t.status === "submitted" && (
        <div className="actions">
          <button
            disabled={busy}
            onClick={async () => {
              try {
                setBusy(true);
                await api("approve-task", { taskId: t.id });
                reload();
              } catch (e: any) {
                alert(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            ✓ ስራውን አጽድቅ
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={async () => {
              const reason = prompt("የማሻሻያ ምክንያት");
              if (!reason) return;
              try {
                setBusy(true);
                await api("request-revision", { taskId: t.id, reason });
                reload();
              } catch (e: any) {
                alert(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            ↻ ማሻሻያ ጠይቅ
          </button>
          <button
            className="danger"
            disabled={busy}
            onClick={async () => {
              if (!confirm("ስራውን ሙሉ በሙሉ አትቀበል? ሰራተኛው ይታገዳል እና ስራው እንደገና ይለጠፋል።")) return;
              const reason = prompt("የመቃወሚያ ምክንያት (ለሰራተኛው ይታያል)");
              if (!reason) return;
              try {
                setBusy(true);
                await api("reject-task", { taskId: t.id, reason });
                reload();
              } catch (e: any) {
                alert(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            ✕ አትቀበል + አግድ
          </button>
        </div>
      )}

      {t.status === "completed" && <div className="successBox">✓ ስራው ተጠናቋል።</div>}
    </div>
  );
}

/* ========== Deposits ========== */

function Deposits({ data, reload }: any) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const telebirr = "0944546457";

  const onProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setBusy(true);
      const up = await uploadFile(f);
      setProof(up);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="stack">
      <PageTitle title="ገንዘብ አስገባ" sub="Telebirr ብቻ • ስክሪንሹት ያስፈልጋል" />
      <div className="depositInfo">
        <b>📱 Telebirr ቁጥር</b>
        <p style={{ fontSize: 22, fontWeight: 900, margin: "8px 0", letterSpacing: 1 }}>{telebirr}</p>
        <button
          className="secondary"
          style={{ padding: "8px 12px", borderRadius: 10, fontSize: 11 }}
          onClick={() => navigator.clipboard?.writeText(telebirr)}
        >
          ቁጥሩን ቅዳ
        </button>
        <p style={{ marginTop: 12, fontSize: 11, color: "var(--muted)" }}>
          1. ትክክለኛውን መጠን ወደ Telebirr {telebirr} ይላኩ
          <br />
          2. የክፍያ ስክሪንሹት ያንሱ
          <br />
          3. ከታች ስክሪንሹቱን አያይዘው ዲፖዚት ያስገቡ
          <br />
          ዝቅተኛ: 100 ብር • Telebirr ብቻ
        </p>
      </div>

      <div className="form card">
        <div className="chipRow">
          {[100, 200, 500, 1000, 2000, 5000].map((n) => (
            <button type="button" key={n} className={"chip" + (amount === String(n) ? " on" : "")} onClick={() => setAmount(String(n))}>{n}</button>
          ))}
        </div>
        <label>
          መጠን (ብር)
          <input type="number" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="ምሳሌ 500" />
        </label>
        <label>
          የክፍያ ማጣቀሻ (አማራጭ)
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID" />
        </label>
        <label className="fileBtn">
          📷 የክፍያ ስክሪንሹት (አስፈላጊ)
          <input type="file" className="fileInput" accept="image/*" onChange={onProof} />
        </label>
        {proof && <span className="fileChip">✓ {proof.name}</span>}
        <button
          disabled={busy || !proof || !amount}
          onClick={async () => {
            try {
              setBusy(true);
              await api("create-deposit", {
                amount: Number(amount),
                method: "telebirr",
                reference,
                proofUrl: proof?.url || null,
                proofPath: proof?.path || null,
              });
              alert("የዲፖዚት ጥያቄዎ ተልኳል። አስተዳዳሪው ከፈቀደ በኋላ ሂሳብዎ ይጨመራል።");
              setAmount("");
              setReference("");
              setProof(null);
              reload();
            } catch (e: any) {
              alert(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "እየተላከ…" : "ዲፖዚት አስገባ"}
        </button>
      </div>

      <div className="card">
        <h3>የዲፖዚት ታሪክ</h3>
        {(data.deposits || []).map((d: any) => (
          <div className="history" key={d.id}>
            <span>
              Telebirr · {d.status}
            </span>
            <b>{money(d.amount)}</b>
          </div>
        ))}
        {!data.deposits?.length && <p className="muted">ምንም የዲፖዚት ጥያቄ የለም።</p>}
      </div>
    </div>
  );
}

/* ========== Notifications ========== */

function Notifications({ data, reload }: any) {
  const list = data.notifications || data || [];
  return (
    <div className="stack">
      <PageTitle title="ማሳወቂያዎች" sub="የSera Time እንቅስቃሴዎችን ይከታተሉ።" />
      <button
        className="secondary"
        onClick={async () => {
          await api("read-notifications");
          reload();
        }}
      >
        ሁሉንም እንደተነበበ ምልክት አድርግ
      </button>
      {list.map((n: any) => (
        <div className={`notice ${n.read_at ? "read" : ""}`} key={n.id}>
          <b>{n.title}</b>
          <p>{n.body}</p>
          <small>{new Date(n.created_at).toLocaleString("am-ET")}</small>
        </div>
      ))}
      {!list.length && <Empty text="ማሳወቂያ የለም" />}
    </div>
  );
}

/* ========== Admin ========== */

function Admin({ data, reload }: any) {
  const [section, setSection] = useState<"money" | "users" | "disputes" | "tools">("money");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [broadcast, setBroadcast] = useState("");
  const [busy, setBusy] = useState(false);

  const searchUser = async () => {
    try {
      setBusy(true);
      const r = await api("admin-search-user", { query: searchQ });
      setSearchResults(r.users || []);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <PageTitle title="አስተዳደር" sub="ሙሉ የመድረክ ቁጥጥር • ገንዘብ • ተጠቃሚ • ክርክር" />
      <div className="statGrid">
        <Stat icon="♙" label="ተጠቃሚዎች" value={data.users || 0} />
        <Stat icon="◈" label="ስራዎች" value={data.tasks || 0} />
        <Stat icon="＋" label="ዲፖዚት" value={data.pending_deposits || 0} />
        <Stat icon="↗" label="ማውጫ" value={data.pending_withdrawals || 0} />
      </div>
      <div className="quickGrid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <button className={section === "money" ? "active" : ""} onClick={() => setSection("money")}><span>◉</span>ገንዘብ</button>
        <button onClick={() => setSection("users")}><span>♙</span>ተጠቃሚ</button>
        <button onClick={() => setSection("disputes")}><span>⚖</span>ክርክር</button>
        <button onClick={() => setSection("tools")}><span>⚙</span>መሣሪያ</button>
      </div>

      {section === "money" && (
        <>
          <div className="card">
            <h3>የማውጣት ጥያቄዎች</h3>
            {(data.withdrawals || []).map((w: any) => (
              <div className="adminRow" key={w.id}>
                <div>
                  <b>{money(w.amount)}</b>
                  <small>{w.method} · {w.account_name} · {w.account_number}</small>
                </div>
                <div className="actions">
                  <button onClick={async () => { await api("admin-withdraw", { withdrawalId: w.id, status: "paid" }); reload(); }}>ክፈል</button>
                  <button className="danger" onClick={async () => { await api("admin-withdraw", { withdrawalId: w.id, status: "rejected" }); reload(); }}>አትቀበል</button>
                </div>
              </div>
            ))}
            {!(data.withdrawals || []).length && <p className="muted">የሚጠብቅ ማውጫ የለም።</p>}
          </div>
          <div className="card">
            <h3>የዲፖዚት ጥያቄዎች</h3>
            {(data.deposits || []).map((d: any) => (
              <div className="adminRow" key={d.id}>
                <div>
                  <b>{money(d.amount)}</b>
                  <small>Telebirr · {d.reference || "ማጣቀሻ የለም"}</small>
                  {d.proof_url && <small><a href={d.proof_url} target="_blank" rel="noreferrer">ስክሪንሹት ↗</a></small>}
                </div>
                <div className="actions">
                  <button onClick={async () => { await api("admin-deposit", { depositId: d.id, status: "approved" }); reload(); }}>ቀበል</button>
                  <button className="danger" onClick={async () => { await api("admin-deposit", { depositId: d.id, status: "rejected" }); reload(); }}>አትቀበል</button>
                </div>
              </div>
            ))}
            {!(data.deposits || []).length && <p className="muted">የሚጠብቅ ዲፖዚት የለም።</p>}
          </div>
          <div className="form card">
            <h3>ሂሳብ ማስተካከል (Balance control)</h3>
            <input placeholder="User UUID" value={adjustUserId} onChange={(e) => setAdjustUserId(e.target.value)} />
            <input type="number" placeholder="መጠን (+ ወይም -)" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} />
            <input placeholder="ማስታወሻ" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} />
            <button disabled={busy} onClick={async () => {
              try {
                setBusy(true);
                await api("admin-adjust-balance", { userId: adjustUserId, amount: Number(adjustAmount), note: adjustNote });
                alert("ሂሳብ ተስተካክሏል");
                setAdjustAmount(""); setAdjustNote("");
              } catch (e: any) { alert(e.message); }
              finally { setBusy(false); }
            }}>አስተካክል</button>
          </div>
        </>
      )}

      {section === "users" && (
        <>
          <div className="form card">
            <h3>ተጠቃሚ ፈልግ</h3>
            <input placeholder="Telegram ID / ስም / username" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
            <button disabled={busy} onClick={searchUser}>ፈልግ</button>
          </div>
          {searchResults.map((u: any) => (
            <div className="card" key={u.id}>
              <b>{u.first_name} @{u.username || "-"}</b>
              <small style={{ display: "block", color: "var(--muted)" }}>TG: {u.telegram_id} · XP {u.xp} · Lv {u.level}</small>
              {u.banned && <div className="warnBox">ታግዷል: {u.ban_reason}</div>}
              <div className="actions">
                <button className="danger" onClick={async () => {
                  const reason = prompt("የእገዳ ምክንያት");
                  if (!reason) return;
                  await api("admin-ban", { userId: u.id, ban: true, reason });
                  alert("ታገደ"); searchUser();
                }}>አግድ</button>
                <button className="secondary" onClick={async () => {
                  await api("admin-ban", { userId: u.id, ban: false, reason: "unban" });
                  alert("እገዳ ተነስቷል"); searchUser();
                }}>እገዳ አንሳ</button>
                <button className="secondary" onClick={() => { setAdjustUserId(u.id); setSection("money"); }}>ሂሳብ</button>
              </div>
            </div>
          ))}
          <div className="card">
            <h3>አዲስ ተጠቃሚዎች</h3>
            {(data.recentUsers || []).slice(0, 15).map((u: any) => (
              <div className="history" key={u.id}>
                <span>{u.first_name} · {u.telegram_id}{u.banned ? " 🚫" : ""}</span>
                <small>{new Date(u.created_at).toLocaleDateString("am-ET")}</small>
              </div>
            ))}
          </div>
        </>
      )}

      {section === "disputes" && (
        <>
          <div className="card">
            <h3>ክፍት ክርክሮች</h3>
            {(data.disputes || []).map((d: any) => (
              <div className="adminRow" key={d.id}>
                <div>
                  <b>{d.reason?.slice(0, 80)}</b>
                  <small>Task: {d.task_id}</small>
                </div>
                <button onClick={async () => {
                  const resolution = prompt("ውሳኔ");
                  if (!resolution) return;
                  await api("admin-resolve-dispute", { disputeId: d.id, resolution });
                  reload();
                }}>ፈታ</button>
              </div>
            ))}
            {!(data.disputes || []).length && <p className="muted">ክፍት ክርክር የለም።</p>}
          </div>
          <div className="card">
            <h3>ሪፖርቶች</h3>
            {(data.reports || []).map((r: any) => (
              <div className="adminRow" key={r.id}>
                <div><b>{r.reason?.slice(0, 80)}</b></div>
                <button className="secondary" onClick={async () => { await api("admin-close-report", { reportId: r.id }); reload(); }}>ዝጋ</button>
              </div>
            ))}
            {!(data.reports || []).length && <p className="muted">ሪፖርት የለም።</p>}
          </div>
        </>
      )}

      {section === "tools" && (
        <div className="form card">
          <h3>ለሁሉም መልእክት ላክ (Broadcast)</h3>
          <textarea value={broadcast} onChange={(e) => setBroadcast(e.target.value)} placeholder="መልእክትዎን እዚህ ይጻፉ..." />
          <button disabled={busy || !broadcast.trim()} onClick={async () => {
            if (!confirm("ለሁሉም ተጠቃሚዎች ይላካል። እርግጠኛ?")) return;
            try {
              setBusy(true);
              const r = await api("admin-broadcast", { message: broadcast });
              alert(`ተልኳል: ${r.sent} ሰዎች`);
              setBroadcast("");
            } catch (e: any) { alert(e.message); }
            finally { setBusy(false); }
          }}>ላክ</button>
          <p className="muted" style={{ fontSize: 10 }}>ክፍት ስራዎች: {data.open_tasks || 0} · የተጠናቀቁ: {data.completed_tasks || 0}</p>
        </div>
      )}
    </div>
  );
}
