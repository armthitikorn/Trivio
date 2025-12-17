'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function HostDashboard() {
  const [selectedDept, setSelectedDept] = useState('UOB')
  const [selectedCategory, setSelectedCategory] = useState('Introduction')
  const [selectedSegment, setSelectedSegment] = useState('The Rising Star')
  const [loading, setLoading] = useState(false)
  const [generatedPin, setGeneratedPin] = useState(null)

  const departments = ['UOB', 'AYCAP', 'ttb', 'Krungsri', 'Bancassurance', 'Agent', 'Broker', 'DMTM']
  const segments = ['Nursery', 'Rising Star', 'Legend']
  
  // เพิ่มหมวดหมู่ให้ตรงกับหน้า Admin เพื่อให้ดึงโจทย์ถูกกลุ่ม
  const categories = [
    { id: 'Introduction', name: '1. ตอบเข้าต้นสาย (Intro)' },
    { id: 'Objection', name: '2. ข้อโต้แย้งกลางสาย (Objection)' },
    { id: 'Closing', name: '3. ปิดการขาย (Closing)' }
  ]

  async function generatePin() {
    setLoading(true)
    // สร้าง PIN 6 หลัก
    const pin = Math.floor(100000 + Math.random() * 900000).toString()

    const { data, error } = await supabase
      .from('game_sessions')
      .insert([{
        pin_code: pin,
        target_department: selectedDept,
        target_segment: selectedSegment,
        category: selectedCategory,
        current_state: 'WAITING' // พนักงานเข้าทำได้ทันทีไม่ต้องรอ
      }])
      .select().single()

    if (error) {
      alert("Error: " + error.message)
    } else {
      setGeneratedPin(pin)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '40px', background: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#6f42c1', textAlign: 'center', marginBottom: '10px' }}>🎙️ Audio Mission Control</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>ตั้งค่าเพื่อสร้างรหัส PIN สำหรับพนักงาน</p>
        
        {!generatedPin ? (
          <>
            <div style={formGroup}>
              <label style={labelStyle}>🏢 แผนก (Department):</label>
              <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={inputStyle}>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={formGroup}>
              <label style={labelStyle}>📚 หมวดหมู่บททดสอบ:</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={inputStyle}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={formGroup}>
              <label style={labelStyle}>🎯 กลุ่มเป้าหมาย (Segment):</label>
              <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} style={inputStyle}>
                {segments.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <button onClick={generatePin} disabled={loading} style={btnSubmitStyle}>
              {loading ? '⏳ กำลังสร้างห้อง...' : 'สร้างรหัส PIN และเปิดระบบทันที 🚀'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', animation: 'fadeIn 0.5s' }}>
            <div style={{ background: '#f3ebff', padding: '30px', borderRadius: '20px', marginBottom: '20px' }}>
              <p style={{ fontSize: '1.1rem', color: '#6f42c1', fontWeight: 'bold' }}>รหัส PIN สำหรับเข้าทำแบบทดสอบ:</p>
              <h1 style={{ fontSize: '5rem', color: '#6f42c1', letterSpacing: '12px', margin: '20px 0' }}>{generatedPin}</h1>
              <p style={{ color: '#666' }}>ส่งรหัสนี้ให้พนักงานในกลุ่ม <b>{selectedSegment}</b> แผนก <b>{selectedDept}</b></p>
            </div>
            
            <button 
              onClick={() => setGeneratedPin(null)} 
              style={{ background: 'none', border: '1px solid #ccc', padding: '12px 25px', borderRadius: '12px', cursor: 'pointer', color: '#666' }}
            >
              🔄 สร้างรหัสใหม่ / เปลี่ยนแผนก
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// สไตล์เพิ่มเติม
const formGroup = { marginBottom: '20px' }
const labelStyle = { fontWeight: 'bold', fontSize: '0.9rem', color: '#444' }
const inputStyle = { width: '100%', padding: '14px', marginTop: '8px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', background: '#fafafa' }
const btnSubmitStyle = { width: '100%', marginTop: '20px', padding: '18px', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '15px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(111, 66, 193, 0.3)' }