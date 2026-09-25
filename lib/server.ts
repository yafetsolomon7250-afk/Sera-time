import { createClient, SupabaseClient } from "@supabase/supabase-js";
let _db: SupabaseClient | null = null;
export function db(){ if(!_db) _db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}}); return _db; }
export async function authUser(accessToken:string){
  if(!accessToken) throw new Error("Please log in first.");
  const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}});
  const {data,error}=await anon.auth.getUser(accessToken); if(error||!data.user) throw new Error("Your session has expired. Please log in again.");
  const au=data.user;
  const {data:p,error:pe}=await db().from("profiles").select("*").eq("id",au.id).maybeSingle();
  if(pe) throw pe;
  if(p) return p;
  const full=(au.user_metadata?.full_name||au.email?.split("@")[0]||"Sera User").toString();
  const {data:created,error:ce}=await db().from("profiles").insert({id:au.id,email:au.email||"",full_name:full}).select("*").single();
  if(ce) throw ce;
  await db().from("wallets").upsert({user_id:au.id},{onConflict:"user_id"});
  return created;
}
export function text(v:any,max=10000){return String(v??"").trim().slice(0,max)}
export function num(v:any,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
export async function notify(userId:string,title:string,body:string,type="system"){await db().from("notifications").insert({user_id:userId,title,body,type});}
export async function manyNotify(ids:string[],title:string,body:string,type="system"){const rows=[...new Set(ids)].map(user_id=>({user_id,title,body,type}));if(rows.length) await db().from("notifications").insert(rows);}
