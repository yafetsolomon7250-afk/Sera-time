import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WITHDRAW_CHANNEL = process.env.WITHDRAW_CHANNEL || '@withdrawseratime';
const DEPOSIT_CHANNEL = process.env.DEPOSIT_CHANNEL || '@depistseratime';

// Helper to send Telegram notifications
async function sendTelegramNotification(chatId: string | number, text: string, replyMarkup?: any) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      })
    });
  } catch (err) {
    console.error('Telegram Notify Error:', err);
  }
}

export async function POST(req: Request, { params }: { params: { action: string } }) {
  const action = params.action;
  const body = await req.json();

  try {
    // 1. Get or Create User Context
    if (action === 'get-user') {
      const { telegram_id, username, first_name, referred_by } = body;
      
      let { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegram_id)
        .single();

      if (!user) {
        const { data: newUser, error: createErr } = await supabase
          .from('users')
          .insert({
            telegram_id,
            username,
            first_name,
            referred_by: referred_by ? parseInt(referred_by) : null
          })
          .select()
          .single();
        user = newUser;
      }

      if (user?.is_banned) {
        return NextResponse.json({ 
          error: 'banned', 
          message: `እርስዎ ከሲስተሙ ታግደዋል። ምክንያት: ${user.ban_reason || 'የሕግ ጥሰት'}` 
        }, { status: 403 });
      }

      return NextResponse.json({ success: true, user });
    }

    // 2. Worker Action: Accept Task
    if (action === 'accept-task') {
      const { task_id, worker_id } = body;

      // Check if task is still open
      const { data: task } = await supabase.from('tasks').select('*').eq('id', task_id).single();
      if (!task || task.status !== 'open') {
        return NextResponse.json({ error: 'ይህ ሥራ አስቀድሞ በሌላ ሠራተኛ ተወስዷል!' }, { status: 400 });
      }

      // Assign to worker
      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update({
          status: 'in_progress',
          assigned_worker_id: worker_id,
          accepted_at: new Date().toISOString()
        })
        .eq('id', task_id)
        .select()
        .single();

      return NextResponse.json({ success: true, task: updatedTask });
    }

    // 3. Worker Action: Submit Task
    if (action === 'submit-task') {
      const { task_id, worker_id, submission_files_url, notes } = body;

      const { data: submission, error } = await supabase
        .from('task_submissions')
        .insert({
          task_id,
          worker_id,
          submission_files_url,
          notes
        })
        .select()
        .single();

      await supabase.from('tasks').update({ status: 'submitted' }).eq('id', task_id);

      // Notify Client
      const { data: task } = await supabase.from('tasks').select('client_id, title').eq('id', task_id).single();
      if (task) {
        await sendTelegramNotification(
          task.client_id,
          `📬 *አዲስ የሥራ ማስረከቢያ!*\n\nለሥራው "${task.title}" አዲስ ማረጋገጫ ተልኳል። እባክዎን በቦቱ ላይ ገብተው ያረጋግጡ።`
        );
      }

      return NextResponse.json({ success: true, submission });
    }

    // 4. Client Action: Post Task (10% Fee Deduction)
    if (action === 'post-task') {
      const { client_id, category, title, description, raw_files_url, budget, deadline_hours } = body;
      const numBudget = parseFloat(budget);

      // Check client balance
      const { data: client } = await supabase.from('users').select('client_balance').eq('telegram_id', client_id).single();
      if (!client || client.client_balance < numBudget) {
        return NextResponse.json({ error: 'በቂ የሂሳብ መጠን የለዎትም። እባክዎ አስቀድመው ዴፖዚት ያድርጉ!' }, { status: 400 });
      }

      // Calculate 10% platform commission
      const workerPayout = numBudget * 0.90;

      // Deduct balance
      await supabase.from('users').update({ client_balance: client.client_balance - numBudget }).eq('telegram_id', client_id);

      // Create Task
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          client_id,
          category,
          title,
          description,
          raw_files_url,
          budget: numBudget,
          worker_payout: workerPayout,
          deadline_hours: deadline_hours || 24,
          status: 'open'
        })
        .select()
        .single();

      return NextResponse.json({ success: true, task: newTask });
    }

    // 5. Worker Action: Request Withdrawal (Min 1000 ETB)
    if (action === 'request-withdraw') {
      const { worker_id, amount, bank_name, account_number, full_name } = body;
      const numAmount = parseFloat(amount);

      if (numAmount < 1000) {
        return NextResponse.json({ error: 'አነስተኛው የገንዘብ ማውጫ መጠን 1000 ብር ነው!' }, { status: 400 });
      }

      const { data: worker } = await supabase.from('users').select('worker_balance').eq('telegram_id', worker_id).single();
      if (!worker || worker.worker_balance < numAmount) {
        return NextResponse.json({ error: 'በቂ የሥራ ሂሳብ የለዎትም!' }, { status: 400 });
      }

      // Deduct worker balance & register request
      await supabase.from('users').update({ worker_balance: worker.worker_balance - numAmount }).eq('telegram_id', worker_id);
      
      const { data: withdraw } = await supabase
        .from('withdrawals')
        .insert({
          worker_id,
          amount: numAmount,
          bank_name,
          account_number,
          full_name,
          status: 'pending'
        })
        .select()
        .single();

      // Post alert to Channel
      const channelMsg = `💸 *የገንዘብ ማውጣት ጥያቄ*\n\n👤 *ተጠቃሚ:* ${full_name}\n🆔 *ID:* \`${worker_id}\`
💰 *መጠን:* ${numAmount} ETB\n🏦 *ባንክ:* ${bank_name}\n💳 *ቁጥር:* \`${account_number}\``;
      
      await sendTelegramNotification(WITHDRAW_CHANNEL, channelMsg);

      return NextResponse.json({ success: true, withdraw });
    }

    // 6. Client Action: Submit Deposit Request
    if (action === 'request-deposit') {
      const { client_id, amount, screenshot_url } = body;

      const { data: deposit } = await supabase
        .from('deposits')
        .insert({
          client_id,
          amount: parseFloat(amount),
          screenshot_url,
          status: 'pending'
        })
        .select()
        .single();

      // Post to Deposit Channel for Admin Approval
      const channelMsg = `📥 *አዲስ የዴፖዚት ጥያቄ*\n\n🆔 *Client ID:* \`${client_id}\`
💰 *መጠን:* ${amount} ETB\n🖼 *ደረሰኝ:* ${screenshot_url}`;

      await sendTelegramNotification(DEPOSIT_CHANNEL, channelMsg);

      return NextResponse.json({ success: true, deposit });
    }

    return NextResponse.json({ error: 'Invalid Action' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}
