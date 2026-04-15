const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://hamshirago-production-0a65.up.railway.app";

export function getClinicToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("clinic_token");
}

export function getClinicRole(): "CEO" | "RECEPTION" | "DOCTOR" | null {
  if (typeof window === "undefined") return null;
  const token = getClinicToken();
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function clearClinicSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("clinic_token");
  localStorage.removeItem("clinic_user");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getClinicToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (
    res.status === 401 &&
    !path.startsWith("/clinic-auth/")
  ) {
    clearClinicSession();
    if (typeof window !== "undefined") {
      window.location.href = "/clinic/auth";
    }
    throw new Error("Unauthorized");
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClinicRole = "CEO" | "RECEPTION" | "DOCTOR";

export interface ClinicAuthResponse {
  access_token: string;
  user: {
    id: string;
    name: string;
    role: ClinicRole;
    companyId: string;
  };
}

export interface ClinicCompany {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

export interface ClinicStaff {
  id: string;
  name: string;
  phone: string;
  role: ClinicRole;
  specialization?: string | null;
  photoUrl?: string | null;
  isActive: boolean;
}

export interface ClinicRoom {
  id: string;
  name: string;
  floor?: number | null;
}

export interface RoomDoctorSchedule {
  id: string;
  doctorId: string;
  roomId: string;
  days: number[];
  startTime: string;
  endTime: string;
}

export interface DoctorRoomSlot {
  roomId: string;
  roomName: string;
  floor: number | null;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
}

export interface ClinicService {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}

export type AppointmentStatus =
  | "SCHEDULED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "DONE"
  | "CANCELED"
  | "NO_SHOW";

export type PaymentType = "CASH" | "TERMINAL" | "ONLINE";

export interface Appointment {
  id: string;
  patientPhone: string;
  patientName?: string | null;
  doctorId: string;
  roomId: string;
  date: string;
  time: string;
  paymentType: PaymentType;
  status: AppointmentStatus;
  cancelReason?: string | null;
  createdAt: string;
}

export interface CreateAppointmentDto {
  patientPhone: string;
  patientName?: string;
  doctorId: string;
  roomId: string;
  date: string;
  time: string;
  paymentType: PaymentType;
}

export type LeadStatus = "NEW" | "IN_PROGRESS" | "DONE" | "CANCELED";

export interface Lead {
  id: string;
  name?: string | null;
  phone: string;
  status: LeadStatus;
  notes?: string | null;
  createdAt: string;
}

export interface LeadStats {
  total: number;
  new: number;
  inProgress: number;
  done: number;
  canceled: number;
}

export interface AppointmentStats {
  total: number;
  done: number;
  canceled: number;
  revenue: number;
}

export interface StatsOverview {
  appointments: number;
  revenue: number;
  newPatients: number;
  cancelRate: number;
}

export interface MonthlyStats {
  month: string;
  appointments: number;
  revenue: number;
}

export interface DoctorStats {
  doctorId: string;
  doctorName: string;
  appointments: number;
  revenue: number;
}

export interface PatientInfo {
  phone: string;
  name?: string | null;
  appointments: Appointment[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const clinicApi = {
  auth: {
    login: (phone: string, password: string) =>
      request<ClinicAuthResponse>("/clinic-auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      }),
    me: () => request<ClinicAuthResponse["user"]>("/clinic-auth/me"),
  },

  me: {
    saveTelegramChatId: (chatId: string) =>
      request<{ ok: boolean }>("/clinic/me/telegram-chat-id", {
        method: "PATCH",
        body: JSON.stringify({ chatId }),
      }),
  },

  company: {
    get: () => request<ClinicCompany>("/clinic/company"),
    update: (data: Partial<ClinicCompany>) =>
      request<ClinicCompany>("/clinic/company", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  staff: {
    list: () => request<ClinicStaff[]>("/clinic/staff"),
    create: (dto: {
      name: string;
      phone: string;
      password: string;
      role: ClinicRole;
      specialization?: string;
      photoUrl?: string;
    }) =>
      request<ClinicStaff>("/clinic/staff", {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    update: (id: string, dto: Partial<Omit<ClinicStaff, "id" | "isActive">>) =>
      request<ClinicStaff>(`/clinic/staff/${id}`, {
        method: "PATCH",
        body: JSON.stringify(dto),
      }),
    deactivate: (id: string) =>
      request<void>(`/clinic/staff/${id}`, { method: "DELETE" }),
  },

  rooms: {
    list: () => request<ClinicRoom[]>("/clinic/rooms"),
    create: (dto: { name: string; floor?: number }) =>
      request<ClinicRoom>("/clinic/rooms", {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    today: () => request<unknown>("/clinic/rooms/today"),
    addDoctor: (
      roomId: string,
      dto: { doctorId: string; days: number[]; startTime: string; endTime: string }
    ) =>
      request<RoomDoctorSchedule>(`/clinic/rooms/${roomId}/doctors`, {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    schedule: (roomId: string) =>
      request<RoomDoctorSchedule[]>(`/clinic/rooms/${roomId}/schedule`),
    forDoctor: (doctorId: string, date?: string) => {
      const q = date ? `?date=${encodeURIComponent(date)}` : "";
      return request<DoctorRoomSlot[]>(`/clinic/doctors/${doctorId}/rooms${q}`);
    },
  },

  services: {
    list: () => request<ClinicService[]>("/clinic/services"),
    create: (dto: { name: string; price: number; durationMinutes: number }) =>
      request<ClinicService>("/clinic/services", {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    update: (id: string, dto: Partial<Omit<ClinicService, "id" | "isActive">>) =>
      request<ClinicService>(`/clinic/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify(dto),
      }),
    deactivate: (id: string) =>
      request<void>(`/clinic/services/${id}`, { method: "DELETE" }),
  },

  appointments: {
    create: (dto: CreateAppointmentDto) =>
      request<Appointment>("/clinic/appointments", {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    list: (params?: { date?: string; doctorId?: string; status?: AppointmentStatus }) => {
      const qs = params
        ? "?" +
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
            .join("&")
        : "";
      return request<Appointment[]>(`/clinic/appointments${qs}`);
    },
    today: () => request<Appointment[]>("/clinic/appointments/today"),
    stats: (period: "day" | "week" | "month") =>
      request<AppointmentStats>(`/clinic/appointments/stats?period=${period}`),
    get: (id: string) => request<Appointment>(`/clinic/appointments/${id}`),
    checkin: (id: string) =>
      request<Appointment>(`/clinic/appointments/${id}/checkin`, {
        method: "PATCH",
      }),
    updateStatus: (id: string, status: AppointmentStatus) =>
      request<Appointment>(`/clinic/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    cancel: (id: string, reason?: string) =>
      request<Appointment>(`/clinic/appointments/${id}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }),
  },

  leads: {
    list: (params?: { status?: LeadStatus; page?: number; limit?: number }) => {
      const qs = params
        ? "?" +
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
            .join("&")
        : "";
      return request<{ data: Lead[]; total: number }>(`/clinic/leads${qs}`);
    },
    stats: () => request<LeadStats>("/clinic/leads/stats"),
    updateStatus: (id: string, status: LeadStatus) =>
      request<Lead>(`/clinic/leads/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    delete: (id: string) =>
      request<void>(`/clinic/leads/${id}`, { method: "DELETE" }),
  },

  stats: {
    overview: (period: "today" | "week" | "month" | "year") =>
      request<StatsOverview>(`/clinic/stats/overview?period=${period}`),
    monthly: () => request<MonthlyStats[]>("/clinic/stats/monthly"),
    doctors: () => request<DoctorStats[]>("/clinic/stats/doctors"),
  },

  patients: {
    getByPhone: (phone: string) =>
      request<PatientInfo>(`/clinic/patients/${encodeURIComponent(phone)}`),
  },
};
