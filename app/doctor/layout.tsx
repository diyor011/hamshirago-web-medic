"use client";

import { DoctorProvider } from "@/context/DoctorContext";
import ContextErrorBoundary from "@/components/ContextErrorBoundary";
import DoctorPushPermissionPrompt from "@/components/DoctorPushPermissionPrompt";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContextErrorBoundary zone="Doctor">
      <DoctorProvider>
        <div style={{ minHeight: "100vh" }}>
          {children}
          <DoctorPushPermissionPrompt />
        </div>
      </DoctorProvider>
    </ContextErrorBoundary>
  );
}
