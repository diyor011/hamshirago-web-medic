const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://hamshirago-production-0a65.up.railway.app";
export const WS_URL = BASE_URL;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
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
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/auth";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Ошибка сервера" }));
    const msg = Array.isArray(error.message) ? error.message.join(", ") : (error.message || "Ошибка сервера");
    throw new Error(msg);
  }
  const text = await res.text();
  if (!text.trim()) return undefined as T;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Ошибка парсинга ответа сервера");
  }
}

const SERVICES_CACHE_KEY = "svc_cache";
const SERVICES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedServices(): Service[] | null {
  try {
    const raw = localStorage.getItem(SERVICES_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: Service[]; ts: number };
    if (Date.now() - ts > SERVICES_CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCachedServices(data: Service[]) {
  try {
    localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* ignore quota errors */ }
}

export const api = {
  services: {
    list: () => {
      const cached = getCachedServices();
      if (cached) return Promise.resolve(cached);
      return request<Service[]>("/services").then((data) => {
        setCachedServices(data);
        return data;
      });
    },
    get: (id: string) => request<Service>(`/services/${id}`),
  },

  auth: {
    login: (phone: string, password: string) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      }),
    register: (name: string, phone: string, password: string) =>
      request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, phone, password }),
      }),
  },

  orders: {
    list: () => request<{ data: Order[] }>("/orders").then(r => r.data),
    get: (id: string) => request<Order>(`/orders/${id}`),
    create: (data: CreateOrderDto) =>
      request<Order>("/orders", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    cancel: (id: string) =>
      request<Order>(`/orders/${id}/cancel`, { method: "POST" }),
    confirmDone: (id: string) =>
      request<Order>(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "DONE" }),
      }),
    rate: (id: string, rating: number) =>
      request<Order>(`/orders/${id}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      }),
  },

  medics: {
    nearby: (lat: number, lng: number) =>
      request<Medic[]>(`/medics/nearby?latitude=${lat}&longitude=${lng}`),
  },
};

// ─── Types ───────────────────────────────────────────────

export interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: { id: string; phone: string; name: string | null };
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
  clientRating: number | null;
  created_at: string;
  updated_at: string;
  location: OrderLocation;
  medic: Medic | null;
}

export interface Medic {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number;
  experienceYears: number;
  isOnline: boolean;
  latitude: number | null;
  longitude: number | null;
  distanceKm?: number;
}

export interface CreateOrderDto {
  serviceId: string;
  serviceTitle: string;
  priceAmount: number;
  discountAmount: number;
  location: {
    latitude: number;
    longitude: number;
    house: string;
    floor?: string;
    apartment?: string;
    phone: string;
  };
}
// Note: medicId не поддерживается бекендом в CreateOrderDto

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
  CREATED: "Создан",
  ASSIGNED: "Назначен",
  ACCEPTED: "Принят",
  ON_THE_WAY: "В пути",
  ARRIVED: "Прибыл",
  SERVICE_STARTED: "Оказывается услуга",
  DONE: "Выполнен",
  CANCELED: "Отменён",
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

// ─── Services ────────────────────────────────────────────

export const SERVICES_MAP: Record<string, { nameRu: string; priceMin: number; priceMax: number }> = {
  injection:      { nameRu: "Укол",                priceMin: 80000,  priceMax: 120000 },
  iv_drip:        { nameRu: "Капельница",          priceMin: 150000, priceMax: 250000 },
  blood_pressure: { nameRu: "Давление",            priceMin: 50000,  priceMax: 80000  },
  long_term_care: { nameRu: "Долговременный уход", priceMin: 200000, priceMax: 400000 },
};

export function formatPrice(n: number): string {
  return n.toLocaleString("ru-RU");
}
