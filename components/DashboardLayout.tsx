"use client";

import Sidebar from "./Sidebar";
import DoctorSidebar from "./DoctorSidebar";
import MobileNav from "./MobileNav";
import DoctorMobileNav from "./DoctorMobileNav";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Derive role from URL path — consistent on server and client, no hydration mismatch.
  const pathname = usePathname();
  const isDoctor = pathname.startsWith("/doctor");

  const inner = (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      {/* Desktop sidebar */}
      <div className="dl-sidebar">
        {isDoctor ? <DoctorSidebar /> : <Sidebar />}
      </div>

      {/* Main content */}
      <main style={{ flex: 1, minHeight: "100vh" }} className="dl-main">
        <div className="dl-inner">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="dl-mobile-nav">
        {isDoctor ? <DoctorMobileNav /> : <MobileNav />}
      </div>

      <style>{`
        .dl-sidebar { display: block; }
        .dl-main { margin-left: 240px; }
        .dl-inner { max-width: 1100px; margin: 0 auto; padding: 32px 28px 100px; }
        .dl-mobile-nav { display: none; }

        @media (max-width: 768px) {
          .dl-sidebar { display: none !important; }
          .dl-main { margin-left: 0 !important; }
          .dl-inner { padding: 16px 16px 90px !important; }
          .dl-mobile-nav { display: block !important; }
        }
      `}</style>
    </div>
  );

  return inner;
}
