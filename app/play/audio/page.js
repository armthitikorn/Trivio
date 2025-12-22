'use client'
import { useState, useEffect, Suspense } from 'react' 
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'

function RegistrationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // --- States ข้อมูลพนักงาน (เน้นความคมชัด) ---
  const [fullname, setFullname] = useState('')
  const [pin, setPin] = useState('')
  const [department, setDepartment] = useState('UOB')
  const [level, setLevel] = useState('Nursery')
  const [loading, setLoading] = useState(false)

  const departments = ['UOB', 'AYCAP', 'ttb', 'Krungsri', 'Bancassurance', 'Agent', 'Broker', 'DMTM']
  const levels = ['Nursery', 'Rising Star', 'Legend']

  // ดึง PIN จาก URL อัตโนมัติ (ถ้ามีคนแชร์ลิงก์แบบระบุ PIN มา)
  useEffect(() => {
    const urlPin = searchParams.get('pin')
    if (urlPin) setPin(urlPin)
  }, [searchParams])

  async function handleJoin() {
    if (!fullname || !pin) return alert('❌ กรุณากรอกชื่อและ PIN ให้ครบถ้วนครับ')
    setLoading(true)

    try {
      // ค้นหา Session จากตาราง game_sessions โดยใช้ PIN
      const { data: session, error } = await supabase
        .from('game_sessions')
        .select('*') 
        .eq('pin', pin.trim())
        .single()

      if (error || !session) {
        alert('❌ ไม่พบรหัส PIN นี้ในระบบ กรุณาตรวจสอบเลขจากเทรนเนอร์อีกครั้ง')
        setLoading(false)
        return
      }

      // บันทึกข้อมูลลง LocalStorage (ใช้ Key เดิมที่คุณต้องการ)
      localStorage.setItem('player_name', fullname)
      localStorage.setItem('player_dept', department) 
      localStorage.setItem('player_level', level)
      localStorage.setItem('room_segment', session.target_level || '') 

      // 🚀 ส่งตัวไปที่หน้าทำแบบทดสอบเสียง (Path ที่คุณกำหนด)
      router.push(`/play/audio-game/${session.id}`)
      
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.iconHeader}>🎙️</div>
        <h2 style={s.title}>AUDIO ARENA</h2>
        <p style={s.subtitle}>ลงทะเบียนเข้าสู่บททดสอบการสนทนา</p>
        
        <label style={s.label}>ชื่อ-นามสกุล (ชื่อเล่น):</label>
        <input type="text" placeholder="พิมพ์ชื่อของคุณที่นี่" value={fullname} onChange={(e) => setFullname(e.target.value)} style={s.input} />

        <label style={s.label}>รหัส PIN 6 หลัก (จากเทรนเนอร์):</label>
        <input type="text" maxLength={6} placeholder="000000" value={pin} onChange={(e) => setPin(e.target.value)} style={s.pinInput} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
                <label style={s.label}>แผนก:</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} style={s.input}>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            <div>
                <label style={s.label}>ระดับ (Level):</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)} style={s.input}>
                    {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
            </div>
        </div>

        <button onClick={handleJoin} disabled={loading} style={s.btn(loading)}>
          {loading ? 'กำลังเข้าระบบ...' : '🚀 เริ่มทำแบบทดสอบ (GO!)'}
        </button>
      </div>
    </div>
  )
}

export default function PlayerRegistration() {
  return (
    <Suspense fallback={<div style={{color:'#000', textAlign:'center', paddingTop:'50px', fontWeight: 'bold'}}>กำลังโหลด...</div>}>
      <RegistrationForm />
    </Suspense>
  )
}

// ✨ Styles: ปรับใหม่ให้ High Contrast (ตัวดำสนิท หนาชัดเจน)
const s = {
  page: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5', padding: '20px', fontFamily: "sans-serif" },
  card: { background: 'white', padding: '40px', borderRadius: '35px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', textAlign: 'left', border: '2px solid #ddd' },
  iconHeader: { fontSize: '3.5rem', textAlign: 'center', marginBottom: '10px' },
  title: { textAlign: 'center', color: '#000', marginBottom: '5px', fontWeight: '900', fontSize: '2.2rem' }, // ดำหนา
  subtitle: { textAlign: 'center', color: '#444', marginBottom: '30px', fontSize: '1rem', fontWeight: '700' },
  label: { display: 'block', marginTop: '15px', fontWeight: '900', color: '#000', fontSize: '1rem' }, // ป้ายชื่อหนาชัดเจน
  input: { width: '100%', padding: '15px', marginTop: '5px', borderRadius: '15px', border: '2.5px solid #000', boxSizing: 'border-box', fontSize: '1.1rem', fontWeight: '700', color: '#000' }, // ขอบดำหนา
  pinInput: { width: '100%', padding: '15px', marginTop: '5px', borderRadius: '15px', border: '4px solid #000', boxSizing: 'border-box', textAlign: 'center', fontSize: '2rem', fontWeight: '900', color: '#000', background: '#f8f9ff' }, // PIN ใหญ่พิเศษ
  btn: (loading) => ({ width: '100%', padding: '22px', marginTop: '35px', background: loading ? '#666' : '#000', color: 'white', border: 'none', borderRadius: '20px', cursor: loading ? 'default' : 'pointer', fontWeight: '900', fontSize: '1.3rem', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' })
}