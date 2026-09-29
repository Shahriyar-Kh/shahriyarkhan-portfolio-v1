import { apiGet, apiPost } from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/errors";
import type {
  AssistantQueryPayload,
  AssistantQueryResponse,
  ProjectDiscoveryAnalysisPayload,
  ProjectDiscoveryAnalysisResponse,
  ProjectDiscoveryPayload,
  ProjectDiscoveryReceipt,
} from "@/lib/api/types";

let assistantServiceReady = false;
let assistantServiceWarmup: Promise<void> | null = null;

/**
 * Wake the backend before the first assistant POST.
 *
 * Railway/serverless instances can be asleep when a visitor asks the first
 * question. A side-effect-free GET is safe to retry, while retrying the
 * assistant POST itself could consume quota twice if the server processed the
 * request but the response was lost. Once a health check succeeds, subsequent
 * assistant questions skip this preflight for the lifetime of the page.
 */
async function warmAssistantContentService(): Promise<void> {
  if (assistantServiceReady) return;

  if (!assistantServiceWarmup) {
    assistantServiceWarmup = (async () => {
      const result = await apiGet<{ status: string }>("/healthz", {
        cache: "no-store",
        retry: true,
      });
      if (result.ok) assistantServiceReady = true;
    })().finally(() => {
      assistantServiceWarmup = null;
    });
  }

  await assistantServiceWarmup;
}

export async function postAssistantQuery(payload: AssistantQueryPayload): Promise<ApiResult<AssistantQueryResponse>> {
  await warmAssistantContentService();
  return apiPost<AssistantQueryResponse, AssistantQueryPayload>("/api/v1/public/assistant/query/", payload);
}

export async function postProjectDiscovery(
  payload: ProjectDiscoveryPayload,
): Promise<ApiResult<ProjectDiscoveryReceipt>> {
  return apiPost<ProjectDiscoveryReceipt, ProjectDiscoveryPayload>(
    "/api/v1/public/inquiries/project-discovery/",
    payload,
  );
}


export async function postProjectDiscoveryAnalysis(
  payload: ProjectDiscoveryAnalysisPayload,
): Promise<ApiResult<ProjectDiscoveryAnalysisResponse>> {
  return apiPost<ProjectDiscoveryAnalysisResponse, ProjectDiscoveryAnalysisPayload>(
    "/api/v1/public/assistant/project-discovery-analysis/",
    payload,
  );
}
