"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    Telegram?: { WebApp?: any };
    Adsgram?: any;
  }
}

type Role = "worker" | "client";
type Tab = "home" | "tasks" | "my" | "invite" | "wallet" | "post" | "posts" | "deposits" | "notifications" | "admin";
type Category = { key: string; label: string; icon: string; group: string };

const CATEGORIES: Category[] = [
  {key:"graphic_design",label:"ግራፊክ ዲዛይን",icon:"🎨",group:"ዲዛይን"},
  {key:"logo_design",label:"ሎጎ ዲዛይን",icon:"✨",group:"ዲዛይን"},
  {key:"ui_ux",label:"UI/UX ዲዛይን",icon:"🧩",group:"ዲዛይን"},
  {key:"presentation_design",label:"Presentation ዲዛይን",icon:"📊",group:"ዲዛይን"},
  {key:"illustration",label:"Illustration",icon:"🖌️",group:"ዲዛይን"},
  {key:"3d_design",label:"3D ዲዛይን",icon:"🧊",group:"ዲዛይን"},
  {key:"video_editing",label:"ቪዲዮ ኤዲቲንግ",icon:"🎬",group:"ሚዲያ"},
  {key:"photo_editing",label:"ፎቶ ኤዲቲንግ",icon:"📸",group:"ሚዲያ"},
  {key:"motion_graphics",label:"Motion Graphics",icon:"💫",group:"ሚዲያ"},
  {key:"animation",label:"Animation",icon:"🎞️",group:"ሚዲያ"},
  {key:"voice_over",label:"Voice Over",icon:"🎙️",group:"ሚዲያ"},
  {key:"audio_editing",label:"Audio ኤዲቲንግ",icon:"🎧",group:"ሚዲያ"},
  {key:"writing",label:"ጽሑፍ / Copywriting",icon:"✍️",group:"ቋንቋ"},
  {key:"translation",label:"ትርጉም",icon:"🌐",group:"ቋንቋ"},
  {key:"transcription",label:"Transcription",icon:"⌨️",group:"ቋንቋ"},
  {key:"proofreading",label:"Proofreading",icon:"📝",group:"ቋንቋ"},
  {key:"data_entry",label:"Data Entry",icon:"⌨️",group:"ዳታ"},
  {key:"excel",label:"Excel / Sheets",icon:"📈",group:"ዳታ"},
  {key:"data_analysis",label:"Data Analysis",icon:"📉",group:"ዳታ"},
  {key:"web_research",label:"Web Research",icon:"🔎",group:"ዳታ"},
  {key:"programming",label:"Programming",icon:"💻",group:"ቴክኖሎጂ"},
  {key:"website_development",label:"Website Development",icon:"🌍",group:"ቴክኖሎጂ"},
  {key:"mobile_app",label:"Mobile App Development",icon:"📱",group:"ቴክኖሎጂ"},
  {key:"api_development",label:"API Development",icon:"🔌",group:"ቴክኖሎጂ"},
  {key:"wordpress",label:"WordPress",icon:"📰",group:"ቴክኖሎጂ"},
  {key:"automation",label:"Automation",icon:"⚙️",group:"ቴክኖሎጂ"},
  {key:"ai_services",label:"AI አገልግሎት",icon:"🤖",group:"AI"},
  {key:"prompt_engineering",label:"Prompt Engineering",icon:"🧠",group:"AI"},
  {key:"ai_content",label:"AI Content",icon:"✨",group:"AI"},
  {key:"marketing",label:"Marketing",icon:"📣",group:"ንግድ"},
  {key:"social_media",label:"Social Media",icon:"📱",group:"ንግድ"},
  {key:"seo",label:"SEO",icon:"🚀",group:"ንግድ"},
  {key:"lead_generation",label:"Lead Generation",icon:"🎯",group:"ንግድ"},
  {key:"virtual_assistant",label:"Virtual Assistant",icon:"🧑‍💼",group:"ንግድ"},
  {key:"customer_support",label:"Customer Support",icon:"💬",group:"ንግድ"},
  {key:"research",label:"Research",icon:"🔬",group:"ሙያ"},
  {key:"business_plan",label:"Business Plan",icon:"📋",group:"ሙያ"},
  {key:"accounting",label:"Accounting",icon:"🧾",group:"ሙያ"},
  {key:"architecture",label:"Architecture",icon:"🏗️",group:"ሙያ"},
  {key:"engineering",label:"Engineering",icon:"🛠️",group:"ሙያ"},
  {key:"education",label:"Education / Tutoring",icon:"🎓",group:"ሙያ"},
  {key:"photography",label:"Photography",icon:"📷",group:"ሚዲያ"},
  {key:"marketing_strategy",label:"Marketing Strategy",icon:"🗺️",group:"ንግድ"},
  {key:"other",label:"ሌላ ችሎታ",icon:"➕",group:"ሌላ"},
];

const cat = (key: string) => CATEGORIES.find(x => x.key === key);
const catLabel = (key: string) => { const x = cat(key); return x ? `${x.icon} ${x.label}` : key; };
const money = (v: any) => `${Number(v || 0).toFixed(2)} ETB`;
const statusLabel = (s: string) => ({open:"ክፍት",assigned:"ተመድቧል",submitted:"ተልኳል",revision_requested:"ማሻሻያ",disputed:"ክርክር",completed:"ተጠናቋል",cancelled:"ተሰርዟል",expired:"ጊዜው አልፏል"} as Record<string,string>)[s] || s;

async function api(action: string, body: any = {}) {
  const webApp = window.Telegram?.WebApp;
  const initData = webApp?.initData || "";
  const ref = new URLSearchParams(window.location.search).get("ref") || "";
  const r = await fetch(`/api/${action}`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({...body,initData,ref}) });
  const d = await r.json().catch(() => ({error:"Server returned an invalid response"}));
  if (!r.ok) throw new Error(d.error || "አንድ ችግር ተፈጥሯል");
  return d;
}

export default function App() {
  const [me,setMe] = useState<any>(null);
  const [role,setRole] = useState<Role>("worker");
  const [tab,setTab] = useState<Tab>("home");
  const [data,setData] = useState<any>({});
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [onboard,setOnboard] = useState(false);
  const [telegramReady,setTelegramReady] = useState(true);

  const loadMe = useCallback(async () => {
    const wa = window.Telegram?.WebApp;
    if (!wa) { setTelegramReady(false); setError("Sera Timeን ከTelegram መተግበሪያ ውስጥ ይክፈቱ።"); setLoading(false); return; }
    wa.ready?.(); wa.expand?.();
    try {
      const x = await api("me");
      setMe(x.user);
      const saved = localStorage.getItem("sera_role");
      const initial = saved === "worker" || saved === "client" ? saved : (x.user.active_role === "client" ? "client" : "worker");
      setRole(initial as Role);
      if (!saved) setOnboard(true);
    } catch (e:any) { setError(e.message); }
    finally { setLoading(false); }
  },[]);

  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    if (wa) { wa.ready?.(); wa.expand?.(); wa.setBackgroundColor?.("#07111f"); wa.setHeaderColor?.("#07111f"); }
    loadMe();
  },[loadMe]);

  const chooseRole = async (r: Role) => {
    try { await api("set-role",{role:r}); setRole(r); localStorage.setItem("sera_role",r); setOnboard(false); setTab("home"); }
    catch(e:any) { setError(e.message); }
  };

  const load = useCallback(async (t: Tab = tab) => {
    if (!me) return;
    setError("");
    try {
      let x:any = {};
      if (t === "home") x = await api("dashboard",{role});
      else if (t === "tasks") x = await api("tasks");
      else if (t === "my") x = await api("my-tasks");
      else if (t === "invite") x = await api("referrals");
      else if (t === "wallet") x = await api("wallet");
      else if (t === "posts") x = await api("my-posts");
      else if (t === "deposits") x = await api("deposits");
      else if (t === "notifications") x = await api("notifications");
      else if (t === "admin") x = await api("admin-dashboard");
      setData(x);
    } catch(e:any) { setError(e.message); }
  },[me,role,tab]);

  useEffect(() => { if (me && !onboard) load(tab); },[me,role,tab,onboard,load]);

  if (loading) return <Splash />;
  if (!me) return <LaunchHelp telegramReady={telegramReady} error={error} />;
  if (onboard) return <RolePicker choose={chooseRole} name={me.first_name || ""} />;

  const isAdmin = !!me.is_admin;
  const nav: [Tab,string,string][] = role === "worker"
    ? [["home","⌂","ዋና"],["tasks","◈","ስራዎች"],["my","✓","የእኔ"],["invite","♧","ግብዣ"],["wallet","◉","ዋሌት"]]
    : [["home","⌂","ዋና"],["post","＋","ስራ ለጥፍ"],["posts","▣","ልጥፎች"],["deposits","＋","አስገባ"],["wallet","◉","ዋሌት"]];

  const go = (t: Tab) => { setTab(t); window.scrollTo({top:0,behavior:"smooth"}); };

  return <main className="app">
    <header className="header">
      <div className="brand"><div className="mini">S</div><div><strong>SERA TIME</strong><span>ስራ • ገቢ • እድል</span></div></div>
      <div className="headActions"><button className="circle" onClick={()=>go("notifications")} aria-label="ማሳወቂያ">♧</button><button className="roleBtn" onClick={()=>setOnboard(true)}>{role === "worker" ? "💼 ደንበኛ" : "👷 ሰራተኛ"}</button></div>
    </header>
    {error && <div className="error topError">{error}<button onClick={()=>setError("")}>×</button></div>}
    <section className="content">
      {tab === "home" && <Home data={data} role={role} go={go} />}
      {tab === "tasks" && <Tasks data={data} reload={()=>load("tasks")} />}
      {tab === "my" && <MyTasks data={data} reload={()=>load("my")} />}
      {tab === "invite" && <Invite data={data} />}
      {tab === "wallet" && <Wallet data={data} reload={()=>load("wallet")} />}
      {tab === "post" && <Post onDone={()=>{go("posts");load("posts");}} />}
      {tab === "posts" && <Posts data={data} reload={()=>load("posts")} />}
      {tab === "deposits" && <Deposits data={data} reload={()=>load("deposits")} />}
      {tab === "notifications" && <Notifications data={data} reload={()=>load("notifications")} />}
      {tab === "admin" && isAdmin && <Admin data={data} reload={()=>load("admin")} />}
    </section>
    <nav className="bottom">{nav.map(([id,icon,label])=><button key={id} className={tab===id?"active":""} onClick={()=>go(id)}><span>{icon}</span>{label}</button>)}{isAdmin&&<button className={tab==="admin"?"active":""} onClick={()=>go("admin")}><span>⚙</span>አስተዳደር</button>}</nav>
  </main>;
}

function Splash(){return <main className="app"><div className="splash"><div className="mark">S</div><h1>SERA TIME</h1><p>እባክዎ ትንሽ ይጠብቁ…</p></div></main>}
function LaunchHelp({telegramReady,error}:{telegramReady:boolean,error:string}){return <main className="app picker"><div className="pickerInner"><div className="mark big">S</div><div className="eyebrow">SERA TIME</div><h1>{telegramReady?"Telegram ማረጋገጫ አልተገኘም":"Telegram አልተገኘም"}</h1><p className="muted centerText">{error || "ይህን መተግበሪያ ከSera Time Bot ውስጥ ባለው የ🚀 ክፈት ቁልፍ ይክፈቱ።"}</p><div className="helpCard"><b>ትክክለኛው መንገድ</b><span>1. Sera Time Bot ይክፈቱ</span><span>2. /start ይላኩ</span><span>3. 🚀 Sera Timeን ክፈት ይጫኑ</span><small>የVercel ሊንኩን በቀጥታ መክፈት አይጠቀሙ።</small></div></div></main>}
function RolePicker({choose,name}:{choose:(r:Role)=>void,name:string}){return <main className="app picker"><div className="pickerInner"><div className="mark big">S</div><div className="eyebrow">እንኳን ወደ Sera Time በደህና መጡ 👋</div><h1>{name?`${name}፣ እንኳን ደህና መጡ`:"የሚፈልጉትን ይምረጡ"}</h1><p className="muted centerText">እንደ ሰራተኛ ገቢ ያግኙ ወይም እንደ ደንበኛ ስራ ይለጥፉ።</p><div className="roleCards"><button onClick={()=>choose("worker")}><span>👷</span><b>ሰራተኛ</b><small>ስራዎችን ይቀበሉ፣ ይስሩ እና ገቢ ያግኙ</small></button><button onClick={()=>choose("client")}><span>💼</span><b>ደንበኛ</b><small>ስራ ይለጥፉ እና ተስማሚ ሰራተኛ ያግኙ</small></button></div><p className="tiny">ሚናዎን በኋላ ማቀያየር ይችላሉ።</p></div></main>}

function Home({data,role,go}:any){
  const [adBusy,setAdBusy]=useState(false); const ads=data.ads||{completed:0,limit:5};
  const showAd=async()=>{if(adBusy||ads.completed>=ads.limit)return;setAdBusy(true);try{const block=process.env.NEXT_PUBLIC_ADSGRAM_BLOCK_ID||"";const c=window.Adsgram?.init({blockId:block});if(!c)throw new Error("AdsGram አልተዘጋጀም");const r=await c.show();if(!r?.done)throw new Error("ማስታወቂያው አልተጠናቀቀም");alert("ማስታወቂያው ተጠናቋል። የክፍያ ማረጋገጫ በአገልጋዩ ይመጣል።");setTimeout(()=>location.reload(),1800)}catch(e:any){alert(e.message)}finally{setAdBusy(false)}};
  return <div className="stack"><div className="hero"><div className="heroGlow"/><div className="heroMark">S</div><div><div className="eyebrow">{role==="worker"?"የስራ መድረክ":"የስራ ማስተናገጃ መድረክ"}</div><h1>{role==="worker"?"ስራ ይስሩ፣ ገቢ ያግኙ":"ስራዎን ይለጥፉ፣ ውጤት ያግኙ"}</h1><p>በSera Time የሚያምር፣ ፈጣን እና የተጠበቀ የስራ ልውውጥ።</p></div></div><div className="statGrid"><Stat icon="◉" label="ያለዎት ሂሳብ" value={money(data.wallet?.available)}/><Stat icon={role==="worker"?"↗":"↘"} label={role==="worker"?"ጠቅላላ ገቢ":"ጠቅላላ ወጪ"} value={money(role==="worker"?data.wallet?.earned:data.wallet?.spent)}/><Stat icon="✓" label="የተጠናቀቁ" value={data.completed||0}/><Stat icon="♧" label="ሪፈራል ገቢ" value={money(data.referralEarned)}/></div>{role==="worker"&&<div className="adCard"><div><b>🎁 ተጨማሪ ገቢ</b><span>ማስታወቂያ ይመልከቱ • 1 ETB • {ads.completed}/{ads.limit}</span></div><button disabled={adBusy||ads.completed>=ads.limit} onClick={showAd}>{adBusy?"እየተጫነ…":"ይመልከቱ"}</button></div>}<div className="sectionHead"><h2>ፈጣን መጀመሪያ</h2></div><div className="quickGrid"><button onClick={()=>go(role==="worker"?"tasks":"post")}><span>{role==="worker"?"◈":"＋"}</span>{role==="worker"?"ስራዎችን ይመልከቱ":"ስራ ይለጥፉ"}</button><button onClick={()=>go("wallet")}><span>◉</span>ዋሌት</button><button onClick={()=>go("notifications")}><span>♧</span>ማሳወቂያ</button></div></div>;
}
function Stat({icon,label,value}:{icon:string,label:string,value:any}){return <div className="stat"><span className="statIcon">{icon}</span><span className="statLabel">{label}</span><b>{value}</b></div>}

function Tasks({data,reload}:any){
  const [catKey,setCatKey]=useState(""); const [query,setQuery]=useState("");
  const tasks=data.tasks||[];
  const filtered=tasks.filter((t:any)=>(!catKey||t.category===catKey)&&(!query||`${t.title} ${t.description}`.toLowerCase().includes(query.toLowerCase())));
  const groups=[...new Set(CATEGORIES.map(x=>x.group))];
  return <div className="stack"><PageTitle title="ስራዎች" sub="ሁሉም ችሎታዎች እዚህ አሉ። ስራ ባይኖርም ምድቡ ይታያል።"/><div className="searchBox"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ስራ ወይም ችሎታ ይፈልጉ…"/></div><div className="categoryGrid"><button className={!catKey?"selected":""} onClick={()=>setCatKey("")}><span>✦</span><b>ሁሉም</b><small>{tasks.length} ስራ</small></button>{groups.map(g=><div className="groupBox" key={g}><h4>{g}</h4><div className="categoryGrid inner">{CATEGORIES.filter(c=>c.group===g).map(c=><button key={c.key} className={catKey===c.key?"selected":""} onClick={()=>setCatKey(c.key)}><span>{c.icon}</span><b>{c.label}</b><small>{tasks.filter((t:any)=>t.category===c.key).length} ስራ</small></button>)}</div></div>)}</div>{catKey&&<div className="filterBar"><span>{catLabel(catKey)}</span><button onClick={()=>setCatKey("")}>ሁሉን አሳይ</button></div>}{filtered.map((t:any)=><TaskCard key={t.id} t={t} reload={reload}/>)}{!filtered.length&&<Empty text={catKey?`${catLabel(catKey)} ላይ አሁን ስራ የለም`:(query?"የፈለጉት ስራ አልተገኘም":"አሁን ላይ የሚገኝ ስራ የለም")}/>}</div>
}
function TaskCard({t,reload}:{t:any,reload:()=>void}){const [busy,setBusy]=useState(false);return <div className="taskCard"><div className="taskTop"><span className="badge">{catLabel(t.category)}</span><strong>{money(t.worker_reward)}</strong></div><h3>{t.title}</h3><p>{t.description}</p>{t.requirements&&<div className="requirements"><b>መስፈርቶች</b><span>{t.requirements}</span></div>}<div className="taskMeta"><span>⏱ {new Date(t.deadline_at).toLocaleString("am-ET")}</span><button disabled={busy} onClick={async()=>{try{setBusy(true);await api("accept-task",{taskId:t.id});reload()}catch(e:any){alert(e.message)}finally{setBusy(false)}}}>{busy?"እየተቀበለ…":"ስራውን ተቀበል"}</button></div></div>}
function MyTasks({data,reload}:any){return <div className="stack"><PageTitle title="የእኔ ስራዎች" sub="አንድ ጊዜ አንድ ንቁ ስራ ብቻ ይያዙ።"/>{(data.tasks||[]).map((t:any)=><TaskSubmission key={t.id} t={t} reload={reload}/>)}{!data.tasks?.length&&<Empty text="እስካሁን ስራ አልተቀበሉም"/>}</div>}
function TaskSubmission({t,reload}:any){const [content,setContent]=useState("");const [busy,setBusy]=useState(false);const can=["assigned","revision_requested"].includes(t.status);return <div className="taskCard"><div className="taskTop"><span className="badge">{statusLabel(t.status)}</span><strong>{money(t.worker_reward)}</strong></div><h3>{t.title}</h3><p>{t.description}</p><div className="taskMeta"><span>የመጨረሻ ቀን: {new Date(t.deadline_at).toLocaleString("am-ET")}</span><span>ማሻሻያ: {t.revision_count||0}/{t.revision_limit||2}</span></div>{can&&<div className="form"><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="የሰሩትን ስራ፣ ማገናኛ ወይም የመስሪያ ማስረጃ ያስገቡ"/><button disabled={busy||!content.trim()} onClick={async()=>{try{setBusy(true);await api("submit-task",{taskId:t.id,content});setContent("");reload()}catch(e:any){alert(e.message)}finally{setBusy(false)}}}>{busy?"እየተላከ…":"ስራውን ላክ"}</button></div>}{t.status==="submitted"&&<div className="infoBox">⏳ ስራዎ ለደንበኛው ግምገማ ተልኳል።</div>}{t.status==="completed"&&<div className="successBox">✓ ስራዎ ተጠናቋል። ክፍያው በዋሌት ውስጥ ነው።</div>}</div>}
function Invite({data}:any){return <div className="stack"><PageTitle title="ግብዣ" sub="ጓደኞችዎን ይጋብዙ እና ከተሳካ የስራ ገቢ 5% ያግኙ።"/><div className="inviteHero"><span>♧</span><b>የግብዣ ሊንክዎ</b><p>የተጋበዙት ሰራተኛ ስራውን ካጠናቀቀ እና ክፍያው ከተፈጸመ በኋላ 5% የሪፈራል ገቢ ይገባዎታል።</p><div className="inviteLink">{data.link||"-"}</div><button onClick={()=>navigator.clipboard?.writeText(data.link||"")}>ሊንኩን ቅዳ</button></div><div className="statGrid two"><Stat icon="♧" label="የተጋበዙ" value={data.count||0}/><Stat icon="◉" label="የሪፈራል ገቢ" value={money(data.earned)}/></div></div>}
function Wallet({data,reload}:any){const [amount,setAmount]=useState("");const [method,setMethod]=useState("telebirr");const [acct,setAcct]=useState("");const [name,setName]=useState("");const [busy,setBusy]=useState(false);return <div className="stack"><PageTitle title="ዋሌት" sub="ETB ብቻ • ትንሹ ማውጫ 1,000 ETB"/><div className="balance"><span>ያለዎት ቀሪ ሂሳብ</span><strong>{money(data.available)}</strong><small>የተያዘ: {money(data.reserved)}</small></div><div className="form card"><h3>ገንዘብ ማውጣት</h3><input type="number" min="1000" placeholder="የሚያወጡት መጠን" value={amount} onChange={e=>setAmount(e.target.value)}/><select value={method} onChange={e=>setMethod(e.target.value)}><option value="telebirr">Telebirr</option><option value="bank">የኢትዮጵያ ባንክ</option></select><input placeholder="የሂሳብ / Telebirr ቁጥር" value={acct} onChange={e=>setAcct(e.target.value)}/><input placeholder="ሙሉ ስም" value={name} onChange={e=>setName(e.target.value)}/><button disabled={busy} onClick={async()=>{try{setBusy(true);await api("withdraw",{amount:Number(amount),method,accountNumber:acct,accountName:name});alert("የማውጣት ጥያቄዎ ተልኳል።");setAmount("");reload()}catch(e:any){alert(e.message)}finally{setBusy(false)}}}>{busy?"እየተላከ…":"የማውጣት ጥያቄ ላክ"}</button></div><div className="card"><h3>የግብይት ታሪክ</h3>{(data.transactions||[]).map((x:any)=><div className="history" key={x.id}><span>{x.description||x.type}</span><b>{money(x.amount)}</b></div>)}{!data.transactions?.length&&<p className="muted">እስካሁን ግብይት የለም።</p>}</div></div>}
function Post({onDone}:{onDone:()=>void}){const [f,setF]=useState<any>({category:CATEGORIES[0].key,title:"",description:"",requirements:"",deadlineHours:24,budget:""});const [busy,setBusy]=useState(false);const set=(k:string,v:any)=>setF({...f,[k]:v});return <div className="stack"><PageTitle title="ስራ ለጥፍ" sub="ሁሉንም የሚፈለገውን ግልጽ ያድርጉ።"/><div className="form card"><label>የስራ ምድብ<select value={f.category} onChange={e=>set("category",e.target.value)}>{CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}</select></label><label>የስራ ርዕስ<input value={f.title} onChange={e=>set("title",e.target.value)} placeholder="ምሳሌ፦ የንግድ ሎጎ እፈልጋለሁ"/></label><label>ዝርዝር መግለጫ<textarea value={f.description} onChange={e=>set("description",e.target.value)} placeholder="ስራው በትክክል ምን ይፈልጋል?"/></label><label>መስፈርቶች / መመሪያ<textarea value={f.requirements} onChange={e=>set("requirements",e.target.value)} placeholder="ፋይል አይነት፣ መጠን፣ ቅርጽ፣ የመጨረሻ ውጤት…"/></label><div className="twoFields"><label>የስራ ጊዜ (ሰዓት)<input type="number" min="1" max="720" value={f.deadlineHours} onChange={e=>set("deadlineHours",e.target.value)}/></label><label>በጀት (ETB)<input type="number" min="1" step="0.01" value={f.budget} onChange={e=>set("budget",e.target.value)} placeholder="100"/></label></div><div className="feeBox"><span>ሰራተኛ የሚያገኘው</span><b>{money(Number(f.budget||0)*.9)}</b><small>10% የመድረክ ክፍያ ይቀነሳል። ገንዘቡ ስራው እስኪጠናቀቅ ድረስ ተይዞ ይቆያል።</small></div><button disabled={busy} onClick={async()=>{try{setBusy(true);await api("create-task",{...f,budget:Number(f.budget)});alert("ስራው ተለጥፏል።");onDone()}catch(e:any){alert(e.message)}finally{setBusy(false)}}}>{busy?"እየተለጠፈ…":"ስራውን ለጥፍ"}</button></div></div>}
function Posts({data,reload}:any){return <div className="stack"><PageTitle title="የእኔ ልጥፎች" sub="Open → Assigned → Submitted → Completed የስራ ሂደትን ይከታተሉ።"/>{(data.tasks||[]).map((t:any)=><ClientTask key={t.id} t={t} reload={reload}/>)}{!data.tasks?.length&&<Empty text="እስካሁን ስራ አልለጠፉም"/>}</div>}
function ClientTask({t,reload}:any){const [busy,setBusy]=useState(false);return <div className="taskCard"><div className="taskTop"><span className="badge">{statusLabel(t.status)}</span><strong>{money(t.budget)}</strong></div><h3>{t.title}</h3><p>{t.description}</p><div className="taskMeta"><span>{catLabel(t.category)}</span><span>ማሻሻያ {t.revision_count||0}/{t.revision_limit||2}</span></div>{t.status==="submitted"&&<div className="actions"><button disabled={busy} onClick={async()=>{try{setBusy(true);await api("approve-task",{taskId:t.id});reload()}catch(e:any){alert(e.message)}finally{setBusy(false)}}}>✓ ስራውን አጽድቅ</button><button className="secondary" disabled={busy} onClick={async()=>{const reason=prompt("የማሻሻያ ምክንያት");if(!reason)return;try{setBusy(true);await api("request-revision",{taskId:t.id,reason});reload()}catch(e:any){alert(e.message)}finally{setBusy(false)}}}>↻ ማሻሻያ ጠይቅ</button><button className="danger" disabled={busy} onClick={async()=>{const reason=prompt("የክርክር ምክንያት");if(!reason)return;try{setBusy(true);await api("open-dispute",{taskId:t.id,reason});reload()}catch(e:any){alert(e.message)}finally{setBusy(false)}}}>⚖ ክርክር</button></div>}{t.status==="completed"&&<div className="successBox">✓ ስራው ተጠናቋል።</div>}</div>}
function Deposits({data,reload}:any){const [amount,setAmount]=useState("");const [method,setMethod]=useState("telebirr");const [reference,setReference]=useState("");const [busy,setBusy]=useState(false);return <div className="stack"><PageTitle title="ገንዘብ አስገባ" sub="ክፍያውን ከፈጸሙ በኋላ ማጣቀሻ ያስገቡ።"/><div className="depositInfo"><b>የክፍያ ማረጋገጫ ቻናል</b><a href="https://t.me/depistseratime" target="_blank" rel="noreferrer">@depistseratime ↗</a><p>ዝቅተኛ ዲፖዚት: 100 ETB</p></div><div className="form card"><label>መጠን (ETB)<input type="number" min="100" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>ዘዴ<select value={method} onChange={e=>setMethod(e.target.value)}><option value="telebirr">Telebirr</option><option value="bank">ባንክ</option></select></label><label>የክፍያ ማጣቀሻ<input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Reference / Transaction ID"/></label><button disabled={busy} onClick={async()=>{try{setBusy(true);await api("create-deposit",{amount:Number(amount),method,reference});alert("የዲፖዚት ጥያቄዎ ተልኳል።");setAmount("");setReference("");reload()}catch(e:any){alert(e.message)}finally{setBusy(false)}}}>{busy?"እየተላከ…":"ዲፖዚት አስገባ"}</button></div><div className="card"><h3>የዲፖዚት ታሪክ</h3>{(data.deposits||[]).map((d:any)=><div className="history" key={d.id}><span>{d.method} · {d.status}</span><b>{money(d.amount)}</b></div>)}{!data.deposits?.length&&<p className="muted">ምንም የዲፖዚት ጥያቄ የለም።</p>}</div></div>}
function Notifications({data,reload}:any){const list=data.notifications||data||[];return <div className="stack"><PageTitle title="ማሳወቂያዎች" sub="የSera Time እንቅስቃሴዎችን ይከታተሉ።"/><button className="secondary" onClick={async()=>{await api("read-notifications");reload()}}>ሁሉንም እንደተነበበ ምልክት አድርግ</button>{list.map((n:any)=><div className={`notice ${n.read_at?"read":""}`} key={n.id}><b>{n.title}</b><p>{n.body}</p><small>{new Date(n.created_at).toLocaleString("am-ET")}</small></div>)}{!list.length&&<Empty text="ማሳወቂያ የለም"/>}</div>}
function Admin({data,reload}:any){return <div className="stack"><PageTitle title="አስተዳደር" sub="ገንዘብ፣ ተጠቃሚዎች እና ስራዎችን ከአንድ ቦታ ይቆጣጠሩ።"/><div className="statGrid"><Stat icon="♙" label="ተጠቃሚዎች" value={data.users||0}/><Stat icon="◈" label="ስራዎች" value={data.tasks||0}/><Stat icon="＋" label="ዲፖዚት" value={data.pending_deposits||0}/><Stat icon="↗" label="ማውጫ" value={data.pending_withdrawals||0}/></div><div className="card"><h3>የማውጣት ጥያቄዎች</h3>{(data.withdrawals||[]).map((w:any)=><div className="adminRow" key={w.id}><div><b>{money(w.amount)}</b><small>{w.method} · {w.account_name} · {w.account_number}</small></div><div className="actions"><button onClick={async()=>{await api("admin-withdraw",{withdrawalId:w.id,status:"paid"});reload()}}>ክፈል</button><button className="danger" onClick={async()=>{await api("admin-withdraw",{withdrawalId:w.id,status:"rejected"});reload()}}>አትቀበል</button></div></div>)}{!(data.withdrawals||[]).length&&<p className="muted">የሚጠብቅ ማውጫ የለም።</p>}</div><div className="card"><h3>የዲፖዚት ጥያቄዎች</h3>{(data.deposits||[]).map((d:any)=><div className="adminRow" key={d.id}><div><b>{money(d.amount)}</b><small>{d.method} · {d.reference||"ማጣቀሻ የለም"}</small></div><div className="actions"><button onClick={async()=>{await api("admin-deposit",{depositId:d.id,status:"approved"});reload()}}>ቀበል</button><button className="danger" onClick={async()=>{await api("admin-deposit",{depositId:d.id,status:"rejected"});reload()}}>አትቀበል</button></div></div>)}{!(data.deposits||[]).length&&<p className="muted">የሚጠብቅ ዲፖዚት የለም።</p>}</div></div>}
function PageTitle({title,sub}:{title:string,sub:string}){return <div className="pageTitle"><h2>{title}</h2><p>{sub}</p></div>}
function Empty({text}:{text:string}){return <div className="empty"><span>○</span><b>{text}</b><small>ምድቡ ክፍት ነው። አዲስ ስራ ሲመጣ እዚህ ይታያል።</small></div>}
