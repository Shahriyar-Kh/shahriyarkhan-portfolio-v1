import { API_BASE_URL } from "@/lib/api/config";

/**
 * Ported from frontend/src/lib/api.ts's assetUrl(). Absolute http(s)://
 * URLs (Cloudinary or any other absolute media host) pass through
 * untouched; relative /images/, /resume/, /favicon paths stay relative
 * (this app's own bundled public/ assets); relative /media/, /static/
 * paths get the API origin prefixed (Django-hosted media/static).
 */
export function assetUrl(path?: string | null): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/images/") || path.startsWith("/resume/") || path.startsWith("/favicon")) {
    return path;
  }
  if (API_BASE_URL && (path.startsWith("/media/") || path.startsWith("/static/"))) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
}
