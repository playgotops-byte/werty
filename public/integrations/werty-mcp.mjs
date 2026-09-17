import {createInterface} from "node:readline";
import {pathToFileURL} from "node:url";
const tool={name:"ask_werty",description:"Send a text request to a selected Werty model. Uses paid Werty tokens. Send only the prompt the user wants forwarded.",inputSchema:{type:"object",properties:{model:{type:"string",description:"Werty model ID, for example gpt-6-astra"},prompt:{type:"string",description:"Text to send to Werty"}},required:["model","prompt"],additionalProperties:false}};
export async function handle(message,{key=process.env.WERTY_API_KEY,fetchImpl=fetch}={}){
 const id=message?.id??null;
 const success=result=>({jsonrpc:"2.0",id,result});
 const fail=(code,text)=>({jsonrpc:"2.0",id,error:{code,message:text}});
 if(!message||message.jsonrpc!=="2.0"||typeof message.method!=="string")return fail(-32600,"Invalid request");
 if(message.id===undefined)return null;
 if(message.method==="initialize"){
  const supported=["2024-11-05","2025-03-26","2025-06-18"];
  const requested=message.params?.protocolVersion;
  return success({protocolVersion:supported.includes(requested)?requested:"2024-11-05",capabilities:{tools:{}},serverInfo:{name:"werty",version:"1.0.0"}});
 }
 if(message.method==="ping")return success({});
 if(message.method==="tools/list")return success({tools:[tool]});
 if(message.method!=="tools/call")return fail(-32601,"Method not found");
 if(message.params?.name!=="ask_werty")return fail(-32602,"Unknown tool");
 const args=message.params.arguments;
 if(!args||typeof args.model!=="string"||!args.model.length||args.model.length>100||typeof args.prompt!=="string"||!args.prompt.length||args.prompt.length>100000)return fail(-32602,"Provide a model ID and a prompt (1–100000 characters).");
 const error=text=>success({isError:true,content:[{type:"text",text}]});
 if(!key)return error("Set WERTY_API_KEY in the MCP server environment.");
 try{
  const response=await fetchImpl("https://wertyai.online/v1/chat/completions",{method:"POST",redirect:"error",signal:AbortSignal.timeout(90000),headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model:args.model,messages:[{role:"user",content:args.prompt}],max_tokens:2048,stream:false})});
  if(!response.ok)return error("Werty returned HTTP "+response.status+". Check the key, balance and model ID.");
  const data=await response.json();
  const text=data.choices?.[0]?.message?.content;
  if(typeof text!=="string")return error("Werty returned an unsupported response.");
  return success({content:[{type:"text",text}]});
 }catch{return error("Werty request failed or timed out. Check request history before retrying.");}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const lines=createInterface({input:process.stdin,crlfDelay:Infinity});
 for await(const line of lines){
  if(!line.trim())continue;
  let response;
  try{if(line.length>262144)throw Error();response=await handle(JSON.parse(line));}
  catch{response={jsonrpc:"2.0",id:null,error:{code:-32700,message:"Invalid JSON request"}};}
  if(response)process.stdout.write(JSON.stringify(response)+"\n");
 }
}
