import { constantEqual } from "@/lib/security";
import { checked,db } from "@/lib/db";
import { bearer,guarded,json,ApiError } from "@/lib/http";
import { required } from "@/lib/env";
export const maxDuration=60;
const handler=guarded(async(request)=>{
 if(!constantEqual(bearer(request),required("CRON_SECRET")))throw new ApiError(401,"invalid_cron_secret");
 const cutoff=new Date(Date.now()-5*60_000).toISOString();
 const rows=checked(await db().from("api_requests").select("id,user_id,model_id,created_at").in("status",["dispatched","reconciliation_required"]).lt("updated_at",cutoff).limit(100));
 // No guessed usage: unresolved upstream work remains reserved for operator review.
 return json({requires_review:rows});
});
export const GET=handler;
export const POST=handler;
