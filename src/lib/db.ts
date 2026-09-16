import "server-only";
import { createClient } from "@supabase/supabase-js";
import { required } from "./env";
import { ApiError } from "./http";
export function db(){return createClient(required("SUPABASE_URL"),required("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}});}
export function authClient(){return createClient(required("SUPABASE_URL"),required("SUPABASE_ANON_KEY"),{auth:{persistSession:false,autoRefreshToken:false}});}
const codes:Record<string,number>={forbidden:403,invalid_api_key:401,insufficient_balance:402,idempotency_conflict:409,model_unavailable:503,invalid_limit:400,invalid_amount:400,user_not_found:404,model_not_found:404,payment_mismatch:409,invalid_state:409};
export async function rpc<T>(name:string,args:Record<string,unknown>):Promise<T>{
 const {data,error}=await db().rpc(name,args);
 if(error){const status=codes[error.message];throw new ApiError(status??500,status?error.message:"database_error");}
 return data as T;
}
export function checked<T>(result:{data:T;error:unknown}):T{if(result.error)throw new ApiError(500,"database_error");return result.data;}
export async function rateLimit(scope:string,limit=60,seconds=60){if(!await rpc<boolean>("rate_limit",{p_scope:scope,p_limit:limit,p_seconds:seconds}))throw new ApiError(429,"rate_limit");}
