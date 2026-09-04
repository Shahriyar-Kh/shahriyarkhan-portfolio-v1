import { apiPost } from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/errors";
import type {
  ContactMessage,
  ContactMessagePayload,
  ServiceRequest,
  ServiceRequestPayload,
} from "@/lib/api/types";

export async function postContact(payload: ContactMessagePayload): Promise<ApiResult<ContactMessage>> {
  return apiPost<ContactMessage, ContactMessagePayload>("/api/v1/public/inquiries/contact/", payload);
}

export async function postServiceRequest(
  payload: ServiceRequestPayload,
): Promise<ApiResult<ServiceRequest>> {
  return apiPost<ServiceRequest, ServiceRequestPayload>(
    "/api/v1/public/inquiries/service-requests/",
    payload,
  );
}
