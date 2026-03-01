export const API_BASE = "https://hamshirago-production-0a65.up.railway.app";
export const WS_URL = API_BASE;

// ── Types ──────────────────────────────────────────────────────────────────────

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type OrderStatus =
  | "CREATED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "ON_THE_WAY"
  | "ARRIVED"
  | "SERVICE_STARTED"
  | "DONE"
  | "CANCELED";

export interface AdminMedic {
  id: string;
  name: string | null;
  phone: string;
  verificationStatus: VerificationStatus;
  isOnline: boolean;
  rating: number | null;
  balance: number | string;
  isBlocked: boolean;
  experienceYears: number;
  reviewCount: number;
  facePhotoUrl: string | null;
  licensePhotoUrl: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  name: string | null;
  phone: string;
  isBlocked: boolean;
  created_at: string;
}

export interface OrderLocation {
  house: string;
  latitude: number;
  longitude: number;
  phone: string;
  floor: string | null;
  apartment: string | null;
}

export interface AdminOrder {
  id: string;
  clientId: string;
  medicId: string | null;
  serviceTitle: string;
  priceAmount: number;
  discountAmount: number;
  platformFee: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  location: OrderLocation;
}

export interface AdminService {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  sortOrder: number;
  isActive: boolean;
}

export interface ServiceFormData {
  title: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  sortOrder: number;
}

// ── Token storage ─────────────────────────────────────────────────────────────

function getAdminToken(): string {
  return localStorage.getItem("admin_token") ?? "";
}

export function setAdminToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function clearAdminToken() {
  localStorage.removeItem("admin_token");
}

export function hasAdminToken(): boolean {
  const token = localStorage.getItem("admin_token");
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function adminLogin(username: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (res.status === 401) throw new Error("Неверный логин или пароль");
  if (!res.ok) throw new Error("Ошибка сервера. Попробуйте позже.");

  const data = await res.json() as { access_token: string };
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
    body: body !== undefined ? JSON.stringify(body) : undefined,
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

  return res.json() as Promise<T>;
}

// ── Paginated response ────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Aliases kept for backwards compatibility with old exports
export type MedicsResponse = PaginatedResponse<AdminMedic>;
export type UsersResponse = PaginatedResponse<AdminUser>;
export type OrdersResponse = PaginatedResponse<AdminOrder>;

// ── Medics ────────────────────────────────────────────────────────────────────

export const getPendingMedics = () =>
  request<AdminMedic[]>("GET", "/medics/admin/pending");

export const getAllMedics = (
  page = 1,
  limit = 20,
  search?: string,
  verificationStatus?: string,
  isBlocked?: boolean,
  isOnline?: boolean,
) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  if (verificationStatus) params.set("verificationStatus", verificationStatus);
  if (isBlocked != null) params.set("isBlocked", String(isBlocked));
  if (isOnline != null) params.set("isOnline", String(isOnline));
  return request<MedicsResponse>("GET", `/medics/admin/all?${params}`);
};

export const verifyMedic = (id: string, status: "APPROVED" | "REJECTED", reason?: string) =>
  request<void>("PATCH", `/medics/admin/${id}/verify`, { status, reason });

export const blockMedic = (id: string, isBlocked: boolean) =>
  request<void>("PATCH", `/medics/admin/${id}/block`, { isBlocked });

// ── Users (Clients) ───────────────────────────────────────────────────────────

export const getUsers = (page = 1, limit = 20, search?: string, isBlocked?: boolean) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  if (isBlocked != null) params.set("isBlocked", String(isBlocked));
  return request<UsersResponse>("GET", `/auth/admin/users?${params}`);
};

export const blockClient = (id: string, isBlocked: boolean) =>
  request<void>("PATCH", `/auth/admin/users/${id}/block`, { isBlocked });

// ── Orders ────────────────────────────────────────────────────────────────────

export const getOrders = (page = 1, limit = 20, status?: string) => {
  let path = `/orders/admin/all?page=${page}&limit=${limit}`;
  if (status) path += `&status=${status}`;
  return request<OrdersResponse>("GET", path);
};

export const cancelOrder = (id: string) =>
  request<void>("PATCH", `/orders/admin/${id}/cancel`);

// ── Services ──────────────────────────────────────────────────────────────────

export const getServices = () =>
  request<AdminService[]>("GET", "/services", undefined, false);

export const createService = (data: ServiceFormData) =>
  request<AdminService>("POST", "/services", data);

export const updateService = (id: string, data: Partial<ServiceFormData> & { isActive?: boolean }) =>
  request<AdminService>("PATCH", `/services/${id}`, data);

export const deleteService = (id: string) =>
  request<void>("DELETE", `/services/${id}`);
