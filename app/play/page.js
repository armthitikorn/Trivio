'use client'
import { useState, useEffect } from 'react' // ✨ เพิ่ม useEffect ตรงนี้
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function PlayerJoinPortal() {
  const router = useRouter()
  
  // --- States สำหรับข้อมูลพนักงาน ---
  const [pin, setPin] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [nickname, setNickname] = useState('')
  const [department, setDepartment] = useState('')
  const [level, setLevel] = useState('')
  
  const [loading, setLoading] = useState(false)

  // ✨ ฟังก์ชันพิเศษ: ถ้าสแกน QR Code มา มันจะเอา PIN มาใส่ในช่องให้เองอัตโนมัติ
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const pinFromUrl = queryParams.get('pin');
    if (pinFromUrl) {
      setPin(pinFromUrl);
    }
  }, []);

  async function handleJoin() {
    // 1. ตรวจสอบข้อมูลให้ครบ
    if (!pin || pin.length < 6) return alert("กรุณากรอก PIN 6 หลักครับ")
    if (!employeeId || !nickname || !department) return alert("กรุณากรอกข้อมูลพนักงานให้ครบถ้วน")
    
    setLoading(true)

    try {
      // 2. ค้นหา Session จาก PIN
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

      if (!session.is_active) {
         alert("🔒 ห้องสอบนี้ปิดไปแล้วครับ")
         setLoading(false)
         return
      }

      // 3. ✨ บันทึกข้อมูลพนักงานลง Temporary Storage (localStorage)
      const playerData = {
        employeeId,
        nickname,
        department,
        level
      }
      localStorage.setItem('temp_player_info', JSON.stringify(playerData))

      // 4. ส่งไปหน้าทำข้อสอบ
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
        <div style={s.logoBox}>🎮 TRIVIO PLAY</div>
        
        <h1 style={{ color: '#2d3436', margin: '15px 0', fontSize:'1.5rem' }}>ลงทะเบียนเข้าสอบ</h1>
        
        <div style={s.formGrid}>
          {/* PIN Input - เด่นที่สุด */}
          <input 
            type="text" 
            placeholder="รหัส PIN 6 หลัก"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={s.inputPin}
          />

          <hr style={{ width: '100%', border: '0.5px solid #eee', margin: '10px 0' }} />

          <input 
            type="text" 
            placeholder="รหัสพนักงาน"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            style={s.inputSmall}
          />

          <input 
            type="text" 
            placeholder="ชื่อ-นามสกุล (หรือชื่อเล่น)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={s.inputSmall}
          />

          <select 
            value={department} 
            onChange={(e) => setDepartment(e.target.value)} 
            style={s.select}
          >
            <option value="">เลือกแผนก</option>
            <option value="Sales">ฝ่ายขาย (Sales)</option>
            <option value="Marketing">การตลาด (Marketing)</option>
            <option value="IT">ไอที (IT)</option>
            <option value="HR">บุคคล (HR)</option>
            <option value="Operations">ปฏิบัติการ (Operations)</option>
          </select>

          <select 
            value={level} 
            onChange={(e) => setLevel(e.target.value)} 
            style={s.select}
          >
            <option value="">เลือกระดับ (Level)</option>
            <option value="Staff">Staff</option>
            <option value="Supervisor">Supervisor</option>
            <option value="Manager">Manager</option>
          </select>
        </div>

        <button 
          onClick={handleJoin} 
          disabled={loading}
          style={s.btnPrimary}
        >
          {loading ? 'กำลังเข้าสู่ห้องสอบ...' : '🚀 เริ่มทำแบบทดสอบ'}
        </button>

      </div>
    </div>
  )
}

const s = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: "'Inter', sans-serif",
    padding: '20px'
  },
  card: {
    background: 'white',
    padding: '30px',
    borderRadius: '30px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '400px',
  },
  logoBox: {
    background: '#2d3436',
    color: 'white',
    padding: '6px 15px',
    borderRadius: '50px',
    display: 'inline-block',
    fontWeight: 'bold',
    fontSize: '0.8rem',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '25px'
  },
  inputPin: {
    width: '100%',
    padding: '15px',
    fontSize: '1.8rem',
    textAlign: 'center',
    letterSpacing: '5px',
    borderRadius: '15px',
    border: '2px solid #6f42c1',
    outline: 'none',
    background: '#f8f9ff',
    color: '#6f42c1',
    fontWeight: 'bold',
    boxSizing: 'border-box'
  },
  inputSmall: {
    width: '100%',
    padding: '12px',
    fontSize: '1rem',
    borderRadius: '10px',
    border: '1px solid #ddd',
    outline: 'none',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '1rem',
    borderRadius: '10px',
    border: '1px solid #ddd',
    background: 'white',
    cursor: 'pointer',
    boxSizing: 'border-box'
  },
  btnPrimary: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(45deg, #6f42c1, #8e44ad)',
    color: 'white',
    border: 'none',
    borderRadius: '15px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(111, 66, 193, 0.3)',
  }
}