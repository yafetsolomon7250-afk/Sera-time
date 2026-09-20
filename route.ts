import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function send(chatId:number|string,text:string){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const app=process.env.APP_URL;
  if(!token||!app)return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:chatId,text,reply_markup:{inline_keyboard:[[{text:"🚀 Sera Timeን ክፈት",web_app:{url:app}}]]}})});
}

export async function POST(req:NextRequest){
  try{
    const expected=process.env.TELEGRAM_WEBHOOK_SECRET;
    if(expected){const got=req.headers.get("x-telegram-bot-api-secret-token");if(got!==expected)return NextResponse.json({ok:false},{status:401});}
    const u=await req.json();
    const msg=u?.message;
    if(msg?.chat?.id){
      const text=String(msg.text||"");
      if(text.startsWith("/start")){
        await send(msg.chat.id,"እንኳን ወደ Sera Time በደህና መጡ! 👋\n\nስራ ይስሩ፣ ገቢ ያግኙ፣ ወይም ስራ ይለጥፉ።\n\nከታች ያለውን 🚀 ቁልፍ በመጫን Sera Timeን ይክፈቱ።");
      } else {
        await send(msg.chat.id,"Sera Timeን ለመጠቀም 🚀 Sera Timeን ክፈት የሚለውን ቁልፍ ይጫኑ።");
      }
    }
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({ok:true});}
}
export async function GET(){return NextResponse.json({ok:true,service:"telegram-webhook"});}
