import { checked,db,rpc } from "@/lib/db";
import { ApiError,guarded,json,uuid } from "@/lib/http";
import { issueKey,session } from "@/lib/security";
export const GET=guarded(async(request)=>{
 const user=await session(request);
 const keys=checked(await db().from("api_keys").select("id,last4,created_at,revoked_at").eq("user_id",user.id).order("created_at",{ascending:false}));
 return json({data:keys});
});
export const POST=guarded(async(request)=>{
 const user=await session(request);const key=await issueKey(user.id);
 if(!key)throw new ApiError(500,"key_creation_failed");return json(key,201);
});
export const DELETE=guarded(async(request)=>{
 const user=await session(request);const parsed=uuid.safeParse(new URL(request.url).searchParams.get("id"));
 if(!parsed.success)throw new ApiError(400,"invalid_key_id");
 await rpc("revoke_key",{p_user:user.id,p_key:parsed.data});return new Response(null,{status:204});
});
