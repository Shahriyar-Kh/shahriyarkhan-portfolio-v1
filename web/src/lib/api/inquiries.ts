import { apiPost } from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/errors";
import type { ContactMessagePayload, InquiryReceipt, ServiceRequestPayload } from "@/lib/api/types";

export async function postContact(payload: ContactMessagePayload): Promise<ApiResult<InquiryReceipt>> {
  return apiPost<InquiryReceipt, ContactMessagePayload>("/api/v1/public/inquiries/contact/", payload);
}

export async function postServiceRequest(
  payload: ServiceRequestPayload,
): Promise<ApiResult<InquiryReceipt>> {
  return apiPost<InquiryReceipt, ServiceRequestPayload>(
    "/api/v1/public/inquiries/service-requests/",
    payload,
  );
}
