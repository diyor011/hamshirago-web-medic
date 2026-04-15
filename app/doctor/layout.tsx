"use client";

import { DoctorProvider } from "@/context/DoctorContext";
import DoctorPushPermissionPrompt from "@/components/DoctorPushPermissionPrompt";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <DoctorProvider>
      {children}
      <DoctorPushPermissionPrompt />
    </DoctorProvider>
  );
}
