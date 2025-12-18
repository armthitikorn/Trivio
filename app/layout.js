'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
export const metadata = {
  title: 'TRIVIO - Internal System',
  description: 'Assessment system for employees',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}
export default function RootLayout({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // 1. เช็คสถานะการ Login ปัจจุบัน
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (!session && pathname !== '/login') {
        router.push('/login')
      }
    })

    // 2. ติดตามการเปลี่ยนแปลงสถานะ (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session && pathname !== '/login') {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [pathname, router])

  if (loading) return null // หรือใส่ Loading Spinner สวยๆ
  if (!session && pathname === '/login') return <html lang="th"><body>{children}</body></html>
  if (!session) return null

  // รายการเมนูสำหรับคนที่ Login แล้วเท่านั้น
  const menuItems = [
    { name: 'หน้าหลัก', icon: '🏠', path: '/' },
    { name: 'คะแนนยอดเยี่ยม', icon: '👑', path: '/play/leaderboard' },
    { name: 'Video Trainer', icon: '🎬', path: '/trainer/video-creator' },
    { name: 'Audio Creator', icon: '🎙️', path: '/admin/create-audio' },
    { name: 'ศูนย์ตรวจงาน', icon: '🔍', path: '/admin/review-answers' },
    { name: 'คะแนนของฉัน', icon: '🎖️', path: '/play/my-results' },
  ];

  return (
    <html lang="th">
      <body style={{ margin: 0, display: 'flex', minHeight: '100vh', background: '#f8f9fa' }}>
        <aside style={s.sidebar}>
          <div style={s.logoArea}><h2 style={{color:'#8e44ad', margin:0}}>TRIVIO</h2></div>
          <nav style={{ flex: 1, marginTop: '20px' }}>
            {menuItems.map((item) => (
              <Link key={item.path} href={item.path} style={s.navItem(pathname === item.path)}>
                <span>{item.icon}</span>
                <span style={{ marginLeft: '12px' }}>{item.name}</span>
              </Link>
            ))}
          </nav>
          <button onClick={() => supabase.auth.signOut()} style={s.logoutBtn}>🚪 ออกจากระบบ</button>
        </aside>
        <main style={{ flex: 1, padding: '40px' }}>{children}</main>
      </body>
    </html>
  );
}

const s = {
  sidebar: { width: '260px', background: 'white', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', padding: '25px', height: '100vh', position: 'sticky', top: 0 },
  logoArea: { paddingBottom: '20px', borderBottom: '1px solid #f5f5f5' },
  navItem: (active) => ({ display: 'flex', alignItems: 'center', padding: '12px 18px', borderRadius: '12px', marginBottom: '8px', textDecoration: 'none', color: active ? '#8e44ad' : '#555', background: active ? '#f5f3ff' : 'transparent', fontWeight: active ? 'bold' : '500' }),
  logoutBtn: { padding: '12px', background: '#fff0f0', color: '#ff4d4d', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }
};