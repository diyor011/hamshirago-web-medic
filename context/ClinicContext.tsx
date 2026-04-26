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
}

const ClinicContext = createContext<ClinicContextValue>({
  clinic: null,
  setClinic: () => {},
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
    }).catch(() => {
      // 401 уже обработан API клиентом (redirect → /auth)
      // Для остальных ошибок: если нет кеша — редиректим
      if (!localStorage.getItem(STORAGE_KEY)) {
        window.location.replace("/clinic/auth");
      }
    });
  }, [setClinic]);

  return (
    <ClinicContext.Provider value={{ clinic, setClinic }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  return useContext(ClinicContext);
}
