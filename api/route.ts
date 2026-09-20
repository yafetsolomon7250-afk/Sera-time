import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type TelegramUser = { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string };

function verify(initData: string): TelegramUser {
  if (!initData || !process.env.TELEGRAM_BOT_TOKEN) throw new Error("Telegram authentication is not configured");
  const p = new URLSearchParams(initData);
  const hash = p.get("hash");
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) throw new Error("Invalid Telegram data");
  p.delete("hash");
  const checkString = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(process.env.TELEGRAM_BOT_TOKEN).digest();
  const expected = crypto.createHmac("sha256", secret).update(checkString).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expected, "hex"))) throw new Error("Telegram authentication failed");
  const age = Math.floor(Date.now() / 1000) - Number(p.get("auth_date") || 0);
  if (age < 0 || age > 86400) throw new Error("Telegram session expired");
  const raw = p.get("user");
  if (!raw) throw new Error("Telegram user missing");
  return JSON.parse(raw) as TelegramUser;
}

async function getUser(initData: string) {
  const t = verify(initData);
  const { data, error } = await db.from("users").upsert({
    telegram_id: t.id, first_name: t.first_name || "", last_name: t.last_name || "",
    username: t.username || null, language_code: t.language_code || "am"
  }, { onConflict: "telegram_id" }).select("id,telegram_id,first_name,last_name,username").single();
  if (error) throw error;
  const { error: walletError } = await db.from("wallets").upsert({ user_id: data.id }, { onConflict: "user_id" });
  if (walletError) throw walletError;
  return data;
}

async function wallet(id: string) {
  const { data, error } = await db.from("wallets").select("available_balance,reserved_balance,total_earned").eq("user_id", id).maybeSingle();
  if (error) throw error;
  return { available: Number(data?.available_balance || 0), reserved: Number(data?.reserved_balance || 0), total_earned: Number(data?.total_earned || 0) };
}

function ok(data: unknown) { return NextResponse.json(data); }
function fail(e: unknown) { return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 400 }); }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  try {
    if (action === "health") return ok({ ok: true, service: "sera-time", time: new Date().toISOString() });
    if (action === "ads-reward") {
      const userid = searchParams.get("userid");
      if (!userid) return NextResponse.json({ ok: false, error: "Missing userid" }, { status: 400 });
      const { data, error } = await db.rpc("credit_adsgram_reward", {
        p_telegram_id: Number(userid),
        p_reward_etb: Number(process.env.ADS_REWARD_ETB || 1),
        p_daily_limit: Number(process.env.ADS_DAILY_LIMIT || 5)
      });
      if (error) throw error;
      return ok({ ok: true, result: data });
    }
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 404 });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { action?: string; initData?: string; taskId?: string; amount?: number; title?: string; description?: string; budget?: number };
    const action = body.action;
    if (action === "health") return ok({ ok: true, service: "sera-time", time: new Date().toISOString() });
    const u = await getUser(body.initData || "");

    if (action === "me") {
      const { data: ad, error: adError } = await db.rpc("get_ads_today", { p_user_id: u.id });
      if (adError) throw adError;
      return ok({ user: { ...u, wallet: await wallet(u.id) }, adsToday: Number(ad || 0) });
    }
    if (action === "tasks") {
      const { data, error } = await db.from("tasks").select("id,title,category,budget,deadline").eq("status", "open").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return ok({ user: { ...u, wallet: await wallet(u.id) }, tasks: data || [] });
    }
    if (action === "accept_task") {
      if (!body.taskId) throw new Error("Task ID is required");
      const { data, error } = await db.rpc("accept_task_atomic", { p_task_id: body.taskId, p_worker_id: u.id });
      if (error) throw error;
      return ok({ message: data, user: { ...u, wallet: await wallet(u.id) } });
    }
    if (action === "create_task") {
      const title = String(body.title || "").trim(), description = String(body.description || "").trim(), budget = Number(body.budget);
      if (!title || !description || !Number.isFinite(budget) || budget <= 0) throw new Error("የስራ መረጃውን በትክክል ያስገቡ");
      const fee = Number(process.env.PLATFORM_FEE_PERCENT || 10), reserve = budget + budget * fee / 100;
      const { data, error } = await db.rpc("create_task_atomic", { p_client_id: u.id, p_title: title, p_description: description, p_budget: budget, p_reserve: reserve, p_platform_fee: budget * fee / 100 });
      if (error) throw error;
      return ok({ message: data, user: { ...u, wallet: await wallet(u.id) } });
    }
    if (action === "request_withdrawal") {
      const amount = Number(body.amount), min = Number(process.env.MIN_WITHDRAWAL_ETB || 1000);
      if (!Number.isFinite(amount) || amount < min) throw new Error(`Minimum withdrawal is ${min} ETB`);
      const { data, error } = await db.rpc("request_withdrawal_atomic", { p_user_id: u.id, p_amount: amount });
      if (error) throw error;
      return ok({ message: data, user: { ...u, wallet: await wallet(u.id) } });
    }
    throw new Error("Unknown action");
  } catch (e) { return fail(e); }
}
