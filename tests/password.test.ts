import {describe,expect,it} from "vitest";
import {validPassword} from "@/lib/password";
describe("password policy",()=>{
 it("accepts exactly six characters with uppercase and punctuation",()=>{expect(validPassword("Abcd1!")).toBe(true);expect(validPassword("Абвг1!")).toBe(true);});
 it("rejects each missing requirement",()=>{for(const p of ["Abc1!","abcd1!","Abcd12","Abcd1 ","A!".repeat(65)])expect(validPassword(p)).toBe(false);});
});
