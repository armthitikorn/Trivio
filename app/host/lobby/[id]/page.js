'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams } from 'next/navigation'

export default function HostLobby() {
  const { id } = useParams() // Quiz ID
  const [gamePin, setGamePin] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [players, setPlayers] = useState([])
  const [status, setStatus] = useState('กำลังเตรียมห้อง...')
  const isCreated = useRef(false) // ป้องกันการสร้างห้องซ้ำซ้อน

  useEffect(() => {
    if (!isCreated.current) {
      createSession()
      isCreated.current = true
    }
  }, [])

  // 1. สร้าง Session และสุ่ม PIN
  async function createSession() {
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    setGamePin(pin)

    const { data, error } = await supabase
      .from('game_sessions')
      .insert([{ quiz_id: id, pin_code: pin, current_state: 'WAITING' }])
      .select().single()

    if (error) {
      console.error("Error creating session:", error)
      setStatus('เกิดข้อผิดพลาดในการสร้างห้อง')
    } else {
      setSessionId(data.id)
      setStatus('เปิดห้องสำเร็จ! รอผู้เล่น...')
      subscribeToPlayers(data.id)
    }
  }

  // 2. ระบบ Realtime ฟังเสียงคนเล่น Join (ปรับปรุงให้ไวขึ้น)
  function subscribeToPlayers(sId) {
    const channel = supabase
      .channel(`realtime-lobby-${sId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'players',
        filter: `session_id=eq.${sId}` 
      }, (payload) => {
        // เมื่อมีข้อมูลใหม่เข้ามา ให้เพิ่มชื่อลงใน List ทันที
        setPlayers((current) => {
          if (current.find(p => p.id === payload.new.id)) return current
          return [...current, payload.new]
        })
      })
      .subscribe((status) => {
        console.log("Realtime connection status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }

  // 3. ฟังก์ชันเริ่มเกม (ส่งโจทย์ข้อแรก)
  async function startGame() {
    if (!sessionId) return

    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('quiz_id', id)
      .order('created_at', { ascending: true })
      .limit(1)

    if (!questions || questions.length === 0) {
      return alert('กรุณาเพิ่มคำถามในระบบก่อนเริ่มเกม!')
    }

    await supabase
      .from('game_sessions')
      .update({ 
        current_state: 'QUESTION', 
        current_question_id: questions[0].id 
      })
      .eq('id', sessionId)

    alert('เริ่มเกมแล้ว! หน้าจอคนเล่นจะเปลี่ยนเป็นโจทย์ข้อที่ 1')
  }

  return (
    <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif', background: '#282c34', minHeight: '100vh', color: 'white' }}>
      <h1>🎲 Game Lobby</h1>
      
      <div style={{ background: 'white', color: 'black', padding: '20px', borderRadius: '15px', display: 'inline-block', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>PIN CODE:</p>
        <h1 style={{ fontSize: '70px', margin: '10px 0', letterSpacing: '10px', color: '#0070f3' }}>
          {gamePin || '...'}
        </h1>
        <p style={{ color: '#666' }}>{status}</p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>👥 ผู้เล่นที่เข้าร่วม ({players.length})</h3>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap', padding: '20px' }}>
          {players.length === 0 && <p style={{ opacity: 0.5 }}>รอเพื่อนๆ เข้าห้องอยู่นะ...</p>}
          {players.map((p) => (
            <div key={p.id} style={{ background: '#61dafb', color: '#000', padding: '12px 25px', borderRadius: '30px', fontWeight: 'bold', fontSize: '18px', boxShadow: '0 4px 10px rgba(97, 218, 251, 0.3)' }}>
              {p.nickname}
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={startGame}
        style={{ 
          marginTop: '50px', padding: '15px 50px', fontSize: '24px', 
          background: '#28a745', color: 'white', border: 'none', 
          borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold'
        }}
      >
        เริ่มเกมเลย! 🚀
      </button>
    </div>
  )
}