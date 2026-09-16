import { describe,expect,it } from "vitest";
import { constantEqual,hashKey } from "@/lib/security";
describe("key handling",()=>{
 it("hashes deterministically without returning the secret",()=>{const secret="sk-"+"a".repeat(43);const value=hashKey(secret);expect(value).toHaveLength(64);expect(value).not.toContain(secret);expect(hashKey(secret)).toBe(value);});
 it("uses constant-length equality safely",()=>{expect(constantEqual("abc","abc")).toBe(true);expect(constantEqual("abc","abd")).toBe(false);expect(constantEqual("a","long")).toBe(false);});
});
