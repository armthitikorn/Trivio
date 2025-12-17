'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function JoinGame() {
  const [pin, setPin] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleJoin() {
    if (!pin || !nickname) return alert('กรุณากรอก PIN และ ชื่อเล่น')
    setLoading(true)

    try {
      // 1. ตรวจสอบ PIN ว่ามีห้องเปิดอยู่จริงไหม
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('pin_code', pin)
        .eq('current_state', 'WAITING')
        .single()

      if (sessionError || !session) {
        alert('ไม่พบห้องนี้ หรือเกมเริ่มไปแล้วครับ')
        setLoading(false)
        return
      }

      // 2. เพิ่มชื่อผู้เล่นลงในฐานข้อมูล
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert([
          { 
            session_id: session.id, 
            nickname: nickname,
            score: 0 
          }
        ])
        .select()
        .single()

      if (playerError) {
        alert('เข้าห้องไม่ได้ ลองเปลี่ยนชื่อเล่นดูครับ')
        setLoading(false)
      } else {
        // --- ส่วนที่แก้ไข: ให้เด้งไปหน้า Lobby ของคนเล่นทันที ---
        setLoading(false)
        router.push(`/play/lobby/${session.id}`) 
      }
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ')
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      height: '100vh', background: '#6f42c1', color: 'white', fontFamily: 'sans-serif' 
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '30px' }}>🎮 Join Quiz</h1>
      
      <div style={{ background: 'white', padding: '30px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '15px', width: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ color: '#333', fontWeight: 'bold' }}>GAME PIN:</label>
          <input 
            type="text" 
            placeholder="เช่น 123456" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={{ 
              padding: '15px', fontSize: '20px', textAlign: 'center', 
              borderRadius: '8px', border: '2px solid #ddd', 
              color: 'black', backgroundColor: '#fff'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ color: '#333', fontWeight: 'bold' }}>ชื่อเล่นของคุณ:</label>
          <input 
            type="text" 
            placeholder="พิมพ์ชื่อที่นี่" 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{ 
              padding: '15px', fontSize: '18px', textAlign: 'center', 
              borderRadius: '8px', border: '2px solid #ddd', 
              color: 'black', backgroundColor: '#fff'
            }}
          />
        </div>

        <button 
          onClick={handleJoin}
          disabled={loading}
          style={{ 
            padding: '15px', background: loading ? '#ccc' : '#28a745', 
            color: 'white', fontSize: '20px', 
            fontWeight: 'bold', border: 'none', borderRadius: '8px', 
            cursor: loading ? 'default' : 'pointer', marginTop: '10px'
          }}
        >
          {loading ? 'กำลังเข้าห้อง...' : 'เข้าร่วมเกม!'}
        </button>
      </div>
      <p style={{ marginTop: '20px', opacity: 0.8 }}>กรอก PIN ให้ตรงกับที่โชว์บนหน้าจอ Host นะครับ</p>
    </div>
  )
}