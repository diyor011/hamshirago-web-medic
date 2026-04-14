const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://hamshirago-production-0a65.up.railway.app";
export const WS_URL = BASE_URL;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("medic_token");
}

export function getUserRole(): "medic" | "doctor" {
  if (typeof window === "undefined") return "medic";
  return (localStorage.getItem("user_role") as "medic" | "doctor") ?? "medic";
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
  if (res.status === 401 && !path.startsWith("/auth/") && !path.startsWith("/medics/login") && !path.startsWith("/medics/register")) {
    localStorage.removeItem("medic_token");
    localStorage.removeItem("medic");
    window.location.href = "/auth";
    throw new Error("Unauthorized");
  }
  if (res.status === 429) throw new Error("TOO_MANY_REQUESTS");
  if (res.status === 402) {
    const body = await res.json().catch(() => ({}));
    const err = new Error("INSUFFICIENT_WALLET") as Error & { required: number; current: number };
    err.required = body.required ?? 0;
    err.current = body.current ?? 0;
    throw err;
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Ошибка сервера" }));
    throw new Error(error.message || "Ошибка сервера");
  }
  const text = await res.text();
  if (!text.trim()) return undefined as T;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Ошибка парсинга ответа сервера");
  }
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
    me: () => request<Medic>(`/medics/me?_=${Date.now()}`),
    updateProfile: (name: string) =>
      request<Medic>("/medics/profile", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
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

  documents: {
    upload: (facePhoto: File, licensePhoto: File) => {
      const token = getToken();
      const form = new FormData();
      form.append("facePhoto", facePhoto);
      form.append("licensePhoto", licensePhoto);
      return fetch(`${BASE_URL}/medics/documents`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Ошибка загрузки" }));
          throw new Error(err.message || "Ошибка загрузки");
        }
        const text = await res.text();
        if (!text) return undefined as unknown as Medic;
        return JSON.parse(text) as Medic;
      });
    },
  },

  orders: {
    available: () => request<Order[]>("/orders/medic/available"),
    my: ()        => request<{ data: Order[] }>("/orders/medic/my").then(r => r.data),
    get: (id: string) => request<Order>(`/orders/${id}`),
    accept: (id: string) =>
      request<Order>(`/orders/${id}/accept`, { method: "POST" }),
    decline: (id: string) =>
      request<void>(`/orders/${id}/decline`, { method: "POST" }),
    updateStatus: (id: string, status: OrderStatus) =>
      request<Order>(`/orders/${id}/medic-status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },

  wallet: {
    requestWithdrawal: (amount: number, cardNumber: string) =>
      request<{ id: string; status: string; amount: number }>("/medics/me/withdrawal-request", {
        method: "POST",
        body: JSON.stringify({ amount, cardNumber }),
      }),
  },

  medicalCard: {
    getByClient: (clientId: string) =>
      request<MedicalCard>(`/medical-card/client/${clientId}`),
  },

  photo: {
    upload: (file: File) => {
      const token = getToken();
      const form = new FormData();
      form.append("photo", file);
      return fetch(`${BASE_URL}/medics/profile-photo`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Ошибка загрузки" }));
          throw new Error(err.message || "Ошибка загрузки");
        }
        return res.json() as Promise<Medic>;
      });
    },
  },

  telegram: {
    saveChatId: (chatId: string) =>
      request<void>("/medics/telegram-chat-id", {
        method: "PATCH",
        body: JSON.stringify({ chatId }),
      }),
  },

  webPush: {
    subscribe: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
      request<void>("/medics/web-push-subscription", {
        method: "POST",
        body: JSON.stringify(subscription),
      }),
    unsubscribe: (endpoint: string) =>
      request<void>("/medics/web-push-subscription", {
        method: "DELETE",
        body: JSON.stringify({ endpoint }),
      }),
  },

  workZone: {
    set: (lat: number, lng: number, radius: number) =>
      request<void>("/medics/work-zone", {
        method: "PATCH",
        body: JSON.stringify({ lat, lng, radius }),
      }),
    clear: () =>
      request<void>("/medics/work-zone", {
        method: "DELETE",
      }),
  },

  chat: {
    getMessages: (orderId: string) =>
      request<ChatMessage[]>(`/orders/${orderId}/messages`),
    sendMessage: (orderId: string, content: string) =>
      request<ChatMessage>(`/orders/${orderId}/medic-messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
  },

  reviews: {
    create: (orderId: string, rating: number, comment?: string, targetRole: string = "client") =>
      request<Review>("/reviews", {
        method: "POST",
        body: JSON.stringify({ orderId, rating, comment, targetRole }),
      }),
    getByOrder: (orderId: string) =>
      request<Review[]>(`/reviews/order/${orderId}`),
    getByMedic: (medicId: string, page = 1) =>
      request<{ data: Review[]; total: number; page: number; totalPages: number }>(
        `/reviews/medic/${medicId}?page=${page}&limit=20`,
      ),
  },
};

// ─── Types ───────────────────────────────────────────────

export interface MedicalCard {
  id: string;
  clientId: string;
  bloodType: string | null;
  allergies: string | null;
  chronicDiseases: string | null;
  notes: string | null;
}

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

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Medic {
  id: string;
  name: string;
  phone: string;
  rating: number | null;
  reviewCount: number;
  experienceYears: number;
  isOnline: boolean;
  isBlocked: boolean;
  balance: number;
  earnings: number;
  latitude: number | null;
  longitude: number | null;
  verificationStatus: VerificationStatus;
  profilePhotoUrl: string | null;
  facePhotoUrl: string | null;
  licensePhotoUrl: string | null;
  verificationRejectedReason: string | null;
  onlineDisabledReason?: 'INACTIVE_5H' | null;
  workZoneLat?: number | null;
  workZoneLng?: number | null;
  workZoneRadius?: number | null;
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
  platformFee?: number;
  urgentFee?: number;
  isUrgent?: boolean;
  status: OrderStatus;
  cancelReason?: string | null;
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
  ASSIGNED:        "Назначен",
  ACCEPTED:        "Принят",
  ON_THE_WAY:      "В пути",
  ARRIVED:         "Прибыл",
  SERVICE_STARTED: "Оказывается услуга",
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
  ACCEPTED:        { status: "ON_THE_WAY",        label: "Выехал к клиенту",    color: "#3b82f6" },
  ON_THE_WAY:      { status: "ARRIVED",           label: "Прибыл на место",      color: "#0d9488" },
  ARRIVED:         { status: "SERVICE_STARTED",   label: "Начать услугу",        color: "#14b8a6" },
  SERVICE_STARTED: { status: "DONE",              label: "Завершить услугу",     color: "#22c55e" },
};

export interface ChatMessage {
  id: string;
  userId: string;
  role: "user" | "doctor" | "assistant";
  content: string;
  createdAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  authorId: string;
  authorRole: string;
  targetId: string;
  targetRole: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

// ─── Doctor API ──────────────────────────────────────────────────────────────

export interface DoctorAuthResponse {
  access_token: string;
  doctor: DoctorProfile;
}

export interface RegisterDoctorDto {
  name: string;
  phone: string;
  password: string;
  specialization?: string;
  experienceYears?: number;
  pricePerConsultation?: number;
  bio?: string;
}

export interface DoctorProfile {
  id: string;
  name: string;
  phone: string;
  specialization: string | null;
  experienceYears: number;
  isOnline: boolean;
  isBlocked: boolean;
  verificationStatus: VerificationStatus;
  profilePhotoUrl: string | null;
  facePhotoUrl: string | null;
  rating: number | null;
  reviewCount: number;
  pricePerConsultation: number | null;
  bio: string | null;
}

export type ConsultationStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELED";

export interface Consultation {
  id: string;
  clientId: string;
  doctorId: string | null;
  status: ConsultationStatus;
  symptoms: string;
  suggestedSpecialization: string | null;
  doctorNotes: string | null;
  slotId: string | null;
  createdAt: string;
  updatedAt: string;
  doctor?: DoctorProfile;
  client?: { id: string; name: string; phone: string };
  prescription?: { id: string; serviceTitle: string; status: string };
  salomatSummary?: string | null;
}

export interface DoctorSlot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  consultationId: string | null;
}

export const doctorApi = {
  auth: {
    login: (phone: string, password: string) =>
      request<DoctorAuthResponse>("/doctors/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      }),
    register: (data: RegisterDoctorDto) =>
      request<DoctorAuthResponse>("/doctors/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: () => request<DoctorProfile>(`/doctors/me?_=${Date.now()}`),
    updateProfile: (dto: Partial<RegisterDoctorDto>) =>
      request<DoctorProfile>("/doctors/profile", {
        method: "PATCH",
        body: JSON.stringify(dto),
      }),
    setOnline: (isOnline: boolean) =>
      request<DoctorProfile>("/doctors/profile", {
        method: "PATCH",
        body: JSON.stringify({ isOnline }),
      }),
  },
  consultations: {
    pending: () => request<Consultation[]>("/consultations/doctor/pending"),
    my: (page = 1, limit = 20) =>
      request<{ data: Consultation[]; total: number; page: number; totalPages: number }>(
        `/consultations/doctor/my?page=${page}&limit=${limit}`,
      ),
    get: (id: string) => request<Consultation>(`/consultations/${id}`),
    accept: (id: string) =>
      request<Consultation>(`/consultations/${id}/doctor-accept`, { method: "POST" }),
    decline: (id: string) =>
      request<Consultation>(`/consultations/${id}/doctor-decline`, { method: "POST" }),
    complete: (id: string, dto: { doctorNotes: string; createOrderServiceId?: string }) =>
      request<Consultation>(`/consultations/${id}/doctor-complete`, {
        method: "PATCH",
        body: JSON.stringify(dto),
      }),
    joinCall: (id: string) =>
      request<{ token: string; roomName: string }>(`/consultations/${id}/call/join`, {
        method: "POST",
        body: JSON.stringify({ role: "doctor" }),
      }),
  },
  slots: {
    create: (dto: { date: string; startTime: string; endTime: string; intervalMinutes: number }) =>
      request<DoctorSlot[]>("/doctors/me/slots", { method: "POST", body: JSON.stringify(dto) }),
    get: (date?: string) =>
      request<DoctorSlot[]>(`/doctors/me/slots${date ? `?date=${date}` : ""}`),
    delete: (slotId: string) =>
      request<void>(`/doctors/me/slots/${slotId}`, { method: "DELETE" }),
  },
};

export function formatPrice(n: number): string {
  return n.toLocaleString("ru-RU");
}

export function reportClientError(message: string, stack?: string): void {
  fetch(`${BASE_URL}/client-errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appType: "web-medic",
      message,
      stack,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof window !== "undefined" ? navigator.userAgent : undefined,
    }),
  }).catch(() => {}); // fire-and-forget, никогда не бросаем ошибку
}
