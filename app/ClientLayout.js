"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const isPlayPage = pathname.startsWith("/play");
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isPlayPage);

  useEffect(() => {
    if (isPlayPage) setIsSidebarOpen(false);
  }, [pathname]);

  const isActive = (path) => pathname === path;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif", position: 'relative' }}>
      
      {/* --- Sidebar --- */}
      <aside style={{ 
        ...s.sidebar, 
        transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)",
        width: isSidebarOpen ? "280px" : "0px",
        opacity: isSidebarOpen ? 1 : 0,
        // ✨ จุดสำคัญ 1: ถ้าปิด Sidebar ให้คลิกทะลุผ่านไปหาเนื้อหาข้างหลังได้
        pointerEvents: isSidebarOpen ? "auto" : "none", 
        padding: isSidebarOpen ? "30px 20px" : "30px 0px",
        visibility: isSidebarOpen ? "visible" : "hidden", // ซ่อนให้สนิท
      }}>
        {/* ... (เนื้อหา Sidebar เหมือนเดิม) ... */}
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
      </aside>

      {/* --- ปุ่ม Toggle --- */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{
          ...s.toggleBtn,
          left: isSidebarOpen ? "290px" : "20px",
        }}
      >
        {isSidebarOpen ? "✕" : "☰"}
      </button>

      {/* --- Main Content --- */}
      <main style={{ 
        flex: 1, 
        background: isPlayPage ? "#f0f2f5" : "#fdfdff", 
        padding: isPlayPage ? "0px" : "30px",
        paddingTop: isPlayPage ? "0px" : "60px", // หน้า Play ไม่ต้องเว้นที่ปุ่มมากนัก
        width: "100%",
        minWidth: 0, // ป้องกัน Sidebar ดันเนื้อหาหลุดจอ
        position: 'relative',
        zIndex: 1 // ให้เนื้อหาหลักอยู่ชั้นที่กดได้ชัวร์ๆ
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
    position: "fixed", 
    left: 0,
    top: 0, 
    height: "100vh",
    zIndex: 2000, // Sidebar ต้องสูงกว่าปุ่ม
    transition: "0.3s all cubic-bezier(0.4, 0, 0.2, 1)",
    // ✨ จุดสำคัญ 2: ลบ minWidth ทิ้ง เพื่อไม่ให้มันกางค้างไว้ตอนปิด
  },
  toggleBtn: {
    position: "fixed",
    top: "15px",
    zIndex: 2100, // ปุ่มต้องอยู่สูงสุดเพื่อให้กดได้ตลอด
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: "none",
    background: "#8e44ad",
    color: "white",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(142, 68, 173, 0.3)",
    transition: "0.3s all ease"
  },
  // ... style อื่นๆ เหมือนเดิม แต่เอา minWidth ใน nav/logo ออกด้วยถ้ามี ...
  logoArea: { display: 'flex', alignItems: 'center', marginBottom: '40px' }, 
  nav: { display: "flex", flexDirection: "column", gap: "5px", flex: 1 },
  link: (active) => ({
    display: 'flex', alignItems: 'center', textDecoration: "none",
    color: active ? "#8e44ad" : "#5a5a6a",
    background: active ? "#e8e4ff" : "transparent",
    padding: "12px 15px", borderRadius: "14px", fontSize: "0.95rem"
  }),
};