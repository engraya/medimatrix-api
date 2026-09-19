/// <reference types="node" />

// Copy into the Next.js frontend's lib/api directory when ready to integrate.
// Browser-only. Server Components must explicitly forward cookies to the API.
export interface Envelope<T> {
  success: true;
  data: T;
  message: string;
  meta?: { page: number; limit: number; total: number; totalPages: number; unreadCount?: number };
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}
const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
let refreshInFlight: Promise<boolean> | undefined;
async function refresh() {
  refreshInFlight ??= fetch(`${base}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'fetch' },
  })
    .then((res) => res.ok)
    .finally(() => {
      refreshInFlight = undefined;
    });
  return refreshInFlight;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<Envelope<T>> {
  const headers = new Headers(options.headers);
  headers.set('X-Requested-With', 'fetch');
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  if (res.status === 401 && retry && !path.startsWith('/auth/') && (await refresh()))
    return api<T>(path, options, false);
  const payload = await res.json();
  if (!res.ok || !payload.success)
    throw new ApiError(
      res.status,
      payload.error?.code ?? 'API_ERROR',
      payload.error?.message ?? 'Request failed',
      payload.error?.details,
    );
  return payload;
}
export const post = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export async function uploadDocument(file: File) {
  const form = new FormData();
  form.set('file', file);
  return api<{ id: string; originalName: string; mimeType: string; sizeBytes: number }>('/files', {
    method: 'POST',
    body: form,
  });
}
