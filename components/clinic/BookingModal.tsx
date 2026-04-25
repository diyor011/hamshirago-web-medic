"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { X, Search, User } from "lucide-react";
import { clinicApi, ClinicStaff, ClinicRoom, ClinicService, PaymentType, PatientInfo, DoctorRoomSlot, Appointment } from "@/lib/clinicApi";
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

const inputCls = "w-full px-3 py-2.5 rounded-xl border-[1.5px] border-[#e2e8f0] text-sm text-slate-900 outline-none font-[inherit] box-border";
const labelCls = "text-xs font-semibold text-slate-500 block mb-1.5";

export default function BookingModal({ open, onClose, onSuccess, prefillPhone }: Props) {
  const { t } = useTranslation();
  const [doctors, setDoctors] = useState<ClinicStaff[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [allRooms, setAllRooms] = useState<ClinicRoom[]>([]);

  // Patient lookup
  const [phone, setPhone] = useState("");
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientNotFound, setPatientNotFound] = useState(false);

  // Booking form
  const [doctorId, setDoctorId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [paymentType, setPaymentType] = useState<PaymentType>("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [roomSlots, setRoomSlots] = useState<DoctorRoomSlot[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // min time for time input — if today, don't allow past times
  const minTime = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (date !== today) return undefined;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }, [date]);

  // CLINIC-FE-2: SMS reminder indicator — today + within 3 hours
  const showSmsReminder = useMemo(() => {
    if (!date || !time) return false;
    const today = new Date().toISOString().slice(0, 10);
    if (date !== today) return false;
    const [hh, mm] = time.split(":").map(Number);
    const apptMs = new Date().setHours(hh, mm, 0, 0);
    const diffHours = (apptMs - Date.now()) / 3_600_000;
    return diffHours > 0 && diffHours <= 3;
  }, [date, time]);

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
      const [all, rooms] = await Promise.all([
        clinicApi.staff.list(),
        clinicApi.rooms.list(),
      ]);
      setDoctors(all.filter((s) => s.role === "DOCTOR" && s.isActive));
      setAllRooms(rooms);
    } catch { /* ignore */ }
    finally { setLoadingDoctors(false); }
  }, []);

  useEffect(() => { if (open) loadDoctors(); }, [open, loadDoctors]);

  useEffect(() => {
    if (open) {
      setPhone(prefillPhone ?? ""); setPatient(null); setPatientName(""); setPatientNotFound(false);
      setDoctorId(""); setRoomId(""); setServiceId(""); setServices([]); setPaymentType("CASH"); setError("");
      setDate(new Date().toISOString().slice(0, 10)); setTime("09:00");
    }
  }, [open, prefillPhone]);

  async function searchPatient() {
    if (!phone.trim()) return;
    setSearchingPatient(true); setPatient(null); setPatientNotFound(false); setPatientName("");
    try {
      const p = await clinicApi.patients.getByPhone(phone.trim());
      setPatient(p);
      setPatientName(p.name ?? "");
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

    // Нельзя записать на прошедшее время
    const todayISO = new Date().toISOString().slice(0, 10);
    if (date === todayISO) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const [hh, mm] = time.split(":").map(Number);
      if (hh * 60 + mm <= nowMins) {
        setError("Нельзя записать на прошедшее время");
        return;
      }
    }

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
        } catch {
          onSuccess();
        }
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
    <div
      className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-7 w-full max-w-[520px] shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-slate-900 m-0">
            {t("clinic.booking.title")}
          </h2>
          <button
            onClick={onClose}
            className="bg-slate-100 border-none rounded-lg p-2 cursor-pointer text-slate-500 flex items-center"
          >
            <X size={16} />
          </button>
        </div>

        {/* Phone search */}
        <div className="mb-[18px]">
          <label className={labelCls}>{t("clinic.booking.patientPhone")} *</label>
          <div className="flex gap-2">
            <input
              className={`${inputCls} flex-1`}
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPatient(null); setPatientNotFound(false); }}
              placeholder="+998901234567"
              onKeyDown={(e) => e.key === "Enter" && searchPatient()}
            />
            <button
              onClick={searchPatient}
              disabled={searchingPatient}
              className={`px-3.5 py-2.5 rounded-xl bg-teal-50 border border-teal-100 cursor-pointer text-teal-600 flex items-center gap-1.5 text-xs font-semibold transition-opacity ${searchingPatient ? "opacity-60" : ""}`}
            >
              <Search size={14} />
              {searchingPatient ? t("clinic.booking.finding") : t("clinic.booking.find")}
            </button>
          </div>

          {/* Patient found */}
          {patient && (
            <div className="mt-2.5 px-3.5 py-2.5 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2.5">
              <User size={16} className="text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-800 m-0">{patient.name ?? t("clinic.booking.noName")}</p>
                <p className="text-xs text-green-400 m-0">{patient.appointments.length} {t("clinic.booking.visits")}</p>
              </div>
            </div>
          )}

          {/* Patient not found */}
          {patientNotFound && (
            <div className="mt-2.5">
              <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 mb-2">
                <p className="text-xs text-amber-800 m-0">{t("clinic.booking.patientNotFoundMsg")}</p>
              </div>
              <input
                className={inputCls}
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder={t("clinic.booking.patientNamePlaceholder")}
              />
            </div>
          )}
        </div>

        {/* Doctor */}
        <div className="mb-3.5">
          <label className={labelCls}>{t("clinic.booking.doctor")} *</label>
          <select
            className={`${inputCls} bg-white`}
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            disabled={loadingDoctors}
          >
            <option value="">
              {loadingDoctors ? t("clinic.booking.loadingDoctors") : t("clinic.booking.selectDoctor")}
            </option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.specialization ? ` — ${d.specialization}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Service */}
        {doctorId && (
          <div className="mb-3.5">
            <label className={labelCls}>Услуга</label>
            {loadingServices ? (
              <div className={`${inputCls} text-slate-400 flex items-center`}>Загрузка услуг…</div>
            ) : (
              <select
                className={`${inputCls} bg-white`}
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">— Выберите услугу (необязательно)</option>
                {services.map((s) => {
                  const priceText = s.priceMin != null && s.priceMax != null
                    ? `${s.priceMin.toLocaleString("ru-RU")} – ${s.priceMax.toLocaleString("ru-RU")} сум`
                    : `${s.price.toLocaleString("ru-RU")} сум`;
                  return (
                    <option key={s.id} value={s.id}>{s.name} · {priceText}</option>
                  );
                })}
              </select>
            )}
          </div>
        )}

        {/* Room */}
        {doctorId && (
          <div className="mb-3.5">
            <label className={labelCls}>{t("clinic.booking.room")} *</label>
            {loadingRooms ? (
              <div className={`${inputCls} text-slate-400 flex items-center`}>
                {t("clinic.booking.loadingSchedule")}
              </div>
            ) : roomSlots.length > 0 ? (
              <select
                className={`${inputCls} bg-white`}
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
              <>
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-1.5">
                  {t("clinic.booking.noSchedule")}
                </div>
                <select
                  className={`${inputCls} bg-white`}
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                >
                  <option value="">{t("clinic.booking.selectRoom")}</option>
                  {allRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}{r.floor != null ? ` (${r.floor} ${t("clinic.booking.floor")})` : ""}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="w-full px-3 py-2.5 rounded-xl bg-red-50 border-[1.5px] border-red-200 text-sm text-red-500 flex items-center">
                {t("clinic.booking.noRooms")}
              </div>
            )}
          </div>
        )}

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <label className={labelCls}>{t("clinic.booking.date")} *</label>
            <input
              type="date"
              className={inputCls}
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>{t("clinic.booking.time")} *</label>
            <input
              type="time"
              className={inputCls}
              value={time}
              min={minTime}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* CLINIC-FE-2: SMS reminder indicator */}
        {showSmsReminder && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-300 rounded-xl px-3.5 py-2 mb-3.5">
            <span className="text-base">📱</span>
            <div>
              <p className="text-xs font-bold text-green-700 m-0">SMS-напоминание</p>
              <p className="text-[11px] text-green-800 m-0">Пациент получит напоминание за 1 час до приёма</p>
            </div>
          </div>
        )}

        {/* Payment */}
        <div className="mb-5">
          <label className={labelCls}>{t("clinic.booking.paymentType")} *</label>
          <div className="flex gap-2">
            {PAYMENT_KEYS.map(({ value, labelKey }) => {
              const active = paymentType === value;
              return (
                <button
                  key={value}
                  onClick={() => setPaymentType(value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer border-[1.5px] transition-colors ${
                    active
                      ? "border-teal-600 bg-teal-50 text-teal-600"
                      : "border-[#e2e8f0] bg-white text-slate-500"
                  }`}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mb-3.5">{error}</p>}

        {/* Submit */}
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`flex-1 bg-gradient-to-br from-teal-600 to-teal-700 text-white border-none rounded-xl py-3 text-sm font-bold transition-opacity ${submitting ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {submitting ? t("clinic.booking.submitting") : t("clinic.booking.submit")}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 border-none rounded-xl py-3 text-sm cursor-pointer text-slate-500 font-semibold"
          >
            {t("clinic.common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
