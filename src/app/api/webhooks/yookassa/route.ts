import { z } from "zod";
import { checked,db,rpc } from "@/lib/db";
import { ApiError,body,guarded,json } from "@/lib/http";
import { getPayment,verifyPayment } from "@/services/payments";
const event=z.object({event:z.string(),object:z.object({id:z.string().min(1)}).passthrough()}).passthrough();
export const POST=guarded(async(request)=>{
 const input=await body(request,event,65536);
 if(input.event!=="payment.succeeded")return json({accepted:true});
 const local=checked(await db().from("payments").select("id,provider_id,amount_kopecks,status").eq("provider_id",input.object.id).maybeSingle());
 if(!local)throw new ApiError(404,"payment_not_found");
 if(local.status==="credited")return json({accepted:true});
 const verified=await getPayment(input.object.id);
 if(!verifyPayment(verified,local.id,Number(local.amount_kopecks)))throw new ApiError(409,"payment_verification_failed");
 await rpc("credit_payment",{p_id:local.id,p_provider:verified.id,p_kopecks:Number(local.amount_kopecks)});
 return json({accepted:true});
});
