import "server-only";
import {modelIdentity} from "./model-identity";
import { randomUUID } from "node:crypto";
import { ApiError,body,idemSchema,json } from "@/lib/http";
import { checked,db,rateLimit,rpc } from "@/lib/db";
import { apiIdentity,fingerprint } from "@/lib/security";
import { providerConfig,type ProviderName } from "@/lib/env";
import { chatSchema,usageSchema,type Usage } from "./validation";
import { sseFrames } from "./sse";
type Model={id:string;display_name:string;provider:ProviderName;enabled:boolean};
async function markPending(id:string){
 try{
  checked(await db().from("api_requests").update({status:"reconciliation_required",updated_at:new Date().toISOString()}).eq("id",id).eq("status","dispatched"));
  checked(await db().from("system_events").insert({request_id:id,code:"UPSTREAM_RECONCILIATION_REQUIRED"}));
 }catch{console.error(JSON.stringify({request_id:id,code:"RECONCILIATION_WRITE_FAILED"}));}
}
function publicChunk(raw:unknown,alias:string):Record<string,unknown>{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new ApiError(502,"invalid_upstream_response");
 const r=raw as Record<string,unknown>;if(r.error)throw new ApiError(502,"upstream_error");
 // Allowlist avoids leaking provider debugging fields.
 return {id:r.id,object:r.object,created:r.created,model:alias,choices:r.choices,...(r.usage?{usage:r.usage}:{})};
}
async function settle(id:string,usage:Usage,start:number){await rpc("finish_request",{p_id:id,p_input:usage.prompt_tokens,p_output:usage.completion_tokens,p_latency:Math.min(2147483647,Date.now()-start)});}
export async function completions(request:Request):Promise<Response>{
 const identity=await apiIdentity(request);await rateLimit("api:"+identity.id);
 const input=await body(request,chatSchema);
 const model=checked(await db().from("models").select("*").eq("id",input.model).maybeSingle()) as Model|null;
 if(!model)throw new ApiError(404,"model_not_found");if(!model.enabled)throw new ApiError(503,"model_unavailable");
 const provider=providerConfig(model.provider),id=randomUUID(),start=Date.now();
 const parsed=idemSchema.safeParse(request.headers.get("idempotency-key")??id);
 if(!parsed.success)throw new ApiError(400,"invalid_idempotency_key");
 const digest=fingerprint(input);
 const reservation=await rpc<{duplicate:boolean;id:string;status?:string}>("reserve_request",{p_id:id,p_key:identity.id,p_model:model.id,p_idempotency:parsed.data,p_fingerprint:digest,p_input_limit:provider.maxInput,p_output_limit:input.max_tokens});
 if(reservation.duplicate)return json({error:{code:"request_already_exists",message:"This request was already accepted; no second upstream call was made."},request_id:reservation.id,status:reservation.status},409);
 const controller=new AbortController();
 const configured=Number(process.env.UPSTREAM_TIMEOUT_MS??90000);
 const timeout=Number.isFinite(configured)?Math.max(1000,Math.min(110000,configured)):90000;
 const timer=setTimeout(()=>controller.abort(),timeout);
 const onAbort=()=>controller.abort();request.signal.addEventListener("abort",onAbort,{once:true});
 let dispatched=false;
 const cleanup=()=>{clearTimeout(timer);request.signal.removeEventListener("abort",onAbort);};
 try{
  if(request.signal.aborted)throw new ApiError(499,"client_disconnected");
  const updated=checked(await db().from("api_requests").update({status:"dispatched",updated_at:new Date().toISOString()}).eq("id",id).eq("status","reserved").select("id"));
  if(!updated||updated.length!==1)throw new ApiError(500,"invalid_request_state");dispatched=true;
  const upstream=await fetch(provider.url,{method:"POST",redirect:"error",headers:{"Content-Type":"application/json",Authorization:"Bearer "+provider.apiKey},body:JSON.stringify({...input,messages:[{role:"system",content:modelIdentity(model.display_name,provider.model)},...input.messages],model:provider.model,...(input.stream?{stream_options:{include_usage:true}}:{stream_options:undefined})}),signal:controller.signal,cache:"no-store"});
  if(!upstream.ok)throw new ApiError(upstream.status===429?503:502,"upstream_error");
  if(!input.stream){
   const raw=await upstream.json() as Record<string,unknown>;
   const usage=usageSchema.safeParse(raw.usage);if(!usage.success)throw new ApiError(502,"usage_missing");
   if(!Array.isArray(raw.choices)||raw.error)throw new ApiError(502,"invalid_upstream_response");
   await settle(id,usage.data,start);cleanup();
   return json(publicChunk(raw,model.id),200,{"X-Request-Id":id});
  }
  if(!upstream.body)throw new ApiError(502,"upstream_empty");
  const streamSource=upstream.body;
  const stream=new ReadableStream<Uint8Array>({
   async start(out){
    const enc=new TextEncoder();let usage:Usage|undefined,done=false;
    const send=(data:string)=>out.enqueue(enc.encode("data: "+data+"\n\n"));
    try{
     for await(const frame of sseFrames(streamSource)){
      if(frame==="[DONE]"){done=true;break;}
      let raw:Record<string,unknown>;try{raw=JSON.parse(frame);}catch{throw new ApiError(502,"upstream_invalid_sse");}
      const valid=usageSchema.safeParse(raw.usage);if(valid.success)usage=valid.data;
      const chunk=publicChunk(raw,model.id);
      if(raw.usage&&!valid.success)throw new ApiError(502,"invalid_upstream_usage");
      // Withhold final usage until the database has committed the charge.
      if(!raw.usage)send(JSON.stringify(chunk));
     }
     if(!done||!usage)throw new ApiError(502,"upstream_incomplete");
     await settle(id,usage,start);
     if(input.stream_options?.include_usage)send(JSON.stringify({id,object:"chat.completion.chunk",model:model.id,choices:[],usage:{...usage,total_tokens:usage.prompt_tokens+usage.completion_tokens}}));
     send("[DONE]");
    }catch{
     controller.abort();await markPending(id);
     try{send(JSON.stringify({error:{code:"stream_interrupted",message:"Request requires reconciliation."},request_id:id}));}catch{}
    }finally{cleanup();try{out.close();}catch{}}
   },
   cancel(){controller.abort();}
  });
  return new Response(stream,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-store","X-Request-Id":id,"X-Accel-Buffering":"no"}});
 }catch(error){
  cleanup();controller.abort();
  if(dispatched)await markPending(id);else await rpc("release_request",{p_id:id});
  if(error instanceof ApiError)throw error;
  throw new ApiError(controller.signal.aborted?504:502,"upstream_unavailable");
 }
}
export async function listModels(request:Request){
 const identity=await apiIdentity(request);await rateLimit("models:"+identity.id);
 const rows=checked(await db().from("models").select("id,display_name,provider,enabled").eq("enabled",true)) as Model[];
 const data=rows.flatMap(m=>{try{const config=providerConfig(m.provider);return [{id:m.id,object:"model",owned_by:"werty",display_name:m.display_name,alias:true,backend_model:config.model}];}catch{return [];}});
 return json({object:"list",data});
}
