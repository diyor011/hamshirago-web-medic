import { useEffect, useState } from "react";
import { getServices, createService, updateService, deleteService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const emptyForm = {
  title: "",
  description: "",
  category: "",
  price: 0,
  durationMinutes: 15,
  sortOrder: 0,
};

const Services = () => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const data = await getServices();
      setServices(data);
    } catch (e) {
      toast.error("Ошибка загрузки услуг");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      description: s.description || "",
      category: s.category || "",
      price: s.price,
      durationMinutes: s.durationMinutes,
      sortOrder: s.sortOrder || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateService(editingId, form);
        toast.success("Услуга обновлена");
      } else {
        await createService(form);
        toast.success("Услуга создана");
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error("Ошибка сохранения");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить услугу?")) return;
    try {
      await deleteService(id);
      toast.success("Услуга удалена");
      load();
    } catch (e) {
      toast.error("Ошибка удаления");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateService(id, { isActive });
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, isActive } : s)));
    } catch (e) {
      toast.error("Ошибка");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold">
          Каталог услуг
        </motion.h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Добавить услугу
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Длительность</TableHead>
              <TableHead>Порядок</TableHead>
              <TableHead>Активна</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Нет услуг
                </TableCell>
              </TableRow>
            ) : (
              services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell className="text-sm">{s.category}</TableCell>
                  <TableCell>{Number(s.price).toLocaleString("ru-RU")} UZS</TableCell>
                  <TableCell>{s.durationMinutes} мин</TableCell>
                  <TableCell>{s.sortOrder}</TableCell>
                  <TableCell>
                    <Switch
                      checked={s.isActive}
                      onCheckedChange={(v) => handleToggleActive(s.id, v)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать услугу" : "Новая услуга"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Категория</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Цена (UZS)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Длительность (мин)</Label>
                <Input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Порядок сортировки</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
            </div>
            <Button type="submit" className="w-full">
              {editingId ? "Сохранить" : "Создать"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
