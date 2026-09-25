import type { NextApiRequest, NextApiResponse } from "next";
import { authUser, db, manyNotify, notify, num, text } from "../../lib/server";

export default async function handler(req:NextApiRequest,res:NextApiResponse){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try{
    const body=req.body||{}; const action=text(body.action,80); const user=await authUser(text(body.accessToken,5000));
    const ok=(data:any)=>res.status(200).json({ok:true,data});
    if(action==="me") return ok(user);
    if(action==="profile"){
      const {data}=await db().from("profiles").select("*,worker_skills(*)").eq("id",user.id).single(); return ok(data);
    }
    if(action==="update-profile"){
      const patch:any={}; if(body.fullName!==undefined) patch.full_name=text(body.fullName,160); if(body.bio!==undefined) patch.bio=text(body.bio,5000); if(body.portfolioUrl!==undefined) patch.portfolio_url=text(body.portfolioUrl,500); if(body.avatarUrl!==undefined) patch.avatar_url=text(body.avatarUrl,1000); if(body.selfieUrl!==undefined) patch.selfie_url=text(body.selfieUrl,1000); if(body.selfiePath!==undefined) patch.selfie_path=text(body.selfiePath,1000); if(body.faceVerificationStatus!==undefined) patch.face_verification_status=text(body.faceVerificationStatus,40); if(body.workerOnboarded!==undefined) patch.worker_onboarded=Boolean(body.workerOnboarded);
      if(body.role) patch.active_role=body.role;
      if(body.language) patch.language=body.language;
      const {data,error}=await db().from("profiles").update(patch).eq("id",user.id).select("*").single(); if(error) throw error;
      if(Array.isArray(body.skills)){
        if(body.skills.length>2) throw new Error("Choose up to 2 skills.");
        await db().from("worker_skills").delete().eq("user_id",user.id);
        const rows=body.skills.map((s:any)=>({user_id:user.id,skill_key:text(s.skill,80),years_experience:num(s.years,0)})); if(rows.length) await db().from("worker_skills").insert(rows);
      }
      return ok(data);
    }
    if(action==="set-role"){
      const role=body.role==="client"?"client":"worker"; const {data,error}=await db().from("profiles").update({active_role:role}).eq("id",user.id).select("*").single(); if(error) throw error; return ok(data);
    }
    if(action==="dashboard"){
      const {data:w}=await db().from("wallets").select("*").eq("user_id",user.id).maybeSingle();
      const {count:completed}=await db().from("tasks").select("id",{count:"exact",head:true}).or(`assigned_worker_id.eq.${user.id},client_id.eq.${user.id}`).eq("status","completed");
      const {count:apps}=await db().from("task_applications").select("id",{count:"exact",head:true}).eq("worker_id",user.id).eq("status","pending");
      const {data:skills}=await db().from("worker_skills").select("*").eq("user_id",user.id);
      return ok({wallet:w||{},completed:completed||0,pendingApplications:apps||0,skills:skills||[]});
    }
    if(action==="worker-tasks"){
      const {data:skills}=await db().from("worker_skills").select("skill_key").eq("user_id",user.id); const keys=(skills||[]).map(x=>x.skill_key);
      if(!keys.length) return ok([]);
      const {data:tasks,error}=await db().from("tasks").select("*,task_files(*)").eq("status","open").in("category",keys).order("created_at",{ascending:false}); if(error) throw error;
      const ids=(tasks||[]).map(t=>t.id); let apps:any[]=[]; if(ids.length){const r=await db().from("task_applications").select("task_id,worker_id,status").in("task_id",ids); apps=r.data||[];}
      const mine=new Set(apps.filter(a=>a.worker_id===user.id).map(a=>a.task_id)); const counts=new Map<string,number>(); for(const a of apps) if(a.status!=="rejected") counts.set(a.task_id,(counts.get(a.task_id)||0)+1);
      return ok((tasks||[]).filter(t=>!mine.has(t.id)&&(counts.get(t.id)||0)<10).map(t=>({...t,applicant_count:counts.get(t.id)||0}))); 
    }
    if(action==="apply-task"){
      const taskId=text(body.taskId,80); const {data,error}=await db().rpc("apply_for_task",{p_task_id:taskId,p_worker_id:user.id}); if(error) throw error;
      await notify(user.id,"Application received","Your application was added. You can have up to 5 pending job applications.","application");
      const {data:t}=await db().from("tasks").select("client_id,title,applicant_count").eq("id",taskId).maybeSingle(); if(t) await notify(t.client_id,"New worker applied",`${user.full_name} applied for “${t.title}”.`,"application");
      return ok(data);
    }
    if(action==="my-applications"){
      const {data}=await db().from("task_applications").select("*,tasks(*,task_files(*))").eq("worker_id",user.id).eq("status","pending").order("applied_at",{ascending:false}); return ok(data||[]);
    }
    if(action==="my-tasks"){
      const {data,error}=await db().from("tasks").select("*,task_files(*),submissions(*,submission_files(*))").eq("assigned_worker_id",user.id).in("status",["assigned","submitted","revision_requested","completed"]).order("updated_at",{ascending:false}); if(error) throw error; return ok(data||[]);
    }
    if(action==="create-task"){
      const budget=num(body.budget); if(budget<=0) throw new Error("Budget must be greater than 0.");
      const hours=Math.max(1,Math.min(720,num(body.deadlineHours,24))); const {data,error}=await db().rpc("create_market_task",{p_client_id:user.id,p_category:text(body.category,80),p_title:text(body.title,180),p_description:text(body.description,12000),p_requirements:text(body.requirements,12000),p_budget:budget,p_deadline_at:new Date(Date.now()+hours*3600000).toISOString()}); if(error) throw error;
      const taskId=data?.id||data; if(Array.isArray(body.files)&&taskId) for(const f of body.files.slice(0,10)) await db().from("task_files").insert({task_id:taskId,file_path:f.path,file_url:f.url,file_name:f.name,mime_type:f.type||null,size_bytes:f.size||null});
      return ok(data);
    }
    if(action==="client-posts"){const {data,error}=await db().from("tasks").select("*,task_files(*)").eq("client_id",user.id).order("created_at",{ascending:false});if(error)throw error;return ok(data||[])}
    if(action==="applicants"){
      const taskId=text(body.taskId,80); const {data,error}=await db().from("task_applications").select("id,status,applied_at,profiles(id,full_name,email,avatar_url,bio,portfolio_url,face_verification_status,worker_skills(skill_key,years_experience))").eq("task_id",taskId).order("applied_at",{ascending:true}); if(error)throw error; return ok(data||[]);
    }
    if(action==="choose-worker"){
      const {data,error}=await db().rpc("choose_task_worker",{p_task_id:text(body.taskId,80),p_client_id:user.id,p_worker_id:text(body.workerId,80)}); if(error)throw error;
      const {data:apps}=await db().from("task_applications").select("worker_id,status").eq("task_id",text(body.taskId,80));
      const selected=text(body.workerId,80); const rejected=(apps||[]).filter(a=>a.worker_id!==selected).map(a=>a.worker_id);
      await notify(selected,"You were selected 🎉","The client selected you. Your job is now active.","selection");
      await manyNotify(rejected,"Not selected","Another worker was selected for this job. Your application is now closed.","rejection");
      return ok(data);
    }
    if(action==="submission"){const taskId=text(body.taskId,80);const {data,error}=await db().from("submissions").select("*,submission_files(*)").eq("task_id",taskId).maybeSingle();if(error)throw error;return ok(data);}
    if(action==="submit-task"){
      const taskId=text(body.taskId,80); const {data,error}=await db().rpc("submit_market_task",{p_task_id:taskId,p_worker_id:user.id,p_content:text(body.content,15000)}); if(error)throw error;
      if(Array.isArray(body.files)) for(const f of body.files.slice(0,10)) await db().from("submission_files").insert({submission_id:data.id,file_path:f.path,file_url:f.url,file_name:f.name,mime_type:f.type||null,size_bytes:f.size||null});
      const {data:t}=await db().from("tasks").select("client_id,title").eq("id",taskId).maybeSingle(); if(t) await notify(t.client_id,"Work submitted","The worker submitted your job. Please review it.","submission"); return ok(data);
    }
    if(action==="review-submission"){
      const taskId=text(body.taskId,80); const decision=body.decision==="complain"?"complain":"accept"; const reason=text(body.reason,5000); const {data,error}=await db().rpc("review_market_submission",{p_task_id:taskId,p_client_id:user.id,p_decision:decision,p_reason:reason});if(error)throw error;
      const {data:t}=await db().from("tasks").select("assigned_worker_id,title").eq("id",taskId).maybeSingle();if(t?.assigned_worker_id)await notify(t.assigned_worker_id,decision==="accept"?"Payment released 🎉":"Client requested changes",decision==="accept"?"The client accepted your work and your ETB payment was released.":reason,"review");return ok(data);
    }
    if(action==="notifications"){const {data}=await db().from("notifications").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);return ok(data||[])}
    if(action==="read-notifications"){await db().from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",user.id).is("read_at",null);return ok(true)}
    if(action==="wallet"){const {data:w}=await db().from("wallets").select("*").eq("user_id",user.id).single();const {data:l}=await db().from("ledger_entries").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50);return ok({wallet:w,ledger:l||[]})}
    if(action==="deposit"){const amount=num(body.amount);if(amount<100)throw new Error("Minimum deposit is 100 ETB.");const {data,error}=await db().from("deposits").insert({user_id:user.id,amount,method:text(body.method,50),reference:text(body.reference,160),proof_url:text(body.proofUrl,1000)}).select("*").single();if(error)throw error;await notify(user.id,"Deposit submitted","Your deposit is waiting for review.","deposit");return ok(data)}
    if(action==="withdraw"){const {data,error}=await db().rpc("create_market_withdrawal",{p_user_id:user.id,p_amount:num(body.amount),p_method:text(body.method,50),p_account_number:text(body.accountNumber,100),p_account_name:text(body.accountName,160)});if(error)throw error;await notify(user.id,"Withdrawal requested","Your withdrawal request was submitted.","withdrawal");return ok(data)}
    if(action==="admin-workers"){if(!user.is_admin)throw new Error("Admin access required.");const {data,error}=await db().from("profiles").select("*,worker_skills(*)").eq("face_verification_status","pending").eq("worker_onboarded",true).order("created_at",{ascending:false});if(error)throw error;return ok(data||[])}
    if(action==="admin-verify-worker"){if(!user.is_admin)throw new Error("Admin access required.");const id=text(body.userId,80);const status=body.status==="verified"?"verified":"rejected";const {data,error}=await db().from("profiles").update({face_verification_status:status}).eq("id",id).select("*").single();if(error)throw error;await notify(id,status==="verified"?"Worker verified":"Worker verification rejected",status==="verified"?"Your worker identity review was approved.":"Your worker identity review was not approved. Please update your profile and contact support.","verification");return ok(data)}
    if(action==="admin-dashboard"){
      if(!user.is_admin)throw new Error("Admin access required.");
      const [{count:users},{count:tasks},{count:open},{count:completed}]=await Promise.all([
        db().from("profiles").select("id",{count:"exact",head:true}),db().from("tasks").select("id",{count:"exact",head:true}),db().from("tasks").select("id",{count:"exact",head:true}).eq("status","open"),db().from("tasks").select("id",{count:"exact",head:true}).eq("status","completed")
      ]);return ok({users:users||0,tasks:tasks||0,open:open||0,completed:completed||0});
    }
    throw new Error("Unknown action");
  }catch(e:any){console.error(e);return res.status(400).json({error:e?.message||"Something went wrong"})}
}
