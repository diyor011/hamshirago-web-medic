"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { X, User, Phone, Calendar, AlertCircle, CheckCircle2, Loader2, Clock, Stethoscope, DoorOpen, Sparkles } from "lucide-react";
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
  prefillPatientName?: string;
  prefillDate?: string;
  prefillTime?: string;
  prefillDoctorId?: string;
  prefillRoomId?: string;
}

const INPUT_CLS = "w-full h-11 px-4 text-sm rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white outline-none transition-all";
const SELECT_CLS = "w-full h-11 px-4 text-sm rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white outline-none transition-all cursor-pointer appearance-none";

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
  const { t } = useTranslation();
  if (!query || query.length < 2) return null;

  return (
    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3.5 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin text-teal-500" /> {t("clinic.booking.searching")}
        </div>
      ) : results.length === 0 ? (
        <div className="px-4 py-3.5">
          <p className="text-sm text-slate-400 mb-2">{t("clinic.booking.patientNotFoundQuery", { query })}</p>
          <button onMouseDown={onNewPatient}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors cursor-pointer">
            <User size={14} /> {t("clinic.booking.fillManually")}
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
                      <AlertCircle size={9} /> {t("clinic.patients.allergy")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10} /> {p.phone}</span>
                  {p.lastVisit && <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={10} /> {fmtLastVisit(p.lastVisit)}</span>}
                </div>
              </div>
            </button>
          ))}
          <button onMouseDown={onNewPatient}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 text-xs font-semibold transition-colors cursor-pointer border-t border-slate-100">
            <User size={12} /> {t("clinic.booking.addNewManually")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BookingModal({ open, onClose, onSuccess, prefillPhone, prefillPatientName, prefillDate, prefillTime, prefillDoctorId, prefillRoomId }: Props) {
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
    setSearchResults([]); setShowDropdown(false); setError(""); setConflictAppt(null);
    setServiceId(""); setServices([]);
    setDoctorId(prefillDoctorId ?? "");
    setRoomId(prefillRoomId ?? "");
    setDate(prefillDate ?? getTodayISO());
    setTime(prefillTime ?? getNowTime());

    if (prefillPhone && prefillPatientName) {
      // Auto-select patient from prefill — skip search entirely
      const auto: PatientSearchResult = { id: "", name: prefillPatientName, phone: prefillPhone, lastVisit: null, allergies: null };
      setSelectedPatient(auto);
      setSearchQuery(prefillPatientName);
      setPhone(prefillPhone);
      setPatientName(prefillPatientName);
    } else {
      setSelectedPatient(null);
      setSearchQuery(prefillPhone ?? "");
      setPhone(prefillPhone ?? "");
      setPatientName("");
    }
  }, [open, prefillPhone, prefillPatientName, prefillDate, prefillTime, prefillDoctorId, prefillRoomId]);

  // ── Debounced patient search (triggered by phone input, min 7 chars: "+998" + 3 digits)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery || searchQuery.length < 7 || selectedPatient) {
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
    setSelectedPatient(p);
    setPhone(p.phone);
    setPatientName(p.name);
    setSearchResults([]);
    setShowDropdown(false);
  }
  function clearPatient() {
    setSelectedPatient(null);
    setSearchQuery("");
    setPhone("");
    setPatientName("");
    setSearchResults([]);
  }

  // ── Services by doctor (doctor-specific + clinic-wide combined)
  useEffect(() => {
    if (!doctorId) { setServices([]); setServiceId(""); return; }
    let cancelled = false; setLoadingServices(true);
    Promise.all([
      clinicApi.services.list(doctorId),
      clinicApi.services.list(),
    ]).then(([doctorSvcs, allSvcs]) => {
      if (cancelled) return;
      const general = allSvcs.filter((s) => s.isActive && !s.doctorId);
      const doctorActive = doctorSvcs.filter((s) => s.isActive);
      const ids = new Set(doctorActive.map((s) => s.id));
      const combined = [...doctorActive, ...general.filter((s) => !ids.has(s.id))];
      setServices(combined);
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

    // Client-side checks: duplicate phone + time conflict
    try {
      const [allForDay, forDoctor] = await Promise.all([
        clinicApi.appointments.list({ date }),
        clinicApi.appointments.list({ date, doctorId }),
      ]);

      // Duplicate patient phone on same day
      const dupPhone = allForDay.find(
        (a) => !["CANCELED", "NO_SHOW", "DONE"].includes(a.status) && a.patientPhone === phone.trim()
      );
      if (dupPhone) {
        setError(`Пациент с этим номером уже записан на ${date} в ${dupPhone.time}`);
        setSubmitting(false);
        return;
      }

      // Time conflict with same doctor (<30 min window)
      const newMin = toMin(time);
      const conflict = forDoctor.find(
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
      className="m-auto p-0 border-0 bg-transparent w-full max-w-md backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm"
    >
      <div className="relative bg-white rounded-3xl flex flex-col shadow-[0_32px_80px_rgba(0,0,0,0.22)] max-h-[90vh] overflow-hidden">

        {/* ── Conflict overlay ── */}
        {conflictAppt && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-white/96 backdrop-blur-sm p-6">
            <div className="text-center w-full max-w-[260px]">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200">
                <AlertCircle size={30} className="text-amber-500" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-500 mb-1">Конфликт времени</p>
              <h4 className="text-lg font-black text-slate-950 mb-1">Близкая запись</h4>
              <p className="text-sm text-slate-500 mb-1">
                В <span className="font-bold text-slate-800">{conflictAppt.time}</span> уже записан<br/>
                <span className="font-bold text-slate-800">{conflictAppt.patientName ?? conflictAppt.patientPhone}</span>
              </p>
              <p className="text-xs text-slate-400 mb-5">менее 30 мин до <b>{time}</b></p>
              <div className="flex flex-col gap-2">
                <button onClick={handleReplace} disabled={submitting}
                  className="w-full rounded-2xl bg-rose-500 py-3 text-sm font-bold text-white transition hover:bg-rose-600 active:scale-[.98] disabled:opacity-50">
                  {submitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Заменить запись"}
                </button>
                <button onClick={handleForce} disabled={submitting}
                  className="w-full rounded-2xl bg-amber-400 py-3 text-sm font-bold text-white transition hover:bg-amber-500 active:scale-[.98] disabled:opacity-50">
                  {submitting ? "..." : "Записать всё равно"}
                </button>
                <button onClick={() => setConflictAppt(null)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100">
                  Назад
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="relative overflow-hidden shrink-0 px-6 pt-6 pb-5 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-teal-500/20 blur-2xl" />
            <div className="absolute bottom-0 left-0 h-20 w-40 rounded-full bg-cyan-400/10 blur-xl" />
          </div>
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-teal-300">
                <Sparkles size={10} /> Новая запись
              </div>
              <h3 className="text-xl font-black text-white tracking-tight leading-none">
                {t("clinic.booking.title")}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Заполните данные пациента и выберите время</p>
            </div>
            <button onClick={onClose}
              className="mt-0.5 w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white border-0 cursor-pointer transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="px-5 py-5 overflow-y-auto flex-1 flex flex-col gap-5">

          {/* ─ Пациент ─ */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Пациент</p>
            <div className="flex flex-col gap-3">

              {/* Телефон с автопоиском */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Телефон <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className={`flex items-center gap-2.5 h-11 pl-4 pr-3.5 rounded-2xl border bg-slate-50 transition-all ${showDropdown && !selectedPatient ? "border-teal-500 ring-2 ring-teal-100 bg-white" : selectedPatient ? "border-teal-400 bg-teal-50/40" : "border-slate-200 hover:border-slate-300"}`}>
                    <Phone size={14} className="text-slate-400 shrink-0" />
                    <input
                      className="flex-1 text-sm bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                      value={phone}
                      type="tel"
                      placeholder="+998 XX XXX XX XX"
                      onFocus={() => { if (!phone) setPhone("+998"); setShowDropdown(true); }}
                      onBlur={() => { if (phone === "+998") setPhone(""); setTimeout(() => setShowDropdown(false), 160); }}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!raw.startsWith("+998")) { setPhone("+998"); return; }
                        const digits = raw.slice(4).replace(/\D/g, "").slice(0, 9);
                        const newPhone = "+998" + digits;
                        setPhone(newPhone);
                        setSearchQuery(newPhone);
                        setSelectedPatient(null);
                        setShowDropdown(true);
                      }}
                    />
                    {searchLoading
                      ? <Loader2 size={14} className="text-teal-400 animate-spin shrink-0" />
                      : selectedPatient
                        ? <CheckCircle2 size={14} className="text-teal-500 shrink-0" />
                        : null}
                  </div>
                  {showDropdown && !selectedPatient && (
                    <PatientDropdown results={searchResults} loading={searchLoading} query={phone}
                      onSelect={(p) => { selectPatient(p); setShowDropdown(false); }}
                      onNewPatient={() => setShowDropdown(false)} />
                  )}
                </div>

                {/* Выбранный пациент */}
                {selectedPatient?.id && (
                  <div className="mt-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-teal-50 border border-teal-200">
                    <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                      {getInitials(selectedPatient.name) || <User size={13} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-teal-900 truncate">{selectedPatient.name}</p>
                      {selectedPatient.lastVisit && (
                        <p className="text-[10px] text-teal-600 flex items-center gap-1">
                          <Calendar size={9} /> {fmtLastVisit(selectedPatient.lastVisit)}
                        </p>
                      )}
                    </div>
                    {selectedPatient.allergies && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-200">
                        <AlertCircle size={9} /> Аллергия
                      </span>
                    )}
                    <button onMouseDown={clearPatient}
                      className="w-6 h-6 shrink-0 flex items-center justify-center rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-600 border-0 cursor-pointer transition-colors">
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>

              {/* Имя */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Имя</label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input className={`${INPUT_CLS} pl-10`} value={patientName}
                    onChange={(e) => setPatientName(e.target.value)} placeholder="Введите имя пациента" />
                </div>
              </div>
            </div>
          </div>

          {/* ─ Приём ─ */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Приём</p>
            <div className="flex flex-col gap-3">

              {/* Врач */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Врач <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Stethoscope size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                  <select className={`${SELECT_CLS} pl-10`} value={doctorId}
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
                  {loadingDoctors && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin pointer-events-none" />}
                </div>
              </div>

              {doctorId && (
                <div className="grid grid-cols-2 gap-3">
                  {/* Услуга */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Услуга</label>
                    {loadingServices ? (
                      <div className="h-11 flex items-center gap-2 px-4 text-sm text-slate-400 rounded-2xl border border-slate-200 bg-slate-50">
                        <Loader2 size={13} className="animate-spin text-teal-400" /> Загрузка…
                      </div>
                    ) : (
                      <select className={SELECT_CLS} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                        <option value="">— Не выбрана</option>
                        {services.map((s) => {
                          const price = s.priceMin != null && s.priceMax != null
                            ? `${s.priceMin.toLocaleString("ru-RU")}–${s.priceMax.toLocaleString("ru-RU")}`
                            : `${s.price.toLocaleString("ru-RU")}`;
                          return <option key={s.id} value={s.id}>{s.name} · {price}</option>;
                        })}
                      </select>
                    )}
                  </div>

                  {/* Кабинет */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      Кабинет <span className="text-red-400">*</span>
                    </label>
                    {loadingRooms ? (
                      <div className="h-11 flex items-center gap-2 px-4 text-sm text-slate-400 rounded-2xl border border-slate-200 bg-slate-50">
                        <Loader2 size={13} className="animate-spin text-teal-400" />
                      </div>
                    ) : roomSlots.length > 0 ? (
                      <div className="relative">
                        <DoorOpen size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                        <select className={`${SELECT_CLS} pl-9`} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                          <option value="">{t("clinic.booking.selectRoom")}</option>
                          {roomSlots.map((s) => (
                            <option key={`${s.roomId}-${s.startTime}`} value={s.roomId}>
                              {s.roomName}{s.floor != null ? ` (${s.floor} эт.)` : ""} {s.startTime}–{s.endTime}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : allRooms.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1">
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
                      <div className="h-11 flex items-center px-4 text-xs text-red-500 rounded-2xl border border-red-200 bg-red-50">
                        {t("clinic.booking.noRooms")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─ Дата и время ─ */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Дата и время</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  {t("clinic.booking.date")} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type="date" className={`${INPUT_CLS} pl-10`} value={date}
                    min={getTodayISO()} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  {t("clinic.booking.time")} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type="time"
                    className={`${INPUT_CLS} pl-10 ${isTimePast ? "border-red-400 bg-red-50 text-red-600 focus:border-red-400 focus:ring-red-100" : ""}`}
                    value={time} min={minTime}
                    onChange={(e) => { const v = e.target.value; setTime(minTime && toMin(v) < toMin(minTime) ? minTime : v); }} />
                </div>
                {isTimePast && <p className="text-[10px] text-red-500 mt-1 ml-1">Минимум {minTime}</p>}
              </div>
            </div>
          </div>

          {/* SMS hint */}
          {showSmsHint && !isTimePast && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-base shrink-0">📱</span>
              <p className="text-xs text-emerald-700 font-semibold">Пациент получит SMS за 1 час до приёма</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={submitting || isTimePast}
            className="w-full h-12 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 border-0 cursor-pointer transition-all shadow-md shadow-teal-200 active:scale-[.98] disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none mb-2"
          >
            {submitting
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> {t("clinic.booking.submitting")}</span>
              : t("clinic.booking.submit")}
          </button>
          <button
            onClick={onClose}
            className="w-full h-10 rounded-2xl font-semibold text-sm bg-white text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors border border-slate-200"
          >
            {t("clinic.common.cancel")}
          </button>
        </div>

      </div>
    </dialog>
  );
}
