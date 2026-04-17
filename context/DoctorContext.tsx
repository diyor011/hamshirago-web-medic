"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doctorApi, DoctorProfile } from "@/lib/api";

interface DoctorContextValue {
  doctor: DoctorProfile | null;
  setDoctor: (d: DoctorProfile | null) => void;
}

const DoctorContext = createContext<DoctorContextValue>({
  doctor: null,
  setDoctor: () => {},
});

const STORAGE_KEY = "doctor";

export function DoctorProvider({ children }: { children: React.ReactNode }) {
  // Start with null on both server and client to avoid hydration mismatch.
  // Load from localStorage in useEffect (client-only).
  const [doctor, setDoctorState] = useState<DoctorProfile | null>(null);

  const setDoctor = useCallback((d: DoctorProfile | null) => {
    setDoctorState(d);
    if (d) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    // Seed from cache immediately so UI doesn't flash blank.
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) setDoctorState(JSON.parse(cached) as DoctorProfile);
    } catch {}
    // Always refresh from server.
    doctorApi.auth.me().then((d) => {
      setDoctor(d);
    }).catch(() => {
      // 401 уже обработан API клиентом (redirect → /auth)
      // Для остальных ошибок: если нет кеша — редиректим
      if (!localStorage.getItem(STORAGE_KEY)) {
        window.location.replace("/auth");
      }
    });
  }, [setDoctor]);

  return (
    <DoctorContext.Provider value={{ doctor, setDoctor }}>
      {children}
    </DoctorContext.Provider>
  );
}

export function useDoctor() {
  return useContext(DoctorContext);
}
