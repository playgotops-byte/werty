import { z } from "zod";
import { body,guarded,json,uuid } from "@/lib/http";
import { rpc } from "@/lib/db";
import { session } from "@/lib/security";
const schema=z.object({model:z.string().min(1).max(100),enabled:z.boolean(),input_rate:z.number().int().min(1).max(1000000),output_rate:z.number().int().min(1).max(1000000),idempotency_key:uuid}).strict();
export const POST=guarded(async(request)=>{
 const actor=await session(request);const input=await body(request,schema,8192);
 await rpc("update_model",{p_actor:actor.id,p_model:input.model,p_enabled:input.enabled,p_input:input.input_rate,p_output:input.output_rate,p_key:input.idempotency_key});
 return json({updated:true});
});
