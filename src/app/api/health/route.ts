import { guarded,json } from "@/lib/http";
import { db } from "@/lib/db";
export const dynamic="force-dynamic";
export const GET=guarded(async()=>{
 const started=Date.now();const {error}=await db().from("models").select("id").limit(1);
 return json({status:error?"degraded":"operational",components:{api:"operational",database:error?"degraded":"operational"},checked_at:new Date().toISOString(),latency_ms:Date.now()-started},error?503:200);
});
