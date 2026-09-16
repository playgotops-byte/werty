import { z } from "zod";
import { checked,db,rpc } from "@/lib/db";
import { ApiError,body,guarded,json,uuid } from "@/lib/http";
import { session } from "@/lib/security";
import { createPayment } from "@/services/payments";
const schema=z.object({amount_rubles:z.number().int().min(50).max(100000),idempotency_key:uuid}).strict();
export const POST=guarded(async(request)=>{
 const user=await session(request);const input=await body(request,schema,8192);const kopecks=input.amount_rubles*100;
 const intent=await rpc<{id:string;provider_id:string|null;status:string;amount_kopecks:string}>("payment_intent",{p_user:user.id,p_key:input.idempotency_key,p_kopecks:kopecks});
 if(intent.status==="credited")return json(intent);
 const payment=await createPayment(intent.id,kopecks,input.idempotency_key);
 const updated=checked(await db().from("payments").update({provider_id:payment.id}).eq("id",intent.id).is("provider_id",null).select("id"));
 if(!updated||updated.length!==1){
  const existing=checked(await db().from("payments").select("provider_id").eq("id",intent.id).single());
  if(!existing||existing.provider_id!==payment.id)throw new ApiError(409,"payment_provider_conflict");
 }
 return json({id:intent.id,status:"pending",confirmation_url:payment.confirmation?.confirmation_url},201);
});
