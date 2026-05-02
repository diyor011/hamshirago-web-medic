"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { clinicApi, ClinicCompany } from "@/lib/clinicApi";

export interface ClinicState {
  id: string;
  name: string;
  logoUrl?: string | null;
  isVerified?: boolean;
  address?: string | null;
}

interface ClinicContextValue {
  clinic: ClinicState | null;
  setClinic: (c: ClinicState | null) => void;
  clinicError: string | null;
}

const ClinicContext = createContext<ClinicContextValue>({
  clinic: null,
  setClinic: () => {},
  clinicError: null,
});

const STORAGE_KEY = "clinic_company";

function companyToState(c: ClinicCompany): ClinicState {
  return {
    id: c.id,
    name: c.name,
    logoUrl: c.logoUrl ?? null,
    isVerified: true,
    address: c.address ?? null,
  };
}

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  // Always null on first render (server + client match → no hydration error)
  // Populated from localStorage via useEffect on client only
  const [clinic, setClinicState] = useState<ClinicState | null>(null);

  const [clinicError, setClinicError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) setClinicState(JSON.parse(cached) as ClinicState);
    } catch {}
  }, []);

  const setClinic = useCallback((c: ClinicState | null) => {
    setClinicState(c);
    if (c) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    clinicApi.company.get().then((company) => {
      setClinic(companyToState(company));
      setClinicError(null);
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : "Ошибка загрузки клиники";
      // UNAUTHORIZED — API client already redirects to /auth
      if (msg === "UNAUTHORIZED") return;
      // No cached data — redirect to auth
      if (!localStorage.getItem(STORAGE_KEY)) {
        window.location.replace("/auth?role=clinic");
        return;
      }
      setClinicError(msg);
    });
  }, [setClinic]);

  return (
    <ClinicContext.Provider value={{ clinic, setClinic, clinicError }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  return useContext(ClinicContext);
}
