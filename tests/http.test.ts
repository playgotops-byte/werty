import { describe,expect,it } from "vitest";
import { ApiError,body,bearer } from "@/lib/http";
import { z } from "zod";
describe("http boundaries",()=>{
 it("parses bounded json",async()=>{const r=new Request("http://x",{method:"POST",headers:{"content-type":"application/json"},body:'{"x":1}'});expect(await body(r,z.object({x:z.number()}),20)).toEqual({x:1});});
 it("rejects oversized input",async()=>{const r=new Request("http://x",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({x:"too-long"})});await expect(body(r,z.object({x:z.string()}),5)).rejects.toMatchObject({status:413});});
 it("requires strict bearer syntax",()=>{expect(()=>bearer(new Request("http://x",{headers:{authorization:"Basic x"}}))).toThrow(ApiError);});
});
