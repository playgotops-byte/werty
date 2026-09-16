import { z } from "zod";
import { body,guarded,json,uuid } from "@/lib/http";
import { rpc } from "@/lib/db";
import { session } from "@/lib/security";
const schema=z.object({user_id:uuid,tokens:z.number().int().min(-1000000000).max(1000000000).refine(n=>n!==0),reason:z.string().trim().min(3).max(500),idempotency_key:uuid}).strict();
export const POST=guarded(async(request)=>{
 const actor=await session(request);const input=await body(request,schema,16384);
 const result=await rpc("adjust_balance",{p_actor:actor.id,p_target:input.user_id,p_tokens:input.tokens,p_reason:input.reason,p_key:input.idempotency_key});
 return json(result);
});
