import type { NextApiRequest, NextApiResponse } from "next";
import { authUser, db } from "../../lib/server";
export default async function handler(req:NextApiRequest,res:NextApiResponse){
  try{
    const token=String(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
    const user=await authUser(token); const path=String(req.query.path||""); if(!path)throw new Error("Missing file");
    let allowed=user.is_admin;
    if(!allowed){
      const tf=await db().from("task_files").select("task_id,tasks(client_id,assigned_worker_id)").eq("file_path",path).maybeSingle();
      const sf=await db().from("submission_files").select("submission_id,submissions(task_id,worker_id,tasks(client_id,assigned_worker_id))").eq("file_path",path).maybeSingle();
      const t=(tf.data as any)?.tasks || (sf.data as any)?.submissions?.tasks;
      const p=await db().from("profiles").select("id").eq("id",user.id).eq("selfie_path",path).maybeSingle();
      allowed=!!t && (t.client_id===user.id || t.assigned_worker_id===user.id) || !!p.data;
    }
    if(!allowed) throw new Error("Not authorized");
    const {data,error}=await db().storage.from("sera-files").createSignedUrl(path,60); if(error||!data?.signedUrl)throw error||new Error("File unavailable");
    return res.redirect(302,data.signedUrl);
  }catch(e:any){return res.status(403).json({error:e?.message||"Forbidden"})}
}
