'use client'
import Link from 'next/link'

export default function EnhancedDashboard() {
  return (
    <div>
      <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1a1a1a' }}>ยินดีต้อนรับสู่ TRIVIO</h1>
      <p style={{ color: '#666' }}>ระบบบริหารจัดการการเรียนรู้และประเมินผลอัจฉริยะ</p>

      {/* --- 👨‍💼 โซนสำหรับพนักงาน (พนักงานเห็นส่วนนี้) --- */}
      <h3 style={{ marginTop: '40px', color: '#8e44ad' }}>🚀 สำหรับพนักงาน (Employee Zone)</h3>
      <div style={ds.grid}>
        <Link href="/play/audio" style={{ textDecoration: 'none' }}>
         <div style={{ /* ใส่สไตล์เดียวกับปุ่มวิดีโอ */ }}>
         <span style={{ fontSize: '2rem' }}>🎙️</span>
         <h3>เริ่มทำแบบทดสอบเสียง</h3>
         <p>กดเพื่อเข้าสู่ระบบทดสอบการฟัง</p>
         </div>
        </Link>
        <Link href="/play/video" style={ds.playCard}>
          <div style={ds.iconCircle('#f5f3ff', '#8e44ad')}>🎬</div>
          <div>
            <h4 style={{ margin: 0 }}>เริ่มทำแบบทดสอบวิดีโอ</h4>
            <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#777' }}>กดเพื่อเริ่มดูโจทย์และอัดวิดีโอส่งงาน</p>
          </div>
        </Link>
        <Link href="/play/my-results" style={ds.playCard}>
          <div style={ds.iconCircle('#fff7ed', '#f97316')}>🎖️</div>
          <div>
            <h4 style={{ margin: 0 }}>เช็คคะแนนของฉัน</h4>
            <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#777' }}>ดูผลการประเมินจากหัวหน้างาน</p>
          </div>
        </Link>
      </div>

      {/* --- 🛠️ โซนสำหรับหัวหน้า (Management Zone) --- */}
      <h3 style={{ marginTop: '50px', color: '#444' }}>⚙️ การจัดการ (Supervisor Zone)</h3>
      <div style={ds.grid}>
        <QuickCard href="/trainer/video-creator" icon="📹" title="จัดการโจทย์วิดีโอ" desc="สร้างโจทย์และแชร์ลิงก์ให้ทีม" color="#f1f3f5" />
        <QuickCard href="/admin/review-answers" icon="📊" title="ศูนย์ตรวจประเมิน" desc="ตรวจงานวิดีโอและให้คะแนน" color="#f1f3f5" />
        <QuickCard href="/play/leaderboard" icon="👑" title="ทำเนียบคนเก่ง" desc="ดูอันดับคะแนนยอดเยี่ยม" color="#f1f3f5" />
        <QuickCard href="/play/audio-game" icon="🎙️" title="โจทน์เสียง" desc="ทำแบบทดสอบเสียง" color="#f1f3f5" />
      </div>
    </div>
  );
}

function QuickCard({ href, icon, title, desc, color }) {
  return (
    <Link href={href} style={{ ...ds.card, background: color }}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <div>
        <h4 style={{ margin: 0 }}>{title}</h4>
        <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#777' }}>{desc}</p>
      </div>
    </Link>
  );
}

const ds = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '15px' },
  playCard: { display: 'flex', alignItems: 'center', gap: '20px', padding: '25px', background: 'white', borderRadius: '25px', textDecoration: 'none', color: 'inherit', border: '1px solid #e0e0e0', boxShadow: '0 10px 20px rgba(0,0,0,0.03)', transition: '0.3s' },
  card: { display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', borderRadius: '20px', textDecoration: 'none', color: 'inherit', border: '1px solid #eee' },
  iconCircle: (bg, color) => ({ width: '60px', height: '60px', borderRadius: '50%', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' })
};