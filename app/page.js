'use client'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1a1a1a' }}>ยินดีต้อนรับสู่ระบบเทรนนิ่ง</h1>
        <p style={{ color: '#666', marginTop: '5px' }}>เลือกโหมดการใช้งานที่คุณต้องการจากเมนูด่วนด้านล่าง</p>
      </header>

      {/* การ์ดสรุปสถานะ (ตัวอย่าง) */}
      <div style={dashStyles.statsRow}>
        <div style={dashStyles.statCard}>
          <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>วิดีโอรอตรวจ</p>
          <h2 style={{ margin: '10px 0', fontSize: '1.8rem', color: '#8e44ad' }}>12 รายการ</h2>
        </div>
        <div style={dashStyles.statCard}>
          <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>พนักงานที่เรียนจบแล้ว</p>
          <h2 style={{ margin: '10px 0', fontSize: '1.8rem' }}>1,254 คน</h2>
        </div>
      </div>

      <h3 style={{ marginTop: '40px', marginBottom: '20px' }}>🚀 เมนูด่วน (Quick Access)</h3>
      <div style={dashStyles.grid}>
        
        {/* ลิงก์ไปหน้าอัดวิดีโอ (ที่เราเพิ่งทำเสร็จ) */}
        <Link href="/trainer/video-creator" style={dashStyles.actionCard}>
          <div style={dashStyles.iconBox('#f5f3ff', '#8e44ad')}>📹</div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Video Trainer</h4>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>สร้างและบันทึกโจทย์วิดีโอ (จำกัด 10MB)</p>
          </div>
        </Link>

        {/* ลิงก์ไปหน้าเสียง */}
        <Link href="/admin/create-audio" style={dashStyles.actionCard}>
          <div style={dashStyles.iconBox('#fff7ed', '#f97316')}>🎙️</div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Audio Creator</h4>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>สร้างบทฝึกฝนด้วยเสียงแบบบทบาทสมมติ</p>
          </div>
        </Link>

        {/* ลิงก์ไปหน้าปรนัยเดิม */}
        <Link href="/host" style={dashStyles.actionCard}>
          <div style={dashStyles.iconBox('#ecfdf5', '#10b981')}>📝</div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Quiz Management</h4>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>จัดการระบบควิซปรนัย SupaQuiz เดิม</p>
          </div>
        </Link>

      </div>
    </div>
  );
}

const dashStyles = {
  statsRow: { display: 'flex', gap: '20px', marginBottom: '30px' },
  statCard: { background: 'white', padding: '25px', borderRadius: '24px', flex: 1, border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
  actionCard: { display: 'flex', alignItems: 'center', gap: '20px', padding: '25px', background: 'white', borderRadius: '24px', textDecoration: 'none', color: 'inherit', border: '1px solid #f0f0f0', transition: '0.3s' },
  iconBox: (bg, color) => ({ width: '60px', height: '60px', borderRadius: '18px', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' })
};