"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect legacy /clinic/auth to the unified auth page with clinic tab pre-selected. */
export default function ClinicAuthRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/auth?role=clinic"); }, [router]);
  return null;
}
