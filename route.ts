import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Call this endpoint every 5–15 minutes with:
 * Authorization: Bearer CRON_SECRET
 * or ?secret=CRON_SECRET
 *
 * It will:
 * 1. Expire open tasks past deadline
 * 2. Ban workers who missed assigned/revision deadlines and re-open those tasks
 */
export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.nextUrl.searchParams.get("secret") ||
    "";
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    // 1. Expire open tasks
    await db.rpc("expire_open_tasks");

    // 2. Handle overdue assigned / revision_requested tasks
    const { data: overdue } = await db
      .from("tasks")
      .select("id,assigned_worker_id,client_id,title")
      .in("status", ["assigned", "revision_requested"])
      .lt("deadline_at", new Date().toISOString())
      .limit(50);

    let banned = 0;
    let reopened = 0;

    for (const t of overdue || []) {
      if (t.assigned_worker_id) {
        const reason = `ስራውን በጊዜ አላጠናቀቁም: ${t.title || "ስራ"}`;
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
          type: "deadline",
          reason,
        });

        await db.from("notifications").insert({
          user_id: t.assigned_worker_id,
          title: "መለያዎ ታግዷል",
          body: reason,
          type: "ban",
        });

        // Notify worker via Telegram
        const { data: u } = await db
          .from("users")
          .select("telegram_id")
          .eq("id", t.assigned_worker_id)
          .maybeSingle();
        if (u?.telegram_id && process.env.TELEGRAM_BOT_TOKEN) {
          await fetch(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                chat_id: u.telegram_id,
                text: `🚫 የሰራተኛ መለያዎ ታግዷል።\n\nምክንያት: ${reason}\n\nየደንበኛ ሚናዎን ግን መጠቀም ይችላሉ።`,
              }),
            }
          );
        }
        banned++;
      }

      // Re-open task
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
        .eq("id", t.id);

      if (t.client_id) {
        await db.from("notifications").insert({
          user_id: t.client_id,
          title: "ስራው እንደገና ተለጥፏል",
          body: `ሰራተኛው ጊዜውን አልጠበቀም። ስራው እንደገና ክፍት ሆኗል: ${t.title || ""}`,
          type: "task_reopened",
        });
      }
      reopened++;
    }

    return NextResponse.json({
      ok: true,
      expired_open: true,
      banned,
      reopened,
      time: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Cron failed" }, { status: 500 });
  }
}
