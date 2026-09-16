import "server-only";
import { ApiError } from "./http";
export function required(name:string):string {const v=process.env[name]?.trim();if(!v)throw new ApiError(503,"service_not_configured");return v;}
export function secret(name:string){const v=required(name);if(v.length<32)throw new ApiError(503,"service_not_configured");return v;}
export function positiveEnv(name:string,max:number):number{const n=Number(required(name));if(!Number.isSafeInteger(n)||n<1||n>max)throw new ApiError(503,"invalid_server_configuration");return n;}
export function appOrigin(){const u=new URL(required("APP_ORIGIN"));if(u.username||u.password||u.search||u.hash)throw new ApiError(503,"invalid_server_configuration");if(u.protocol!=="https:"&&!(process.env.NODE_ENV!=="production"&&u.hostname==="localhost"))throw new ApiError(503,"invalid_server_configuration");return u.origin;}
export type ProviderName="deepseek"|"nex"|"unconfigured";
export function providerConfig(provider:ProviderName){
 if(provider==="unconfigured")throw new ApiError(503,"model_unavailable");
 const prefix=provider.toUpperCase();const u=new URL(required(prefix+"_BASE_URL"));
 if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash)throw new ApiError(503,"invalid_server_configuration");
 return {url:u.toString().replace(/\/$/,"")+"/chat/completions",apiKey:required(prefix+"_API_KEY"),model:required(prefix+"_MODEL_ID"),maxInput:positiveEnv(prefix+"_MAX_INPUT_TOKENS",10000000)};
}
