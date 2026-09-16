import { z } from "zod";
import { authClient } from "@/lib/db";
import { appOrigin } from "@/lib/env";
import { body, guarded, json } from "@/lib/http";
const schema=z.object({email:z.string().email().max(320),password:z.string().min(12).max(128)}).strict();
export const POST=guarded(async(request)=>{
 const input=await body(request,schema,8192);
 const {error}=await authClient().auth.signUp({...input,options:{emailRedirectTo:appOrigin()+"/auth/verify"}});
 if(error)console.warn(JSON.stringify({code:"signup_not_completed"}));
 return json({accepted:true});
});
