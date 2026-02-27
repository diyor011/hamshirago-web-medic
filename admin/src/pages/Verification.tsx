import { useCallback, useEffect, useState } from "react";
import { getPendingMedics, verifyMedic } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Verification = () => {
  const [medics, setMedics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const load = async () => {
    try {
      const data = await getPendingMedics();
      setMedics(data);
    } catch (e) {
      toast.error("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = useCallback(async (id: string) => {
    setProcessing(id);
    try {
      await verifyMedic(id, "APPROVED");
      setMedics((prev) => prev.filter((m) => m.id !== id));
      toast.success("Медик одобрен");
    } catch (e) {
      toast.error("Ошибка одобрения");
    } finally {
      setProcessing(null);
    }
  }, []);

  const handleReject = useCallback(async () => {
    if (!rejectId || !reason.trim()) return;
    setProcessing(rejectId);
    try {
      await verifyMedic(rejectId, "REJECTED", reason);
      setMedics((prev) => prev.filter((m) => m.id !== rejectId));
      toast.success("Медик отклонён");
      setRejectId(null);
      setReason("");
    } catch (e) {
      toast.error("Ошибка отклонения");
    } finally {
      setProcessing(null);
    }
  }, [reason, rejectId]);

  useEffect(() => {
    if (medics.length === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex > medics.length - 1) {
      setSelectedIndex(medics.length - 1);
    }
  }, [medics, selectedIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector("[role='dialog']")) return;
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || active?.isContentEditable;
      if (isTyping || medics.length === 0 || processing) return;

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, medics.length - 1));
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      const selectedMedic = medics[selectedIndex];
      if (!selectedMedic) return;

      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        handleApprove(selectedMedic.id);
        return;
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        setRejectId(selectedMedic.id);
        setReason("");
        return;
      }
      if (event.key === "Escape" && rejectId) {
        event.preventDefault();
        setRejectId(null);
        setReason("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleApprove, medics, processing, rejectId, selectedIndex]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Верификация медиков</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 p-6 backdrop-blur-md animate-pulse h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-gradient-to-br from-amber-300/20 to-orange-300/10 dark:from-amber-700/20 dark:to-orange-700/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-72 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-300/20 to-blue-300/10 dark:from-cyan-700/20 dark:to-blue-700/10 blur-3xl" />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-amber-50/80 via-white/70 to-cyan-50/70 dark:from-slate-900 dark:via-amber-950/25 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-20 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-300">Trust & Safety</p>
            <h1 className="text-3xl font-semibold tracking-tight">Верификация медиков</h1>
            <p className="text-sm text-muted-foreground dark:text-slate-300 mt-1">
              Быстрый review документов с горячими клавишами и последовательной навигацией.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-badge status-created">↑↓ навигация</span>
            <span className="status-badge status-approved">A одобрить</span>
            <span className="status-badge status-rejected">R отклонить</span>
            <span className="status-badge status-pending">
              <Clock className="h-3 w-3 mr-1" />
              {medics.length} ожидают
            </span>
          </div>
        </div>
      </motion.section>

      <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/50 dark:border-slate-700/60 bg-gradient-to-br from-amber-50/70 to-orange-100/70 dark:from-slate-900/90 dark:to-amber-950/30 p-3">
            <p className="text-xs text-muted-foreground dark:text-slate-300">В очереди</p>
            <p className="text-xl font-semibold text-amber-800 dark:text-amber-200">{medics.length}</p>
          </div>
          <div className="rounded-xl border border-white/50 dark:border-slate-700/60 bg-gradient-to-br from-emerald-50/70 to-teal-100/70 dark:from-slate-900/90 dark:to-emerald-950/30 p-3">
            <p className="text-xs text-muted-foreground dark:text-slate-300">Горячая клавиша</p>
            <p className="text-xl font-semibold text-emerald-800 dark:text-emerald-200">A</p>
          </div>
          <div className="rounded-xl border border-white/50 dark:border-slate-700/60 bg-gradient-to-br from-rose-50/70 to-pink-100/70 dark:from-slate-900/90 dark:to-rose-950/30 p-3">
            <p className="text-xs text-muted-foreground dark:text-slate-300">Горячая клавиша</p>
            <p className="text-xl font-semibold text-rose-800 dark:text-rose-200">R</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Заявки на проверку</h2>
        <div className="flex items-center gap-2">
          <span className="status-badge status-created">↑↓ навигация</span>
          <span className="status-badge status-approved">A одобрить</span>
          <span className="status-badge status-rejected">R отклонить</span>
        </div>
      </div>

      {medics.length === 0 && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 to-cyan-50/80 dark:from-slate-900/90 dark:to-cyan-950/20 text-center py-16 text-muted-foreground dark:text-slate-300 backdrop-blur-md">
          Нет медиков, ожидающих верификации.
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
      <AnimatePresence>
        {medics.map((medic, index) => (
          <motion.div
            key={medic.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            layout
            onClick={() => setSelectedIndex(index)}
            className={`rounded-2xl border p-4 space-y-3 transition-all ${
              selectedIndex === index
                ? "ring-2 ring-primary/40 shadow-xl border-primary/30 bg-gradient-to-br from-cyan-50/85 via-white/80 to-emerald-50/75 dark:from-slate-900/90 dark:via-cyan-950/25 dark:to-emerald-950/25 backdrop-blur-md"
                : "border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm hover:shadow-md"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold">{medic.name}</h3>
                <p className="text-xs text-muted-foreground dark:text-slate-300">{medic.phone}</p>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground dark:text-slate-300">
                  <span>Опыт: {medic.experienceYears} лет</span>
                  <span>Дата: {new Date(medic.created_at).toLocaleDateString("ru-RU")}</span>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {medic.facePhotoUrl && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                        <Eye className="h-4 w-4 mr-1" /> Фото
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <img src={medic.facePhotoUrl} alt="Face" className="w-full rounded-lg" />
                    </DialogContent>
                  </Dialog>
                )}
                {medic.licensePhotoUrl && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                        <Eye className="h-4 w-4 mr-1" /> Лицензия
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <img src={medic.licensePhotoUrl} alt="License" className="w-full rounded-lg" />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleApprove(medic.id)}
                disabled={processing === medic.id}
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Одобрить
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white border-0"
                onClick={() => setRejectId(medic.id)}
                disabled={processing === medic.id}
              >
                <XCircle className="h-4 w-4 mr-1" /> Отклонить
              </Button>
            </div>

            {rejectId === medic.id && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 rounded-xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/25 p-3"
              >
                <Textarea
                  placeholder="Причина отклонения..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-white/90 dark:bg-slate-900/80"
                />
                <div className="flex gap-2">
                  <Button className="bg-rose-600 hover:bg-rose-700 text-white" size="sm" onClick={handleReject} disabled={!reason.trim()}>
                    Подтвердить отклонение
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setRejectId(null); setReason(""); }}>
                    Отмена
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default Verification;
