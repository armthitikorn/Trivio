'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function RootLayout({ children }) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'หน้าหลัก', icon: '🏠', path: '/' },
    { name: 'Video Trainer', icon: '🎬', path: '/trainer/video-creator' },
    { name: 'Audio Creator', icon: '🎙️', path: '/admin/create-audio' },
    { name: 'ระบบ Quiz', icon: '📝', path: '/host' },
    { name: 'ศูนย์ตรวจงาน', icon: '📊', path: '/admin/review-answers' },
    { name: 'คะแนนของฉัน', icon: '🎖️', path: '/play/my-results' },
    { name: 'คะแนนยอดเยี่ยม', icon: '👑', path: '/play/leaderboard' }, // ✨ เพิ่มตรงนี้
    
  ];

  return (
    <html lang="th">
      <body style={{ margin: 0, display: 'flex', minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Inter', sans-serif" }}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          <div style={s.logoArea}>
            <h2 style={{ color: '#8e44ad', margin: 0, fontWeight: 800 }}>TRIVIO</h2>
            <div style={{ fontSize: '0.7rem', color: '#aaa' }}>Learning Management</div>
          </div>
          <nav style={{ flex: 1, marginTop: '30px' }}>
            {menuItems.map((item) => (
              <Link key={item.path} href={item.path} style={s.navItem(pathname === item.path)}>
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <span style={{ marginLeft: '12px' }}>{item.name}</span>
              </Link>
            ))}
          </nav>
          <div style={s.footer}>
            <div style={s.avatar}>R</div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Rugthiti</div>
              <div style={{ fontSize: '0.7rem', color: '#888' }}>Administrator</div>
            </div>
          </div>
        </aside>
        <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>{children}</main>
      </body>
    </html>
  );
}

const s = {
  sidebar: { width: '260px', background: 'white', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', padding: '25px', height: '100vh', position: 'sticky', top: 0 },
  logoArea: { paddingBottom: '20px', borderBottom: '1px solid #f5f5f5' },
  navItem: (active) => ({ display: 'flex', alignItems: 'center', padding: '12px 18px', borderRadius: '12px', marginBottom: '8px', textDecoration: 'none', color: active ? '#8e44ad' : '#555', background: active ? '#f5f3ff' : 'transparent', fontWeight: active ? 'bold' : '500', transition: '0.2s' }),
  footer: { borderTop: '1px solid #eee', paddingTop: '20px', display: 'flex', gap: '12px', alignItems: 'center' },
  avatar: { width: '35px', height: '35px', borderRadius: '50%', background: '#8e44ad', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }
};