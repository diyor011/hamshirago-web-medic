"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [ready,   setReady]   = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [hidden,  setHidden]  = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setReady(true),   60);
    const t1 = setTimeout(() => setLeaving(true), 2200);
    const t2 = setTimeout(() => setHidden(true),  2900);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (hidden) return null;

  return (
    <>
      <style>{`
        @keyframes sp-orb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(28px,-18px) scale(1.08); }
        }
        @keyframes sp-orb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-22px,26px) scale(0.92); }
        }
        @keyframes sp-orb3 {
          0%,100% { transform: translate(0,0); }
          33%      { transform: translate(14px,12px); }
          66%      { transform: translate(-10px,-8px); }
        }
        @keyframes sp-logo {
          0%   { opacity:0; transform:scale(0.15) translateY(24px); }
          55%  { opacity:1; transform:scale(1.14) translateY(-5px); }
          75%  { transform:scale(0.95) translateY(2px); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes sp-ripple {
          0%   { transform:scale(0.85); opacity:0.55; }
          100% { transform:scale(3.2);  opacity:0; }
        }
        @keyframes sp-spin {
          to { transform:rotate(360deg); }
        }
        @keyframes sp-glow {
          0%,100% { box-shadow:0 0 30px 8px rgba(20,184,166,0.35); }
          50%     { box-shadow:0 0 55px 18px rgba(20,184,166,0.55); }
        }
        @keyframes sp-text {
          from { opacity:0; transform:translateY(18px); filter:blur(6px); }
          to   { opacity:1; transform:translateY(0);    filter:blur(0); }
        }
        @keyframes sp-progress {
          from { width:0%; }
          to   { width:100%; }
        }
        @keyframes sp-shimmer {
          from { background-position:-300px 0; }
          to   { background-position: 300px 0; }
        }
        @keyframes sp-badge {
          from { opacity:0; transform:scale(0.7); }
          to   { opacity:1; transform:scale(1); }
        }

        .sp-orb1 { animation: sp-orb1  7s ease-in-out infinite; }
        .sp-orb2 { animation: sp-orb2  9s ease-in-out infinite; }
        .sp-orb3 { animation: sp-orb3 11s ease-in-out infinite; }

        .sp-logo-img {
          animation: sp-logo 0.75s cubic-bezier(0.34,1.56,0.64,1) 0.1s both,
                     sp-glow  2.5s ease-in-out 0.85s infinite;
        }
        .sp-ripple1 { animation: sp-ripple 1.4s ease-out 0.55s both; }
        .sp-ripple2 { animation: sp-ripple 1.4s ease-out 0.9s  both; }
        .sp-ring    { animation: sp-spin  2.8s linear infinite; }

        .sp-title { animation: sp-text 0.55s ease 0.65s both; }
        .sp-sub   { animation: sp-text 0.55s ease 0.80s both; }
        .sp-brand { animation: sp-text 0.55s ease 0.92s both; }
        .sp-badge { animation: sp-badge 0.4s ease 1.05s both; }

        .sp-bar {
          animation: sp-progress 2s cubic-bezier(0.4,0,0.2,1) 0.4s both;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.4) 0%,
            rgba(255,255,255,0.95) 40%,
            rgba(255,255,255,0.4) 80%
          );
          background-size: 300px 100%;
          animation: sp-progress 2s cubic-bezier(0.4,0,0.2,1) 0.4s both,
                     sp-shimmer  1.2s linear 0.4s infinite;
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(150deg, #0d9488 0%, #0f766e 45%, #065f46 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transform: leaving ? "scale(1.08)" : "scale(1)",
        filter: leaving ? "blur(10px)" : "blur(0)",
        transition: "opacity 0.65s ease, transform 0.65s ease, filter 0.65s ease",
        pointerEvents: leaving ? "none" : "all",
      }}>

        {/* ── Animated background orbs ── */}
        <div className="sp-orb1" style={{
          position:"absolute", top:"-25%", left:"-15%",
          width:"65vw", height:"65vw", maxWidth:440, maxHeight:440,
          borderRadius:"50%",
          background:"radial-gradient(circle, rgba(255,255,255,0.13) 0%, transparent 70%)",
        }} />
        <div className="sp-orb2" style={{
          position:"absolute", bottom:"-15%", right:"-20%",
          width:"75vw", height:"75vw", maxWidth:520, maxHeight:520,
          borderRadius:"50%",
          background:"radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
        }} />
        <div className="sp-orb3" style={{
          position:"absolute", top:"38%", right:"-8%",
          width:"45vw", height:"45vw", maxWidth:300, maxHeight:300,
          borderRadius:"50%",
          background:"radial-gradient(circle, rgba(20,184,166,0.28) 0%, transparent 70%)",
        }} />

        {/* ── Logo block ── */}
        <div style={{ position:"relative", marginBottom:30 }}>

          {/* Ripple rings */}
          <div className="sp-ripple1" style={{
            position:"absolute", inset:-12, borderRadius:"40%",
            border:"2px solid rgba(255,255,255,0.45)",
          }} />
          <div className="sp-ripple2" style={{
            position:"absolute", inset:-12, borderRadius:"40%",
            border:"1px solid rgba(255,255,255,0.25)",
          }} />

          {/* Spinning arc */}
          <div className="sp-ring" style={{
            position:"absolute", inset:-10, borderRadius:"34%",
            border:"2.5px solid transparent",
            borderTop:"2.5px solid rgba(255,255,255,0.7)",
            borderRight:"2.5px solid rgba(255,255,255,0.15)",
          }} />

          {/* Logo */}
          <img
            className="sp-logo-img"
            src="/logo.png"
            alt="HamshiraGo"
            style={{
              width:104, height:104, borderRadius:28,
              objectFit:"cover", display:"block",
              boxShadow:"0 24px 64px rgba(0,0,0,0.35), 0 0 0 4px rgba(255,255,255,0.18)",
            }}
          />
        </div>

        {/* ── Text ── */}
        <p className="sp-title" style={{
          fontSize:31, fontWeight:800, color:"#fff",
          letterSpacing:"-0.5px", margin:"0 0 6px",
          textShadow:"0 2px 24px rgba(0,0,0,0.22)",
        }}>
          HamshiraGo
        </p>

        <p className="sp-sub" style={{
          fontSize:15, color:"rgba(255,255,255,0.82)",
          fontWeight:500, margin:"0 0 8px", letterSpacing:"0.02em",
        }}>
          Панель медика
        </p>

        {/* tezcode badge */}
        <div className="sp-badge" style={{
          display:"inline-flex", alignItems:"center", gap:5,
          background:"rgba(255,255,255,0.12)",
          border:"1px solid rgba(255,255,255,0.2)",
          borderRadius:20, padding:"3px 10px",
          marginBottom:52,
        }}>
          <span style={{
            width:6, height:6, borderRadius:"50%",
            background:"rgba(255,255,255,0.7)", flexShrink:0,
          }} />
          <span style={{
            fontSize:11, color:"rgba(255,255,255,0.6)",
            fontWeight:600, letterSpacing:"0.06em",
          }}>
            by tezcode.ai
          </span>
        </div>

        {/* ── Progress bar ── */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:3,
          background:"rgba(255,255,255,0.1)",
        }}>
          <div className="sp-bar" style={{ height:"100%" }} />
        </div>
      </div>
    </>
  );
}
