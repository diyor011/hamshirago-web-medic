const API_BASE = "https://hamshirago-production-0a65.up.railway.app";

function getAdminSecret(): string {
  return localStorage.getItem("admin_secret") || "";
}

export function setAdminSecret(secret: string) {
  localStorage.setItem("admin_secret", secret);
}

export function clearAdminSecret() {
  localStorage.removeItem("admin_secret");
}

export function hasAdminSecret(): boolean {
  return !!localStorage.getItem("admin_secret");
}

/**
 * Validates the secret against the backend by hitting a real admin endpoint.
 * Returns true if accepted (2xx), false if 403 or network error.
 */
export async function validateAdminSecret(secret: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/medics/admin/pending`, {
      headers: { "X-Admin-Secret": secret },
    });
    return res.status !== 403;
  } catch {
    return false;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isAdmin = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (isAdmin) {
    headers["X-Admin-Secret"] = getAdminSecret();
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 403) {
    clearAdminSecret();
    window.location.href = "/login";
    throw new Error("Forbidden");
  }

  if (res.status === 204) return null as T;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }

  return res.json();
}

// Medics
export const getPendingMedics = () => request<any[]>("GET", "/medics/admin/pending");

export const verifyMedic = (id: string, status: "APPROVED" | "REJECTED", reason?: string) =>
  request<any>("PATCH", `/medics/admin/${id}/verify`, { status, reason });

export const blockMedic = (id: string, isBlocked: boolean) =>
  request<any>("PATCH", `/medics/admin/${id}/block`, { isBlocked });

// Clients
export const blockClient = (id: string, isBlocked: boolean) =>
  request<any>("PATCH", `/auth/admin/users/${id}/block`, { isBlocked });

// Orders
export interface OrdersResponse {
  data: any[];
  total: number;
  page: number;
  totalPages: number;
}

export const getOrders = (page = 1, limit = 20, status?: string) => {
  let path = `/orders/admin/all?page=${page}&limit=${limit}`;
  if (status) path += `&status=${status}`;
  return request<OrdersResponse>("GET", path);
};

export const cancelOrder = (id: string) =>
  request<any>("PATCH", `/orders/admin/${id}/cancel`);

// Services
export const getServices = () => request<any[]>("GET", "/services", undefined, false);

export const createService = (data: any) => request<any>("POST", "/services", data);

export const updateService = (id: string, data: any) =>
  request<any>("PATCH", `/services/${id}`, data);

export const deleteService = (id: string) =>
  request<void>("DELETE", `/services/${id}`);
