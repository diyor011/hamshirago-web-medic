"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { X, Search, User } from "lucide-react";
import {
  clinicApi, ClinicStaff, ClinicRoom, ClinicService,
  PaymentType, PatientInfo, DoctorRoomSlot, Appointment,
} from "@/lib/clinicApi";
import { useTranslation } from "react-i18next";
import "@/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillPhone?: string;
}

const PAYMENT_KEYS: { value: PaymentType; labelKey: string }[] = [
  { value: "CASH",     labelKey: "clinic.reception.paymentLabels.CASH" },
  { value: "TERMINAL", labelKey: "clinic.reception.paymentLabels.TERMINAL" },
  { value: "ONLINE",   labelKey: "clinic.reception.paymentLabels.ONLINE" },
];

function getNowTime(): string {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BookingModal({ open, onClose, onSuccess, prefillPhone }: Props) {
  const { t } = useTranslation();

  const [doctors, setDoctors] = useState<ClinicStaff[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [allRooms, setAllRooms] = useState<ClinicRoom[]>([]);

  const [phone, setPhone] = useState("");
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientNotFound, setPatientNotFound] = useState(false);

  const [doctorId, setDoctorId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [date, setDate] = useState(() => getTodayISO());
  const [time, setTime] = useState(() => getNowTime());
  const [paymentType, setPaymentType] = useState<PaymentType>("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [roomSlots, setRoomSlots] = useState<DoctorRoomSlot[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const minTime = useMemo(() => {
    if (date !== getTodayISO()) return undefined;
    return getNowTime();
  }, [date]);

  const isTimePast = useMemo(() => {
    if (!minTime || !time) return false;
    return time < minTime;
  }, [time, minTime]);

  const showSmsReminder = useMemo(() => {
    if (!date || !time || date !== getTodayISO()) return false;
    const [hh, mm] = time.split(":").map(Number);
    const diffH = (new Date().setHours(hh, mm, 0, 0) - Date.now()) / 3_600_000;
    return diffH > 0 && diffH <= 3;
  }, [date, time]);

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTime(minTime && val < minTime ? minTime : val);
  }

  useEffect(() => {
    if (!open) return;
    setPhone(prefillPhone ?? "");
    setPatient(null); setPatientName(""); setPatientNotFound(false);
    setDoctorId(""); setRoomId(""); setServiceId(""); setServices([]);
    setPaymentType("CASH"); setError("");
    setDate(getTodayISO());
    setTime(getNowTime());
  }, [open, prefillPhone]);

  useEffect(() => {
    if (!doctorId) { setServices([]); setServiceId(""); return; }
    let cancelled = false;
    setLoadingServices(true);
    clinicApi.services.list(doctorId)
      .then(async (byDoctor) => {
        if (cancelled) return;
        if (byDoctor.length > 0) {
          setServices(byDoctor.filter((s) => s.isActive));
        } else {
          const all = await clinicApi.services.list();
          if (!cancelled) setServices(all.filter((s) => s.isActive && !s.doctorId));
        }
        setServiceId("");
      })
      .catch(() => { if (!cancelled) setServices([]); })
      .finally(() => { if (!cancelled) setLoadingServices(false); });
    return () => { cancelled = true; };
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId || !date) { setRoomSlots([]); setRoomId(""); return; }
    let cancelled = false;
    setLoadingRooms(true);
    clinicApi.rooms.forDoctor(doctorId, date)
      .then((slots) => {
        if (cancelled) return;
        setRoomSlots(slots);
        if (slots.length === 1) setRoomId(slots[0].roomId);
        else setRoomId("");
      })
      .catch(() => { if (!cancelled) setRoomSlots([]); })
      .finally(() => { if (!cancelled) setLoadingRooms(false); });
    return () => { cancelled = true; };
  }, [doctorId, date]);

  const loadDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    try {
      const [all, rooms] = await Promise.all([clinicApi.staff.list(), clinicApi.rooms.list()]);
      setDoctors(all.filter((s) => s.role === "DOCTOR" && s.isActive));
      setAllRooms(rooms);
    } catch { /* ignore */ }
    finally { setLoadingDoctors(false); }
  }, []);

  useEffect(() => { if (open) loadDoctors(); }, [open, loadDoctors]);

  async function searchPatient() {
    if (!phone.trim()) return;
    setSearchingPatient(true); setPatient(null); setPatientNotFound(false); setPatientName("");
    try {
      const p = await clinicApi.patients.getByPhone(phone.trim());
      setPatient(p); setPatientName(p.name ?? "");
    } catch {
      setPatientNotFound(true);
    } finally {
      setSearchingPatient(false);
    }
  }

  async function handleSubmit() {
    if (!phone.trim()) { setError(t("clinic.booking.errorPhone")); return; }
    if (!doctorId)     { setError(t("clinic.booking.errorDoctor")); return; }
    if (!date)         { setError(t("clinic.booking.errorDate")); return; }
    if (!time)         { setError(t("clinic.booking.errorTime")); return; }
    if (!roomId)       { setError(t("clinic.booking.errorRoom")); return; }
    if (isTimePast)    { setError("Нельзя записать на прошедшее время"); return; }

    const slot = roomSlots.find((s) => s.roomId === roomId);
    if (slot && (time < slot.startTime || time > slot.endTime)) {
      setError(t("clinic.booking.errorTimeRange", { start: slot.startTime, end: slot.endTime }));
      return;
    }

    setSubmitting(true); setError("");
    try {
      const resolvedName = patientName.trim() || (patient?.name ?? "") || phone.trim();
      const appointment: Appointment = await clinicApi.appointments.create({
        patientPhone: phone.trim(),
        patientName: resolvedName,
        doctorId: doctorId || undefined,
        roomId: roomId || undefined,
        serviceId: serviceId || undefined,
        date, time, paymentType,
      });

      if (paymentType === "ONLINE") {
        try {
          const { paymentUrl } = await clinicApi.payments.initiateClinic(appointment.id);
          window.location.href = paymentUrl;
        } catch { onSuccess(); }
      } else {
        onSuccess();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("clinic.booking.errorCreate"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal modal-open" onClick={onClose}>
      <div
        className="modal-box w-full max-w-lg p-0 overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-900">
            {t("clinic.booking.title")}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 border-0 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-130px)] flex flex-col gap-4">

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              {t("clinic.booking.patientPhone")} *
            </label>
            <div className="flex gap-2">
              <input
                className="input input-bordered flex-1 input-sm h-10 text-sm rounded-xl focus:border-teal-500 focus:outline-none"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPatient(null); setPatientNotFound(false); }}
                placeholder="+998901234567"
                onKeyDown={(e) => e.key === "Enter" && searchPatient()}
              />
              <button
                onClick={searchPatient}
                disabled={searchingPatient}
                className="btn btn-sm h-10 rounded-xl bg-teal-50 border-teal-200 text-teal-600 hover:bg-teal-100 hover:border-teal-300 font-bold text-xs gap-1.5 normal-case disabled:opacity-60"
              >
                <Search size={13} />
                {searchingPatient ? t("clinic.booking.finding") : t("clinic.booking.find")}
              </button>
            </div>

            {patient && (
              <div className="mt-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-green-50 border border-green-200">
                <User size={15} className="text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-800 leading-none">{patient.name ?? t("clinic.booking.noName")}</p>
                  <p className="text-xs text-green-500 mt-0.5">{patient.appointments.length} {t("clinic.booking.visits")}</p>
                </div>
              </div>
            )}

            {patientNotFound && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  {t("clinic.booking.patientNotFoundMsg")}
                </div>
                <input
                  className="input input-bordered w-full input-sm h-10 text-sm rounded-xl focus:border-teal-500 focus:outline-none"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder={t("clinic.booking.patientNamePlaceholder")}
                />
              </div>
            )}
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              {t("clinic.booking.doctor")} *
            </label>
            <select
              className="select select-bordered w-full select-sm h-10 text-sm rounded-xl focus:border-teal-500 focus:outline-none"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              disabled={loadingDoctors}
            >
              <option value="">{loadingDoctors ? t("clinic.booking.loadingDoctors") : t("clinic.booking.selectDoctor")}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}{d.specialization ? ` — ${d.specialization}` : ""}</option>
              ))}
            </select>
          </div>

          {/* Service */}
          {doctorId && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Услуга</label>
              {loadingServices ? (
                <div className="h-10 flex items-center px-3 text-sm text-slate-400 rounded-xl border border-slate-200 bg-slate-50">
                  Загрузка услуг…
                </div>
              ) : (
                <select
                  className="select select-bordered w-full select-sm h-10 text-sm rounded-xl focus:border-teal-500 focus:outline-none"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  <option value="">— Выберите услугу (необязательно)</option>
                  {services.map((s) => {
                    const price = s.priceMin != null && s.priceMax != null
                      ? `${s.priceMin.toLocaleString("ru-RU")} – ${s.priceMax.toLocaleString("ru-RU")} сум`
                      : `${s.price.toLocaleString("ru-RU")} сум`;
                    return <option key={s.id} value={s.id}>{s.name} · {price}</option>;
                  })}
                </select>
              )}
            </div>
          )}

          {/* Room */}
          {doctorId && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                {t("clinic.booking.room")} *
              </label>
              {loadingRooms ? (
                <div className="h-10 flex items-center px-3 text-sm text-slate-400 rounded-xl border border-slate-200 bg-slate-50">
                  {t("clinic.booking.loadingSchedule")}
                </div>
              ) : roomSlots.length > 0 ? (
                <select
                  className="select select-bordered w-full select-sm h-10 text-sm rounded-xl focus:border-teal-500 focus:outline-none"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                >
                  <option value="">{t("clinic.booking.selectRoom")}</option>
                  {roomSlots.map((s) => (
                    <option key={`${s.roomId}-${s.startTime}`} value={s.roomId}>
                      {s.roomName}{s.floor != null ? ` (${s.floor} ${t("clinic.booking.floor")})` : ""} · {s.startTime}–{s.endTime}
                    </option>
                  ))}
                </select>
              ) : allRooms.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    {t("clinic.booking.noSchedule")}
                  </div>
                  <select
                    className="select select-bordered w-full select-sm h-10 text-sm rounded-xl focus:border-teal-500 focus:outline-none"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                  >
                    <option value="">{t("clinic.booking.selectRoom")}</option>
                    {allRooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}{r.floor != null ? ` (${r.floor} ${t("clinic.booking.floor")})` : ""}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="h-10 flex items-center px-3 text-sm text-red-500 rounded-xl border border-red-200 bg-red-50">
                  {t("clinic.booking.noRooms")}
                </div>
              )}
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                {t("clinic.booking.date")} *
              </label>
              <input
                type="date"
                className="input input-bordered w-full input-sm h-10 text-sm rounded-xl focus:border-teal-500 focus:outline-none"
                value={date}
                min={getTodayISO()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                {t("clinic.booking.time")} *
              </label>
              <input
                type="time"
                className={`input input-bordered w-full input-sm h-10 text-sm rounded-xl focus:outline-none ${
                  isTimePast
                    ? "border-red-400 bg-red-50 text-red-600 focus:border-red-500"
                    : "focus:border-teal-500"
                }`}
                value={time}
                min={minTime}
                onChange={handleTimeChange}
              />
              {isTimePast && (
                <p className="text-xs text-red-500 mt-1">Минимум {minTime}</p>
              )}
            </div>
          </div>

          {/* SMS reminder */}
          {showSmsReminder && !isTimePast && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-green-50 border border-green-200">
              <span className="text-base">📱</span>
              <div>
                <p className="text-xs font-bold text-green-700 leading-none">SMS-напоминание</p>
                <p className="text-xs text-green-600 mt-0.5">Пациент получит напоминание за 1 час до приёма</p>
              </div>
            </div>
          )}

          {/* Payment */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              {t("clinic.booking.paymentType")} *
            </label>
            <div className="flex gap-2">
              {PAYMENT_KEYS.map(({ value, labelKey }) => {
                const active = paymentType === value;
                return (
                  <button
                    key={value}
                    onClick={() => setPaymentType(value)}
                    className={`flex-1 h-10 rounded-xl font-bold text-sm normal-case border-[1.5px] cursor-pointer transition-all ${
                      active
                        ? "bg-teal-50 border-teal-500 text-teal-600"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={submitting || isTimePast}
            className="flex-1 h-11 rounded-xl font-bold text-sm text-white bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 border-0 cursor-pointer transition-all disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {submitting ? t("clinic.booking.submitting") : t("clinic.booking.submit")}
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl font-semibold text-sm bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 cursor-pointer transition-colors border-[1px]"
          >
            {t("clinic.common.cancel")}
          </button>
        </div>
      </div>

      <div className="modal-backdrop bg-slate-900/50" onClick={onClose} />
    </div>
  );
}
