"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const isActive = (path) => pathname === path;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      {/* --- Modern Sidebar --- */}
      <aside style={s.sidebar}>
        <div style={s.logoArea}>
          <div style={s.logoIcon}>T</div>
          <span style={s.logoText}>TRIVIO <small style={{fontSize: '0.6rem', opacity: 0.6}}>2026</small></span>
        </div>
        
        <nav style={s.nav}>
          <p style={s.menuLabel}>MAIN MENU</p>
          <Link href="/" style={s.link(isActive("/"))}>
            <span style={s.icon}>🏠</span> หน้าแรก
          </Link>
          
<p style={s.menuLabel}>CREATOR STUDIO</p>
          <Link href="/trainer/video-creator" style={s.link(isActive("/trainer/video-creator"))}>
            <span style={s.icon}>🎬</span> โจทย์วิดีโอ
          </Link>
          <Link href="/play/audio" style={s.link(isActive("/play/audio"))}>
            <span style={s.icon}>🎙️</span> โจทย์เสียง
          </Link>
          <Link href="/host" style={s.link(isActive("/host"))}>
            <span style={s.icon}>🎮</span> ควิซ PIN
          </Link>
          <p style={s.menuLabel}>REPORT</p>
          <Link href="/trainer/results" style={s.link(isActive("/trainer/results"))}>
            <span style={s.icon}>📊</span> ผลคะแนน
          </Link>
        </nav>

        <div style={s.userProfile}>
          <div style={s.avatar}>S</div>
          <div style={{marginLeft: '10px'}}>
            <div style={{fontSize: '0.85rem', fontWeight: 'bold', color: '#333'}}>Supervisor</div>
            <div style={{fontSize: '0.7rem', color: '#888'}}>Premium Plan</div>
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main style={{ flex: 1, background: "#fdfdff", padding: '30px' }}>
        {children}
      </main>
    </div>
  );
}

const s = {
  sidebar: { 
    width: "280px", 
    background: "#f0f0f5", // สีเทาอ่อนที่เข้มกว่าฝั่งขวาเล็กน้อย
    color: "#333", 
    display: "flex", 
    flexDirection: "column", 
    padding: "30px 20px", 
    borderRight: "1px solid #e2e2e9", // เส้นขอบสีเทาเข้มขึ้นนิดนึงเพื่อให้ดูคม
    position: "sticky", 
    top: 0, 
    height: "100vh",
    boxShadow: "2px 0 5px rgba(0,0,0,0.02)"
  },
  logoArea: { display: 'flex', alignItems: 'center', marginBottom: '40px', padding: '0 10px' },
  logoIcon: { width: '35px', height: '35px', background: 'linear-gradient(135deg, #8e44ad, #a29bfe)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', marginRight: '12px' },
  logoText: { fontSize: '1.4rem', fontWeight: '900', color: '#2d3436', letterSpacing: '-1px' },
  menuLabel: { fontSize: '0.65rem', fontWeight: '800', color: '#a0a0b0', letterSpacing: '1px', margin: '25px 0 10px 15px' },
  nav: { display: "flex", flexDirection: "column", gap: "5px", flex: 1 },
  link: (active) => ({
    display: 'flex',
    alignItems: 'center',
    textDecoration: "none",
    color: active ? "#8e44ad" : "#5a5a6a",
    background: active ? "#e8e4ff" : "transparent", // พื้นหลังเมนูที่เลือกจะเข้มกว่าเดิมเพื่อให้เด่นบนสีเทา
    padding: "12px 15px",
    borderRadius: "14px",
    fontSize: "0.95rem",
    fontWeight: active ? "700" : "500",
    transition: "0.2s all ease"
  }),
  icon: { marginRight: '12px', fontSize: '1.1rem' },
  userProfile: { 
    paddingTop: '20px', 
    borderTop: '1px solid #e2e2e9', 
    display: 'flex', 
    alignItems: 'center' 
  },
  avatar: { width: '35px', height: '35px', background: '#dcdce5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#777' },
};