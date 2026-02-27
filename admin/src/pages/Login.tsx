import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAdminSecret, validateAdminSecret } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const Login = () => {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = secret.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");

    try {
      const valid = await validateAdminSecret(trimmed);
      if (valid) {
        setAdminSecret(trimmed);
        navigate("/");
      } else {
        setError("Неверный секретный ключ. Проверьте значение ADMIN_SECRET.");
      }
    } catch {
      setError("Не удалось подключиться к серверу. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8 px-4"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">HamshiraGo</h1>
          <p className="text-sm text-muted-foreground">
            Введите секретный ключ для входа в админ-панель
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Admin Secret"
            value={secret}
            onChange={(e) => {
              setSecret(e.target.value);
              setError("");
            }}
            className={`h-11 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
            disabled={loading}
            autoFocus
          />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <Button
            type="submit"
            className="w-full h-11"
            disabled={!secret.trim() || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Проверка...
              </>
            ) : (
              "Войти"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
