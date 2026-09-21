import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const num = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
const ok = (x: any) => NextResponse.json(x);
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

function validateTelegram(initData: string) {
  if (!initData) throw new Error("Telegram ላይ Sera Timeን ከBot ውስጥ ይክፈቱ።");
  const p = new URLSearchParams(initData);
  const hash = p.get("hash");
  if (!hash) throw new Error("Telegram ማረጋገጫ የለም። Sera Time Bot ውስጥ ያለውን 🚀 ክፈት ቁልፍ ይጠቀሙ።");
  p.delete("hash");
  const check = [...p.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(process.env.TELEGRAM_BOT_TOKEN || "")
    .digest();
  const expected = crypto.createHmac("sha256", secret).update(check).digest("hex");
  if (
    hash.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected))
  ) {
    throw new Error("Telegram ማረጋገጫ አልተሳካም።");
  }
  const authDate = Number(p.get("auth_date") || 0);
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (!authDate || age < 0 || age > 86400) {
    throw new Error("Telegram ክፍለ ጊዜው አልፏል። እንደገና ከBot ውስጥ ይክፈቱ።");
  }
  let u: any = {};
  try {
    u = JSON.parse(p.get("user") || "{}");
  } catch {
    throw new Error("Telegram የተጠቃሚ መረጃ አልተነበበም።");
  }
  if (!u?.id) throw new Error("Telegram user አልተገኘም። በSera Time Bot ውስጥ /start ይላኩ እና 🚀 ክፈት ይጫኑ።");
  return { u, startParam: p.get("start_param") || "" };
}

async function auth(body: any) {
  const { u, startParam } = validateTelegram(String(body.initData || ""));
  const { data, error } = await db.rpc("ensure_user", {
    p_telegram_id: String(u.id),
    p_first_name: u.first_name || "",
    p_last_name: u.last_name || "",
    p_username: u.username || null,
    p_start_param: String(body.ref || startParam || ""),
  });
  if (error) throw error;
  const admins = (process.env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((x: string) => x.trim())
    .filter(Boolean);
  if (admins.includes(String(u.id))) {
    await db
      .from("users")
      .update({ is_admin: true, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    data.is_admin = true;
  }
  return data;
}

async function rpc(name: string, args: any) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data;
}

async function notify(userId: string, title: string, body: string, type: string) {
  await db.from("notifications").insert({ user_id: userId, title, body, type });
}

async function tgMessage(userId: string, text: string) {
  try {
    const { data: u } = await db
      .from("users")
      .select("telegram_id")
      .eq("id", userId)
      .maybeSingle();
    if (!u?.telegram_id) return;
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: u.telegram_id, text, parse_mode: "HTML" }),
    });
  } catch {}
}

async function postToChannel(channel: string, text: string, replyMarkup?: any) {
  if (!channel || !process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    const chatId = channel.startsWith("@") ? channel : channel;
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: replyMarkup || undefined,
      }),
    });
  } catch (e) {
    console.error("Channel post failed", e);
  }
}

function ensureWorker(user: any) {
  if (user.banned) {
    throw new Error(
      `የሰራተኛ መለያዎ ታግዷል። ምክንያት: ${user.ban_reason || "አልተገለጸም"}። የደንበኛ ሚናዎን ግን መጠቀም ይችላሉ።`
    );
  }
}

function text(v: any, max: number) {
  return String(v ?? "").trim().slice(0, max);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await params;
    const body = await req.json().catch(() => ({}));
    const user = await auth(body);

    switch (action) {
      case "me":
        return ok({ user });

      case "set-role": {
        if (!["worker", "client"].includes(body.role)) throw new Error("ሚናው ትክክል አይደለም።");
        await db
          .from("users")
          .update({ active_role: body.role, updated_at: new Date().toISOString() })
          .eq("id", user.id);
        return ok({ ok: true, role: body.role });
      }

      case "dashboard":
        return ok(
          await rpc("dashboard", {
            p_user_id: user.id,
            p_role: body.role || user.active_role || "worker",
            p_ad_limit: num(process.env.ADS_DAILY_LIMIT, 5),
          })
        );

      case "tasks":
        ensureWorker(user);
        return ok({ tasks: await rpc("available_tasks", { p_worker_id: user.id }) });

      case "my-tasks":
        ensureWorker(user);
        return ok({ tasks: await rpc("my_tasks", { p_worker_id: user.id }) });

      case "my-posts":
        return ok({ tasks: await rpc("my_posts", { p_client_id: user.id }) });

      case "referrals":
        return ok(
          await rpc("referral_dashboard", {
            p_user_id: user.id,
            p_bot_username: process.env.TELEGRAM_BOT_USERNAME || "",
          })
        );

      case "wallet": {
        const w = await rpc("wallet_summary", { p_user_id: user.id });
        const { data: tx } = await db
          .from("ledger_entries")
          .select("id,type,amount,description,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        return ok({
          ...w,
          minWithdrawal: num(process.env.MIN_WITHDRAWAL_ETB, 1000),
          transactions: tx || [],
        });
      }

      case "deposits":
        return ok({ deposits: await rpc("my_deposits", { p_user_id: user.id }) });

      case "notifications":
        return ok({ notifications: await rpc("my_notifications", { p_user_id: user.id }) });

      case "read-notifications":
        return ok(await rpc("read_notifications", { p_user_id: user.id }));

      case "accept-task": {
        ensureWorker(user);
        const taskId = text(body.taskId, 80);
        if (!taskId) throw new Error("ስራ አልተመረጠም።");
        const { data: t } = await db
          .from("tasks")
          .select("client_id,title")
          .eq("id", taskId)
          .maybeSingle();
        const r = await rpc("accept_task", { p_user_id: user.id, p_task_id: taskId });
        if (t?.client_id) {
          await notify(t.client_id, "ስራዎ ተቀብሏል", "አንድ ሰራተኛ ስራዎን ተቀብሏል።", "task_assigned");
          await tgMessage(t.client_id, `📌 ስራዎ <b>${t.title || ""}</b> ተቀብሏል።`);
        }
        return ok(r);
      }

      case "submit-task": {
        ensureWorker(user);
        const taskId = text(body.taskId, 80);
        const content = text(body.content, 12000);
        if (!taskId) throw new Error("የስራ ውጤት ያስገቡ።");
        if (!content && !(body.files?.length > 0)) throw new Error("የስራ ውጤት ወይም ፋይል ያስገቡ።");

        const { data: t } = await db
          .from("tasks")
          .select("client_id,title")
          .eq("id", taskId)
          .maybeSingle();
        const r = await rpc("submit_task", {
          p_user_id: user.id,
          p_task_id: taskId,
          p_content: content,
        });

        // Save files if any
        if (Array.isArray(body.files) && body.files.length > 0) {
          const { data: sub } = await db
            .from("submissions")
            .select("id")
            .eq("task_id", taskId)
            .maybeSingle();
          if (sub?.id) {
            for (const f of body.files.slice(0, 5)) {
              await db.from("submission_files").insert({
                submission_id: sub.id,
                file_path: f.path || "",
                file_name: f.name || "file",
                mime_type: f.type || null,
              });
            }
          }
        }

        if (t?.client_id) {
          await notify(
            t.client_id,
            "ስራ ቀርቧል",
            `የሰራተኛው ስራ ለግምገማ ቀርቧል: ${t.title || ""}`,
            "submission"
          );
          await tgMessage(t.client_id, `📥 አዲስ ስራ ለግምገማ ቀርቧል።\n<b>${t.title || ""}</b>`);
        }
        return ok(r);
      }

      case "get-submission": {
        const taskId = text(body.taskId, 80);
        const { data: sub } = await db
          .from("submissions")
          .select("id,content,created_at")
          .eq("task_id", taskId)
          .maybeSingle();
        if (!sub) return ok({ content: "", files: [] });
        const { data: files } = await db
          .from("submission_files")
          .select("file_path,file_name")
          .eq("submission_id", sub.id);
        // Generate signed urls
        const withUrls = [];
        for (const f of files || []) {
          try {
            const { data: signed } = await db.storage
              .from("sera-time-files")
              .createSignedUrl(f.file_path, 3600);
            withUrls.push({ name: f.file_name, path: f.file_path, url: signed?.signedUrl });
          } catch {
            withUrls.push({ name: f.file_name, path: f.file_path, url: null });
          }
        }
        return ok({ content: sub.content, files: withUrls });
      }

      case "approve-task": {
        const taskId = text(body.taskId, 80);
        const { data: t } = await db
          .from("tasks")
          .select("assigned_worker_id,title")
          .eq("id", taskId)
          .maybeSingle();
        const r = await rpc("approve_task", { p_user_id: user.id, p_task_id: taskId });
        if (t?.assigned_worker_id) {
          await notify(
            t.assigned_worker_id,
            "ስራዎ ጸድቋል",
            "ክፍያዎ ወደ ዋሌትዎ ተጨምሯል።",
            "approval"
          );
          await tgMessage(
            t.assigned_worker_id,
            `✅ ስራዎ ጸድቋል።\n<b>${t.title || ""}</b>\nክፍያው ወደ ዋሌትዎ ገብቷል።`
          );
        }
        return ok(r);
      }

      case "request-revision": {
        const taskId = text(body.taskId, 80);
        const reason = text(body.reason, 3000);
        const { data: t } = await db
          .from("tasks")
          .select("assigned_worker_id,title")
          .eq("id", taskId)
          .maybeSingle();
        const r = await rpc("request_revision", {
          p_user_id: user.id,
          p_task_id: taskId,
          p_reason: reason,
        });
        if (t?.assigned_worker_id) {
          await notify(t.assigned_worker_id, "ማሻሻያ ተጠይቋል", reason, "revision");
          await tgMessage(
            t.assigned_worker_id,
            `🔁 በስራዎ ላይ ማሻሻያ ተጠይቋል።\n<b>${t.title || ""}</b>\nምክንያት: ${reason}`
          );
        }
        return ok(r);
      }

      case "reject-task": {
        // Full reject → ban worker + reopen task
        const taskId = text(body.taskId, 80);
        const reason = text(body.reason, 3000) || "ደንበኛው ስራውን ሙሉ በሙሉ አልተቀበለም።";
        const { data: t } = await db
          .from("tasks")
          .select("*")
          .eq("id", taskId)
          .maybeSingle();
        if (!t) throw new Error("ስራ አልተገኘም።");
        if (t.client_id !== user.id) throw new Error("ይህ የእርስዎ ስራ አይደለም።");
        if (t.status !== "submitted") throw new Error("ስራው ለመቃወም ዝግጁ አይደለም።");

        // Ban worker
        if (t.assigned_worker_id) {
          await db
            .from("users")
            .update({
              banned: true,
              ban_reason: reason,
              ban_until: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", t.assigned_worker_id);
          await db.from("bans").insert({
            user_id: t.assigned_worker_id,
            type: "reject",
            reason,
            created_by: user.id,
          });
          await notify(
            t.assigned_worker_id,
            "መለያዎ ታግዷል",
            `ምክንያት: ${reason}`,
            "ban"
          );
          await tgMessage(
            t.assigned_worker_id,
            `🚫 የሰራተኛ መለያዎ ታግዷል።\n\nምክንያት: ${reason}\n\nየደንበኛ ሚናዎን ግን መጠቀም ይችላሉ።`
          );
        }

        // Reopen task (release reservation stays, just reset assignment)
        await db
          .from("tasks")
          .update({
            status: "open",
            assigned_worker_id: null,
            assigned_at: null,
            submitted_at: null,
            revision_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId);

        await notify(
          user.id,
          "ስራው እንደገና ተለጥፏል",
          "ሰራተኛው ታግዷል እና ስራው እንደገና ክፍት ሆኗል።",
          "task_reopened"
        );
        return ok({ ok: true });
      }

      case "open-dispute":
        return ok(
          await rpc("open_dispute", {
            p_user_id: user.id,
            p_task_id: text(body.taskId, 80),
            p_reason: text(body.reason, 3000),
            p_evidence: text(body.evidence, 5000),
          })
        );

      case "create-task": {
        const budget = num(body.budget, 0);
        const hours = Math.min(720, Math.max(1, num(body.deadlineHours, 24)));
        if (budget <= 0) throw new Error("በጀት ትክክል አይደለም።");
        const deadline = new Date(Date.now() + hours * 3600000).toISOString();
        const task = await rpc("create_task", {
          p_client_id: user.id,
          p_category: text(body.category, 80),
          p_title: text(body.title, 180),
          p_description: text(body.description, 8000),
          p_requirements: text(body.requirements, 8000),
          p_budget: budget,
          p_deadline_at: deadline,
        });

        // Attach brief files
        if (Array.isArray(body.files) && body.files.length > 0 && task?.id) {
          for (const f of body.files.slice(0, 5)) {
            await db.from("task_files").insert({
              task_id: task.id,
              file_path: f.path || "",
              file_url: f.url || null,
              file_name: f.name || "file",
            });
          }
        }
        return ok(task);
      }

      case "create-deposit": {
        const amount = num(body.amount, 0);
        const method = text(body.method, 40);
        const reference = text(body.reference, 160);
        const deposit = await rpc("create_deposit", {
          p_user_id: user.id,
          p_amount: amount,
          p_method: method,
          p_reference: reference,
          p_proof_url: body.proofUrl || null,
        });

        // Post to deposit channel
        const channel = process.env.DEPOSIT_CHANNEL || "@depistseratime";
        const msg =
          `💰 <b>አዲስ ዲፖዚት ጥያቄ</b>\n\n` +
          `መጠን: <b>${amount.toFixed(2)} ብር</b>\n` +
          `ዘዴ: ${method}\n` +
          `ማጣቀሻ: ${reference || "-"}\n` +
          `ተጠቃሚ: ${user.first_name || ""} (${user.telegram_id})\n` +
          `ID: <code>${deposit.id}</code>`;
        await postToChannel(channel, msg, {
          inline_keyboard: [
            [
              { text: "✅ አጽድቅ", callback_data: `dep_ok_${deposit.id}` },
              { text: "❌ አትቀበል", callback_data: `dep_no_${deposit.id}` },
            ],
          ],
        });

        await notify(user.id, "የዲፖዚት ጥያቄ", "ጥያቄዎ ተልኳል። አስተዳዳሪው እስኪፈቅድ ይጠብቁ።", "deposit");
        return ok(deposit);
      }

      case "withdraw": {
        const amount = num(body.amount, 0);
        const method = text(body.method, 40);
        const accountNumber = text(body.accountNumber, 80);
        const accountName = text(body.accountName, 180);
        const r = await rpc("create_withdrawal", {
          p_user_id: user.id,
          p_amount: amount,
          p_method: method,
          p_account_number: accountNumber,
          p_account_name: accountName,
        });

        // Post to withdrawal channel
        const channel = process.env.WITHDRAWAL_CHANNEL || "@withdrawseratime";
        const msg =
          `🏦 <b>አዲስ የማውጣት ጥያቄ</b>\n\n` +
          `መጠን: <b>${amount.toFixed(2)} ብር</b>\n` +
          `ዘዴ: ${method}\n` +
          `ሂሳብ: ${accountNumber}\n` +
          `ስም: ${accountName}\n` +
          `ተጠቃሚ: ${user.first_name || ""} (${user.telegram_id})\n` +
          `ID: <code>${r.id}</code>`;
        await postToChannel(channel, msg, {
          inline_keyboard: [
            [
              { text: "✅ ክፈል (Done)", callback_data: `wd_ok_${r.id}` },
              { text: "❌ አትቀበል", callback_data: `wd_no_${r.id}` },
            ],
          ],
        });

        await notify(user.id, "የማውጣት ጥያቄ", "ጥያቄዎ ተቀብሏል። በ24 ሰዓት ውስጥ ይደርሳል።", "withdrawal");
        return ok(r);
      }

      case "admin-dashboard": {
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        const summary = await rpc("admin_dashboard", {});
        const { data: withdrawals } = await db
          .from("withdrawals")
          .select(
            "id,user_id,amount,fee,method,account_number,account_name,status,created_at"
          )
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(50);
        const { data: deposits } = await db
          .from("deposits")
          .select("id,user_id,amount,method,reference,status,created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(50);
        return ok({ ...summary, withdrawals: withdrawals || [], deposits: deposits || [] });
      }

      case "admin-withdraw": {
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        const approve = body.status === "paid";
        const id = text(body.withdrawalId, 80);
        const { data: w } = await db
          .from("withdrawals")
          .select("user_id")
          .eq("id", id)
          .maybeSingle();
        const r = await rpc("admin_withdraw", {
          p_admin_id: user.id,
          p_withdrawal_id: id,
          p_approve: approve,
        });
        if (w?.user_id) {
          await notify(
            w.user_id,
            approve ? "ማውጣት ተከፍሏል" : "ማውጣት ተቀባይነት አላገኘም",
            approve ? "የማውጣት ጥያቄዎ ተከፍሏል።" : "የማውጣት ጥያቄዎ ተቀባይነት አላገኘም።",
            "withdrawal"
          );
          await tgMessage(
            w.user_id,
            approve
              ? "✅ የማውጣት ጥያቄዎ ተከፍሏል። ገንዘቡ ወደ ሂሳብዎ ገብቷል።"
              : "❌ የማውጣት ጥያቄዎ ተቀባይነት አላገኘም።"
          );
        }
        return ok(r);
      }

      case "admin-deposit": {
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        const approve = body.status === "approved";
        const id = text(body.depositId, 80);
        const { data: d } = await db
          .from("deposits")
          .select("user_id")
          .eq("id", id)
          .maybeSingle();
        const r = await rpc("admin_deposit", {
          p_admin_id: user.id,
          p_deposit_id: id,
          p_approve: approve,
        });
        if (d?.user_id) {
          await notify(
            d.user_id,
            approve ? "ዲፖዚት ተፈቅዷል" : "ዲፖዚት ተቀባይነት አላገኘም",
            approve ? "ገንዘቡ ወደ ዋሌትዎ ተጨምሯል።" : "የዲፖዚት ጥያቄዎ ተቀባይነት አላገኘም።",
            "deposit"
          );
          await tgMessage(
            d.user_id,
            approve
              ? "✅ ዲፖዚትዎ ተፈቅዷል። ገንዘቡ ወደ ዋሌትዎ ገብቷል።"
              : "❌ የዲፖዚት ጥያቄዎ ተቀባይነት አላገኘም።"
          );
        }
        return ok(r);
      }

      default:
        return fail("API endpoint not found", 404);
    }
  } catch (e: any) {
    return fail(e?.message || "Server error", 400);
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await params;
    if (action === "health") {
      return ok({ ok: true, service: "sera-time", version: "5.0", time: new Date().toISOString() });
    }
    if (action !== "ads-reward") return fail("API endpoint not found", 404);

    const secret = req.nextUrl.searchParams.get("secret") || "";
    if (!process.env.ADSGRAM_REWARD_SECRET || secret !== process.env.ADSGRAM_REWARD_SECRET) {
      return fail("Unauthorized", 401);
    }
    const telegramId = req.nextUrl.searchParams.get("userid") || "";
    if (!telegramId) return fail("userid is required", 400);

    const { data: u } = await db
      .from("users")
      .select("id,banned")
      .eq("telegram_id", telegramId)
      .maybeSingle();
    if (!u || u.banned) return fail("user not eligible", 403);

    // Stable daily event id for idempotency
    const day = new Date().toISOString().slice(0, 10);
    const eventId = `adsgram:${telegramId}:${day}`;
    const credited = await rpc("credit_adsgram_reward", {
      p_user_id: u.id,
      p_event_id: eventId,
      p_amount: num(process.env.ADS_REWARD_ETB, 1),
    });
    return ok({ ok: true, credited });
  } catch (e: any) {
    return fail(e?.message || "Server error", 400);
  }
}
