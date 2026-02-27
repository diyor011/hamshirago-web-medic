import { motion } from "framer-motion";
import { Users } from "lucide-react";

const Clients = () => {
  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold">
        Все клиенты
      </motion.h1>

      <div className="rounded-xl border bg-card p-12 text-center space-y-4">
        <Users className="h-12 w-12 text-muted-foreground/40 mx-auto" />
        <div>
          <p className="text-muted-foreground">
            Эндпоинт <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">GET /auth/admin/users</code> ещё не реализован на бэкенде.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Блокировка клиентов доступна через <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">PATCH /auth/admin/users/:id/block</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Clients;
