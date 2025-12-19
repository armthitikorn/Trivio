'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function PlayerJoinPortal() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    // 1. ตรวจสอบเบื้องต้น
    if (!pin || pin.length < 6) return alert("กรุณากรอก PIN 6 หลักให้ครบครับ")
    setLoading(true)

    try {
      // 2. ค้นหา Session จาก PIN ในฐานข้อมูล
      const { data: session, error } = await supabase
        .from('game_sessions')
        .select('id, is_active')
        .eq('pin_code', pin)
        .single()

      if (error || !session) {
        alert("❌ ไม่พบห้องสอบนี้ หรือ PIN ผิดครับ")
        setLoading(false)
        return
      }

      // เช็คว่าห้องปิดหรือยัง
      if (!session.is_active) {
         alert("🔒 ห้องสอบนี้ปิดไปแล้วครับ")
         setLoading(false)
         return
      }

      // 3. ✨ จุดสำคัญ: ส่งไปหน้าทำข้อสอบแบบ Self-Paced (SoloQuizGame)
      // เราส่ง Session ID ไปด้วย เพื่อให้หน้าถัดไปรู้ว่าต้องดึงโจทย์ชุดไหน
      router.push(`/play/quiz-practice/${session.id}`)

    } catch (err) {
      console.error(err)
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ")
      setLoading(false)
    }
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        {/* Logo Branding */}
        <div style={s.logoBox}>🎮 TRIVIO PLAY</div>
        
        <h1 style={{ color: '#2d3436', margin: '20px 0', fontSize:'1.8rem' }}>เข้าสู่แบบทดสอบ</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>กรอกรหัส PIN ที่ได้รับจากหัวหน้า</p>

        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="PIN Code"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))} // พิมพ์ได้แค่ตัวเลข
            style={s.input}
          />
        </div>

        <button 
          onClick={handleJoin} 
          disabled={loading}
          style={s.btnPrimary}
        >
          {loading ? 'กำลังค้นหาห้อง...' : '🚀 เข้าทำแบบทดสอบ'}
        </button>

        <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <p style={{ fontSize: '0.85rem', color: '#999' }}>
            หรือ <a href="/play/leaderboard" style={{ color: '#6f42c1', fontWeight: 'bold', textDecoration: 'none' }}>ดูทำเนียบคนเก่ง (Leaderboard)</a>
          </p>
        </div>
      </div>
    </div>
  )
}

// --- Styles (ธีม Soft Pastel สบายตา) ---
const s = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // สีพาสเทลยอดฮิต (มิ้นต์-ชมพูอ่อน)
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: "'Inter', sans-serif",
    padding: '20px'
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '30px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '420px',
    animation: 'fadeIn 0.5s ease-out'
  },
  logoBox: {
    background: '#2d3436',
    color: 'white',
    padding: '8px 20px',
    borderRadius: '50px',
    display: 'inline-block',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    letterSpacing: '1.5px',
    marginBottom: '10px'
  },
  input: {
    width: '100%',
    padding: '18px',
    fontSize: '1.8rem',
    textAlign: 'center',
    letterSpacing: '8px',
    borderRadius: '15px',
    border: '2px solid #f0f0f0',
    outline: 'none',
    background: '#fafafa',
    marginBottom: '20px',
    color: '#333',
    fontWeight: 'bold',
    transition: 'border 0.2s'
  },
  btnPrimary: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(45deg, #6f42c1, #8e44ad)', // สีม่วงไล่เฉด ทันสมัย
    color: 'white',
    border: 'none',
    borderRadius: '15px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(111, 66, 193, 0.3)',
    transition: 'transform 0.1s'
  }
}