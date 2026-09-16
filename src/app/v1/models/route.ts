import { guarded } from "@/lib/http";
import { listModels } from "@/services/gateway";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = guarded(listModels);
