"use client";

import { DoctorProvider } from "@/context/DoctorContext";
import ContextErrorBoundary from "@/components/ContextErrorBoundary";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContextErrorBoundary zone="Doctor">
      <DoctorProvider>
        <div style={{ minHeight: "100vh" }}>
          {children}
        </div>
      </DoctorProvider>
    </ContextErrorBoundary>
  );
}
