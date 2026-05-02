"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, UserPlus, Building2, Clock, Trash2 } from "lucide-react";
import {
  clinicApi,
  ClinicRoom,
  ClinicStaff,
  RoomDoctorSchedule,
} from "@/lib/clinicApi";
import { useTranslation } from "react-i18next";
import "@/i18n";

const DAY_LABELS: Record<number, string> = {
  1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Вс",
};

const UI_DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((v) => ({ value: v, label: DAY_LABELS[v] }));

function Skeleton() {
  return <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <span className="text-sm text-red-500">{message}</span>
      <button onClick={onRetry} className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
        <RefreshCw size={13} /> {t("clinic.common.retry")}
      </button>
    </div>
  );
}

interface AssignDoctorForm {
  doctorId: string;
  days: number[];
  startTime: string;
  endTime: string;
}

interface RoomWithSchedule extends ClinicRoom {
  schedules?: RoomDoctorSchedule[];
}

export default function RoomsPage() {
  const { t } = useTranslation();

  const [rooms, setRooms] = useState<RoomWithSchedule[]>([]);
  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createFloor, setCreateFloor] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  const [assignRoomId, setAssignRoomId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState<AssignDoctorForm>({
    doctorId: "", days: [], startTime: "09:00", endTime: "18:00",
  });
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  const doctors = staff.filter((s) => s.role === "DOCTOR" && s.isActive);

  const loadRooms = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [roomList, staffList] = await Promise.all([
        clinicApi.rooms.list(),
        clinicApi.staff.list(),
      ]);
      setStaff(staffList);
      const withSchedules = await Promise.all(
        roomList.map(async (r) => {
          try {
            const schedules = await clinicApi.rooms.schedule(r.id);
            return { ...r, schedules };
          } catch {
            return { ...r, schedules: [] };
          }
        })
      );
      setRooms(withSchedules);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("clinic.rooms.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  async function handleCreate() {
    if (!createName.trim()) { setCreateError(t("clinic.rooms.errorCreate")); return; }
    setCreating(true); setCreateError("");
    try {
      await clinicApi.rooms.create({
        name: createName.trim(),
        floor: createFloor ? createFloor.trim() : undefined,
      });
      setCreateName(""); setCreateFloor(""); setShowCreate(false);
      await loadRooms();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t("clinic.rooms.errorCreateGeneral"));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(roomId: string) {
    if (!confirm(t("clinic.rooms.deleteConfirm"))) return;
    setDeletingRoomId(roomId);
    try {
      await clinicApi.rooms.delete(roomId);
      await loadRooms();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("clinic.rooms.errorDelete"));
    } finally {
      setDeletingRoomId(null);
    }
  }

  async function handleAssign() {
    if (!assignRoomId) return;
    if (!assignForm.doctorId) { setAssignError(t("clinic.rooms.errorAssignDoctor")); return; }
    if (assignForm.days.length === 0) { setAssignError(t("clinic.rooms.errorAssignDays")); return; }
    if (!assignForm.startTime || !assignForm.endTime) { setAssignError(t("clinic.rooms.errorAssignTime")); return; }
    setAssigning(true); setAssignError("");
    try {
      await clinicApi.rooms.addDoctor(assignRoomId, assignForm);
      setAssignRoomId(null);
      setAssignForm({ doctorId: "", days: [], startTime: "09:00", endTime: "18:00" });
      await loadRooms();
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : t("clinic.rooms.errorAssignGeneral"));
    } finally {
      setAssigning(false);
    }
  }

  function toggleDay(day: number) {
    setAssignForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  }

  const getDoctorName = (id: string) => staff.find((s) => s.id === id)?.name ?? id;

  const inputCls = "w-full rounded-xl border-[1.5px] border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500";

  return (
    <div className="min-h-full space-y-5">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[32px] border border-slate-900 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{t("clinic.rooms.title")}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">{t("clinic.rooms.subtitle")}</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-teal-50"
          >
            <Plus size={16} /> {t("clinic.rooms.addRoom")}
          </button>
        </div>
      </section>

      {error && <ErrorBanner message={error} onRetry={loadRooms} />}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-[15px] font-bold text-slate-950">{t("clinic.rooms.newRoom")}</h3>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">{t("clinic.rooms.roomName")}</label>
              <input className={inputCls} value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder={t("clinic.rooms.roomNamePlaceholder")} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">{t("clinic.rooms.floor")}</label>
              <input type="number" min={1} className={inputCls} value={createFloor} onChange={(e) => setCreateFloor(e.target.value)} placeholder="1" />
            </div>
          </div>
          {createError && <p className="mb-2.5 text-sm text-red-500">{createError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-70"
            >
              {creating ? t("clinic.common.saving") : t("clinic.common.create")}
            </button>
            <button
              onClick={() => { setShowCreate(false); setCreateName(""); setCreateFloor(""); setCreateError(""); }}
              className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm text-slate-500 transition hover:bg-slate-200"
            >
              {t("clinic.common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Rooms table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} />)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-16 text-center shadow-sm">
          <Building2 size={40} className="mb-3 text-slate-200" />
          <p className="text-sm text-slate-400">{t("clinic.rooms.noRooms")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-left font-semibold text-slate-500">{t("clinic.rooms.roomHeader")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">{t("clinic.rooms.floorHeader")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">{t("clinic.rooms.doctorHeader")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">{t("clinic.rooms.scheduleHeader")}</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-500">{t("clinic.rooms.actionsHeader")}</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => {
                  const sched = Array.isArray(room.schedules) ? room.schedules : [];
                  return (
                    <tr key={room.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50">
                            <Building2 size={16} className="text-teal-600" />
                          </div>
                          <span className="font-bold text-slate-950">{room.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {room.floor != null ? `${room.floor} ${t("clinic.rooms.floorSuffix")}` : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {sched.length === 0 ? (
                          <span className="text-xs text-slate-400">{t("clinic.rooms.notAssigned")}</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {sched.map((s) => (
                              <span key={s.id} className="text-xs font-semibold text-slate-700">
                                {getDoctorName(s.doctorId)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {sched.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {sched.map((s) => (
                              <div key={s.id} className="flex items-center gap-1.5">
                                <div className="flex gap-0.5">
                                  {(s.days ?? []).map((d) => (
                                    <span key={d} className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-600">
                                      {DAY_LABELS[d] ?? String(d)}
                                    </span>
                                  ))}
                                </div>
                                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <Clock size={10} /> {s.startTime}–{s.endTime}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setAssignRoomId(room.id); setAssignError(""); }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-600 transition hover:bg-teal-100"
                          >
                            <UserPlus size={13} /> {t("clinic.rooms.assignDoctor")}
                          </button>
                          <button
                            onClick={() => handleDelete(room.id)}
                            disabled={deletingRoomId === room.id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            <Trash2 size={13} /> {deletingRoomId === room.id ? "..." : t("clinic.rooms.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign doctor modal */}
      {assignRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[20px] bg-white p-7 shadow-2xl">
            <h3 className="mb-5 text-lg font-extrabold text-slate-950">
              {t("clinic.rooms.assignDoctorTitle")} — {rooms.find((r) => r.id === assignRoomId)?.name}
            </h3>

            <div className="mb-3.5">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">{t("clinic.rooms.doctor")}</label>
              <select
                className={`${inputCls} bg-white`}
                value={assignForm.doctorId}
                onChange={(e) => setAssignForm((f) => ({ ...f, doctorId: e.target.value }))}
              >
                <option value="">{t("clinic.rooms.selectDoctor")}</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} — {d.specialization ?? t("clinic.rooms.noSpecialization")}</option>
                ))}
              </select>
            </div>

            <div className="mb-3.5">
              <label className="mb-2 block text-xs font-semibold text-slate-500">{t("clinic.rooms.weekdays")}</label>
              <div className="flex flex-wrap gap-1.5">
                {UI_DAY_OPTIONS.map(({ label, value }) => {
                  const active = assignForm.days.includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => toggleDay(value)}
                      className={[
                        "rounded-xl border-[1.5px] px-3 py-1.5 text-sm font-semibold transition",
                        active
                          ? "border-teal-500 bg-teal-50 text-teal-600"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-3.5 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">{t("clinic.rooms.startTime")}</label>
                <input type="time" className={inputCls} value={assignForm.startTime} onChange={(e) => setAssignForm((f) => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">{t("clinic.rooms.endTime")}</label>
                <input type="time" className={inputCls} value={assignForm.endTime} onChange={(e) => setAssignForm((f) => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>

            {assignError && <p className="mb-3 text-sm text-red-500">{assignError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="flex-1 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 py-3 text-sm font-bold text-white disabled:opacity-70"
              >
                {assigning ? t("clinic.common.saving") : t("clinic.rooms.assignDoctor")}
              </button>
              <button
                onClick={() => {
                  setAssignRoomId(null);
                  setAssignForm({ doctorId: "", days: [], startTime: "09:00", endTime: "18:00" });
                  setAssignError("");
                }}
                className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-200"
              >
                {t("clinic.common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
