import { NextRequest, NextResponse } from "next/server";

async function send(method:string,body:any){
 const token=process.env.TELEGRAM_BOT_TOKEN!;
 const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
 return r.json();
}
export async function POST(req:NextRequest){
 try{
  const update=await req.json(); const msg=update?.message; if(!msg?.chat?.id)return NextResponse.json({ok:true});
  const text=String(msg.text||""); const first=text.split(" ")[0];
  if(first==="/start"||first==="/help"){
   const param=text.split(" ")[1]||""; const url=process.env.APP_URL!; const mini=param?`${url}?ref=${encodeURIComponent(param.replace(/^ref_/,""))}`:url;
   await send("sendMessage",{chat_id:msg.chat.id,text:"🇪🇹 እንኳን ወደ Sera Time በደህና መጡ!\n\n👷 ስራ ይስሩ እና ያግኙ፣ ወይም 💼 ስራ ይለጥፉ።\n\nWatch • Work • Earn",reply_markup:{inline_keyboard:[[{text:"🚀 Sera Time ክፈት",web_app:{url:mini}}]]}});
  }
  return NextResponse.json({ok:true});
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||"error"},{status:500})}
}
