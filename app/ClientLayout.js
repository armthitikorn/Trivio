"use client";
import { useState, useEffect } from "react"; // เพิ่ม useState
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const isPlayPage = pathname.startsWith("/play");

  // --- State สำหรับเปิด-ปิด Sidebar ---
  // ถ้าเป็นหน้า Play ให้ปิดไว้ก่อน (false), ถ้าหน้าอื่นให้เปิดไว้ (true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isPlayPage);

  // อัปเดตสถานะเมื่อเปลี่ยนหน้า (เช่น สแกน QR เข้ามาให้ปิดทันที)
  useEffect(() => {
    if (isPlayPage) setIsSidebarOpen(false);
  }, [pathname]);

  const isActive = (path) => pathname === path;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif", position: 'relative' }}>
      
      {/* --- 1. Modern Sidebar (พร้อมตรรกะพับเก็บ) --- */}
      <aside style={{ 
        ...s.sidebar, 
        transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)", // เลื่อนเข้า-ออก
        width: isSidebarOpen ? "280px" : "0px", // ปรับความกว้าง
        opacity: isSidebarOpen ? 1 : 0,
        padding: isSidebarOpen ? "30px 20px" : "30px 0px",
        overflow: 'hidden' // ป้องกันเมนูทะลุออกมาตอนพับ
      }}>
        <div style={s.logoArea}>
          <div style={s.logoIcon}>T</div>
          <span style={s.logoText}>TRIVIO</span>
        </div>
        
        <nav style={s.nav}>
          <p style={s.menuLabel}>MAIN MENU</p>
          <Link href="/" style={s.link(isActive("/"))}>🏠 หน้าแรก</Link>
          <p style={s.menuLabel}>STUDIO</p>
          <Link href="/host" style={s.link(isActive("/host"))}>🎮 ควิซ PIN</Link>
          <Link href="/trainer/audio-creator" style={s.link(isActive("/trainer/audio-creator"))}>🎙️ โจทย์เสียง</Link>
          <p style={s.menuLabel}>REPORT</p>
          <Link href="/trainer/results" style={s.link(isActive("/trainer/results"))}>📊 ผลคะแนน</Link>
        </nav>

        <div style={s.userProfile}>
          <div style={s.avatar}>S</div>
          {isSidebarOpen && (
            <div style={{marginLeft: '10px'}}>
              <div style={{fontSize: '0.85rem', fontWeight: 'bold'}}>Supervisor</div>
            </div>
          )}
        </div>
      </aside>

      {/* --- 2. ปุ่ม Toggle (Hamburger Button) --- */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{
          ...s.toggleBtn,
          left: isSidebarOpen ? "290px" : "20px", // ขยับตามไซด์บาร์
        }}
      >
        {isSidebarOpen ? "✕" : "☰"}
      </button>

      {/* --- 3. Main Content --- */}
      <main style={{ 
        flex: 1, 
        background: isPlayPage ? "#f0f2f5" : "#fdfdff", 
        padding: isPlayPage ? "0px" : "30px",
        paddingTop: "60px", // เว้นที่ให้ปุ่ม Toggle
        transition: "0.3s all ease" 
      }}>
        {children}
      </main>
    </div>
  );
}

const s = {
  sidebar: { 
    background: "#f0f0f5", 
    color: "#333", 
    display: "flex", 
    flexDirection: "column", 
    borderRight: "1px solid #e2e2e9", 
    position: "fixed", // ใช้ Fixed เพื่อให้ไม่ดันเนื้อหาจนเพี้ยนในมือถือ
    left: 0,
    top: 0, 
    height: "100vh",
    zIndex: 1000,
    transition: "0.3s all cubic-bezier(0.4, 0, 0.2, 1)"
  },
  toggleBtn: {
    position: "fixed",
    top: "15px",
    zIndex: 1100,
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: "none",
    background: "#8e44ad",
    color: "white",
    cursor: "pointer",
    fontSize: "1.2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(142, 68, 173, 0.3)",
    transition: "0.3s all ease"
  },
  logoArea: { display: 'flex', alignItems: 'center', marginBottom: '40px', minWidth: '240px' },
  logoIcon: { width: '35px', height: '35px', background: 'linear-gradient(135deg, #8e44ad, #a29bfe)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', marginRight: '12px' },
  logoText: { fontSize: '1.4rem', fontWeight: '900', color: '#2d3436' },
  menuLabel: { fontSize: '0.65rem', fontWeight: '800', color: '#a0a0b0', margin: '25px 0 10px 15px' },
  nav: { display: "flex", flexDirection: "column", gap: "5px", flex: 1, minWidth: '240px' },
  link: (active) => ({
    display: 'flex', alignItems: 'center', textDecoration: "none",
    color: active ? "#8e44ad" : "#5a5a6a",
    background: active ? "#e8e4ff" : "transparent",
    padding: "12px 15px", borderRadius: "14px", fontSize: "0.95rem", fontWeight: active ? "700" : "500"
  }),
  userProfile: { paddingTop: '20px', borderTop: '1px solid #e2e2e9', display: 'flex', alignItems: 'center', minWidth: '240px' },
  avatar: { width: '35px', height: '35px', background: '#dcdce5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
};