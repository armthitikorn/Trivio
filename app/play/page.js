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

  const handleJoin = async (e) => {
    e.preventDefault();
    
    if (!pin || pin.length < 6) return alert("กรุณากรอก PIN 6 หลัก")
    if (!employeeId || !nickname) return alert("กรุณากรอกข้อมูลพนักงานให้ครบ")
    
    setLoading(true)

    try {
      // 1. ตรวจสอบ PIN ในฐานข้อมูล
      const { data: session, error } = await supabase
        .from('game_sessions')
        .select('id, category, is_active') 
        .eq('pin_code', pin)
        .single()

      if (error || !session) {
        alert("❌ ไม่พบรหัส PIN นี้ กรุณาตรวจสอบอีกครั้ง")
        setLoading(false)
        return
      }

      // 2. บันทึกข้อมูลพนักงานลงเครื่อง (LocalStorage) ไว้ใช้ในหน้าถัดไป
      const playerData = { employeeId, nickname, department, level }
      localStorage.setItem('temp_player_info', JSON.stringify(playerData))

      // 3. ✨ ส่งพนักงานไปหน้าทำข้อสอบตาม Category
      if (session.category === 'AudioArena') {
        router.push(`/play/audio/${session.id}`);
      } else {
        // วิ่งไปที่หน้าปรนัยที่เราเพิ่งแก้เรื่องคะแนนกันครับ
        router.push(`/play/quiz-practice/${session.id}`);
      }

    } catch (err) {
      console.error("Join Error:", err)
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

          <p style={s.labelTag}>ข้อมูลพนักงาน</p>
          <input 
            type="text" placeholder="รหัสพนักงาน" value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)} style={s.inputSmall}
          />
          <input 
            type="text" placeholder="ชื่อเล่น" value={nickname}
            onChange={(e) => setNickname(e.target.value)} style={s.inputSmall}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
          </div>

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
    <Suspense fallback={<div style={{textAlign:'center', padding:'50px'}}>กำลังโหลดหน้าลงทะเบียน...</div>}>
      <JoinPortalContent />
    </Suspense>
  )
}

const s = {
  container: { minHeight: '100vh', background: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' },
  card: { background: 'white', padding: '40px 30px', borderRadius: '35px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', textAlign: 'center', width: '100%', maxWidth: '450px', border: '1px solid #ddd' },
  logoBox: { background: '#2d3436', color: 'white', padding: '8px 20px', borderRadius: '50px', display: 'inline-block', fontWeight: '900', fontSize: '0.8rem', marginBottom: '15px' },
  title: { color: '#000', margin: '0 0 25px 0', fontSize: '1.8rem', fontWeight: '900' },
  labelTag: { textAlign: 'left', fontSize: '0.9rem', fontWeight: '900', color: '#333', marginBottom: '5px', marginLeft: '5px' },
  formGrid: { display: 'flex', flexDirection: 'column', gap: '15px' },
  inputPin: { width: '100%', padding: '15px', fontSize: '2.2rem', textAlign: 'center', letterSpacing: '8px', borderRadius: '15px', border: '2px solid #6f42c1', background: '#f8f9ff', color: '#000', fontWeight: '900', boxSizing: 'border-box' },
  inputSmall: { width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '12px', border: '1px solid #ddd', boxSizing: 'border-box' },
  select: { width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '12px', border: '1px solid #ddd', background: 'white' },
  btnPrimary: { width: '100%', padding: '18px', background: '#000', color: '#fff', border: 'none', borderRadius: '15px', fontSize: '1.2rem', fontWeight: '900', cursor: 'pointer', marginTop: '10px' }
}