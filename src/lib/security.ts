import "server-only";
import { createHash,createHmac,randomBytes,timingSafeEqual } from "node:crypto";
import { authClient,checked,db,rpc } from "./db";
import { bearer,ApiError } from "./http";
import { secret } from "./env";
export function hashKey(key:string){return createHash("sha256").update(key).digest("hex");}
export function fingerprint(data:unknown){return createHmac("sha256",secret("REQUEST_FINGERPRINT_SECRET")).update(JSON.stringify(data)).digest("hex");}
export function constantEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export async function session(request:Request){
 const token=bearer(request);const {data,error}=await authClient().auth.getUser(token);
 if(error||!data.user?.email_confirmed_at)throw new ApiError(401,"invalid_session");
 const profile=checked(await db().from("profiles").select("id,email,role,status").eq("id",data.user.id).single());
 if(!profile||profile.status!=="active")throw new ApiError(403,"forbidden");
 return {id:data.user.id,email:data.user.email!,token,profile};
}
export async function permit(actor:string,permission:string){if(!await rpc<boolean>("allowed",{p_actor:actor,p_permission:permission}))throw new ApiError(403,"forbidden");}
export async function issueKey(user:string,initial=false){
 const value="sk-"+randomBytes(32).toString("base64url");
 const id=await rpc<string|null>("rotate_key",{p_user:user,p_hash:hashKey(value),p_last4:value.slice(-4),p_initial:initial});
 return id?{id,key:value,warning:"This key will only be shown once."}:null;
}
export async function apiIdentity(request:Request){
 const key=bearer(request);if(!/^sk-[A-Za-z0-9_-]{43}$/.test(key))throw new ApiError(401,"invalid_api_key");
 const result=await db().from("api_keys").select("id,user_id").eq("hash",hashKey(key)).is("revoked_at",null).maybeSingle();
 const row=checked(result);if(!row)throw new ApiError(401,"invalid_api_key");
 const profile=checked(await db().from("profiles").select("status").eq("id",row.user_id).single());
 if(!profile||profile.status!=="active")throw new ApiError(403,"forbidden");
 return row as {id:string;user_id:string};
}
