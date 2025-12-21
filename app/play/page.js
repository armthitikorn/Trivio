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
    if (urlPin) setPin(urlPin)
  }, [searchParams])

  // ✨ ฟังก์ชันจัดการการเข้าห้องสอบ
  const handleJoin = async (e) => {
    e.preventDefault(); // ป้องกันหน้าเว็บ Refresh ตัวเอง
    
    if (!pin || pin.length < 6) return alert("กรุณากรอก PIN 6 หลัก")
    if (!employeeId || !nickname) return alert("กรุณากรอกข้อมูลพนักงานให้ครบ")
    
    setLoading(true)
    console.log("กำลังตรวจสอบ PIN:", pin)

    try {
      // 1. ดึงข้อมูลจาก Supabase (เช็คทั้ง ID และ Category)
      const { data: session, error } = await supabase
        .from('game_sessions')
        .select('id, category, is_active') 
        .eq('pin_code', pin)
        .single()

      if (error || !session) {
        console.error("Supabase Error:", error)
        alert("❌ ไม่พบ PIN นี้ หรือรหัสผิด (โปรดตรวจสอบในตาราง game_sessions)")
        setLoading(false)
        return
      }

      console.log("พบห้องสอบ:", session)

      // 2. บันทึกข้อมูลลง LocalStorage
      const playerData = { employeeId, nickname, department, level }
      localStorage.setItem('temp_player_info', JSON.stringify(playerData))

      // 3. ✨ ระบบนำทาง (Redirect Logic) ✨
      // ตรวจสอบว่า Category ตรงกับที่เทรนเนอร์สร้างไหม
      if (session.category === 'AudioArena') {
        console.log("ไปที่หน้าโจทย์เสียง...");
        router.push(`/play/audio/${session.id}`);
      } else {
        console.log("ไปที่หน้าควิซปกติ...");
        router.push(`/play/quiz-practice/${session.id}`);
      }

    } catch (err) {
      console.error("Catch Error:", err)
      setLoading(false)
    }
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.logoBox}>🎮 TRIVIO PLAY</div>
        <h1 style={s.title}>ลงทะเบียนเข้าสอบ</h1>
        
        <form onSubmit={handleJoin} style={s.formGrid}>
          <p style={s.labelTag}>รหัส PIN (6 หลัก)</p>
          <input 
            type="text" 
            placeholder="000000"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={s.inputPin}
          />

          <hr style={{ border: '1px solid #eee', margin: '10px 0' }} />

          <p style={s.labelTag}>รหัสพนักงาน / ชื่อเล่น</p>
          <input 
            type="text" placeholder="รหัสพนักงาน" value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)} style={s.inputSmall}
          />
          <input 
            type="text" placeholder="ชื่อเล่น" value={nickname}
            onChange={(e) => setNickname(e.target.value)} style={s.inputSmall}
          />

          <p style={s.labelTag}>แผนก / ระดับ</p>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} style={s.select}>
            <option value="">เลือกแผนก</option>
            <option value="DMTM">ฝ่ายขาย Tele</option>
            <option value="Agent">ตัวแทน</option>
          </select>

          <select value={level} onChange={(e) => setLevel(e.target.value)} style={s.select}>
            <option value="">เลือกระดับ</option>
            <option value="Nursery">Nursery</option>
            <option value="Rising Star">Rising Star</option>
          </select>

          <button type="submit" disabled={loading} style={s.btnPrimary}>
            {loading ? 'กำลังเข้าระบบ...' : '🚀 เริ่มทำแบบทดสอบ'}
          </button>
        </form>
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
  container: { minHeight: '100vh', background: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
  card: { background: 'white', padding: '40px 30px', borderRadius: '35px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', textAlign: 'center', width: '100%', maxWidth: '450px', border: '2px solid #ddd' },
  logoBox: { background: '#2d3436', color: 'white', padding: '8px 20px', borderRadius: '50px', display: 'inline-block', fontWeight: '900', fontSize: '0.9rem', marginBottom: '10px' },
  title: { color: '#000000', margin: '10px 0 25px 0', fontSize: '2rem', fontWeight: '900' },
  labelTag: { textAlign: 'left', fontSize: '1rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '5px', marginLeft: '5px' },
  formGrid: { display: 'flex', flexDirection: 'column', gap: '15px' },
  inputPin: { width: '100%', padding: '18px', fontSize: '2.5rem', textAlign: 'center', letterSpacing: '8px', borderRadius: '20px', border: '3px solid #6f42c1', background: '#f8f9ff', color: '#000', fontWeight: '900', boxSizing: 'border-box' },
  inputSmall: { width: '100%', padding: '16px', fontSize: '1.2rem', borderRadius: '15px', border: '2px solid #1a1a1a', color: '#000', fontWeight: '800', boxSizing: 'border-box' },
  select: { width: '100%', padding: '16px', fontSize: '1.2rem', borderRadius: '15px', border: '2px solid #1a1a1a', background: 'white', color: '#000', fontWeight: '800' },
  btnPrimary: { width: '100%', padding: '22px', background: '#000', color: '#fff', border: 'none', borderRadius: '20px', fontSize: '1.4rem', fontWeight: '900', cursor: 'pointer', marginTop: '10px' }
}