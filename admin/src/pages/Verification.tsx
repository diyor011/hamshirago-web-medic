import { useEffect, useState } from "react";
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

  const handleApprove = async (id: string) => {
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
  };

  const handleReject = async () => {
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
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Верификация медиков</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 animate-pulse h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Верификация медиков</h1>
        <span className="status-badge status-pending">
          <Clock className="h-3 w-3 mr-1" />
          {medics.length} ожидают
        </span>
      </div>

      {medics.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          Нет медиков, ожидающих верификации
        </div>
      )}

      <AnimatePresence>
        {medics.map((medic) => (
          <motion.div
            key={medic.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="rounded-xl border bg-card p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{medic.name}</h3>
                <p className="text-sm text-muted-foreground">{medic.phone}</p>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  <span>Опыт: {medic.experienceYears} лет</span>
                  <span>Дата: {new Date(medic.created_at).toLocaleDateString("ru-RU")}</span>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {medic.facePhotoUrl && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
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
                      <Button variant="outline" size="sm">
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
                className="bg-success hover:bg-success/90 text-success-foreground"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Одобрить
              </Button>
              <Button
                variant="destructive"
                onClick={() => setRejectId(medic.id)}
                disabled={processing === medic.id}
              >
                <XCircle className="h-4 w-4 mr-1" /> Отклонить
              </Button>
            </div>

            {rejectId === medic.id && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <Textarea
                  placeholder="Причина отклонения..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={handleReject} disabled={!reason.trim()}>
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
  );
};

export default Verification;
