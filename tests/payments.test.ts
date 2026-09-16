import { describe,expect,it } from "vitest";
import { verifyPayment } from "@/services/payments";
describe("YooKassa verification",()=>{
 const payment={id:"pay_1",status:"succeeded",paid:true,amount:{value:"250.00",currency:"RUB"},metadata:{local_payment_id:"local_1"}};
 it("accepts only an exact verified payment",()=>{expect(verifyPayment(payment,"local_1",25000)).toBe(true);});
 it("rejects amount, currency, local id, or status mismatches",()=>{
  expect(verifyPayment({...payment,amount:{value:"249.00",currency:"RUB"}},"local_1",25000)).toBe(false);
  expect(verifyPayment({...payment,paid:false},"local_1",25000)).toBe(false);
  expect(verifyPayment(payment,"another",25000)).toBe(false);
 });
});
