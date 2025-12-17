'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function PlayerRegistration() {
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
      // 🔍 จุดแก้ไข 1: ค้นหาโดยครอบคลุมทั้งแบบ Text และ Number 
      // และดึง target_segment มาด้วยเพื่อใช้กรองโจทย์ในหน้าถัดไป
      const { data: session, error } = await supabase
        .from('game_sessions')
        .select('id, target_department, target_segment') 
        .eq('pin_code', pin.trim()) // ใช้ trim เพื่อตัดช่องว่างที่อาจเผลอกดมา
        .single()

      // 🔍 จุดแก้ไข 2: เช็ค Error ให้ละเอียดขึ้น
      if (error || !session) {
        console.error("Supabase Error:", error)
        alert('ไม่พบรหัส PIN นี้ในระบบ หรือรหัสอาจจะไม่ถูกต้อง (406/404)')
        setLoading(false)
        return
      }

      // ✅ บันทึกข้อมูลลง LocalStorage 
      // เราจะเอาค่าจากหน้าลงทะเบียน และค่า "จริง" จากห้องสอบมาเก็บไว้
      localStorage.setItem('player_name', fullname)
      localStorage.setItem('player_dept', department) 
      localStorage.setItem('player_level', level)
      // เก็บค่า Segment ที่หัวหน้าตั้งไว้สำหรับห้องนี้ เพื่อให้หน้าเกมดึงโจทย์ถูกข้อ
      localStorage.setItem('room_segment', session.target_segment)

      console.log("เข้าสู่ห้องสำเร็จ:", session.id)
      router.push(`/play/audio-game/${session.id}`)

    } catch (err) {
      console.error("Unexpected Error:", err)
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  // ส่วน UI (เหมือนเดิม)
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#282c34', padding: '20px' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '25px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ textAlign: 'center', color: '#6f42c1', marginBottom: '25px' }}>👤 ลงทะเบียนพนักงาน</h2>
        
        <label style={labelStyle}>ชื่อ-นามสกุล:</label>
        <input type="text" placeholder="ระบุชื่อจริงของคุณ" value={fullname} onChange={(e) => setFullname(e.target.value)} style={inputStyle} />

        <label style={labelStyle}>รหัส PIN (6 หลัก):</label>
        <input type="text" maxLength={6} placeholder="ระบุ PIN 6 หลัก" value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }} />

        <label style={labelStyle}>เลือกแผนกของคุณ:</label>
        <select value={department} onChange={(e) => setDepartment(e.target.value)} style={inputStyle}>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <label style={labelStyle}>ระดับพนักงาน (Level):</label>
        <select value={level} onChange={(e) => setLevel(e.target.value)} style={inputStyle}>
          {levels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <button onClick={handleJoin} disabled={loading} style={btnStyle}>
          {loading ? 'กำลังเข้าระบบ...' : 'เริ่มทำแบบทดสอบ 🚀'}
        </button>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', marginTop: '15px', fontWeight: 'bold', color: '#555' }
const inputStyle = { width: '100%', padding: '12px', marginTop: '5px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }
const btnStyle = { width: '100%', padding: '15px', marginTop: '30px', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }