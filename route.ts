import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const db=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const n=(k:string,d:number)=>Number.isFinite(Number(process.env[k]))?Number(process.env[k]):d;
const ok=(x:any)=>NextResponse.json(x,{status:200});
const fail=(m:string,s=400)=>NextResponse.json({error:m},{status:s});

function tgUser(initData:string){
 if(!initData)throw new Error("افتح Sera Time من داخل Telegram");
 const p=new URLSearchParams(initData),hash=p.get("hash"); if(!hash)throw new Error("Telegram initData غير صالح"); p.delete("hash");
 const check=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n");
 const secret=crypto.createHmac("sha256","WebAppData").update(process.env.TELEGRAM_BOT_TOKEN!).digest();
 const expected=crypto.createHmac("sha256",secret).update(check).digest("hex");
 if(hash.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(expected)))throw new Error("فشل التحقق من Telegram");
 const age=Math.floor(Date.now()/1000)-Number(p.get("auth_date")||0); if(age<0||age>86400)throw new Error("جلسة Telegram منتهية");
 const u=JSON.parse(p.get("user")||"{}"); if(!u.id)throw new Error("Telegram user مفقود"); return {u,startParam:p.get("start_param")||""};
}
async function auth(body:any){const {u,startParam}=tgUser(String(body.initData||""));const {data,error}=await db.rpc("ensure_user",{p_telegram_id:String(u.id),p_first_name:u.first_name||"",p_last_name:u.last_name||"",p_username:u.username||null,p_start_param:String(body.ref||startParam||"")});if(error)throw error;const admins=(process.env.ADMIN_TELEGRAM_IDS||"").split(",").map(x=>x.trim()).filter(Boolean);if(admins.includes(String(u.id))){await db.from("users").update({is_admin:true}).eq("id",data.id);data.is_admin=true;}return data}
async function rpc(name:string,args:any){const {data,error}=await db.rpc(name,args);if(error)throw error;return data}

async function tgMessage(userId:string,text:string){try{const {data:u}=await db.from("users").select("telegram_id").eq("id",userId).maybeSingle();if(!u?.telegram_id)return;await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:u.telegram_id,text})});}catch{}}

export async function POST(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 try{
  const {action}=await params,body=await req.json().catch(()=>({}));
  const user=await auth(body);
  switch(action){
   case "me":return ok({user});
   case "set-role":if(!["worker","client"].includes(body.role))throw new Error("دور غير صحيح");await db.from("users").update({active_role:body.role,updated_at:new Date().toISOString()}).eq("id",user.id);return ok({ok:true,role:body.role});
   case "dashboard":return ok(await rpc("dashboard",{p_user_id:user.id,p_role:body.role||"worker",p_ad_limit:n("ADS_DAILY_LIMIT",5)}));
   case "tasks":return ok(await rpc("available_tasks",{p_user_id:user.id}));
   case "my-tasks":return ok(await rpc("my_tasks",{p_user_id:user.id}));
   case "my-posts":return ok(await rpc("my_posts",{p_user_id:user.id}));
   case "referrals":return ok(await rpc("referral_dashboard",{p_user_id:user.id,p_bot_username:process.env.TELEGRAM_BOT_USERNAME||""}));
   case "wallet":return ok(await rpc("wallet_summary",{p_user_id:user.id,p_min_withdrawal:n("MIN_WITHDRAWAL_ETB",1000)}));
   case "deposits":return ok(await rpc("my_deposits",{p_user_id:user.id,p_min:n("DEPOSIT_MIN_ETB",100)}));
   case "notifications":return ok(await rpc("my_notifications",{p_user_id:user.id}));
   case "read-notifications":return ok(await rpc("read_notifications",{p_user_id:user.id}));
   case "accept-task":{const {data:t}=await db.from("tasks").select("client_id").eq("id",body.taskId).maybeSingle();const r=await rpc("accept_task",{p_user_id:user.id,p_task_id:body.taskId});if(t?.client_id)await tgMessage(t.client_id,"📌 تم قبول عملك في Sera Time. افتح التطبيق لمتابعة التسليم.");return ok(r);}
   case "submit-task":{const {data:t}=await db.from("tasks").select("client_id").eq("id",body.taskId).maybeSingle();const r=await rpc("submit_task",{p_user_id:user.id,p_task_id:body.taskId,p_content:String(body.content||"")});if(t?.client_id)await tgMessage(t.client_id,"📥 تم تسليم عمل جديد للمراجعة في Sera Time.");return ok(r);}
   case "approve-task":{const {data:t}=await db.from("tasks").select("assigned_worker_id").eq("id",body.taskId).maybeSingle();const r=await rpc("approve_task",{p_user_id:user.id,p_task_id:body.taskId,p_referral_percent:n("REFERRAL_PERCENT",5)});if(t?.assigned_worker_id)await tgMessage(t.assigned_worker_id,"✅ تم اعتماد عملك وإضافة أجرك إلى محفظتك في Sera Time.");return ok(r);}
   case "request-revision":{const {data:t}=await db.from("tasks").select("assigned_worker_id").eq("id",body.taskId).maybeSingle();const r=await rpc("request_revision",{p_user_id:user.id,p_task_id:body.taskId,p_reason:String(body.reason||""),p_limit:n("REVISION_LIMIT",2)});if(t?.assigned_worker_id)await tgMessage(t.assigned_worker_id,"🔁 طلب العميل تعديلاً على عملك في Sera Time.");return ok(r);}
   case "open-dispute":{const {data:t}=await db.from("tasks").select("client_id,assigned_worker_id").eq("id",body.taskId).maybeSingle();const r=await rpc("open_dispute",{p_user_id:user.id,p_task_id:body.taskId,p_reason:String(body.reason||"")});if(t?.client_id&&t.client_id!==user.id)await tgMessage(t.client_id,"⚖️ تم فتح نزاع على عمل في Sera Time.");if(t?.assigned_worker_id&&t.assigned_worker_id!==user.id)await tgMessage(t.assigned_worker_id,"⚖️ تم فتح نزاع على عمل في Sera Time.");return ok(r);}
   case "create-task":return ok(await rpc("create_task",{p_user_id:user.id,p_category:String(body.category||""),p_title:String(body.title||""),p_description:String(body.description||""),p_requirements:String(body.requirements||""),p_deadline_hours:Number(body.deadlineHours||24),p_budget:Number(body.budget||0),p_platform_fee:n("PLATFORM_FEE_PERCENT",10),p_revision_limit:n("REVISION_LIMIT",2)}));
   case "create-deposit":{const r=await rpc("create_deposit",{p_user_id:user.id,p_amount:Number(body.amount),p_method:String(body.method),p_reference:String(body.reference||""),p_min:n("DEPOSIT_MIN_ETB",100)});return ok(r);}
   case "withdraw":{const r=await rpc("create_withdrawal",{p_user_id:user.id,p_amount:Number(body.amount),p_method:String(body.method),p_account_number:String(body.accountNumber||""),p_account_name:String(body.accountName||""),p_min_withdrawal:n("MIN_WITHDRAWAL_ETB",1000),p_fee:n("WITHDRAWAL_FEE_ETB",0)});await tgMessage(user.id,"💸 تم إرسال طلب السحب للمراجعة في Sera Time.");return ok(r);}
   case "ads-reward":return fail("AdsGram rewards are provider-confirmed. Use the AdsGram Reward URL callback.",400);
   case "admin-dashboard":if(!user.is_admin)throw new Error("غير مصرح");return ok(await rpc("admin_dashboard",{p_admin_id:user.id}));
   case "admin-withdraw":if(!user.is_admin)throw new Error("غير مصرح");{const {data:w}=await db.from("withdrawals").select("user_id").eq("id",body.withdrawalId).maybeSingle();const r=await rpc("admin_withdraw",{p_admin_id:user.id,p_withdrawal_id:body.withdrawalId,p_status:body.status,p_reason:body.reason||null});if(w?.user_id)await tgMessage(w.user_id,body.status==="paid"?"💰 تم دفع طلب السحب الخاص بك في Sera Time.":"❌ تم رفض طلب السحب الخاص بك.");return ok(r);}
   case "admin-deposit":if(!user.is_admin)throw new Error("غير مصرح");{const {data:d}=await db.from("deposits").select("user_id").eq("id",body.depositId).maybeSingle();const r=await rpc("admin_deposit",{p_admin_id:user.id,p_deposit_id:body.depositId,p_status:body.status,p_reason:body.reason||null});if(d?.user_id)await tgMessage(d.user_id,body.status==="approved"?"💳 تم اعتماد إيداعك وإضافة الرصيد.":"❌ تم رفض طلب الإيداع الخاص بك.");return ok(r);}
   default:return fail("API endpoint not found",404);
  }
 }catch(e:any){return fail(e?.message||"Server error",400)}
}

export async function GET(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 try{
  const {action}=await params;
  if(action==="health")return ok({ok:true,service:"sera-time"});
  if(action!=="ads-reward")return fail("API endpoint not found",404);
  const telegramId=req.nextUrl.searchParams.get("userid")||"";
  if(!telegramId)return fail("userid is required",400);
  // AdsGram's Reward URL callback supplies the Telegram ID. The callback itself is the provider confirmation.
  const {data:u,error}=await db.from("users").select("id,banned").eq("telegram_id",telegramId).maybeSingle(); if(error)throw error;if(!u||u.banned)return fail("user not eligible",403);
  const result=await rpc("credit_adsgram_reward",{p_user_id:u.id,p_event_id:`adsgram:${telegramId}:${Math.floor(Date.now()/300000)}`,p_daily_limit:n("ADS_DAILY_LIMIT",5),p_reward:n("ADS_REWARD_ETB",1)});return ok(result);
 }catch(e:any){return fail(e?.message||"Server error",400)}
}
