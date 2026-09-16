import { ApiError } from "@/lib/http";
// Streaming parser handles UTF-8 splits, CRLF, multiline data and bounded frames.
export async function* sseFrames(stream:ReadableStream<Uint8Array>):AsyncGenerator<string>{
 const reader=stream.getReader(),decoder=new TextDecoder();let pending="";
 try{
  while(true){
   const {done,value}=await reader.read();
   pending+=done?decoder.decode():decoder.decode(value,{stream:true});
   let match:RegExpExecArray|null;
   while((match=/\r?\n\r?\n/.exec(pending))){
    const frame=pending.slice(0,match.index);pending=pending.slice(match.index+match[0].length);
    if(frame.length>1048576)throw new ApiError(502,"upstream_frame_too_large");
    const data=frame.split(/\r?\n/).filter(l=>l.startsWith("data:")).map(l=>l.slice(5).replace(/^ /,"")).join("\n");
    if(data)yield data;
   }
   if(pending.length>1048576)throw new ApiError(502,"upstream_frame_too_large");
   if(done){if(pending.trim())throw new ApiError(502,"upstream_truncated");break;}
  }
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
