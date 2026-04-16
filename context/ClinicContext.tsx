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
  const [clinic, setClinicState] = useState<ClinicState | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? (JSON.parse(cached) as ClinicState) : null;
    } catch {
      return null;
    }
  });

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
    }).catch(() => {});
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
