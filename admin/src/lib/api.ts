const API_BASE = "https://hamshirago-production-0a65.up.railway.app";

// ── Token storage ─────────────────────────────────────────────────────────────

function getAdminToken(): string {
  return localStorage.getItem("admin_token") || "";
}

export function setAdminToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function clearAdminToken() {
  localStorage.removeItem("admin_token");
}

export function hasAdminToken(): boolean {
  return !!localStorage.getItem("admin_token");
}

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * Calls POST /auth/admin/login, stores the JWT on success.
 * Throws on invalid credentials or network error.
 */
export async function adminLogin(username: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (res.status === 401) {
    throw new Error("Неверный логин или пароль");
  }
  if (!res.ok) {
    throw new Error("Ошибка сервера. Попробуйте позже.");
  }

  const data = await res.json();
  setAdminToken(data.access_token);
}

// ── Request helper ────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  requiresAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (requiresAuth) {
    headers["Authorization"] = `Bearer ${getAdminToken()}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearAdminToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
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
