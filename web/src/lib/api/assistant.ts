import { apiPost } from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/errors";
import type {
  AssistantQueryPayload,
  AssistantQueryResponse,
  ProjectDiscoveryAnalysisPayload,
  ProjectDiscoveryAnalysisResponse,
  ProjectDiscoveryPayload,
  ProjectDiscoveryReceipt,
} from "@/lib/api/types";

export async function postAssistantQuery(payload: AssistantQueryPayload): Promise<ApiResult<AssistantQueryResponse>> {
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
