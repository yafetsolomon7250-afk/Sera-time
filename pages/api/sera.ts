import type { NextApiRequest, NextApiResponse } from "next";
import {
  authUser, rpc, notify, tgMessage, postToChannel, ensureWorker, num, text, db,
} from "../../lib/server";

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const body = req.body || {};
  const action = String(body.action || req.query.action || "");
  const ok = (x: any) => res.status(200).json(x);
  const fail = (m: string, s = 400) => res.status(s).json({ error: m });

  try {
    // health without auth
    if (action === "health") {
      return ok({ ok: true, service: "sera-time", version: "9.1", time: new Date().toISOString() });
    }

    const user = await authUser(String(body.initData || ""), body.ref);

switch (action) {
      case "me":
        return ok({ user });

      case "set-role": {
        if (!["worker", "client"].includes(body.role)) throw new Error("ሚናው ትክክል አይደለም።");
        await db().from("users").update({ active_role: body.role, updated_at: new Date().toISOString() }).eq("id", user.id);
        return ok({ ok: true, role: body.role });
      }

      case "dashboard":
        return ok(await rpc("dashboard", {
          p_user_id: user.id,
          p_role: body.role || user.active_role || "worker",
          p_ad_limit: num(process.env.ADS_DAILY_LIMIT, 5),
        }));

      case "tasks": {
        ensureWorker(user);
        const tasks = await rpc("available_tasks", { p_worker_id: user.id });
        return ok({ tasks: tasks || [] });
      }

      case "my-tasks":
        ensureWorker(user);
        return ok({ tasks: await rpc("my_tasks", { p_worker_id: user.id }) });

      case "my-posts":
        return ok({ tasks: await rpc("my_posts", { p_client_id: user.id }) });

      case "referrals": {
        const bot = (process.env.TELEGRAM_BOT_USERNAME || "seratimebot").replace("@", "");
        // Short link uses telegram_id (not long UUID)
        const link = `https://t.me/${bot}/Sera?startapp=r_${user.telegram_id}`;
        const dash = await rpc("referral_dashboard", { p_user_id: user.id, p_bot_username: bot });
        return ok({ ...dash, link });
      }

      case "wallet": {
        const w = await rpc("wallet_summary", { p_user_id: user.id });
        const { data: tx } = await db()
          .from("ledger_entries")
          .select("id,type,amount,description,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        return ok({ ...w, minWithdrawal: num(process.env.MIN_WITHDRAWAL_ETB, 1000), transactions: tx || [] });
      }

      case "deposits":
        return ok({ deposits: await rpc("my_deposits", { p_user_id: user.id }) });

      case "notifications":
        return ok({ notifications: await rpc("my_notifications", { p_user_id: user.id }) });

      case "read-notifications":
        return ok(await rpc("read_notifications", { p_user_id: user.id }));

      case "profile": {
        const { data: u } = await db().from("users").select("id,first_name,username,xp,level,rating_avg,rating_count,streak_days,created_at").eq("id", user.id).maybeSingle();
        const completed = await db().from("tasks").select("id", { count: "exact", head: true }).eq("assigned_worker_id", user.id).eq("status", "completed");
        return ok({ profile: u, completedJobs: completed.count || 0 });
      }

      case "leaderboard": {
        const { data } = await db().from("users").select("id,first_name,username,xp,level,rating_avg").eq("banned", false).order("xp", { ascending: false }).limit(20);
        return ok({ leaders: data || [] });
      }

      case "accept-task": {
        ensureWorker(user);
        const taskId = text(body.taskId, 80);
        if (!taskId) throw new Error("ስራ አልተመረጠም።");
        const { data: t } = await db().from("tasks").select("client_id,title").eq("id", taskId).maybeSingle();
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
        if (!taskId) throw new Error("ስራ አልተመረጠም።");
        if (!content && !(body.files?.length > 0)) throw new Error("የስራ ውጤት ወይም ፋይል ያስገቡ።");
        const { data: t } = await db().from("tasks").select("client_id,title").eq("id", taskId).maybeSingle();
        const r = await rpc("submit_task", { p_user_id: user.id, p_task_id: taskId, p_content: content });
        if (Array.isArray(body.files) && body.files.length > 0) {
          const { data: sub } = await db().from("submissions").select("id").eq("task_id", taskId).maybeSingle();
          if (sub?.id) {
            for (const f of body.files.slice(0, 5)) {
              await db().from("submission_files").insert({
                submission_id: sub.id,
                file_path: f.path || "",
                file_name: f.name || "file",
              });
            }
          }
        }
        if (t?.client_id) {
          await notify(t.client_id, "ስራ ቀርቧል", `ለግምገማ: ${t.title || ""}`, "submission");
          await tgMessage(t.client_id, `📥 አዲስ ስራ ለግምገማ ቀርቧል።\n<b>${t.title || ""}</b>`);
        }
        return ok(r);
      }

      case "get-submission": {
        const taskId = text(body.taskId, 80);
        const { data: sub } = await db().from("submissions").select("id,content,created_at").eq("task_id", taskId).maybeSingle();
        if (!sub) return ok({ content: "", files: [] });
        const { data: files } = await db().from("submission_files").select("file_path,file_name").eq("submission_id", sub.id);
        const withUrls = [];
        for (const f of files || []) {
          try {
            const { data: signed } = await db().storage.from("sera-time-files").createSignedUrl(f.file_path, 3600);
            withUrls.push({ name: f.file_name, path: f.file_path, url: signed?.signedUrl });
          } catch {
            withUrls.push({ name: f.file_name, path: f.file_path, url: null });
          }
        }
        return ok({ content: sub.content, files: withUrls });
      }

      case "approve-task": {
        const taskId = text(body.taskId, 80);
        const { data: t } = await db().from("tasks").select("assigned_worker_id,title").eq("id", taskId).maybeSingle();
        const r = await rpc("approve_task", { p_user_id: user.id, p_task_id: taskId });
        // XP for worker
        if (t?.assigned_worker_id) {
          const { data: wu } = await db()
            .from("users")
            .select("xp")
            .eq("id", t.assigned_worker_id)
            .maybeSingle();
          if (wu) {
            const newXp = (Number(wu.xp) || 0) + 50;
            const newLevel = Math.floor(newXp / 200) + 1;
            await db().from("users").update({ xp: newXp, level: newLevel }).eq("id", t.assigned_worker_id);
          }
          await notify(t.assigned_worker_id, "ስራዎ ጸድቋል", "ክፍያዎ ወደ ዋሌትዎ ተጨምሯል። +50 XP", "approval");
          await tgMessage(t.assigned_worker_id, `✅ ስራዎ ጸድቋል።\n<b>${t.title || ""}</b>\nክፍያው ወደ ዋሌትዎ ገብቷል።`);
        }
        // optional rating
        if (body.rating && t?.assigned_worker_id) {
          const score = Math.min(5, Math.max(1, Number(body.rating)));
          await db().from("ratings").upsert({
            task_id: taskId,
            from_user_id: user.id,
            to_user_id: t.assigned_worker_id,
            score,
            comment: text(body.ratingComment, 500),
          }, { onConflict: "task_id" });
          const { data: ratings } = await db().from("ratings").select("score").eq("to_user_id", t.assigned_worker_id);
          if (ratings?.length) {
            const avg = ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
            await db().from("users").update({ rating_avg: avg, rating_count: ratings.length }).eq("id", t.assigned_worker_id);
          }
        }
        return ok(r);
      }

      case "request-revision": {
        const taskId = text(body.taskId, 80);
        const reason = text(body.reason, 3000);
        const { data: t } = await db().from("tasks").select("assigned_worker_id,title").eq("id", taskId).maybeSingle();
        const r = await rpc("request_revision", { p_user_id: user.id, p_task_id: taskId, p_reason: reason });
        if (t?.assigned_worker_id) {
          await notify(t.assigned_worker_id, "ማሻሻያ ተጠይቋል", reason, "revision");
          await tgMessage(t.assigned_worker_id, `🔁 ማሻሻያ ተጠይቋል።\n<b>${t.title || ""}</b>\n${reason}`);
        }
        return ok(r);
      }

      case "reject-task": {
        const taskId = text(body.taskId, 80);
        const reason = text(body.reason, 3000) || "ደንበኛው ስራውን ሙሉ በሙሉ አልተቀበለም።";
        const { data: t } = await db().from("tasks").select("*").eq("id", taskId).maybeSingle();
        if (!t) throw new Error("ስራ አልተገኘም።");
        if (t.client_id !== user.id) throw new Error("ይህ የእርስዎ ስራ አይደለም።");
        if (t.status !== "submitted") throw new Error("ስራው ለመቃወም ዝግጁ አይደለም።");
        if (t.assigned_worker_id) {
          await db().from("users").update({ banned: true, ban_reason: reason, updated_at: new Date().toISOString() }).eq("id", t.assigned_worker_id);
          await db().from("bans").insert({ user_id: t.assigned_worker_id, type: "reject", reason, created_by: user.id });
          await notify(t.assigned_worker_id, "መለያዎ ታግዷል", `ምክንያት: ${reason}`, "ban");
          await tgMessage(t.assigned_worker_id, `🚫 የሰራተኛ መለያዎ ታግዷል።\n\nምክንያት: ${reason}`);
        }
        await db().from("tasks").update({
          status: "open", assigned_worker_id: null, assigned_at: null, submitted_at: null, revision_count: 0, updated_at: new Date().toISOString(),
        }).eq("id", taskId);
        return ok({ ok: true });
      }

      case "open-dispute":
        return ok(await rpc("open_dispute", {
          p_user_id: user.id,
          p_task_id: text(body.taskId, 80),
          p_reason: text(body.reason, 3000),
          p_evidence: text(body.evidence, 5000),
        }));

      case "report": {
        await db().from("reports").insert({
          reporter_id: user.id,
          target_user_id: body.targetUserId || null,
          task_id: body.taskId || null,
          reason: text(body.reason, 2000),
        });
        return ok({ ok: true });
      }

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
        if (Array.isArray(body.files) && body.files.length > 0 && task?.id) {
          for (const f of body.files.slice(0, 5)) {
            await db().from("task_files").insert({
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
        if (!body.proofUrl && !body.proofPath) throw new Error("የክፍያ ስክሪንሹት ያስገቡ።");
        const deposit = await rpc("create_deposit", {
          p_user_id: user.id,
          p_amount: amount,
          p_method: "telebirr",
          p_reference: text(body.reference, 160) || null,
          p_proof_url: body.proofUrl || null,
        });
        const channel = process.env.DEPOSIT_CHANNEL || "";
        const telebirr = process.env.TELEBIRR_NUMBER || "0944546457";
        const msg =
          `💰 <b>አዲስ ዲፖዚት</b>\n\n` +
          `መጠን: <b>${amount.toFixed(2)} ብር</b>\n` +
          `Telebirr: ${telebirr}\n` +
          `ማጣቀሻ: ${text(body.reference, 160) || "-"}\n` +
          `ተጠቃሚ: ${user.first_name || ""} | <code>${user.telegram_id}</code>\n` +
          `ID: <code>${deposit.id}</code>` +
          (body.proofUrl ? `\n\nስክሪንሹት: ${body.proofUrl}` : "");
        if (channel) {
          await postToChannel(channel, msg, {
            inline_keyboard: [[
              { text: "✅ አጽድቅ", callback_data: `dep_ok_${deposit.id}` },
              { text: "❌ አትቀበል", callback_data: `dep_no_${deposit.id}` },
            ]],
          });
        }
        await notify(user.id, "የዲፖዚት ጥያቄ", "ጥያቄዎ ተልኳል። እስኪፈቀድ ይጠብቁ።", "deposit");
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
        const channel = process.env.WITHDRAWAL_CHANNEL || "";
        const msg =
          `🏦 <b>አዲስ ማውጣት</b>\n\n` +
          `መጠን: <b>${amount.toFixed(2)} ብር</b>\n` +
          `ዘዴ: ${method}\n` +
          `ሂሳብ: ${accountNumber}\n` +
          `ስም: ${accountName}\n` +
          `ተጠቃሚ: ${user.first_name || ""} | <code>${user.telegram_id}</code>\n` +
          `ID: <code>${r.id}</code>`;
        if (channel) {
          await postToChannel(channel, msg, {
            inline_keyboard: [[
              { text: "✅ ክፈል (Done)", callback_data: `wd_ok_${r.id}` },
              { text: "❌ አትቀበል", callback_data: `wd_no_${r.id}` },
            ]],
          });
        }
        await notify(user.id, "የማውጣት ጥያቄ", "ጥያቄዎ ተቀብሏል። በ24 ሰዓት ውስጥ ይደርሳል።", "withdrawal");
        return ok(r);
      }

      /* ========== ADMIN ========== */
      case "admin-dashboard": {
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        const summary = await rpc("admin_dashboard", {});
        const { data: withdrawals } = await db().from("withdrawals").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(50);
        const { data: deposits } = await db().from("deposits").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(50);
        const { data: disputes } = await db().from("disputes").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(30);
        const { data: reports } = await db().from("reports").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(30);
        const { data: recentUsers } = await db().from("users").select("id,telegram_id,first_name,username,banned,ban_reason,xp,level,created_at").order("created_at", { ascending: false }).limit(30);
        return ok({
          ...summary,
          withdrawals: withdrawals || [],
          deposits: deposits || [],
          disputes: disputes || [],
          reports: reports || [],
          recentUsers: recentUsers || [],
        });
      }

      case "admin-withdraw": {
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        const approve = body.status === "paid";
        const id = text(body.withdrawalId, 80);
        const { data: w } = await db().from("withdrawals").select("user_id").eq("id", id).maybeSingle();
        const r = await rpc("admin_withdraw", { p_admin_id: user.id, p_withdrawal_id: id, p_approve: approve });
        if (w?.user_id) {
          await notify(w.user_id, approve ? "ማውጣት ተከፍሏል" : "ማውጣት ተቀባይነት አላገኘም",
            approve ? "የማውጣት ጥያቄዎ ተከፍሏል።" : "የማውጣት ጥያቄዎ ተቀባይነት አላገኘም።", "withdrawal");
          await tgMessage(w.user_id, approve ? "✅ ማውጣት ተከፍሏል።" : "❌ ማውጣት ተቀባይነት አላገኘም።");
        }
        return ok(r);
      }

      case "admin-deposit": {
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        const approve = body.status === "approved";
        const id = text(body.depositId, 80);
        const { data: d } = await db().from("deposits").select("user_id").eq("id", id).maybeSingle();
        const r = await rpc("admin_deposit", { p_admin_id: user.id, p_deposit_id: id, p_approve: approve });
        if (d?.user_id) {
          await notify(d.user_id, approve ? "ዲፖዚት ተፈቅዷል" : "ዲፖዚት ተቀባይነት አላገኘም",
            approve ? "ገንዘቡ ወደ ዋሌትዎ ተጨምሯል።" : "የዲፖዚት ጥያቄዎ ተቀባይነት አላገኘም።", "deposit");
          await tgMessage(d.user_id, approve ? "✅ ዲፖዚትዎ ተፈቅዷል።" : "❌ ዲፖዚት ተቀባይነት አላገኘም።");
        }
        return ok(r);
      }

      case "admin-adjust-balance": {
        // No SQL RPC needed — works with normal table updates
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        const targetId = text(body.userId, 80);
        const amount = num(body.amount, 0);
        const note = text(body.note, 500) || "Admin adjustment";
        if (!targetId) throw new Error("ተጠቃሚ ይምረጡ።");
        if (!amount) throw new Error("መጠን ያስገቡ።");
        const { data: w } = await db().from("wallets").select("user_id,available").eq("user_id", targetId).maybeSingle();
        if (!w) {
          await db().from("wallets").insert({ user_id: targetId, available: amount, locked: 0 });
        } else {
          await db().from("wallets").update({ available: Number(w.available || 0) + amount }).eq("user_id", targetId);
        }
        await db().from("ledger_entries").insert({
          user_id: targetId,
          type: "admin_adjust",
          amount,
          description: note,
        });
        await notify(targetId, "የባለንስ ማስተካከያ", `${amount > 0 ? "+" : ""}${amount} ብር — ${note}`, "admin");
        await tgMessage(targetId, `💳 ባለንስ ተስተካክሏል።\n${amount > 0 ? "+" : ""}${amount} ብር\n${note}`);
        return ok({ ok: true, amount });
      }

      case "admin-ban": {
        // No SQL RPC needed
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        const targetId = text(body.userId, 80);
        const ban = body.ban !== false;
        const reason = text(body.reason, 1000) || "Admin action";
        if (!targetId) throw new Error("ተጠቃሚ ይምረጡ።");
        await db().from("users").update({
          banned: ban,
          ban_reason: ban ? reason : null,
          updated_at: new Date().toISOString(),
        }).eq("id", targetId);
        if (ban) {
          await db().from("bans").insert({
            user_id: targetId,
            type: "admin",
            reason,
            created_by: user.id,
          });
        }
        await notify(targetId, ban ? "መለያዎ ታግዷል" : "እገዳ ተነስቷል", reason, "ban");
        await tgMessage(targetId, ban ? `🚫 መለያዎ ታግዷል።\n${reason}` : "✅ እገዳዎ ተነስቷል።");
        return ok({ ok: true, banned: ban });
      }

      case "admin-search-user": {
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        const q = text(body.query, 80);
        const { data } = await db().from("users")
          .select("id,telegram_id,first_name,username,banned,ban_reason,xp,level,is_admin,created_at")
          .or(`telegram_id.eq.${q},first_name.ilike.%${q}%,username.ilike.%${q}%`)
          .limit(20);
        return ok({ users: data || [] });
      }

      case "admin-user-wallet": {
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        const uid = text(body.userId, 80);
        const w = await rpc("wallet_summary", { p_user_id: uid });
        const { data: tx } = await db().from("ledger_entries").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(30);
        return ok({ ...w, transactions: tx || [] });
      }

      case "admin-broadcast": {
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        const message = text(body.message, 2000);
        if (!message) throw new Error("መልእክት ያስገቡ።");
        const { data: users } = await db()
          .from("users")
          .select("id,telegram_id")
          .not("telegram_id", "is", null)
          .neq("telegram_id", "")
          .limit(500);
        let sent = 0;
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) throw new Error("Bot token missing");
        for (const u of users || []) {
          try {
            const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ chat_id: u.telegram_id, text: message, parse_mode: "HTML" }),
            });
            if (r.ok) sent++;
          } catch {}
        }
        return ok({ ok: true, sent, total: (users || []).length });
      }

      case "admin-resolve-dispute": {
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        const id = text(body.disputeId, 80);
        await db().from("disputes").update({
          status: "resolved",
          resolution: text(body.resolution, 2000),
          resolved_at: new Date().toISOString(),
        }).eq("id", id);
        return ok({ ok: true });
      }

      case "admin-close-report": {
        if (!user.is_admin) throw new Error("ፈቃድ የለዎትም።");
        await db().from("reports").update({ status: "closed" }).eq("id", text(body.reportId, 80));
        return ok({ ok: true });
      }

      default:
        return fail("API endpoint not found", 404);
    }

  } catch (e: any) {
    return fail(e?.message || "Server error", 400);
  }
}
