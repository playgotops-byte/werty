import { z } from "zod";
export const chatSchema=z.object({
 model:z.string().min(1).max(100),
 messages:z.array(z.object({role:z.enum(["system","user","assistant"]),content:z.string().min(1).max(100000)}).strict()).min(1).max(100),
 max_tokens:z.number().int().min(1).max(8192).default(1024),
 temperature:z.number().min(0).max(2).optional(),
 stream:z.boolean().default(false),
 stream_options:z.object({include_usage:z.boolean()}).strict().optional()
}).strict();
export const usageSchema=z.object({prompt_tokens:z.number().int().nonnegative().safe(),completion_tokens:z.number().int().nonnegative().safe()}).passthrough()
 .refine(u=>u.prompt_tokens+u.completion_tokens>0);
export type Usage=z.infer<typeof usageSchema>;
