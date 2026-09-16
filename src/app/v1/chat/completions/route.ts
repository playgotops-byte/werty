import { guarded } from "@/lib/http";
import { completions } from "@/services/gateway";
export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";
export const POST = guarded(completions);
