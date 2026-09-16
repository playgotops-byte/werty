import "server-only";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/http";
import { appOrigin,required } from "@/lib/env";
type YooPayment={id:string;status:string;paid:boolean;amount:{value:string;currency:string};metadata?:Record<string,string>;confirmation?:{confirmation_url:string}};
function auth(){return "Basic "+Buffer.from(required("YOOKASSA_SHOP_ID")+":"+required("YOOKASSA_SECRET_KEY")).toString("base64");}
async function request(path:string,init:RequestInit={}):Promise<YooPayment>{
 const response=await fetch("https://api.yookassa.ru/v3"+path,{...init,redirect:"error",cache:"no-store",headers:{Authorization:auth(),"Content-Type":"application/json",...(init.headers??{})}});
 if(!response.ok)throw new ApiError(502,"payment_provider_error");
 return await response.json() as YooPayment;
}
export async function createPayment(id:string,kopecks:number,idempotency:string){
 const payment=await request("/payments",{method:"POST",headers:{"Idempotence-Key":idempotency},body:JSON.stringify({amount:{value:(kopecks/100).toFixed(2),currency:"RUB"},capture:true,confirmation:{type:"redirect",return_url:appOrigin()+"/dashboard/billing"},description:"Werty balance",metadata:{local_payment_id:id}})});
 if(!payment.confirmation?.confirmation_url)throw new ApiError(502,"payment_confirmation_missing");
 return payment;
}
export async function getPayment(id:string){return request("/payments/"+encodeURIComponent(id));}
export function verifyPayment(payment:YooPayment,localId:string,kopecks:number){
 return payment.status==="succeeded"&&payment.paid===true&&payment.amount.currency==="RUB"&&payment.amount.value===(kopecks/100).toFixed(2)&&payment.metadata?.local_payment_id===localId;
}
export function newPaymentIdempotency(){return randomUUID();}
