'use client'
import { useRouter } from 'next/navigation'

export default function TrainerPortal() {
  const router = useRouter()

  const menuItems = [
    {
      title: '🎙️ Audio Roleplay',
      desc: 'สร้าง PIN สำหรับฝึกพูดโต้ตอบ (แยกตามแผนก/ระดับ)',
      path: '/dashboard', // ลิงก์ไปหน้าสร้าง PIN เสียง
      color: '#6f42c1'
    },
    {
      title: '⚡ Quiz Mission',
      desc: 'สร้างบททดสอบปรนัย วัดความรู้สคริปต์และผลิตภัณฑ์',
      path: '/host/quiz', // ลิงก์ไปหน้าจัดการ Quiz
      color: '#007bff'
    },
    {
      title: '✍️ Content Creator',
      desc: 'อัดเสียงโจทย์ใหม่ หรือเพิ่มข้อสอบเข้าคลังข้อมูล',
      path: '/admin/create-audio', 
      color: '#e21b3c'
    },
    {
      title: '📊 Results & Monitoring',
      desc: 'ดูคะแนนพนักงาน ฟังเสียงย้อนหลัง และประเมินผล',
      path: '/trainer/results',
      color: '#28a745'
    }
  ]

  return (
    <div style={{ padding: '60px 20px', background: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#333' }}>🛠️ Trainer Control Center</h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>ยินดีต้อนรับ Supervisor! กรุณาเลือกเครื่องมือที่ต้องการใช้งาน</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '25px' }}>
          {menuItems.map((item) => (
            <div 
              key={item.title}
              onClick={() => router.push(item.path)}
              style={cardStyle}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-10px)';
                e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.05)';
              }}
            >
              <div style={{ ...iconCircle, background: item.color + '15', color: item.color }}>
                {item.title.split(' ')[0]}
              </div>
              <h3 style={{ color: item.color, margin: '15px 0 10px 0' }}>{item.title}</h3>
              <p style={{ color: '#777', fontSize: '0.9rem', lineHeight: '1.5' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// สไตล์ตกแต่ง
const cardStyle = {
  background: 'white',
  padding: '30px',
  borderRadius: '25px',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.3s ease',
  boxShadow: '0 5px 15px rgba(0,0,0,0.05)',
  border: '1px solid #eee'
}

const iconCircle = {
  width: '70px',
  height: '70px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2rem',
  margin: '0 auto'
}