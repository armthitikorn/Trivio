'use client'
import { useState, Suspense } from 'react' // เพิ่ม Suspense
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

function RegistrationForm() {
  const [fullname, setFullname] = useState('')
  const [pin, setPin] = useState('')
  const [department, setDepartment] = useState('UOB')
  const [level, setLevel] = useState('Nursery')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const departments = ['UOB', 'AYCAP', 'ttb', 'Krungsri', 'Bancassurance', 'Agent', 'Broker', 'DMTM']
  const levels = ['Nursery', 'Rising Star', 'Legend']

  async function handleJoin() {
    if (!fullname || !pin) return alert('กรุณากรอกชื่อและ PIN ให้ครบถ้วน')
    setLoading(true)

    try {
      const { data: session, error } = await supabase
        .from('game_sessions')
        .select('id, target_department, target_segment') 
        .eq('pin_code', pin.trim())
        .single()

      if (error || !session) {
        alert('❌ ไม่พบรหัส PIN นี้ในระบบ กรุณาตรวจสอบอีกครั้ง')
        setLoading(false)
        return
      }

      // บันทึกข้อมูลลง LocalStorage (ตามเดิมของคุณ)
      localStorage.setItem('player_name', fullname)
      localStorage.setItem('player_dept', department) 
      localStorage.setItem('player_level', level)
      localStorage.setItem('room_segment', session.target_segment)

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
        <h2 style={s.title}>Registration</h2>
        <p style={s.subtitle}>แบบทดสอบทักษะการฟังและการตอบกลับ</p>
        
        <label style={s.label}>ชื่อ-นามสกุล:</label>
        <input type="text" placeholder="ระบุชื่อจริงของคุณ" value={fullname} onChange={(e) => setFullname(e.target.value)} style={s.input} />

        <label style={s.label}>รหัส PIN (6 หลัก):</label>
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
          {loading ? 'กำลังเข้าสู่ห้องสอบ...' : 'เริ่มทำแบบทดสอบ 🚀'}
        </button>
      </div>
    </div>
  )
}

// ฟังก์ชันหลักที่ส่งออก พร้อมหุ้ม Suspense เพื่อความปลอดภัย
export default function PlayerRegistration() {
  return (
    <Suspense fallback={<div style={{color:'white', textAlign:'center', paddingTop:'50px'}}>กำลังโหลดหน้าลงทะเบียน...</div>}>
      <RegistrationForm />
    </Suspense>
  )
}

const s = {
  page: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5', padding: '20px', fontFamily: "'Inter', sans-serif" },
  card: { background: 'white', padding: '40px', borderRadius: '30px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', textAlign: 'left' },
  iconHeader: { fontSize: '3rem', textAlign: 'center', marginBottom: '10px' },
  title: { textAlign: 'center', color: '#1a1a1a', marginBottom: '5px', fontWeight: '800', fontSize: '1.8rem' },
  subtitle: { textAlign: 'center', color: '#888', marginBottom: '30px', fontSize: '0.9rem' },
  label: { display: 'block', marginTop: '15px', fontWeight: '600', color: '#444', fontSize: '0.85rem' },
  input: { width: '100%', padding: '12px 15px', marginTop: '5px', borderRadius: '12px', border: '1.5px solid #eee', boxSizing: 'border-box', outline: 'none', transition: '0.2s', fontSize: '1rem' },
  pinInput: { width: '100%', padding: '15px', marginTop: '5px', borderRadius: '12px', border: '2px solid #6f42c1', boxSizing: 'border-box', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#6f42c1', outline: 'none' },
  btn: (loading) => ({ width: '100%', padding: '16px', marginTop: '30px', background: loading ? '#ccc' : 'linear-gradient(135deg, #6f42c1, #a29bfe)', color: 'white', border: 'none', borderRadius: '15px', cursor: loading ? 'default' : 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(111, 66, 193, 0.2)' })
}