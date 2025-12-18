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
      // 1. ตรวจสอบ PIN ในตาราง game_sessions
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('pin_code', pin)
        .eq('current_state', 'WAITING')
        .single()

      if (sessionError || !session) {
        alert('❌ ไม่พบห้องนี้ หรือเกมเริ่มไปแล้วครับ')
        setLoading(false)
        return
      }

      // 2. บันทึกชื่อเล่นลงเครื่อง (localStorage) เพื่อใช้ในหน้าถัดไป
      localStorage.setItem('nickname', nickname)

      // 3. เพิ่มชื่อผู้เล่นลงในตาราง players
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
        // ✨ จุดสำคัญ: ต้องมั่นใจว่าคุณมีโฟลเดอร์ app/play/lobby/[id]/page.js อยู่จริง
        router.push(`/play/lobby/${session.id}`) 
      }
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ')
      setLoading(false)
    }
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.title}>🎮 Join Quiz</h1>
        <p style={s.subtitle}>ใส่ PIN เพื่อเริ่มการทดสอบ</p>

        <div style={s.inputArea}>
          <label style={s.label}>GAME PIN</label>
          <input 
            type="text" 
            placeholder="เช่น 123456" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={s.input}
          />
        </div>

        <div style={s.inputArea}>
          <label style={s.label}>ชื่อเล่นของคุณ</label>
          <input 
            type="text" 
            placeholder="พิมพ์ชื่อเล่น..." 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={s.input}
          />
        </div>

        <button 
          onClick={handleJoin}
          disabled={loading}
          style={s.btn(loading)}
        >
          {loading ? 'กำลังเข้าห้อง...' : 'เข้าร่วมเกม!'}
        </button>
      </div>
      <p style={s.footer}>ตรวจสอบ PIN จากหน้าจอ Host ของคุณ</p>
    </div>
  )
}

const s = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#8e44ad', fontFamily: "'Inter', sans-serif" },
  card: { background: 'white', padding: '40px', borderRadius: '30px', width: '350px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', textAlign: 'center' },
  title: { fontSize: '2.5rem', fontWeight: '900', color: '#8e44ad', margin: '0 0 10px 0' },
  subtitle: { color: '#666', marginBottom: '30px' },
  inputArea: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', textAlign: 'left' },
  label: { fontSize: '0.8rem', fontWeight: 'bold', color: '#444', marginLeft: '5px' },
  input: { padding: '15px', fontSize: '1.2rem', textAlign: 'center', borderRadius: '15px', border: '2px solid #eee', outline: 'none', transition: '0.3s' },
  btn: (loading) => ({ padding: '18px', background: loading ? '#ccc' : '#2ecc71', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', border: 'none', borderRadius: '15px', cursor: loading ? 'default' : 'pointer', marginTop: '10px', boxShadow: '0 5px 15px rgba(46, 204, 113, 0.3)' }),
  footer: { marginTop: '30px', color: 'white', opacity: 0.8, fontSize: '0.9rem' }
}