import { randomUUID } from "node:crypto";
import { z } from "zod";
export class ApiError extends Error {
 constructor(public status: number, public code: string, message=code) { super(message); }
}
export function json(data: unknown,status=200,headers:Record<string,string>={}) {
 return Response.json(data,{status,headers:{"Cache-Control":"no-store",...headers}});
}
export async function body<T>(request:Request,schema:z.ZodType<T>,limit=262144):Promise<T>{
 if(!request.headers.get("content-type")?.includes("application/json")) throw new ApiError(415,"json_required");
 const reader=request.body?.getReader();
 if(!reader) throw new ApiError(400,"body_required");
 const parts:Uint8Array[]=[];let size=0;
 try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new ApiError(413,"body_too_large");}parts.push(value);}}
 finally {reader.releaseLock();}
 let parsed:unknown;try{parsed=JSON.parse(Buffer.concat(parts).toString("utf8"));}catch{throw new ApiError(400,"invalid_json");}
 const result=schema.safeParse(parsed);if(!result.success)throw new ApiError(400,"invalid_request","Request does not match the documented schema.");
 return result.data;
}
export function bearer(request:Request):string{
 const match=/^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization")??"");
 if(!match)throw new ApiError(401,"authentication_required");return match[1];
}
export function guarded(handler:(request:Request)=>Promise<Response>){
 return async(request:Request)=>{
  const requestId=randomUUID();
  try{return await handler(request);}
  catch(error){
   const e=error instanceof ApiError?error:new ApiError(500,"internal_error");
   // Never log exception objects: upstream URLs/headers may contain secrets.
   if(e.status>=500)console.error(JSON.stringify({request_id:requestId,code:e.code}));
   return json({error:{message:e.message,type:e.status>=500?"server_error":"invalid_request_error",code:e.code},request_id:requestId},e.status,{"X-Request-Id":requestId,...(e.status===429?{"Retry-After":"60"}:{})});
  }
 };
}
export const uuid=z.string().uuid();
export const idemSchema=z.string().min(8).max(128).regex(/^[a-zA-Z0-9_-]+$/);
