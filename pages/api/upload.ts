import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import { db, authUser } from "../../lib/server";

export const config={api:{bodyParser:false}};
export default async function handler(req:NextApiRequest,res:NextApiResponse){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try{
    const form=formidable({multiples:false,maxFileSize:100*1024*1024});
    const {fields,files}=await new Promise<any>((resolve,reject)=>form.parse(req,(err,flds,fls)=>err?reject(err):resolve({fields:flds,files:fls})));
    const token=Array.isArray(fields.accessToken)?fields.accessToken[0]:fields.accessToken;
    const user=await authUser(String(token||""));
    const file=Array.isArray(files.file)?files.file[0]:files.file;
    if(!file) throw new Error("No file selected.");
    const ext=(file.originalFilename||"").split(".").pop()?.replace(/[^a-zA-Z0-9]/g,"")||"bin";
    const kind=String(Array.isArray(fields.kind)?fields.kind[0]:fields.kind||"file");
    const bucket=kind==="avatar"?"sera-public":"sera-files";
    const path=kind==="avatar"?`avatars/${user.id}/${crypto.randomUUID()}.${ext}`:`${user.id}/${crypto.randomUUID()}.${ext}`;
    const buf=fs.readFileSync(file.filepath);
    const {error}=await db().storage.from(bucket).upload(path,buf,{contentType:file.mimetype||"application/octet-stream",upsert:false});
    fs.rmSync(file.filepath,{force:true});
    if(error) throw error;
    const url=kind==="avatar"?db().storage.from(bucket).getPublicUrl(path).data.publicUrl:null;
    return res.status(200).json({ok:true,path,url,name:file.originalFilename||"file",type:file.mimetype||"application/octet-stream",size:file.size||buf.length});
  }catch(e:any){return res.status(400).json({error:e?.message||"Upload failed"})}
}
