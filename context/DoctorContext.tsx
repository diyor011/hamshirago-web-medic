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
  const [doctor, setDoctorState] = useState<DoctorProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? (JSON.parse(cached) as DoctorProfile) : null;
    } catch {
      return null;
    }
  });

  const setDoctor = useCallback((d: DoctorProfile | null) => {
    setDoctorState(d);
    if (d) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    doctorApi.auth.me().then((d) => {
      setDoctor(d);
    }).catch(() => {});
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
