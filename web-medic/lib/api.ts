const BASE_URL = "https://hamshirago-production.up.railway.app";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("medic_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Ошибка сервера" }));
    throw new Error(error.message || "Ошибка сервера");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const medicApi = {
  auth: {
    login: (phone: string, password: string) =>
      request<MedicAuthResponse>("/medics/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      }),
    register: (data: RegisterMedicDto) =>
      request<MedicAuthResponse>("/medics/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: () => request<Medic>("/medics/me"),
  },

  location: {
    update: (isOnline: boolean, lat?: number, lng?: number) =>
      request<void>("/medics/location", {
        method: "PATCH",
        body: JSON.stringify({
          isOnline,
          ...(lat !== undefined ? { latitude: lat } : {}),
          ...(lng !== undefined ? { longitude: lng } : {}),
        }),
      }),
  },

  orders: {
    available: () => request<Order[]>("/orders/medic/available"),
    my: ()        => request<Order[]>("/orders/medic/my"),
    accept: (id: string) =>
      request<Order>(`/orders/${id}/accept`, { method: "POST" }),
    updateStatus: (id: string, status: OrderStatus) =>
      request<Order>(`/orders/${id}/medic-status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },
};

// ─── Types ───────────────────────────────────────────────

export interface MedicAuthResponse {
  access_token: string;
  medic: Medic;
}

export interface RegisterMedicDto {
  name: string;
  phone: string;
  password: string;
  experienceYears?: number;
}

export interface Medic {
  id: string;
  name: string;
  phone: string;
  rating: number | null;
  reviewCount: number;
  experienceYears: number;
  isOnline: boolean;
  balance: number;
  latitude: number | null;
  longitude: number | null;
}

export interface OrderLocation {
  id: string;
  latitude: number;
  longitude: number;
  house: string;
  floor: string | null;
  apartment: string | null;
  phone: string;
}

export interface Order {
  id: string;
  clientId: string;
  medicId: string | null;
  serviceId: string;
  serviceTitle: string;
  priceAmount: number;
  discountAmount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  location: OrderLocation;
}

export type OrderStatus =
  | "CREATED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "ON_THE_WAY"
  | "ARRIVED"
  | "SERVICE_STARTED"
  | "DONE"
  | "CANCELED";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  CREATED:         "Создан",
  ASSIGNED:        "Принят",
  ACCEPTED:        "Подтверждён",
  ON_THE_WAY:      "В пути",
  ARRIVED:         "Прибыл",
  SERVICE_STARTED: "Услуга начата",
  DONE:            "Выполнен",
  CANCELED:        "Отменён",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, { text: string; bg: string }> = {
  CREATED:         { text: "#0d9488", bg: "#0d948818" },
  ASSIGNED:        { text: "#eab308", bg: "#eab30820" },
  ACCEPTED:        { text: "#eab308", bg: "#eab30820" },
  ON_THE_WAY:      { text: "#eab308", bg: "#eab30820" },
  ARRIVED:         { text: "#eab308", bg: "#eab30820" },
  SERVICE_STARTED: { text: "#14b8a6", bg: "#14b8a620" },
  DONE:            { text: "#22c55e", bg: "#22c55e20" },
  CANCELED:        { text: "#ef4444", bg: "#ef444418" },
};

// Следующий статус по флоу для медика
export const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string; color: string }>> = {
  ASSIGNED:        { status: "ON_THE_WAY",      label: "Выехал к клиенту", color: "#3b82f6" },
  ON_THE_WAY:      { status: "ARRIVED",          label: "Прибыл на место",  color: "#0d9488" },
  ARRIVED:         { status: "SERVICE_STARTED",  label: "Начать услугу",    color: "#14b8a6" },
  SERVICE_STARTED: { status: "DONE",             label: "Завершить услугу", color: "#22c55e" },
};

export function formatPrice(n: number): string {
  return n.toLocaleString("ru-RU");
}
