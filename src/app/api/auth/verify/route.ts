import { z } from "zod";
import { authClient } from "@/lib/db";
import { ApiError,body,guarded,json } from "@/lib/http";
import { issueKey } from "@/lib/security";
const schema=z.object({email:z.string().email().max(320),token:z.string().length(6).regex(/^\d+$/)}).strict();
export const POST=guarded(async(request)=>{
 const input=await body(request,schema,8192);
 const result=await authClient().auth.verifyOtp({email:input.email,token:input.token,type:"signup"});
 if(result.error||!result.data.user||!result.data.session)throw new ApiError(400,"invalid_verification_code");
 return json({session:result.data.session,api_key:await issueKey(result.data.user.id,true)});
});
