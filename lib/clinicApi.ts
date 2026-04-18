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
    const role = payload.clinicRole ?? payload.role ?? null;
    if (role === "CEO" || role === "RECEPTION" || role === "DOCTOR") {
      return role;
    }
    return null;
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

  if (res.status === 401 && !path.startsWith("/clinic-auth/")) {
    clearClinicSession();
    window.location.replace("/auth");
    return new Promise<T>(() => {});
  }

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: "Ошибка сервера" }));
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

export type ClinicRole = "CEO" | "RECEPTION" | "DOCTOR";

export interface ClinicAuthResponse {
  token: string;
  access_token?: string;
  user: {
    id: string;
    name: string;
    role: ClinicRole;
    companyId: string;
  };
}

export interface ClinicMeResponse {
  user: ClinicAuthResponse["user"];
  company: ClinicCompany;
}

export interface ClinicCompany {
  id: string;
  name: string;
  phone?: string;
  address?: string | null;
  city?: string | null;
  logoUrl?: string | null;
  isVerified?: boolean;
  isActive?: boolean;
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
  dayOfWeek?: number;
  days?: number[];
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
  category: string;
  price: number;
  durationMinutes: number | null;
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
  doctorId: string | null;
  roomId: string | null;
  date: string;
  time: string;
  paymentType: PaymentType | null;
  status: AppointmentStatus;
  cancelReason?: string | null;
  createdAt: string;
  priceMin?: number | null;
  priceMax?: number | null;
  finalPrice?: number | null;
  serviceTitle?: string | null;
}

export interface CreateAppointmentDto {
  patientPhone: string;
  patientName: string;
  doctorId?: string;
  roomId?: string;
  date: string;
  time: string;
  paymentType?: PaymentType;
}

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "BOOKED"
  | "VISITED"
  | "MISSED"
  | "IN_PROGRESS"
  | "DONE"
  | "CANCELED";

export interface Lead {
  id: string;
  patientName: string;
  patientPhone: string;
  name: string;
  phone: string;
  status: LeadStatus;
  aiSummary?: string | null;
  notes?: string | null;
  specialization?: string | null;
  createdAt: string;
}

export interface LeadStats {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  conversionRate: number;
  totalCommission: number;
  new: number;
  inProgress: number;
  done: number;
  canceled: number;
}

export interface AppointmentStats {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byDoctor: Array<{ doctorId: string; count: number }>;
  period: string;
  startDate: string;
}

export interface StatsOverview {
  totalPatients: number;
  appointmentsByStatus: Array<{ status: string; count: number }>;
  activeLeads: number;
  leadsByStatus: Array<{ status: string; count: number }>;
  conversionRate: number;
  commission: number;
  period: string;
  startDate: string;
  newPatients: number;
  appointments: number;
  revenue: number;
  cancelRate: number;
}

export interface MonthlyStats {
  month: string;
  patientCount: number;
  appointments: number;
  revenue: number;
}

export interface DoctorStats {
  doctorId: string;
  name: string;
  patientCount: number;
  doctorName: string;
  appointments: number;
  revenue: number;
}

export interface PatientInfo {
  patient: { id: string; phone: string; name: string } | null;
  visits: Appointment[];
  name: string;
  appointments: Appointment[];
}

function normalizeAppointmentStatus(status: string | undefined | null): AppointmentStatus {
  if (status === "CANCELLED" || status === "CANCELED") return "CANCELED";
  if (status === "NO_SHOW") return "NO_SHOW";
  if (status === "SCHEDULED") return "SCHEDULED";
  if (status === "CHECKED_IN") return "CHECKED_IN";
  if (status === "IN_PROGRESS") return "IN_PROGRESS";
  if (status === "DONE") return "DONE";
  return "SCHEDULED";
}

function toBackendAppointmentStatus(
  status: AppointmentStatus,
): "CHECKED_IN" | "IN_PROGRESS" | "DONE" | "CANCELLED" {
  if (status === "CANCELED" || status === "NO_SHOW") return "CANCELLED";
  if (status === "CHECKED_IN" || status === "IN_PROGRESS" || status === "DONE") return status;
  return "CHECKED_IN";
}

function leadBackendToUiStatus(status: string | undefined | null): LeadStatus {
  if (status === "NEW") return "NEW";
  if (status === "CONTACTED" || status === "BOOKED" || status === "IN_PROGRESS") return "IN_PROGRESS";
  if (status === "VISITED" || status === "DONE") return "DONE";
  if (status === "MISSED" || status === "CANCELED") return "CANCELED";
  return "NEW";
}

function leadUiToBackendStatus(
  status: LeadStatus,
): "NEW" | "CONTACTED" | "BOOKED" | "VISITED" | "MISSED" {
  if (status === "NEW") return "NEW";
  if (status === "CONTACTED" || status === "BOOKED" || status === "IN_PROGRESS") return "CONTACTED";
  if (status === "VISITED" || status === "DONE") return "VISITED";
  if (status === "MISSED" || status === "CANCELED") return "MISSED";
  return "NEW";
}

function normalizeAppointment(raw: Appointment): Appointment {
  return {
    ...raw,
    status: normalizeAppointmentStatus(raw.status),
  };
}

function normalizeLead(raw: {
  id: string;
  patientName?: string;
  patientPhone?: string;
  name?: string;
  phone?: string;
  status?: string;
  aiSummary?: string | null;
  notes?: string | null;
  specialization?: string | null;
  createdAt: string;
}): Lead {
  const name = raw.patientName ?? raw.name ?? "";
  const phone = raw.patientPhone ?? raw.phone ?? "";
  const notes = raw.aiSummary ?? raw.notes ?? null;
  return {
    id: raw.id,
    patientName: name,
    patientPhone: phone,
    name,
    phone,
    status: leadBackendToUiStatus(raw.status),
    aiSummary: raw.aiSummary ?? notes,
    notes,
    specialization: raw.specialization ?? null,
    createdAt: raw.createdAt,
  };
}

function normalizeLeadStats(raw: {
  total: number;
  byStatus: Array<{ status: string; count: number | string }>;
  conversionRate: number;
  totalCommission: number;
}): LeadStats {
  const map = new Map((raw.byStatus ?? []).map((s) => [s.status, Number(s.count) || 0]));
  const inProgress = (map.get("CONTACTED") ?? 0) + (map.get("BOOKED") ?? 0);
  return {
    total: Number(raw.total) || 0,
    byStatus: (raw.byStatus ?? []).map((s) => ({ status: s.status, count: Number(s.count) || 0 })),
    conversionRate: Number(raw.conversionRate) || 0,
    totalCommission: Number(raw.totalCommission) || 0,
    new: map.get("NEW") ?? 0,
    inProgress,
    done: map.get("VISITED") ?? 0,
    canceled: map.get("MISSED") ?? 0,
  };
}

function normalizeOverview(raw: {
  totalPatients: number;
  appointmentsByStatus: Array<{ status: string; count: number | string }>;
  activeLeads: number;
  leadsByStatus: Array<{ status: string; count: number | string }>;
  conversionRate: number;
  commission: number;
  period: string;
  startDate: string;
}): StatsOverview {
  const appointmentsByStatus = (raw.appointmentsByStatus ?? []).map((s) => ({
    status: s.status,
    count: Number(s.count) || 0,
  }));
  const appointments = appointmentsByStatus.reduce((acc, s) => acc + s.count, 0);
  const canceled = appointmentsByStatus
    .filter((s) => s.status === "CANCELLED")
    .reduce((acc, s) => acc + s.count, 0);

  return {
    totalPatients: Number(raw.totalPatients) || 0,
    appointmentsByStatus,
    activeLeads: Number(raw.activeLeads) || 0,
    leadsByStatus: (raw.leadsByStatus ?? []).map((s) => ({ status: s.status, count: Number(s.count) || 0 })),
    conversionRate: Number(raw.conversionRate) || 0,
    commission: Number(raw.commission) || 0,
    period: raw.period,
    startDate: raw.startDate,
    newPatients: Number(raw.totalPatients) || 0,
    appointments,
    revenue: Number(raw.commission) || 0,
    cancelRate: appointments > 0 ? Math.round((canceled / appointments) * 100) : 0,
  };
}

function normalizeMonthly(
  rows: Array<{ month: string; patientCount: number | string }>,
): MonthlyStats[] {
  return (rows ?? []).map((r) => {
    const patientCount = Number(r.patientCount) || 0;
    return {
      month: r.month,
      patientCount,
      appointments: patientCount,
      revenue: 0,
    };
  });
}

function normalizeDoctorStats(
  rows: Array<{ doctorId: string; name: string; patientCount: number | string }>,
): DoctorStats[] {
  return (rows ?? []).map((r) => {
    const appointments = Number(r.patientCount) || 0;
    return {
      doctorId: r.doctorId,
      name: r.name,
      patientCount: appointments,
      doctorName: r.name,
      appointments,
      revenue: 0,
    };
  });
}

export const clinicApi = {
  auth: {
    login: (phone: string, password: string) =>
      request<ClinicAuthResponse>("/clinic-auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      }),
    me: () => request<ClinicMeResponse>("/clinic-auth/me"),
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
    deactivate: (id: string) => request<void>(`/clinic/staff/${id}`, { method: "DELETE" }),
  },

  rooms: {
    list: () => request<ClinicRoom[]>("/clinic/rooms"),
    create: (dto: { name: string; floor?: string | number }) =>
      request<ClinicRoom>("/clinic/rooms", {
        method: "POST",
        body: JSON.stringify({
          ...dto,
          ...(dto.floor !== undefined ? { floor: String(dto.floor) } : {}),
        }),
      }),
    today: () => request<unknown>("/clinic/rooms/today"),
    addDoctor: (
      roomId: string,
      dto: { doctorId: string; dayOfWeek?: number; days?: number[]; startTime: string; endTime: string },
    ) => {
      const days = Array.isArray(dto.days) && dto.days.length > 0
        ? dto.days
        : dto.dayOfWeek != null
          ? [dto.dayOfWeek]
          : [];
      const uniqueDays = Array.from(new Set(days)).filter((d) => d >= 1 && d <= 7);
      if (uniqueDays.length === 0) {
        return Promise.reject(new Error("Выберите хотя бы один день"));
      }
      return Promise.all(
        uniqueDays.map((dayOfWeek) =>
          request<RoomDoctorSchedule>(`/clinic/rooms/${roomId}/doctors`, {
            method: "POST",
            body: JSON.stringify({
              doctorId: dto.doctorId,
              dayOfWeek,
              startTime: dto.startTime,
              endTime: dto.endTime,
            }),
          }),
        ),
      ).then((items) => ({
        ...items[0],
        days: uniqueDays,
      }));
    },
    schedule: (roomId: string) =>
      request<{ room: unknown; schedule: RoomDoctorSchedule[] }>(`/clinic/rooms/${roomId}/schedule`).then((res) => {
        const grouped = new Map<string, RoomDoctorSchedule>();
        for (const s of res.schedule) {
          const key = `${s.doctorId}:${s.startTime}:${s.endTime}`;
          const existing = grouped.get(key);
          if (existing) {
            existing.days = Array.from(new Set([...(existing.days ?? []), s.dayOfWeek ?? 0])).filter((d) => d > 0);
          } else {
            grouped.set(key, {
              ...s,
              days: s.dayOfWeek != null ? [s.dayOfWeek] : [],
            });
          }
        }
        return Array.from(grouped.values());
      }),
    forDoctor: (doctorId: string, date?: string) => {
      const q = date ? `?date=${encodeURIComponent(date)}` : "";
      return request<DoctorRoomSlot[]>(`/clinic/doctors/${doctorId}/rooms${q}`);
    },
  },

  services: {
    list: () => request<ClinicService[]>("/clinic/services"),
    create: (dto: { name: string; price: number; durationMinutes: number; category?: string }) =>
      request<ClinicService>("/clinic/services", {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    update: (id: string, dto: Partial<Omit<ClinicService, "id" | "isActive">>) =>
      request<ClinicService>(`/clinic/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify(dto),
      }),
    deactivate: (id: string) => request<void>(`/clinic/services/${id}`, { method: "DELETE" }),
  },

  appointments: {
    create: (dto: CreateAppointmentDto) =>
      request<Appointment>("/clinic/appointments", {
        method: "POST",
        body: JSON.stringify(dto),
      }).then(normalizeAppointment),
    list: (params?: { date?: string; doctorId?: string; status?: AppointmentStatus; startDate?: string; endDate?: string }) => {
      const backendStatus = params?.status != null ? toBackendAppointmentStatus(params.status) : undefined;
      const qs = params
        ? "?" +
          Object.entries(params)
            .map(([k, v]) => (k === "status" ? [k, backendStatus] as const : [k, v] as const))
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
            .join("&")
        : "";
      return request<Appointment[]>(`/clinic/appointments${qs}`).then((items) => items.map(normalizeAppointment));
    },
    today: () => request<Appointment[]>("/clinic/appointments/today").then((items) => items.map(normalizeAppointment)),
    stats: (period: "day" | "week" | "month") =>
      request<AppointmentStats>(`/clinic/appointments/stats?period=${period}`),
    get: (id: string) => request<Appointment>(`/clinic/appointments/${id}`).then(normalizeAppointment),
    checkin: (id: string) =>
      request<Appointment>(`/clinic/appointments/${id}/checkin`, {
        method: "PATCH",
      }).then(normalizeAppointment),
    updateStatus: (id: string, status: AppointmentStatus) =>
      request<Appointment>(`/clinic/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: toBackendAppointmentStatus(status) }),
      }).then(normalizeAppointment),
    cancel: (id: string, reason?: string) =>
      request<Appointment>(`/clinic/appointments/${id}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }).then(normalizeAppointment),
    setFinalPrice: (id: string, finalPrice: number) =>
      request<Appointment>(`/clinic/appointments/${id}/final-price`, {
        method: "PATCH",
        body: JSON.stringify({ finalPrice }),
      }).then(normalizeAppointment),
  },

  leads: {
    list: (params?: { status?: LeadStatus; page?: number; limit?: number }) => {
      const backendStatus = params?.status != null ? leadUiToBackendStatus(params.status) : undefined;
      const qs = params
        ? "?" +
          Object.entries(params)
            .map(([k, v]) => (k === "status" ? [k, backendStatus] as const : [k, v] as const))
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
            .join("&")
        : "";
      return request<{ data: Lead[]; total: number }>(`/clinic/leads${qs}`).then((res) => ({
        ...res,
        data: (res.data ?? []).map(normalizeLead),
      }));
    },
    stats: () =>
      request<{
        total: number;
        byStatus: Array<{ status: string; count: number | string }>;
        conversionRate: number;
        totalCommission: number;
      }>("/clinic/leads/stats").then(normalizeLeadStats),
    updateStatus: (id: string, status: LeadStatus) =>
      request<Lead>(`/clinic/leads/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: leadUiToBackendStatus(status) }),
      }).then(normalizeLead),
    delete: (id: string) => request<void>(`/clinic/leads/${id}`, { method: "DELETE" }),
  },

  stats: {
    overview: (period: "today" | "week" | "month" | "year") =>
      request<{
        totalPatients: number;
        appointmentsByStatus: Array<{ status: string; count: number | string }>;
        activeLeads: number;
        leadsByStatus: Array<{ status: string; count: number | string }>;
        conversionRate: number;
        commission: number;
        period: string;
        startDate: string;
      }>(`/clinic/stats/overview?period=${period}`).then(normalizeOverview),
    monthly: () =>
      request<Array<{ month: string; patientCount: number | string }>>("/clinic/stats/monthly").then(normalizeMonthly),
    doctors: () =>
      request<Array<{ doctorId: string; name: string; patientCount: number | string }>>("/clinic/stats/doctors").then(normalizeDoctorStats),
    rooms: () =>
      request<Array<{ roomId: string; name: string; floor: number | null; todayAppointments: number }>>("/clinic/stats/rooms"),
    services: () =>
      request<Array<{ serviceId: string; serviceName: string; count: number }>>("/clinic/stats/services"),
  },

  patients: {
    getByPhone: (phone: string) =>
      request<{ patient: { id: string; phone: string; name: string } | null; visits: Appointment[] }>(
        `/clinic/patients/${encodeURIComponent(phone)}`,
      ).then((res) => ({
        patient: res.patient,
        visits: (res.visits ?? []).map(normalizeAppointment),
        name: res.patient?.name ?? "",
        appointments: (res.visits ?? []).map(normalizeAppointment),
      })),
  },
};
