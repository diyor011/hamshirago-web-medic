"use client";

import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      {/* Desktop sidebar */}
      <div className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, minHeight: "100vh" }} className="main-content">
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 28px 100px" }}>
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="mobile-nav">
        <MobileNav />
      </div>

      <style>{`
        .desktop-sidebar { display: block; }
        .main-content { margin-left: 240px; }
        .mobile-nav { display: none; }

        @media (max-width: 768px) {
          .desktop-sidebar { display: none; }
          .main-content { margin-left: 0 !important; padding: 16px 16px 90px !important; }
          .mobile-nav { display: block; }
        }
      `}</style>
    </div>
  );
}
