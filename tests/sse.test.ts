import { describe,expect,it } from "vitest";
import { sseFrames } from "@/services/sse";
function stream(parts:string[]){return new ReadableStream<Uint8Array>({start(c){const e=new TextEncoder();for(const p of parts)c.enqueue(e.encode(p));c.close();}});}
describe("SSE parser",()=>{
 it("handles split UTF-8, CRLF, and multiline data",async()=>{const frames:string[]=[];for await(const f of sseFrames(stream(["data: {\"x\":","1}\r\n\r\ndata: a\ndata: b\n\n"])))frames.push(f);expect(frames).toEqual(['{"x":1}',"a\nb"]);});
 it("rejects a truncated final frame",async()=>{const consume=async()=>{for await(const _ of sseFrames(stream(["data: incomplete"])))void _;};await expect(consume()).rejects.toMatchObject({code:"upstream_truncated"});});
});
