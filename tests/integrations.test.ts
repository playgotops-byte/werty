import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
describe("downloadable integrations",()=>{
 it("publishes a valid action targeting the existing authenticated endpoint",()=>{
  const schema=JSON.parse(readFileSync("public/integrations/openapi.json","utf8"));
  expect(schema.paths["/v1/chat/completions"].post.operationId).toBe("askWerty");
  expect(schema.security).toEqual([{bearerAuth:[]}]);
 });
 it("initializes MCP, validates arguments and forwards only the requested text",async()=>{
  // The downloadable connector is plain Node.js so it needs no installation.
  // @ts-expect-error standalone downloadable JavaScript module
  const {handle}=await import("../public/integrations/werty-mcp.mjs");
  const init=await handle({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2024-11-05"}});
  expect(init.result.capabilities).toEqual({tools:{}});
  const fetchImpl=vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:"answer"}}]})});
  const call={jsonrpc:"2.0",id:2,method:"tools/call",params:{name:"ask_werty",arguments:{model:"gpt-6-astra",prompt:"hello"}}};
  const result=await handle(call,{key:"test-key",fetchImpl});
  expect(result.result.content[0].text).toBe("answer");
  const [url,options]=fetchImpl.mock.calls[0];
  expect(url).toBe("https://wertyai.online/v1/chat/completions");
  expect(JSON.parse(options.body).messages).toEqual([{role:"user",content:"hello"}]);
  expect(options.headers.Authorization).toBe("Bearer test-key");
  const bad=await handle({...call,params:{name:"ask_werty",arguments:{model:"x",prompt:""}}},{key:"test-key",fetchImpl});
  expect(bad.error.code).toBe(-32602);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
 });
});
