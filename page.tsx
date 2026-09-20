"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Telegram?: any;
    Adsgram?: any;
  }
}

type Task = {
  id: string;
  title: string;
  category?: string;
  budget: number;
  deadline?: string | null;
};

type User = {
  id: string;
  first_name: string;
  username?: string;
  wallet: { available: number; reserved: number; total_earned: number };
};

export default function Home() {
  const [screen, setScreen] = useState<"choose"|"worker"|"client">("choose");
  const [tab, setTab] = useState("home");
  const [user, setUser] = useState<User|null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [adsToday, setAdsToday] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const initData = typeof window !== "undefined" ? window.Telegram?.WebApp?.initData || "" : "";

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
    load("me");
  }, []);

  async function load(action: string) {
    try {
      const r = await fetch("/api", {
        method: "POST",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({action, initData})
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Request failed");
      if (data.user) setUser(data.user);
      if (data.tasks) setTasks(data.tasks);
      if (typeof data.adsToday === "number") setAdsToday(data.adsToday);
    } catch (e:any) {
      setMessage(e.message || "Error");
    }
  }

  async function api(action:string, extra:Record<string,unknown>={}) {
    setBusy(true); setMessage("");
    try {
      const r=await fetch("/api",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({action,initData,...extra})
      });
      const data=await r.json();
      if(!r.ok) throw new Error(data.error||"Request failed");
      if(data.user) setUser(data.user);
      if(data.tasks) setTasks(data.tasks);
      if(typeof data.adsToday==="number") setAdsToday(data.adsToday);
      setMessage(data.message||"Done");
    }catch(e:any){setMessage(e.message||"Error")}
    finally{setBusy(false)}
  }

  async function showRewardAd() {
    const blockId = process.env.NEXT_PUBLIC_ADSGRAM_BLOCK_ID;
    if (!blockId) { setMessage("AdsGram Block ID is not configured yet."); return; }
    if (adsToday >= 5) { setMessage("የዛሬ 5 ማስታወቂያዎች ተጠናቀዋል።"); return; }

    if (!window.Adsgram) {
      setMessage("AdsGram is still loading. Try again.");
      return;
    }

    const controller = window.Adsgram.init({ blockId });
    try {
      const result = await controller.show();
      if (result?.done === true) {
        // The actual ETB credit is confirmed by AdsGram's server Reward URL.
        setMessage("ማስታወቂያው ተጠናቋል። ሽልማቱ በሰርቨሩ ሲረጋገጥ ይጨመራል።");
        setTimeout(() => load("me"), 1200);
      }
    } catch {
      setMessage("ማስታወቂያው አልተጠናቀቀም።");
    }
  }

  if (screen === "choose") return (
    <>
      <script src="https://telegram.org/js/telegram-web-app.js" async />
      <script src="https://sad.adsgram.ai/js/sad.min.js" async />
      <main className="shell">
        <div className="hero">
          <div className="logo">SERA <span>TIME</span></div>
          <div className="clock">⏱</div>
          <h1>ሰራ ጊዜ</h1>
          <p>ስራ ይስሩ፣ ገንዘብ ያግኙ።<br/>ስራ ያስገቡ፣ ባለሙያ ያግኙ።</p>
        </div>
        <div className="choices">
          <button onClick={()=>{setScreen("worker");load("tasks")}}><b>👷 ሰራተኛ</b><small>ስራዎችን ይፈልጉ እና ETB ያግኙ</small></button>
          <button onClick={()=>setScreen("client")}><b>💼 ደንበኛ</b><small>ስራ ያስገቡ እና ባለሙያ ያግኙ</small></button>
        </div>
      </main>
    </>
  );

  return (
    <>
      <script src="https://telegram.org/js/telegram-web-app.js" async />
      <script src="https://sad.adsgram.ai/js/sad.min.js" async />
      <main className="app">
        <header><div><div className="logo mini">SERA <span>TIME</span></div><b>ሰላም {user?.first_name||"ጓደኛ"} 👋</b></div><button onClick={()=>load("me")} className="round">↻</button></header>
        {message && <div className="toast">{message}</div>}

        {screen==="worker" && tab==="home" && <>
          <section className="balance"><small>የሚገኝ ገንዘብ</small><strong>{money(user?.wallet.available)} ETB</strong><span>ጠቅላላ ገቢ {money(user?.wallet.total_earned)} ETB</span></section>
          <div className="cards">
            <Card icon="📋" title="Available Tasks" value={tasks.length}/>
            <Card icon="💰" title="Earned" value={`${money(user?.wallet.total_earned)} ETB`}/>
            <Card icon="📺" title="Ads today" value={`${adsToday}/5`}/>
            <Card icon="🤝" title="Referral" value="0 ETB"/>
          </div>
          <section className="adbox"><b>📺 ዛሬ እስከ 5 ማስታወቂያ</b><p>ሙሉ ማስታወቂያ ካዩ 1 ETB ያገኛሉ።</p><button onClick={showRewardAd} disabled={busy||adsToday>=5}>{adsToday>=5?"ዛሬ ተጠናቋል":"ማስታወቂያ አሳይ"}</button></section>
          <h2>የሚገኙ ስራዎች</h2><TaskList tasks={tasks} onAccept={(id)=>api("accept_task",{taskId:id})}/>
        </>}

        {screen==="worker" && tab==="tasks" && <><h1>ስራዎች</h1><TaskList tasks={tasks} onAccept={(id)=>api("accept_task",{taskId:id})}/></>}

        {screen==="worker" && tab==="wallet" && <><h1>Wallet</h1><section className="balance"><small>Available</small><strong>{money(user?.wallet.available)} ETB</strong><span>Reserved {money(user?.wallet.reserved)} ETB</span></section><button className="primary" onClick={()=>api("request_withdrawal",{amount:1000})}>1000 ETB ለማውጣት ጥያቄ ላክ</button></>}

        {screen==="client" && <Client onCreate={(x)=>api("create_task",x)} balance={user?.wallet.available||0}/>}

        <nav>
          <button className={tab==="home"?"active":""} onClick={()=>setTab("home")}>⌂<small>Home</small></button>
          {screen==="worker"&&<button className={tab==="tasks"?"active":""} onClick={()=>{setTab("tasks");load("tasks")}}>▣<small>Tasks</small></button>}
          {screen==="worker"&&<button className={tab==="wallet"?"active":""} onClick={()=>setTab("wallet")}>◉<small>Wallet</small></button>}
          <button onClick={()=>setScreen(screen==="worker"?"client":"worker")}>⇄<small>Switch</small></button>
        </nav>
      </main>
    </>
  );
}

function money(v?:number){return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
function Card({icon,title,value}:{icon:string,title:string,value:string|number}){return <div className="card"><i>{icon}</i><small>{title}</small><b>{value}</b></div>}
function TaskList({tasks,onAccept}:{tasks:Task[],onAccept:(id:string)=>void}) {
  if(!tasks.length)return <div className="empty">አሁን የሚገኝ ስራ የለም።</div>;
  return <div className="tasks">{tasks.map(t=><article className="task" key={t.id}><div className="row"><span>{t.category||"General"}</span><b>{money(t.budget)} ETB</b></div><h3>{t.title}</h3><small>{t.deadline?new Date(t.deadline).toLocaleString():"Deadline not set"}</small><button onClick={()=>onAccept(t.id)}>ስራውን ተቀበል</button></article>)}</div>
}
function Client({onCreate,balance}:{onCreate:(x:Record<string,unknown>)=>void,balance:number}) {
  return <><h1>💼 ስራ አስገባ</h1><section className="balance"><small>Available balance</small><strong>{money(balance)} ETB</strong></section><div className="form"><input id="ct" placeholder="የስራ ርዕስ"/><textarea id="cd" placeholder="የስራ መግለጫ"/><input id="cb" type="number" min="1" placeholder="Worker budget ETB"/><button className="primary" onClick={()=>onCreate({title:(document.getElementById("ct") as HTMLInputElement).value,description:(document.getElementById("cd") as HTMLTextAreaElement).value,budget:Number((document.getElementById("cb") as HTMLInputElement).value)})}>ስራ አስገባ</button></div></>
}