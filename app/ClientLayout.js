"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const isPlayPage = pathname.startsWith("/play");
  
  // ตั้งค่าเริ่มต้น: ถ้าหน้า Play ให้ปิด Sidebar, ถ้าหน้าอื่นให้เปิดไว้
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isPlayPage);

  const isActive = (path) => pathname === path;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8f9fa", overflowX: "hidden" }}>
      
      {/* --- Modern Sidebar (Push Style) --- */}
      <aside style={{ 
        ...s.sidebar, 
        width: isSidebarOpen ? "280px" : "0px",
        opacity: isSidebarOpen ? 1 : 0,
        pointerEvents: isSidebarOpen ? "auto" : "none",
        borderRight: isSidebarOpen ? "1px solid #e2e2e9" : "none",
      }}>
        {/* คลุมเนื้อหาใน Sidebar ทั้งหมดไว้ใน div เพื่อไม่ให้เบียดกันตอนพับ */}
        <div style={{ minWidth: "280px", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={s.logoArea}>
            <div style={s.logoIcon}>T</div>
            <span style={s.logoText}>TRIVIO <small style={{fontSize: '0.6rem', opacity: 0.6}}>2026</small></span>
          </div>
          
          <nav style={s.nav}>
            <p style={s.menuLabel}>MAIN MENU</p>
            <Link href="/" style={s.link(isActive("/"))}>🏠 หน้าแรก</Link>
            
            <p style={s.menuLabel}>CREATOR STUDIO</p>
            <Link href="/trainer/video-creator" style={s.link(isActive("/trainer/video-creator"))}>🎬 โจทย์วิดีโอ</Link>
            <Link href="/host" style={s.link(isActive("/host"))}>🎮 ควิซ PIN</Link>
            <Link href="/trainer/audio-creator" style={s.link(isActive("/trainer/audio-creator"))}>🎙️ สร้างโจทย์เสียง</Link>

            <p style={s.menuLabel}>TRAINER TOOLS</p>
            <Link href="/trainer/video-creator" style={s.link(isActive("/trainer/video-creator"))}>📹 จัดการโจทย์วิดีโอ</Link>

            <p style={s.menuLabel}>REPORT</p>
            <Link href="/trainer/results" style={s.link(isActive("/trainer/results"))}>📊 ผลคะแนน</Link>
            <Link href="/play/leaderboard" style={s.link(isActive("/play/leaderboard"))}>👑 ทำเนียบคนเก่ง</Link>
          </nav>

          <div style={s.userProfile}>
            <div style={s.avatar}>S</div>
            <div style={{marginLeft: '10px'}}>
              <div style={{fontSize: '0.85rem', fontWeight: 'bold', color: '#1a1a1a'}}>Supervisor</div>
              <div style={{fontSize: '0.7rem', color: '#666'}}>Premium Plan</div>
            </div>
          </div>
        </div>
      </aside>

      {/* --- Main Content (ขยับตาม Sidebar) --- */}
      <main style={{ 
        flex: 1,
        position: 'relative',
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        padding: isPlayPage ? "0px" : "40px",
        paddingTop: isPlayPage ? "0px" : "70px",
        background: isPlayPage ? "#f0f2f5" : "#ffffff",
        minWidth: 0
      }}>
        {/* ปุ่ม Toggle แบบ Hamburger */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            ...s.toggleBtn,
            background: isPlayPage ? "#8e44ad" : "#2d3436", // เปลี่ยนสีตามหน้าจอ
          }}
        >
          {isSidebarOpen ? "✕" : "☰"}
        </button>
        
        {children}
      </main>
    </div>
  );
}

const s = {
  sidebar: { 
    background: "#ffffff", 
    color: "#333", 
    display: "flex", 
    flexDirection: "column", 
    position: "relative", // เปลี่ยนจาก fixed เพื่อให้ดันเนื้อหา
    height: "100vh",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    overflow: 'hidden',
    zIndex: 100,
  },
  toggleBtn: {
    position: "absolute",
    top: "15px",
    left: "15px",
    zIndex: 200,
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    border: "none",
    color: "white",
    cursor: "pointer",
    fontSize: "1.2rem",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoArea: { display: 'flex', alignItems: 'center', padding: '30px 25px', marginBottom: '10px' },
  logoIcon: { width: '35px', height: '35px', background: 'linear-gradient(135deg, #8e44ad, #a29bfe)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', marginRight: '12px' },
  logoText: { fontSize: '1.4rem', fontWeight: '900', color: '#1a1a1a', letterSpacing: '-1px' },
  menuLabel: { fontSize: '0.65rem', fontWeight: '800', color: '#a0a0b0', letterSpacing: '1px', margin: '25px 0 10px 20px' },
  nav: { display: "flex", flexDirection: "column", gap: "5px", flex: 1, padding: "0 15px" },
  link: (active) => ({
    display: 'flex',
    alignItems: 'center',
    textDecoration: "none",
    color: active ? "#8e44ad" : "#1a1a1a", // ตัวหนังสือดำเข้มขึ้น
    background: active ? "#f3f0ff" : "transparent",
    padding: "12px 15px",
    borderRadius: "14px",
    fontSize: "0.95rem",
    fontWeight: active ? "700" : "600", // เน้นความหนาให้อ่านง่าย
    transition: "0.2s all ease"
  }),
  userProfile: { 
    padding: '20px 25px', 
    borderTop: '1px solid #eee', 
    display: 'flex', 
    alignItems: 'center',
    background: '#fafafa'
  },
  avatar: { width: '35px', height: '35px', background: '#8e44ad', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' },
};