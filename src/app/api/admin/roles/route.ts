import { z } from "zod";
import { body,guarded,json,uuid } from "@/lib/http";
import { rpc } from "@/lib/db";
import { session } from "@/lib/security";
const schema=z.object({user_id:uuid,role:z.enum(["user","moderator","developer","admin"]),idempotency_key:uuid}).strict();
export const POST=guarded(async(request)=>{
 const actor=await session(request);const input=await body(request,schema,8192);
 await rpc("change_role",{p_actor:actor.id,p_target:input.user_id,p_role:input.role,p_key:input.idempotency_key});
 return json({updated:true});
});
