"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { X, Search, User, Phone, Calendar, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  clinicApi, ClinicStaff, ClinicRoom, ClinicService,
  DoctorRoomSlot, Appointment,
  PatientSearchResult,
} from "@/lib/clinicApi";
import { useTranslation } from "react-i18next";
import "@/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillPhone?: string;
  prefillDate?: string;
  prefillTime?: string;
  prefillDoctorId?: string;
  prefillRoomId?: string;
}

const INPUT_CLS = "w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all";
const SELECT_CLS = "w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all cursor-pointer";

function getNowTime() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
function getTodayISO() { return new Date().toISOString().slice(0, 10); }
function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}
function fmtLastVisit(iso: string | null) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return ""; }
}

// ─── Dropdown ────────────────────────────────────────────────────────────────

function PatientDropdown({
  results, loading, query, onSelect, onNewPatient,
}: {
  results: PatientSearchResult[];
  loading: boolean;
  query: string;
  onSelect: (p: PatientSearchResult) => void;
  onNewPatient: () => void;
}) {
  if (!query || query.length < 2) return null;

  return (
    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3.5 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin text-teal-500" /> Поиск…
        </div>
      ) : results.length === 0 ? (
        <div className="px-4 py-3.5">
          <p className="text-sm text-slate-400 mb-2">Пациент не найден по «{query}»</p>
          <button onMouseDown={onNewPatient}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors cursor-pointer">
            <User size={14} /> Заполнить вручную
          </button>
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto">
          {results.map((p) => (
            <button key={p.id ?? p.phone} onMouseDown={() => onSelect(p)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 border-b border-slate-100 last:border-b-0 transition-colors cursor-pointer text-left group">
              <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-extrabold shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                {getInitials(p.name) || <User size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 truncate">{p.name}</span>
                  {p.allergies && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200 shrink-0">
                      <AlertCircle size={9} /> Аллергия
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10} /> {p.phone}</span>
                  {p.lastVisit && <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={10} /> {fmtLastVisit(p.lastVisit)}</span>}
                </div>
              </div>
              <span className="text-xs text-teal-500 font-semibold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Выбрать →</span>
            </button>
          ))}
          <button onMouseDown={onNewPatient}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 text-xs font-semibold transition-colors cursor-pointer border-t border-slate-100">
            <User size={12} /> Добавить нового пациента вручную
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BookingModal({ open, onClose, onSuccess, prefillPhone, prefillDate, prefillTime, prefillDoctorId, prefillRoomId }: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // ── Native dialog open/close
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) { if (!el.open) el.showModal(); }
    else { if (el.open) el.close(); }
  }, [open]);

  // ── ESC → onClose
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [onClose]);

  // ── Patient smart search state
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown]   = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Form fields
  const [phone, setPhone]             = useState("");
  const [patientName, setPatientName] = useState("");
  const [doctorId, setDoctorId]       = useState("");
  const [roomId, setRoomId]           = useState("");
  const [serviceId, setServiceId]     = useState("");
  const [date, setDate]               = useState(getTodayISO);
  const [time, setTime]               = useState(getNowTime);

  // ── Async data
  const [doctors, setDoctors]               = useState<ClinicStaff[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [allRooms, setAllRooms]             = useState<ClinicRoom[]>([]);
  const [services, setServices]             = useState<ClinicService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [roomSlots, setRoomSlots]           = useState<DoctorRoomSlot[]>([]);
  const [loadingRooms, setLoadingRooms]     = useState(false);

  // ── UI state
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState("");
  const [conflictAppt, setConflictAppt]   = useState<Appointment | null>(null);

  const minTime     = useMemo(() => (date !== getTodayISO() ? undefined : getNowTime()), [date]);
  const isTimePast  = useMemo(() => !!(minTime && time && toMin(time) < toMin(minTime)), [time, minTime]);

  const showSmsHint = useMemo(() => {
    if (!date || !time || date !== getTodayISO()) return false;
    const [hh, mm] = time.split(":").map(Number);
    const diff = (new Date().setHours(hh, mm, 0, 0) - Date.now()) / 3_600_000;
    return diff > 0 && diff <= 3;
  }, [date, time]);

  // ── Reset on open
  useEffect(() => {
    if (!open) return;
    setSearchQuery(prefillPhone ?? "");
    setSearchResults([]); setShowDropdown(false); setSelectedPatient(null);
    setPhone(prefillPhone ?? ""); setPatientName("");
    setDoctorId(prefillDoctorId ?? "");
    setRoomId(prefillRoomId ?? "");
    setServiceId(""); setServices([]);
    setError(""); setConflictAppt(null);
    setDate(prefillDate ?? getTodayISO());
    setTime(prefillTime ?? getNowTime());
  }, [open, prefillPhone, prefillDate, prefillTime, prefillDoctorId, prefillRoomId]);

  // ── Debounced patient search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery || searchQuery.length < 2 || selectedPatient) {
      setSearchResults([]); setSearchLoading(false); return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try { setSearchResults((await clinicApi.patients.search(searchQuery)) ?? []); }
      catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 320);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, selectedPatient]);

  function selectPatient(p: PatientSearchResult) {
    setSelectedPatient(p); setSearchQuery(p.name);
    setPhone(p.phone); setPatientName(p.name); setShowDropdown(false);
  }
  function clearPatient() {
    setSelectedPatient(null); setSearchQuery(""); setPhone(""); setPatientName(""); setSearchResults([]);
  }

  // ── Services by doctor
  useEffect(() => {
    if (!doctorId) { setServices([]); setServiceId(""); return; }
    let cancelled = false; setLoadingServices(true);
    clinicApi.services.list(doctorId)
      .then(async (list) => {
        if (cancelled) return;
        const active = list.filter((s) => s.isActive);
        if (active.length) { setServices(active); }
        else {
          const all = await clinicApi.services.list();
          if (!cancelled) setServices(all.filter((s) => s.isActive && !s.doctorId));
        }
        setServiceId("");
      })
      .catch(() => { if (!cancelled) setServices([]); })
      .finally(() => { if (!cancelled) setLoadingServices(false); });
    return () => { cancelled = true; };
  }, [doctorId]);

  // ── Rooms by doctor + date
  useEffect(() => {
    if (!doctorId || !date) { setRoomSlots([]); setRoomId(""); return; }
    let cancelled = false; setLoadingRooms(true);
    clinicApi.rooms.forDoctor(doctorId, date)
      .then((slots) => {
        if (cancelled) return;
        setRoomSlots(slots);
        setRoomId((prev) => prev || (slots.length === 1 ? slots[0].roomId : ""));
      })
      .catch(() => { if (!cancelled) setRoomSlots([]); })
      .finally(() => { if (!cancelled) setLoadingRooms(false); });
    return () => { cancelled = true; };
  }, [doctorId, date]);

  const loadDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    try {
      const [staff, rooms] = await Promise.all([clinicApi.staff.list(), clinicApi.rooms.list()]);
      setDoctors(staff.filter((s) => s.role === "DOCTOR" && s.isActive));
      setAllRooms(rooms);
    } catch { /**/ } finally { setLoadingDoctors(false); }
  }, []);
  useEffect(() => { if (open) loadDoctors(); }, [open, loadDoctors]);

  // ── Core create (shared by submit / replace / force)
  async function doCreate() {
    await clinicApi.appointments.create({
      patientPhone: phone.trim(),
      patientName:  patientName.trim() || phone.trim(),
      doctorId:  doctorId  || undefined,
      roomId:    roomId    || undefined,
      serviceId: serviceId || undefined,
      date, time,
    });
    onSuccess();
  }

  // ── Conflict resolution: atomic replace via CLINIC-UX-BE-6
  async function handleReplace() {
    if (!conflictAppt) return;
    setSubmitting(true); setError("");
    try {
      await clinicApi.appointments.replace(conflictAppt.id, {
        patientPhone: phone.trim(),
        patientName:  patientName.trim() || phone.trim(),
        doctorId:  doctorId  || undefined,
        roomId:    roomId    || undefined,
        serviceId: serviceId || undefined,
        date, time,
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("clinic.booking.errorCreate"));
    } finally { setSubmitting(false); setConflictAppt(null); }
  }

  // ── Conflict resolution: ignore conflict, book anyway (double-booking)
  async function handleForce() {
    setConflictAppt(null);
    setSubmitting(true); setError("");
    try { await doCreate(); }
    catch (e) { setError(e instanceof Error ? e.message : t("clinic.booking.errorCreate")); }
    finally { setSubmitting(false); }
  }

  // ── Submit
  async function handleSubmit() {
    if (!phone.trim())  { setError("Введите номер телефона пациента"); return; }
    if (!doctorId)      { setError(t("clinic.booking.errorDoctor")); return; }
    if (!date)          { setError(t("clinic.booking.errorDate")); return; }
    if (!time)          { setError(t("clinic.booking.errorTime")); return; }
    if (!roomId)        { setError(t("clinic.booking.errorRoom")); return; }
    if (isTimePast)     { setError("Нельзя записать на прошедшее время"); return; }
    const slot = roomSlots.find((s) => s.roomId === roomId);
    if (slot && (toMin(time) < toMin(slot.startTime) || toMin(time) > toMin(slot.endTime))) {
      setError(t("clinic.booking.errorTimeRange", { start: slot.startTime, end: slot.endTime })); return;
    }
    setSubmitting(true); setError("");

    // Client-side conflict check → show dialog instead of blocking
    try {
      const existing = await clinicApi.appointments.list({ date, doctorId });
      const newMin = toMin(time);
      const conflict = existing.find(
        (a) =>
          !["CANCELED", "NO_SHOW"].includes(a.status) &&
          Math.abs(toMin(a.time) - newMin) < 30
      );
      if (conflict) {
        setConflictAppt(conflict);
        setSubmitting(false);
        return;
      }
    } catch {
      // Ignore — server will enforce uniqueness
    }

    try { await doCreate(); }
    catch (e) { setError(e instanceof Error ? e.message : t("clinic.booking.errorCreate")); }
    finally { setSubmitting(false); }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
      className="m-auto p-4 border-0 bg-transparent w-full max-w-lg backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm"
    >
      <div className="relative bg-white rounded-2xl flex flex-col shadow-2xl max-h-[88vh]">

        {/* ── Conflict dialog overlay ── */}
        {conflictAppt && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/95 backdrop-blur-sm p-6">
            <div className="text-center max-w-xs w-full">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle size={28} className="text-amber-500" />
              </div>
              <h4 className="mb-1 text-base font-extrabold text-slate-950">Близкая запись</h4>
              <p className="mb-1 text-sm text-slate-500">
                В <b>{conflictAppt.time}</b> уже записан (менее 30 мин до <b>{time}</b>):
              </p>
              <p className="mb-5 text-sm font-bold text-slate-800">{conflictAppt.patientName ?? conflictAppt.patientPhone}</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleReplace}
                  disabled={submitting}
                  className="w-full rounded-xl bg-rose-500 py-3 text-sm font-bold text-white transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {submitting ? "..." : "Заменить существующего"}
                </button>
                <button
                  onClick={handleForce}
                  disabled={submitting}
                  className="w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  {submitting ? "..." : "Добавить всё равно (двойная)"}
                </button>
                <button
                  onClick={() => setConflictAppt(null)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  Назад
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-teal-600 to-teal-700 rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight leading-none">
              {t("clinic.booking.title")}
            </h3>
            <p className="text-xs text-teal-200 mt-1">Новая запись на приём</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white border-0 cursor-pointer transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* ── Patient search — outside scroll so dropdown is never clipped ── */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 relative z-10">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
            Поиск пациента
          </label>

          {selectedPatient ? (
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-teal-50 border border-teal-200">
              <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-extrabold shrink-0">
                {getInitials(selectedPatient.name) || <User size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-teal-900 truncate">{selectedPatient.name}</span>
                  <CheckCircle2 size={13} className="text-teal-500 shrink-0" />
                  {selectedPatient.allergies && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200 shrink-0">
                      <AlertCircle size={9} /> Аллергия
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-teal-600 flex items-center gap-1"><Phone size={10} />{selectedPatient.phone}</span>
                  {selectedPatient.lastVisit && (
                    <span className="text-xs text-teal-500 flex items-center gap-1"><Calendar size={10} />{fmtLastVisit(selectedPatient.lastVisit)}</span>
                  )}
                </div>
              </div>
              <button onClick={clearPatient}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-600 border-0 cursor-pointer transition-colors shrink-0">
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 px-3.5 h-10 rounded-xl border border-slate-200 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  className="flex-1 text-sm bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedPatient(null); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 160)}
                  placeholder="Введите имя или телефон…"
                />
                {searchLoading
                  ? <Loader2 size={14} className="text-teal-400 animate-spin shrink-0" />
                  : searchQuery
                    ? <button onMouseDown={clearPatient} className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 border-0 cursor-pointer shrink-0"><X size={10} /></button>
                    : null}
              </div>
              {showDropdown && (
                <PatientDropdown results={searchResults} loading={searchLoading} query={searchQuery}
                  onSelect={selectPatient} onNewPatient={() => setShowDropdown(false)} />
              )}
              {!searchQuery && <p className="text-xs text-slate-400 mt-1.5 ml-0.5">Введите 2+ символа — или заполните поля ниже вручную</p>}
            </div>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="px-6 py-5 overflow-y-auto flex-1 flex flex-col gap-4">

          {/* Имя и телефон */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Имя">
              <input className={INPUT_CLS} value={patientName}
                onChange={(e) => setPatientName(e.target.value)} placeholder="Имя пациента" />
            </Field>
            <Field label="Телефон" required>
              <input
                className={INPUT_CLS}
                value={phone}
                type="tel"
                placeholder="+998"
                onFocus={() => { if (!phone) setPhone("+998"); }}
                onBlur={() => { if (phone === "+998") setPhone(""); }}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw.startsWith("+998")) { setPhone("+998"); return; }
                  const digits = raw.slice(4).replace(/\D/g, "").slice(0, 9);
                  setPhone("+998" + digits);
                }}
              />
            </Field>
          </div>

          <div className="border-t border-slate-100" />

          {/* Врач */}
          <Field label={t("clinic.booking.doctor")} required>
            <select className={SELECT_CLS} value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)} disabled={loadingDoctors}>
              <option value="">
                {loadingDoctors ? t("clinic.booking.loadingDoctors") : t("clinic.booking.selectDoctor")}
              </option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.specialization ? ` — ${d.specialization}` : ""}
                </option>
              ))}
            </select>
          </Field>

          {/* Услуга */}
          {doctorId && (
            <Field label="Услуга">
              {loadingServices ? (
                <div className="h-10 flex items-center gap-2 px-3.5 text-sm text-slate-400 rounded-xl border border-slate-200 bg-slate-50">
                  <Loader2 size={13} className="animate-spin" /> Загрузка услуг…
                </div>
              ) : (
                <select className={SELECT_CLS} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  <option value="">— Не выбрана (необязательно)</option>
                  {services.map((s) => {
                    const price = s.priceMin != null && s.priceMax != null
                      ? `${s.priceMin.toLocaleString("ru-RU")} – ${s.priceMax.toLocaleString("ru-RU")} сум`
                      : `${s.price.toLocaleString("ru-RU")} сум`;
                    return <option key={s.id} value={s.id}>{s.name} · {price}</option>;
                  })}
                </select>
              )}
            </Field>
          )}

          {/* Кабинет */}
          {doctorId && (
            <Field label={t("clinic.booking.room")} required>
              {loadingRooms ? (
                <div className="h-10 flex items-center gap-2 px-3.5 text-sm text-slate-400 rounded-xl border border-slate-200 bg-slate-50">
                  <Loader2 size={13} className="animate-spin" /> {t("clinic.booking.loadingSchedule")}
                </div>
              ) : roomSlots.length > 0 ? (
                <select className={SELECT_CLS} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                  <option value="">{t("clinic.booking.selectRoom")}</option>
                  {roomSlots.map((s) => (
                    <option key={`${s.roomId}-${s.startTime}`} value={s.roomId}>
                      {s.roomName}{s.floor != null ? ` (${s.floor} эт.)` : ""} · {s.startTime}–{s.endTime}
                    </option>
                  ))}
                </select>
              ) : allRooms.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                    {t("clinic.booking.noSchedule")}
                  </p>
                  <select className={SELECT_CLS} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                    <option value="">{t("clinic.booking.selectRoom")}</option>
                    {allRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}{r.floor != null ? ` (${r.floor} эт.)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="h-10 flex items-center px-3.5 text-sm text-red-500 rounded-xl border border-red-200 bg-red-50">
                  {t("clinic.booking.noRooms")}
                </div>
              )}
            </Field>
          )}

          <div className="border-t border-slate-100" />

          {/* Дата и время */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("clinic.booking.date")} required>
              <input type="date" className={INPUT_CLS} value={date}
                min={getTodayISO()} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={t("clinic.booking.time")} required>
              <input type="time"
                className={`${INPUT_CLS} ${isTimePast ? "border-red-400 bg-red-50 text-red-600 focus:border-red-400 focus:ring-red-100" : ""}`}
                value={time} min={minTime}
                onChange={(e) => { const v = e.target.value; setTime(minTime && toMin(v) < toMin(minTime) ? minTime : v); }} />
              {isTimePast && <p className="text-xs text-red-500 mt-1">Минимум {minTime}</p>}
            </Field>
          </div>

          {/* SMS hint */}
          {showSmsHint && !isTimePast && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-green-50 border border-green-200">
              <span className="text-base">📱</span>
              <p className="text-xs text-green-700 font-medium">Пациент получит SMS-напоминание за 1 час до приёма</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />{error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl shrink-0">
          <button onClick={handleSubmit} disabled={submitting || isTimePast}
            className="flex-[2] h-11 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 border-0 cursor-pointer transition-all shadow-sm shadow-teal-200 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none">
            {submitting ? t("clinic.booking.submitting") : t("clinic.booking.submit")}
          </button>
          <button onClick={onClose}
            className="flex-1 h-11 rounded-xl font-semibold text-sm bg-white text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors border border-slate-200">
            {t("clinic.common.cancel")}
          </button>
        </div>

      </div>
    </dialog>
  );
}
