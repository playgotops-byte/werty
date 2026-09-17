import { z } from "zod";
import { validPassword } from "@/lib/password";
import { authClient } from "@/lib/db";
import { appOrigin } from "@/lib/env";
import { ApiError, body, guarded, json } from "@/lib/http";
const schema=z.object({email:z.string().email().max(320),password:z.string().min(6).max(128).refine(validPassword,"Пароль должен содержать заглавную букву и специальный знак.")}).strict();
export const POST=guarded(async(request)=>{
 const input=await body(request,schema,8192);
 const {error}=await authClient().auth.signUp({...input,options:{emailRedirectTo:appOrigin()+"/auth/verify"}});
 if(error?.code==="weak_password")throw new ApiError(400,"weak_password","Пароль отклонён настройками авторизации. Проверьте требования к паролю.");
 if(error)console.warn(JSON.stringify({code:"signup_not_completed"}));
 return json({accepted:true});
});
