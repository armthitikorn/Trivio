'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function JoinPortalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [pin, setPin] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [nickname, setNickname] = useState('')
  const [department, setDepartment] = useState('')
  const [level, setLevel] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const urlPin = searchParams.get('pin')
    if (urlPin) {
      setPin(urlPin)
    }
  }, [searchParams])

  async function handleJoin() {
    if (!pin || pin.length < 6) return alert("กรุณากรอก PIN 6 หลักครับ")
    if (!employeeId || !nickname || !department) return alert("กรุณากรอกข้อมูลพนักงานให้ครบถ้วน")
    
    setLoading(true)

    try {
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

      const playerData = { employeeId, nickname, department, level }
      localStorage.setItem('temp_player_info', JSON.stringify(playerData))
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
        
        {/* หัวข้อ: ปรับให้หนาและเข้มขึ้น */}
        <h1 style={s.title}>ลงทะเบียนเข้าสอบ</h1>
        
        <div style={s.formGrid}>
          <p style={s.labelTag}>ระบุรหัสห้องสอบ (PIN)</p>
          <input 
            type="text" 
            placeholder="รหัส PIN 6 หลัก"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={s.inputPin}
          />

          <hr style={{ width: '100%', border: '1px solid #eee', margin: '15px 0' }} />

          <p style={s.labelTag}>ข้อมูลพนักงาน</p>
          <input 
            type="text" 
            placeholder="รหัสพนักงาน (เช่น EMP001)"
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
            <option value="DMTM">ฝ่ายขายTele (Sales)</option>
            <option value="Agent">ตัวแทน (sales)</option>
            <option value="ฺBroker">นายหน้า (Sales)</option>
            <option value="Bancassurance">ฝ่ายขายหน้าเคาท์เตอร์ธนาคาร (sales)</option>
            <option value="Spervisor">หัวหน้าฝ่ายขาย (TL)</option>
          </select>

          <select 
            value={level} 
            onChange={(e) => setLevel(e.target.value)} 
            style={s.select}
          >
            <option value="">เลือกระดับ (Level)</option>
            <option value="OB.TSRs">OB.TSRs</option>
            <option value="Nursery">Nursery</option>
            <option value="TSRs Exsiting">TSRs Exsiting</option>
          </select>
        </div>

        <button 
          onClick={handleJoin} 
          disabled={loading}
          style={s.btnPrimary}
        >
          {loading ? 'กำลังเข้าระบบ...' : '🚀 เริ่มทำแบบทดสอบ'}
        </button>
      </div>
    </div>
  )
}

export default function PlayerJoinPortal() {
  return (
    <Suspense fallback={<div>กำลังโหลด...</div>}>
      <JoinPortalContent />
    </Suspense>
  )
}

const s = {
  container: {
    minHeight: '100vh',
    background: '#f0f2f5', // เปลี่ยนจาก gradient เป็นสีพื้นที่สว่างแต่ไม่ขาวจ้าเกินไป
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: "'Inter', sans-serif",
    padding: '20px'
  },
  card: {
    background: 'white',
    padding: '40px 30px',
    borderRadius: '35px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '450px',
    border: '1px solid #ddd'
  },
  logoBox: {
    background: '#2d3436',
    color: 'white',
    padding: '8px 20px',
    borderRadius: '50px',
    display: 'inline-block',
    fontWeight: '900',
    fontSize: '0.9rem',
    marginBottom: '10px'
  },
  title: {
    color: '#000000', // ดำสนิท
    margin: '10px 0 25px 0',
    fontSize: '1.8rem',
    fontWeight: '800' // หนามาก
  },
  labelTag: {
    textAlign: 'left',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#6f42c1', // สีม่วงเข้มให้สะดุดตา
    marginBottom: '5px',
    marginLeft: '5px'
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '30px'
  },
  inputPin: {
    width: '100%',
    padding: '18px',
    fontSize: '2rem',
    textAlign: 'center',
    letterSpacing: '8px',
    borderRadius: '20px',
    border: '3px solid #6f42c1', // ขอบหนาขึ้น
    outline: 'none',
    background: '#f8f9ff',
    color: '#000000', // ตัวเลขที่พิมพ์เป็นสีดำสนิท
    fontWeight: '900',
    boxSizing: 'border-box'
  },
  inputSmall: {
    width: '100%',
    padding: '16px',
    fontSize: '1.1rem',
    borderRadius: '15px',
    border: '2px solid #ddd',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#000000', // ตัวหนังสือดำสนิท
    fontWeight: '600' // ตัวหนาปานกลาง
  },
  select: {
    width: '100%',
    padding: '16px',
    fontSize: '1.1rem',
    borderRadius: '15px',
    border: '2px solid #ddd',
    background: 'white',
    cursor: 'pointer',
    boxSizing: 'border-box',
    color: '#000000', // ตัวหนังสือดำสนิท
    fontWeight: '600'
  },
  btnPrimary: {
    width: '100%',
    padding: '20px',
    background: '#1a1a1a', // สีดำเข้ม
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    fontSize: '1.2rem',
    fontWeight: '800', // หนามาก
    cursor: 'pointer',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    transition: '0.2s'
  }
}